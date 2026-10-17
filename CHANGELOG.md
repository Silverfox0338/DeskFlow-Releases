# Changelog

Every DeskFlow release and what changed. The newest release is at the top.

## v0.4.5

Studio's Design page is easier to work in, especially with many items or monitors.

- **Desktop map you can zoom**: scroll on the map to zoom in where you point, or use the − / + buttons,
  which zoom in on the selected item. Drag empty space to pan; **Fit** (or a double-click) shows
  everything again.
- **Bigger map**: the expand button gives the map the whole page width for laying out large or
  multi-monitor setups. Click it again to bring the style side back.
- **Clearer map**: small widgets are drawn on top of panels so they're never hidden, labels no longer
  show through each other, and monitor numbers sit in the corner out of the way.
- **Theme editor in collapsible sections**: Colours, Glass, Effects, Images & texture, Text and
  Layout open one at a time. Closed sections show a one-line summary of their settings, so the whole
  theme fits on screen without scrolling.
- **More room for each setting**: choice buttons are more compact (Border fits on one line), and the
  live preview stays in view while you scroll.

## v0.4.4

Pro theme overhaul. Studio's Layout and Themes pages are now a single **Design** workspace.

- **Design workspace**: arrange and style in one place.
  - The left side has the live desktop map and item list. **Style this panel** gives a selected
    panel its own theme.
  - The right side has four tabs: **Gallery**, **Editor**, **Smart** and **Setup** (grid, guides,
    peek hotkey, monitor profiles, layout import/export).
- **Theme editor** with a large live preview of a panel and a widget:
  - **Colours**: accent, glass tint, an optional second tint for **gradient glass** (with angle),
    and text colour.
  - **Glass**: opacity, corner radius, border style (**Solid, Gradient, Glow, None**), border width
    and strength.
  - **Effects**: shadow size, depth, opacity and colour; hover style (Fill/Outline); selection style
    (Fill/Outline/Underline).
  - **Images & texture**: a background image for panels and one for widgets, each with visibility,
    blur, darken and fit (Fill/Fit/Tile/Center). Six built-in textures (noise, paper, carbon, dots,
    lines, grid) with adjustable strength.
  - **Text**: font, title size, label size, label shadow for busy wallpapers, and widget scale.
  - **Layout**: density (Compact/Comfortable/Spacious) and header style (Standard/Bar/Minimal).
    The Minimal header shows search when you hover or press Ctrl+F.
- **Theme gallery**: large cards that render each theme for real (icons, selection style, glass
  and a widget), with category filters and search. The theme in use is highlighted.
- **8 new built-in themes** (17 in total): Aurora, Sunset, Neon, Paper, Carbon, Frosted,
  Minimal Light and Midnight Bar.
- **Match my wallpaper**: creates themes from the colours of your wallpaper, or of any image you
  choose. Text colours are checked for readability.
- **Smart themes**:
  - Follow Windows light/dark mode, or switch between a day and a night theme on a schedule.
  - Optionally use your Windows accent colour, which updates live when you change it.
- **Theme packs** (`.deskflow-theme`): share a theme together with its images.
  - Save a theme or export a pack from the editor, and import packs from the gallery. Older `.json`
    themes still import.
  - Imports are checked before anything is installed. Packs may contain only images (PNG, JPG, BMP
    or GIF; up to 15 MB each and 60 MB per pack), and anything unsafe is rejected.
- **Per-widget backgrounds**: right-click a widget → Background to put a photo behind just that
  widget, with visibility, blur and darken options.
- **Fixed:** a theme with its drop shadow turned off still showed a shadow.
- Studio keeps its own font when a theme uses a different one.
- **License 1.1**: states plainly that DeskFlow has no analytics or telemetry and that clipboard
  history stays on your PC, and covers sharing theme packs. The installer now shows it formatted.
- Your current look carries over exactly when you update.

## v0.4.3

Pro layout tools.

- **Monitor profiles**: DeskFlow remembers a layout for every monitor setup. Plug in or unplug a
  screen and the matching layout comes back automatically; a new setup starts its own. Manage them
  in Studio → Monitor profiles (apply, rename, forget, auto-switch on/off).
- **Peek hotkey** (off by default):
  - Choose a combination in Studio, e.g. Ctrl+Alt+Space.
  - Pressing it brings every panel and widget above all your windows. Press it again, press Esc,
    or click an app to send DeskFlow back.
  - Also available in the tray menu.
- **Undo / redo** for layout changes: moves, resizes, exact-position edits, aligning, rescuing and
  profile switches. Use Ctrl+Z / Ctrl+Y in Studio, or on any panel or widget while the layout is
  unlocked, or the Undo/Redo buttons or tray item.
