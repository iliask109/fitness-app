import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { clearDraft, DRAFT_TTL_MS, draftProgress, loadDraft } from '../lib/workoutDraft';

/** Home-screen card for an unfinished workout (kept for an hour after its last change). `now` re-renders it. */
export default function ResumeWorkoutCard({ now }: { now: Date }) {
  const { user } = useAuth();
  const [, setGone] = useState(0);
  const draft = user ? loadDraft(user.id, now.getTime()) : null;
  if (!draft) return null;

  const p = draftProgress(draft.workout);
  const minutesLeft = Math.max(1, Math.ceil((draft.updatedAt + DRAFT_TTL_MS - now.getTime()) / 60000));
  const startedAgo = Math.max(1, Math.round((now.getTime() - draft.startedAt) / 60000));

  return (
    <div className="card resume-card stack tight" role="region" aria-label="אימון שלא הסתיים">
      <div className="row gap">
        <span className="resume-icon">⏸️</span>
        <div className="grow">
          <strong>אימון שלא הסתיים: {draft.workout.name}</strong>
          <div className="muted small">{p.done}/{p.total} תרגילים · {p.sets} סטים · התחלת לפני {startedAgo} דק׳</div>
        </div>
      </div>
      <div className="bar"><div style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%`, background: 'var(--amber)' }} /></div>
      <span className="muted small">אפשר להמשיך עוד {minutesLeft} דק׳</span>
      <div className="row gap">
        <a className="btn primary grow" href="#/workouts/new?resume=1">▶ המשך אימון</a>
        <button className="btn" onClick={() => { clearDraft(user!.id); setGone((x) => x + 1); }}>מחיקה</button>
      </div>
    </div>
  );
}
