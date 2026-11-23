import { useMemo, useState } from 'react';
import { useTable } from '../lib/useTable';
import ProgramPicker from '../components/ProgramPicker';
import WorkoutCalendar from '../components/WorkoutCalendar';
import type { Program, Workout } from '../lib/types';
import { formatDate, workoutVolume } from '../lib/utils';
import { DAY_STYLES, DayStyleKey, dayStyle } from '../lib/dayStyle';

/** Workout type, judged like a program day: from its name, otherwise from its exercises. */
const styleOf = (w: Workout): DayStyleKey =>
  dayStyle({ name: w.name, exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: 0 })) });

/** The name a workout is filed under: its program day when it was started from a program, otherwise its own name. */
function groupName(w: Workout, programs: Program[]) {
  const day = programs.find((p) => p.id === w.program_id)?.days[w.program_day ?? -1];
  return (day?.name ?? w.name).trim() || 'אימון';
}

export default function Workouts() {
  const { rows, loading } = useTable<Workout>('workouts');
  const [picking, setPicking] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const programs = useTable<Program>('programs');

  const sorted = useMemo(() => [...rows].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? '')), [rows]);
  const styles = useMemo(() => new Map(sorted.map((w) => [w.id, styleOf(w)])), [sorted]);
  const perDay = useMemo(() => { const m = new Map<string, number>(); for (const w of rows) m.set(w.date, (m.get(w.date) ?? 0) + 1); return m; }, [rows]);
  const groups = useMemo(() => new Map(sorted.map((w) => [w.id, groupName(w, programs.rows)])), [sorted, programs.rows]);
  /** Filter chips: the program's day names first (in order, even with no workouts yet), then any other names used. */
  const nameChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of sorted) if (!date || w.date === date) counts.set(groups.get(w.id)!, (counts.get(groups.get(w.id)!) ?? 0) + 1);
    const fromPrograms = [...new Set(programs.rows.flatMap((p) => p.days.map((d) => d.name.trim())))];
    const others = [...counts.keys()].filter((n) => !fromPrograms.includes(n)).sort((a, b) => counts.get(b)! - counts.get(a)!);
    return [...fromPrograms, ...others].map((n) => {
      const day = programs.rows.flatMap((p) => p.days).find((d) => d.name.trim() === n);
      const sample = sorted.find((w) => groups.get(w.id) === n);
      const st = day ? dayStyle(day) : sample ? styles.get(sample.id)! : dayStyle({ name: n, exercises: [] });
      return { name: n, count: counts.get(n) ?? 0, style: st, fromProgram: !!day };
    });
  }, [sorted, groups, programs.rows, styles, date]);

  const shown = sorted.filter((w) => (!date || w.date === date) && (!name || groups.get(w.id) === name));
  const filtering = !!date || !!name;

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
          <div className="chips" role="group" aria-label="סינון לפי שם האימון">
            <button className={'chip btn-chip' + (!name ? ' selected' : '')} onClick={() => setName(null)}>הכול ({sorted.filter((w) => !date || w.date === date).length})</button>
            {nameChips.map((c) => (
              <button key={c.name} className={'chip btn-chip' + (name === c.name ? ' selected' : '') + (c.count ? '' : ' empty')}
                onClick={() => setName(name === c.name ? null : c.name)} title={c.fromProgram ? 'מהתוכנית שלך' : 'שם שנתת לאימון'}>
                {DAY_STYLES[c.style].icon} {c.name} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="muted">טוען…</p>}
      {!loading && rows.length === 0 && <div className="card muted">עוד לא נרשמו אימונים.</div>}
      {!loading && rows.length > 0 && shown.length === 0 && (
        <div className="card muted stack tight">
          <span>{name ? `אין אימוני "${name}"` : 'אין אימונים'}{date ? ` ב-${formatDate(date, { day: 'numeric', month: 'long' })}` : ''}.</span>
          <button className="btn small" onClick={() => { setDate(null); setName(null); }}>ניקוי הסינון</button>
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
