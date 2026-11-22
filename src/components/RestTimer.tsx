import { useEffect, useState } from 'react';

/** Floating rest countdown. Restarts whenever `startKey` changes. */
export default function RestTimer({ startKey, seconds, onClose }: { startKey: number; seconds: number; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { setLeft(seconds); }, [startKey, seconds]);
  useEffect(() => {
    if (left <= 0) {
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mm = Math.floor(Math.max(left, 0) / 60), ss = Math.max(left, 0) % 60;
  return (
    <div className={'rest-timer' + (left <= 0 ? ' done' : '')}>
      <span>{left > 0 ? 'מנוחה' : 'יאללה, סט הבא!'}</span>
      <strong dir="ltr">{mm}:{String(ss).padStart(2, '0')}</strong>
      <button className="btn small" onClick={() => setLeft((s) => s + 15)}>+15</button>
      <button className="btn small" onClick={onClose}>✕</button>
    </div>
  );
}
