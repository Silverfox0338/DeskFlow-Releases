using System.Media;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using DeskFlow.Widgets;

namespace Pomodoro;

// The plugin tutorial (addon-sdk/PLUGIN-TUTORIAL.md) walks through this file step by step.

/// <summary>
/// A focus/break timer. Shows: building a view with theme resources, saving settings, a settings menu,
/// async work with cancellation, keeping time correctly while hidden, and cleaning up in Dispose.
/// </summary>
[Widget("pomodoro", "Pomodoro", Description = "Focus and break timer. Click it to start or pause.", Glyph = "")]
public sealed class PomodoroWidget : IWidget
{
    // ---- 1. The view: plain WPF, coloured with theme resources so it follows the user's theme. ----
    private readonly StackPanel _root = new() { MinWidth = 190, Background = Brushes.Transparent, Cursor = Cursors.Hand };
    private readonly TextBlock _phase = new() { FontSize = 11.5 };
    private readonly TextBlock _time = new() { FontSize = 40, FontWeight = FontWeights.Light };
    private readonly ColumnDefinition _done = new() { Width = new GridLength(0, GridUnitType.Star) };
    private readonly ColumnDefinition _left = new() { Width = new GridLength(1, GridUnitType.Star) };
    private readonly TextBlock _hint = new() { FontSize = 11.5, Margin = new Thickness(0, 6, 0, 0) };

    // ---- 2. State. ----
    private WidgetContext? _context;
    private bool _focus = true;              // focus or break
    private TimeSpan _remaining;
    private DateTime _endsAt;                // while running: when this phase ends (wall clock)
    private CancellationTokenSource? _run;   // cancels the running countdown
    private bool _visible = true;

    public FrameworkElement View => _root;

    public PomodoroWidget()
    {
        _phase.SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.SubtleText);
        _time.SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.Text);
        _time.SetResourceReference(TextBlock.FontFamilyProperty, ThemeKeys.Font);
        _hint.SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.SubtleText);

        var bar = new Grid { Height = 6, Margin = new Thickness(0, 4, 0, 0) };
        bar.ColumnDefinitions.Add(_done);
        bar.ColumnDefinitions.Add(_left);
        var track = new Border { CornerRadius = new CornerRadius(3) };
        track.SetResourceReference(Border.BackgroundProperty, ThemeKeys.Track);
        Grid.SetColumnSpan(track, 2);
        var fill = new Border { CornerRadius = new CornerRadius(3) };
        fill.SetResourceReference(Border.BackgroundProperty, ThemeKeys.Accent);
        bar.Children.Add(track);
        bar.Children.Add(fill);

        _root.Children.Add(_phase);
        _root.Children.Add(_time);
        _root.Children.Add(bar);
        _root.Children.Add(_hint);
        _root.MouseLeftButtonUp += (_, e) =>
        {
            Toggle();
            e.Handled = true;
        };
    }

    // ---- 3. Settings: strings in context.Settings.Options, saved with context.Save(). ----
    private int FocusMinutes => int.TryParse(_context?.Settings.Options.GetValueOrDefault("focus"), out int m) ? m : 25;
    private int BreakMinutes => int.TryParse(_context?.Settings.Options.GetValueOrDefault("break"), out int m) ? m : 5;
    private TimeSpan PhaseLength => TimeSpan.FromMinutes(_focus ? FocusMinutes : BreakMinutes);

    public void Initialize(WidgetContext context)
    {
        _context = context;
        _remaining = PhaseLength;
        Render();
    }

    public IEnumerable<Control> CreateSettingsMenuItems()
    {
        var focus = new MenuItem { Header = "Focus length" };
        foreach (int m in new[] { 15, 25, 50 }) focus.Items.Add(Choice($"{m} minutes", "focus", m, FocusMinutes));
        var pause = new MenuItem { Header = "Break length" };
        foreach (int m in new[] { 5, 10, 15 }) pause.Items.Add(Choice($"{m} minutes", "break", m, BreakMinutes));
        var reset = new MenuItem { Header = "Reset" };
        reset.Click += (_, _) => Reset();
        return new Control[] { focus, pause, reset };
    }

    private MenuItem Choice(string header, string key, int minutes, int current)
    {
        var item = new MenuItem { Header = header, IsCheckable = true, IsChecked = minutes == current };
        item.Click += (_, _) =>
        {
            _context!.Settings.Options[key] = minutes.ToString();
            _context.Save();
            Reset();
        };
        return item;
    }

    // ---- 4. Async work with cancellation. ----
    private void Toggle()
    {
        if (_run != null) Pause();
        else Start();
    }

    private void Start()
    {
        _run = new CancellationTokenSource();
        _endsAt = DateTime.UtcNow + _remaining;
        _ = CountDownAsync(_run.Token); // fire and forget: the method catches its own cancellation
        Render();
    }

    private void Pause()
    {
        _remaining = Remaining();
        Stop();
        Render();
    }

    private void Reset()
    {
        Stop();
        _focus = true;
        _remaining = PhaseLength;
        Render();
    }

    private void Stop()
    {
        _run?.Cancel();
        _run?.Dispose();
        _run = null;
    }

    // Measure against the wall clock instead of counting ticks: Task.Delay drifts, the clock doesn't.
    private TimeSpan Remaining() => _run == null ? _remaining : TimeSpan.FromSeconds(Math.Max(0, Math.Ceiling((_endsAt - DateTime.UtcNow).TotalSeconds)));

    private async Task CountDownAsync(CancellationToken ct)
    {
        try
        {
            // Started on the UI thread, so every await resumes on it: touching the view here is safe.
            while (Remaining() > TimeSpan.Zero)
            {
                await Task.Delay(250, ct);
                // Hidden (covered, or the PC is locked)? Keep the time, skip the repaint: repainting a
                // transparent desktop window costs CPU for nothing nobody sees.
                if (_visible) Render();
            }
            Stop();
            SystemSounds.Asterisk.Play();
            _focus = !_focus;
            _remaining = PhaseLength;
            Render();
        }
        catch (OperationCanceledException)
        {
            // Paused, reset or disposed.
        }
    }

    // ---- 5. Visibility: DeskFlow tells you when nobody can see the widget. ----
    public void OnVisibilityChanged(bool visible)
    {
        _visible = visible;
        if (visible) Render(); // catch up straight away
    }

    private void Render()
    {
        var left = Remaining();
        double done = 1 - left.TotalSeconds / Math.Max(1, PhaseLength.TotalSeconds);
        string phase = _focus ? "FOCUS" : "BREAK";
        string time = $"{(int)left.TotalMinutes:00}:{left.Seconds:00}";
        string hint = _run != null ? "Click to pause" : left == PhaseLength ? $"Click to start the {phase.ToLowerInvariant()}" : "Paused · click to continue";
        // Only touch what changed: an unchanged Text doesn't repaint the window.
        if (_phase.Text != phase) _phase.Text = phase;
        if (_time.Text != time) _time.Text = time;
        if (_hint.Text != hint) _hint.Text = hint;
        _done.Width = new GridLength(Math.Clamp(done, 0, 1), GridUnitType.Star);
        _left.Width = new GridLength(Math.Clamp(1 - done, 0, 1), GridUnitType.Star);
    }

    // ---- 6. Clean up: DeskFlow calls Dispose when the widget is removed, the addon is turned off or reloaded. ----
    public void Dispose() => Stop();
}
