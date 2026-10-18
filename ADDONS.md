# Making DeskFlow addons

Addons add new widgets to DeskFlow. There are two kinds:

| | **Safe addon** | **Code plugin** |
|---|---|---|
| What it is | An `addon.json` file (layout + data), no code | A .NET DLL written in C# |
| What it can do | Show text, numbers, icons, images, progress bars, charts, lists and buttons from approved data sources, with calculations | Anything a program can do |
| Safety | Can't run programs or touch files; reads only from websites the user approved | Full access to the PC. DeskFlow shows a clear warning and asks again if the code changes |
| Best for | Almost everything: countdowns, prices, feeds, stats | Things that need real code |

Start with a safe addon: it's quicker to make, and people can install it without worrying.

Working examples are in [`addon-sdk/examples`](addon-sdk/examples):

| Example | Shows |
|---|---|
| **Countdown** | the basics: a time source, text settings, date filters |
| **Sticky note** | every kind of setting (text, choice, number, toggle, file) and a file source |
| **Status board** | four sources in one widget, a grid, progress bars, `visible` |
| **Crypto prices** | a web API with an approved host |
| **Headlines** | an RSS feed and a list |
| **Disk space** | system info |
| **Hello plugin** | the smallest C# plugin |
| **Analog clock** | a C# plugin with animation, drawn with theme colours |
| **Pomodoro** | a C# plugin with settings, async work and cleanup: the [plugin tutorial](addon-sdk/PLUGIN-TUTORIAL.md) |
| **Moon phase** | expressions and `computed` (trigonometry, dates), a ring chart: no code, no internet |
| **Water tracker** | buttons that change settings, a ring chart |
| **CPU graph** | the history source with line and bar charts |
| **Now playing** | the media source with media buttons |