- **Smart guides**: while dragging, a card snaps to other cards' edges and centres and to screen
  edges, with accent guide lines. Guides take priority over the grid; Alt still places freely.
- **Layout import/export**: save your panels, widgets, theme and auto-sort rules to a
  `.deskflow-layout` file and load it on another PC. Importing backs up your current settings first.
- **Fixed:** while peeking, pressing Esc to cancel a drag now cancels the drag instead of ending the
  peek.

## v0.4.2

Power-user panels.

- **Panel tabs**:
  - Give a panel several tabs, each with its own folders.
  - Add tabs from the **+** button or the panel menu; rename, reorder and remove them by
    right-clicking a tab.
  - Ctrl+Tab and Ctrl+Shift+Tab switch tabs. Drop files on a tab to move them into that tab's folder.
- **Dock mode**: switch any panel to a compact single row of icons, with names in tooltips. While the
  layout is unlocked, drag a dock anywhere on it to move it.
- **Auto-sort rules** (Studio → Auto-sort):
  - Automatically move new files that match a pattern, such as `Screenshot*.png` or `*.exe`, from a
    folder like the Desktop into a target folder.
  - Comes with templates for screenshots, installers, documents, images and archives.
  - A live "try a file name" tester, and a "Run on existing files now" button that confirms first.
  - Waits until downloads and saves have finished, and never overwrites a file (clashes get a
    "(2)" name).
- **Per-panel themes**: Studio's theme maker has an *Applies to* selector, so a single panel can have
  its own colours, opacity and corners, or go back to the global theme. Also available from a
  panel's menu: Theme → Customize this panel….

## v0.4.1

Five new widgets, plus a widget gallery.

- **Weather**:
  - Current conditions, "feels like", humidity, wind and a 3-day forecast.
  - The data comes from Open-Meteo (free, no account). Your approximate location is found once,
    or you can set a city.
  - °C or °F, refreshed every 30 minutes, and paused while hidden.
- **Calendar**: a month view with today highlighted, previous/next month, and optional ISO week
  numbers. It only wakes up at midnight.
- **Notes**: a sticky note that saves as you type, with a custom title, three sizes, three text
  sizes, and copy/clear.
- **Network & battery**:
  - Live download and upload speeds with a mini graph, and whether you're on Wi-Fi or Ethernet.
  - Battery level, charging state and time left. The battery part hides itself on desktops.
- **Clipboard history**:
  - Your last 20 copied snippets; click one to copy it again, and pin the ones you want to keep.
  - History stays in memory only (pinned items are saved).
  - Content that password managers mark as private is never recorded, and history can be paused.
- **Studio → Widgets**: a gallery with a description of every widget and one-click Add.
- Studio: the theme presets and colour swatches are crisp squares, and each preset shows its glass
  tint next to its accent.

## v0.4.0

The first public release.

- **Automatic updates**:
  - DeskFlow checks for a new version a minute after it starts, then once a day.
  - Shows a tray notification and an *Install DeskFlow x.y.z…* tray item when an update exists.
  - Studio → About shows what's new, with an **Install now** button.
  - Downloads are verified before installing. The update installs silently and DeskFlow restarts
    itself.
  - Can be turned off in Studio → About (*Check for updates automatically*).
- **License**: Copyright © 2026 Silverfox0338, all rights reserved; free to use. The installer
  shows the license agreement.

## Before the public release

Highlights from the earlier private versions (v0.1 – v0.3), all included in v0.4.0:

- **The desktop layer**: glass panels that hold your real desktop files, floating above your
  wallpaper (Wallpaper Engine keeps animating) and below your apps. Win+D brings them up, and they
  re-attach by themselves if Explorer restarts.
- **Icon panels**: several folders per panel, live updates when files change, real Explorer
  right-click menus (Send to, Open with), rename, Recycle Bin delete, drag in and out, copy, cut
  and paste, instant search, sorting, four icon sizes, collapse, and keyboard navigation.
- **Widgets**: Clock, System stats, Media (now playing with controls) and Quick launch.
- **DeskFlow Studio**: a live desktop map with exact positions, grid snapping with an optional grid
  overlay, nine theme presets with a theme maker, and performance settings.
- **Pause when hidden**, like Wallpaper Engine: widgets stop updating while apps cover them or the
  PC is locked, so DeskFlow uses almost no CPU while you work.
- **Live snapping**: panels and widgets snap while you drag or resize them. Hold Alt to place
  freely, or press Esc to cancel.
- A dark tray menu with large icons, smooth collapse/expand and fade-in animations, and screen
  reader support for panel items.
- Your native desktop icons are hidden while DeskFlow runs and always come back when it exits.
- **Installer**: per-user with no admin prompt. It downloads the .NET 10 Desktop Runtime from
  Microsoft only if you don't have it, and offers autostart and a desktop shortcut.
