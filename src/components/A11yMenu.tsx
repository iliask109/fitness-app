import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isDefaultA11y, resetA11y, setA11y, useA11y, useDialog } from '../lib/a11y';
import { tr } from '../lib/i18n';

/** The ♿ button in the header, and the accessibility menu it opens. */
export default function A11yMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn a11y-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={tr('תפריט נגישות', 'Accessibility menu')} title={tr('נגישות', 'Accessibility')}>
        <span aria-hidden>♿</span>
      </button>
      {open && <A11yPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function A11yPanel({ onClose }: { onClose: () => void }) {
  const p = useA11y();
  const box = useRef<HTMLDivElement>(null);
  useDialog(box, onClose);
  const toggle = (key: 'contrast' | 'links' | 'motion' | 'font', label: string, icon: string) => (
    <button type="button" role="switch" aria-checked={p[key]} className={'option a11y-option' + (p[key] ? ' on' : '')} onClick={() => setA11y({ [key]: !p[key] })}>
      <span aria-hidden>{icon}</span> {label} <span className="a11y-state">{p[key] ? tr('פעיל', 'On') : tr('כבוי', 'Off')}</span>
    </button>
  );
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={box} className="sheet stack tight sheet-scroll" role="dialog" aria-modal="true" aria-labelledby="a11y-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2 id="a11y-title" style={{ fontSize: 18 }}>♿ {tr('תפריט נגישות', 'Accessibility menu')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={tr('סגירה', 'Close')}>✕</button>
        </div>
        <span className="small muted" id="a11y-size-label">{tr('גודל טקסט', 'Text size')}</span>
        <div className="segmented" role="radiogroup" aria-labelledby="a11y-size-label">
          {([0, 1, 2] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={p.size === s} className={p.size === s ? 'on' : ''} onClick={() => setA11y({ size: s })}>
              <span dir="ltr" style={{ fontSize: 14 + s * 3 }}>{['A', 'A+', 'A++'][s]}</span>
            </button>
          ))}
        </div>
        <div className="stack tight">
          {toggle('contrast', tr('ניגודיות גבוהה', 'High contrast'), '◐')}
          {toggle('links', tr('הדגשת קישורים', 'Underline links'), '🔗')}
          {toggle('motion', tr('עצירת אנימציות', 'Stop animations'), '⏸️')}
          {toggle('font', tr('גופן קריא', 'Readable font'), '🔤')}
        </div>
        <button type="button" className="btn" disabled={isDefaultA11y(p)} onClick={resetA11y}>↺ {tr('איפוס הגדרות נגישות', 'Reset accessibility settings')}</button>
        <a className="btn" href="#/accessibility" onClick={onClose}>📄 {tr('הצהרת נגישות', 'Accessibility statement')}</a>
      </div>
    </div>,
    document.body,
  );
}
