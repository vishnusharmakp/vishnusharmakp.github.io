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
        var target = Number(el.getAttribute("data-count"));
        var prefix = el.getAttribute("data-prefix") || "";
        var suffix = el.getAttribute("data-suffix") || "";
        el.textContent = prefix + Math.round(target * eased) + suffix;
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
  } catch (error) {
    showNewsFallback();
  }
}

loadNews();
