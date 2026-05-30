[Setup]
AppName=ArchiveMaster
AppVersion=1.0
DefaultDirName={autopf}\ArchiveMaster
DefaultGroupName=ArchiveMaster
OutputBaseFilename=ArchiveMaster_Setup
OutputDir=dist
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "dist\ArchiveMaster\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\ArchiveMaster"; Filename: "{app}\ArchiveMaster.exe"
Name: "{autodesktop}\ArchiveMaster"; Filename: "{app}\ArchiveMaster.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Run]
Filename: "{app}\ArchiveMaster.exe"; Description: "Launch ArchiveMaster"; Flags: nowait postinstall skipifsilent
