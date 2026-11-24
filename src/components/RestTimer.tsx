import { useEffect, useRef, useState } from 'react';
import { tr } from '../lib/i18n';

/** How long "next set!" stays on screen before the bar closes by itself. */
const DONE_SHOWN_MS = 1500;

/**
 * Floating rest countdown. Restarts whenever `startKey` changes and closes by itself when time is up.
 * Counts against the real end time, so it stays right even if the phone throttles timers.
 */
export default function RestTimer({ startKey, seconds, onClose }: { startKey: number; seconds: number; onClose: () => void }) {
  const endAt = useRef(Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    endAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }, [startKey, seconds]);

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [startKey]);

  useEffect(() => {
    if (left > 0) return;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
    const t = setTimeout(() => closeRef.current(), DONE_SHOWN_MS);
    return () => clearTimeout(t);
  }, [left]);

  const addTime = () => { endAt.current += 15000; setLeft((s) => s + 15); };
  const mm = Math.floor(left / 60), ss = left % 60;
  return (
    <div className={'rest-timer' + (left <= 0 ? ' done' : '')} role="timer" aria-live="polite">
      {left > 0 ? (
        <>
          <span>{tr('מנוחה', 'Rest')}</span>
          <strong dir="ltr">{mm}:{String(ss).padStart(2, '0')}</strong>
          <button className="btn small" onClick={addTime}>+15</button>
          <button className="btn small" onClick={onClose} aria-label={tr('סגירת הטיימר', 'Close timer')}>✕</button>
        </>
      ) : <strong>{tr('סט הבא! 💪', 'Next set! 💪')}</strong>}
    </div>
  );
}
