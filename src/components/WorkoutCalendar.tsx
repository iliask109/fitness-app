import { useState } from 'react';
import { locale, tr } from '../lib/i18n';
import { weekdayLetters } from '../lib/schedule';
import { todayISO } from '../lib/utils';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Month calendar for picking a date. Days in `marked` (YYYY-MM-DD, with a count) get a green mark;
 * tapping the selected day again clears the selection.
 */
export default function WorkoutCalendar({ marked, selected, onSelect }: {
  marked: Map<string, number>;
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  const today = todayISO();
  const start = selected ?? today;
  const [ym, setYm] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const first = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`),
  ];
  const monthPrefix = `${ym.y}-${pad(ym.m + 1)}`;
  const inMonth = [...marked.entries()].filter(([d]) => d.startsWith(monthPrefix)).length;
  const isCurrentMonth = monthPrefix === today.slice(0, 7);
  const shift = (delta: number) => setYm(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="card stack tight calendar">
      <div className="row between">
        <button className="btn small" onClick={() => shift(-1)} aria-label={tr('חודש קודם', 'Previous month')}>{tr('→', '←')}</button>
        <div className="stack" style={{ gap: 0, alignItems: 'center' }}>
          <strong>{first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</strong>
          <span className="muted small">{inMonth ? tr(`${inMonth} ימי אימון`, `${inMonth} training days`) : tr('אין אימונים בחודש הזה', 'No workouts this month')}</span>
        </div>
        <button className="btn small" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label={tr('חודש הבא', 'Next month')}>{tr('←', '→')}</button>
      </div>
      <div className="cal-grid" role="grid" aria-label={tr('לוח שנה', 'Calendar')}>
        {weekdayLetters().map((l) => <span key={l} className="cal-head">{l}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} />;
          const count = marked.get(d) ?? 0;
          const cls = 'cal-day' + (count ? ' has' : '') + (d === selected ? ' selected' : '') + (d === today ? ' today' : '') + (d > today ? ' future' : '');
          return (
            <button key={d} type="button" className={cls} disabled={d > today} aria-pressed={d === selected}
              aria-label={`${Number(d.slice(8))}${count ? tr(`, ${count} אימונים`, `, ${count} workouts`) : ''}`}
              onClick={() => onSelect(d === selected ? null : d)}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
