/* ============================================
   TradeWorks AI — Component Loader
   Loads shared header & footer into any page.
   The shared HTML uses root-absolute paths so the clone works the same on
   every laptop when served from the repo root.
   ============================================ */

(function () {
  'use strict';

  function loadComponent(id, path, callback) {
    var placeholder = document.getElementById(id);
    if (!placeholder) return;

    var url = path;
    fetch(url, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + url);
        return res.text();
      })
      .then(function (html) {
        placeholder.outerHTML = html;
        if (callback) callback();
      })
      .catch(function (err) {
        console.error(err);
        // Still call callback so the overall loader doesn't stall and
        // downstream init (auth system, etc.) still runs.
        if (callback) callback();
      });
  }

  // Only count placeholders that exist on this page (dashboard/login pages
  // don't include a footer-placeholder, for example).
  var componentsToLoad = [
    { id: 'header-placeholder', path: '/components/header.html' },
    { id: 'footer-placeholder', path: '/components/footer.html' }
  ].filter(function (c) { return document.getElementById(c.id); });

  var loaded = 0;
  var total = componentsToLoad.length;

  function onComponentLoaded() {
    loaded++;
    if (loaded >= total) {
      document.dispatchEvent(new Event('components:loaded'));
      // Load auth system after header is in the DOM
      loadAuthSystem();
    }
  }

  // Load Google Identity Services + auth.js
  function loadAuthSystem() {
    return;

    // 1. Load Google Identity Services library
    var gsi = document.createElement('script');
    gsi.src = 'https://accounts.google.com/gsi/client';
    gsi.async = true;
    document.head.appendChild(gsi);

    // 2. Load auth.js (handles One Tap + header button state)
    var auth = document.createElement('script');
    auth.src = '/js/auth.js';
    auth.async = true;
    document.head.appendChild(auth);
  }

  // Article-page enhancements (reading progress, share rail, TOC)
  if (document.body && document.body.classList.contains('article-page')) {
    var blogScript = document.createElement('script');
    blogScript.src = '/js/blog-article.js';
    blogScript.defer = true;
    document.head.appendChild(blogScript);
  }

  // ElevenLabs conversational AI widget — inject on all public pages.
  // Skip dashboard pages (authenticated app surface). Login/signup pages have
  // the widget inline already, so we avoid double-mounting via the guard below.
  (function injectElevenLabsWidget() {
    return; // ElevenLabs conversational AI widget disabled per request.
    var path = window.location.pathname;
    // /dashboard/login/* already embeds the widget inline, so we'd skip anyway
    // via the duplicate-check. /dashboard/* (everything else under dashboard)
    // is the authenticated app and should NOT show the widget.
    var inDashboardApp = path.indexOf('/dashboard/') !== -1 &&
                         path.indexOf('/dashboard/login/') === -1;
    if (inDashboardApp) return;

    // Already present on this page (inline on login/signup) — don't duplicate.
    if (document.querySelector('elevenlabs-convai')) return;

    function mount() {
      if (document.querySelector('elevenlabs-convai')) return;
      var widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', 'agent_9601k9n5wf9yettrkx2pxme93g5z');
      widget.setAttribute('title', 'Your AI Expert is Ready');
      widget.setAttribute('intro', 'Ask me about our services, pricing, or technology.');
      widget.setAttribute('button-text', 'Start Conversation');
      document.body.appendChild(widget);

      var script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      document.head.appendChild(script);
    }

    if (document.body) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount);
    }
  })();

  // If the page has no header/footer placeholders at all, still init auth
  // so logged-in state can be recognised.
  if (total === 0) {
    loadAuthSystem();
  } else {
    componentsToLoad.forEach(function (c) {
      loadComponent(c.id, c.path, onComponentLoaded);
    });
  }
})();
