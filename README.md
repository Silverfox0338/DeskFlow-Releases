<div align="center">

<img src="images/logo.png" width="96" alt="DeskFlow logo" />

# DeskFlow

**Your Windows desktop, arranged.**

Glass panels and widgets that live right on your wallpaper — and still behave like real desktop icons.

[![Latest release](https://img.shields.io/github/v/release/Silverfox0338/DeskFlow-Releases?style=for-the-badge&label=release&color=4C8DFF)](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Silverfox0338/DeskFlow-Releases/total?style=for-the-badge&color=2EC4B6&label=downloads)](https://github.com/Silverfox0338/DeskFlow-Releases/releases)
[![Release date](https://img.shields.io/github/release-date/Silverfox0338/DeskFlow-Releases?style=for-the-badge&color=A78BFA&label=updated)](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest)
<br />
[![Windows 10 | 11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](#requirements)
[![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Made by Silverfox0338](https://img.shields.io/badge/made%20by-Silverfox0338-FF7A45?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Silverfox0338)
[![License](https://img.shields.io/badge/license-all%20rights%20reserved-6B7280?style=for-the-badge)](LICENSE.txt)

### [⬇ Download the latest version](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest)

<img src="images/hero.png" alt="DeskFlow panels and widgets on the desktop" />

</div>

---

## Why I made DeskFlow

My desktop was a wall of icons. Every download, shortcut and screenshot landed in the same grid, and
I could never find anything. I wanted the order of an app launcher without giving up the things
that make the desktop useful — double-clicking files, dragging them into Discord, right-clicking for
"Open with". And I didn't want to lose my animated Wallpaper Engine background in the process.

So I built DeskFlow: a layer that sits on top of your wallpaper and underneath your apps, where you
arrange your real files into scrollable glass panels and put useful widgets wherever you like.

## Features

**Panels that hold your real files**
- Show your Desktop (or any folders) in scrollable, searchable glass panels.
- Everything still works like real icons: double-click to open, the full Windows right-click menu
  (Send to, Open with…), drag files in and out, rename with F2, delete to the Recycle Bin.
- New files appear instantly. Sort by name, type or date; four icon sizes; collapse a panel to its header.

**Widgets**
- Clock, System stats (CPU / memory / disk), Now Playing with media controls, and a Quick launch bar.
- Widgets pause automatically when they're hidden behind your apps — just like Wallpaper Engine does —
  so DeskFlow uses close to zero CPU while you work.

**DeskFlow Studio**
- A full editor for your layout: a live map of your monitors, exact positions, grid size and snapping.
- Live grid snapping while you drag (hold <kbd>Alt</kbd> to place freely, <kbd>Esc</kbd> to cancel).
- Theme maker: accent, glass tint, opacity, corner radius, border and shadow — with presets, and
  your own themes saved, imported and exported.

**Plays nicely with Windows**
- Stays under your apps, comes forward with <kbd>Win</kbd> + <kbd>D</kbd>.
- Works with Wallpaper Engine and survives Explorer restarts.
- Hides the native desktop icons while it runs and puts them back when it closes.
- Per-monitor DPI aware, single tray icon, starts with Windows if you want it to.
- Updates itself: DeskFlow checks for new versions and installs them with one click.

<div align="center">
<img src="images/studio-themes.png" width="760" alt="DeskFlow Studio theme maker" />
</div>

## Install

1. Download **`DeskFlow-Setup-<version>.exe`** from the [latest release](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest).
2. Run it. It installs just for you — no administrator prompt.
   If your PC doesn't have the .NET 10 Desktop Runtime yet, the installer downloads it from Microsoft for you.
3. DeskFlow starts in your system tray (look for the blue tile icon near the clock — it may be under the **^** arrow).

Each release also includes a `.sha256` file if you'd like to verify your download.

## Getting started

- **Right-click the tray icon** for everything: add panels and widgets, lock/unlock the layout, themes, settings.
- **Unlock the layout** to move things around — drag a panel by its header and resize it from the corner.
  Double-click the tray icon to toggle the lock quickly.
- Open **DeskFlow Studio** from the tray for exact positioning, grid options and the theme maker.
- Right-click a panel's empty space for New folder, Paste, Sort by and Icon size; right-click a widget for its settings.

## Requirements

- Windows 11, or Windows 10 version 2004 or newer (64-bit)
- [.NET 10 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/10.0) — installed automatically if it's missing

## Privacy

DeskFlow runs entirely on your PC. Your layout and themes are stored in `%AppData%\DeskFlow`.
The only network request it makes on its own is a daily check of this page for new versions
(you can turn that off in Studio → About). Nothing is collected or sent to me.

## Uninstall

Use **Settings → Apps → Installed apps → DeskFlow → Uninstall**. DeskFlow closes, your normal desktop
icons come back, and you're asked whether to keep your layout and themes.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/Silverfox0338/DeskFlow-Releases/issues) —
I read all of them. Screenshots and your Windows version help a lot.

## Credits

DeskFlow is designed and developed by **[Silverfox0338](https://github.com/Silverfox0338)**.
It's built on .NET and WPF by Microsoft, and the installer is made with Inno Setup by Jordan Russell and
Martijn Laan. DeskFlow is an independent project and isn't affiliated with Wallpaper Engine or Microsoft.

## License

Copyright © 2026 Silverfox0338. All rights reserved.
DeskFlow is free to download and use; see [LICENSE.txt](LICENSE.txt) for the full terms.

<div align="center">
<sub>Made with care by Silverfox0338</sub>
</div>
