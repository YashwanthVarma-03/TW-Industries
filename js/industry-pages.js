/**
 * Interactive hero widgets for individual industry pages (body.page-industry).
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

  function initHvacDial(root) {
    var input = root.querySelector(".in-hvac-range");
    var out = root.querySelector("[data-out]");
    if (!input || !out) return;
    var texts = [
      "Peak cooling: AC tune-ups, refrigerant checks, and attic unit triage.",
      "Maintenance mode: filter plans, membership renewals, and tune-up windows.",
      "Heat emergency: no-heat escalated to on-call with address and equipment notes.",
    ];
    function update() {
      var v = parseInt(input.value, 10);
      out.textContent = texts[v] || "";
      input.setAttribute("aria-valuetext", texts[v] || "");
    }
    input.addEventListener("input", update);
    update();
  }

  function initPlumbingMode(root) {
    var btns = root.querySelectorAll("[data-plumb]");
    var out = root.querySelector("[data-out]");
    if (!btns.length || !out) return;
    var copy = {
      routine:
        "Routine: drain cleans, water heater quotes, and remodel rough-ins booked into open slots.",
      emergency:
        "Emergency: burst lines and gas smell flagged — on-call tech notified with full context.",
    };
    function set(mode) {
      btns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-plumb") === mode);
      });
      out.textContent = copy[mode] || "";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        set(b.getAttribute("data-plumb"));
      });
    });
    set("routine");
  }

  function initElectricalPath(root) {
    var steps = root.querySelectorAll("[data-step]");
    var out = root.querySelector("[data-out]");
    if (!steps.length || !out) return;
    var messages = [
      "Intake captures panel age, symptoms, and safety keywords.",
      "License tier and job type matched before dispatch.",
      "Appointment locked — CRM job created with customer notes.",
    ];
    function lit(upTo) {
      steps.forEach(function (s, i) {
        s.classList.toggle("is-lit", i <= upTo);
      });
      out.textContent = messages[upTo] || messages[messages.length - 1];
    }
    steps.forEach(function (s) {
      s.addEventListener("click", function () {
        lit(parseInt(s.getAttribute("data-step"), 10));
      });
    });
    lit(0);
  }

  function initRoofingStorm(root) {
    var input = root.querySelector(".in-roof-range");
    var out = root.querySelector("[data-out]");
    if (!input || !out) return;
    function update() {
      var v = parseInt(input.value, 10);
      if (v < 33) {
        out.textContent =
          "Clear skies: inspections and retail estimates booked at normal pacing.";
      } else if (v < 66) {
        out.textContent =
          "Elevated volume: concurrent calls handled — no busy signal for homeowners.";
      } else {
        out.textContent =
          "Storm mode: surge intake, insurance keywords captured, crews prioritized by damage.";
      }
    }
    input.addEventListener("input", update);
    update();
  }

  function initPaintingSwatches(root) {
    var btns = root.querySelectorAll("[data-paint]");
    var out = root.querySelector("[data-out]");
    if (!btns.length || !out) return;
    var themes = {
      warm: {
        text:
          "Warm palette: interior repaint consults and trim upgrades — estimates follow your pricing rules.",
      },
      cool: {
        text:
          "Cool palette: cabinet and exterior packages — lead quality filters before your painters roll.",
      },
      nature: {
        text:
          "Earthy finishes: deck staining and eco options — scheduling tied to crew availability.",
      },
    };
    function apply(key) {
      root.setAttribute("data-theme", key);
      btns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-paint") === key);
      });
      out.textContent = (themes[key] && themes[key].text) || out.textContent;
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        apply(b.getAttribute("data-paint"));
      });
    });
    apply("warm");
  }

  function initPestSeason(root) {
    var btns = root.querySelectorAll("[data-season]");
    var out = root.querySelector("[data-out]");
    if (!btns.length || !out) return;
    var copy = {
      spring: "Spring: swarmers, ants, and perimeter treatments — routes refill automatically.",
      summer: "Summer: mosquito programs and lawn bundles — subscription upsells scripted.",
      fall: "Fall: rodent exclusion and leaf-season lawn packages.",
      winter: "Winter: indoor pests and dormant lawn planning — callbacks queued.",
    };
    function set(season) {
      btns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-season") === season);
      });
      out.textContent = copy[season] || "";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        set(b.getAttribute("data-season"));
      });
    });
    set("spring");
  }

  function initRePipeline(root) {
    var steps = root.querySelectorAll("[data-re-step]");
    var out = root.querySelector("[data-out]");
    if (!steps.length || !out) return;
    var idx = 0;
    var timer;

    function show(i) {
      var n = steps.length;
      idx = ((i % n) + n) % n;
      steps.forEach(function (s, j) {
        s.classList.toggle("is-active", j === idx);
      });
      var lines = [
        "Inbound lead captured from web, portal, or sign call — no voicemail gap.",
        "Budget, timeline, and pre-approval status qualified before your time.",
        "Showing windows proposed — calendar synced with your CRM.",
        "Deal notes pushed to CRM — nurture sequences continue automatically.",
      ];
      out.textContent = lines[idx] || lines[0];
    }

    function tick() {
      show(idx + 1);
    }

    steps.forEach(function (s, j) {
      s.addEventListener("click", function () {
        show(j);
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
    });

    show(0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    timer = setInterval(tick, 2800);
    root.addEventListener("mouseenter", function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    root.addEventListener("mouseleave", function () {
      if (!timer) timer = setInterval(tick, 2800);
    });
  }

  function initHcSchedule(root) {
    var btns = root.querySelectorAll("[data-slot]");
    var out = root.querySelector("[data-out]");
    if (!btns.length || !out) return;
    var copy = {
      am: "Morning blocks: intake forms pre-filled — front desk sees arrivals at a glance.",
      pm: "Afternoon: follow-ups and same-day sick reschedules routed cleanly.",
      eve: "Evening: limited slots — after-hours messaging stays HIPAA-aware.",
    };
    function set(slot) {
      btns.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-slot") === slot);
      });
      out.textContent = copy[slot] || "";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        set(b.getAttribute("data-slot"));
      });
    });
    set("am");
  }

  function initWidget(el) {
    var type = el.getAttribute("data-in-widget");
    switch (type) {
      case "hvac-dial":
        initHvacDial(el);
        break;
      case "plumbing-mode":
        initPlumbingMode(el);
        break;
      case "electrical-path":
        initElectricalPath(el);
        break;
      case "roofing-storm":
        initRoofingStorm(el);
        break;
      case "painting-swatches":
        initPaintingSwatches(el);
        break;
      case "pest-season":
        initPestSeason(el);
        break;
      case "re-pipeline":
        initRePipeline(el);
        break;
      case "hc-schedule":
        initHcSchedule(el);
        break;
      default:
        break;
    }
  }

  onReady(function () {
    if (!document.body.classList.contains("page-industry")) return;
    document.querySelectorAll(".in-hero-widget[data-in-widget]").forEach(initWidget);
  });
})();
