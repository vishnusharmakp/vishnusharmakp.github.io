"""Rotate the fraud pattern of the week.

Takes the first pattern from data/pattern-queue.json, makes it the current
pattern in data/pattern.json with today's date, and moves the previous
pattern to the top of the "past" list. Does nothing if the queue is empty
or if the current pattern is already dated within the last 6 days, so a
manual run plus the scheduled run in the same week won't skip a pattern.

To change what comes next, edit or reorder data/pattern-queue.json.
"""
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATTERN = ROOT / "data" / "pattern.json"
QUEUE = ROOT / "data" / "pattern-queue.json"


def load(path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    force = "--force" in sys.argv
    today = dt.date.today()
    data = load(PATTERN, {"current": None, "past": []})
    queue_file = load(QUEUE, {"queue": []})
    queue = queue_file.get("queue") or []

    if not queue:
        print("Queue is empty. Add patterns to data/pattern-queue.json.")
        return

    current = data.get("current")
    if current and current.get("date") and not force:
        last = dt.date.fromisoformat(str(current["date"])[:10])
        if (today - last).days < 6:
            print(f"Current pattern is from {last}. Skipping until next week (use --force to override).")
            return

    nxt = dict(queue.pop(0))
    base_id = nxt.get("id") or nxt["title"].lower().replace(" ", "-")
    nxt["id"] = f"{base_id}-{today.isoformat()}"
    nxt["date"] = today.isoformat()

    past = data.get("past") or []
    if current and current.get("title"):
        past.insert(0, {"id": current.get("id"), "title": current["title"], "date": current.get("date")})

    save(PATTERN, {"current": nxt, "past": past})
    queue_file["queue"] = queue
    save(QUEUE, queue_file)
    print(f"Now showing: {nxt['title']}. {len(queue)} pattern(s) left in the queue.")
    if len(queue) <= 2:
        print("::warning::Only a few patterns left in data/pattern-queue.json. Time to add more.")


if __name__ == "__main__":
    main()
