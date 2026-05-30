"""
app.py — Media Organizer desktop application.
Uses pywebview to create a native window with an HTML/JS/CSS frontend.
Exposes a Python API to JavaScript via window.pywebview.api.
"""
import os
import sys
import json
import time
import threading
import webview
import psutil

from organize_media import run_organization, CancelledError, get_free_space
from history import save_session, load_history, clear_history, delete_session
from settings import load_settings, save_settings, reset_settings

# Reference to the main webview window (set after creation)
_window = None


class Api:
    """
    Python API exposed to JavaScript.
    All public methods are callable via window.pywebview.api.<method>().
    """

    def __init__(self):
        self._cancel_event = threading.Event()
        self._pause_event = threading.Event()
        self._pause_event.set()  # start unpaused (set = running)
        self._running = False

    # ------------------------------------------------------------------ #
    #  Organization
    # ------------------------------------------------------------------ #

    def start_organization(self, args: dict) -> None:
        """Start the organization in a background thread."""
        if self._running:
            self._send_js("onOrganizationError", "An operation is already running.")
            return

        self._running = True
        self._cancel_event.clear()
        self._pause_event.set()

        thread = threading.Thread(target=self._run, args=(args,), daemon=True)
        thread.start()

    def _run(self, args: dict):
        """Background thread that runs the organization pipeline."""
        start = time.time()
        try:
            results = run_organization(
                args,
                progress_callback=self._on_progress,
                cancel_event=self._cancel_event,
                pause_event=self._pause_event,
            )
            duration = time.time() - start

            # Save to history
            save_session(args, results, duration)

            self._send_js("onOrganizationComplete", {
                "scanned": results["scanned"],
                "copied": results["copied"],
                "duplicates": results["duplicates"],
                "skipped": results["skipped"],
                "size_mb": results["size_mb"],
                "duration_sec": round(duration, 2),
            })

        except CancelledError:
            self._send_js("onOrganizationCancelled", {})

        except Exception as e:
            self._send_js("onOrganizationError", str(e))

        finally:
            self._running = False

    def _on_progress(self, data: dict):
        """Forward progress data to the JS frontend."""
        self._send_js("onProgress", data)

    def cancel_organization(self) -> None:
        """Cancel the running operation."""
        self._cancel_event.set()

    def pause_organization(self) -> None:
        """Pause the running operation."""
        self._pause_event.clear()  # clear = paused (wait() blocks)

    def resume_organization(self) -> None:
        """Resume a paused operation."""
        self._pause_event.set()  # set = running

    def is_running(self) -> bool:
        return self._running

    def is_paused(self) -> bool:
        return not self._pause_event.is_set()

    # ------------------------------------------------------------------ #
    #  Folder Picker
    # ------------------------------------------------------------------ #

    def pick_folder(self) -> str:
        """Open a native OS folder picker dialog. Returns path or empty string."""
        if _window is None:
            return ""
        result = _window.create_file_dialog(
            webview.FileDialog.FOLDER, allow_multiple=False
        )
        if result and len(result) > 0:
            return result[0]
        return ""

    # ------------------------------------------------------------------ #
    #  System Info
    # ------------------------------------------------------------------ #

    def get_memory_usage(self) -> dict:
        """Return current process memory usage in MB."""
        proc = psutil.Process(os.getpid())
        mem = proc.memory_info()
        return {
            "rss_mb": round(mem.rss / (1024 * 1024), 1),
            "vms_mb": round(mem.vms / (1024 * 1024), 1),
        }

    def get_disk_info(self, path: str) -> dict:
        """Return disk usage for the drive containing path."""
        try:
            import shutil as _shutil
            usage = _shutil.disk_usage(os.path.splitdrive(path)[0] or path)
            return {
                "total_gb": round(usage.total / (1024 ** 3), 2),
                "used_gb": round(usage.used / (1024 ** 3), 2),
                "free_gb": round(usage.free / (1024 ** 3), 2),
            }
        except Exception:
            return {"total_gb": 0, "used_gb": 0, "free_gb": 0}

    # ------------------------------------------------------------------ #
    #  History
    # ------------------------------------------------------------------ #

    def get_history(self) -> list:
        return load_history()

    def clear_history(self) -> None:
        clear_history()

    def delete_history_item(self, timestamp: str) -> None:
        delete_session(timestamp)

    # ------------------------------------------------------------------ #
    #  Settings
    # ------------------------------------------------------------------ #

    def get_settings(self) -> dict:
        return load_settings()

    def save_settings(self, data: dict) -> None:
        save_settings(data)

    def reset_settings(self) -> dict:
        return reset_settings()

    # ------------------------------------------------------------------ #
    #  System Utilities
    # ------------------------------------------------------------------ #

    def open_folder(self, path: str) -> None:
        """Open a folder natively in the OS file explorer."""
        try:
            if sys.platform == "win32":
                os.startfile(path)
            elif sys.platform == "darwin":
                import subprocess
                subprocess.Popen(["open", path])
            else:
                import subprocess
                subprocess.Popen(["xdg-open", path])
        except Exception as e:
            print(f"Error opening folder: {e}")

    # ------------------------------------------------------------------ #
    #  JS Bridge Helper
    # ------------------------------------------------------------------ #

    def _send_js(self, func_name: str, data) -> None:
        """Call a global JS function with data, safely from any thread."""
        if _window is None:
            return
        try:
            payload = json.dumps(data)
            _window.evaluate_js(f"window._bridge.{func_name}({payload})")
        except Exception as e:
            print(f"[bridge] Error calling {func_name}: {e}")


def main():
    global _window
    api = Api()

    if hasattr(sys, '_MEIPASS'):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    gui_dir = os.path.join(base_dir, "gui")

    _window = webview.create_window(
        title="ArchiveMaster",
        url=os.path.join(gui_dir, "index.html"),
        js_api=api,
        width=1060,
        height=720,
        min_size=(800, 500),
        text_select=False,
    )

    webview.start(debug=False)


if __name__ == "__main__":
    main()
