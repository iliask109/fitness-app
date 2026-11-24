import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { EXERCISE_GROUPS } from '../lib/exercises';
import { guideFor } from '../lib/exerciseGuide';
import ExerciseGuideSheet from '../components/ExerciseGuideSheet';

/** All exercises by muscle group, with search; tap one for how to do it. */
export default function ExerciseLibrary() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = q.trim();
  return (
    <div className="stack">
      <a href="#/workouts" className="muted">{tr('→ חזרה לאימונים', '← Back to workouts')}</a>
      <h2>{tr('📖 מדריך תרגילים', '📖 Exercise guide')}</h2>
      <input id="exercise-search" placeholder={tr('🔍 חיפוש תרגיל', '🔍 Search exercises')} value={q} onChange={(e) => setQ(e.target.value)} />
      {Object.entries(EXERCISE_GROUPS).map(([group, list]) => {
        const lower = query.toLowerCase();
        const items = list.filter((n) => n.includes(query) || tx(n).toLowerCase().includes(lower) || (guideFor(n)?.muscles ?? '').toLowerCase().includes(lower));
        if (!items.length) return null;
        return (
          <div key={group} className="card stack tight">
            <h3 style={{ margin: 0 }}>{tx(group)}</h3>
            {items.map((n) => (
              <button key={n} type="button" className="library-row" onClick={() => setOpen(n)}>
                <span>
                  <span className="library-name">{tx(n)}</span>
                  <span className="muted small">{guideFor(n)?.muscles}</span>
                </span>
                <span className="muted" aria-hidden>{tr('←', '→')}</span>
              </button>
            ))}
          </div>
        );
      })}
      {open && <ExerciseGuideSheet name={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
