<div align="center">
  <h1>🗄️ ArchiveMaster</h1>
  <p><strong>The smart, lightning-fast desktop application to organize your digital life.</strong></p>
  
  [![Build Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions)
  [![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/YOUR_REPO?color=blue)](https://github.com/YOUR_USERNAME/YOUR_REPO/releases)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)](#)
</div>

---

## 🌟 What is ArchiveMaster?

Have you ever dumped thousands of scattered photos, videos, and documents into a hard drive, only to realize it's a complete mess? **ArchiveMaster** is a native desktop application designed to solve that problem.

It recursively scans any folder you point it to, identifies duplicates with cryptographic precision, and neatly copies or moves your media into beautifully organized, chronological folders (e.g., `2024/Jan/Photos`).

### ✨ Key Features
- **Smart Deduplication**: Identifies exact file matches using SHA-256 hashing. If it finds duplicates, it safely segregates them into a dedicated `duplicates/` folder.
- **Granular Control**: Toggle exactly what you want to organize (`Photos`, `Videos`, or `Others`).
- **EXIF Date Extraction**: Doesn't just rely on file creation dates; it intelligently reads the metadata embedded inside your photos to figure out exactly when they were taken.
- **Beautiful UI**: A modern, native desktop interface built with Fluent Design principles, featuring real-time progress bars, speed metrics, and ETA calculations.
- **Session History**: Keeps a persistent log of your past organization runs, detailing exactly how much data was processed and saved.

---

## 📥 Download & Install

Head over to the [Releases Page](https://github.com/YOUR_USERNAME/YOUR_REPO/releases) to download the latest version!

### Windows
Download `ArchiveMaster_Setup.exe` and run it to install the application to your Start Menu. Alternatively, download the `Windows-Portable.zip` if you don't want to install anything.

### Linux
Download the `Linux-Portable.tar.gz` archive, extract it, and run the `ArchiveMaster` binary.

---

## 🛠️ For Developers: Building Locally

If you want to run the application directly from the source code or compile it yourself, check out the [BUILDING.md](BUILDING.md) guide!

---

<div align="center">
  <i>Built with ❤️ using Python and pywebview.</i>
</div>
