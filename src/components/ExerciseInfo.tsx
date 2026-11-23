import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_GUIDE, demoVideoUrl } from '../lib/exerciseGuide';

/** Bottom sheet with how to do one exercise. */
export function ExerciseGuideSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const g = EXERCISE_GUIDE[name];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stack tight sheet-scroll guide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`איך עושים ${name}`}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>📖 {name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        {g ? (
          <>
            <div className="guide-muscles"><span className="muted small">שרירים:</span> {g.muscles}</div>
            <div className="guide-block">
              <h4>איך עושים</h4>
              <ol className="guide-steps">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
            {g.tips.length > 0 && (
              <div className="guide-block">
                <h4>💡 טיפים</h4>
                <ul className="guide-list">{g.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {g.avoid.length > 0 && (
              <div className="guide-block avoid">
                <h4>⚠️ טעויות נפוצות</h4>
                <ul className="guide-list">{g.avoid.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>עוד אין הסבר כתוב לתרגיל הזה. אפשר לראות סרטון הדגמה:</p>
        )}
        <a className="btn" href={demoVideoUrl(name)} target="_blank" rel="noopener noreferrer">▶ סרטון הדגמה ביוטיוב</a>
        <p className="muted small" style={{ margin: 0 }}>אם יש לך כאב או פציעה, התייעץ עם מאמן או רופא לפני שמתחילים.</p>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Makes an exercise name open its guide. `icon` shows a small ⓘ button; otherwise the
 * given content (usually the name) becomes the button.
 */
export default function ExerciseInfo({ name, icon, children }: { name: string; icon?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={icon ? 'info-btn' : 'guide-link'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`איך עושים ${name}`} title="איך עושים">
        {icon ? 'ⓘ' : children ?? name}
      </button>
      {open && <ExerciseGuideSheet name={name} onClose={() => setOpen(false)} />}
    </>
  );
}
