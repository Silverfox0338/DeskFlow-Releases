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
[![License](https://img.shields.io/badge/license-all%20rights%20reserved-6B7280?style=for-the-badge)](LICENSE.md)

### [⬇ Download the latest version](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest)

<img src="images/hero.png" alt="DeskFlow panels and widgets on the desktop" />
<br/>
<sub>A Desktop panel, a Work panel with its own photo theme and tabs, an app dock, and widgets for the clock,
weather, system stats, clipboard, calendar and notes.</sub>

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
- **Tabs** inside a panel (Desktop, Paperwork, Projects…), a compact **dock mode**, and a **theme per panel**.
- **Auto-sort rules** keep things tidy for you — e.g. new screenshots go straight to Pictures\Screenshots,
  installers to Downloads\Installers. Nothing is ever overwritten.

<div align="center">
<img src="images/panels.png" width="760" alt="DeskFlow panel with tabs, a themed panel and a dock" />
<br/>
<sub>Left: your Desktop in a glass panel. Right: a panel with tabs (Work / Invoices) and its own photo
background, and below it a compact dock with its own glowing theme.</sub>
</div>

**Widgets**
- **Weather** with a 3-day forecast, **Calendar**, **Clock**, **Notes** that save as you type,
  **Now Playing** with media controls, **System stats** (CPU, memory, GPU, network and any drives you pick), **Network & battery** with a live speed graph,
  **Clipboard history** (private and in-memory only), and a **Quick launch** bar for your favourite apps.
- Browse and add them from the widget gallery in DeskFlow Studio.
- Widgets pause automatically when they're hidden behind your apps — just like Wallpaper Engine does —
  so DeskFlow uses close to zero CPU while you work.

<div align="center">
<img src="images/widgets.png" alt="DeskFlow widgets: weather, calendar, notes, network and clipboard" />
<br/>
<sub>Weather with a 3-day forecast, network &amp; battery, a clock with its own photo, the calendar,
clipboard history and notes.</sub>
</div>

**DeskFlow Studio**
- A **design workspace** laid out like a design app: a big live canvas of your monitors in the middle,
  your panels and widgets as **layers** on the left, and an **inspector** on the right with the theme
  **Editor**, **Smart themes** and **Settings**. Drag on the canvas and your real desktop moves with it.
- The canvas **zooms and pans** (scroll to zoom, drag to pan), with a toolbar for zoom, fit and one button
  per monitor, so even a crowded, multi-monitor layout stays easy to work with.
- Live grid snapping and **smart guides** that line things up with each other while you drag
  (hold <kbd>Alt</kbd> to place freely, <kbd>Esc</kbd> to cancel), plus **undo/redo** for every layout change.
- **Monitor profiles**: plug in your second screen and your two-monitor layout comes back by itself.
- A **peek hotkey** that brings your whole desktop layer above every window, and back again.
- **Export and import layouts** to move your setup to another PC.

**Themes that are actually yours**
- **17 built-in themes** in a gallery where every card is a live preview, plus themes generated from
  your **wallpaper's colours**.
- A pro **theme editor** with a large live preview: gradient glass, solid, gradient or glowing borders,
  shadows, hover and selection styles, fonts and text sizes, density, header styles and widget scale.
  Settings are grouped in collapsible sections that summarise themselves, so a whole theme fits on one screen.
- **Your own images** behind panels and widgets, with visibility, blur and darken controls, plus
  subtle textures (noise, paper, carbon and more). Give a single widget its own photo, too.
- **Smart themes** follow Windows light/dark mode or switch between a day and a night theme on a
  schedule, and can use your Windows accent colour.
- Share a look as a **theme pack** (`.deskflow-theme`), with its images included.

<div align="center">
<img src="images/studio-themes.png" width="760" alt="DeskFlow Studio theme gallery with live preview cards" />
<br/>
<sub><b>Themes.</b> Every card is a live preview of the theme. Filter by category, click one to use it,
or right-click to edit, export or delete it.</sub>
<br/><br/>
<img src="images/studio-editor.png" width="760" alt="DeskFlow Studio theme editor with a live preview" />
<br/>
<sub><b>Design.</b> Layers on the left, a live canvas of your desktop in the middle (every panel and widget shown as it really looks), and the inspector on the right:
a fixed live preview above the theme editor's sections (Colours open, the rest summarised).</sub>
</div>

**Addons: widgets made by anyone**
- Install widgets other people made by double-clicking a `.deskflow-addon` file.
- **Safe addons** are just layout and data: crypto prices, news headlines, countdowns, server status and
  more. They can't run programs or touch your files, they only read from websites you approve, and they always
  match your theme.
- **Code plugins** can do more. DeskFlow warns you clearly before installing one, and asks again if its code ever
  changes.
- Want to make one? Run `npx deskflow-addon new my-widget` and see **[Making DeskFlow addons](ADDONS.md)**.
  Most addons are a single JSON file, and `npx deskflow-addon dev` reloads it on your desktop every time you save.

**Plays nicely with Windows**
- Stays under your apps, comes forward with <kbd>Win</kbd> + <kbd>D</kbd>.
- Works with Wallpaper Engine and survives Explorer restarts.
- Hides the native desktop icons while it runs and puts them back when it closes.
- Per-monitor DPI aware, single tray icon, starts with Windows if you want it to.
- Updates itself: DeskFlow checks for new versions and installs them with one click. Every update is
  **digitally signed**, and DeskFlow refuses to install anything that isn't signed by me.


## Install

1. Download **`DeskFlow-Setup-<version>.exe`** from the [latest release](https://github.com/Silverfox0338/DeskFlow-Releases/releases/latest).
2. Run it. It installs just for you — no administrator prompt.
   If your PC doesn't have the .NET 10 Desktop Runtime yet, the installer downloads it from Microsoft for you.
3. DeskFlow starts in your system tray (look for the blue tile icon near the clock — it may be under the **^** arrow).

Each release also includes a `.sha256` checksum and a `.sig` signature. DeskFlow checks both before it installs an update.

## How to use

### 1. First run
DeskFlow starts in your system tray with one panel showing your Desktop. Your normal desktop icons are
hidden while it runs (they come back when you exit). **Right-click the tray icon** for everything below;
**double-click it** to lock or unlock the layout.

### 2. Arrange your desktop
- Choose **Unlock layout** in the tray menu. Drag a panel or widget by its header and resize a panel from its
  corner. Things snap to the grid and line up with each other; hold <kbd>Alt</kbd> to place freely and press
  <kbd>Esc</kbd> to cancel a drag.
- Choose **Lock layout** when you're done, so nothing moves by accident.
- For pixel-perfect placement, click a widget (or a panel's header) and use the **arrow keys**: 1 pixel per press,
  or <kbd>Shift</kbd> + arrow to jump to the next grid line. The same keys work on Studio's map.
- Made a mistake? **Undo layout change** in the tray, or <kbd>Ctrl</kbd> + <kbd>Z</kbd> in Studio.
- For exact positions, open **Open Studio… → Design**. Click an item on the canvas or in **Layers**, then type its
  X / Y / W / H. Scroll on the canvas to zoom, drag empty space to pan, or use the zoom and monitor buttons in the toolbar.

### 3. Panels
- **Add panel…** in the tray creates a new panel. Right-click its empty space → **Panel → Edit source folders…**
  to choose which folders it shows (one panel can combine several).
- Right-click empty space for **New folder**, **Paste**, **Sort by** and **Icon size**.
- **Tabs**: right-click → **Tabs → Add tab…** to keep several folders in one panel (Desktop, Projects, Paperwork…).
- **Dock**: right-click → **Layout → Dock (compact row of icons)** turns a panel into a slim app bar.
- Files behave like real desktop icons: double-click, the full Windows right-click menu, drag in and out, <kbd>F2</kbd>
  to rename, <kbd>Del</kbd> for the Recycle Bin, and type to search.

### 4. Widgets
- **Add widget** in the tray, or browse them all in **Studio → Widgets**.
- Right-click a widget for its **Settings** (your city for the weather, the clock format and so on) and for
  **Background** to put your own photo behind just that widget.

### 5. Make it yours
- **Studio → Themes**: click any theme to use it. **Use my wallpaper** creates themes from your
  wallpaper's colours, including a Wallpaper Engine wallpaper: DeskFlow takes a snapshot of what it's showing.
- **Studio → Design → Editor** (in the inspector on the right): fine-tune colours, glass, borders, shadows, images, textures, fonts and spacing. Open one section at a
  time; the others show a short summary. Everything previews instantly and applies to your desktop as you go.
- **Style one panel differently**: select it on the canvas and click **Style it** (or right-click the panel →
  **Theme → Customize this panel…**). **Use global theme** puts it back.
- **Smart themes** (next to Editor): follow Windows light/dark mode, or switch between a day and a night theme on a schedule.
- **Share a look**: **Save as theme…**, then **Export pack…** gives you a `.deskflow-theme` file with its images
  included. Friends open it with **Import…** on the Themes page.

### 6. Keep it tidy automatically
**Studio → Auto-sort** moves new files into the right place for you, for example screenshots into
Pictures\Screenshots or installers into Downloads\Installers. Rules never overwrite a file.

### 7. Addons
- Double-click a `.deskflow-addon` file, or use **Studio → Addons → Install from file…**. DeskFlow shows what the
  addon is and what it's allowed to do before anything is installed.
- Click **Add to desktop** on its card, or pick it from the **Add** menu. Right-click the widget for its settings.
- Turn an addon off or remove it any time in **Studio → Addons**.

### 8. Handy extras
- <kbd>Win</kbd> + <kbd>D</kbd> brings the whole layer forward; click back into an app and it drops behind again.
- **Peek hotkey**: set one in **Studio → Design → Settings** to pop your panels and widgets above every window and back.
- **Monitor profiles** (Settings tab) remember a layout per monitor setup, so docking your laptop restores your
  two-screen arrangement by itself.
- **Export layout… / Import layout…** (Settings tab) moves your whole setup to another PC.

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
DeskFlow is free to download and use; see [LICENSE.md](LICENSE.md) for the full terms.

<div align="center">
<sub>Made with care by Silverfox0338</sub>
</div>
