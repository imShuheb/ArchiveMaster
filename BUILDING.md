# Building and Downloading ArchiveMaster

This guide explains how the automated build pipeline works, where to find your compiled application for both Windows and Linux, and how to compile it yourself on your own machine.

---

## ☁️ Downloading the Automated Builds (GitHub Actions)

You don't need to build the app manually! Every time code is pushed to this repository, GitHub automatically compiles it for you. 

### How to download your `.exe` and Linux binaries:
1. Open your repository on GitHub.com.
2. Click on the **Actions** tab at the top of the page.
3. Click on the most recent workflow run under the "CI/CD Pipeline" list.
4. Scroll down to the bottom of the page to the **Artifacts** section.
5. You will see three files available for download:
   - 📦 **ArchiveMaster-Windows-Installer**: A standard `ArchiveMaster_Setup.exe` installer for Windows. It installs the app to Program Files and creates a Start Menu shortcut.
   - 🗂️ **ArchiveMaster-Windows-Portable**: A portable `.zip` folder containing the Windows app. No installation required, just extract and run the `.exe`.
   - 🐧 **ArchiveMaster-Linux-Portable**: A portable archive containing the compiled Linux executable.

---

## 💻 Building Locally on Windows

If you want to manually build the Windows `.exe` and the Setup Installer on your own machine:

**1. Install Python Dependencies**
```bash
pip install -r requirements.txt
pip install pyinstaller
```

**2. Compile the Portable App**
Run PyInstaller to bundle the code into a folder:
```bash
python -m PyInstaller --noconfirm --onedir --windowed --add-data "gui;gui/" --name "ArchiveMaster" app.py
```
*Your compiled portable app will be located in `dist/ArchiveMaster/ArchiveMaster.exe`.*

**3. Compile the Setup Installer (Optional)**
If you want to create the `ArchiveMaster_Setup.exe` installer:
1. Download and install [Inno Setup](https://jrsoftware.org/isinfo.php).
2. Right-click the `installer.iss` file in this folder and select **Compile**.
*Your final setup file will be created in the `dist/` folder.*

---

## 🐧 Building Locally on Linux

If you want to manually build the Linux binary on an Ubuntu/Debian machine:

**1. Install System Dependencies**
The desktop window engine requires GTK development headers.
```bash
sudo apt-get update
sudo apt-get install -y libgirepository1.0-dev gcc libcairo2-dev pkg-config python3-dev gir1.2-gtk-3.0
```

**2. Install Python Dependencies**
```bash
pip install -r requirements.txt
pip install pyinstaller
```

**3. Compile the App**
*Note: Linux uses a colon `:` as the file separator in PyInstaller instead of a semicolon `;`.*
```bash
python -m PyInstaller --noconfirm --onedir --windowed --add-data "gui:gui/" --name "ArchiveMaster" app.py
```
*Your compiled Linux binary will be located in `dist/ArchiveMaster/ArchiveMaster`.*
