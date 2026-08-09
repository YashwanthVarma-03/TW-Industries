/* =============================================================================
 * contractor-form-handler.js — TradeWorks Select 7-step application wizard
 * -----------------------------------------------------------------------------
 * Vanilla JS. Depends only on the Supabase JS client (CDN) + window.SUPABASE_CONFIG.
 *
 * Responsibilities:
 *   - Wizard navigation (7 steps), progress bar, focus management
 *   - Per-step validation (only the current step's fields)
 *   - Conditional show/hide (data-when / data-equals)
 *   - Dynamic category-experience selects + 1–3 references
 *   - Draft save/resume via localStorage (key: tradeworks-contractor-app-draft)
 *   - Two-table insert: contractor_profiles -> contractor_references
 *     (was contractor_applications; rewired to the unified profile table)
 *
 * THIS ROUND: file uploads are NOT implemented. The 5 *_doc_path columns are
 * always sent as null and the file inputs are disabled in the HTML.
 * ===========================================================================*/
(function () {
  'use strict';

  var DRAFT_KEY = 'tradeworks-contractor-app-draft';
  var TOTAL_STEPS = 7;
  var STEP_TITLES = [
    'Company & Contact',
    'Business Details',
    'Team & Capacity',
    'Services & Coverage',
    'Licensing, Insurance & Compliance',
    'References & Reputation',
    'Acknowledgment & Signature'
  ];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var form = document.getElementById('select-form');
  if (!form) return;

  var wrapper    = document.getElementById('select-form-wrapper');
  var success    = document.getElementById('select-success');
  var backBtn    = document.getElementById('wiz-back');
  var nextBtn    = document.getElementById('wiz-next');
  var progFill   = document.getElementById('wiz-progress-fill');
  var stepNumEl  = document.getElementById('wiz-step-num');
  var stepLabel  = document.getElementById('wiz-step-label');
  var errorBanner = document.getElementById('select-error-banner');
  var honeypot   = document.getElementById('sel-website-url');
  var draftBanner = document.getElementById('draft-banner');

  var steps = Array.prototype.slice.call(form.querySelectorAll('.wizard-step'));
  var current = 1;

  // ---- Supabase client ------------------------------------------------------
  var cfg = window.SUPABASE_CONFIG || {};
  var sb = null;
  if (window.supabase && cfg.url && cfg.publishableKey) {
    sb = window.supabase.createClient(cfg.url, cfg.publishableKey);
  } else {
    console.error('[select-form] Supabase not initialised. Check the CDN <script> and supabase-config.js.');
  }

  // ---- Tiny helpers ---------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? (el.value || '').trim() : ''; }
  function nn(v) { return v === '' || v == null ? null : v; }
  function intOrNull(id) { var v = val(id); if (v === '') return null; var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function intOrZero(id) { var n = intOrNull(id); return n == null ? 0 : n; }
  function cb(id) { var el = $(id); return !!(el && el.checked); }
  function radio(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function ynBool(name) { var v = radio(name); return v === 'Yes' ? true : (v === 'No' ? false : null); }
  function checkedArray(name) {
    var out = [];
    form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (c) { out.push(c.value); });
    return out;
  }
  function addressObj(prefix) {
    var street = val(prefix + '-street'), city = val(prefix + '-city'),
        state = val(prefix + '-state'), zip = val(prefix + '-zip');
    if (!street && !city && !state && !zip) return null;
    return { street: street, city: city, state: state, zip: zip };
  }

  function setError(id, msg) {
    var el = $(id), err = $(id + '-error');
    if (el) {
      if (msg) { el.classList.add('input-error'); el.setAttribute('aria-invalid', 'true'); }
      else { el.classList.remove('input-error'); el.removeAttribute('aria-invalid'); }
    }
    if (err) err.textContent = msg || '';
    return !msg;
  }
  function setGroupError(errId, msg) { var e = $(errId); if (e) e.textContent = msg || ''; return !msg; }
  function showBanner(msg) { errorBanner.textContent = msg; errorBanner.classList.add('visible'); errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function hideBanner() { errorBanner.textContent = ''; errorBanner.classList.remove('visible'); }

  // ---- Conditional show/hide engine ----------------------------------------
  // <div class="cond" data-when="controlIdOrRadioName" data-equals="true|Yes|...">
  function condValue(key) {
    var el = $(key);
    if (el && el.type === 'checkbox') return el.checked ? 'true' : 'false';
    var r = form.querySelector('input[name="' + key + '"]:checked');
    if (r) return r.value;
    return '';
  }
  function applyConditionals() {
    form.querySelectorAll('.cond').forEach(function (c) {
      var key = c.getAttribute('data-when');
      var want = c.getAttribute('data-equals') || 'true';
      c.hidden = condValue(key) !== want;
    });
  }
  form.addEventListener('change', applyConditionals);

  // ---- Category-experience follow-ups (Step 4) ------------------------------
  // When a service category is checked, reveal a "Years of experience" select.
  var EXP_OPTS = ['Under 1', '1-2', '3-5', '5-10', '10+'];
  function buildExpSelect(cat) {
    var wrap = document.createElement('div');
    wrap.className = 'cat-exp';
    wrap.setAttribute('data-cat', cat);
    var id = 'exp-' + cat.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = cat + ' — years of experience';
    var sel = document.createElement('select');
    sel.id = id; sel.className = 'cat-exp-select'; sel.setAttribute('data-cat', cat);
    sel.innerHTML = '<option value="">Select…</option>' +
      EXP_OPTS.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
    wrap.appendChild(label); wrap.appendChild(sel);
    return wrap;
  }
  function findByCat(host, selectorTag, cat) {
    // Safe lookup by data-cat (category labels contain spaces/&// that break
    // quoted attribute selectors). Scan instead of querySelector.
    var nodes = host.querySelectorAll(selectorTag);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-cat') === cat) return nodes[i];
    }
    return null;
  }
  function syncCategoryExperience() {
    var host = $('cat-exp-host');
    if (!host) return;
    var checked = checkedArray('service_categories');
    // remove stale
    Array.prototype.slice.call(host.children).forEach(function (child) {
      if (checked.indexOf(child.getAttribute('data-cat')) === -1) host.removeChild(child);
    });
    // add missing (preserve any existing selections)
    checked.forEach(function (cat) {
      if (!findByCat(host, '.cat-exp', cat)) host.appendChild(buildExpSelect(cat));
    });
    host.hidden = checked.length === 0;
  }
  form.querySelectorAll('input[name="service_categories"]').forEach(function (c) {
    c.addEventListener('change', syncCategoryExperience);
  });

  // ---- References (Step 6): 1–3 dynamic blocks ------------------------------
  var refHost = $('refs-host');
  var addRefBtn = $('add-ref');
  var REF_FIELDS = ['contact_name', 'company_name', 'phone', 'email', 'relationship', 'years_worked_together'];
  var REL_OPTS = ['Property Manager', 'General Contractor', 'Subcontractor partner', 'Past client', 'Industry peer', 'Other'];
  var YRS_OPTS = ['Under 1', '1-2', '3-5', '5+'];

  function refBlockHTML(index) {
    var n = index + 1;
    return '' +
      '<div class="reference-block" data-ref="' + index + '">' +
        '<div class="ref-head"><strong>Reference ' + n + (n === 1 ? ' <span class="required" aria-hidden="true">*</span>' : '') + '</strong>' +
          (n > 1 ? '<button type="button" class="ref-remove" data-ref-remove="' + index + '">Remove</button>' : '') +
        '</div>' +
        '<div class="pmf-row pmf-row-2">' +
          '<div class="form-group"><label>Contact name <span class="required" aria-hidden="true">*</span>' +
            '<input type="text" data-field="contact_name" autocomplete="off"></label></div>' +
          '<div class="form-group"><label>Company name <span class="required" aria-hidden="true">*</span>' +
            '<input type="text" data-field="company_name" autocomplete="off"></label></div>' +
        '</div>' +
        '<div class="pmf-row pmf-row-2">' +
          '<div class="form-group"><label>Phone <span class="required" aria-hidden="true">*</span>' +
            '<input type="tel" data-field="phone" autocomplete="off"></label></div>' +
          '<div class="form-group"><label>Email <span class="required" aria-hidden="true">*</span>' +
            '<input type="email" data-field="email" autocomplete="off"></label></div>' +
        '</div>' +
        '<div class="pmf-row pmf-row-2">' +
          '<div class="form-group"><label>Relationship' +
            '<select data-field="relationship"><option value="">Select…</option>' +
            REL_OPTS.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="form-group"><label>Years worked together' +
            '<select data-field="years_worked_together"><option value="">Select…</option>' +
            YRS_OPTS.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></label></div>' +
        '</div>' +
      '</div>';
  }
  function refCount() { return refHost ? refHost.querySelectorAll('.reference-block').length : 0; }
  function refreshAddBtn() { if (addRefBtn) addRefBtn.style.display = refCount() >= 3 ? 'none' : ''; }
  function addReference() {
    if (refCount() >= 3) return;
    var div = document.createElement('div');
    div.innerHTML = refBlockHTML(refCount());
    refHost.appendChild(div.firstChild);
    refreshAddBtn();
  }
  function readReferences() {
    var out = [];
    if (!refHost) return out;
    refHost.querySelectorAll('.reference-block').forEach(function (block) {
      var r = {};
      REF_FIELDS.forEach(function (f) {
        var el = block.querySelector('[data-field="' + f + '"]');
        r[f] = el ? (el.value || '').trim() : '';
      });
      out.push(r);
    });
    return out;
  }
  if (addRefBtn) addRefBtn.addEventListener('click', addReference);
  if (refHost) {
    refHost.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-ref-remove]');
      if (!btn) return;
      var block = btn.closest('.reference-block');
      if (block && refCount() > 1) { block.parentNode.removeChild(block); refreshAddBtn(); }
    });
    if (refCount() === 0) addReference(); // ensure one block exists
  }

  // ---- Per-step validation --------------------------------------------------
  function reqText(id, msg) { return setError(id, val(id) ? '' : (msg || 'This field is required.')); }

  function validateStep(n) {
    var ok = true;
    if (n === 1) {
      ok = reqText('f-company-legal-name', 'Company legal name is required.') && ok;
      ok = reqText('f-primary-contact', 'Primary contact name is required.') && ok;
      var email = val('f-primary-email');
      ok = setError('f-primary-email', !email ? 'Email is required.' : (!EMAIL_RE.test(email) ? 'Enter a valid email address.' : '')) && ok;
      var ph = val('f-primary-phone').replace(/\D/g, '');
      ok = setError('f-primary-phone', !val('f-primary-phone') ? 'Phone is required.' : (ph.length < 7 ? 'Enter a valid phone (7+ digits).' : '')) && ok;
      ok = reqText('f-phys-street', 'Street is required.') && ok;
      ok = reqText('f-phys-city', 'City is required.') && ok;
      ok = reqText('f-phys-state', 'State is required.') && ok;
      ok = reqText('f-phys-zip', 'ZIP is required.') && ok;
      if (!cb('f-mailing-same')) {
        ok = reqText('f-mail-street', 'Mailing street is required.') && ok;
        ok = reqText('f-mail-city', 'Mailing city is required.') && ok;
        ok = reqText('f-mail-state', 'Mailing state is required.') && ok;
        ok = reqText('f-mail-zip', 'Mailing ZIP is required.') && ok;
      }
    } else if (n === 2) {
      ok = reqText('f-ein', 'Federal EIN is required.') && ok;
    } else if (n === 3) {
      ok = setError('f-ft', val('f-ft') === '' ? 'Required.' : '') && ok;
      ok = setError('f-field-techs', val('f-field-techs') === '' ? 'Required.' : '') && ok;
      ok = setError('f-vehicles', val('f-vehicles') === '' ? 'Required.' : '') && ok;
    } else if (n === 4) {
      ok = setGroupError('service_categories-error', checkedArray('service_categories').length ? '' : 'Select at least one service category.') && ok;
    } else if (n === 5) {
      ok = setGroupError('has_gl_insurance-error', radio('has_gl_insurance') ? '' : 'Please indicate whether you carry general liability insurance.') && ok;
      ok = setGroupError('willing_additional_insured-error', radio('willing_additional_insured') ? '' : 'Please answer this question.') && ok;
    } else if (n === 6) {
      var refs = readReferences();
      var firstComplete = refs.some(function (r) {
        return r.contact_name && r.company_name && r.phone.replace(/\D/g, '').length >= 7 && EMAIL_RE.test(r.email);
      });
      ok = setGroupError('references-error', firstComplete ? '' : 'Please provide at least one complete reference (name, company, valid phone & email).') && ok;
    } else if (n === 7) {
      var acks = ['ack1', 'ack2', 'ack3', 'ack4', 'ack5', 'ack6', 'ack7'];
      var allAck = acks.every(function (id) { return cb(id); });
      ok = setGroupError('acknowledgments-error', allAck ? '' : 'Please confirm all acknowledgments.') && ok;
      ok = reqText('f-esig-name', 'Please print your full name.') && ok;
      ok = reqText('f-esig-title', 'Title is required.') && ok;
      ok = reqText('f-esig-date', 'Date is required.') && ok;
    }
    return ok;
  }

  // ---- Wizard navigation ----------------------------------------------------
  function updateProgress() {
    if (progFill) progFill.style.width = Math.round((current / TOTAL_STEPS) * 100) + '%';
    if (stepNumEl) stepNumEl.textContent = 'Step ' + current + ' of ' + TOTAL_STEPS;
    if (stepLabel) stepLabel.textContent = STEP_TITLES[current - 1];
    if (backBtn) backBtn.disabled = current === 1;
    if (nextBtn) nextBtn.textContent = current === TOTAL_STEPS ? 'Submit Application' : 'Next';
    updateSubmitGate();
  }
  function showStep(n, focusIt) {
    current = Math.max(1, Math.min(TOTAL_STEPS, n));
    steps.forEach(function (s) { s.hidden = parseInt(s.getAttribute('data-step'), 10) !== current; });
    updateProgress();
    if (focusIt !== false) {
      var panel = steps[current - 1];
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var firstField = panel.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
        if (firstField) { try { firstField.focus({ preventScroll: true }); } catch (e) { firstField.focus(); } }
      }
    }
  }
  function goNext() {
    if (current < TOTAL_STEPS) {
      if (!validateStep(current)) { focusFirstError(); return; }
      saveDraft();
      showStep(current + 1);
    } else {
      submitApplication();
    }
  }
  function goBack() { if (current > 1) showStep(current - 1); }
  function focusFirstError() {
    var el = steps[current - 1].querySelector('.input-error, [aria-invalid="true"]');
    if (el) { try { el.focus(); } catch (e) {} }
  }
  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (backBtn) backBtn.addEventListener('click', goBack);

  // Step 7 submit gate: enabled only when all acks + signature present.
  function updateSubmitGate() {
    if (current !== TOTAL_STEPS || !nextBtn) { if (nextBtn) nextBtn.disabled = false; return; }
    var acks = ['ack1', 'ack2', 'ack3', 'ack4', 'ack5', 'ack6', 'ack7'].every(function (id) { return cb(id); });
    var sig = val('f-esig-name') && val('f-esig-title') && val('f-esig-date');
    nextBtn.disabled = !(acks && sig);
  }
  form.addEventListener('input', updateSubmitGate);
  form.addEventListener('change', updateSubmitGate);

  // ---- Draft save / resume --------------------------------------------------
  function collectDraft() {
    var d = { step: current, fields: {}, checks: {}, radios: {}, refs: readReferences() };
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.name || el.closest('.reference-block') || el.type === 'file') return;
      if (el.type === 'checkbox') {
        if (!d.checks[el.name]) d.checks[el.name] = [];
        if (el.checked) d.checks[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) d.radios[el.name] = el.value;
      } else {
        d.fields[el.name] = el.value;
      }
    });
    // category experience selections
    d.catExp = {};
    form.querySelectorAll('.cat-exp-select').forEach(function (s) { if (s.value) d.catExp[s.getAttribute('data-cat')] = s.value; });
    return d;
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft())); } catch (e) {}
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
  function restoreDraft(d) {
    // text/select first (so service_categories checks can rebuild exp selects after)
    Object.keys(d.fields || {}).forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      if (el && el.type !== 'file') el.value = d.fields[name];
    });
    Object.keys(d.radios || {}).forEach(function (name) {
      var el = form.querySelector('input[name="' + name + '"][value="' + d.radios[name] + '"]');
      if (el) el.checked = true;
    });
    Object.keys(d.checks || {}).forEach(function (name) {
      var vals = d.checks[name] || [];
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (el) { el.checked = vals.indexOf(el.value) !== -1; });
    });
    // references
    if (refHost && d.refs && d.refs.length) {
      refHost.innerHTML = '';
      d.refs.forEach(function (r, i) {
        var div = document.createElement('div'); div.innerHTML = refBlockHTML(i); var block = div.firstChild;
        REF_FIELDS.forEach(function (f) { var el = block.querySelector('[data-field="' + f + '"]'); if (el) el.value = r[f] || ''; });
        refHost.appendChild(block);
      });
      refreshAddBtn();
    }
    applyConditionals();
    syncCategoryExperience();
    if (d.catExp) {
      var host = $('cat-exp-host');
      Object.keys(d.catExp).forEach(function (cat) {
        var s = host ? findByCat(host, '.cat-exp-select', cat) : null;
        if (s) s.value = d.catExp[cat];
      });
    }
    // File inputs can't be restored from a draft (browser security). Tell the
    // user they'll need to re-select their documents in Step 5.
    var fileNote = $('step5-draft-note');
    if (fileNote) fileNote.hidden = false;
    showStep(d.step || 1);
  }

  // ---- Submission -----------------------------------------------------------
  function setSubmitting(on) {
    if (!nextBtn) return;
    nextBtn.disabled = on;
    nextBtn.textContent = on ? 'Submitting…' : 'Submit Application';
    if (backBtn) backBtn.disabled = on;
  }

  function buildPayload(applicationId) {
    var hasLicense = radio('has_trade_license');           // "Yes" / "No" / "N/A …"
    var glYes = radio('has_gl_insurance') === 'Yes';
    var wcYes = radio('has_workers_comp') === 'Yes';
    var autoYes = cb('f-has-auto');
    var catExp = {};
    form.querySelectorAll('.cat-exp-select').forEach(function (s) { if (s.value) catExp[s.getAttribute('data-cat')] = s.value; });

    // Split physical_address + mailing_address objects into individual columns
    // to match the unified contractor_profiles schema (no JSON address blobs).
    var phys = addressObj('f-phys') || { street: null, city: null, state: null, zip: null };
    var mailingSame = cb('f-mailing-same');
    var mail = mailingSame ? { street: null, city: null, state: null, zip: null }
                           : (addressObj('f-mail') || { street: null, city: null, state: null, zip: null });

    return {
      // Linkage — client-generated UUID lands in application_uuid (NOT id;
      // id is a BIGSERIAL on contractor_profiles).
      application_uuid: applicationId,

      // Section 1 — Company & Contacts
      company_legal_name: val('f-company-legal-name'),
      dba_name: nn(val('f-dba')),
      primary_contact_name: val('f-primary-contact'),
      primary_contact_title: nn(val('f-primary-title')),
      primary_email: val('f-primary-email'),
      primary_phone: val('f-primary-phone'),
      secondary_contact_name: nn(val('f-secondary-contact')),
      secondary_contact_phone: nn(val('f-secondary-phone')),
      website: nn(val('f-website')),
      // Physical address — split into 4 columns
      address_street: nn(phys.street),
      address_city:   nn(phys.city),
      address_state:  nn(phys.state),
      address_zip:    nn(phys.zip),
      // Mailing address — split into 4 columns + boolean flag
      mailing_same_as_physical: mailingSame,
      mailing_address_street: nn(mail.street),
      mailing_address_city:   nn(mail.city),
      mailing_address_state:  nn(mail.state),
      mailing_address_zip:    nn(mail.zip),

      // Section 2 — Business Details
      entity_type: nn(val('f-entity-type')),
      fl_sunbiz_number: nn(val('f-sunbiz')),
      ein: val('f-ein'),                                       // was: federal_ein
      date_established: nn(val('f-date-established')),
      years_in_business: nn(val('f-years')),
      previous_business_names: nn(val('f-prev-names')),
      annual_revenue_range: nn(val('f-annual-revenue')),

      // Section 3 — Team & Capacity
      ft_employees: intOrZero('f-ft'),
      pt_employees: intOrNull('f-pt'),
      field_technicians: intOrZero('f-field-techs'),
      office_staff: intOrNull('f-office'),
      dispatchers: intOrNull('f-dispatchers'),
      sales_estimators: intOrNull('f-sales'),
      supervisors: intOrNull('f-supervisors'),
      uses_subcontractors: cb('f-uses-subs'),
      subcontractor_count: cb('f-uses-subs') ? intOrNull('f-sub-count') : 0,
      service_vehicles: intOrZero('f-vehicles'),
      vehicle_types: checkedArray('vehicle_types'),
      daily_job_capacity: intOrNull('f-daily-cap'),
      monthly_job_volume: intOrNull('f-monthly-vol'),
      available_capacity_pct: nn(val('f-avail-cap')),
      willing_to_hire: ynBool('willing_to_hire'),
      // business_hours (free-text from f-business-hours) lands in
      // business_hours_notes — the JSONB business_hours column is reserved
      // for the Profile editor's structured 7-day grid.
      business_hours_notes: nn(val('f-business-hours')),
      after_hours_availability: cb('f-after-hours'),           // was: offers_after_hours
      after_hours_details: cb('f-after-hours') ? nn(val('f-after-hours-details')) : null,
      avg_urgent_response_time: nn(val('f-urgent')),
      languages: checkedArray('languages'),

      // Section 4 — Service Categories
      service_categories: checkedArray('service_categories'),
      service_categories_experience_years: Object.keys(catExp).length ? catExp : null,  // was: category_experience
      service_cities: checkedArray('service_cities'),
      service_radius: nn(val('f-radius')),
      property_types: checkedArray('property_types'),

      // Section 5 — Licensing & Insurance
      has_trade_license: nn(hasLicense),
      licensing_body: hasLicense === 'Yes' ? nn(val('f-licensing-body')) : null,
      license_type: hasLicense === 'Yes' ? nn(val('f-license-type')) : null,
      license_number: hasLicense === 'Yes' ? nn(val('f-license-number')) : null,
      license_expiration: hasLicense === 'Yes' ? nn(val('f-license-exp')) : null,
      license_doc_path: null,                                  // overwritten with uploaded path before insert
      license_ever_suspended: cb('f-license-suspended'),
      license_suspended_details: cb('f-license-suspended') ? nn(val('f-suspension-details')) : null,  // was: license_suspension_details
      pending_complaints: cb('f-pending-complaints'),
      pending_complaints_details: cb('f-pending-complaints') ? nn(val('f-complaint-details')) : null,  // was: pending_complaint_details
      additional_certifications: checkedArray('additional_certifications'),
      has_gl_insurance: glYes,                                 // BOOLEAN NOT NULL
      gl_carrier: glYes ? nn(val('f-gl-carrier')) : null,
      gl_policy_number: glYes ? nn(val('f-gl-policy')) : null,
      gl_per_occurrence: glYes ? nn(val('f-gl-occ')) : null,
      gl_aggregate: glYes ? nn(val('f-gl-agg')) : null,
      gl_expiration: glYes ? nn(val('f-gl-exp')) : null,
      coi_doc_path: null,
      willing_add_tradeworks_insured: radio('willing_additional_insured') === 'Yes',  // was: willing_additional_insured
      has_wc_insurance: nn(radio('has_workers_comp')),         // was: has_workers_comp (TEXT)
      wc_carrier: wcYes ? nn(val('f-wc-carrier')) : null,
      wc_policy_number: wcYes ? nn(val('f-wc-policy')) : null,
      wc_expiration: wcYes ? nn(val('f-wc-exp')) : null,
      wc_doc_path: null,
      has_commercial_auto: autoYes,
      commercial_auto_carrier: autoYes ? nn(val('f-auto-carrier')) : null,    // was: auto_carrier
      commercial_auto_coverage: autoYes ? nn(val('f-auto-coverage')) : null,  // was: auto_coverage
      w9_doc_path: null,
      active_liens: cb('f-liens'),                             // was: active_liens_judgments
      active_liens_details: cb('f-liens') ? nn(val('f-liens-details')) : null,  // was: liens_details
      bankruptcy_7yr: cb('f-bankruptcy'),
      bankruptcy_7yr_details: cb('f-bankruptcy') ? nn(val('f-bankruptcy-details')) : null,  // was: bankruptcy_details
      bbb_complaints: cb('f-bbb'),
      bbb_details: cb('f-bbb') ? nn(val('f-bbb-details')) : null,

      // Section 6 — Online presence + ops (newly added columns)
      google_profile_url: nn(val('f-google-url')),
      google_rating: nn(val('f-google-rating')),
      google_review_count: intOrNull('f-google-count'),
      yelp_url: nn(val('f-yelp')),
      bbb_url: nn(val('f-bbb-url')),
      thumbtack_url: nn(val('f-thumbtack')),
      uses_crm: cb('f-uses-crm'),
      crm_platform: cb('f-uses-crm') ? nn(val('f-crm-platform')) : null,
      offers_warranty: cb('f-offers-warranty'),
      warranty_terms: cb('f-offers-warranty') ? nn(val('f-warranty-terms')) : null,
      callback_rate: nn(val('f-callback')),
      complaint_process: nn(val('f-complaint-process')),

      // Section 7 — Acknowledgments & E-Signature
      ack1: cb('ack1'),                                        // was: acknowledged_fee_structure
      ack2: cb('ack2'),                                        // was: acknowledged_payment_flow
      ack3: cb('ack3'),                                        // was: acknowledged_insurance_req
      ack4: cb('ack4'),                                        // was: acknowledged_license_req
      ack5: cb('ack5'),                                        // was: acknowledged_sla_req
      ack6: cb('ack6'),                                        // was: acknowledged_background_check
      ack7: cb('ack7'),                                        // was: acknowledged_no_volume_guarantee
      signature_name: val('f-esig-name'),                      // was: esignature_name
      signature_title: val('f-esig-title'),                    // was: esignature_title
      signature_date: val('f-esig-date'),                      // was: esignature_date
      referral_source: nn(val('f-referral'))
      // application_submitted_at: omitted intentionally — server-side DEFAULT now()
      // user_id: omitted intentionally — RLS policy requires user_id IS NULL on anon inserts
      // business_hours: omitted intentionally — JSONB column reserved for the Profile editor
    };
  }

  function buildReferenceRows(appId) {
    return readReferences()
      .filter(function (r) { return r.contact_name && r.company_name && r.phone && r.email; })
      .map(function (r) {
        return {
          // FK to contractor_profiles.application_uuid (the column that
          // actually links rows post-rewire). We do NOT write the legacy
          // `application_id` column — its FK still points at
          // contractor_applications_archive, so writing it would violate
          // the constraint on every new submission.
          profile_application_uuid: appId,
          contact_name: r.contact_name,
          company_name: r.company_name,
          phone: r.phone,
          email: r.email,
          relationship: nn(r.relationship),
          years_worked_together: nn(r.years_worked_together)
        };
      });
  }

  // Generate the application UUID client-side so we can use it as the
  // contractor_references foreign key WITHOUT a SELECT-after-INSERT. The anon
  // role has no SELECT policy on contractor_profiles, so chaining .select()
  // on the insert trips Postgres RLS error 42501 even though the INSERT itself
  // succeeds. The UUID lands in contractor_profiles.application_uuid (UNIQUE)
  // and in contractor_references.profile_application_uuid (FK).
  function genUUID() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ---- File uploads (Step 5 documents) --------------------------------------
  var FILE_FIELDS = [
    { inputId: 'f-license-doc', statusId: 'license-status', docType: 'license', col: 'license_doc_path', label: 'License document' },
    { inputId: 'f-coi-doc',     statusId: 'coi-status',     docType: 'coi',     col: 'coi_doc_path',     label: 'COI insurance document' },
    { inputId: 'f-wc-doc',      statusId: 'wc-status',      docType: 'wc',      col: 'wc_doc_path',      label: "Workers' comp document" },
    { inputId: 'f-w9-doc',      statusId: 'w9-status',      docType: 'w9',      col: 'w9_doc_path',      label: 'W-9 document' }
  ];
  var MAX_FILE_BYTES = 10 * 1024 * 1024;
  var ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'heic'];
  var ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];

  function fmtMB(bytes) { return (bytes / (1024 * 1024)).toFixed(1) + ' MB'; }
  function fileExt(name) { var p = (name || '').split('.'); return p.length > 1 ? p.pop().toLowerCase() : ''; }
  function setFileStatus(statusId, msg, cls) {
    var el = $(statusId);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'pmf-file-status' + (cls ? ' ' + cls : '');
  }

  // Per-file client-side validation on selection (before submit).
  function registerFileInputs() {
    FILE_FIELDS.forEach(function (f) {
      var input = $(f.inputId);
      if (!input) return;
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) { setFileStatus(f.statusId, '', ''); return; }
        if (file.size > MAX_FILE_BYTES) {
          input.value = '';
          setFileStatus(f.statusId, 'File too large. Max 10 MB.', 'is-error');
          return;
        }
        var ext = fileExt(file.name);
        var extOk = ALLOWED_EXT.indexOf(ext) !== -1;
        var mimeOk = !!file.type && ALLOWED_MIME.indexOf(file.type.toLowerCase()) !== -1;
        // HEIC (and some browsers) report empty/odd MIME — accept on extension OR mime.
        if (!extOk && !mimeOk) {
          input.value = '';
          setFileStatus(f.statusId, 'Invalid file type. PDF, JPG, PNG, or HEIC only.', 'is-error');
          return;
        }
        setFileStatus(f.statusId, 'Ready to upload: ' + file.name + ' (' + fmtMB(file.size) + ')', 'is-ready');
      });
    });
  }

  // Uploading-panel progress
  var uploadDone = 0, uploadTotal = 0;
  function setUploadCounter() {
    var el = $('upload-counter');
    if (el) el.textContent = uploadDone + ' of ' + uploadTotal + ' complete';
  }
  function setUploadLine(f, msg, cls) {
    var el = $('up-line-' + f.docType);
    if (!el) return;
    el.className = 'pmf-file-status' + (cls ? ' ' + cls : '');
    el.textContent = f.label + ': ' + msg;
  }
  function showUploading(selected) {
    uploadDone = 0; uploadTotal = selected.length;
    if (wrapper) wrapper.hidden = true;
    hideBanner();
    var list = $('upload-progress-list');
    if (list) {
      list.innerHTML = '';
      selected.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'pmf-file-status is-uploading';
        div.id = 'up-line-' + item.f.docType;
        div.textContent = item.f.label + ': waiting…';
        list.appendChild(div);
      });
    }
    setUploadCounter();
    var panel = $('select-uploading');
    if (panel) { panel.hidden = false; panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  function isConflict(err) {
    if (!err) return false;
    var code = '' + (err.statusCode || err.status || err.code || '');
    return code === '409' || /duplicate|already exists|resource already/i.test(err.message || '');
  }
  function storageUpload(path, file) {
    return sb.storage.from('contractor-docs').upload(path, file, {
      contentType: file.type || undefined,
      upsert: false
    }).then(function (res) {
      if (res && res.error) throw res.error;
      return path;
    });
  }
  function uploadOne(applicationId, f, file) {
    var ext = fileExt(file.name) || 'bin';
    var path = applicationId + '/' + f.docType + '.' + ext;
    setUploadLine(f, 'uploading…', 'is-uploading');
    return storageUpload(path, file).then(null, function (err) {
      // 409 duplicate (shouldn't happen with a per-application UUID) — retry once.
      if (isConflict(err)) {
        return storageUpload(applicationId + '/' + f.docType + '-' + Date.now() + '.' + ext, file);
      }
      throw err;
    });
  }
  // Upload all selected files in parallel; never let one block another.
  function uploadAll(applicationId, selected) {
    var tasks = selected.map(function (item) {
      return uploadOne(applicationId, item.f, item.file).then(function (path) {
        setUploadLine(item.f, 'uploaded ✓', 'is-success');
        uploadDone++; setUploadCounter();
        return { f: item.f, ok: true, path: path };
      }).catch(function (err) {
        console.error('[select-form-upload] ' + item.f.docType + ' upload failed:', err);
        setUploadLine(item.f, 'failed — we’ll request this by email', 'is-error');
        uploadDone++; setUploadCounter();
        return { f: item.f, ok: false };
      });
    });
    if (typeof Promise.allSettled === 'function') {
      return Promise.allSettled(tasks).then(function (settled) {
        return settled.map(function (s) { return s.value; });
      });
    }
    return Promise.all(tasks); // tasks never reject (each .catch returns), so equivalent
  }

  // ---- Insert (after uploads) -----------------------------------------------
  // RLS reality: the anon role has INSERT only on contractor_profiles — no
  // UPDATE and no SELECT. So we can neither UPDATE doc paths after insert nor
  // .select() the inserted row. We therefore upload files FIRST, then INSERT the
  // profile with the successful paths already baked in. (No separate UPDATE.)
  // The new anon_insert_contractor_profiles policy also requires user_id IS NULL
  // — buildPayload intentionally never sends a user_id key.
  function insertApplicationAndRefs(applicationId, docPaths, info) {
    var payload = buildPayload(applicationId);
    Object.keys(docPaths).forEach(function (col) { payload[col] = docPaths[col]; });

    sb.from('contractor_profiles').insert([payload]).then(function (appRes) {
      if (appRes.error) { return failApp(appRes.error); }
      var refRows = buildReferenceRows(applicationId);
      if (!refRows.length) { finishSuccess(applicationId, info); return; }
      sb.from('contractor_references').insert(refRows).then(function (refRes) {
        if (refRes.error) { return failReferences(applicationId, refRes.error); }
        finishSuccess(applicationId, info);
      }, function (err) { failReferences(applicationId, err); });
    }, function (err) { failApp(err); });
  }

  function submitApplication() {
    hideBanner();
    // Honeypot — silently "succeed" for bots without writing anything.
    if (honeypot && honeypot.value) { showSuccess('(skipped)', { selected: 0, success: 0, failedLabels: [] }); return; }

    // Validate every step; jump to the first invalid one.
    for (var s = 1; s <= TOTAL_STEPS; s++) {
      if (!validateStep(s)) { showStep(s); focusFirstError(); return; }
    }
    if (!sb) { showBanner('Sorry — the form is not configured correctly right now. Please email one@tradeworksai.com.'); return; }

    setSubmitting(true);
    var applicationId = genUUID();

    // Which document files did the user select? (Inputs inside hidden
    // conditional blocks simply have no file.)
    var selected = [];
    FILE_FIELDS.forEach(function (f) {
      var input = $(f.inputId);
      var file = input && input.files && input.files[0];
      if (file) selected.push({ f: f, file: file });
    });

    // No files → straight to insert + success (no upload summary shown).
    if (selected.length === 0) {
      insertApplicationAndRefs(applicationId, {}, { selected: 0, success: 0, failedLabels: [] });
      return;
    }

    // Files selected → show uploading UI, upload in parallel, then insert.
    showUploading(selected);
    uploadAll(applicationId, selected).then(function (results) {
      var docPaths = {}, failedLabels = [], successCount = 0;
      results.forEach(function (r) {
        if (r.ok) { docPaths[r.f.col] = r.path; successCount++; }
        else { failedLabels.push(r.f.label); }
      });
      insertApplicationAndRefs(applicationId, docPaths, {
        selected: selected.length, success: successCount, failedLabels: failedLabels
      });
    });
  }

  function restoreFormView() {
    var up = $('select-uploading'); if (up) up.hidden = true;
    if (wrapper) wrapper.hidden = false;
  }
  function failApp(err) {
    console.error('[select-form] contractor_profiles insert failed:', err);
    restoreFormView();
    showBanner('Something went wrong submitting your application. Please try again, or email one@tradeworksai.com.');
    setSubmitting(false);
  }
  function failReferences(appId, err) {
    console.error('[select-form] contractor_references insert failed (orphan profile ' + appId + '):', err);
    // Best-effort orphan cleanup. anon has no DELETE permission, so this is
    // expected to fail silently — we try anyway, then guide the user.
    // Note: lookup is by application_uuid now (contractor_profiles.id is BIGSERIAL).
    try { sb.from('contractor_profiles').delete().eq('application_uuid', appId).then(function () {}, function () {}); } catch (e) {}
    restoreFormView();
    showBanner('Your application was partially saved. Please contact one@tradeworksai.com so we can complete it manually. Application ID: ' + appId);
    setSubmitting(false);
  }
  function finishSuccess(appId, info) {
    // Final step before the success screen: register the submitter in the
    // central user table with the contractor role. Fire-and-forget — must NOT
    // gate the success UI, because uploads + application + references already
    // succeeded.
    registerUserRole(val('f-primary-contact'), val('f-primary-email'));
    clearDraft();
    showSuccess(appId, info);
  }

  // Calls the add_user_with_role RPC on Supabase to tag this submitter in the
  // central user table. Errors are logged only — the application is already saved.
  function registerUserRole(name, email) {
    if (!sb || !email) return;
    sb.rpc('add_user_with_role', {
      p_email: email,
      p_name: name || '',
      p_role: 'contractor'
    }).then(function (res) {
      if (res && res.error) console.error('[Role registration] RPC error:', res.error);
    }, function (err) {
      console.error('[Role registration] Network/unexpected error:', err);
    });
  }
  function showSuccess(appId, info) {
    if (wrapper) wrapper.hidden = true;
    var up = $('select-uploading'); if (up) up.hidden = true;
    hideBanner();
    var idEl = $('app-id');
    if (idEl) idEl.textContent = appId || '';

    info = info || { selected: 0, success: 0, failedLabels: [] };
    var summaryEl = $('upload-summary');
    var followEl = $('followup-note');
    var FOLLOWUP_DEFAULT = 'We’ll follow up with instructions for uploading your license, insurance, and W-9 documents.';
    var FOLLOWUP_DONE = 'Thanks for submitting your documents. If anything else is needed, our team will email you.';
    if (summaryEl) {
      if (info.selected === 0) {
        summaryEl.hidden = true;
        summaryEl.textContent = '';
      } else {
        summaryEl.hidden = false;
        if (info.failedLabels.length === 0) {
          summaryEl.textContent = 'All documents uploaded successfully.';
        } else {
          summaryEl.textContent = 'Documents uploaded: ' + info.success + ' of ' + info.selected +
            '. The following could not be uploaded automatically and will be requested by email: ' +
            info.failedLabels.join(', ') + '.';
        }
      }
    }
    // Keep the "we'll follow up" note only when zero files were uploaded.
    if (followEl) { followEl.textContent = (info.success > 0) ? FOLLOWUP_DONE : FOLLOWUP_DEFAULT; }

    if (success) { success.hidden = false; success.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  // ---- Init -----------------------------------------------------------------
  // Default e-signature date = today.
  var esigDate = $('f-esig-date');
  if (esigDate && !esigDate.value) esigDate.value = new Date().toISOString().slice(0, 10);

  applyConditionals();
  registerFileInputs();
  showStep(1, false);

  // Draft banner
  var draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { draft = null; }
  if (draft && draftBanner) {
    draftBanner.hidden = false;
    var resumeBtn = $('draft-resume'), discardBtn = $('draft-discard');
    if (resumeBtn) resumeBtn.addEventListener('click', function () { draftBanner.hidden = true; restoreDraft(draft); });
    if (discardBtn) discardBtn.addEventListener('click', function () { clearDraft(); draftBanner.hidden = true; });
  }

  // Never submit via Enter key mid-wizard.
  form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
