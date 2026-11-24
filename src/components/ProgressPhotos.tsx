import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTable } from '../lib/useTable';
import type { BodyWeight, ProgressPhoto } from '../lib/types';
import { comparePhotos, deletePhotoFile, nextPhotoDate, photoUrl, uploadPhoto } from '../lib/photos';
import { latestWeight } from '../lib/nutrition';
import { formatDate, round, todayISO } from '../lib/utils';
import { byGender } from '../lib/gender';
import ConfirmInline from './ConfirmInline';

const longDate = (d: string) => formatDate(d, { day: 'numeric', month: 'long', year: 'numeric' });

/** Monthly progress photos: the last two side by side and Claude's comparison of them. */
export default function ProgressPhotos({ weights, gender }: { weights: BodyWeight[]; gender?: string | null }) {
  const { user } = useAuth();
  const photos = useTable<ProgressPhoto>('progress_photos');
  const sorted = [...photos.rows].sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const last = sorted.at(-1), prev = sorted.at(-2);
  const next = nextPhotoDate(sorted);
  const canAdd = !next || next <= todayISO();

  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState<'upload' | 'compare' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Private photos are shown through temporary links.
  const shown = [prev, last].filter(Boolean) as ProgressPhoto[];
  const shownKey = shown.map((p) => p.path).join('|');
  useEffect(() => {
    let alive = true;
    Promise.all(shown.map(async (p) => [p.id, await photoUrl(p.path)] as const))
      .then((pairs) => { if (alive) setUrls(Object.fromEntries(pairs)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey]);

  async function compare(photoId: string) {
    setBusy('compare');
    setError(null);
    try {
      await comparePhotos(photoId);
      await photos.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!navigator.onLine) { setError('אין חיבור לאינטרנט. אפשר להעלות תמונה כשהחיבור יחזור.'); return; }
    setBusy('upload');
    setError(null);
    try {
      const id = crypto.randomUUID();
      const path = await uploadPhoto(user.id, id, file);
      await photos.save({ id, date: todayISO(), path, weight: latestWeight(weights) });
      setBusy(null);
      if (last) await compare(id);
    } catch (err) {
      setError('העלאת התמונה נכשלה: ' + (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeLast() {
    if (!last) return;
    setBusy('delete');
    try {
      await deletePhotoFile(last.path);
      await photos.remove(last.id);
      setConfirmDelete(false);
    } catch (err) {
      setError('המחיקה נכשלה: ' + (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const diff = last?.weight != null && prev?.weight != null ? round(last.weight - prev.weight, 1) : null;
  const older = sorted.slice(0, -1).filter((p) => p.analysis).reverse();

  return (
    <div className="card stack tight">
      <h3>📸 תמונות התקדמות</h3>
      <p className="muted small" style={{ margin: 0 }}>
        תמונה אחת בחודש. Claude משווה אותה לתמונה הקודמת ומסביר מה השתנה, יחד עם השינוי במשקל.
      </p>

      {shown.length > 0 && (
        <div className={'photo-pair' + (shown.length === 1 ? ' single' : '')}>
          {shown.map((p) => (
            <figure key={p.id}>
              {urls[p.id] ? <img src={urls[p.id]!} alt={`תמונה מ-${longDate(p.date)}`} /> : <div className="photo-placeholder">⏳</div>}
              <figcaption className="small">
                <strong>{p === last && prev ? 'עכשיו' : p === prev ? 'לפני' : 'התמונה הראשונה'}</strong>
                <span className="muted"> · {formatDate(p.date)}{p.weight != null ? ` · ${p.weight} ק״ג` : ''}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {diff != null && (
        <span className="small">שינוי במשקל בין התמונות: <bdi dir="ltr"><strong>{diff > 0 ? "+" : ""}{diff}</strong></bdi> ק״ג</span>
      )}

      {busy === 'compare' && <p className="analysis muted">🤖 Claude משווה בין התמונות… (עד דקה)</p>}
      {last?.analysis && busy !== 'compare' && <p className="analysis">🤖 {last.analysis}</p>}
      {last && prev && !last.analysis && busy !== 'compare' && (
        <button className="btn" onClick={() => compare(last.id)} disabled={!!busy}>🤖 השוואה עם Claude</button>
      )}
      {sorted.length === 1 && <p className="muted small" style={{ margin: 0 }}>זו התמונה הראשונה. בעוד חודש מעלים תמונה חדשה, ו-Claude ישווה ביניהן.</p>}

      {error && <p className="notice">{error}</p>}

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
      {canAdd ? (
        <button className="btn primary" onClick={() => fileInput.current?.click()} disabled={!!busy}>
          {busy === 'upload' ? 'מעלה…' : sorted.length ? '📷 העלאת תמונה של החודש' : '📷 העלאת תמונה ראשונה'}
        </button>
      ) : (
        <span className="muted small">התמונה הבאה: {longDate(next!)} 🗓️</span>
      )}
      <span className="muted small">טיפ: לצלם באותו מקום, באותה תאורה ובאותה עמידה, כדי שההשוואה תהיה מדויקת.</span>

      {last && (confirmDelete ? (
        <ConfirmInline message="למחוק את התמונה האחרונה?" busy={busy === 'delete'} onConfirm={removeLast} onCancel={() => setConfirmDelete(false)} />
      ) : (
        <button className="btn small" onClick={() => setConfirmDelete(true)} disabled={!!busy}>🗑️ מחיקת התמונה האחרונה</button>
      ))}

      {older.length > 0 && (
        <>
          <button className="btn small" onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'הסתרת השוואות קודמות' : `השוואות קודמות (${older.length})`}</button>
          {showHistory && older.map((p) => (
            <div key={p.id} className="list-item stack tight">
              <strong className="small">{longDate(p.date)}</strong>
              <p className="analysis">{p.analysis}</p>
            </div>
          ))}
        </>
      )}

      <span className="muted small">🔒 התמונות פרטיות: {byGender(gender, 'רק אתה רואה', 'רק את רואה', 'רק את/ה רואה')} אותן (גם לא המנהל). להשוואה הן נשלחות ל-Claude.</span>
    </div>
  );
}
