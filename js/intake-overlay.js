(function () {
  'use strict';

  var API_BASE = 'https://tradeworks-api-71668222585.us-east1.run.app';
  var ENDPOINT = API_BASE + '/public/intake-assist';
  var UPLOAD_ENDPOINT = API_BASE + '/public/intake-upload-url';
  var TOKEN_KEY = 'tw_intake_session_token';
  var state = 'idle';
  var priorTurns = [];
  var sessionToken = '';
  var zipValue = '';
  var photoRefs = [];
  var photoUploads = {};
  var photoUploadDisabled = false;
  var photoErrorTimer = null;
  var lastResponse = null;
  var chosenUrgency = 'standard';
  var lastFocused = null;
  var recognition = null;
  var micHidden = false;
  var els = {};

  function getSessionToken() {
    var t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = (crypto.randomUUID && crypto.randomUUID()) ||
        (Date.now() + '-' + Math.random().toString(36).slice(2, 12));
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  }

  function rotateSessionToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionToken = getSessionToken();
  }

  function emit(name, detail) {
    document['dis' + 'patchEvent'](new CustomEvent(name, { detail: detail || {} }));
  }

  function esc(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setState(next) {
    state = next;
    if (els.dialog) els.dialog.setAttribute('data-state', state);
    syncPhotoControls();
  }

  function isOpen() {
    return !!(els.root && els.root.classList.contains('is-open'));
  }

  function build() {
    if (els.root) return;

    var root = document.createElement('div');
    root.className = 'tw-intake-root';
    root.innerHTML =
      '<div class="tw-intake-backdrop" data-tw-intake-close></div>' +
      '<section class="tw-intake-dialog" role="dialog" aria-modal="true" aria-labelledby="tw-intake-title" data-state="idle">' +
      '  <header class="tw-intake-header">' +
      '    <div>' +
      '      <p class="tw-intake-kicker">Describe your issue</p>' +
      '      <h2 id="tw-intake-title">Tell us what is going on</h2>' +
      '    </div>' +
      '    <button class="tw-intake-icon-btn tw-intake-close" type="button" aria-label="Close" data-tw-intake-close>&times;</button>' +
      '  </header>' +
      '  <div class="tw-intake-body">' +
      '    <div class="tw-intake-status" aria-live="polite"></div>' +
      '    <div class="tw-intake-input-row">' +
      '      <textarea class="tw-intake-textarea" rows="4" aria-label="Describe your home issue" placeholder="Tell us what happened, what you see, and how urgent it feels."></textarea>' +
      '      <button class="tw-intake-photo-btn" type="button" data-tw-intake-photo aria-label="Add a photo">' +
      '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15V8a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4Z"/><path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L6 18"/></svg>' +
      '      </button>' +
      '      <button class="tw-intake-mic" type="button" aria-label="Use voice input" hidden>Mic</button>' +
      '      <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="tw-intake-photo-input" hidden>' +
      '    </div>' +
      '    <div class="tw-intake-thumbs" data-tw-intake-thumbs hidden></div>' +
      '    <div class="tw-intake-photo-error" data-tw-intake-photo-error hidden></div>' +
      '    <div class="tw-intake-actions">' +
      '      <button class="tw-intake-primary" type="button" disabled>Send</button>' +
      '    </div>' +
      '  </div>' +
      '  <footer class="tw-intake-footer">' +
      '    <span>AI intake is optional. You can still browse and book normally.</span>' +
      '    <button class="tw-intake-link" type="button" data-tw-intake-start-over>Start over</button>' +
      '  </footer>' +
      '</section>';

    document.body.appendChild(root);
    els.root = root;
    els.dialog = root.querySelector('.tw-intake-dialog');
    els.status = root.querySelector('.tw-intake-status');
    els.textarea = root.querySelector('.tw-intake-textarea');
    els.send = root.querySelector('.tw-intake-primary');
    els.mic = root.querySelector('.tw-intake-mic');
    els.photo = root.querySelector('[data-tw-intake-photo]');
    els.photoInput = root.querySelector('.tw-intake-photo-input');
    els.thumbs = root.querySelector('[data-tw-intake-thumbs]');
    els.photoError = root.querySelector('[data-tw-intake-photo-error]');
    els.startOver = root.querySelector('[data-tw-intake-start-over]');
    els.backdrop = root.querySelector('.tw-intake-backdrop');

    root.addEventListener('click', function (e) {
      if (e.target === els.backdrop) {
        e.preventDefault();
        close();
        return;
      }
      var closeBtn = e.target.closest && e.target.closest('[data-tw-intake-close], .tw-intake-close');
      if (closeBtn && closeBtn !== els.backdrop && root.contains(closeBtn)) {
        e.preventDefault();
        close();
      }
    });
    els.send.addEventListener('click', function () { sendCurrentText(); });
    els.photo.addEventListener('click', function () { if (els.photoInput) els.photoInput.click(); });
    els.photoInput.addEventListener('change', function () {
      handleFilesSelected(els.photoInput.files);
      els.photoInput.value = '';
    });
    els.thumbs.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-tw-intake-remove-photo]');
      if (!btn) return;
      removePhoto(btn.getAttribute('data-local-id'));
    });
    els.textarea.addEventListener('input', syncSendButton);
    els.textarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !els.send.disabled) sendCurrentText();
    });
    els.startOver.addEventListener('click', startOver);
    setupVoice();
  }

  function syncSendButton() {
    if (!els.send) return;
    var hasText = (els.textarea.value || '').trim().length > 0;
    var canSend = state === 'idle' || state === 'clarify';
    els.send.disabled = !canSend || state === 'sending' || !hasText;
  }

  function oldBrowserForPhotos() {
    var ua = navigator.userAgent || '';
    return !navigator.mediaDevices && /(MSIE|Trident|Android [1-5]\.|iPhone OS [1-9]_|CPU OS [1-9]_)/i.test(ua);
  }

  function syncPhotoControls() {
    if (!els.photo) return;
    var canUse = (state === 'idle' || state === 'clarify') && !photoUploadDisabled && !oldBrowserForPhotos();
    els.photo.hidden = !canUse;
  }

  function makeLocalId() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      ('photo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
  }

  function thumbSelector(localId) {
    var safe = (window.CSS && CSS.escape) ? CSS.escape(localId) : String(localId).replace(/[^a-zA-Z0-9_-]/g, '');
    return '[data-local-id="' + safe + '"]';
  }

  function visibleUploadCount() {
    return Object.keys(photoUploads).length;
  }

  function updateThumbVisibility() {
    if (!els.thumbs) return;
    els.thumbs.hidden = visibleUploadCount() === 0;
  }

  function showPhotoError(message) {
    if (!els.photoError) return;
    els.photoError.textContent = message;
    els.photoError.hidden = false;
    clearTimeout(photoErrorTimer);
    photoErrorTimer = setTimeout(function () {
      if (els.photoError) els.photoError.hidden = true;
    }, 5000);
  }

  function addThumbnailPending(localId, file, controller) {
    var url = URL.createObjectURL(file);
    photoUploads[localId] = { url: url, path: '', controller: controller, status: 'pending', promise: null };
    els.thumbs.insertAdjacentHTML('beforeend',
      '<div class="tw-intake-thumb is-pending" data-local-id="' + esc(localId) + '">' +
      '  <img src="' + esc(url) + '" alt="">' +
      '  <div class="tw-intake-thumb__progress" data-progress></div>' +
      '  <button type="button" class="tw-intake-thumb__remove" data-tw-intake-remove-photo data-local-id="' + esc(localId) + '" aria-label="Remove photo">&times;</button>' +
      '</div>');
    updateThumbVisibility();
  }

  function finalizeThumbnail(localId, path) {
    var item = photoUploads[localId];
    if (!item) return;
    item.path = path;
    item.status = 'done';
    var node = els.thumbs && els.thumbs.querySelector(thumbSelector(localId));
    if (node) {
      node.classList.remove('is-pending');
      node.classList.add('is-done');
      var progress = node.querySelector('[data-progress]');
      if (progress) progress.innerHTML = '<span aria-hidden="true">&#10003;</span>';
    }
  }

  function removeThumbnail(localId) {
    var item = photoUploads[localId];
    if (item && item.url) URL.revokeObjectURL(item.url);
    var node = els.thumbs && els.thumbs.querySelector(thumbSelector(localId));
    if (node && node.parentNode) node.parentNode.removeChild(node);
    delete photoUploads[localId];
    updateThumbVisibility();
  }

  function removePhoto(localId) {
    var item = photoUploads[localId];
    if (!item) return;
    if (item.status === 'pending' && item.controller) {
      try { item.controller.abort(); } catch (e) {}
    }
    if (item.path) {
      photoRefs = photoRefs.filter(function (path) { return path !== item.path; });
    }
    removeThumbnail(localId);
  }

  function clearPhotos() {
    Object.keys(photoUploads).forEach(function (localId) {
      var item = photoUploads[localId];
      if (item && item.status === 'pending' && item.controller) {
        try { item.controller.abort(); } catch (e) {}
      }
      if (item && item.url) URL.revokeObjectURL(item.url);
    });
    photoRefs = [];
    photoUploads = {};
    photoUploadDisabled = false;
    if (els.thumbs) els.thumbs.innerHTML = '';
    updateThumbVisibility();
    if (els.photoError) els.photoError.hidden = true;
    syncPhotoControls();
  }

  function pendingUploadPromises() {
    return Object.keys(photoUploads).map(function (id) { return photoUploads[id]; })
      .filter(function (item) { return item.status === 'pending' && item.promise; })
      .map(function (item) { return item.promise.catch(function () {}); });
  }

  function waitForPendingUploads(maxMs) {
    var pending = pendingUploadPromises();
    if (!pending.length) return Promise.resolve(false);
    return Promise.race([
      Promise.all(pending).then(function () { return false; }),
      new Promise(function (resolve) { setTimeout(function () { resolve(true); }, maxMs); })
    ]);
  }

  function handleFilesSelected(files) {
    var remaining = 4 - visibleUploadCount();
    if (remaining <= 0) {
      showPhotoError('Up to 4 photos per intake.');
      return;
    }
    Array.prototype.slice.call(files || [], 0, remaining).forEach(function (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        showPhotoError('Skipped ' + file.name + ': unsupported format.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showPhotoError('Skipped ' + file.name + ': over 10 MB.');
        return;
      }
      uploadOnePhoto(file);
    });
  }

  function uploadOnePhoto(file) {
    var localId = makeLocalId();
    var controller = new AbortController();
    addThumbnailPending(localId, file, controller);
    var promise = fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      credentials: 'omit',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: sessionToken || getSessionToken(), contentType: file.type })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data || data.success === false) throw new Error((data && (data.error || data.reason)) || ('sign_failed_' + res.status));
        return fetch(data.uploadUrl, {
          method: 'PUT',
          credentials: 'omit',
          signal: controller.signal,
          headers: { 'content-type': file.type },
          body: file
        }).then(function (putResp) {
          if (!putResp.ok) throw new Error('upload_failed_' + putResp.status);
          if (!photoUploads[localId]) return;
          photoRefs.push(data.path);
          finalizeThumbnail(localId, data.path);
          emit('tw-intake-photo-added', { path: data.path });
        });
      });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('[intake] photo upload failed:', e && e.message);
      removeThumbnail(localId);
      if (e && (e.message === 'rate_limited' || e.message === 'upload_limit_reached')) {
        photoUploadDisabled = true;
        syncPhotoControls();
        showPhotoError('Photo upload limit reached - you can still send the description.');
      } else {
        showPhotoError("Couldn't upload that photo. You can retry or send without it.");
      }
    });
    photoUploads[localId].promise = promise;
    return promise;
  }

  function renderIdle(message) {
    setState('idle');
    els.status.innerHTML = message ? '<p class="tw-intake-hint">' + esc(message) + '</p>' : '';
    els.send.innerHTML = 'Send';
    syncSendButton();
  }

  function renderSending() {
    setState('sending');
    els.status.innerHTML = '<div class="tw-intake-loading"><span></span> Checking your issue...</div>';
    els.send.innerHTML = '<span class="tw-intake-spinner" aria-hidden="true"></span> Sending';
    syncSendButton();
  }

  function renderClarify(data) {
    setState('clarify');
    var chips = (data.subcategoryMatches || []).map(function (item) {
      return '<button class="tw-intake-chip" type="button" data-choice="' + esc(item.label) + '">' + esc(item.label) + '</button>';
    }).join('');
    els.status.innerHTML =
      '<div class="tw-intake-card">' +
      '  <h3>One quick question</h3>' +
      '  <p>' + esc(data.clarifyingQuestion || 'Can you share one more detail?') + '</p>' +
      (chips ? '<div class="tw-intake-chip-row">' + chips + '</div>' : '') +
      '</div>';
    els.status.querySelectorAll('[data-choice]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        sendText('That one: ' + chip.getAttribute('data-choice'));
      });
    });
    els.send.innerHTML = 'Send';
    syncSendButton();
  }

  function renderResolved(data) {
    setState('resolved');
    emit('tw-intake-resolved', { response: data });
    var first = data.subcategoryMatches && data.subcategoryMatches[0];
    chosenUrgency = data.suggestedUrgency || 'standard';
    var quote = data.isQuoteRequest && data.quoteCopy
      ? '<p class="tw-intake-secondary-line">For this service, ' + esc(data.quoteCopy) + '.</p>'
      : '';
    var canHandoff = !!(first && first.categorySlug && first.subcategorySlug && !data.waitlistZip);
    var handoff = (data.readyToHandoff || canHandoff)
      ? '<button class="tw-intake-primary" type="button" data-handoff>Continue to booking</button>'
      : '';
    var waitlist = data.waitlistZip
      ? '<button class="tw-intake-primary" type="button" data-waitlist>Join the waitlist</button>'
      : '';
    els.status.innerHTML =
      '<div class="tw-intake-card">' +
      '  <h3>We think this is: ' + esc(first ? first.label : 'Home service') + '</h3>' +
      '  <p><strong>Scope:</strong> ' + esc(data.scopedDescription || 'We will carry your notes into booking.') + '</p>' +
      '  <div class="tw-intake-urgency" role="radiogroup" aria-label="Choose urgency">' +
      urgencyChip('standard', 'Standard 48h') +
      urgencyChip('urgent', 'Urgent 24h') +
      urgencyChip('emergency', 'Emergency 4h') +
      '  </div>' +
      '  <p class="tw-intake-muted">Emergency means handled today when a pro is available.</p>' +
      quote +
      '  <div class="tw-intake-card-actions">' + handoff + waitlist + '</div>' +
      '</div>';
    els.status.querySelectorAll('[data-urgency]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chosenUrgency = chip.getAttribute('data-urgency');
        updateUrgencyChips();
      });
    });
    var handoffBtn = els.status.querySelector('[data-handoff]');
    if (handoffBtn) handoffBtn.addEventListener('click', handoffToBooking);
    var waitlistBtn = els.status.querySelector('[data-waitlist]');
    if (waitlistBtn) waitlistBtn.addEventListener('click', function () { window.location.href = '/find/'; });
    els.send.innerHTML = 'Send';
    syncSendButton();
  }

  function urgencyChip(value, label) {
    var checked = value === chosenUrgency;
    return '<button class="tw-intake-urgency-chip' + (checked ? ' is-selected' : '') + '" type="button" role="radio" aria-checked="' + checked + '" data-urgency="' + value + '">' + label + '</button>';
  }

  function updateUrgencyChips() {
    els.status.querySelectorAll('[data-urgency]').forEach(function (chip) {
      var selected = chip.getAttribute('data-urgency') === chosenUrgency;
      chip.classList.toggle('is-selected', selected);
      chip.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
  }

  function renderLifeSafety(data) {
    setState('life_safety');
    var text = data.scopedDescription || 'Please step away from immediate danger and contact local emergency services.';
    var call = /911|emergency|danger|gas|fire|smoke|carbon|sparking/i.test(text)
      ? '<a class="tw-intake-primary" href="tel:911">Call 911</a>'
      : '';
    els.status.innerHTML =
      '<div class="tw-intake-card tw-intake-card--warning">' +
      '  <h3>Safety first</h3>' +
      '  <p>' + esc(text) + '</p>' +
      '  <div class="tw-intake-card-actions">' + call + '<button class="tw-intake-secondary tw-intake-close" type="button" data-tw-intake-close>Close</button></div>' +
      '</div>';
    els.send.innerHTML = 'Send';
    syncSendButton();
  }

  function renderFallback(kind) {
    var isRate = kind === 'rate_limited';
    setState(isRate ? 'rate_limited' : 'fallback');
    emit('tw-intake-fallback', { state: state });
    els.status.innerHTML =
      '<div class="tw-intake-card tw-intake-card--fallback">' +
      '  <h3>' + (isRate ? 'Give the AI a minute to catch up' : 'Let us browse instead') + '</h3>' +
      '  <p>' + (isRate ? 'You can browse services in the meantime.' : 'You can still choose a service and book normally.') + '</p>' +
      '  <div class="tw-intake-card-actions">' +
      '    <a class="tw-intake-primary" href="/find/">Browse services</a>' +
      (!isRate ? '    <button class="tw-intake-link" type="button" data-retry>Try describing it differently</button>' : '') +
      '  </div>' +
      '</div>';
    var retry = els.status.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', function () { renderIdle('Try a shorter description with the main symptom.'); els.textarea.focus(); });
    els.send.innerHTML = 'Send';
    syncSendButton();
  }

  function handleResponse(data) {
    lastResponse = data;
    if (!data || data.success === false) {
      renderFallback('fallback');
      return;
    }
    if (data.clarifyingQuestion) {
      priorTurns.push({ role: 'assistant', content: data.clarifyingQuestion });
      priorTurns = priorTurns.slice(-6);
    }
    if (data.outcome === 'life_safety') return renderLifeSafety(data);
    if (data.outcome === 'fallback' || data.fallbackToGrid) return renderFallback('fallback');
    if (data.outcome === 'clarify') return renderClarify(data);
    if (data.outcome === 'resolved') return renderResolved(data);
    renderFallback('fallback');
  }

  function sendCurrentText() {
    sendText((els.textarea.value || '').trim());
  }

  function sendText(text) {
    if (!text) {
      renderIdle('Type something first.');
      return;
    }
    priorTurns.push({ role: 'user', content: text });
    priorTurns = priorTurns.slice(-6);
    renderSending();
    waitForPendingUploads(10000).then(function (timedOut) {
      if (timedOut) showPhotoError('One photo is still uploading - sending without it.');
      emit('tw-intake-send', { state: state, textLen: text.length, photoCount: photoRefs.length });
      return fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: sessionToken,
        text: text,
        photoRefs: photoRefs.slice(),
        zip: zipValue || '',
        priorTurns: priorTurns
      })
      });
    }).then(function (res) {
      if (res.status === 429) {
        renderFallback('rate_limited');
        return null;
      }
      return res.json().then(function (data) {
        if (!res.ok) {
          if (data && data.error === 'empty_input') renderIdle('Type something first.');
          else if (data && data.error === 'missing_session_token') {
            console.warn('[tw-intake] missing session token');
            renderFallback('fallback');
          }
          else renderFallback('fallback');
          return null;
        }
        return data;
      });
    }).then(function (data) {
      if (data) handleResponse(data);
    }).catch(function () {
      renderFallback('fallback');
    });
  }

  function handoffToBooking() {
    var first = lastResponse && lastResponse.subcategoryMatches && lastResponse.subcategoryMatches[0];
    if (!first) return renderFallback('fallback');
    emit('tw-intake-handoff', { category: first.categorySlug, subcategory: first.subcategorySlug, urgency: chosenUrgency });
    var params = new URLSearchParams({
      category: first.categorySlug,
      subcategory: first.subcategorySlug,
      urgency: chosenUrgency,
      scopedDescription: lastResponse.scopedDescription || '',
      intakeSessionToken: sessionToken
    });
    if (zipValue && /^\d{5}$/.test(zipValue)) {
      params.set('zip', zipValue);
    }
    window.location.href = '/book/?' + params.toString();
  }

  function setupVoice() {
    var Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech || micHidden) return;
    els.mic.hidden = false;
    els.mic.addEventListener('click', function () {
      try {
        recognition = new Speech();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;
        var base = els.textarea.value || '';
        recognition.onresult = function (event) {
          var interim = '';
          var finalText = '';
          for (var i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          els.textarea.value = (base + ' ' + finalText + interim).trim();
          syncSendButton();
        };
        recognition.onerror = hideMic;
        recognition.onend = function () { els.mic.classList.remove('is-listening'); };
        els.mic.classList.add('is-listening');
        recognition.start();
      } catch (e) {
        hideMic();
      }
    });
  }

  function hideMic() {
    micHidden = true;
    if (els.mic) els.mic.hidden = true;
  }

  function getFocusable() {
    return Array.prototype.slice.call(els.dialog.querySelectorAll('a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.hidden && el.offsetParent !== null; });
  }

  function onKeydown(e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open(options) {
    build();
    options = options || {};
    lastFocused = document.activeElement;
    sessionToken = getSessionToken();
    zipValue = String(options.zip || '').trim();
    priorTurns = [];
    lastResponse = null;
    chosenUrgency = 'standard';
    els.textarea.value = options.prefillText || '';
    renderIdle();
    els.root.classList.add('is-open');
    document.body.classList.add('tw-intake-open');
    document.removeEventListener('keydown', onKeydown);
    document.addEventListener('keydown', onKeydown);
    setTimeout(function () { els.textarea.focus(); }, 0);
    emit('tw-intake-open', { zip: zipValue });
  }

  function close() {
    if (!els.root || !isOpen()) return;
    els.root.classList.remove('is-open');
    document.body.classList.remove('tw-intake-open');
    document.removeEventListener('keydown', onKeydown);
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    emit('tw-intake-close', { state: state });
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function startOver() {
    rotateSessionToken();
    clearPhotos();
    priorTurns = [];
    lastResponse = null;
    els.textarea.value = '';
    renderIdle('Start fresh with a new description.');
    els.textarea.focus();
  }

  function wireEntries() {
    document.querySelectorAll('.tw-intake-entry').forEach(function (entry) {
      var input = entry.querySelector('.tw-intake-entry__input');
      var button = entry.querySelector('.tw-intake-entry__cta');
      function launch() {
        open({ prefillText: input ? input.value : '' });
      }
      if (input) input.addEventListener('focus', launch);
      if (button) button.addEventListener('click', launch);
    });
    document.querySelectorAll('[data-tw-intake-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        open({ prefillText: button.getAttribute('data-prefill') || '', zip: button.getAttribute('data-zip') || '' });
      });
    });
  }

  window.TWIntake = { open: open, close: close };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireEntries);
  } else {
    wireEntries();
  }
})();
