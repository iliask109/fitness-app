import { FormEvent, useEffect, useRef, useState } from 'react';
import { tr } from '../lib/i18n';
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
    if (!Number.isFinite(w) || w < 30 || w > 300) { setError(tr('נא למלא משקל תקין (30 עד 300 ק״ג)', 'Please enter a valid weight (30 to 300 kg)')); return; }
    setBusy(true);
    try {
      await save({ id: existing?.id, date, weight: Math.round(w * 10) / 10 });
      onClose();
    } catch (err) {
      setError(tr('השמירה נכשלה: ', 'Saving failed: ') + (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate role="dialog" aria-label={tr('משקל חדש', 'Log weight')}>
        <div className="row between">
          <h3>{tr('⚖️ משקל חדש', '⚖️ Log weight')}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={tr('סגירה', 'Close')}>✕</button>
        </div>
        <div className="weight-input">
          <input ref={input} type="number" inputMode="decimal" step="0.1" min={30} max={300} value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }} aria-label={tr('משקל בק״ג', 'Weight in kg')} />
          <span className="muted">{tr('ק״ג', 'kg')}</span>
        </div>
        {last && weight && diff !== 0 && Number.isFinite(diff) && (
          <div className={'small ' + (diff < 0 ? 'good' : 'muted')} style={{ textAlign: 'center' }}>
            <span dir="ltr">{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span> {tr('ק״ג מהשקילה הקודמת', 'kg since the last weigh-in')}
          </div>
        )}
        <label>{tr('תאריך', 'Date')}<input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
        {existing && <p className="muted small" style={{ margin: 0 }}>{tr(`כבר נשמר משקל לתאריך הזה (${existing.weight} ק״ג). השמירה תעדכן אותו.`, `A weight is already saved for this date (${existing.weight} kg). Saving will update it.`)}</p>}
        {error && <p className="notice">{error}</p>}
        <button className="btn primary big" disabled={busy}>{busy ? tr('שומר…', 'Saving…') : tr('שמירה', 'Save')}</button>
      </form>
    </div>
  );
}
