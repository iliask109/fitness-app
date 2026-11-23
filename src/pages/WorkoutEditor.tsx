import { useEffect, useRef, useState } from 'react';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program, SetEntry, Workout, WorkoutExercise } from '../lib/types';
import { todayISO, workoutVolume, e1rm, round } from '../lib/utils';
import ExercisePicker from '../components/ExercisePicker';
import RestTimer from '../components/RestTimer';
import ExerciseInfo from '../components/ExerciseInfo';

export default function WorkoutEditor({ id, query }: { id: string; query: URLSearchParams }) {
  const workouts = useTable<Workout>('workouts');
  const programs = useTable<Program>('programs');
  const [w, setW] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [restSec, setRestSec] = useState(90);
  const started = useRef(Date.now());
  const isNew = id === 'new';

  /** The sets from the most recent previous workout containing this exercise. */
  const lastSets = (name: string): SetEntry[] | undefined => {
    const prev = [...workouts.rows]
      .filter((x) => x.id !== id && x.exercises.some((e) => e.name === name))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return prev?.exercises.find((e) => e.name === name)?.sets;
  };

  useEffect(() => {
    if (w || workouts.loading || programs.loading) return;
    if (!isNew) {
      const found = workouts.rows.find((x) => x.id === id);
      setW(found ? structuredClone(found) : null);
      if (!found) navigate('/workouts');
      return;
    }
    const prog = programs.rows.find((p) => p.id === query.get('program'));
    const day = prog?.days[Number(query.get('day') ?? 0)];
    const exercises: WorkoutExercise[] = (day?.exercises ?? []).map((pe) => {
      const prev = lastSets(pe.name);
      return {
        name: pe.name,
        sets: Array.from({ length: pe.sets }, (_, i) => ({ reps: pe.reps, weight: prev?.[i]?.weight ?? prev?.[0]?.weight ?? 0, done: false })),
      };
    });
    setW({
      id: crypto.randomUUID(), date: todayISO(), name: day ? `${day.name}` : 'אימון', exercises, notes: '',
      program_id: day ? prog!.id : null, program_day: day ? Number(query.get('day') ?? 0) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.loading, programs.loading]);

  if (!w) return <p className="muted">טוען…</p>;

  const update = (fn: (draft: Workout) => void) => setW((prev) => { const d = structuredClone(prev!); fn(d); return d; });

  const addExercise = (name: string) => update((d) => {
    const prev = lastSets(name);
    d.exercises.push({ name, sets: prev ? prev.map((s) => ({ ...s, done: false })) : [{ reps: 10, weight: 0, done: false }] });
  });

  const toggleDone = (ei: number, si: number) => {
    const nowDone = !w.exercises[ei].sets[si].done;
    update((d) => { d.exercises[ei].sets[si].done = nowDone; });
    if (nowDone) setTimerKey((k) => k + 1);
  };

  async function save() {
    setSaving(true);
    try {
      const duration = isNew ? Math.max(1, Math.round((Date.now() - started.current) / 60000)) : w!.duration_min;
      await workouts.save({ ...w!, duration_min: duration });
      navigate('/workouts');
    } catch (e) {
      alert('שמירה נכשלה: ' + (e as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('למחוק את האימון?')) return;
    await workouts.remove(w!.id);
    navigate('/workouts');
  }

  return (
    <div className="stack">
      <div className="row between">
        <a href="#/workouts" className="muted">→ חזרה</a>
        {!isNew && <button className="btn danger small" onClick={remove}>מחיקה</button>}
      </div>
      <input className="title-input" value={w.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />
      <div className="row gap">
        <label className="grow">תאריך<input type="date" value={w.date} onChange={(e) => update((d) => { d.date = e.target.value; })} /></label>
        <label>מנוחה (שנ׳)
          <select value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
            {[45, 60, 90, 120, 180, 240].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {w.exercises.map((ex, ei) => {
        const prev = lastSets(ex.name);
        const best = Math.max(0, ...ex.sets.filter((s) => s.done).map((s) => e1rm(s.weight, s.reps)));
        return (
          <div key={ei} className="card exercise">
            <div className="row between">
              <span className="row gap"><strong>{ex.name}</strong><ExerciseInfo name={ex.name} icon /></span>
              <button className="icon-btn" aria-label="הסרת תרגיל"
                onClick={() => update((d) => { d.exercises.splice(ei, 1); })}>🗑️</button>
            </div>
            {prev && <div className="muted small">פעם קודמת: {prev.map((s) => `${s.weight}×${s.reps}`).join(', ')}</div>}
            <div className="set-grid head"><span>סט</span><span>ק״ג</span><span>חזרות</span><span>✓</span></div>
            {ex.sets.map((s, si) => (
              <div key={si} className={'set-grid' + (s.done ? ' done' : '')}>
                <span className="set-num">{si + 1}</span>
                <input type="number" inputMode="decimal" step="0.5" min="0" value={s.weight}
                  onChange={(e) => update((d) => { d.exercises[ei].sets[si].weight = Number(e.target.value); })} />
                <input type="number" inputMode="numeric" min="0" value={s.reps}
                  onChange={(e) => update((d) => { d.exercises[ei].sets[si].reps = Number(e.target.value); })} />
                <button className={'check' + (s.done ? ' on' : '')} onClick={() => toggleDone(ei, si)} aria-label="סט הושלם">✓</button>
              </div>
            ))}
            <div className="row between">
              <div className="row gap">
                <button className="btn small" onClick={() => update((d) => {
                  const last = d.exercises[ei].sets.at(-1);
                  d.exercises[ei].sets.push({ reps: last?.reps ?? 10, weight: last?.weight ?? 0, done: false });
                })}>+ סט</button>
                {ex.sets.length > 1 && <button className="btn small" onClick={() => update((d) => { d.exercises[ei].sets.pop(); })}>− סט</button>}
              </div>
              {best > 0 && <span className="muted small">1RM משוער: {round(best, 1)} ק״ג</span>}
            </div>
          </div>
        );
      })}

      <ExercisePicker onPick={addExercise} />

      <label>הערות<textarea rows={2} value={w.notes ?? ''} onChange={(e) => update((d) => { d.notes = e.target.value; })} /></label>

      <div className="muted small">נפח כולל: {Math.round(workoutVolume(w)).toLocaleString()} ק״ג</div>
      <button className="btn primary big" onClick={save} disabled={saving || w.exercises.length === 0}>
        {saving ? 'שומר…' : isNew ? 'סיום ושמירת אימון' : 'שמירת שינויים'}
      </button>

      {timerKey > 0 && <div className="timer-spacer" />}
      {timerKey > 0 && <RestTimer startKey={timerKey} seconds={restSec} onClose={() => setTimerKey(0)} />}
    </div>
  );
}
