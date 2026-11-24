import { useSyncExternalStore } from 'react';
import { CONTENT_EN } from './contentEn';

/**
 * Two languages: Hebrew (default, right-to-left) and English (left-to-right).
 * The choice is kept on the device (so the sign-in page already uses it) and on the profile
 * (so push reminders on the server are in the same language). Changing it re-renders the whole app.
 *
 * UI text is written inline as tr('עברית', 'English'). Stored content in Hebrew (exercise names,
 * built-in program names, foods) is translated for display with tx(), from contentEn.ts.
 */
export type Lang = 'he' | 'en';
const KEY = 'fitlogix:lang';

function readStored(): Lang {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'he'; } catch { return 'he'; }
}

let current: Lang = typeof localStorage === 'undefined' ? 'he' : readStored();
const listeners = new Set<() => void>();

export const getLang = () => current;
export const isEn = () => current === 'en';

/** Picks the text for the current language. */
export const tr = (he: string, en: string) => (current === 'en' ? en : he);

/** Translates stored Hebrew content (exercise, program, food names…) when English is on; anything else is returned as is. */
export const tx = (text: string) => (current === 'en' ? CONTENT_EN[text] ?? text : text);

/** Locale for dates and numbers. */
export const locale = () => (current === 'en' ? 'en-GB' : 'he-IL');

export function applyLangToDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'en' ? 'ltr' : 'rtl';
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* private mode: this session only */ }
  applyLangToDocument();
  listeners.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => current, () => current);
}
