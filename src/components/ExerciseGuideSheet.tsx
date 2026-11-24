import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_ALTERNATIVE, EXERCISE_EQUIPMENT, EXERCISE_GUIDE, demoVideoUrl } from '../lib/exerciseGuide';
import { exerciseImages } from '../lib/exerciseImages';

/**
 * Bottom sheet with how to do one exercise: pictures, steps and one alternative exercise.
 * Tapping the alternative shows its guide; with `onReplace` (inside a workout) it can also swap the exercise.
 */
export default function ExerciseGuideSheet({ name: initial, onClose, onReplace }: { name: string; onClose: () => void; onReplace?: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const g = EXERCISE_GUIDE[name];
  const images = exerciseImages(name);
  const alt = EXERCISE_ALTERNATIVE[name];
  const equipment = EXERCISE_EQUIPMENT[name];
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => { sheet.current?.scrollTo({ top: 0 }); }, [name]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} className="sheet stack tight sheet-scroll guide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`איך עושים ${name}`}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>📖 {name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">✕</button>
        </div>
        {name !== initial && (
          <div className="row gap">
            <button className="btn small" onClick={() => setName(initial)}>→ חזרה ל{initial}</button>
            {onReplace && <button className="btn small primary" onClick={() => { onReplace(name); onClose(); }}>🔄 להחליף באימון ל{name}</button>}
          </div>
        )}
        {images && (
          <div className="guide-images">
            {images.map((src, i) => <img key={src} src={src} alt={`${name}, תנוחה ${i + 1}`} loading="lazy" />)}
          </div>
        )}
        {g ? (
          <>
            <div className="guide-muscles stack tight">
              <span><span className="muted small">💪 שרירים:</span> {g.muscles}</span>
              {equipment && <span><span className="muted small">🧰 ציוד נדרש:</span> {equipment}</span>}
            </div>
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
        {alt && (
          <div className="guide-block guide-alt">
            <h4>🔄 תרגיל חלופי</h4>
            <button className="btn alt-btn" onClick={() => setName(alt)}>
              {exerciseImages(alt) && <img src={exerciseImages(alt)![1]} alt="" loading="lazy" />}
              <span><strong>{alt}</strong><span className="muted small"> · {EXERCISE_GUIDE[alt]?.muscles}</span></span>
            </button>
          </div>
        )}
        <a className="btn" href={demoVideoUrl(name)} target="_blank" rel="noopener noreferrer">▶ סרטון הדגמה ביוטיוב</a>
        {images && <p className="muted small" style={{ margin: 0 }}>איורים: Free Exercise DB (נחלת הכלל).</p>}
        <p className="muted small" style={{ margin: 0 }}>אם יש לך כאב או פציעה, התייעץ עם מאמן או רופא לפני שמתחילים.</p>
      </div>
    </div>,
    document.body,
  );
}
