import { useState } from 'react';
import { EXERCISE_GROUPS } from '../lib/exercises';
import { EXERCISE_GUIDE } from '../lib/exerciseGuide';
import ExerciseGuideSheet from '../components/ExerciseGuideSheet';

/** All exercises by muscle group, with search; tap one for how to do it. */
export default function ExerciseLibrary() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = q.trim();
  return (
    <div className="stack">
      <a href="#/workouts" className="muted">→ חזרה לאימונים</a>
      <h2>📖 מדריך תרגילים</h2>
      <input id="exercise-search" placeholder="🔍 חיפוש תרגיל" value={q} onChange={(e) => setQ(e.target.value)} />
      {Object.entries(EXERCISE_GROUPS).map(([group, list]) => {
        const items = list.filter((n) => n.includes(query) || (EXERCISE_GUIDE[n]?.muscles ?? '').includes(query));
        if (!items.length) return null;
        return (
          <div key={group} className="card stack tight">
            <h3 style={{ margin: 0 }}>{group}</h3>
            {items.map((n) => (
              <button key={n} type="button" className="library-row" onClick={() => setOpen(n)}>
                <span>
                  <span className="library-name">{n}</span>
                  <span className="muted small">{EXERCISE_GUIDE[n]?.muscles}</span>
                </span>
                <span className="muted" aria-hidden>←</span>
              </button>
            ))}
          </div>
        );
      })}
      {open && <ExerciseGuideSheet name={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
