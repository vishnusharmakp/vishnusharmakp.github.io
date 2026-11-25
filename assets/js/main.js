"use strict";

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var header = document.querySelector(".site-header");
var toggle = document.querySelector(".nav-toggle");
var chapterButton = document.querySelector("#chapter-btn");
var chapterLabel = document.querySelector("#chapter");
var overlay = document.querySelector("#overlay-nav");
var progress = document.querySelector("#progress");
var year = document.querySelector("#year");

if (year) year.textContent = String(new Date().getFullYear());

var themeToggle = document.querySelector("#theme-toggle");

function applyTheme(theme) {
  var next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  if (!themeToggle) return;
  var toLight = next === "dark";
  themeToggle.textContent = toLight ? "Light" : "Dark";
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

function focusableIn(root) {
  return Array.prototype.slice.call(
    root.querySelectorAll("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])")
  );
}

function openMenu() {
  if (!overlay || !toggle) return;
  overlay.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("nav-open");
  if (header) header.classList.remove("is-away");
  var firstLink = overlay.querySelector("nav a");
  if (firstLink) firstLink.focus();
}

function closeMenu(restoreFocus) {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
  if (restoreFocus && toggle) toggle.focus();
}

function menuIsOpen() {
  return overlay && !overlay.hidden;
}

if (toggle) {
  toggle.addEventListener("click", function () {
    if (menuIsOpen()) closeMenu(true);
    else openMenu();
  });
}

if (chapterButton) {
  chapterButton.addEventListener("click", function () {
    openMenu();
  });
}

if (overlay) {
  overlay.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-close-nav]")) {
      closeMenu(true);
      return;
    }
    if (target.closest("a")) closeMenu(false);
  });

  overlay.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu(true);
      return;
    }
    if (event.key !== "Tab") return;
    var items = focusableIn(overlay);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && menuIsOpen()) closeMenu(true);
});

var sections = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
var menuLinks = overlay
  ? Array.prototype.slice.call(overlay.querySelectorAll("nav a"))
  : [];
var lastChapter = "";
var lastScroll = 0;

function currentChapter() {
  var marker = 110;
  var name = "Intro";
  for (var i = 0; i < sections.length; i += 1) {
    if (sections[i].getBoundingClientRect().top - marker <= 0) {
      name = sections[i].getAttribute("data-chapter") || name;
    }
  }
  return name;
}

function onScroll() {
  var y = window.scrollY;
  var height = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) {
    var ratio = height > 0 ? Math.min(1, Math.max(0, y / height)) : 0;
    progress.style.transform = "scaleX(" + ratio + ")";
  }
  var name = currentChapter();
  if (name !== lastChapter && chapterLabel) {
    chapterLabel.textContent = name;
    lastChapter = name;
    for (var i = 0; i < menuLinks.length; i += 1) {
      var linkName = menuLinks[i].textContent.replace(/^\s*\d+\s*/, "").trim();
      if (linkName === name) menuLinks[i].setAttribute("aria-current", "true");
      else menuLinks[i].removeAttribute("aria-current");
    }
  }
  if (!reducedMotion && header && !menuIsOpen() && window.innerWidth >= 960) {
    var goingDown = y > lastScroll && y > 140;
    header.classList.toggle("is-away", goingDown);
  } else if (header) {
    header.classList.remove("is-away");
  }
  lastScroll = y;
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
  }
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
    addList("What it is", []);
    addList("Red flags", current.redFlags);
    addList("How to detect it with data", current.detect);
    host.append(card);

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
  var ratio = window.devicePixelRatio || 1;
  var width = canvas.clientWidth || 640;
  var height = 220;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
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
  var revealBlocks = Array.prototype.slice.call(document.querySelectorAll("main > section:not(.hero)"));
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
