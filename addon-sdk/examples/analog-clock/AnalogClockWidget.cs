using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Windows.Threading;
using DeskFlow.Widgets;

namespace AnalogClock;

/// <summary>
/// An animated widget: the second hand eases to each new second with a WPF animation. Everything is drawn with
/// theme resources (ThemeKeys), so the clock matches any theme. The timer only runs while the widget is visible.
/// </summary>
[Widget("analog-clock", "Analog clock", Description = "A smooth analog clock in your theme's colours.", Glyph = "")]
public sealed class AnalogClockWidget : IWidget
{
    private const double Size = 150, Center = Size / 2;

    private readonly Canvas _face = new() { Width = Size, Height = Size };
    private readonly RotateTransform _hour = new(0, Center, Center);
    private readonly RotateTransform _minute = new(0, Center, Center);
    private readonly RotateTransform _second = new(0, Center, Center);
    private readonly Line _secondHand;
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    private WidgetContext? _context;
    private double _secondAngle = -1;

    public FrameworkElement View => _face;

    public AnalogClockWidget()
    {
        var ring = new Ellipse { Width = Size, Height = Size, StrokeThickness = 2 };
        ring.SetResourceReference(Shape.StrokeProperty, ThemeKeys.Track);
        _face.Children.Add(ring);

        // Twelve ticks; the quarter hours are longer and brighter.
        for (int i = 0; i < 12; i++)
        {
            bool quarter = i % 3 == 0;
            var tick = new Line
            {
                X1 = Center, Y1 = 6, X2 = Center, Y2 = quarter ? 18 : 13,
                StrokeThickness = quarter ? 2.5 : 1.5, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round,
                RenderTransform = new RotateTransform(i * 30, Center, Center),
            };
            tick.SetResourceReference(Shape.StrokeProperty, quarter ? ThemeKeys.Text : ThemeKeys.SubtleText);
            _face.Children.Add(tick);
        }

        _face.Children.Add(Hand(_hour, 38, 5, ThemeKeys.Text));
        _face.Children.Add(Hand(_minute, 56, 3.5, ThemeKeys.Text));
        _secondHand = Hand(_second, 62, 1.5, ThemeKeys.Accent);
        _face.Children.Add(_secondHand);

        var dot = new Ellipse { Width = 8, Height = 8 };
        dot.SetResourceReference(Shape.FillProperty, ThemeKeys.Accent);
        Canvas.SetLeft(dot, Center - 4);
        Canvas.SetTop(dot, Center - 4);
        _face.Children.Add(dot);

        _timer.Tick += (_, _) => Update(animate: Smooth);
    }

    private static Line Hand(RotateTransform rotation, double length, double thickness, string brushKey)
    {
        var hand = new Line
        {
            X1 = Center, Y1 = Center + 10, X2 = Center, Y2 = Center - length,
            StrokeThickness = thickness, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round,
            RenderTransform = rotation,
        };
        hand.SetResourceReference(Shape.StrokeProperty, brushKey);
        return hand;
    }

    // Settings live in the widget's Options (strings), saved with the layout.
    private bool ShowSeconds => _context?.Settings.GetBool("seconds", true) ?? true;
    private bool Smooth => _context?.Settings.GetBool("smooth", true) ?? true;

    public void Initialize(WidgetContext context)
    {
        _context = context;
        _secondHand.Visibility = ShowSeconds ? Visibility.Visible : Visibility.Collapsed;
        Update(animate: false);
        _timer.Start();
    }

    private void Update(bool animate)
    {
        var now = DateTime.Now;
        _hour.Angle = (now.Hour % 12 + now.Minute / 60.0) * 30;
        _minute.Angle = (now.Minute + now.Second / 60.0) * 6;
        if (!ShowSeconds) return;

        double target = now.Second * 6;
        if (!animate || _secondAngle < 0)
        {
            _second.BeginAnimation(RotateTransform.AngleProperty, null);
            _second.Angle = _secondAngle = target;
            return;
        }
        // Keep turning forwards: 354° → 360°, not back to 0°.
        if (target < _secondAngle) target += 360;
        var ease = new DoubleAnimation(_secondAngle, target, TimeSpan.FromMilliseconds(260)) { EasingFunction = new BackEase { Amplitude = 0.4, EasingMode = EasingMode.EaseOut } };
        _secondAngle = target % 360;
        _second.BeginAnimation(RotateTransform.AngleProperty, ease);
    }

    public IEnumerable<Control> CreateSettingsMenuItems()
    {
        var seconds = new MenuItem { Header = "Second hand", IsCheckable = true, IsChecked = ShowSeconds };
        seconds.Click += (_, _) => Set("seconds", seconds.IsChecked);
        var smooth = new MenuItem { Header = "Animate the second hand", IsCheckable = true, IsChecked = Smooth, IsEnabled = ShowSeconds };
        smooth.Click += (_, _) => Set("smooth", smooth.IsChecked);
        return new Control[] { seconds, smooth };
    }

    private void Set(string key, bool value)
    {
        if (_context == null) return;
        _context.Settings.SetBool(key, value);
        _context.Save();
        _secondHand.Visibility = ShowSeconds ? Visibility.Visible : Visibility.Collapsed;
        Update(animate: false);
    }

    // Covered or locked: stop ticking (and animating). Catch up straight away when visible again.
    public void OnVisibilityChanged(bool visible)
    {
        if (visible)
        {
            Update(animate: false);
            _timer.Start();
        }
        else _timer.Stop();
    }

    public void Dispose()
    {
        _timer.Stop();
        _second.BeginAnimation(RotateTransform.AngleProperty, null);
    }
}
