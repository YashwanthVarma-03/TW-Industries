/* ============================================
   TradeWorks AI — Main JavaScript
   Navigation, Dropdowns, Sticky Header, Mobile Menu

   Works both when header/footer are inline OR
   loaded dynamically via components.js
   ============================================ */

(function () {
  'use strict';

  function initNavigation() {
    var header = document.getElementById('site-header');
    var navToggle = document.querySelector('.nav-toggle');
    var dropdownButtons = document.querySelectorAll('.nav-dropdown > button');

    if (!header) return; // header not in DOM yet

    // --- Mobile Menu Toggle (slide-in drawer + backdrop) ---
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-nav-backdrop';
    document.body.appendChild(backdrop);

    function closeMobileNav() {
      document.body.classList.remove('mobile-nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var isOpen = document.body.classList.toggle('mobile-nav-open');
        navToggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }

    backdrop.addEventListener('click', closeMobileNav);

    // Escape key closes the drawer (standard modal-style dismiss)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('mobile-nav-open')) {
        closeMobileNav();
        if (navToggle) navToggle.focus();
      }
    });

    // --- Dropdown helpers ---
    // The current header's mega-menus are shown via `.nav-dropdown.is-open`
    // (CSS). Toggle that class on the PARENT so it works on mobile (no hover)
    // and on desktop click. The legacy `.dropdown-menu`/`.active` path is kept
    // for any older inline header that still uses it.
    function openDropdown(btn, menu) {
      btn.setAttribute('aria-expanded', 'true');
      var parent = btn.closest('.nav-dropdown');
      if (parent) parent.classList.add('is-open');
      if (menu) menu.classList.add('active');
    }

    function closeDropdown(btn, menu) {
      btn.setAttribute('aria-expanded', 'false');
      var parent = btn.closest('.nav-dropdown');
      if (parent) parent.classList.remove('is-open');
      if (menu) menu.classList.remove('active');
    }

    function closeAllDropdowns() {
      dropdownButtons.forEach(function (btn) {
        var parent = btn.closest('.nav-dropdown');
        if (!parent) return;
        var menu = parent.querySelector('.dropdown-menu');
        closeDropdown(btn, menu);
      });
    }

    // --- Desktop Dropdown Hover + Click ---
    dropdownButtons.forEach(function (btn) {
      var parent = btn.closest('.nav-dropdown');
      var menu = parent.querySelector('.dropdown-menu');
      var hoverTimeout;

      parent.addEventListener('mouseenter', function () {
        if (window.innerWidth >= 901) {
          clearTimeout(hoverTimeout);
          closeAllDropdowns();
          openDropdown(btn, menu);
        }
      });

      parent.addEventListener('mouseleave', function () {
        if (window.innerWidth >= 901) {
          hoverTimeout = setTimeout(function () {
            closeDropdown(btn, menu);
          }, 200);
        }
      });

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          closeDropdown(btn, menu);
        } else {
          closeAllDropdowns();
          openDropdown(btn, menu);
        }
      });

      parent.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          closeDropdown(btn, menu);
          btn.focus();
        }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-dropdown')) {
        closeAllDropdowns();
      }
    });

    // --- Sticky Header Shadow ---
    window.addEventListener('scroll', function () {
      var scroll = window.pageYOffset;
      if (scroll > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });

    // --- Close mobile menu on resize to desktop ---
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && document.body.classList.contains('mobile-nav-open')) {
        document.body.classList.remove('mobile-nav-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });

          if (document.body.classList.contains('mobile-nav-open')) {
            document.body.classList.remove('mobile-nav-open');
            var navToggle = document.querySelector('.nav-toggle');
            if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          }
        }
      });
    });
  }

  function initBlogFilters() {
    var filterBar = document.querySelector('.filter-bar');
    if (!filterBar) return;

    var buttons = filterBar.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('#blog-grid .blog-card');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var category = btn.getAttribute('data-category');

        // Update active state
        buttons.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Filter cards
        cards.forEach(function (card) {
          if (category === 'all' || card.getAttribute('data-category') === category) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  function init() {
    initNavigation();
    initSmoothScroll();
    initBlogFilters();
  }

  // Run immediately (for inline header/footer)
  init();

  // Also run after components.js finishes loading header/footer
  document.addEventListener('components:loaded', init);
})();
