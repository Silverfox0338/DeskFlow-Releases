# Writing a DeskFlow code plugin

This tutorial builds the **Pomodoro** example ([`examples/pomodoro`](examples/pomodoro)) step by step: a focus and
break timer you click to start or pause. It covers everything most plugins need: theming, settings, a settings
menu, timers and async work, pausing while hidden, and cleaning up.

> **Do you need a plugin?** A safe addon (just `addon.json`) can show text, numbers, progress bars, lists and images
> from the time, system stats, web APIs and RSS feeds, and people can install it without worrying. Write a plugin
> only when you need real code. Plugins run with full access to the user's PC, and DeskFlow warns them first.

## 1. Set up

You need [Node.js](https://nodejs.org) and the [.NET 10 SDK](https://dot.net).

```shell
npx deskflow-addon doctor               # checks Node, .NET, DeskFlow and developer mode
npx deskflow-addon new pomodoro --plugin
cd pomodoro
npx deskflow-addon dev                  # build, link, open the previewer, rebuild on every save
```

The project compiles against `lib\DeskFlow.dll`, the **plugin SDK**: a small reference-only DLL with just the
plugin API (`IWidget`, `WidgetContext`, `WidgetAttribute`, `WidgetSettings`, `ThemeKeys`) and its documentation, so
your editor shows IntelliSense for every member. DeskFlow supplies the real `DeskFlow.dll` when your plugin runs,
which is why the reference has `<Private>false</Private>`: never ship a copy of it.

## 2. The widget class

A widget is a class that implements `IWidget`, has a public parameterless constructor and a `[Widget]` attribute.
DeskFlow finds every such class in your DLL.

```csharp
[Widget("pomodoro", "Pomodoro", Description = "Focus and break timer. Click it to start or pause.", Glyph = "")]
public sealed class PomodoroWidget : IWidget
{
    public FrameworkElement View => _root;
    public void Initialize(WidgetContext context) { … }
    public IEnumerable<Control> CreateSettingsMenuItems() { … }
    public void OnVisibilityChanged(bool visible) { … }
    public void Dispose() { … }
}
```

DeskFlow calls them in this order:

1. **Constructor**: build your view. Don't start timers yet.
2. **`Initialize(context)`**: you now have your settings (`context.Settings`) and can start working.
3. **`OnVisibilityChanged(false/true)`**: whenever the widget gets covered by an app or the PC is locked, and when
   it's visible again.
4. **`CreateSettingsMenuItems()`**: each time the user opens the widget's right-click menu.
5. **`Dispose()`**: when the widget is removed, the plugin is turned off, or a new build replaces it.

## 3. Follow the theme

Never hard-code colours or fonts. Point your elements at theme resources with `SetResourceReference` and
`ThemeKeys`, and your widget matches every theme (including a panel's own theme) and updates instantly when the user
changes it:

```csharp
_time.SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.Text);
_time.SetResourceReference(TextBlock.FontFamilyProperty, ThemeKeys.Font);
fill.SetResourceReference(Border.BackgroundProperty, ThemeKeys.Accent);
```

`ThemeKeys` has `Text`, `SubtleText`, `Accent`, `AccentSoft`, `Track`, `Hover`, `InputBackground`, `Font`,
`IconFont`, `TitleFontSize` and `LabelFontSize`. DeskFlow draws the glass card around your view and applies the
theme's widget scale, so don't add your own background or scaling.

## 4. Settings

Each widget instance has its own settings. Store strings in `context.Settings.Options` and call `context.Save()`:

```csharp
private int FocusMinutes => int.TryParse(_context?.Settings.Options.GetValueOrDefault("focus"), out int m) ? m : 25;

_context.Settings.Options["focus"] = "50";
_context.Save();
```

`GetBool`/`SetBool` help with on/off values. Settings are saved with the user's layout, and they survive DeskFlow
and plugin updates, so keep reading old values and give new ones a default.

Offer settings in the widget's right-click menu by returning menu items:

```csharp
public IEnumerable<Control> CreateSettingsMenuItems()
{
    var reset = new MenuItem { Header = "Reset" };
    reset.Click += (_, _) => Reset();
    return new Control[] { focusMenu, breakMenu, reset };
}
```

## 5. Timers and async work

DeskFlow calls you on the UI thread, so an `async` method you start there resumes on it after every `await`, and
can update the view directly. Give long-running work a `CancellationToken` so you can stop it:

```csharp
private void Start()
{
    _run = new CancellationTokenSource();
    _endsAt = DateTime.UtcNow + _remaining;
    _ = CountDownAsync(_run.Token);
}

private async Task CountDownAsync(CancellationToken ct)
{
    try
    {
        while (Remaining() > TimeSpan.Zero)
        {
            await Task.Delay(250, ct);
            if (_visible) Render();
        }
        …
    }
    catch (OperationCanceledException)
    {
        // Paused, reset or disposed.
    }
}
```

Two habits worth copying:

- **Measure time against the clock** (`_endsAt - DateTime.UtcNow`) instead of counting ticks; `Task.Delay` and
  timers drift.
- **Catch your own exceptions** in fire-and-forget tasks. (If something does escape from a DeskFlow call, DeskFlow
  shows "stopped working" in your widget's place instead of crashing.)

For network calls, use `HttpClient` with the same token and a timeout, and remember your plugin runs on the user's
PC: only talk to services you'd be happy to explain to them.

## 6. Be cheap while nobody's looking

Desktop widgets live in transparent windows, and every repaint costs CPU. DeskFlow tells you when your widget is
hidden:

```csharp
public void OnVisibilityChanged(bool visible)
{
    _visible = visible;
    if (visible) Render(); // catch up straight away
}
```

A clock or a stats widget should **stop its timer** while hidden (see the Analog clock example). A countdown has to
keep the time, so Pomodoro keeps counting but **skips the repaint**. Also only set `TextBlock.Text` when the text
actually changed: an unchanged value doesn't repaint.

## 7. Clean up

`Dispose` runs when the widget goes away, including every time a dev reload swaps in your new build. Stop timers,
cancel tasks and unsubscribe from events there:

```csharp
public void Dispose() => Stop(); // cancels the countdown
```

A plugin that forgets to clean up keeps running in the background after the user removed it.

## 8. Develop and test

- **`npx deskflow-addon dev`** rebuilds on every save and swaps in the new build without restarting DeskFlow.
  Compiler errors show up in your terminal; the last working build keeps running.
- **The previewer** opens with it: try light, dark and wallpaper backgrounds, different themes and widths, and
  **Hidden** to check that your widget pauses.
- **Studio → Developer** shows your plugin's events, including exceptions with their stack trace (also via the
  **Details** link on a failure card), DeskFlow's live log, and a performance overlay.
- **Tools → Sandbox** runs a throwaway copy of DeskFlow, so a plugin that crashes doesn't take your desktop with it.

## 9. Ship it

```shell
npx deskflow-addon validate      # checks addon.json and your project
npx deskflow-addon pack          # builds Release and packs com.you.pomodoro-1.0.0.deskflow-addon
```

People install the file by double-clicking it. Because it's a plugin, DeskFlow shows a clear warning and the code's
fingerprint, and asks again whenever the code changes. To update your plugin, keep the same `id`, raise `version`
and ship a new file.

**Compatibility:** the plugin API only ever grows: nothing in it is renamed or removed, so a plugin built today
keeps loading on newer DeskFlow versions. Set `minDeskFlow` in `addon.json` to the version you built and tested
with, so older versions refuse it cleanly instead of failing later.
