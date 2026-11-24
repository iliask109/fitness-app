import type { Program, Workout } from '../lib/types';
import { tr, tx } from '../lib/i18n';
import { DAY_STYLES, dayStyle, estimateMinutes } from '../lib/dayStyle';
import { planToday, whenLabel } from '../lib/schedule';
import { todayISO } from '../lib/utils';
import ExerciseInfo from './ExerciseInfo';

/** "Today's workout" from the active program: what to train, or a rest day, and what comes next. */
export default function TodayCard({ program, workouts }: { program: Program | null; workouts: Workout[] }) {
  const today = todayISO();

  if (!program) {
    return (
      <div className="card today-card stack tight">
        <span className="today-label">{tr('האימון של היום', 'Today\'s workout')}</span>
        <strong>{tr('עוד אין לך תוכנית אימון', 'You don\'t have a training program yet')}</strong>
        <span className="muted small">{tr('בחר תוכנית מוכנה או בנה אחת, ונגיד לך כל יום מה להתאמן.', 'Pick a ready-made program or build one, and we\'ll tell you what to train each day.')}</span>
        <a className="btn primary" href="#/programs">{tr('לבחירת תוכנית', 'Choose a program')}</a>
      </div>
    );
  }

  const plan = planToday(program, workouts, today);
  if (!plan) return null;
  const nextLine = (n?: { dayIndex: number; date: string }) =>
    n && <span className="muted small">{tr('הבא:', 'Next:')} <strong>{tx(program.days[n.dayIndex].name)}</strong> {whenLabel(n.date, today)}</span>;

  if (plan.kind !== 'train') {
    const done = plan.kind === 'done';
    return (
      <div className="card today-card stack tight" style={{ '--accent': done ? 'var(--primary)' : 'var(--blue)' } as React.CSSProperties}>
        <div className="row between">
          <span className="today-label">{tr('האימון של היום', 'Today\'s workout')}</span>
          <a className="muted small" href={`#/programs?focus=${program.id}`}>{tx(program.name)} · 📅 {tr('ימי אימון', 'Training days')}</a>
        </div>
        <div className="today-rest">
          <span className="today-big-icon">{done ? '✅' : '😴'}</span>
          <div className="stack tight">
            <strong className="today-title">{done ? tr(`סיימת להיום: ${program.days[plan.dayIndex].name}`, `Done for today: ${tx(program.days[plan.dayIndex].name)}`) : tr('היום יום מנוחה', 'Rest day today')}</strong>
            {!done && <span className="muted small">{tr('השרירים גדלים במנוחה. אפשר הליכה קלה או מתיחות.', 'Muscles grow while you rest. A light walk or stretching is fine.')}</span>}
            {nextLine(plan.next)}
          </div>
        </div>
      </div>
    );
  }

  const day = program.days[plan.dayIndex];
  const style = DAY_STYLES[dayStyle(day)];
  return (
    <div className="card today-card stack tight" style={{ '--accent': style.color } as React.CSSProperties}>
      <div className="row between">
        <span className="today-label">{tr('האימון של היום', 'Today\'s workout')}</span>
        <a className="muted small" href={`#/programs?focus=${program.id}`}>{tx(program.name)} · 📅 {tr('ימי אימון', 'Training days')}</a>
      </div>
      <div className="row gap">
        <span className="day-card-icon">{style.icon}</span>
        <div className="grow">
          <strong className="today-title">{tx(day.name)}</strong>
          <div className="muted small">{day.exercises.length} {tr('תרגילים', 'exercises')} · {tr('כ-', '~')}{estimateMinutes(day)} {tr('דק׳', 'min')} · {style.label}</div>
        </div>
      </div>
      <div className="chips">
        {day.exercises.map((e, i) => <span key={i} className="chip"><ExerciseInfo name={e.name} /></span>)}
      </div>
      <a className="btn big today-start" href={`#/workouts/new?program=${program.id}&day=${plan.dayIndex}`}>{tr('▶ התחלת האימון', '▶ Start workout')}</a>
    </div>
  );
}
