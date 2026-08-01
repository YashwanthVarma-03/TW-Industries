/**
 * Interactive modules for service landing pages (hub, AI agents, marketing, consulting).
 */
(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  /* ── Existing modules ─────────────────────────────────────────────── */

  function initHubConstellation() {
    var root = document.querySelector(".sp-hub-constellation");
    if (!root) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            root.classList.add("is-active");
            io.unobserve(root);
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(root);
  }

  function initAiDemo() {
    var demo = document.querySelector(".sp-ai-demo");
    if (!demo) return;

    var steps = demo.querySelectorAll(".sp-ai-demo-step");
    if (!steps.length) return;

    var idx = 0;
    function show(i) {
      steps.forEach(function (s, j) {
        s.classList.toggle("is-active", j === i);
      });
    }
    show(0);

    setInterval(function () {
      idx = (idx + 1) % steps.length;
      show(idx);
    }, 3200);
  }

  function initMktTabs() {
    var root = document.querySelector(".sp-mkt-tabs");
    if (!root) return;

    var tabs = root.querySelectorAll(".sp-mkt-tab");
    var panels = root.querySelectorAll(".sp-mkt-panel");

    function select(id) {
      tabs.forEach(function (t) {
        var sel = t.getAttribute("data-sp-tab") === id;
        t.setAttribute("aria-selected", sel ? "true" : "false");
      });
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-sp-panel") === id);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        select(tab.getAttribute("data-sp-tab"));
      });
    });

    if (tabs.length) select(tabs[0].getAttribute("data-sp-tab"));
  }

  function initConsultRail() {
    var root = document.querySelector(".sp-consult-rail");
    if (!root) return;

    var tracks = root.querySelectorAll(".sp-consult-track");
    var panels = root.querySelectorAll(".sp-consult-panel");

    function select(id) {
      tracks.forEach(function (t) {
        var sel = t.getAttribute("data-sp-phase") === id;
        t.setAttribute("aria-selected", sel ? "true" : "false");
      });
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-sp-phase-panel") === id);
      });
    }

    tracks.forEach(function (track) {
      track.addEventListener("click", function () {
        select(track.getAttribute("data-sp-phase"));
      });
    });

    if (tracks.length) select(tracks[0].getAttribute("data-sp-phase"));
  }

  function initIndustriesShowcase() {
    var root = document.querySelector(".sp-industry-showcase");
    if (!root) return;

    var tabs = root.querySelectorAll(".sp-industry-tab");
    var panels = root.querySelectorAll(".sp-industry-panel");

    function select(id) {
      tabs.forEach(function (t) {
        var sel = t.getAttribute("data-sp-ind") === id;
        t.setAttribute("aria-selected", sel ? "true" : "false");
      });
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-sp-ind-panel") === id);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        select(tab.getAttribute("data-sp-ind"));
      });
    });

    if (tabs.length) select(tabs[0].getAttribute("data-sp-ind"));
  }

  /* ── New modules ──────────────────────────────────────────────────── */

  /** 1. Scroll progress bar */
  function initScrollProgress() {
    var progressBar = document.querySelector(".scroll-progress");
    if (!progressBar) return;

    window.addEventListener("scroll", function () {
      var scrolled = window.scrollY;
      var total = document.body.scrollHeight - window.innerHeight;
      progressBar.style.width = (scrolled / total * 100) + "%";
    });
  }

  /** 2. Scroll-triggered fade-in */
  function initFadeIn() {
    var els = document.querySelectorAll(".fade-in");
    if (!els.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /** 3. Stat counter animation */
  function initStatCounters() {
    var nums = document.querySelectorAll(".stat-num");
    if (!nums.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            animateCounter(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    nums.forEach(function (el) {
      io.observe(el);
    });

    function animateCounter(el) {
      var raw = el.textContent.trim();
      var prefix = "";
      var suffix = "";
      var numStr = raw;

      if (numStr.charAt(0) === "$") {
        prefix = "$";
        numStr = numStr.substring(1);
      }
      if (numStr.charAt(numStr.length - 1) === "%") {
        suffix = "%";
        numStr = numStr.substring(0, numStr.length - 1);
      }

      var target = parseFloat(numStr.replace(/,/g, ""));
      if (isNaN(target)) return;

      var isFloat = numStr.indexOf(".") !== -1;
      var decimals = isFloat ? (numStr.split(".")[1] || "").length : 0;
      var duration = 1200;
      var start = performance.now();

      function step(now) {
        var elapsed = now - start;
        var progress = Math.min(elapsed / duration, 1);
        // ease-out quad
        var eased = 1 - (1 - progress) * (1 - progress);
        var current = eased * target;

        if (isFloat) {
          el.textContent = prefix + current.toFixed(decimals) + suffix;
        } else {
          el.textContent = prefix + Math.round(current) + suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // ensure final value is exact
          el.textContent = prefix + (isFloat ? target.toFixed(decimals) : target) + suffix;
        }
      }

      requestAnimationFrame(step);
    }
  }

  /** 4. FAQ accordion */
  function initFaqAccordion() {
    var items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var btn = item.querySelector(".faq-question");
      if (!btn) return;

      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");

        // close all other items first (accordion)
        items.forEach(function (other) {
          if (other !== item) other.classList.remove("open");
        });

        // toggle clicked item
        item.classList.toggle("open", !isOpen);
      });
    });
  }

  /** 5. Industry chip filter */
  function initChipFilter() {
    var chips = document.querySelectorAll(".chip[data-filter]");
    var cards = document.querySelectorAll(".industry-card[data-trade]");
    if (!chips.length || !cards.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var filter = chip.getAttribute("data-filter");

        // update active chip state
        chips.forEach(function (c) {
          c.classList.toggle("active", c === chip);
        });

        cards.forEach(function (card) {
          var trade = card.getAttribute("data-trade");
          var match = filter === "all" || trade === filter;
          card.style.opacity = match ? "1" : "0.2";
          card.style.pointerEvents = match ? "auto" : "none";
        });
      });
    });
  }

  /** 6. Active nav highlight */
  function initActiveNav() {
    var links = document.querySelectorAll('.nav-link[href^="#"]');
    var sections = document.querySelectorAll("section[id]");
    if (!links.length || !sections.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var id = e.target.getAttribute("id");
            links.forEach(function (link) {
              link.classList.toggle(
                "active",
                link.getAttribute("href") === "#" + id
              );
            });
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach(function (sec) {
      io.observe(sec);
    });
  }

  /* ── Bootstrap ────────────────────────────────────────────────────── */

  onReady(function () {
    var body = document.body;
    if (body.classList.contains("page-service")) {
      initHubConstellation();
      initAiDemo();
      initMktTabs();
      initConsultRail();
      initScrollProgress();
      initFadeIn();
      initStatCounters();
      initFaqAccordion();
      initChipFilter();
      initActiveNav();
    }
    if (body.classList.contains("page-industries")) {
      initIndustriesShowcase();
    }
  });
})();
