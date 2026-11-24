import { useRef } from 'react';
import { useDialog } from '../lib/a11y';
import { tr, tx } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program } from '../lib/types';

/** Bottom sheet listing saved programs; picking a day starts a workout prefilled from it. */
export default function ProgramPicker({ onClose }: { onClose: () => void }) {
  const { rows, loading } = useTable<Program>('programs');

  const box = useRef<HTMLDivElement>(null);
  useDialog(box, onClose);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={box} aria-modal="true" className="sheet stack sheet-scroll" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('תוכנית שמורה', 'Saved program')}>
        <div className="row between">
          <h3>{tr('📋 בחירת תוכנית', '📋 Choose a program')}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={tr('סגירה', 'Close')}>✕</button>
        </div>
        {loading && <p className="muted">{tr('טוען…', 'Loading…')}</p>}
        {!loading && rows.length === 0 && (
          <div className="stack tight">
            <p className="muted" style={{ margin: 0 }}>{tr('עוד אין לך תוכניות שמורות.', 'You don\'t have saved programs yet.')}</p>
            <a className="btn blue" href="#/programs" onClick={onClose}>{tr('ליצירת תוכנית או בחירת תוכנית מוכנה', 'Create a program or pick a ready-made one')}</a>
          </div>
        )}
        {rows.map((p) => (
          <div key={p.id} className="stack tight">
            <strong>{tx(p.name)}</strong>
            {p.days.map((d, i) => (
              <button key={i} className="program-day" onClick={() => navigate(`/workouts/new?program=${p.id}&day=${i}`)}>
                <span>
                  <span className="program-day-name">{tx(d.name)}</span>
                  <span className="muted small">{d.exercises.length ? d.exercises.map((e) => tx(e.name)).join(' · ') : tr('אין תרגילים', 'No exercises')}</span>
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
