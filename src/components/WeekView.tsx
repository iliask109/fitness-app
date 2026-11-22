import { useState } from 'react';
import type { Workout } from '../lib/types';
import { addDays, formatDate, todayISO, weekStart, workoutVolume } from '../lib/utils';

const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/**
 * Weekly goal ("3 of 4 training days") plus a Sunday-to-Saturday chart.
 * Each column's height is that day's training volume; tapping a day shows its workouts.
 */
export default function WeekView({ workouts, goal }: { workouts: Workout[]; goal: number }) {
  const today = todayISO();
  const [offset, setOffset] = useState(0); // 0 = this week, -1 = last week, ...
  const [selected, setSelected] = useState(today);

  const start = addDays(weekStart(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const list = workouts.filter((w) => w.date === date);
    return { date, list, volume: list.reduce((a, w) => a + workoutVolume(w), 0) };
  });
  const maxVolume = Math.max(1, ...days.map((d) => d.volume));
  const trainedDays = days.filter((d) => d.list.length > 0).length;
  const pct = Math.min(100, (trainedDays / goal) * 100);
  const left = goal - trainedDays;
  const isThisWeek = offset === 0;

  const changeWeek = (delta: number) => {
    const next = offset + delta;
    setOffset(next);
    setSelected(next === 0 ? today : addDays(weekStart(today), next * 7));
  };

  const sel = days.find((d) => d.date === selected) ?? days[0];

  return (
    <div className="card stack tight week">
      <div className="row between">
        <button className="btn small" onClick={() => changeWeek(-1)} aria-label="שבוע קודם">→</button>
        <strong>{isThisWeek ? 'השבוע שלי' : `${formatDate(start)} – ${formatDate(addDays(start, 6))}`}</strong>
        <button className="btn small" onClick={() => changeWeek(1)} disabled={isThisWeek} aria-label="שבוע הבא">←</button>
      </div>

      <div className="week-goal">
        <span className="week-goal-num"><strong>{trainedDays}</strong> מתוך {goal}</span>
        <span className="muted small">ימי אימון</span>
      </div>
      <div className="bar"><div style={{ width: pct + '%', background: 'var(--primary)' }} /></div>
      <div className="small muted">
        {trainedDays >= goal ? 'השלמת את היעד השבועי! 🎉'
          : isThisWeek ? (left === 1 ? 'עוד יום אימון אחד ליעד 💪' : `עוד ${left} ימי אימון ליעד 💪`)
          : `חסרו ${left} ימים ליעד`}
      </div>

      <div className="week-chart" role="tablist">
        {days.map((d, i) => {
          const trained = d.list.length > 0;
          const h = trained ? 18 + (d.volume / maxVolume) * 82 : 6;
          return (
            <button key={d.date} role="tab" aria-selected={d.date === sel.date}
              className={'week-day' + (d.date === sel.date ? ' selected' : '') + (d.date === today ? ' today' : '') + (d.date > today ? ' future' : '')}
              onClick={() => setSelected(d.date)}>
              <span className="week-bar-wrap"><span className={'week-bar' + (trained ? ' on' : '')} style={{ height: h + '%' }} /></span>
              <span className="week-letter">{DAY_LETTERS[i]}</span>
              <span className="week-date">{Number(d.date.slice(8))}</span>
            </button>
          );
        })}
      </div>

      <div className="week-detail">
        <div className="muted small">{formatDate(sel.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {sel.list.length === 0 ? (
          sel.date > today ? <p className="muted">היום הזה עוד לא הגיע.</p>
          : sel.date === today ? (
            <div className="row between"><span className="muted">עוד לא התאמנת היום.</span><a className="btn primary small" href="#/workouts/new">התחלת אימון</a></div>
          ) : <p className="muted">יום מנוחה 😴</p>
        ) : sel.list.map((w) => (
          <a key={w.id} href={`#/workouts/${w.id}`} className="day-workout">
            <div className="row between">
              <strong>{w.name}</strong>
              <span className="muted small">
                {w.duration_min ? `${w.duration_min} דק׳ · ` : ''}{Math.round(workoutVolume(w)).toLocaleString()} ק״ג
              </span>
            </div>
            {w.exercises.map((ex, i) => {
              const done = ex.sets.filter((s) => s.done);
              return (
                <div key={i} className="small">
                  {ex.name} <span className="muted">· {done.length ? done.map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(', ') : 'לא הושלמו סטים'}</span>
                </div>
              );
            })}
          </a>
        ))}
      </div>
    </div>
  );
}
