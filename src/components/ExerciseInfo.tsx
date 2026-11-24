import { lazy, ReactNode, Suspense, useState } from 'react';
import { tr, tx } from '../lib/i18n';

/** The guide texts are only downloaded the first time someone opens a guide. */
const ExerciseGuideSheet = lazy(() => import('./ExerciseGuideSheet'));

/**
 * Makes an exercise name open its guide. `icon` shows a small ⓘ button; otherwise the
 * given content (usually the name) becomes the button.
 */
export default function ExerciseInfo({ name, icon, children, onReplace }: { name: string; icon?: boolean; children?: ReactNode; /** Swap the exercise for its alternative (inside a workout). */ onReplace?: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={icon ? 'info-btn' : 'guide-link'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={tr(`איך עושים ${name}`, `How to do ${tx(name)}`)} title={tr('איך עושים', 'How to')}>
        {icon ? 'ⓘ' : children ?? tx(name)}
      </button>
      {open && <Suspense fallback={null}><ExerciseGuideSheet name={name} onClose={() => setOpen(false)} onReplace={onReplace} /></Suspense>}
    </>
  );
}
