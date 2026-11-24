import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import type { Program, Workout } from '../lib/types';
import { addDays, formatDate, todayISO, weekStart, workoutVolume } from '../lib/utils';
import { projectDays, weekdayLetters } from '../lib/schedule';
import { DAY_STYLES, dayStyle } from '../lib/dayStyle';

/** Height of a planned (not yet done) column, as a share of the chart. */
const PLANNED_HEIGHT = 55;

/**
 * Weekly goal ("3 of 4 training days") plus a Sunday-to-Saturday chart.
 * Done days are solid columns sized by volume; in the current week, upcoming days show the
 * active program's plan (outlined column, or 😴 for rest). Tapping a day shows its details.
 */
export default function WeekView({ workouts, goal, program }: { workouts: Workout[]; goal: number; program?: Program | null }) {
  const today = todayISO();
  const [offset, setOffset] = useState(0); // 0 = this week, -1 = last week, ...
  const [selected, setSelected] = useState(today);

  const start = addDays(weekStart(today), offset * 7);
  const end = addDays(start, 6);
  const isThisWeek = offset === 0;
  const plan = isThisWeek && program ? projectDays(program, workouts, today, end) : {};

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const list = workouts.filter((w) => w.date === date);
    const p = list.length ? undefined : plan[date];
    const plannedDay = p && p.train && program ? program.days[p.dayIndex] : undefined;
    return {
      date, list, volume: list.reduce((a, w) => a + workoutVolume(w), 0),
      planned: plannedDay ? { day: plannedDay, dayIndex: (p as { dayIndex: number }).dayIndex, style: DAY_STYLES[dayStyle(plannedDay)] } : undefined,
      rest: p ? !p.train : false,
    };
  });
  const maxVolume = Math.max(1, ...days.map((d) => d.volume));
  const trainedDays = days.filter((d) => d.list.length > 0).length;
  const plannedLeft = days.filter((d) => d.planned).length;
  const pct = Math.min(100, (trainedDays / goal) * 100);
  const left = goal - trainedDays;

  const changeWeek = (delta: number) => {
    const next = offset + delta;
    setOffset(next);
    setSelected(next === 0 ? today : addDays(weekStart(today), next * 7));
  };

  const sel = days.find((d) => d.date === selected) ?? days[0];

  return (
    <div className="card stack tight week">
      <div className="row between">
        <button className="btn small" onClick={() => changeWeek(-1)} aria-label={tr('שבוע קודם', 'Previous week')}>{tr('→', '←')}</button>
        <strong>{isThisWeek ? tr('השבוע שלי', 'My week') : `${formatDate(start)} – ${formatDate(end)}`}</strong>
        <button className="btn small" onClick={() => changeWeek(1)} disabled={isThisWeek} aria-label={tr('שבוע הבא', 'Next week')}>{tr('←', '→')}</button>
      </div>

      <div className="week-goal">
        <span className="week-goal-num"><strong>{trainedDays}</strong> {tr('מתוך', 'of')} {goal}</span>
        <span className="muted small">{tr('ימי אימון', 'training days')}</span>
      </div>
      <div className="bar"><div style={{ width: pct + '%', background: 'var(--primary)' }} /></div>
      <div className="small muted">
        {trainedDays >= goal ? tr('השלמת את היעד השבועי! 🎉', 'You hit your weekly goal! 🎉')
          : isThisWeek ? (left === 1 ? tr('עוד יום אימון אחד ליעד 💪', 'One more training day to your goal 💪') : tr(`עוד ${left} ימי אימון ליעד 💪`, `${left} more training days to your goal 💪`))
          : tr(`חסרו ${left} ימים ליעד`, `${left} days short of the goal`)}
        {isThisWeek && plannedLeft > 0 && tr(` · ${plannedLeft} מתוכננים`, ` · ${plannedLeft} planned`)}
      </div>

      <div className="week-chart" role="tablist">
        {days.map((d, i) => {
          const trained = d.list.length > 0;
          const h = trained ? 18 + (d.volume / maxVolume) * 82 : d.planned ? PLANNED_HEIGHT : 6;
          return (
            <button key={d.date} role="tab" aria-selected={d.date === sel.date}
              aria-label={`${weekdayLetters()[i]} ${trained ? tr('בוצע אימון', 'trained') : d.planned ? tr('מתוכנן ', 'planned ') + tx(d.planned.day.name) : d.rest ? tr('מנוחה', 'rest') : ''}`}
              className={'week-day' + (d.date === sel.date ? ' selected' : '') + (d.date === today ? ' today' : '') + (d.date > today && !d.planned && !d.rest ? ' future' : '')}
              onClick={() => setSelected(d.date)}>
              <span className="week-bar-wrap">
                {d.rest && !trained
                  ? <span className="week-rest" aria-hidden>😴</span>
                  : <span className={'week-bar' + (trained ? ' on' : '') + (d.planned ? ' planned' : '')}
                      style={{ height: h + '%', ...(d.planned ? { '--accent': d.planned.style.color } : {}) } as React.CSSProperties}>
                      {d.planned && <span className="week-bar-icon">{d.planned.style.icon}</span>}
                    </span>}
              </span>
              <span className="week-letter">{weekdayLetters()[i]}</span>
              <span className="week-date">{Number(d.date.slice(8))}</span>
            </button>
          );
        })}
      </div>
      {isThisWeek && program && (
        <div className="week-legend small muted">
          <span><i className="lg-done" />{tr('בוצע', 'Done')}</span><span><i className="lg-planned" />{tr('מתוכנן', 'Planned')}</span><span>😴 {tr('מנוחה', 'Rest')}</span>
        </div>
      )}

      <div className="week-detail">
        <div className="muted small">{formatDate(sel.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {sel.list.length > 0 ? sel.list.map((w) => (
          <a key={w.id} href={`#/workouts/${w.id}`} className="day-workout">
            <div className="row between">
              <strong>{tx(w.name)}</strong>
              <span className="muted small">
                {w.duration_min ? `${w.duration_min} ${tr('דק׳', 'min')} · ` : ''}{Math.round(workoutVolume(w)).toLocaleString()} {tr('ק״ג', 'kg')}
              </span>
            </div>
            {w.exercises.map((ex, i) => {
              const done = ex.sets.filter((s) => s.done);
              return (
                <div key={i} className="small">
                  {tx(ex.name)}{ex.notes?.trim() && <span className="muted"> · 📝 {ex.notes.trim()}</span>} <span className="muted">· {done.length ? <span dir="ltr">{done.map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(', ')}</span> : tr('לא הושלמו סטים', 'no sets completed')}</span>
                </div>
              );
            })}
          </a>
        )) : sel.planned ? (
          <div className="day-workout planned-detail" style={{ '--accent': sel.planned.style.color } as React.CSSProperties}>
            <div className="row between">
              <strong>{sel.planned.style.icon} {tx(sel.planned.day.name)}</strong>
              <span className="chip planned-chip">{sel.date === today ? tr('מתוכנן להיום', 'Planned for today') : tr('מתוכנן', 'Planned')}</span>
            </div>
            <div className="chips">{sel.planned.day.exercises.map((e, i) => <span key={i} className="chip">{tx(e.name)} <span className="muted" dir="ltr">{e.sets}×{e.reps}</span></span>)}</div>
            {sel.date === today && program && (
              <a className="btn primary small" href={`#/workouts/new?program=${program.id}&day=${sel.planned.dayIndex}`}>{tr('▶ התחלת האימון', '▶ Start workout')}</a>
            )}
          </div>
        ) : sel.rest ? (
          <p className="muted">{tr('יום מנוחה מתוכנן 😴', 'Planned rest day 😴')}</p>
        ) : sel.date > today ? (
          <p className="muted">{tr('היום הזה עוד לא הגיע.', 'This day hasn\'t come yet.')}</p>
        ) : sel.date === today ? (
          <div className="row between"><span className="muted">{tr('עוד לא התאמנת היום.', 'You haven\'t trained today yet.')}</span><a className="btn primary small" href="#/workouts/new">{tr('התחלת אימון', 'Start a workout')}</a></div>
        ) : <p className="muted">{tr('לא התאמנת ביום הזה.', 'You didn\'t train on this day.')}</p>}
      </div>
    </div>
  );
}
