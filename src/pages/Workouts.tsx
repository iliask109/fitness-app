import { useMemo, useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import ProgramPicker from '../components/ProgramPicker';
import WorkoutCalendar from '../components/WorkoutCalendar';
import { useSyncExternalStore } from 'react';
import { useAuth } from '../lib/auth';
import { pendingIds, subscribeOutbox } from '../lib/tableStore';
import type { Program, Workout } from '../lib/types';
import { formatDate, workoutVolume } from '../lib/utils';
import { DAY_STYLES, DayStyleKey, dayStyle } from '../lib/dayStyle';

/** Workout type, judged like a program day: from its name, otherwise from its exercises. */
const styleOf = (w: Workout): DayStyleKey =>
  dayStyle({ name: w.name, exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: 0 })) });

/** The name a workout is filed under: its program day when it was started from a program, otherwise its own name. */
function groupName(w: Workout, programs: Program[]) {
  const day = programs.find((p) => p.id === w.program_id)?.days[w.program_day ?? -1];
  return (day?.name ?? w.name).trim() || tr('אימון', 'Workout');
}

export default function Workouts() {
  const { rows, loading } = useTable<Workout>('workouts');
  const [picking, setPicking] = useState(false);
  const { user } = useAuth();
  const pendingKey = useSyncExternalStore(subscribeOutbox, () => (user ? [...pendingIds(user.id)].join(',') : ''));
  const pending = new Set(pendingKey ? pendingKey.split(',') : []);
  const [showCalendar, setShowCalendar] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const programs = useTable<Program>('programs');

  const sorted = useMemo(() => [...rows].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? '')), [rows]);
  const styles = useMemo(() => new Map(sorted.map((w) => [w.id, styleOf(w)])), [sorted]);
  const perDay = useMemo(() => { const m = new Map<string, number>(); for (const w of rows) m.set(w.date, (m.get(w.date) ?? 0) + 1); return m; }, [rows]);
  const groups = useMemo(() => new Map(sorted.map((w) => [w.id, groupName(w, programs.rows)])), [sorted, programs.rows]);
  /** Filter chips for workouts actually done: the program's day names first (in program order), then any other names used. */
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
    }).filter((c) => c.count > 0 || c.name === name); // keep a selected chip so it can be cleared
  }, [sorted, groups, programs.rows, styles, date, name]);

  const shown = sorted.filter((w) => (!date || w.date === date) && (!name || groups.get(w.id) === name));
  const filtering = !!date || !!name;

  return (
    <div className="stack">
      <div className="row between">
        <h2>{tr('האימונים שלי', 'My workouts')}</h2>
        <a className="btn small" href="#/exercises">{tr('📖 מדריך תרגילים', '📖 Exercise guide')}</a>
      </div>
      <div className="grid2">
        <a className="btn primary big" href="#/workouts/new">{tr('+ אימון חדש', '+ New workout')}</a>
        <button className="btn blue big" onClick={() => setPicking(true)}>{tr('📋 תוכנית שמורה', '📋 Saved program')}</button>
      </div>
      {picking && <ProgramPicker onClose={() => setPicking(false)} />}

      {rows.length > 0 && (
        <div className="stack tight">
          <div className="row gap">
            <button className={'btn small' + (showCalendar ? ' primary' : '')} onClick={() => setShowCalendar((s) => !s)} aria-expanded={showCalendar}>
              📅 {date ? formatDate(date, { day: 'numeric', month: 'long' }) : tr('חיפוש לפי תאריך', 'Search by date')}
            </button>
            {date && <button className="btn small" onClick={() => setDate(null)} aria-label={tr('ניקוי התאריך', 'Clear date')}>{tr('✕ כל התאריכים', '✕ All dates')}</button>}
          </div>
          {showCalendar && <WorkoutCalendar marked={perDay} selected={date} onSelect={(d) => { setDate(d); if (d) setShowCalendar(false); }} />}
          <div className="chips" role="group" aria-label={tr('סינון לפי שם האימון', 'Filter by workout name')}>
            <button className={'chip btn-chip' + (!name ? ' selected' : '')} onClick={() => setName(null)}>{tr('הכול', 'All')} ({sorted.filter((w) => !date || w.date === date).length})</button>
            {nameChips.map((c) => (
              <button key={c.name} className={'chip btn-chip' + (name === c.name ? ' selected' : '')}
                onClick={() => setName(name === c.name ? null : c.name)} title={c.fromProgram ? tr('מהתוכנית שלך', 'From your program') : tr('שם שנתת לאימון', 'A name you gave the workout')}>
                {DAY_STYLES[c.style].icon} {tx(c.name)} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="muted">{tr('טוען…', 'Loading…')}</p>}
      {!loading && rows.length === 0 && <div className="card muted">{tr('עוד לא נרשמו אימונים.', 'No workouts logged yet.')}</div>}
      {!loading && rows.length > 0 && shown.length === 0 && (
        <div className="card muted stack tight">
          <span>{name ? tr(`אין אימוני "${name}"`, `No "${tx(name)}" workouts`) : tr('אין אימונים', 'No workouts')}{date ? tr(` ב-${formatDate(date, { day: 'numeric', month: 'long' })}`, ` on ${formatDate(date, { day: 'numeric', month: 'long' })}`) : ''}.</span>
          <button className="btn small" onClick={() => { setDate(null); setName(null); }}>{tr('ניקוי הסינון', 'Clear filter')}</button>
        </div>
      )}
      {filtering && shown.length > 0 && <span className="muted small">{shown.length} {tr('אימונים', 'workouts')}</span>}

      {shown.map((w) => {
        const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
        const st = DAY_STYLES[styles.get(w.id)!];
        return (
          <a key={w.id} href={`#/workouts/${w.id}`} className="card list-card">
            <div className="row between">
              <strong>{tx(w.name)}</strong>
              <span className="muted small">{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="muted small">{w.exercises.map((e) => tx(e.name)).join(' · ')}</div>
            <div className="chips">
              <span className="style-chip" style={{ '--accent': st.color } as React.CSSProperties}>{st.icon} {st.label}</span>
              <span className="chip">{sets} {tr('סטים', 'sets')}</span>
              <span className="chip">{Math.round(workoutVolume(w)).toLocaleString()} {tr('ק״ג', 'kg')}</span>
              {w.duration_min ? <span className="chip">{w.duration_min} {tr('דק׳', 'min')}</span> : null}
              {pending.has(w.id) && <span className="chip pending-chip">{tr('⏳ ממתין לסנכרון', '⏳ Waiting to sync')}</span>}
            </div>
          </a>
        );
      })}
    </div>
  );
}
