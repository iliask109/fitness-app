import { useMemo, useState } from 'react';
import { useTable } from '../lib/useTable';
import ProgramPicker from '../components/ProgramPicker';
import WorkoutCalendar from '../components/WorkoutCalendar';
import type { Workout } from '../lib/types';
import { formatDate, workoutVolume } from '../lib/utils';
import { DAY_STYLES, DayStyleKey, dayStyle } from '../lib/dayStyle';

/** Workout type, judged like a program day: from its name, otherwise from its exercises. */
const styleOf = (w: Workout): DayStyleKey =>
  dayStyle({ name: w.name, exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: 0 })) });

export default function Workouts() {
  const { rows, loading } = useTable<Workout>('workouts');
  const [picking, setPicking] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [type, setType] = useState<DayStyleKey | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? '')), [rows]);
  const styles = useMemo(() => new Map(sorted.map((w) => [w.id, styleOf(w)])), [sorted]);
  const perDay = useMemo(() => { const m = new Map<string, number>(); for (const w of rows) m.set(w.date, (m.get(w.date) ?? 0) + 1); return m; }, [rows]);
  const typeCounts = useMemo(() => {
    const m = new Map<DayStyleKey, number>();
    for (const w of sorted) if (!date || w.date === date) m.set(styles.get(w.id)!, (m.get(styles.get(w.id)!) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [sorted, styles, date]);

  const shown = sorted.filter((w) => (!date || w.date === date) && (!type || styles.get(w.id) === type));
  const filtering = !!date || !!type;

  return (
    <div className="stack">
      <div className="row between">
        <h2>האימונים שלי</h2>
        <a className="btn small" href="#/exercises">📖 מדריך תרגילים</a>
      </div>
      <div className="grid2">
        <a className="btn primary big" href="#/workouts/new">+ אימון חדש</a>
        <button className="btn blue big" onClick={() => setPicking(true)}>📋 תוכנית שמורה</button>
      </div>
      {picking && <ProgramPicker onClose={() => setPicking(false)} />}

      {rows.length > 0 && (
        <div className="stack tight">
          <div className="row gap">
            <button className={'btn small' + (showCalendar ? ' primary' : '')} onClick={() => setShowCalendar((s) => !s)} aria-expanded={showCalendar}>
              📅 {date ? formatDate(date, { day: 'numeric', month: 'long' }) : 'חיפוש לפי תאריך'}
            </button>
            {date && <button className="btn small" onClick={() => setDate(null)} aria-label="ניקוי התאריך">✕ כל התאריכים</button>}
          </div>
          {showCalendar && <WorkoutCalendar marked={perDay} selected={date} onSelect={(d) => { setDate(d); if (d) setShowCalendar(false); }} />}
          <div className="chips" role="group" aria-label="סינון לפי סוג אימון">
            <button className={'chip btn-chip' + (!type ? ' selected' : '')} onClick={() => setType(null)}>הכול</button>
            {typeCounts.map(([k, n]) => (
              <button key={k} className={'chip btn-chip' + (type === k ? ' selected' : '')} onClick={() => setType(type === k ? null : k)}>
                {DAY_STYLES[k].icon} {DAY_STYLES[k].label} ({n})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="muted">טוען…</p>}
      {!loading && rows.length === 0 && <div className="card muted">עוד לא נרשמו אימונים.</div>}
      {!loading && rows.length > 0 && shown.length === 0 && (
        <div className="card muted stack tight">
          <span>{date ? `אין אימונים ב-${formatDate(date, { day: 'numeric', month: 'long' })}` : 'אין אימונים'}{type ? ` מסוג ${DAY_STYLES[type].label}` : ''}.</span>
          <button className="btn small" onClick={() => { setDate(null); setType(null); }}>ניקוי הסינון</button>
        </div>
      )}
      {filtering && shown.length > 0 && <span className="muted small">{shown.length} אימונים</span>}

      {shown.map((w) => {
        const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
        const st = DAY_STYLES[styles.get(w.id)!];
        return (
          <a key={w.id} href={`#/workouts/${w.id}`} className="card list-card">
            <div className="row between">
              <strong>{w.name}</strong>
              <span className="muted small">{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="muted small">{w.exercises.map((e) => e.name).join(' · ')}</div>
            <div className="chips">
              <span className="style-chip" style={{ '--accent': st.color } as React.CSSProperties}>{st.icon} {st.label}</span>
              <span className="chip">{sets} סטים</span>
              <span className="chip">{Math.round(workoutVolume(w)).toLocaleString()} ק״ג</span>
              {w.duration_min ? <span className="chip">{w.duration_min} דק׳</span> : null}
            </div>
          </a>
        );
      })}
    </div>
  );
}
