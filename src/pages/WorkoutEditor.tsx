import { useEffect, useRef, useState } from 'react';
import { useTable } from '../lib/useTable';
import { navigate } from '../lib/router';
import type { Program, SetEntry, Workout, WorkoutExercise } from '../lib/types';
import { todayISO, workoutVolume, formatDate } from '../lib/utils';
import ExercisePicker from '../components/ExercisePicker';
import RestTimer from '../components/RestTimer';
import ExerciseInfo from '../components/ExerciseInfo';
import { useAuth } from '../lib/auth';
import { clearDraft, hasProgress, loadDraft, saveDraft, WorkoutDraft } from '../lib/workoutDraft';

export default function WorkoutEditor({ id, query }: { id: string; query: URLSearchParams }) {
  const workouts = useTable<Workout>('workouts');
  const programs = useTable<Program>('programs');
  const [w, setW] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [restSec, setRestSec] = useState(90);
  const [openIdx, setOpenIdx] = useState<number | null | undefined>(undefined);
  const started = useRef(Date.now());
  const { user } = useAuth();
  /** An unfinished workout from earlier, offered when starting a new one. */
  const [pendingDraft, setPendingDraft] = useState<WorkoutDraft | null>(null);

  const resume = (d: WorkoutDraft) => {
    started.current = d.startedAt;
    setOpenIdx(undefined);
    setW(structuredClone(d.workout));
    setPendingDraft(null);
  };

  // Keep an unfinished new workout on the device after every change (once a set is done).
  useEffect(() => {
    if (!w || !user || !hasProgress(w)) return;
    saveDraft(user.id, { workout: w, startedAt: started.current, updatedAt: Date.now() });
  }, [w, user]);

  /**
   * The completed sets (reps and weight) from the most recent earlier workout that did this exercise.
   * Workouts where none of its sets were completed are skipped.
   */
  const lastSets = (name: string): SetEntry[] | undefined => {
    const earlier = [...workouts.rows]
      .filter((x) => x.id !== id)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    for (const wk of earlier) {
      const done = wk.exercises.find((e) => e.name === name)?.sets.filter((x) => x.done);
      if (done?.length) return done;
    }
    return undefined;
  };

  /** The most recent note written on this exercise in an earlier workout. */
  const lastNote = (name: string): string | undefined => {
    const earlier = [...workouts.rows]
      .filter((x) => x.id !== id)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    for (const wk of earlier) {
      const note = wk.exercises.find((e) => e.name === name)?.notes?.trim();
      if (note) return note;
    }
    return undefined;
  };
  const [noteOpen, setNoteOpen] = useState<number | null>(null);

  useEffect(() => {
    if (w || workouts.loading || programs.loading) return;
    const draft = user ? loadDraft(user.id) : null;
    if (draft && query.get('resume')) { resume(draft); return; }
    if (draft) setPendingDraft(draft);
    const prog = programs.rows.find((p) => p.id === query.get('program'));
    const day = prog?.days[Number(query.get('day') ?? 0)];
    const exercises: WorkoutExercise[] = (day?.exercises ?? []).map((pe) => {
      const prev = lastSets(pe.name);
      return {
        name: pe.name,
        // Same reps and weight as last time, set by set; extra sets repeat the last one; first time uses the program.
        sets: Array.from({ length: pe.sets }, (_, i) => {
          const from = prev?.[i] ?? prev?.[prev.length - 1];
          return { reps: from?.reps ?? pe.reps, weight: from?.weight ?? 0, done: false };
        }),
      };
    });
    setW({
      id: crypto.randomUUID(), date: todayISO(), name: day ? `${day.name}` : 'אימון', exercises, notes: '',
      program_id: day ? prog!.id : null, program_day: day ? Number(query.get('day') ?? 0) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.loading, programs.loading]);

  if (!w) return <p className="muted">טוען…</p>;
  // Which exercise is open; the rest stay collapsed. Starts on the first unfinished one.
  if (openIdx === undefined) { setOpenIdx(firstUnfinished(w.exercises)); return null; }
  const allDone = w.exercises.length > 0 && w.exercises.every(isComplete);

  const update = (fn: (draft: Workout) => void) => setW((prev) => { const d = structuredClone(prev!); fn(d); return d; });

  const addExercise = (name: string) => { setOpenIdx(w.exercises.length); update((d) => {
    const prev = lastSets(name);
    d.exercises.push({ name, sets: prev ? prev.map((s) => ({ ...s, done: false })) : [{ reps: 10, weight: 0, done: false }] });
  }); };

  const toggleDone = (ei: number, si: number) => {
    const nowDone = !w.exercises[ei].sets[si].done;
    update((d) => { d.exercises[ei].sets[si].done = nowDone; });
    if (nowDone) setTimerKey((k) => k + 1);
    // Last set of this exercise done: collapse it and open the next unfinished one.
    const finishes = nowDone && w.exercises[ei].sets.every((x, i) => i === si || x.done);
    if (finishes) {
      const unfinished = (j: number) => j !== ei && !isComplete(w.exercises[j]);
      const next = [...w.exercises.keys()].slice(ei + 1).find(unfinished) ?? [...w.exercises.keys()].find(unfinished);
      setOpenIdx(next ?? null);
    }
  };

  /** Move an exercise up (-1) or down (+1) in the list, keeping the open one open. */
  const move = (ei: number, dir: -1 | 1) => {
    const to = ei + dir;
    if (to < 0 || to >= w.exercises.length) return;
    update((d) => { [d.exercises[ei], d.exercises[to]] = [d.exercises[to], d.exercises[ei]]; });
    setOpenIdx((o) => (o === ei ? to : o === to ? ei : o));
  };

  const removeExercise = (ei: number) => {
    const rest = w.exercises.filter((_, i) => i !== ei);
    update((d) => { d.exercises.splice(ei, 1); });
    setOpenIdx((o) => (o === ei ? firstUnfinished(rest) : o != null && o > ei ? o - 1 : o));
  };

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const duration = Math.max(1, Math.round((Date.now() - started.current) / 60000));
      await workouts.save({ ...w!, duration_min: duration });
      if (user) clearDraft(user.id);
      navigate('/workouts');
    } catch (e) {
      // The workout stays on the device as a draft, so nothing is lost; say so.
      setSaveError(navigator.onLine === false
        ? 'אין חיבור לאינטרנט. האימון שמור בטלפון, אפשר לנסות לשמור שוב כשהחיבור יחזור.'
        : 'השמירה נכשלה: ' + (e as Error).message + '. האימון שמור בטלפון, נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <a href="#/workouts" className="muted">→ חזרה</a>
      {pendingDraft && (
        <div className="card resume-card stack tight" role="region" aria-label="אימון שלא הסתיים">
          <strong>⏸️ יש לך אימון שלא הסתיים: {pendingDraft.workout.name}</strong>
          <span className="muted small">התחלת לפני {Math.max(1, Math.round((Date.now() - pendingDraft.startedAt) / 60000))} דק׳. להמשיך אותו או להתחיל אימון חדש?</span>
          <div className="row gap">
            <button className="btn primary grow" onClick={() => resume(pendingDraft)}>▶ המשך אותו</button>
            <button className="btn" onClick={() => { if (user) clearDraft(user.id); setPendingDraft(null); }}>התחלת אימון חדש</button>
          </div>
        </div>
      )}
      <input className="title-input" value={w.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />
      <div className="row gap">
        {/* The date is the day the workout was done: set when it starts, not editable. */}
        <div className="grow workout-date">
          <span className="muted small">תאריך</span>
          <strong>📅 {formatDate(w.date, { weekday: 'long', day: 'numeric', month: 'long' })}{w.date === todayISO() ? ' (היום)' : ''}</strong>
        </div>
        <label>מנוחה (שנ׳)
          <select value={restSec} onChange={(e) => setRestSec(Number(e.target.value))}>
            {[45, 60, 90, 120, 180, 240].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {w.exercises.map((ex, ei) => {
        const prev = lastSets(ex.name);
        const done = ex.sets.filter((x) => x.done);
        const complete = isComplete(ex);
        const top = done.length ? done.reduce((a, x) => (x.weight > a.weight || (x.weight === a.weight && x.reps > a.reps) ? x : a)) : null;
        const order = (
          <span className="order-btns" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" aria-label="הזזה למעלה" disabled={ei === 0} onClick={() => move(ei, -1)}>▲</button>
            <button className="icon-btn" aria-label="הזזה למטה" disabled={ei === w.exercises.length - 1} onClick={() => move(ei, 1)}>▼</button>
          </span>
        );

        if (openIdx !== ei) {
          return (
            <div key={ei} className={'card exercise collapsed' + (complete ? ' complete' : '')} role="button" tabIndex={0}
              aria-expanded={false} aria-label={`פתיחת ${ex.name}`}
              onClick={() => setOpenIdx(ei)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenIdx(ei); } }}>
              <span className={'ex-badge' + (complete ? ' on' : '')}>{complete ? '✓' : ei + 1}</span>
              <span className="grow ex-summary">
                <strong>{ex.name}{ex.notes?.trim() ? ' 📝' : ''}</strong>
                <span className="muted small">
                  {done.length}/{ex.sets.length} סטים{top && <> · {top.weight ? <span dir="ltr">{top.weight}×{top.reps}</span> : `${top.reps} חזרות`}</>}
                </span>
              </span>
              {order}
            </div>
          );
        }

        return (
          <div key={ei} className={'card exercise open' + (complete ? ' complete' : '')}>
            <div className="row between">
              <span className="row gap">
                <span className={'ex-badge' + (complete ? ' on' : '')}>{complete ? '✓' : ei + 1}</span>
                <strong>{ex.name}</strong><ExerciseInfo name={ex.name} icon onReplace={(n) => update((d) => { d.exercises[ei].name = n; })} />
              </span>
              <span className="row gap">
                {order}
                <button className="icon-btn" aria-label="הסרת תרגיל" onClick={() => removeExercise(ei)}>🗑️</button>
              </span>
            </div>
            {prev && <div className="muted small">פעם קודמת: <span dir="ltr">{prev.map((x) => `${x.weight}×${x.reps}`).join(', ')}</span></div>}
            <div className="set-grid head"><span>סט</span><span>ק״ג</span><span>חזרות</span><span>✓</span></div>
            {ex.sets.map((x, si) => (
              <div key={si} className={'set-grid' + (x.done ? ' done' : '')}>
                <span className="set-num">{si + 1}</span>
                <input type="number" inputMode="decimal" step="0.5" min="0" value={x.weight}
                  onChange={(e) => update((d) => { d.exercises[ei].sets[si].weight = Number(e.target.value); })} />
                <input type="number" inputMode="numeric" min="0" value={x.reps}
                  onChange={(e) => update((d) => { d.exercises[ei].sets[si].reps = Number(e.target.value); })} />
                <button className={'check' + (x.done ? ' on' : '')} onClick={() => toggleDone(ei, si)} aria-label="סט הושלם">✓</button>
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
              {top && top.weight > 0 && <span className="muted small">סט כבד: {top.weight} ק״ג × {top.reps}</span>}
            </div>
            {(() => {
              const before = lastNote(ex.name);
              const editing = noteOpen === ei || !!ex.notes;
              return (
                <div className="ex-note stack tight">
                  {before && <div className="muted small prev-note">📝 בפעם הקודמת: {before}</div>}
                  {editing ? (
                    <label className="small">הערה לתרגיל
                      <textarea id={`ex-note-${ei}`} rows={2} value={ex.notes ?? ''} autoFocus={noteOpen === ei && !ex.notes}
                        placeholder="למשל: גובה מושב 4, להרגיש בישבן, כאב קל בברך"
                        onChange={(e) => update((d) => { d.exercises[ei].notes = e.target.value; })} />
                    </label>
                  ) : (
                    <button className="btn small dashed" onClick={() => setNoteOpen(ei)}>📝 הוספת הערה</button>
                  )}
                </div>
              );
            })()}
            {complete && <button className="btn small" onClick={() => setOpenIdx(firstUnfinished(w.exercises))}>סגירה ✓</button>}
          </div>
        );
      })}

      {allDone && <div className="card all-done">🎉 סיימת את כל התרגילים! אפשר לשמור את האימון.</div>}

      <ExercisePicker onPick={addExercise} />

      <label>הערות<textarea rows={2} value={w.notes ?? ''} onChange={(e) => update((d) => { d.notes = e.target.value; })} /></label>

      <div className="muted small">נפח כולל: {Math.round(workoutVolume(w)).toLocaleString()} ק״ג</div>
      {saveError && <p className="notice" style={{ margin: 0 }}>{saveError}</p>}
      <button className="btn primary big" onClick={save} disabled={saving || w.exercises.length === 0}>
        {saving ? 'שומר…' : 'סיום ושמירת אימון'}
      </button>

      {timerKey > 0 && <div className="timer-spacer" />}
      {timerKey > 0 && <RestTimer startKey={timerKey} seconds={restSec} onClose={() => setTimerKey(0)} />}
    </div>
  );
}

const isComplete = (ex: WorkoutExercise) => ex.sets.length > 0 && ex.sets.every((x) => x.done);
/** Index of the first exercise with sets left to do, or null when everything is done. */
function firstUnfinished(list: WorkoutExercise[]) {
  const i = list.findIndex((ex) => !isComplete(ex));
  return i < 0 ? null : i;
}
