"use strict";

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var header = document.querySelector(".site-header");
var progress = document.querySelector("#progress");
var year = document.querySelector("#year");

if (year) year.textContent = String(new Date().getFullYear());

var themeToggle = document.querySelector("#theme-toggle");

function applyTheme(theme) {
  var next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  if (!themeToggle) return;
  var toLight = next === "dark";
  themeToggle.setAttribute("aria-pressed", next === "light" ? "true" : "false");
  themeToggle.setAttribute("aria-label", toLight ? "Switch to light theme" : "Switch to dark theme");
}

applyTheme(document.documentElement.getAttribute("data-theme"));

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (error) { /* keep the choice for this view */ }
    if (typeof drawSimulator === "function") drawSimulator();
  });
}

var profilePanel = document.querySelector("#profile");
var insightsPanel = document.querySelector("#insights");
var sectionToggle = document.querySelector("#section-toggle");
var sectionMenu = document.querySelector("#section-menu");
var INSIGHT_IDS = { insights: true, news: true, pattern: true, simulator: true };

function hashId() {
  return (window.location.hash || "").replace(/^#/, "");
}

function tabForId(id) {
  if (id.indexOf("case-") === 0) return "profile";
  return INSIGHT_IDS[id] ? "insights" : "profile";
}

function setMenuOpen(open) {
  if (!header || !sectionToggle) return;
  header.classList.toggle("is-menu-open", open);
  sectionToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function menuIsOpen() {
  return !!(header && header.classList.contains("is-menu-open"));
}

function goToSection(id) {
  if (!id) return;
  showTab(tabForId(id));
  if (location.hash !== "#" + id) history.pushState(null, "", "#" + id);
  setMenuOpen(false);
  setTimeout(function () { scrollToSection(id); }, 0);
}

var brandLink = document.querySelector(".brand");
if (brandLink) {
  brandLink.addEventListener("click", function (event) {
    event.preventDefault();
    goToSection("profile");
  });
}

if (sectionToggle) {
  sectionToggle.addEventListener("click", function () {
    setMenuOpen(!menuIsOpen());
  });
}

if (sectionMenu) {
  sectionMenu.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link || !sectionMenu.contains(link)) return;
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    event.preventDefault();
    goToSection(href.slice(1));
  });
}

document.addEventListener("pointerdown", function (event) {
  if (!menuIsOpen()) return;
  var target = event.target;
  if (sectionMenu && sectionMenu.contains(target)) return;
  if (sectionToggle && sectionToggle.contains(target)) return;
  setMenuOpen(false);
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") setMenuOpen(false);
});

function markTabs(tab) {
  var profileTab = document.querySelector("#tab-profile");
  var insightsTab = document.querySelector("#tab-insights");
  if (profileTab) profileTab.setAttribute("aria-selected", tab === "profile" ? "true" : "false");
  if (insightsTab) insightsTab.setAttribute("aria-selected", tab === "insights" ? "true" : "false");
  Array.prototype.forEach.call(document.querySelectorAll(".section-nav"), function (nav) {
    nav.hidden = nav.getAttribute("data-for") !== tab;
  });
}

function showTab(tab) {
  if (profilePanel) profilePanel.hidden = tab !== "profile";
  if (insightsPanel) insightsPanel.hidden = tab !== "insights";
  markTabs(tab);
  var panel = tab === "insights" ? insightsPanel : profilePanel;
  if (panel) {
    Array.prototype.forEach.call(panel.querySelectorAll(".reveal"), function (block) {
      block.classList.add("is-in");
    });
  }
  if (tab === "insights") {
    requestAnimationFrame(function () {
      if (typeof drawSimulator === "function") drawSimulator();
    });
  }
  highlightSection();
}

function scrollToSection(id) {
  if (!id || id === "profile" || id === "insights") {
    window.scrollTo(0, 0);
    return;
  }
  var target = document.getElementById(id);
  if (!target) return;
  var headerH = header ? header.getBoundingClientRect().height : 0;
  var top = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
  window.scrollTo(0, Math.max(0, top));
}

