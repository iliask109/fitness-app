import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import { navigate } from '../lib/router';
import { byGender } from '../lib/gender';
import type { Workout } from '../lib/types';
import { formatDate, workoutVolume } from '../lib/utils';
import ExerciseInfo from '../components/ExerciseInfo';

/** A finished workout from the history: read-only, with delete as the only action. */
export default function WorkoutView({ id }: { id: string }) {
  const workouts = useTable<Workout>('workouts');
  const { profile } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (workouts.loading) return <p className="muted">{tr('טוען…', 'Loading…')}</p>;
  const w = workouts.rows.find((x) => x.id === id);
  if (!w) {
    return (
      <div className="stack">
        <a href="#/workouts" className="muted">{tr('→ חזרה לאימונים', '← Back to workouts')}</a>
        <div className="card muted">{tr('האימון לא נמצא. אולי הוא נמחק.', 'Workout not found. Maybe it was deleted.')}</div>
      </div>
    );
  }

  const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  async function remove() {
    setBusy(true);
    try {
      await workouts.remove(w!.id);
      navigate('/workouts');
    } catch (e) {
      setError(tr('המחיקה נכשלה: ', 'Deleting failed: ') + (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <a href="#/workouts" className="muted">{tr('→ חזרה לאימונים', '← Back to workouts')}</a>
      <div className="stack tight">
        <h2>{tx(w.name)}</h2>
        <span className="muted">📅 {formatDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      <div className="chips">
        {w.duration_min ? <span className="chip">⏱️ {w.duration_min} {tr('דק׳', 'min')}</span> : null}
        <span className="chip">🏋️ {w.exercises.length} {tr('תרגילים', 'exercises')}</span>
        <span className="chip">✓ {doneSets} {tr('סטים', 'sets')}</span>
        <span className="chip">{Math.round(workoutVolume(w)).toLocaleString()} {tr('ק״ג נפח', 'kg volume')}</span>
      </div>

      {w.exercises.map((ex, ei) => {
        const done = ex.sets.filter((s) => s.done).length;
        return (
          <div key={ei} className="card stack tight view-exercise">
            <div className="row between">
              <span className="row gap"><strong>{tx(ex.name)}</strong><ExerciseInfo name={ex.name} icon /></span>
              <span className="muted small">{done}/{ex.sets.length} {tr('סטים', 'sets')}</span>
            </div>
            <div className="view-sets">
              {ex.sets.map((s, si) => (
                <div key={si} className={'view-set' + (s.done ? ' done' : '')}>
                  <span className="muted small">{tr('סט', 'Set')} {si + 1}</span>
                  <strong>{s.weight ? <>{s.weight} {tr('ק״ג', 'kg')} × {s.reps}</> : tr(`${s.reps} חזרות`, `${s.reps} reps`)}</strong>
                  <span aria-label={s.done ? tr('הושלם', 'Done') : tr('לא הושלם', 'Not done')}>{s.done ? '✓' : '—'}</span>
                </div>
              ))}
            </div>
            {ex.notes?.trim() && <div className="small prev-note">📝 {ex.notes.trim()}</div>}
          </div>
        );
      })}

      {w.notes?.trim() && (
        <div className="card stack tight">
          <strong>{tr('הערות לאימון', 'Workout notes')}</strong>
          <span className="small">{w.notes.trim()}</span>
        </div>
      )}

      {error && <p className="notice" style={{ margin: 0 }}>{error}</p>}
      {confirming ? (
        <div className="card confirm-card stack tight" role="alertdialog" aria-label={tr('מחיקת האימון', 'Delete workout')}>
          <strong>{tr(byGender(profile.gender, 'אתה בטוח?', 'את בטוחה?', 'אתה בטוח/ה?') + ' האימון יימחק מההיסטוריה ומהגרפים, ואי אפשר לשחזר אותו.', 'Are you sure? The workout will be removed from your history and charts, and cannot be restored.')}</strong>
          <div className="row gap">
            <button className="btn danger grow" disabled={busy} onClick={remove}>{busy ? tr('מוחק…', 'Deleting…') : tr('כן, למחוק', 'Yes, delete')}</button>
            <button className="btn grow" onClick={() => setConfirming(false)}>{tr('ביטול', 'Cancel')}</button>
          </div>
        </div>
      ) : (
        <button className="btn danger" onClick={() => setConfirming(true)}>{tr('🗑️ מחיקת האימון', '🗑️ Delete workout')}</button>
      )}
    </div>
  );
}
