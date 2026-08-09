/* ============================================
   TradeWorks AI - Auth System
   Header auth state management.
   Loaded by components.js after header is injected.
   ============================================ */

(function () {
  'use strict';

  function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true' || !!localStorage.getItem('loginTimestamp');
  }

  function updateHeaderAuth() {
    var isAuth = isAuthenticated();
    ['nav-login-btn', 'mobile-nav-login-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = isAuth ? 'none' : '';
    });
    ['nav-dashboard-btn', 'mobile-nav-dashboard-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = isAuth ? '' : 'none';
    });

    var signupBtn = document.getElementById('nav-signup-btn');
    if (signupBtn) signupBtn.style.display = isAuth ? 'none' : '';

    var loginRow = document.getElementById('nav-login-row');
    if (loginRow) loginRow.style.display = isAuth ? 'none' : '';

    var logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = isAuth ? '' : 'none';
      logoutBtn.onclick = async function () {
        try {
          if (window.twSupabase && window.twSupabase.auth) {
            await window.twSupabase.auth.signOut();
          }
        } catch (error) {
          console.error('Supabase sign-out failed:', error);
        } finally {
          if (window.twSessionShim && window.twSessionShim.clearLegacyKeys) {
            window.twSessionShim.clearLegacyKeys();
          }
          [
            'google_sub',
            'pictureUrl',
            'agentId',
            'elevenlabs_agent_id',
            'assigned_phone_number',
            'text_message',
            'whatsapp'
          ].forEach(function (key) {
            localStorage.removeItem(key);
          });
          sessionStorage.clear();
          window.location.reload();
        }
      };
    }
  }

  updateHeaderAuth();
  document.addEventListener('components:loaded', updateHeaderAuth);
  setTimeout(updateHeaderAuth, 800);

  // google-signup handled inline via supabase.auth.signInWithOAuth - this file keeps header auth state only.
})();
