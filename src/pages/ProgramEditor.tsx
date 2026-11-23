import { useEffect, useState } from 'react';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program } from '../lib/types';
import ExercisePicker from '../components/ExercisePicker';
import WeekdayPicker from '../components/WeekdayPicker';
import ExerciseInfo from '../components/ExerciseInfo';

export default function ProgramEditor({ id }: { id: string }) {
  const programs = useTable<Program>('programs');
  const [p, setP] = useState<Program | null>(null);
  const isNew = id === 'new';

  useEffect(() => {
    if (p || programs.loading) return;
    // One program at a time: a new one only when there is none.
    if (isNew && programs.rows.length) { navigate('/programs'); return; }
    if (isNew) return setP({ id: crypto.randomUUID(), name: 'תוכנית חדשה', days: [{ name: 'יום 1', exercises: [] }] });
    const found = programs.rows.find((x) => x.id === id);
    if (found) setP(structuredClone(found)); else navigate('/programs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs.loading]);

  if (!p) return <p className="muted">טוען…</p>;
  const update = (fn: (d: Program) => void) => setP((prev) => { const d = structuredClone(prev!); fn(d); return d; });

  async function save() {
    try {
      await programs.save(p!);
      navigate('/programs');
    } catch (e) { alert('שמירה נכשלה: ' + (e as Error).message); }
  }
  async function remove() {
    if (!confirm('למחוק את התוכנית?')) return;
    await programs.remove(p!.id);
    navigate('/programs');
  }

  return (
    <div className="stack">
      <div className="row between">
        <a href="#/programs" className="muted">→ חזרה</a>
        {!isNew && <button className="btn danger small" onClick={remove}>מחיקה</button>}
      </div>
      <input className="title-input" value={p.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />

      {p.days.map((day, di) => (
        <div key={di} className="card stack tight">
          <div className="row gap">
            <input className="grow" value={day.name} onChange={(e) => update((d) => { d.days[di].name = e.target.value; })} />
            {p.days.length > 1 && <button className="icon-btn" aria-label="מחיקת יום" onClick={() => update((d) => { d.days.splice(di, 1); })}>🗑️</button>}
          </div>
          {day.exercises.length > 0 && <div className="prog-grid head"><span>תרגיל</span><span>סטים</span><span>חזרות</span><span /></div>}
          {day.exercises.map((ex, ei) => (
            <div key={ei} className="prog-grid">
              <span><ExerciseInfo name={ex.name} /></span>
              <input type="number" min="1" value={ex.sets} onChange={(e) => update((d) => { d.days[di].exercises[ei].sets = Number(e.target.value); })} />
              <input type="number" min="1" value={ex.reps} onChange={(e) => update((d) => { d.days[di].exercises[ei].reps = Number(e.target.value); })} />
              <button className="icon-btn" aria-label="הסרה" onClick={() => update((d) => { d.days[di].exercises.splice(ei, 1); })}>✕</button>
            </div>
          ))}
          <ExercisePicker onPick={(name) => update((d) => { d.days[di].exercises.push({ name, sets: 3, reps: 10 }); })} />
        </div>
      ))}

      <button className="btn dashed" onClick={() => update((d) => { d.days.push({ name: `יום ${d.days.length + 1}`, exercises: [] }); })}>+ הוספת יום אימון</button>

      <WeekdayPicker program={p} doneText="✓ יישמר עם התוכנית"
        onSave={async (weekdays, required) => update((d) => { d.schedule = { kind: 'weekly', weekdays, ...(required ? { required } : {}) }; })} />
      <button className="btn primary big" onClick={save}>שמירת תוכנית</button>
    </div>
  );
}
