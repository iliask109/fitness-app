import type { ProgramDay } from '../lib/types';
import { DAY_STYLES, dayStyle, estimateMinutes } from '../lib/dayStyle';

/** One training day as a colored card: style badge, length estimate, exercises and a start button. */
export default function DayCard({ day, startHref }: { day: ProgramDay; startHref?: string }) {
  const style = DAY_STYLES[dayStyle(day)];
  const shown = day.exercises.slice(0, 4);
  const more = day.exercises.length - shown.length;

  return (
    <div className="day-card" style={{ '--accent': style.color } as React.CSSProperties}>
      <div className="day-card-top">
        <span className="day-card-icon">{style.icon}</span>
        <span className="day-card-badge">{style.label}</span>
      </div>
      <strong className="day-card-title">{day.name}</strong>
      <span className="muted small">{day.exercises.length} תרגילים{day.exercises.length > 0 && ` · כ-${estimateMinutes(day)} דק׳`}</span>
      <ul className="day-card-list">
        {shown.map((e, i) => (
          <li key={i}><span>{e.name}</span><span className="muted" dir="ltr">{e.sets}×{e.reps}</span></li>
        ))}
        {more > 0 && <li className="muted">ועוד {more}…</li>}
        {day.exercises.length === 0 && <li className="muted">אין תרגילים עדיין</li>}
      </ul>
      {startHref && day.exercises.length > 0 && <a className="day-card-start" href={startHref}>▶ התחלה</a>}
    </div>
  );
}
