import { lazy, ReactNode, Suspense, useState } from 'react';

/** The guide texts are only downloaded the first time someone opens a guide. */
const ExerciseGuideSheet = lazy(() => import('./ExerciseGuideSheet'));

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
      {open && <Suspense fallback={null}><ExerciseGuideSheet name={name} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}
