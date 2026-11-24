import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_ALTERNATIVE, demoVideoUrl, equipmentFor, guideFor } from '../lib/exerciseGuide';
import { tr, tx } from '../lib/i18n';
import { exerciseImages } from '../lib/exerciseImages';

/**
 * Bottom sheet with how to do one exercise: pictures, steps and one alternative exercise.
 * Tapping the alternative shows its guide; with `onReplace` (inside a workout) it can also swap the exercise.
 */
export default function ExerciseGuideSheet({ name: initial, onClose, onReplace }: { name: string; onClose: () => void; onReplace?: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const g = guideFor(name);
  const images = exerciseImages(name);
  const alt = EXERCISE_ALTERNATIVE[name];
  const equipment = equipmentFor(name);
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => { sheet.current?.scrollTo({ top: 0 }); }, [name]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={sheet} className="sheet stack tight sheet-scroll guide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr(`איך עושים ${name}`, `How to do ${tx(name)}`)}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>📖 {tx(name)}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={tr('סגירה', 'Close')}>✕</button>
        </div>
        {name !== initial && (
          <div className="row gap">
            <button className="btn small" onClick={() => setName(initial)}>{tr(`→ חזרה ל${initial}`, `← Back to ${tx(initial)}`)}</button>
            {onReplace && <button className="btn small primary" onClick={() => { onReplace(name); onClose(); }}>{tr(`🔄 להחליף באימון ל${name}`, `🔄 Swap in the workout for ${tx(name)}`)}</button>}
          </div>
        )}
        {images && (
          <div className="guide-images">
            {images.map((src, i) => <img key={src} src={src} alt={tr(`${name}, תנוחה ${i + 1}`, `${tx(name)}, position ${i + 1}`)} loading="lazy" />)}
          </div>
        )}
        {g ? (
          <>
            <div className="guide-muscles stack tight">
              <span><span className="muted small">💪 {tr('שרירים:', 'Muscles:')}</span> {g.muscles}</span>
              {equipment && <span><span className="muted small">🧰 {tr('ציוד נדרש:', 'Equipment:')}</span> {equipment}</span>}
            </div>
            <div className="guide-block">
              <h4>{tr('איך עושים', 'How to do it')}</h4>
              <ol className="guide-steps">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
            {g.tips.length > 0 && (
              <div className="guide-block">
                <h4>{tr('💡 טיפים', '💡 Tips')}</h4>
                <ul className="guide-list">{g.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {g.avoid.length > 0 && (
              <div className="guide-block avoid">
                <h4>{tr('⚠️ טעויות נפוצות', '⚠️ Common mistakes')}</h4>
                <ul className="guide-list">{g.avoid.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>{tr('עוד אין הסבר כתוב לתרגיל הזה. אפשר לראות סרטון הדגמה:', 'There\'s no written guide for this exercise yet. You can watch a demo video:')}</p>
        )}
        {alt && (
          <div className="guide-block guide-alt">
            <h4>{tr('🔄 תרגיל חלופי', '🔄 Alternative exercise')}</h4>
            <button className="btn alt-btn" onClick={() => setName(alt)}>
              {exerciseImages(alt) && <img src={exerciseImages(alt)![1]} alt="" loading="lazy" />}
              <span><strong>{tx(alt)}</strong><span className="muted small"> · {guideFor(alt)?.muscles}</span></span>
            </button>
          </div>
        )}
        <a className="btn" href={demoVideoUrl(name)} target="_blank" rel="noopener noreferrer">{tr('▶ סרטון הדגמה ביוטיוב', '▶ Demo video on YouTube')}</a>
        {images && <p className="muted small" style={{ margin: 0 }}>{tr('איורים: Free Exercise DB (נחלת הכלל).', 'Illustrations: Free Exercise DB (public domain).')}</p>}
        <p className="muted small" style={{ margin: 0 }}>{tr('אם יש לך כאב או פציעה, התייעץ עם מאמן או רופא לפני שמתחילים.', 'If you have pain or an injury, talk to a trainer or doctor before you start.')}</p>
      </div>
    </div>,
    document.body,
  );
}
