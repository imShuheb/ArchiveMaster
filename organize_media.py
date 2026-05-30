"""
organize_media.py — Core media organization engine.
Scans, deduplicates, and sorts photos/videos by date.
Supports cancel, pause, progress callbacks with speed/ETA.
"""
import argparse
import datetime as dt
import hashlib
import os
import shutil
import time
import threading
from typing import Optional

IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".heic",
    ".heif",
    ".tif",
    ".tiff",
    ".bmp",
    ".gif",
    ".webp",
    ".raw",
    ".cr2",
    ".nef",
    ".arw",
}

VIDEO_EXTS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".m4v",
    ".3gp",
    ".wmv",
    ".mpeg",
    ".mpg",
    ".mts",
    ".webm",
    ".flv",
}


class CancelledError(Exception):
    """Raised when the user cancels the operation."""
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy and organize photos/videos by date and separate duplicates."
    )
    parser.add_argument(
        "--source",
        default="",
        help="Source root to scan",
    )
    parser.add_argument(
        "--dest",
        default="",
        help="Destination root to write into",
    )
    parser.add_argument(
        "--date-scheme",
        choices=["year-month", "year-month-day"],
        default="year-month",
        help="Folder structure for dated files.",
    )
    parser.add_argument(
        "--duplicates-folder",
        default="duplicates",
        help="Folder name under dest for duplicates.",
    )
    parser.add_argument(
        "--include-photos",
        action="store_true",
        default=True,
        help="Include photo files (default: True).",
    )
    parser.add_argument(
        "--include-videos",
        action="store_true",
        default=True,
        help="Include video files (default: True).",
    )
    parser.add_argument(
        "--include-others",
        action="store_true",
        help="Include all other file types.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show actions without copying files.",
    )
    return parser.parse_args()


def iter_files(root: str, include_photos: bool, include_videos: bool, include_others: bool):
    """Yield all media file paths under root."""
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            path = os.path.join(dirpath, name)
            ext = os.path.splitext(name)[1].lower()
            if ext in IMAGE_EXTS:
                if include_photos:
                    yield path
            elif ext in VIDEO_EXTS:
                if include_videos:
                    yield path
            else:
                if include_others:
                    yield path


def count_files(root: str, include_photos: bool, include_videos: bool, include_others: bool) -> int:
    """Count total media files under root."""
    total = 0
    for _ in iter_files(root, include_photos, include_videos, include_others):
        total += 1
    return total


def get_exif_datetime(path: str) -> Optional[dt.datetime]:
    """Try to extract EXIF date from an image file."""
    try:
        from PIL import Image, ExifTags
    except Exception:
        return None

    try:
        with Image.open(path) as img:
            exif = img._getexif()
            if not exif:
                return None
            tag_map = {v: k for k, v in ExifTags.TAGS.items()}
            for tag_name in ("DateTimeOriginal", "DateTime"):
                tag_id = tag_map.get(tag_name)
                if tag_id is None:
                    continue
                value = exif.get(tag_id)
                if not value:
                    continue
                try:
                    return dt.datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                except Exception:
                    return None
    except Exception:
        return None

    return None


def get_media_datetime(path: str) -> dt.datetime:
    """Get the best available date for a media file."""
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        exif_dt = get_exif_datetime(path)
        if exif_dt:
            return exif_dt
    mtime = os.path.getmtime(path)
    return dt.datetime.fromtimestamp(mtime)


def compute_hash(path: str) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def ensure_dir(path: str, dry_run: bool) -> None:
    if dry_run:
        return
    os.makedirs(path, exist_ok=True)


def get_unique_dest_path_or_skip(dest_dir: str, filename: str, source_path: str, file_hash: str) -> Optional[str]:
    """Generate a unique file path, or return None if the exact file already exists."""
    base, ext = os.path.splitext(filename)
    candidate = os.path.join(dest_dir, filename)
    
    try:
        source_size = os.path.getsize(source_path)
    except Exception:
        source_size = -1

    if not os.path.exists(candidate):
        return candidate
        
    try:
        if os.path.getsize(candidate) == source_size:
            if compute_hash(candidate) == file_hash:
                return None
    except Exception:
        pass
        
    counter = 1
    while True:
        alt = os.path.join(dest_dir, f"{base}__{counter}{ext}")
        if not os.path.exists(alt):
            return alt
        try:
            if os.path.getsize(alt) == source_size:
                if compute_hash(alt) == file_hash:
                    return None
        except Exception:
            pass
        counter += 1


def date_folder(dest_root: str, dt_value: dt.datetime, scheme: str) -> str:
    """Build the date-based folder path."""
    month_name = dt_value.strftime("%b").lower()
    if scheme == "year-month-day":
        return os.path.join(dest_root, f"{dt_value.year:04d}", f"{month_name}-{dt_value.day:02d}")
    return os.path.join(dest_root, f"{dt_value.year:04d}", month_name)


def media_category(path: str) -> str:
    """Classify a file as Photos, Videos, or Other."""
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        return "Photos"
    if ext in VIDEO_EXTS:
        return "Videos"
    return "Other"


def get_free_space(path: str) -> int:
    """Get free disk space in bytes for the drive containing path."""
    try:
        usage = shutil.disk_usage(os.path.splitdrive(path)[0] or path)
        return usage.free
    except Exception:
        return -1


