"""
history.py — Session history manager.
Stores organization run results to ~/.media_organizer/history.json
"""
import json
import os
import datetime as dt

SETTINGS_DIR = os.path.join(os.path.expanduser("~"), ".media_organizer")
HISTORY_FILE = os.path.join(SETTINGS_DIR, "history.json")


def _ensure_dir():
    os.makedirs(SETTINGS_DIR, exist_ok=True)


def load_history() -> list:
    """Load all past sessions. Returns empty list if file is missing."""
    try:
        if os.path.isfile(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def save_session(config: dict, results: dict, duration_sec: float) -> dict:
    """Append a new session record and return it."""
    _ensure_dir()
    record = {
        "timestamp": dt.datetime.now().isoformat(),
        "config": {
            "source": config.get("source", ""),
            "dest": config.get("dest", ""),
            "date_scheme": config.get("date_scheme", "year-month"),
            "duplicates_folder": config.get("duplicates_folder", "duplicates"),
            "include_photos": config.get("include_photos", True),
            "include_videos": config.get("include_videos", True),
            "include_others": config.get("include_others", False),
            "dry_run": config.get("dry_run", False),
        },
        "results": {
            "scanned": results.get("scanned", 0),
            "copied": results.get("copied", 0),
            "duplicates": results.get("duplicates", 0),
            "skipped": results.get("skipped", 0),
            "size_mb": results.get("size_mb", 0),
        },
        "duration_sec": round(duration_sec, 2),
    }

    history = load_history()
    history.insert(0, record)  # newest first

    # Keep at most 100 records
    history = history[:100]

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    return record


def clear_history() -> None:
    """Delete all history."""
    if os.path.isfile(HISTORY_FILE):
        os.remove(HISTORY_FILE)


def delete_session(timestamp: str) -> None:
    """Delete a specific session by timestamp."""
    history = load_history()
    history = [s for s in history if s.get("timestamp") != timestamp]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
