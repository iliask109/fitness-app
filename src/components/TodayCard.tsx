import type { Program, Workout } from '../lib/types';
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
        <span className="today-label">האימון של היום</span>
        <strong>עוד אין לך תוכנית אימון</strong>
        <span className="muted small">בחר תוכנית מוכנה או בנה אחת, ונגיד לך כל יום מה להתאמן.</span>
        <a className="btn primary" href="#/programs">לבחירת תוכנית</a>
      </div>
    );
  }

  const plan = planToday(program, workouts, today);
  if (!plan) return null;
  const nextLine = (n?: { dayIndex: number; date: string }) =>
    n && <span className="muted small">הבא: <strong>{program.days[n.dayIndex].name}</strong> {whenLabel(n.date, today)}</span>;

  if (plan.kind !== 'train') {
    const done = plan.kind === 'done';
    return (
      <div className="card today-card stack tight" style={{ '--accent': done ? 'var(--primary)' : 'var(--blue)' } as React.CSSProperties}>
        <div className="row between">
          <span className="today-label">האימון של היום</span>
          <a className="muted small" href={`#/programs?focus=${program.id}`}>{program.name} · 📅 ימי אימון</a>
        </div>
        <div className="today-rest">
          <span className="today-big-icon">{done ? '✅' : '😴'}</span>
          <div className="stack tight">
            <strong className="today-title">{done ? `סיימת להיום: ${program.days[plan.dayIndex].name}` : 'היום יום מנוחה'}</strong>
            {!done && <span className="muted small">השרירים גדלים במנוחה. אפשר הליכה קלה או מתיחות.</span>}
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
        <span className="today-label">האימון של היום</span>
        <a className="muted small" href={`#/programs?focus=${program.id}`}>{program.name} · 📅 ימי אימון</a>
      </div>
      <div className="row gap">
        <span className="day-card-icon">{style.icon}</span>
        <div className="grow">
          <strong className="today-title">{day.name}</strong>
          <div className="muted small">{day.exercises.length} תרגילים · כ-{estimateMinutes(day)} דק׳ · {style.label}</div>
        </div>
      </div>
      <div className="chips">
        {day.exercises.map((e, i) => <span key={i} className="chip"><ExerciseInfo name={e.name} /></span>)}
      </div>
      <a className="btn big today-start" href={`#/workouts/new?program=${program.id}&day=${plan.dayIndex}`}>▶ התחלת האימון</a>
    </div>
  );
}
