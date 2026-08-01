/* ============================================
   TradeWorks AI — GA4 Event Tracking
   Automatically fires events for elements with
   data-event attributes + scroll depth tracking
   ============================================ */

(function () {
  'use strict';

  // --- Helper: push event to dataLayer ---
  function trackEvent(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params
    });
  }

  // --- Click-based event tracking ---
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;

    var eventName = el.getAttribute('data-event');
    var params = {};

    // Collect all data- attributes as parameters
    Array.from(el.attributes).forEach(function (attr) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-event') {
        var key = attr.name.replace('data-', '').replace(/-/g, '_');
        params[key] = attr.value;
      }
    });

    // Add button text for CTA clicks
    if (eventName === 'cta_click' || eventName === 'pricing_cta') {
      params.button_text = el.textContent.trim();
    }

    trackEvent(eventName, params);
  });

  // --- FAQ expand tracking ---
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        var questionText = item.querySelector('summary').textContent.trim();
        trackEvent('faq_expand', {
          question_text: questionText,
          page_url: window.location.pathname
        });
      }
    });
  });

  // --- Scroll depth tracking (25%, 50%, 75%, 100%) ---
  var scrollThresholds = [25, 50, 75, 100];
  var scrollFired = {};

  window.addEventListener('scroll', function () {
    var scrollTop = window.pageYOffset;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    var scrollPercent = Math.round((scrollTop / docHeight) * 100);

    scrollThresholds.forEach(function (threshold) {
      if (scrollPercent >= threshold && !scrollFired[threshold]) {
        scrollFired[threshold] = true;
        trackEvent('scroll_depth', {
          depth: threshold + '%'
        });
      }
    });
  }, { passive: true });

})();
