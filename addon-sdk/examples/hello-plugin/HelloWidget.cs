using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using DeskFlow.Widgets;

namespace HelloPlugin;

/// <summary>
/// A minimal code plugin widget: a greeting and how long it has been on screen. Implement IWidget, add a
/// public parameterless constructor and a [Widget] attribute; DeskFlow finds it when the plugin loads.
/// </summary>
[Widget("hello", "Hello plugin", Description = "A tiny example widget written in C#.", Glyph = "")]
public sealed class HelloWidget : IWidget
{
    private readonly StackPanel _root = new() { MinWidth = 180 };
    private readonly TextBlock _uptime = new() { FontSize = 12 };
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    private readonly DateTime _started = DateTime.Now;
    private WidgetContext? _context;

    public FrameworkElement View => _root;

    public HelloWidget()
    {
        var title = new TextBlock { Text = "Hello from a plugin!", FontSize = 15, FontWeight = FontWeights.SemiBold };
        // Use DeskFlow's theme resources so the widget follows the user's theme.
        title.SetResourceReference(TextBlock.ForegroundProperty, "TextBrush");
        _uptime.SetResourceReference(TextBlock.ForegroundProperty, "SubtleTextBrush");
        _root.Children.Add(title);
        _root.Children.Add(_uptime);
        _timer.Tick += (_, _) => Update();
    }

    public void Initialize(WidgetContext context)
    {
        _context = context;
        Update();
        _timer.Start();
    }

    private void Update()
    {
        var on = DateTime.Now - _started;
        string name = _context?.Settings.Options.GetValueOrDefault("name") ?? "friend";
        _uptime.Text = $"Hi {name} · on screen for {(int)on.TotalMinutes} min {on.Seconds} s";
    }

    public IEnumerable<Control> CreateSettingsMenuItems()
    {
        var rename = new MenuItem { Header = "Say hi to Kuro" };
        rename.Click += (_, _) =>
        {
            if (_context == null) return;
            _context.Settings.Options["name"] = "Kuro";
            _context.Save();
            Update();
        };
        return new Control[] { rename };
    }

    // Pause while nobody can see the widget (DeskFlow calls this when it's covered or the PC is locked).
    public void OnVisibilityChanged(bool visible)
    {
        if (visible) { Update(); _timer.Start(); }
        else _timer.Stop();
    }

    public void Dispose() => _timer.Stop();
}