def run_organization(
    args: dict,
    progress_callback=None,
    cancel_event: threading.Event = None,
    pause_event: threading.Event = None,
) -> dict:
    """
    Run the full organization pipeline.

    Args:
        args: Configuration dict with keys: source, dest, date_scheme,
              duplicates_folder, include_all, dry_run.
        progress_callback: Called with a dict of progress data.
        cancel_event: If set(), the operation raises CancelledError.
        pause_event: If clear(), the operation blocks until set() again.
    """
    source = os.path.abspath(args.get("source", ""))
    dest = os.path.abspath(args.get("dest", ""))
    operation = args.get("operation", "copy")
    date_scheme = args.get("date_scheme", "year-month")
    duplicates_folder = args.get("duplicates_folder", "duplicates")
    include_photos = args.get("include_photos", True)
    include_videos = args.get("include_videos", True)
    include_others = args.get("include_others", False)
    dry_run = args.get("dry_run", False)

    duplicates_root = os.path.join(dest, duplicates_folder)

    if not os.path.isdir(source):
        raise ValueError(f"Source not found: {source}")

    ensure_dir(dest, dry_run)
    ensure_dir(duplicates_root, dry_run)

    def _check_cancel():
        if cancel_event and cancel_event.is_set():
            raise CancelledError("Operation cancelled by user.")

    def _wait_if_paused():
        if pause_event:
            pause_event.wait()  # blocks if clear()

    # --- Count files ---
    if progress_callback:
        progress_callback({"status": "Counting files…", "phase": "counting"})
    total_files = count_files(source, include_photos, include_videos, include_others)

    if total_files == 0:
        return {"scanned": 0, "copied": 0, "duplicates": 0, "skipped": 0, "size_mb": 0, "duration_sec": 0}

    # --- Process files ---
    seen_hashes = {}
    scanned = 0
    copied = 0
    dupes = 0
    skipped = 0
    total_bytes = 0
    last_dir = None
    start_time = time.time()

    for path in iter_files(source, include_photos, include_videos, include_others):
        _check_cancel()
        _wait_if_paused()

        scanned += 1
        filename = os.path.basename(path)
        current_dir = os.path.dirname(path)

        # Calculate speed and ETA
        elapsed = time.time() - start_time
        speed = scanned / elapsed if elapsed > 0 else 0
        remaining = total_files - scanned
        eta = remaining / speed if speed > 0 else 0

        # Report folder change
        if current_dir != last_dir:
            last_dir = current_dir

        # Hash the file
        try:
            file_hash = compute_hash(path)
        except Exception:
            skipped += 1
            continue

        if file_hash in seen_hashes:
            # Duplicate
            dupes += 1
            hash_dir = os.path.join(duplicates_root, file_hash[:2], file_hash[2:4], file_hash)
            ensure_dir(hash_dir, dry_run)
            dest_path = get_unique_dest_path_or_skip(hash_dir, filename, path, file_hash)
            if dest_path is None:
                # Identical file already exists here!
                if not dry_run and operation == "move":
                    try:
                        os.remove(path)
                    except Exception:
                        pass
                skipped += 1
            else:
                if not dry_run:
                    if operation == "move":
                        shutil.move(path, dest_path)
                    else:
                        shutil.copy2(path, dest_path)
                    try:
                        total_bytes += os.path.getsize(dest_path)
                    except Exception:
                        pass
        else:
            # Unique file
            seen_hashes[file_hash] = path
            try:
                dt_value = get_media_datetime(path)
            except Exception:
                skipped += 1
                continue

            dated_dir = date_folder(dest, dt_value, date_scheme)
            dated_dir = os.path.join(dated_dir, media_category(path))
            ensure_dir(dated_dir, dry_run)
            dest_path = get_unique_dest_path_or_skip(dated_dir, filename, path, file_hash)
            if dest_path is None:
                if not dry_run and operation == "move":
                    try:
                        os.remove(path)
                    except Exception:
                        pass
                skipped += 1
            else:
                if not dry_run:
                    if operation == "move":
                        shutil.move(path, dest_path)
                    else:
                        shutil.copy2(path, dest_path)
                    try:
                        total_bytes += os.path.getsize(dest_path)
                    except Exception:
                        pass
                copied += 1

        # Send progress every 5 files
        if scanned % 5 == 0 or scanned == total_files:
            if progress_callback:
                progress_callback({
                    "phase": "processing",
                    "status": f"Processing: {os.path.basename(last_dir)}",
                    "current_file": filename,
                    "percentage": (scanned / total_files * 100.0),
                    "scanned": scanned,
                    "total": total_files,
                    "copied": copied,
                    "duplicates": dupes,
                    "skipped": skipped,
                    "size_mb": round(total_bytes / (1024 * 1024), 1),
                    "speed": round(speed, 1),
                    "eta": round(eta),
                })

    # Final progress
    elapsed = time.time() - start_time
    if progress_callback:
        progress_callback({
            "phase": "done",
            "percentage": 100.0,
            "scanned": scanned,
            "total": total_files,
            "copied": copied,
            "duplicates": dupes,
            "skipped": skipped,
            "size_mb": round(total_bytes / (1024 * 1024), 1),
            "speed": round(scanned / elapsed, 1) if elapsed > 0 else 0,
            "eta": 0,
        })

    return {
        "scanned": scanned,
        "copied": copied,
        "duplicates": dupes,
        "skipped": skipped,
        "size_mb": round(total_bytes / (1024 * 1024), 1),
        "duration_sec": elapsed,
    }


def main() -> int:
    args_ns = parse_args()
    args_dict = vars(args_ns)
    try:
        results = run_organization(args_dict)
        print("Done.")
        print(f"Scanned: {results['scanned']}")
        print(f"Copied: {results['copied']}")
        print(f"Duplicates: {results['duplicates']}")
        print(f"Skipped: {results['skipped']}")
        print(f"Duration: {results['duration_sec']:.1f}s")
        return 0
    except ValueError as e:
        print(e)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
