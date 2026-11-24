import type { ProgramDay } from '../lib/types';
import { tr, tx } from '../lib/i18n';
import { DAY_STYLES, dayStyle, estimateMinutes } from '../lib/dayStyle';
import ExerciseInfo from './ExerciseInfo';

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
      <strong className="day-card-title">{tx(day.name)}</strong>
      <span className="muted small">{day.exercises.length} {tr('תרגילים', 'exercises')}{day.exercises.length > 0 && tr(` · כ-${estimateMinutes(day)} דק׳`, ` · ~${estimateMinutes(day)} min`)}</span>
      <ul className="day-card-list">
        {shown.map((e, i) => (
          <li key={i}><span><ExerciseInfo name={e.name} /></span><span className="muted" dir="ltr">{e.sets}×{e.reps}</span></li>
        ))}
        {more > 0 && <li className="muted">{tr(`ועוד ${more}…`, `and ${more} more…`)}</li>}
        {day.exercises.length === 0 && <li className="muted">{tr('אין תרגילים עדיין', 'No exercises yet')}</li>}
      </ul>
      {startHref && day.exercises.length > 0 && <a className="day-card-start" href={startHref}>{tr('▶ התחלה', '▶ Start')}</a>}
    </div>
  );
}
