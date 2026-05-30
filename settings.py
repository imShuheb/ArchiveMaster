"""
settings.py — User preferences manager.
Persists user settings to ~/.media_organizer/settings.json
"""
import json
import os

SETTINGS_DIR = os.path.join(os.path.expanduser("~"), ".media_organizer")
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")

DEFAULT_SETTINGS = {
    "default_operation": "copy",
    "date_scheme": "year-month",
    "duplicates_folder": "duplicates",
    "include_photos": True,
    "include_videos": True,
    "include_others": False,
}


def _ensure_dir():
    os.makedirs(SETTINGS_DIR, exist_ok=True)


def load_settings() -> dict:
    """Load settings from disk. Returns defaults if file is missing or corrupt."""
    try:
        if os.path.isfile(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Merge with defaults so new keys are always present
            merged = {**DEFAULT_SETTINGS, **data}
            return merged
    except Exception:
        pass
    return dict(DEFAULT_SETTINGS)


def save_settings(data: dict) -> None:
    """Write settings to disk."""
    _ensure_dir()
    # Only save known keys
    to_save = {}
    for key in DEFAULT_SETTINGS:
        if key in data:
            to_save[key] = data[key]
        else:
            to_save[key] = DEFAULT_SETTINGS[key]
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(to_save, f, indent=2)


def reset_settings() -> dict:
    """Reset settings to defaults and return them."""
    save_settings(DEFAULT_SETTINGS)
    return dict(DEFAULT_SETTINGS)
