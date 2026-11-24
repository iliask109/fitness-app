import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { EXERCISE_GROUPS } from '../lib/exercises';

/** Free-text exercise name with a grouped list of suggestions. */
export default function ExercisePicker({ onPick, label = tr('+ הוספת תרגיל', '+ Add exercise') }: { onPick: (name: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pick = (n: string) => { onPick(n); setOpen(false); setQ(''); };

  if (!open) return <button className="btn dashed" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className="card picker">
      <div className="row gap">
        <input type="search" enterKeyHint="done" placeholder={tr('🔍 חיפוש או שם תרגיל חדש', '🔍 Search or type a new exercise')} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) pick(q.trim()); }} />
        <button className="btn" onClick={() => setOpen(false)}>{tr('ביטול', 'Cancel')}</button>
      </div>
      {q.trim() && <button className="btn primary" onClick={() => pick(q.trim())}>{tr('הוספת', 'Add')} "{q.trim()}"</button>}
      {Object.entries(EXERCISE_GROUPS).map(([group, list]) => {
        const query = q.trim().toLowerCase();
        const items = list.filter((n) => n.includes(q.trim()) || tx(n).toLowerCase().includes(query));
        if (!items.length) return null;
        return (
          <div key={group}>
            <div className="muted small group-title">{tx(group)}</div>
            <div className="chips">{items.map((n) => <button key={n} className="chip btn-chip" onClick={() => pick(n)}>{tx(n)}</button>)}</div>
          </div>
        );
      })}
    </div>
  );
}
