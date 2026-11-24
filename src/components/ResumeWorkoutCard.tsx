import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { clearDraft, DRAFT_TTL_MS, draftProgress, loadDraft } from '../lib/workoutDraft';
import { useProfile } from '../lib/useProfile';
import { byGender } from '../lib/gender';

/** Home-screen card for an unfinished workout (kept for an hour after its last change). `now` re-renders it. */
export default function ResumeWorkoutCard({ now }: { now: Date }) {
  const { user } = useAuth();
  const [, setGone] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const { profile } = useProfile();
  const draft = user ? loadDraft(user.id, now.getTime()) : null;
  if (!draft) return null;

  const p = draftProgress(draft.workout);
  const minutesLeft = Math.max(1, Math.ceil((draft.updatedAt + DRAFT_TTL_MS - now.getTime()) / 60000));
  const startedAgo = Math.max(1, Math.round((now.getTime() - draft.startedAt) / 60000));

  return (
    <div className="card resume-card stack tight" role="region" aria-label={tr('אימון שלא הסתיים', 'Unfinished workout')}>
      <div className="row gap">
        <span className="resume-icon">⏸️</span>
        <div className="grow">
          <strong>{tr('אימון שלא הסתיים:', 'Unfinished workout:')} {tx(draft.workout.name)}</strong>
          <div className="muted small">{p.done}/{p.total} {tr('תרגילים', 'exercises')} · {p.sets} {tr('סטים', 'sets')} · {tr(`התחלת לפני ${startedAgo} דק׳`, `started ${startedAgo} min ago`)}</div>
        </div>
      </div>
      <div className="bar"><div style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%`, background: 'var(--amber)' }} /></div>
      <span className="muted small">{tr(`אפשר להמשיך עוד ${minutesLeft} דק׳`, `You can continue for ${minutesLeft} more min`)}</span>
      {confirming ? (
        <div className="stack tight confirm-inline" role="alertdialog" aria-label={tr('מחיקת האימון', 'Delete workout')}>
          <strong>{tr(byGender(profile.gender, 'אתה בטוח?', 'את בטוחה?', 'אתה בטוח/ה?') + ' האימון והסטים שסימנת יימחקו.', 'Are you sure? The workout and the sets you ticked will be deleted.')}</strong>
          <div className="row gap">
            <button className="btn danger grow" onClick={() => { clearDraft(user!.id); setConfirming(false); setGone((x) => x + 1); }}>{tr('כן, למחוק', 'Yes, delete')}</button>
            <button className="btn grow" onClick={() => setConfirming(false)}>{tr('ביטול', 'Cancel')}</button>
          </div>
        </div>
      ) : (
        <div className="row gap">
          <a className="btn primary grow" href="#/workouts/new?resume=1">{tr('▶ המשך אימון', '▶ Continue workout')}</a>
          <button className="btn" onClick={() => setConfirming(true)}>{tr('מחיקה', 'Delete')}</button>
        </div>
      )}
    </div>
  );
}
