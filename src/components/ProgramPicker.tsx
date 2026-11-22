import { useEffect } from 'react';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program } from '../lib/types';

/** Bottom sheet listing saved programs; picking a day starts a workout prefilled from it. */
export default function ProgramPicker({ onClose }: { onClose: () => void }) {
  const { rows, loading } = useTable<Program>('programs');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stack sheet-scroll" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="תוכנית שמורה">
        <div className="row between">
          <h3>📋 בחירת תוכנית</h3>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        {loading && <p className="muted">טוען…</p>}
        {!loading && rows.length === 0 && (
          <div className="stack tight">
            <p className="muted" style={{ margin: 0 }}>עוד אין לך תוכניות שמורות.</p>
            <a className="btn blue" href="#/programs" onClick={onClose}>ליצירת תוכנית או בחירת תוכנית מוכנה</a>
          </div>
        )}
        {rows.map((p) => (
          <div key={p.id} className="stack tight">
            <strong>{p.name}</strong>
            {p.days.map((d, i) => (
              <button key={i} className="program-day" onClick={() => navigate(`/workouts/new?program=${p.id}&day=${i}`)}>
                <span>
                  <span className="program-day-name">{d.name}</span>
                  <span className="muted small">{d.exercises.length ? d.exercises.map((e) => e.name).join(' · ') : 'אין תרגילים'}</span>
                </span>
                <span className="program-day-go">▶</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
