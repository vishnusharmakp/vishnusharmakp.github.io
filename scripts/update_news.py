#!/usr/bin/env python3
"""Refresh data/news.json from public Google News RSS queries.

No API key. Stdlib only, so GitHub Actions can run it without a pip install.
Exits non-zero without rewriting news.json when fewer than eight headlines
come back, so a failed fetch cannot blank the site.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "news.json"
USER_AGENT = "VishnuSharmaPortfolio/1.0 (+https://www.vishnusharmakp.com)"
TARGET = 10
MAX_PER_TOPIC = 3
MIN_ITEMS = 8

# Date windows keep a thin news week from emptying the page. Newest items are kept.
TOPICS: tuple[tuple[str, str], ...] = (
    (
        "Payment fraud",
        '"payment fraud" OR "credit card fraud" OR "card fraud" when:21d',
    ),
    (
        "Chargebacks",
        '"chargeback" OR "chargebacks" when:45d',
    ),
    (
        "Identity & ATO",
        '"account takeover" OR "identity theft" OR "identity fraud" OR "credential stuffing" when:30d',
    ),
    (
        "Scams & financial crime",
        '"investment scam" OR "phishing scam" OR "wire fraud" OR "financial crime" when:14d',
    ),
    (
        "Data & AI",
        '("machine learning" OR "generative AI" OR "data science") (OpenAI OR Google OR Microsoft OR Nvidia OR analytics) when:21d',
    ),
)

# Title must mention the topic. Stops a loose RSS hit from being filed under the wrong label.
TITLE_TERMS: dict[str, tuple[str, ...]] = {
    "Payment fraud": ("payment fraud", "card fraud", "credit card"),
    "Chargebacks": ("chargeback",),
    "Identity & ATO": (
        "account takeover",
        "identity theft",
        "identity fraud",
        "credential stuffing",
        "synthetic identity",
    ),
    "Scams & financial crime": ("scam", "wire fraud", "phishing", "financial crime"),
    "Data & AI": (
        "machine learning",
        "data science",
        "generative ai",
        "artificial intelligence",
        "analytics",
        "openai",
    ),
}

STOPWORDS = {
    "a",
    "an",
    "the",
    "of",
    "to",
    "in",
    "for",
    "and",
    "on",
    "with",
    "as",
    "by",
    "after",
    "over",
    "from",
    "its",
    "at",
    "into",
    "than",
    "that",
    "this",
    "are",
    "was",
    "were",
}


def fetch_xml(query: str) -> bytes:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    )
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def clean_title(title: str, source: str) -> str:
    title = " ".join(title.split())
    if not source:
        return title
    for separator in (" - ", " — ", " – ", " | "):
        suffix = separator + source
        if title.endswith(suffix):
            return title[: -len(suffix)].strip()
    return title


def parse_feed(xml_bytes: bytes, topic: str) -> list[dict[str, str]]:
    root = ET.fromstring(xml_bytes)
    items: list[dict[str, str]] = []
    for node in root.findall("./channel/item"):
        raw_title = (node.findtext("title") or "").strip()
        url = (node.findtext("link") or "").strip()
        source = (node.findtext("source") or "").strip()
        published = (node.findtext("pubDate") or "").strip()
        title = clean_title(raw_title, source)
        if len(title) < 24 or not url.startswith("http") or not title_ok(topic, title):
            continue
        try:
            published_at = parsedate_to_datetime(published).astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError):
            continue
        items.append(
            {
                "title": title,
                "source": source or "Google News",
                "date": published_at.date().isoformat(),
                "url": url,
                "topic": topic,
                "_sort": published_at.isoformat(),
            }
        )
    items.sort(key=lambda item: item["_sort"], reverse=True)
    return items


def normalize(title: str) -> str:
    return " ".join(title.casefold().split())


def title_tokens(title: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", title.casefold())
    return {word for word in words if word not in STOPWORDS and len(word) > 2}


def too_similar(left: set[str], right: set[str]) -> bool:
    if not left or not right:
        return False
    overlap = len(left & right) / len(left | right)
    return overlap >= 0.42


def title_ok(topic: str, title: str) -> bool:
    lowered = title.casefold().strip()
    if lowered.startswith("how to "):
        return False
    if "correction" in lowered or "top picks" in lowered or "our top" in lowered:
        return False
    terms = TITLE_TERMS.get(topic, ())
    if not terms:
        return True
    return any(term in lowered for term in terms)


def select_items(buckets: dict[str, list[dict[str, str]]]) -> list[dict[str, str]]:
    order = [topic for topic, _query in TOPICS]
    cursors = {topic: 0 for topic in order}
    taken = {topic: 0 for topic in order}
    seen: set[str] = set()
    seen_tokens: list[set[str]] = []
    selected: list[dict[str, str]] = []

    while len(selected) < TARGET:
        progressed = False
        for topic in order:
            if taken[topic] >= MAX_PER_TOPIC:
                continue
            pool = buckets.get(topic, [])
            while cursors[topic] < len(pool):
                item = pool[cursors[topic]]
                cursors[topic] += 1
                key = normalize(item["title"])
                tokens = title_tokens(item["title"])
                if key in seen or any(too_similar(tokens, previous) for previous in seen_tokens):
                    continue
                seen.add(key)
                seen_tokens.append(tokens)
                taken[topic] += 1
                selected.append(item)
                progressed = True
                break
            if len(selected) >= TARGET:
                break
        if not progressed:
            break

    selected.sort(key=lambda item: (item["_sort"], item["title"]), reverse=True)
    public: list[dict[str, str]] = []
    for item in selected:
        public.append(
            {
                "title": item["title"],
                "source": item["source"],
                "date": item["date"],
                "url": item["url"],
                "topic": item["topic"],
            }
        )
    return public


def main() -> int:
    buckets: dict[str, list[dict[str, str]]] = {}
    failures: list[str] = []
    for topic, query in TOPICS:
        try:
            buckets[topic] = parse_feed(fetch_xml(query), topic)
            print(f"{topic}: {len(buckets[topic])} items")
        except (urllib.error.URLError, TimeoutError, ET.ParseError, OSError) as error:
            buckets[topic] = []
            failures.append(f"{topic}: {error}")
            print(f"{topic}: FAILED {error}", file=sys.stderr)

    items = select_items(buckets)
    print(f"selected {len(items)}")
    if len(items) < MIN_ITEMS:
        print(
            f"Refusing to update {OUT.name}: only {len(items)} headlines (need {MIN_ITEMS}).",
            file=sys.stderr,
        )
        return 1

    payload = {
        "updated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": "Google News RSS",
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    if failures:
        print("partial feed failures:", "; ".join(failures), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
