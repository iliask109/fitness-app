import { useState } from 'react';
import { EXERCISE_GROUPS } from '../lib/exercises';

/** Free-text exercise name with a grouped list of suggestions. */
export default function ExercisePicker({ onPick, label = '+ הוספת תרגיל' }: { onPick: (name: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pick = (n: string) => { onPick(n); setOpen(false); setQ(''); };

  if (!open) return <button className="btn dashed" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className="card picker">
      <div className="row gap">
        <input type="search" enterKeyHint="done" placeholder="🔍 חיפוש או שם תרגיל חדש" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) pick(q.trim()); }} />
        <button className="btn" onClick={() => setOpen(false)}>ביטול</button>
      </div>
      {q.trim() && <button className="btn primary" onClick={() => pick(q.trim())}>הוספת "{q.trim()}"</button>}
      {Object.entries(EXERCISE_GROUPS).map(([group, list]) => {
        const items = list.filter((n) => n.includes(q.trim()));
        if (!items.length) return null;
        return (
          <div key={group}>
            <div className="muted small group-title">{group}</div>
            <div className="chips">{items.map((n) => <button key={n} className="chip btn-chip" onClick={() => pick(n)}>{n}</button>)}</div>
          </div>
        );
      })}
    </div>
  );
}