function applyHash(shouldScroll) {
  var id = hashId();
  showTab(tabForId(id));
  if (shouldScroll) scrollToSection(id);
}

window.addEventListener("hashchange", function () {
  applyHash(true);
  setMenuOpen(false);
});

applyHash(!!hashId());

function highlightSection() {
  var tab = insightsPanel && !insightsPanel.hidden ? "insights" : "profile";
  var nav = document.querySelector('.section-nav[data-for="' + tab + '"]');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']"));
  var marker = (header ? header.offsetHeight : 120) + 12;
  var current = "";
  links.forEach(function (link) {
    var id = (link.getAttribute("href") || "").slice(1);
    var section = document.getElementById(id);
    if (!section) return;
    if (section.getBoundingClientRect().top - marker <= 0) current = id;
  });
  links.forEach(function (link) {
    var id = (link.getAttribute("href") || "").slice(1);
    if (current && id === current) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

function onScroll() {
  var y = window.scrollY;
  var height = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) {
    var ratio = height > 0 ? Math.min(1, Math.max(0, y / height)) : 0;
    progress.style.transform = "scaleX(" + ratio + ")";
  }
  highlightSection();
}

onScroll();
document.addEventListener("scroll", onScroll, { passive: true });

var hero = document.querySelector(".hero");
if (hero && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", function (event) {
    var rect = hero.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--mx", x + "%");
    hero.style.setProperty("--my", y + "%");
  });
}

var stats = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
if (stats.length && !reducedMotion && "IntersectionObserver" in window) {
  var counted = false;
  var statObserver = new IntersectionObserver(function (entries) {
    if (counted || !entries.some(function (entry) { return entry.isIntersecting; })) return;
    counted = true;
    var finals = stats.map(function (el) { return el.textContent; });
    var started = performance.now();
    var duration = 650;
    function frame(now) {
      var t = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      for (var i = 0; i < stats.length; i += 1) {
        var el = stats[i];
        if (t === 1) {
          el.textContent = finals[i];
          continue;
        }
        var prefix = el.getAttribute("data-prefix") || "";
        var suffix = el.getAttribute("data-suffix") || "";
        var range = el.getAttribute("data-range");
        if (range && range.indexOf("-") !== -1) {
          var ends = range.split("-");
          var low = Math.round(Number(ends[0]) * eased);
          var high = Math.round(Number(ends[1]) * eased);
          el.textContent = low + "–" + high + suffix;
        } else {
          var target = Number(el.getAttribute("data-count"));
          el.textContent = prefix + Math.round(target * eased) + suffix;
        }
      }
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    statObserver.disconnect();
  }, { threshold: 0.4 });
  statObserver.observe(stats[0].closest(".impact") || stats[0]);
}

var explorer = document.querySelector("#work-explorer");
if (explorer) {
  var projectLinks = Array.prototype.slice.call(explorer.querySelectorAll(".explorer-nav a"));

  var projectPanels = Array.prototype.slice.call(explorer.querySelectorAll(".explorer-panel"));

  function syncProjects() {
    var hash = window.location.hash;
    var matched = false;
    for (var i = 0; i < projectLinks.length; i += 1) {
      var on = projectLinks[i].getAttribute("href") === hash;
      if (on) matched = true;
      if (on) projectLinks[i].setAttribute("aria-current", "true");
      else projectLinks[i].removeAttribute("aria-current");
    }
    if (!matched && projectLinks[0]) projectLinks[0].setAttribute("aria-current", "true");
    for (var p = 0; p < projectPanels.length; p += 1) {
      var show = matched
        ? "#" + projectPanels[p].id === hash
        : projectPanels[p].classList.contains("is-active");
      projectPanels[p].classList.toggle("is-shown", show);
    }
  }

  explorer.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var link = target.closest(".explorer-nav a");
    if (!link) return;
    event.preventDefault();
    var href = link.getAttribute("href");
    if (!href) return;
    history.replaceState(null, "", href);
    syncProjects();
  });

  explorer.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    var current = document.activeElement;
    var index = projectLinks.indexOf(current);
    if (index < 0) return;
    event.preventDefault();
    var next = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? (index + 1) % projectLinks.length
      : (index - 1 + projectLinks.length) % projectLinks.length;
    projectLinks[next].focus();
    projectLinks[next].click();
  });

  window.addEventListener("hashchange", syncProjects);
  syncProjects();
}

