import { ThemeChoice, useTheme } from '../lib/theme';

/** Moon/sun button for the top bar: switches straight between light and dark. */
export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();
  return (
    <button className="icon-btn theme-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'מעבר לרקע בהיר' : 'מעבר לרקע כהה'} title={isDark ? 'רקע בהיר' : 'רקע כהה'}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

const OPTIONS: { key: ThemeChoice; label: string }[] = [
  { key: 'light', label: '☀️ בהיר' },
  { key: 'dark', label: '🌙 כהה' },
  { key: 'auto', label: '📱 אוטומטי' },
];

/** Three-way choice for Settings, including "follow the device". */
export function ThemePicker() {
  const { choice, setTheme } = useTheme();
  return (
    <div className="card stack tight">
      <h3>🎨 מראה</h3>
      <div className="segmented" role="radiogroup" aria-label="מראה">
        {OPTIONS.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={choice === o.key}
            className={choice === o.key ? 'on' : ''} onClick={() => setTheme(o.key)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
