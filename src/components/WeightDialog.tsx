import { FormEvent, useEffect, useRef, useState } from 'react';
import type { BodyWeight } from '../lib/types';
import { todayISO } from '../lib/utils';

interface Props {
  weights: BodyWeight[];
  save: (row: Partial<BodyWeight>) => Promise<unknown>;
  onClose: () => void;
}

/** Bottom sheet for logging a body weight. One entry per date: saving the same date again updates it. */
export default function WeightDialog({ weights, save, onClose }: Props) {
  const last = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const [weight, setWeight] = useState(last ? String(last.weight) : '');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const existing = weights.find((w) => w.date === date);
  const diff = last && weight ? Number(weight) - last.weight : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 30 || w > 300) { setError('נא למלא משקל תקין (30 עד 300 ק״ג)'); return; }
    setBusy(true);
    try {
      await save({ id: existing?.id, date, weight: Math.round(w * 10) / 10 });
      onClose();
    } catch (err) {
      setError('השמירה נכשלה: ' + (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate role="dialog" aria-label="משקל חדש">
        <div className="row between">
          <h3>⚖️ משקל חדש</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        <div className="weight-input">
          <input ref={input} type="number" inputMode="decimal" step="0.1" min={30} max={300} value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }} aria-label="משקל בק״ג" />
          <span className="muted">ק״ג</span>
        </div>
        {last && weight && diff !== 0 && Number.isFinite(diff) && (
          <div className={'small ' + (diff < 0 ? 'good' : 'muted')} style={{ textAlign: 'center' }}>
            <span dir="ltr">{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span> ק״ג מהשקילה הקודמת
          </div>
        )}
        <label>תאריך<input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
        {existing && <p className="muted small" style={{ margin: 0 }}>כבר נשמר משקל לתאריך הזה ({existing.weight} ק״ג). השמירה תעדכן אותו.</p>}
        {error && <p className="notice">{error}</p>}
        <button className="btn primary big" disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</button>
      </form>
    </div>
  );
}