var academicToggle = document.querySelector(".academic-toggle");
var academicPanel = document.querySelector("#academic-panel");
var academicCount = document.querySelector("#academic-count");
if (academicCount && academicPanel) {
  academicCount.textContent = String(academicPanel.querySelectorAll(".scroller-track > li").length);
}
if (academicToggle && academicPanel) {
  academicPanel.inert = true;
  academicToggle.addEventListener("click", function () {
    var open = academicToggle.getAttribute("aria-expanded") !== "true";
    academicToggle.setAttribute("aria-expanded", open ? "true" : "false");
    academicPanel.classList.toggle("is-open", open);
    academicPanel.inert = !open;
  });
}

Array.prototype.forEach.call(document.querySelectorAll("[data-scroller]"), function (scroller) {
  var track = scroller.querySelector(".scroller-track");
  if (!track) return;
  scroller.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var button = target.closest("[data-dir]");
    if (!button) return;
    var direction = Number(button.getAttribute("data-dir")) || 0;
    track.scrollBy({
      left: direction * Math.max(240, track.clientWidth * 0.8),
      behavior: reducedMotion ? "auto" : "smooth"
    });
  });
});

var skillForm = document.querySelector("#skill-filter-form");
var skillInput = document.querySelector("#skill-filter");
var skillEmpty = document.querySelector("#skill-empty");
if (skillForm && skillInput) {
  skillForm.hidden = false;
  skillInput.addEventListener("input", function () {
    var query = skillInput.value.trim().toLowerCase();
    var groups = document.querySelectorAll("[data-skill-group]");
    var any = false;
    Array.prototype.forEach.call(groups, function (group) {
      var visible = 0;
      Array.prototype.forEach.call(group.querySelectorAll(".chips li"), function (chip) {
        var show = !query || chip.textContent.toLowerCase().indexOf(query) !== -1;
        chip.classList.toggle("is-hidden", !show);
        if (show) visible += 1;
      });
      var labels = group.querySelectorAll(".chip-label");
      Array.prototype.forEach.call(labels, function (label) {
        var list = label.nextElementSibling;
        if (!list) return;
        var shown = list.querySelector("li:not(.is-hidden)");
        label.hidden = query.length > 0 && !shown;
      });
      group.classList.toggle("is-dim", visible === 0);
      if (visible) any = true;
    });
    if (skillEmpty) skillEmpty.hidden = any;
  });
}

var newsList = document.querySelector("#news-list");
var newsEmpty = document.querySelector("#news-empty");
var newsFilterEmpty = document.querySelector("#news-filter-empty");
var newsUpdated = document.querySelector("#news-updated");
var newsFilters = document.querySelector("#news-filters");
var activeTopic = "all";

