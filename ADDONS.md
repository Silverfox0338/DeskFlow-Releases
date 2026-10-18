# Making DeskFlow addons

Addons add new widgets to DeskFlow. There are two kinds:

| | **Safe addon** | **Code plugin** |
|---|---|---|
| What it is | An `addon.json` file (layout + data), no code | A .NET DLL written in C# |
| What it can do | Show text, numbers, icons, images, progress bars and lists from approved data sources | Anything a program can do |
| Safety | Can't run programs or touch files; reads only from websites the user approved | Full access to the PC. DeskFlow shows a clear warning and asks again if the code changes |
| Best for | Almost everything: countdowns, prices, feeds, stats | Things that need real code |

Start with a safe addon: it's quicker to make, and people can install it without worrying.

Working examples are in [`addon-sdk/examples`](addon-sdk/examples): **Countdown**, **Crypto prices** (web
API), **Headlines** (RSS feed), **Disk space** (system info) and **Hello plugin** (C#).

All you need is [Node.js](https://nodejs.org). The `deskflow-addon` tool runs straight from npm:

```shell
npx deskflow-addon new my-widget        # start a safe addon (add --plugin for C#)
cd my-widget
npx deskflow-addon install              # pack it and open DeskFlow's install prompt
npx deskflow-addon validate             # check addon.json with DeskFlow's rules
npx deskflow-addon pack                 # build the .deskflow-addon to share
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

Try it with `npx deskflow-addon install`. It checks your addon, packs it and opens DeskFlow's install prompt.
Then use **Add to desktop**. To share it, run `npx deskflow-addon pack`. This creates
`com.yourname.hello-1.0.0.deskflow-addon`, which people install by double-clicking.

`validate` (and `pack`) catch mistakes before DeskFlow does: unknown elements, a source URL whose host isn't in
`permissions.web`, or `{{typos}}` that don't match a source.

**Tip:** while you work, edit `%AppData%\DeskFlow\addons\<your id>\addon.json` directly and turn the addon off
and on in Studio → Addons to reload it.

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
[`addon-sdk/examples/hello-plugin`](addon-sdk/examples/hello-plugin) for a complete project.

- **Build and package:** `npx deskflow-addon pack` builds it with `dotnet` (Release) and packs your DLLs. It never
  includes `DeskFlow.dll` or Windows SDK DLLs, because the app provides them. The project compiles against your
  installed DeskFlow; to use another copy, build once by hand with `-p:DeskFlowDir=…`, then pack with
  `--no-build`.
- **Theme:** use theme resources (`SetResourceReference(…, "TextBrush")`, `SubtleTextBrush`, `AccentBrush`,
  `UiFont`), so you follow the user's theme.
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
  replaces the old one and keeps the user's widgets and settings. Code plugins need a DeskFlow restart to load the
  new code.

## 9. Sharing

Share the `.deskflow-addon` file however you like. People install it by double-clicking it. Before anything is
installed, DeskFlow shows what your addon is and exactly what it's allowed to do.
