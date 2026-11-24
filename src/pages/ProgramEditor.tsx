import { useEffect, useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program } from '../lib/types';
import ExercisePicker from '../components/ExercisePicker';
import WeekdayPicker from '../components/WeekdayPicker';
import ExerciseInfo from '../components/ExerciseInfo';
import ConfirmInline from '../components/ConfirmInline';

export default function ProgramEditor({ id }: { id: string }) {
  const programs = useTable<Program>('programs');
  const [p, setP] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isNew = id === 'new';

  useEffect(() => {
    if (p || programs.loading) return;
    // One program at a time: a new one only when there is none.
    if (isNew && programs.rows.length) { navigate('/programs'); return; }
    if (isNew) return setP({ id: crypto.randomUUID(), name: tr('תוכנית חדשה', 'New program'), days: [{ name: tr('יום 1', 'Day 1'), exercises: [] }] });
    const found = programs.rows.find((x) => x.id === id);
    if (found) setP(structuredClone(found)); else navigate('/programs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs.loading]);

  if (!p) return <p className="muted">{tr('טוען…', 'Loading…')}</p>;
  const update = (fn: (d: Program) => void) => setP((prev) => { const d = structuredClone(prev!); fn(d); return d; });

  async function save() {
    setError(null);
    try {
      await programs.save(p!);
      navigate('/programs');
    } catch (e) { setError(tr('השמירה נכשלה: ', 'Saving failed: ') + (e as Error).message); }
  }
  async function remove() {
    try {
      await programs.remove(p!.id);
      navigate('/programs');
    } catch (e) { setError(tr('המחיקה נכשלה: ', 'Deleting failed: ') + (e as Error).message); setConfirming(false); }
  }

  return (
    <div className="stack">
      <div className="row between">
        <a href="#/programs" className="muted">{tr('→ חזרה', '← Back')}</a>
        {!isNew && <button className="btn danger small" onClick={() => setConfirming(true)}>{tr('מחיקה', 'Delete')}</button>}
      </div>
      {confirming && <ConfirmInline message={tr(`למחוק את התוכנית "${p.name}"? האימונים שכבר עשית יישמרו.`, `Delete the program "${tx(p.name)}"? Workouts you already did are kept.`)} onConfirm={remove} onCancel={() => setConfirming(false)} />}
      {error && <p className="notice" role="alert" style={{ margin: 0 }}>{error}</p>}
      <input className="title-input" maxLength={200} aria-label={tr('שם התוכנית', 'Program name')} value={tx(p.name)} onChange={(e) => update((d) => { d.name = e.target.value; })} />

      {p.days.map((day, di) => (
        <div key={di} className="card stack tight">
          <div className="row gap">
            <input className="grow" value={tx(day.name)} onChange={(e) => update((d) => { d.days[di].name = e.target.value; })} />
            {p.days.length > 1 && <button className="icon-btn" aria-label={tr('מחיקת יום', 'Delete day')} onClick={() => update((d) => { d.days.splice(di, 1); })}>🗑️</button>}
          </div>
          {day.exercises.length > 0 && <div className="prog-grid head"><span>{tr('תרגיל', 'Exercise')}</span><span>{tr('סטים', 'Sets')}</span><span>{tr('חזרות', 'Reps')}</span><span /></div>}
          {day.exercises.map((ex, ei) => (
            <div key={ei} className="prog-grid">
              <span><ExerciseInfo name={ex.name} /></span>
              <input type="number" min="1" value={ex.sets} onChange={(e) => update((d) => { d.days[di].exercises[ei].sets = Number(e.target.value); })} />
              <input type="number" min="1" value={ex.reps} onChange={(e) => update((d) => { d.days[di].exercises[ei].reps = Number(e.target.value); })} />
              <button className="icon-btn" aria-label={tr('הסרה', 'Remove')} onClick={() => update((d) => { d.days[di].exercises.splice(ei, 1); })}>✕</button>
            </div>
          ))}
          <ExercisePicker onPick={(name) => update((d) => { d.days[di].exercises.push({ name, sets: 3, reps: 10 }); })} />
        </div>
      ))}

      <button className="btn dashed" onClick={() => update((d) => { d.days.push({ name: tr(`יום ${d.days.length + 1}`, `Day ${d.days.length + 1}`), exercises: [] }); })}>{tr('+ הוספת יום אימון', '+ Add training day')}</button>

      <WeekdayPicker program={p} doneText={tr('✓ יישמר עם התוכנית', '✓ Saved with the program')}
        onSave={async (weekdays, required) => update((d) => { d.schedule = { kind: 'weekly', weekdays, ...(required ? { required } : {}) }; })} />
      <button className="btn primary big" onClick={save}>{tr('שמירת תוכנית', 'Save program')}</button>
    </div>
  );
}
