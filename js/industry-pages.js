/**
 * Interactive hero widgets for individual industry pages (body.page-industry).
 */
(function () {
  "use strict";
  var pageIconUsage = {};

  function slugFromBody() {
    var match = (document.body.className || "").match(/page-industry(?:-doc)?--([a-z0-9-]+)/);
    return match ? match[1] : "";
  }

  function isIndustrySurface() {
    return (
      document.body.classList.contains("page-industry") ||
      document.body.classList.contains("page-industry-doc")
    );
  }

  function getIndustryH1() {
    return document.querySelector(".page-hero-v2 h1, .industry-doc-hero h1");
  }

  function getHeroHost() {
    return document.querySelector(".industry-doc-hero, .page-hero-v2");
  }

  function getIndustryName() {
    var h1 = getIndustryH1();
    if (h1) {
      return h1.textContent.replace(/\s+/g, " ").trim();
    }
    return "your industry";
  }

  function iconPackPath(number) {
    return "";
  }

  function getRootPath() {
    var meta = document.querySelector('meta[name="tw-root-path"]');
    return meta ? meta.getAttribute("content") || "" : "";
  }

  function sitePath(path) {
    var root = getRootPath();
    if (!root || !path || path.charAt(0) !== "/" || path.charAt(1) === "/") return path;

    var hash = "";
    var query = "";
    var cleanPath = path;
    var hashIndex = cleanPath.indexOf("#");
    if (hashIndex >= 0) {
      hash = cleanPath.slice(hashIndex);
      cleanPath = cleanPath.slice(0, hashIndex);
    }
    var queryIndex = cleanPath.indexOf("?");
    if (queryIndex >= 0) {
      query = cleanPath.slice(queryIndex);
      cleanPath = cleanPath.slice(0, queryIndex);
    }
    if (cleanPath === "/") return root + "index.html" + query + hash;

    var relative = cleanPath.replace(/^\/+/, "");
    var lastSegment = relative.split("/").pop();
    if (cleanPath.charAt(cleanPath.length - 1) === "/") {
      relative = relative.replace(/\/+$/, "") + "/index.html";
    } else if (lastSegment.indexOf(".") === -1) {
      relative += "/index.html";
    }
    return root + relative + query + hash;
  }

  function iconMarkupFromPath(src, size, loading) {
    if (!src) return "";
    var dimension = size || 48;
    return '<img src="' + src + '" alt="" width="' + dimension + '" height="' + dimension + '" loading="' + (loading || "lazy") + '">';
  }

  function buildSharedModuleIconMarkup(key, size, loading) {
    var icons = {
      "service-credits": 7,
      "one-contractor": 4,
      "full-invoice": 6,
      "vetted-insured": 1,
      "insurance-verified": 18,
      licensed: 19,
      "performance-scored": 20
    };
    return iconMarkupFromPath(icons[key] ? iconPackPath(icons[key]) : "", size, loading);
  }

  function normalizeIconTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getIconNumberByTitle(title) {
    var icons = {
      "service credits included": 7,
      "one contractor per order": 4,
      "keep the full invoice": 6,
      "zip-limited seats": 26,
      "map pack visibility": 13,
      "ads and lsa": 3,
      "seo and ai search": 17,
      "ai call intake": 9,
      "crm and dispatch setup": 14,
      "calls answered": 22,
      "booked jobs": 11,
      "reviews and rankings": 18,
      "background-checked": 17,
      "insurance verified": 18,
      "licensed where required": 19,
      "performance-scored": 20,
      "ac repair or maintenance": 27,
      "ac tune-up / seasonal service": 28,
      "ac installation or replacement": 29,
      "window / wall / portable ac service": 30,
      "heating / furnace repair": 31,
      "heating system install or replacement": 45,
      "thermostat install or repair": 32,
      "mini-split installation": 33,
      "drain cleaning & clog clearing": 34,
      "drain cleaning / clog clearing": 34,
      "sink or faucet install or replace": 35,
      "toilet install or replacement": 36,
      "pipe repair": 37,
      "sink or faucet repair": 38,
      "toilet repair": 39,
      "water heater repair or maintenance": 40,
      "garbage disposal install / repair": 41,
      "shower & bathtub repair": 42,
      "sump pump install or replacement": 43,
      "emergency plumbing": 44,
      "pipe install or replacement": 45,
      "water heater install or replacement": 46,
      "gas line installation": 47,
      "switch & outlet install or repair": 48,
      "lighting installation": 49,
      "electrical & wiring repair": 20,
      "smart home / device wiring": 50,
      "breaker panel install or repair": 51,
      "generator install or repair": 52,
      "ev charger installation": 53,
      "roof inspection": 54,
      "roof repair or maintenance": 55,
      "roof install or replacement": 56,
      "general pest control": 57,
      "pest inspection": 58,
      "termite inspection": 59,
      "mosquito / outdoor control": 60,
      "termite control": 61,
      "bed bug extermination": 62,
      "rodent & animal removal": 63,
      "garage door repair": 64,
      "garage door opener service": 65,
      "garage door install or replacement": 66,
      "standard house cleaning": 67,
      "deep cleaning": 68,
      "move in / move out cleaning": 69,
      "carpet cleaning": 70,
      "rug cleaning": 71,
      "upholstery & furniture cleaning": 72,
      "tile & grout cleaning": 73,
      "window cleaning": 74,
      "commercial cleaning": 75,
      "lawn mowing & trimming": 76,
      "full service lawn care": 77,
      "gardening & bed maintenance": 78,
      "mulching": 79,
      "leaf / yard cleanup": 80,
      "shrub trimming & removal": 81,
      "sprinkler / irrigation repair": 82,
      "sod installation": 83,
      "sprinkler / irrigation install": 84,
      "landscape design & install": 85,
      "pressure washing": 86,
      "driveway / concrete cleaning": 87,
      "solar panel cleaning": 88,
      "roof cleaning": 89,
      "gutter cleaning & maintenance": 90,
      "gutter repair": 91,
      "gutter install or replacement": 92,
      "general handyman (small repairs)": 93,
      "caulking & sealant": 94,
      "drywall patch (minor)": 95,
      "furniture assembly": 96,
      "shelving & closet system install": 97,
      "tv mounting": 98,
      "picture hanging & art installation": 99,
      "ceiling fan installation": 100,
      "junk removal": 101,
      "furniture / appliance removal": 102,
      "garage / attic / basement cleanout": 103,
      "dumpster rental": 104,
      "local moving": 12,
      "furniture moving & heavy lifting": 102,
      "packing & unpacking": 103,
      "furniture delivery": 101,
      "tree trimming & removal": 105,
      "stump grinding": 106,
      "stump grinding & removal": 106,
      "tree planting": 107,
      "land clearing": 108,
      "refrigerator repair": 109,
      "washer / dryer repair": 110,
      "dishwasher install or repair": 111,
      "oven / range / cooktop repair": 112,
      "appliance repair or maintenance": 113,
      "appliance installation": 114,
      "air duct & vent cleaning": 115,
      "dryer vent cleaning": 116,
      "duct & vent repair": 117,
      "duct & vent install or removal": 118,
      "pool cleaning & maintenance": 119,
      "hot tub & spa cleaning & maintenance": 120,
      "pool inspection": 121,
      "pool equipment repair": 122,
      "hot tub & spa repair": 123,
      "pool resurfacing / repair": 124,
      "kitchen remodel": 125,
      "bathroom remodel": 126,
      "room / whole-home remodel": 127,
      "countertop installation": 128,
      "cabinet installation": 129,
      "basement finishing": 130,
      "window install or replacement": 131,
      "door install or replacement": 132,
      "window repair": 133,
      "door repair": 134,
      "window treatment install or repair": 135,
      "window tinting": 136,
      "siding repair": 137,
      "siding install or replacement": 138,
      "floor install or replacement": 139,
      "carpet install or repair": 140,
      "tile install & replacement": 141,
      "epoxy floor coating": 142,
      "hardwood floor refinishing": 143,
      "floor repair": 144,
      "tile repair": 145,
      "floor polishing": 146,
      "drywall repair & texturing": 147,
      "drywall install & hanging": 148,
      "plastering": 149,
      "stucco repair": 150,
      "stucco application": 151,
      "interior painting": 152,
      "exterior painting": 153,
      "cabinet painting / refinishing": 154,
      "popcorn / texture removal": 155,
      "wallpaper install or removal": 156,
      "fence painting": 157,
      "concrete repair & maintenance": 158,
      "concrete installation": 159,
      "brick or stone repair": 160,
      "masonry construction": 161,
      "fence & gate repair": 162,
      "fence & gate installation": 163,
      "deck or porch repair": 164,
      "deck staining & sealing": 165,
      "deck or porch remodel / addition": 166,
      "fireplace & chimney cleaning or repair": 167,
      "fireplace & chimney installation": 168,
      "insulation install or upgrade": 169,
      "weatherization / sealing": 170,
      "home waterproofing": 171,
      "security & alarm install": 172,
      "security system repair": 173,
      "camera / doorbell installation": 174,
      "smart home setup": 175,
      "lock install & repair": 176,
      "rekeying": 177,
      "smart lock installation": 178,
      "lockout service": 179,
      "water treatment repair or maintenance": 180,
      "water treatment / softener install": 181,
      "window / door screen repair": 182,
      "screen install or replacement": 183,
      "patio / pool screen enclosure repair": 184
    };
    return icons[normalizeIconTitle(title)] || 0;
  }

  function getTitleIconCandidates(title) {
    var number = getIconNumberByTitle(title);
    var candidates = [];
    var sharedAlternates = {
      "service credits included": [7, 8, 6, 1],
      "one contractor per order": [4, 16, 15, 10],
      "keep the full invoice": [6, 2, 3, 18],
      "zip-limited seats": [26, 13, 12, 11],
      "map pack visibility": [13, 26, 12, 17],
      "ads and lsa": [3, 12, 9, 7],
      "seo and ai search": [17, 19, 20, 6],
      "ai call intake": [9, 10, 22, 4],
      "crm and dispatch setup": [14, 21, 22, 11],
      "calls answered": [22, 9, 10, 11],
      "booked jobs": [11, 12, 4, 16],
      "reviews and rankings": [18, 7, 20, 17]
    };
    var text = normalizeIconTitle(title);

    function addIcon(iconNumber) {
      var iconPath = iconNumber ? iconPackPath(iconNumber) : "";
      if (iconPath && candidates.indexOf(iconPath) === -1) candidates.push(iconPath);
    }

    function addRange(start, end) {
      for (var i = start; i <= end; i += 1) addIcon(i);
    }

    addIcon(number);
    (sharedAlternates[text] || []).forEach(addIcon);

    if (number >= 27 && number <= 184) {
      [
        [27, 33],
        [34, 47],
        [48, 53],
        [54, 56],
        [57, 63],
        [64, 66],
        [67, 75],
        [76, 85],
        [86, 89],
        [90, 92],
        [93, 100],
        [101, 104],
        [105, 108],
        [109, 114],
        [115, 118],
        [119, 124],
        [125, 130],
        [131, 136],
        [137, 138],
        [139, 146],
        [147, 151],
        [152, 157],
        [158, 161],
        [162, 166],
        [167, 168],
        [169, 171],
        [172, 175],
        [176, 179],
        [180, 181],
        [182, 184]
      ].some(function (range) {
        if (number >= range[0] && number <= range[1]) {
          addRange(range[0], range[1]);
          addRange(Math.max(27, range[0] - 4), range[0] - 1);
          addRange(range[1] + 1, Math.min(184, range[1] + 4));
          return true;
        }
        return false;
      });
    }

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26].forEach(addIcon);

    return candidates;
  }

  function chooseIconPath(title, usedIcons) {
    return "";
    var used = usedIcons || pageIconUsage;
    var candidates = getTitleIconCandidates(title);
    for (var i = 0; i < candidates.length; i += 1) {
      if (!used[candidates[i]]) {
        used[candidates[i]] = true;
        return candidates[i];
      }
    }
    for (var j = 1; j <= 184; j += 1) {
      var fallback = iconPackPath(j);
      if (!used[fallback]) {
        used[fallback] = true;
        return fallback;
      }
    }
    return "";
  }

  function buildIntakeModal() {
    if (document.querySelector(".industry-intake-root")) return;

    var root = document.createElement("div");
    root.className = "industry-intake-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="industry-intake-backdrop" data-industry-intake-close></div>' +
      '<section class="industry-intake-dialog" role="dialog" aria-modal="true" aria-labelledby="industry-intake-title">' +
      '  <header class="industry-intake-header">' +
      '    <div>' +
      '      <p class="industry-intake-kicker">AI intake helper</p>' +
      '      <h2 id="industry-intake-title">Describe what you need help with</h2>' +
      "    </div>" +
      '    <button class="industry-intake-close" type="button" aria-label="Close" data-industry-intake-close>&times;</button>' +
      "  </header>" +
      '  <div class="industry-intake-body">' +
      '    <p class="industry-intake-copy">Share the service issue, lead type, or workflow blocker you want TradeWorks to help route.</p>' +
      '    <div class="industry-intake-chip-row">' +
      '      <button type="button" class="industry-intake-chip" data-prefill="Booked work orders and job routing">Booked work orders</button>' +
      '      <button type="button" class="industry-intake-chip" data-prefill="Marketing growth and lead quality">Marketing growth</button>' +
      '      <button type="button" class="industry-intake-chip" data-prefill="AI call answering and intake automation">AI intake</button>' +
      "    </div>" +
      '    <textarea class="industry-intake-textarea" rows="5" placeholder="Tell us what is happening, what kind of customer or job this is, and what you want fixed first."></textarea>' +
      '    <div class="industry-intake-actions">' +
      '      <a class="industry-intake-primary" href="' + sitePath("/audit/") + '">Get Free Audit</a>' +
      '      <a class="industry-intake-secondary" href="' + sitePath("/services/tradeworks-select/#application") + '">Apply to TradeWorks Select</a>' +
      '      <a class="industry-intake-link" href="tel:+18134777350">Call (813) 477-7350</a>' +
      "    </div>" +
      "  </div>" +
      "</section>";

    document.body.appendChild(root);

    root.addEventListener("click", function (event) {
      var close = event.target.closest("[data-industry-intake-close]");
      if (close || event.target === root.querySelector(".industry-intake-backdrop")) {
        event.preventDefault();
        closeIndustryIntake();
      }
      var chip = event.target.closest("[data-prefill]");
      if (chip) {
        var textarea = root.querySelector(".industry-intake-textarea");
        if (textarea) {
          textarea.value = chip.getAttribute("data-prefill");
          textarea.focus();
        }
      }
    });
  }

  function openIndustryIntake() {
    var root = document.querySelector(".industry-intake-root");
    if (!root) return;
    var slug = slugFromBody();
    var title = getIndustryName();
    var heading = root.querySelector("#industry-intake-title");
    var audit = root.querySelector('.industry-intake-primary[href^="/audit/"]');
    if (heading) {
      heading.textContent = "Describe what " + title + " needs help with";
    }
    if (audit) {
      audit.href = slug ? "/audit/?industry=" + encodeURIComponent(slug) : "/audit/";
    }
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("industry-intake-open");
    var textarea = root.querySelector(".industry-intake-textarea");
    if (textarea) textarea.focus();
  }

  function closeIndustryIntake() {
    var root = document.querySelector(".industry-intake-root");
    if (!root) return;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("industry-intake-open");
  }

  function initSharedIndustryIntake() {
    if (!document.body.classList.contains("page-industry") || document.querySelector(".industry-intake-cta-wrap")) return;

    var hero = getHeroHost();
    if (!hero) return;

    buildIntakeModal();

    var title = getIndustryName();
    var wrap = document.createElement("div");
    wrap.className = "industry-intake-cta-wrap";
    wrap.innerHTML =
      '<div class="industry-intake-cta-shell">' +
      '  <article class="industry-intake-cta-card">' +
      '    <span class="industry-intake-cta-mark" aria-hidden="true">AI</span>' +
      '    <div class="industry-intake-cta-copy">' +
      '      <h2>Need the HVAC-style intake flow here too?</h2>' +
      '      <p>Describe the service issue, lead type, or workflow for ' +
      title +
      " and TradeWorks can help point the page visitor toward the right next step.</p>" +
      "    </div>" +
      '    <button class="industry-intake-cta-button" type="button">Describe your issue</button>' +
      "  </article>" +
      "</div>";

    hero.insertAdjacentElement("afterend", wrap);
    wrap.querySelector(".industry-intake-cta-button").addEventListener("click", openIndustryIntake);
  }

  function bindIndustryZipForm(form) {
    if (!form || form.getAttribute("data-zip-bound") === "true") return;
    form.setAttribute("data-zip-bound", "true");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.querySelector('input[placeholder], input[inputmode="numeric"]');
      var message = form.querySelector("[data-zip-message]");
      var zip = input ? input.value.trim() : "";
      if (!message) return;
      message.textContent = /^\d{5}$/.test(zip)
        ? "Thanks. This ZIP is ready for the live pricing lookup connection."
        : "Enter a valid 5-digit ZIP to check the market.";
    });
  }

  function initDocHeroParity() {
    if (!document.body.classList.contains("page-industry-doc")) return;

    var hero = document.querySelector(".industry-doc-hero");
    var lead = document.querySelector(".industry-doc-lead");
    var media = document.querySelector(".industry-doc-media");
    var mediaImage = media ? media.querySelector("img") : null;
    var heroProof = document.querySelector(".industry-doc-proof");
    var zipCard = document.querySelector("#zip-pricing .industry-doc-zip-card");

    if (!hero || hero.getAttribute("data-service-parity") === "true") return;
    hero.setAttribute("data-service-parity", "true");

    if (mediaImage && mediaImage.getAttribute("src")) {
      hero.style.setProperty("--industry-hero-image", 'url("' + mediaImage.getAttribute("src") + '")');
    }

    if (zipCard && !document.querySelector(".industry-hero-zipbox-row")) {
      var heroZipRow = document.createElement("section");
      heroZipRow.className = "industry-hero-zipbox-row";
      heroZipRow.innerHTML =
        '<div class="industry-doc-container">' +
        '  <div class="industry-hero-zipbox">' +
        '    <p class="industry-hero-zipbox-label">Check your ZIP before you apply</p>' +
             zipCard.outerHTML +
        "  </div>" +
        "</div>";
      hero.insertAdjacentElement("afterend", heroZipRow);
      bindIndustryZipForm(heroZipRow.querySelector("[data-industry-zip]"));
    }

    if (heroProof && media && !media.querySelector(".industry-doc-proof")) {
      media.appendChild(heroProof);
    }

    document.querySelectorAll(".industry-doc-zip-card[data-industry-zip]").forEach(bindIndustryZipForm);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function cloneCards(selector, limit) {
    return Array.prototype.slice.call(document.querySelectorAll(selector), 0, limit || 99);
  }

  function getText(el, selector) {
    var node = selector ? el.querySelector(selector) : el;
    return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function buildTrustCard(card) {
    var title = getText(card, "strong");
    var body = getText(card, "span:not(.industry-wire-icon)");
    var iconMarkup = iconMarkupFromPath(chooseIconPath(title), 48, "eager");
    return (
      '<article class="trust-card">' +
      '  <span class="trust-icon' + (iconMarkup ? ' has-art' : "") + '" aria-hidden="true">' + (iconMarkup || ('<span class="trust-glyph">' + escapeHtml(getText(card, ".industry-wire-icon")) + "</span>")) + "</span>" +
      "  <div><h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(body) + "</p></div>" +
      "</article>"
    );
  }

  function buildReasonCard(card) {
    var title = getText(card, "h3");
    var body = getText(card, "span:not(.industry-wire-icon), p");
    return (
      '<article class="card reason-card">' +
      '  <div class="reason-header">' +
      '    <span class="reason-icon" aria-hidden="true"><span class="trust-glyph">' + escapeHtml(getText(card, ".industry-wire-icon") || "*") + '</span></span>' +
      "    <div><h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(body) + "</p></div>" +
      "  </div>" +
      "</article>"
    );
  }
  function buildServiceCard(card) {
    var title = getText(card, "h3");
    var body = getText(card, "p");
    var iconText = getText(card, "span");
    return (
      '<article class="service-card">' +
      '  <span class="service-icon" aria-hidden="true"><span class="trust-glyph">' + escapeHtml(iconText || "*") + '</span></span>' +
      '  <div class="service-copy"><h3>' + escapeHtml(title) + "</h3><p>" + escapeHtml(body) + "</p></div>" +
      "</article>"
    );
  }

  function buildStep(step, index) {
    var title = getText(step, "strong");
    var body = getText(step, "span");
    return (
      '<article class="step"><b>' + (index + 1) + "</b><h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(body) + "</p></article>"
    );
  }

  function buildVettingCard(card) {
    var title = getText(card, "strong");
    var body = getText(card, "span:not(.industry-wire-icon)");
    return (
      '<article class="vcard">' +
      '  <span class="vetting-icon" aria-hidden="true"><span class="trust-glyph">' + escapeHtml(getText(card, ".industry-wire-icon") || "*") + '</span></span>' +
      "  <h3>" + escapeHtml(title) + "</h3><p>" + escapeHtml(body) + "</p>" +
      "</article>"
    );
  }


  function buildGuideCard(link) {
    var href = link.getAttribute("href") || "#";
    var title = getText(link, "h3");
    var body = getText(link, "span");
    return (
      '<a href="' + escapeHtml(href) + '">' +
      "<span>Helpful next page</span>" +
      "<strong>" + escapeHtml(title) + "</strong>" +
      "<em>" + escapeHtml(body) + "</em>" +
      "</a>"
    );
  }

  function decorateSourceIndustryIcons() {
    if (!document.body.classList.contains("page-industry-doc")) return;

    document.querySelectorAll(".industry-wire-trust-card").forEach(function (card) {
      var title = getText(card, "strong");
      var icon = card.querySelector(".industry-wire-icon");
      var path = chooseIconPath(title);
      if (icon && path) {
        icon.classList.add("has-art");
        icon.innerHTML = iconMarkupFromPath(path, 48, "eager");
      }
    });

    document.querySelectorAll(".industry-wire-showgrid, .industry-wire-marketing-stack, .industry-wire-ai-crm").forEach(function (group) {
      group.querySelectorAll(".industry-wire-card").forEach(function (card) {
        var title = getText(card, "h3");
        var icon = card.querySelector(".industry-wire-icon");
        var path = chooseIconPath(title);
        if (icon && path) {
          icon.classList.add("has-art");
          icon.innerHTML = iconMarkupFromPath(path, 48, "lazy");
        }
      });
    });

    document.querySelectorAll(".industry-wire-proofgrid").forEach(function (group) {
      group.querySelectorAll(".industry-wire-proof-card").forEach(function (card) {
        var title = getText(card, "strong");
        var icon = card.querySelector(".industry-wire-icon");
        var path = chooseIconPath(title);
        if (icon && path) {
          icon.classList.add("has-art");
          icon.innerHTML = iconMarkupFromPath(path, 48, "lazy");
        }
      });
    });

    document.querySelectorAll(".industry-doc-service-grid").forEach(function (group) {
      group.querySelectorAll(".industry-doc-service-card").forEach(function (card) {
        var title = getText(card, "h3");
        var icon = card.querySelector("span");
        var path = chooseIconPath(title);
        if (icon && path) {
          icon.classList.add("has-art");
          icon.innerHTML = iconMarkupFromPath(path, 48, "lazy");
        }
      });
    });
  }

  function decorateGeneratedIndustryIcons(root) {
    if (!root) return;

    root.querySelectorAll(".grid-3, .service-list, .vetting-grid").forEach(function (group) {
      var cards = group.querySelectorAll(".reason-card, .service-card, .vcard");
      cards.forEach(function (card) {
        var title = getText(card, "h3");
        var icon = card.querySelector(".reason-icon, .service-icon, .vetting-icon");
        var path = chooseIconPath(title);
        if (icon && path) {
          icon.classList.add("has-art");
          icon.innerHTML = iconMarkupFromPath(path, 48, "lazy");
        }
      });
    });
  }

  function initDocServiceLayout() {
    if (!document.body.classList.contains("page-industry-doc")) return;

    var main = document.querySelector("main");
    var hero = document.querySelector(".industry-doc-hero");
    if (!main || !hero || main.querySelector(".industry-service-layout")) return;

    var industryName = getIndustryName()
      .replace(/^Get\s+/i, "")
      .replace(/\s+Jobs.*$/i, "")
      .replace(/\s+That.*$/i, "")
      .trim() || "Industry";

    var trustCards = cloneCards(".industry-wire-trust-card", 3).map(buildTrustCard).join("");
    var reasonCards = cloneCards(".industry-wire-showgrid .industry-wire-card", 6).map(buildReasonCard).join("");
    var serviceCards = cloneCards(".industry-doc-service-card", 8).map(buildServiceCard).join("");
    var processSteps = cloneCards(".industry-wire-statusbar > div", 3).map(buildStep).join("");
    var proofCards = cloneCards(".industry-wire-proof-card", 4).map(buildVettingCard).join("");
    var guideCards = cloneCards(".industry-wire-growth-guides a", 6).map(buildGuideCard).join("");
    var zipSource = document.querySelector(".industry-hero-zipbox .industry-doc-zip-card") || document.querySelector("#zip-pricing .industry-doc-zip-card");
    var finalHeading = getText(document.querySelector(".industry-doc-final"), "h2") || ("Grow Your " + industryName + " Business");
    var finalBody = getText(document.querySelector(".industry-doc-final"), "p") || "Receive confirmed work orders from the network, market your own brand, or do both.";

    var zipMarkup = zipSource ? zipSource.outerHTML : "";

    var layout = document.createElement("div");
    layout.className = "industry-service-layout";
    layout.innerHTML =
      '<section class="trust-section"><div class="container"><div class="trust-strip">' + trustCards + "</div></div></section>" +
      '<section><div class="container"><h2 class="section-title">Common ' + escapeHtml(industryName) + ' Jobs TradeWorks Can Route</h2><p class="section-desc">TradeWorks Select helps property managers and homeowners book vetted ' + escapeHtml(industryName.toLowerCase()) + ' pros with the same clearer service-page layout used on HVAC: visible pricing path, trust signals, and direct next steps.</p><div class="grid-3">' + reasonCards + "</div></div></section>" +
      '<section class="section-alt"><div class="container"><h2 class="section-title">' + escapeHtml(industryName) + ' Services You Can Route</h2><p class="section-desc">Each category below keeps the cleaner, scan-first HVAC module structure while preserving the industry-specific service lines already on this page.</p><div class="service-list">' + serviceCards + "</div></div></section>" +
      '<section><div class="container"><div class="pricing-box"><h2>How ' + escapeHtml(industryName) + ' Membership And Pricing Work</h2><p>Use the ZIP check, review the service path, and keep the exact contractor-facing value proposition intact: one contractor per order, no shared leads, and 100 percent of the approved invoice stays with your company.</p><div class="pricing-grid"><article class="pricing-card flat"><h3>Flat monthly membership</h3><p>Membership is priced by ZIP and shown before you apply, so market economics stay visible from the start.</p></article><article class="pricing-card cap"><h3>Keep 100% of the invoice</h3><p>You bill the customer directly, keep the full approved work amount, and avoid the shared-lead race.</p></article><article class="pricing-card quote"><h3>Marketing and AI add-ons</h3><p>Layer TradeWorks marketing, AI call intake, and CRM support on top of the booked-work channel when you are ready to grow.</p></article></div></div>' + (zipMarkup ? '<div class="zipbox-wrap">' + zipMarkup + "</div>" : "") + "</div></section>" +
      '<section class="section-alt"><div class="container"><h2 class="section-title">Browse, Choose, And Book Without Being Assigned A Pro</h2><div class="steps">' + processSteps + '</div><div class="lifecycle" aria-label="Visit progress"><span>browse</span><span>booked</span><span class="active">routed</span><span>scheduled</span><span>completed</span><span class="done">invoiced</span></div></div></section>' +
      '<section><div class="container"><h2 class="section-title">What TradeWorks Verifies Before A ' + escapeHtml(industryName) + ' Company Is Listed</h2><p class="section-desc">The HVAC service page uses a clear vetting module. This industry page now uses the same visual structure with contractor-specific proof.</p><div class="vetting-grid">' + proofCards + "</div></div></section>" +
      '<section><div class="container"><h2 class="section-title">Helpful Next Pages</h2><div class="related">' + guideCards + "</div></div></section>" +
      '<section class="final-cta"><div class="container"><h2>' + escapeHtml(finalHeading) + "</h2><p>" + escapeHtml(finalBody) + '</p><a class="btn" href="' + sitePath("/services/tradeworks-select/#application") + '">Apply to TradeWorks Select</a></div></section>';

    hero.insertAdjacentElement("afterend", layout);

    decorateGeneratedIndustryIcons(layout);

    Array.prototype.slice.call(main.querySelectorAll(':scope > section')).forEach(function (section) {
      if (section !== hero && !section.closest(".industry-service-layout")) {
        section.hidden = true;
      }
    });

    layout.querySelectorAll(".industry-doc-zip-card[data-industry-zip]").forEach(bindIndustryZipForm);
  }

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
    if (document.body.classList.contains("page-industry")) {
      document.querySelectorAll(".in-hero-widget[data-in-widget]").forEach(initWidget);
    }
    pageIconUsage = {};
    initDocHeroParity();
    initDocServiceLayout();
    decorateSourceIndustryIcons();
    initSharedIndustryIntake();
  });
})();