All you need is [Node.js](https://nodejs.org). The `deskflow-addon` tool runs straight from npm:

```shell
npx deskflow-addon new my-widget        # start a safe addon (add --plugin for C#)
cd my-widget
npx deskflow-addon dev                  # live: DeskFlow reloads it every time you save
npx deskflow-addon validate             # check addon.json with DeskFlow's rules
npx deskflow-addon pack                 # build the .deskflow-addon to share
npx deskflow-addon install              # pack it and open DeskFlow's install prompt
npx deskflow-addon doctor               # something not working? checks Node, .NET and DeskFlow
```

---

## 1. Your first safe addon

Run `npx deskflow-addon new hello`, or make a folder with an `addon.json` yourself:

```json
{
  "id": "com.yourname.hello",
  "name": "Hello",
  "version": "1.0.0",
  "author": "Your name",
  "description": "Says hello and shows the time.",
  "glyph": "E8E1",
  "minDeskFlow": "0.6.0",
  "kind": "widget",
  "widget": {
    "width": 220,
    "sources": { "now": { "type": "time", "every": 1 } },
    "layout": {
      "type": "stack",
      "children": [
        { "type": "text", "style": "caption", "text": "HELLO" },
        { "type": "text", "style": "display", "text": "{{now.time}}" }
      ]
    }
  }
}
```

Try it with `npx deskflow-addon dev`. DeskFlow shows the widget straight from your folder, and every time you save
`addon.json` it updates on your desktop (see [Developer mode](#9-developer-mode)). Use **Add to desktop** in
Studio → Addons if it isn't on your desktop yet. To share it, run `npx deskflow-addon pack`. This creates
`com.yourname.hello-1.0.0.deskflow-addon`, which people install by double-clicking.

`validate` (and `pack`) catch mistakes before DeskFlow does: unknown elements, a source URL whose host isn't in
`permissions.web`, `{{typos}}` that don't match a source, unclosed `{{`, unknown filters, images that don't exist,
and plugin projects that would copy `DeskFlow.dll`.

**Autocomplete:** add `"$schema": "https://raw.githubusercontent.com/Silverfox0338/DeskFlow-Releases/main/addon-sdk/addon.schema.json"`
to `addon.json` (`new` does it for you). VS Code and other editors then complete every field and element, explain
it when you hover, and underline mistakes as you type.


## 2. The manifest

| Field | Required | Notes |
|---|---|---|
| `id` | yes | 3–64 lowercase letters, digits, dots or dashes. Keep it the same across versions, because installing a newer version replaces the old one. |
| `name` | yes | Up to 60 characters. |
| `version` | yes | Like `1.2.0`. |
| `author`, `description` | no | Shown on the install prompt and in Studio. |
| `glyph` | no | A [Segoe Fluent Icons](https://learn.microsoft.com/windows/apps/design/style/segoe-fluent-icons-font) code, e.g. `"E8E1"`. |
| `minDeskFlow` | no | The lowest DeskFlow version your addon works with (default `0.6.0`). |
| `kind` | yes | `"widget"` (safe) or `"plugin"` (code). |
| `permissions.web` | no | The website hosts your addon reads from, e.g. `["api.coingecko.com"]`. Users approve them when they install. |
| `settings` | no | Options the user can change (see below). |
| `widget` | safe addons | `width` (80–640), `sources`, `layout`. |
| `assembly` | plugins | Your DLL's file name, e.g. `"MyPlugin.dll"`. |

## 3. Data sources

Name your sources in `widget.sources`, then use their values in the layout as `{{name.field}}`.
`every` is the refresh interval in seconds. Every source has a minimum interval, and all of them pause while
the widget is hidden.

| Type | Fields | Minimum `every` |
|---|---|---|
| `time` | `time`, `date`, `longDate`, `hour`, `minute`, `second`, `day`, `month`, `year`, `weekday`, `monthName`, `iso`, `unix` | 1 |
| `system` | `cpu`, `ram`, `disk` (0–1), `ramUsed`, `ramTotal`, `diskFree`, `diskTotal` (bytes) | 2 |
| `battery` | `present`, `percent` (0–1), `charging`, `minutesLeft` | 10 |
| `network` | `online`, `name`, `down`, `up` (bytes per second) | 2 |
| `media` | `playing`, `title`, `artist`, `album` | 2 |
| `web` | The JSON your `url` returns. HTTPS only, approved hosts only, up to 1 MB | 60 |
| `rss` | `title`, `items[]` with `title`, `link`, `date`, `summary`. `count` sets how many (1–20). RSS or Atom | 300 |
| `file` | `text`, `lines[]`, `name`, `modified` from a file **the user picks** in a `file` setting (`"setting": "key"`) | 5 |
| `history` | The last values of another value, for charts: `values[]` (oldest first), `last`, `min`, `max`, `avg`, `count`. Set `of` (e.g. `"sys.cpu"`) and `size` (2–240, default 30). 0.6.4+ | 1 |

```json
"sources": {
  "price": { "type": "web", "every": 300, "url": "https://api.example.com/price?coin={{settings.coin}}" },
  "news":  { "type": "rss", "url": "https://example.com/feed.xml", "count": 5, "every": 900 }
}
```

If a refresh fails, the widget keeps the last values and shows a small orange dot.

## 4. Templates

Templates put values into text: `{{source.path | filter:arg | filter}}`.

- **Paths:** `price.bitcoin.usd`, `news.items[0].title`, `settings.city`, and `item.title` (inside lists).
- **Missing values:** unknown paths become empty text, so `{{x | default:–}}` gives a fallback.

| Filter | Example | Result |
|---|---|---|
| `number:N` | `{{p | number:2}}` | `1,234.57` |
| `round` | `{{p | round}}` | `1235` |
| `percent:N` | `{{sys.cpu | percent}}` | `42%` (0–1 → %) |
| `bytes` | `{{sys.diskFree | bytes}}` | `120.4 GB` |
| `upper`, `lower` | `{{settings.title | upper}}` | `NEW YEAR` |
| `trim:N` | `{{item.title | trim:40}}` | Shortened with … |
| `default:x` | `{{p | default:n/a}}` | Used when empty |
| `date:FORMAT` | `{{item.date | date:ddd HH:mm}}` | [.NET date format](https://learn.microsoft.com/dotnet/standard/base-types/custom-date-and-time-format-strings) |
| `until`, `ago` | `{{item.date | ago}}` | `5 min ago` |
| `days` | `{{settings.date | days}}` | Whole days until a date |

Dates can be ISO strings (`2026-12-25`), common date text, or Unix time.

### Expressions (DeskFlow 0.6.4+)

Start a placeholder with `=` to calculate instead of just looking a value up. Filters still work after it:

```json
{ "type": "text", "text": "{{= sys.cpu > 0.8 ? 'Busy' : 'Fine'}}" }
{ "type": "text", "text": "{{= price.bitcoin.usd * settings.amount | number:2}}" }
{ "type": "progress", "value": "{{= settings.done / settings.goal}}" }
```

| | |
|---|---|
| **Values** | numbers, `'text'` or `"text"`, `true`, `false`, `null`, and paths like `sys.cpu` or `news.items[0].title` |
| **Operators** | `+ - * / %`, `== != < <= > >=`, `&& \|\| !`, `test ? a : b`, parentheses. `+` joins text when either side is text. Numeric text (like settings) compares as numbers |
| **Maths** | `min max abs round(x, digits) floor ceil sqrt pow sin cos tan pi() clamp(x, lo, hi) mod(a, b)` |
| **Dates** (Unix seconds, which the date filters understand) | `now() today() date(text) addDays(d, n) addHours(d, n) daysBetween(a, b) year month day hour minute weekday` (Monday = 1) |
| **Text** | `concat(…) len upper lower trim pad(x, width, char) substr(s, start, length) contains startsWith format(x, digits) text number` |
| **Choosing** | `pick(i, a, b, c…)` gives the i-th value (from 0) |

Expressions can't loop, store anything or call anything outside this list, and anything invalid (dividing by zero,
a missing value) just gives empty text. Mistakes are reported on the Developer page and by `validate`.

### Computed values (DeskFlow 0.6.4+)

For values you use more than once, name them in `widget.computed` and use them as `{{calc.name}}`. They're worked
out in order every time your data changes, so each one can use the ones before it:

```json
"computed": {
  "phase": "mod((now.unix - 947182440) / 2551442.861, 1)",
  "lit": "(1 - cos(2 * pi() * calc.phase)) / 2",
  "name": "pick(round(calc.phase * 8) % 8, 'New moon', 'Waxing crescent', 'First quarter', …)"
}
```

Values are recalculated when a source refreshes, so a widget that shows `now()` needs a `time` source to tick.

## 5. Layout elements

Every element has a `type` and can also have:

- `align`: `left`, `center`, `right` or `stretch`
- `margin`: a number
- `visible`: a template; hidden when it's empty, `false` or `0`

| Type | Properties |
|---|---|
| `stack` | `children`, `orientation` (`vertical`/`horizontal`), `gap` |
| `grid` | `children`, `columns` (1–8), `gap` |
| `text` | `text`, `style` (`display`, `title`, `body`, `caption`), `size`, `bold`, `wrap`, `maxLines`, `color` |
| `icon` | `glyph` (Fluent code or template), `size`, `color` |
| `image` | `src`: a file in your addon (`images/logo.png`) or an `https://` URL on an approved host. Also `width`, `height`, `fit` (`fit`/`fill`), `radius` |
| `progress` | `value` (template or number), `max` (default 1), `height`, `color` |
| `list` | `items` (a path to an array, e.g. `news.items`), `item` (the layout for each one, using `{{item.…}}`), `max` (1–20), `gap` |
| `link` | `text`, `url`: opens an `https://` page in the browser when clicked |
| `spacer` | `height`, `width` |
| `divider` | — |
| `chart` | `kind`: `sparkline` (default), `line` (with a soft fill), `bar`, or `ring` (one value, like a donut). `values`: the path of a list of numbers (e.g. `cpu.values` from a history source); a ring takes `value` and `label` instead. Also `min`, `max` (the scale; automatic if left out), `width`, `height`, `color`. 0.6.4+ |
| `button` | `text` and/or `glyph`, `action` (see below), `tooltip`. 0.6.4+ |

### Buttons (DeskFlow 0.6.4+)

| `action` | What it does | Also needs |
|---|---|---|
| `open` | Opens an `https://` page in the browser | `url` |
| `refresh` | Refreshes every source now | — |
| `setSetting` | Sets one of your settings | `setting`, `value` (a template) |
| `cycleSetting` | Flips a toggle, or moves a choice to its next option | `setting` |
| `stepSetting` | Adds `step` (default 1, can be negative) to a number setting, within `min`/`max` | `setting` |
| `copy` | Copies text to the clipboard | `value` (a template) |
| `media.playPause`, `media.next`, `media.previous` | Controls what's playing | — |

Buttons stay inside the safe-addon rules: they can't run programs, write files, pick files (a button can't change
a `file` setting) or reach a website the user didn't approve. Buttons are real buttons, so keyboards and screen
readers can use them.

**Colours** come from the user's theme: set `color` to `normal`, `subtle` or `accent`. Fonts, glass, borders and
shadows follow the theme automatically, so your widget fits any desktop.

There are limits: 300 elements, 12 levels of nesting and 10 sources.

## 6. Settings

```json
"settings": [
  { "key": "city",  "label": "City", "type": "text", "default": "London" },
  { "key": "unit",  "label": "Units", "type": "choice", "options": ["metric", "imperial"], "default": "metric" },
  { "key": "count", "label": "How many", "type": "number", "default": "5" },
  { "key": "large", "label": "Big text", "type": "toggle", "default": "false" },
  { "key": "notes", "label": "Notes file", "type": "file" }
]
```

Settings appear in the widget's right-click **Settings** menu. Use them as `{{settings.key}}` in text and in source
URLs. A `file` setting lets the user pick a file for a `file` source; addons can never choose paths themselves.

## 7. Code plugins

A plugin is a .NET 10 class library that references `DeskFlow.dll` and implements `IWidget`:

```csharp
[Widget("hello", "Hello plugin", Description = "A tiny example widget.", Glyph = "")]
public sealed class HelloWidget : IWidget
{
    public FrameworkElement View { get; } = new TextBlock { Text = "Hello!" };
    public void Initialize(WidgetContext context) { }          // context.Settings.Options + context.Save()
    public IEnumerable<Control> CreateSettingsMenuItems() => Array.Empty<Control>();
    public void OnVisibilityChanged(bool visible) { }          // pause timers while hidden
    public void Dispose() { }
}
```

Start one with `npx deskflow-addon new my-plugin --plugin`, or see
[`addon-sdk/examples/hello-plugin`](addon-sdk/examples/hello-plugin) for a complete project. Run
`npx deskflow-addon dev` in it: every save rebuilds the plugin and DeskFlow swaps in the new code, no restart needed.

- **Tutorial:** [PLUGIN-TUTORIAL.md](addon-sdk/PLUGIN-TUTORIAL.md) builds the Pomodoro example step by step: theme,
  settings, menus, timers, async work with cancellation, pausing while hidden and cleanup.
- **The SDK:** new plugin projects compile against `lib\DeskFlow.dll`, a small reference-only DLL with just the
  plugin API and its documentation (IntelliSense). You don't need DeskFlow installed to build, and you can only use
  the stable public API. `npx deskflow-addon new --plugin` copies it in; it's also in the npm package under `sdk/`.
- **Build and package:** `npx deskflow-addon pack` builds it with `dotnet` (Release) and packs your DLLs. It never
  includes `DeskFlow.dll` or Windows SDK DLLs, because the app provides them.
- **Theme:** use theme resources via `ThemeKeys` (`SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.Text)`,
  `ThemeKeys.SubtleText`, `ThemeKeys.Accent`, `ThemeKeys.Font`, …), so you follow the user's theme.
- **Hidden widgets:** pause timers in `OnVisibilityChanged(false)`. DeskFlow tells you when the widget is covered
  or the PC is locked.
- **Errors:** if your widget throws, DeskFlow shows "stopped working" in its place instead of crashing.
- **Crashes:** if DeskFlow crashes while plugins load, plugins are turned off on the next start (safe mode).
- **Updates:** changing your DLL after someone installed it means they're asked to trust it again, so ship updates
  as a new `.deskflow-addon`.

## 8. DeskFlow updates

Installed addons survive DeskFlow updates. They live in `%AppData%\DeskFlow\addons`, which updates never touch.
Their on/off state, approved sites, plugin trust, and the widgets' positions and settings all stay as they were.

- **Safe addons** keep working: DeskFlow keeps supporting every existing `addon.json` field, element, source and
  filter. New versions only add things.
- **Code plugins** built against an older DeskFlow keep loading on newer versions. The plugin API (`IWidget`,
  `WidgetContext`, `WidgetAttribute`, theme resource names) only grows; nothing is renamed or removed.
- **`minDeskFlow`** stops an addon from installing on a DeskFlow that's too old for it. Set it to the version you
  built and tested with.
- If an update ever did break a plugin, DeskFlow shows "couldn't load" or "stopped working" for that addon instead
  of crashing, and the rest of your desktop keeps working.
- **Updating your addon:** ship a new `.deskflow-addon` with the same `id` and a higher `version`. Installing it
  shows the user what changes, replaces the old one and keeps the user's widgets and settings. Code plugins need a
  DeskFlow restart to load the new code. To deliver updates automatically, see the next section.

## 8a. Addon updates and signing (DeskFlow 0.6.5+)

**Offer updates.** Add an update source to `addon.json`, pointing at a small `latest.json` on your website:

```json
"updates": { "url": "https://example.com/my-addon/latest.json" }
```

`npx deskflow-addon pack` then writes `latest.json` next to your package:

```json
{ "version": "1.1.0", "download": "https://example.com/my-addon/com.you.my-addon-1.1.0.deskflow-addon",
  "changelog": "What's new…", "minDeskFlow": "0.6.4" }
```

Upload both (`--changelog "…"` fills in the changelog). The user sees your update host on the install prompt.
DeskFlow only checks it when they press **Check for updates** in Studio → Addons, or once a day if they turn that
on; it never installs anything by itself.

**Sign your releases (recommended).** Make a key once, put its public half in `addon.json`, and sign every package:

```shell
npx deskflow-addon keygen                       # creates deskflow-addon-key.pem, prints "publicKey": "…"
npx deskflow-addon pack --sign deskflow-addon-key.pem
```

Upload the `.sig` file next to the package. Once someone installed your addon with a `publicKey`, DeskFlow only
accepts updates signed with that key, whether they come from your update source or as a file, so nobody else can
publish an update in your name. The signature covers the id, the version and the file, so an old version can't be
passed off as a new one. **Keep the key file secret and backed up:** without it you can't sign updates, and people
would have to remove and reinstall your addon.

**What users see.** Every update opens a review first: the version, your changelog and exactly what changes (new or
dropped websites, a switch to a code plugin, changed plugin code that has to be trusted again) and whether the
signature checked out. DeskFlow keeps the previous two versions, and **Restore previous** on the addon's card puts one
back, with what the user had approved for it.

## 9. Developer mode

`npx deskflow-addon dev` (DeskFlow 0.6.1 or newer) starts a live session:

- **Your folder is linked, not installed.** DeskFlow loads the addon straight from your project folder. The first
  time, DeskFlow asks to turn on **developer mode**, and shows the usual prompt for web sites and plugin code.
- **It opens in the previewer** (0.6.2), a normal window instead of your desktop. Try it with any theme, on your
  wallpaper or a light or dark background, at different widths. **Hidden** tells the widget it's covered (check that
  it pauses), **Simulate offline** makes web and RSS sources fail, and **Simulate error** shows the failure card.
  **Add to desktop** puts it on your real desktop. Use `--desktop` to skip the previewer.
- **Safe addons reload when you save** `addon.json` or anything in `images/`, usually in under half a second. If
  the file is broken, the last working version keeps running and the error is shown.
- **Plugins rebuild when you save** a `.cs`, `.xaml` or `.csproj` file. DeskFlow loads the new build without a
  restart. Compiler errors are printed in your terminal and the last working build keeps running. Each reload keeps
  the old code in memory until DeskFlow restarts (a few KB per reload).
- **Your terminal shows what happens inside DeskFlow**: errors, a `{{typo}}` that doesn't match a source, a web
  request to a site that isn't in `permissions.web`, a failed download (with the HTTP status), and exceptions from
  plugins with their stack trace.
- **Ctrl+C** unlinks the folder (`--keep` leaves it linked). Your widgets' positions and settings are kept. The
  folder itself is never changed or deleted.

Studio's **Developer** page (visible in developer mode) shows the same for every addon, installed or linked: its
events, how long each data source takes and how often it fails, and how often it reloaded. You can link a folder
there too (**Link a folder…**), preview it, reload it, approve new sites or copy a report. With developer mode on,
an addon that fails shows a **Details** link that opens this page. The page also has:

- **Log**: DeskFlow's own log, live, with filters and search.
- **Tools → Sandbox**: a second, throwaway DeskFlow with a copy of your addons, linked folders and theme, plus one of
  each addon widget. Your own desktop hides while it runs and comes back when it closes. It's a separate program, so
  a plugin that crashes it can't take your desktop down. `npx deskflow-addon dev --sandbox` starts one too.
- **Tools → Performance overlay**: DeskFlow's CPU, memory and window counts, live, in a small window on top.
- **Tools → Copy debug info**: versions, monitors and scaling, addons and recent log lines for a bug report.

In Studio → Design, developer mode adds a **Debug** tab to the inspector: the selected panel's or widget's settings
and the theme values it actually sees.

Linked plugins only run while developer mode is on: turn it off in Studio → Addons and they stop.

## 10. Sharing

Share the `.deskflow-addon` file however you like. People install it by double-clicking it. Before anything is
installed, DeskFlow shows what your addon is and exactly what it's allowed to do.
