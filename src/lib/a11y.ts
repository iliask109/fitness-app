import { RefObject, useEffect, useSyncExternalStore } from 'react';

/**
 * Accessibility preferences from the accessibility menu, kept on the device and applied as
 * attributes on <html> (styles.css reads them): text size, high contrast, underlined links,
 * no animations and a plain font.
 */
export interface A11yPrefs { size: 0 | 1 | 2; contrast: boolean; links: boolean; motion: boolean; font: boolean }
const KEY = 'fitlogix:a11y';
const DEFAULTS: A11yPrefs = { size: 0, contrast: false, links: false, motion: false, font: false };

function read(): A11yPrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
}
let prefs: A11yPrefs = typeof localStorage === 'undefined' ? DEFAULTS : read();
const listeners = new Set<() => void>();

export function applyA11y() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.a11ySize = String(prefs.size);
  const flag = (name: string, on: boolean) => { if (on) el.setAttribute(name, ''); else el.removeAttribute(name); };
  flag('data-a11y-contrast', prefs.contrast);
  flag('data-a11y-links', prefs.links);
  flag('data-a11y-motion', prefs.motion);
  flag('data-a11y-font', prefs.font);
}

export function setA11y(patch: Partial<A11yPrefs>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* this session only */ }
  applyA11y();
  listeners.forEach((f) => f());
}
export const resetA11y = () => setA11y(DEFAULTS);
export const isDefaultA11y = (p: A11yPrefs) => JSON.stringify(p) === JSON.stringify(DEFAULTS);

export function useA11y(): A11yPrefs {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => prefs, () => prefs);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour for a dialog (WCAG 2.1.2, 2.4.3): focus moves into it when it opens, Tab stays inside,
 * Escape closes it, and focus returns to the button that opened it.
 */
export function useDialog(ref: RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const items = () => Array.from(box?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((e) => e.offsetParent !== null);
    (items()[0] ?? box)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
