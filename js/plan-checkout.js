/* ============================================
   TradeWorks AI — Plan Checkout Handler
   Auth-gated Zoho Billing checkout flow.

   Usage:
   Any anchor/button with `data-plan-checkout="KEY"` will:
   1. On click, check localStorage.isAuthenticated
   2. If authenticated → redirect to Zoho checkout URL
   3. If not → stash intended URL in sessionStorage and
      redirect to login page. After login, post-login
      handlers (auth.js / login-page.html) honor the
      sessionStorage key and return the user to Zoho.

   KEYS are defined in PLAN_URLS below. Adding a new
   checkout-enabled plan only requires adding its key +
   URL here and adding `data-plan-checkout="KEY"` to the
   button element — no page-specific JS needed.
   ============================================ */

(function () {
  'use strict';

  var BILLING_BASE = 'https://billing.tradeworksai.com/subscribe/247f5a038764abaa95e5d7438b93b4a67906f5e6327bed22ad482bf477cf719e';

  // Plan key → Zoho plan slug (appended to BILLING_BASE)
  var PLAN_URLS = {
    // AI Call Answering
    'starter':                BILLING_BASE + '/7894',
    'professional':           BILLING_BASE + '/9899',

    // Digital Marketing — core
    'gbp':                    BILLING_BASE + '/gbm-management',
    'reputation':             BILLING_BASE + '/7447',
    'content-marketing':      BILLING_BASE + '/content-marketing',
    'social-media':           BILLING_BASE + '/social-media-management',
    'geo-aeo':                BILLING_BASE + '/geo-aeo-optimization',
    'hosting':                BILLING_BASE + '/hosting-maintenance',

    // Ad management (flat $50/mo per campaign)
    'google-ads':             BILLING_BASE + '/google-ads-management',
    'lsa':                    BILLING_BASE + '/lsa-management',
    'social-ads':             BILLING_BASE + '/social-ads-management',

    // Consulting — retainer
    'ongoing-optimization':   BILLING_BASE + '/ongoing-optimization',

    // One-time items (implemented as one-cycle plans in Zoho)
    'website':                BILLING_BASE + '/web-design-development',
    'crm-audit':              BILLING_BASE + '/crm-audit-optimization',
    'crm-setup':              BILLING_BASE + '/crm-setup-implementaion',
    'data-migration-small':   BILLING_BASE + '/dm-s',
    'data-migration-large':   BILLING_BASE + '/dm-l',
    'workflow-automation':    BILLING_BASE + '/al-workflow-automation',
    'team-training':          BILLING_BASE + '/team-training-adoption',
    'additional-workflow':    BILLING_BASE + '/additional-workflow'
  };

  // Post-checkout redirect — appended as query param to every Zoho URL
  var REDIRECT_URL = 'https://tradeworksai.com/dashboard/index.html?subscribed=true';

  // Build final checkout URL with redirect parameter
  function buildCheckoutUrl(baseUrl) {
    var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
    return baseUrl + separator + 'redirect_url=' + encodeURIComponent(REDIRECT_URL);
  }

  // Signup page — first-time pricing visitors don't have an account yet,
  // so send them to sign-up (which links to login for returning customers).
  // Relative paths differ by page depth, so we resolve at runtime.
  function getSignupUrl() {
    var path = window.location.pathname;
    var depth = (path.match(/\//g) || []).length - 1;
    if (path.endsWith('/')) depth = Math.max(depth, 0);
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    if (!prefix) prefix = '';
    return prefix + 'dashboard/login/sign-up.html';
  }

  function handleClick(e) {
    var btn = e.currentTarget;
    var key = btn.getAttribute('data-plan-checkout');
    if (!key) return;

    var baseUrl = PLAN_URLS[key];
    if (!baseUrl) {
      console.warn('[plan-checkout] Unknown plan key:', key);
      return;
    }

    e.preventDefault();

    var url = buildCheckoutUrl(baseUrl);

    var isAuth = false;
    try { isAuth = localStorage.getItem('isAuthenticated') === 'true'; } catch (err) {}

    if (isAuth) {
      window.location.href = url;
    } else {
      try {
        sessionStorage.setItem('postLoginRedirect', url);
        // Stamp with timestamp so post-login readers can ignore stale values
        // (prevents an old plan-checkout intent from hijacking a later sign-in).
        sessionStorage.setItem('postLoginRedirectTime', String(Date.now()));
      } catch (err) {}
      window.location.href = getSignupUrl();
    }
  }

  function wireUp() {
    var buttons = document.querySelectorAll('[data-plan-checkout]');
    buttons.forEach(function (btn) {
      // Avoid double-binding if script runs twice
      if (btn.dataset.planCheckoutBound === 'true') return;
      btn.dataset.planCheckoutBound = 'true';
      btn.addEventListener('click', handleClick);
    });
  }

  // Run immediately and also after components:loaded (for pages loading nav/footer via fetch)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUp);
  } else {
    wireUp();
  }
  document.addEventListener('components:loaded', wireUp);

  // Expose for debugging
  window.TradeWorksPlanCheckout = {
    urls: PLAN_URLS,
    rewire: wireUp
  };
})();
