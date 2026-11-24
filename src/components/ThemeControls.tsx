import { ThemeChoice, useTheme } from '../lib/theme';
import { tr } from '../lib/i18n';

/** Moon/sun button for the top bar: switches straight between light and dark. */
export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();
  return (
    <button className="icon-btn theme-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? tr('מעבר לרקע בהיר', 'Switch to light') : tr('מעבר לרקע כהה', 'Switch to dark')} title={isDark ? tr('רקע בהיר', 'Light') : tr('רקע כהה', 'Dark')}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

const OPTIONS: { key: ThemeChoice; label: string }[] = [
  { key: 'light', get label() { return tr('☀️ בהיר', '☀️ Light'); } },
  { key: 'dark', get label() { return tr('🌙 כהה', '🌙 Dark'); } },
  { key: 'auto', get label() { return tr('📱 אוטומטי', '📱 Auto'); } },
];

/** Three-way choice for Settings, including "follow the device". */
export function ThemePicker() {
  const { choice, setTheme } = useTheme();
  return (
    <div className="card stack tight">
      <h3>{tr('🎨 מראה', '🎨 Appearance')}</h3>
      <div className="segmented" role="radiogroup" aria-label={tr('מראה', 'Appearance')}>
        {OPTIONS.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={choice === o.key}
            className={choice === o.key ? 'on' : ''} onClick={() => setTheme(o.key)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
