import { useTable } from '../lib/useTable';
import type { Workout } from '../lib/types';
import { formatDate, workoutVolume } from '../lib/utils';

export default function Workouts() {
  const { rows, loading } = useTable<Workout>('workouts');
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return (
    <div className="stack">
      <div className="row between">
        <h2>האימונים שלי</h2>
        <a className="btn primary" href="#/workouts/new">+ אימון חדש</a>
      </div>
      <p className="muted small">רוצה להתחיל מתוכנית? היכנס ל<a href="#/programs">תוכניות</a> ובחר יום אימון.</p>
      {loading && <p className="muted">טוען…</p>}
      {!loading && sorted.length === 0 && <div className="card muted">עוד לא נרשמו אימונים.</div>}
      {sorted.map((w) => {
        const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
        return (
          <a key={w.id} href={`#/workouts/${w.id}`} className="card list-card">
            <div className="row between">
              <strong>{w.name}</strong>
              <span className="muted small">{formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="muted small">{w.exercises.map((e) => e.name).join(' · ')}</div>
            <div className="chips">
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