function formatDate(iso) {
  var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return "";
  var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function safeUrl(value) {
  try {
    var url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function applyNewsFilter() {
  if (!newsList) return;
  var shown = 0;
  var cards = newsList.querySelectorAll(".news-card");
  Array.prototype.forEach.call(cards, function (card) {
    var topic = card.getAttribute("data-topic") || "";
    var visible = activeTopic === "all" || topic === activeTopic;
    card.hidden = !visible;
    if (visible) shown += 1;
  });
  if (newsFilterEmpty) newsFilterEmpty.hidden = shown > 0 || !cards.length;
}

function renderNews(items, updated) {
  if (!newsList || !newsEmpty || !newsUpdated) return;
  newsList.replaceChildren();
  items.forEach(function (item) {
    if (!item || typeof item !== "object") return;
    var href = safeUrl(item.url);
    var title = typeof item.title === "string" ? item.title.trim() : "";
    if (!href || !title) return;
    var card = document.createElement("a");
    card.className = "news-card";
    card.href = href;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    var topicName = typeof item.topic === "string" && item.topic.trim() ? item.topic.trim() : "News";
    card.setAttribute("data-topic", topicName);

    var topic = document.createElement("p");
    topic.className = "topic";
    topic.textContent = topicName;

    var heading = document.createElement("h3");
    heading.textContent = title;
    var hint = document.createElement("span");
    hint.className = "sr-only";
    hint.textContent = " (opens in a new tab)";
    heading.append(hint);

    var meta = document.createElement("p");
    meta.className = "meta";
    var source = document.createElement("span");
    source.textContent = typeof item.source === "string" ? item.source.trim() : "";
    var time = document.createElement("time");
    if (typeof item.date === "string" && item.date) time.dateTime = item.date.slice(0, 10);
    time.textContent = formatDate(typeof item.date === "string" ? item.date : "");
    meta.append(source);
    if (source.textContent && time.textContent) {
      var sep = document.createElement("span");
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = " · ";
      meta.append(sep);
    }
    meta.append(time);
    card.append(topic, heading, meta);
    newsList.append(card);
  });

  if (!newsList.children.length) {
    newsEmpty.hidden = false;
    newsUpdated.textContent = "";
    if (newsFilters) newsFilters.hidden = true;
    return;
  }

  newsEmpty.hidden = true;
  if (newsFilters) newsFilters.hidden = false;
  var when = formatDate(typeof updated === "string" ? updated : "");
  newsUpdated.textContent = when
    ? "Updated " + when + " from public news feeds."
    : "Updated from public news feeds.";
  applyNewsFilter();
}

if (newsFilters) {
  newsFilters.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var button = target.closest("[data-topic]");
    if (!button) return;
    activeTopic = button.getAttribute("data-topic") || "all";
    Array.prototype.forEach.call(newsFilters.querySelectorAll("[data-topic]"), function (item) {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    applyNewsFilter();
  });
}

function showNewsFallback() {
  if (!newsList || !newsEmpty || !newsUpdated) return;
  newsList.replaceChildren();
  newsEmpty.hidden = false;
  newsUpdated.textContent = "";
  if (newsFilters) newsFilters.hidden = true;
}

async function loadNews() {
  try {
    var response = await fetch("data/news.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("News file unavailable");
    var data = await response.json();
    var items = Array.isArray(data.items) ? data.items.slice(0, 12) : [];
    renderNews(items, typeof data.updated === "string" ? data.updated : "");
    renderPulse(items, typeof data.updated === "string" ? data.updated : "");
  } catch (error) {
    showNewsFallback();
    renderPulse([], "");
  }
}

function renderPulse(items, updated) {
  var empty = document.querySelector("#pulse-empty");
  var viewport = document.querySelector("#ticker-viewport");
  var track = document.querySelector("#ticker-track");
  var status = document.querySelector("#pulse-updated");
  if (!empty || !viewport || !track || !status) return;
  track.replaceChildren();
  var usable = (items || []).filter(function (item) {
    return item && safeUrl(item.url) && typeof item.title === "string" && item.title.trim();
  });
  if (!usable.length) {
    viewport.hidden = true;
    empty.hidden = false;
    status.textContent = "Headlines refresh daily. None are loaded right now.";
    return;
  }
  empty.hidden = true;
  viewport.hidden = false;
  var when = formatDate(updated);
  status.textContent = when ? "Updated " + when : "Updated from public news feeds.";

  function groupFor(list) {
    var group = document.createElement("div");
    group.className = "ticker-group";
    list.forEach(function (item, index) {
      if (index) {
        var dot = document.createElement("span");
        dot.className = "ticker-dot";
        dot.setAttribute("aria-hidden", "true");
        dot.textContent = "·";
        group.append(dot);
      }
      var link = document.createElement("a");
      link.href = safeUrl(item.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.title.trim();
      var hint = document.createElement("span");
      hint.className = "sr-only";
      hint.textContent = " (opens in a new tab)";
      link.append(hint);
      group.append(link);
    });
    return group;
  }

  var first = groupFor(usable);
  track.append(first);
  if (!reducedMotion) {
    var copy = first.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
    requestAnimationFrame(function () {
      var distance = first.getBoundingClientRect().width;
      if (distance > 0) {
        track.style.setProperty("--ticker-duration", Math.max(24, distance / 50) + "s");
      }
    });
  }
}

var ticker = document.querySelector("#ticker");
var tickerTrack = document.querySelector("#ticker-track");
if (ticker && tickerTrack) {
  var pauseTicker = function () { ticker.classList.add("is-paused"); };
  var resumeTicker = function () { ticker.classList.remove("is-paused"); };
  ticker.addEventListener("pointerdown", pauseTicker);
  ticker.addEventListener("pointerup", resumeTicker);
  ticker.addEventListener("pointercancel", resumeTicker);
  ticker.addEventListener("pointerleave", resumeTicker);
}

function fillHeroPattern(current) {
  var teaser = document.querySelector("#hero-pattern");
  if (!teaser || !current || !current.title) return;
  var title = teaser.querySelector(".hero-pattern-title");
  var text = teaser.querySelector(".hero-pattern-text");
  var summary = String(current.what || "").trim();
  var firstSentence = summary.match(/^.*?[.!?](\s|$)/);
  if (title) title.textContent = current.title;
  if (text) text.textContent = firstSentence ? firstSentence[0].trim() : summary;
  teaser.hidden = false;
}

async function loadPattern() {
  var host = document.querySelector("#pattern-card");
  if (!host) return;
  try {
    var response = await fetch("data/pattern.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("missing");
    var data = await response.json();
    var current = data && data.current;
    if (!current || typeof current.title !== "string") throw new Error("empty");
    host.replaceChildren();
    var card = document.createElement("article");
    card.className = "pattern-card";
    var kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = "This week";
    var heading = document.createElement("h3");
    heading.textContent = current.title;
    var when = document.createElement("p");
    when.className = "pattern-date";
    if (current.date) {
      var time = document.createElement("time");
      time.dateTime = String(current.date).slice(0, 10);
      time.textContent = formatDate(current.date);
      when.append(time);
    }
    var what = document.createElement("p");
    what.textContent = current.what || "";
    card.append(kicker, heading, when, what);
    function addList(label, values) {
      if (!Array.isArray(values) || !values.length) return;
      var title = document.createElement("h4");
      title.textContent = label;
      var list = document.createElement("ul");
      values.forEach(function (value) {
        if (typeof value !== "string" || !value.trim()) return;
        var item = document.createElement("li");
        item.textContent = value.trim();
        list.append(item);
      });
      if (list.children.length) card.append(title, list);
    }
    addList("Red flags", current.redFlags);
    addList("How to protect yourself", current.protect);
    addList("How to detect it with data", current.detect);
    host.append(card);
    fillHeroPattern(current);

    var past = Array.isArray(data.past) ? data.past : [];
    var archive = document.createElement("section");
    archive.className = "past-patterns";
    var archiveTitle = document.createElement("h3");
    archiveTitle.textContent = "Past patterns";
    archive.append(archiveTitle);
    if (!past.length) {
      var none = document.createElement("p");
      none.className = "pulse-updated";
      none.textContent = "Earlier patterns will be listed here.";
      archive.append(none);
    } else {
      var list = document.createElement("ul");
      past.forEach(function (entry) {
        if (!entry || typeof entry.title !== "string") return;
        var item = document.createElement("li");
        var label = entry.title;
        if (entry.date) label += " · " + formatDate(entry.date);
        item.textContent = label;
        list.append(item);
      });
      archive.append(list);
    }
    host.append(archive);
  } catch (error) {
    host.innerHTML = "";
    var fallback = document.createElement("p");
    fallback.className = "empty-news";
    fallback.textContent = "The weekly pattern loads from a data file. None is available in this view yet.";
    host.append(fallback);
  }
}

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var syntheticRows = (function () {
  var random = mulberry32(20261125);
  var rows = [];
  var i;
  for (i = 0; i < 240; i += 1) {
    var score = Math.min(100, Math.max(0, Math.round(random() * 100)));
    var chance = 1 / (1 + Math.exp(-(score - 62) / 9));
    rows.push({ score: score, fraud: random() < chance });
  }
  return rows;
}());

function drawSimulator() {
  var slider = document.querySelector("#threshold");
  var canvas = document.querySelector("#sim-chart");
  if (!slider || !canvas) return;
  var threshold = Number(slider.value);
  var value = document.querySelector("#threshold-value");
  if (value) value.textContent = String(threshold);
  var flagged = 0;
  var caught = 0;
  var falsePos = 0;
  syntheticRows.forEach(function (row) {
    if (row.score < threshold) return;
    flagged += 1;
    if (row.fraud) caught += 1;
    else falsePos += 1;
  });
  var flaggedEl = document.querySelector("#sim-flagged");
  var caughtEl = document.querySelector("#sim-caught");
  var falseEl = document.querySelector("#sim-false");
  if (flaggedEl) flaggedEl.textContent = String(flagged);
  if (caughtEl) caughtEl.textContent = String(caught);
  if (falseEl) falseEl.textContent = String(falsePos);

  var css = getComputedStyle(document.body);
  var fraudColor = css.color || "#e8f2fb";
  var accent = css.getPropertyValue("--accent").trim() || "#9ad8ff";
  var muted = css.getPropertyValue("--muted").trim() || "#c5d7e8";
  var bins = 10;
  var fraudBins = new Array(bins).fill(0);
  var clearBins = new Array(bins).fill(0);
  syntheticRows.forEach(function (row) {
    var index = Math.min(bins - 1, Math.floor(row.score / 10));
    if (row.fraud) fraudBins[index] += 1;
    else clearBins[index] += 1;
  });
  var peak = 1;
  fraudBins.forEach(function (count, index) { peak = Math.max(peak, count + clearBins[index]); });
  var view = document.documentElement.clientWidth || window.innerWidth || 320;
  var parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
  var width = parentWidth > 0 && parentWidth <= view + 1 ? parentWidth : view;
  width = Math.max(1, Math.round(Math.min(width, view)));
  var height = 220;
  var shown = canvas.getClientRects().length > 0;
  var ratio = shown ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  canvas.style.width = "100%";
  canvas.style.maxWidth = "100%";
  canvas.style.height = height + "px";
  var bitmapW = Math.round(width * ratio);
  var bitmapH = Math.round(height * ratio);
  if (canvas.width !== bitmapW) canvas.width = bitmapW;
  if (canvas.height !== bitmapH) canvas.height = bitmapH;
  canvas.style.width = "100%";
  canvas.style.maxWidth = "100%";
  canvas.style.height = height + "px";
  var ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  var pad = 16;
  var gap = 6;
  var barWidth = (width - pad * 2 - gap * (bins - 1)) / bins;
  for (var b = 0; b < bins; b += 1) {
    var x = pad + b * (barWidth + gap);
    var total = fraudBins[b] + clearBins[b];
    var full = (total / peak) * (height - pad * 2);
    var fraudH = (fraudBins[b] / peak) * (height - pad * 2);
    var y = height - pad - full;
    ctx.fillStyle = muted;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, barWidth, full - fraudH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.fillRect(x, height - pad - fraudH, barWidth, fraudH);
  }
  var lineX = pad + (threshold / 100) * (width - pad * 2);
  ctx.strokeStyle = fraudColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineX, pad);
  ctx.lineTo(lineX, height - pad);
  ctx.stroke();
}

var thresholdInput = document.querySelector("#threshold");
if (thresholdInput) {
  thresholdInput.addEventListener("input", drawSimulator);
  drawSimulator();
}

if (!reducedMotion && "IntersectionObserver" in window) {
  var revealBlocks = Array.prototype.slice.call(document.querySelectorAll("#profile > section, #insights > section"));
  revealBlocks.forEach(function (block) { block.classList.add("reveal"); });
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealBlocks.forEach(function (block) { revealObserver.observe(block); });
}

loadNews();
loadPattern();
