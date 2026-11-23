import { useEffect, useState } from 'react';

/** "auto" follows the device; "light"/"dark" are the user's explicit choice, saved on this device. */
export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'fitlogix:theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'auto') delete root.dataset.theme;
  else root.dataset.theme = choice;
  const dark = choice === 'dark' || (choice === 'auto' && media().matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E1613' : '#EDF5F0');
}

const listeners = new Set<(c: ThemeChoice) => void>();

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch { /* still applied for this visit */ }
  apply(choice);
  listeners.forEach((l) => l(choice));
}

/** Current choice and whether the screen is dark right now; shared by every component that uses it. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read);
  const [systemDark, setSystemDark] = useState(() => media().matches);
  useEffect(() => {
    listeners.add(setChoice);
    const m = media();
    const onChange = () => { setSystemDark(m.matches); apply(read()); };
    m.addEventListener('change', onChange);
    apply(read());
    return () => { listeners.delete(setChoice); m.removeEventListener('change', onChange); };
  }, []);
  const isDark = choice === 'dark' || (choice === 'auto' && systemDark);
  return { choice, isDark, setTheme };
}
