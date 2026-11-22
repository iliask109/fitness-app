import { EXERCISE_GROUPS } from './exercises';
import type { ProgramDay } from './types';

export type DayStyleKey = 'upper' | 'lower' | 'push' | 'pull' | 'full' | 'core' | 'other';

export const DAY_STYLES: Record<DayStyleKey, { label: string; icon: string; color: string }> = {
  upper: { label: 'פלג גוף עליון', icon: '💪', color: 'var(--blue)' },
  lower: { label: 'פלג גוף תחתון', icon: '🦵', color: 'var(--green)' },
  push: { label: 'דחיפה', icon: '🏋️', color: 'var(--amber)' },
  pull: { label: 'משיכה', icon: '🧗', color: 'var(--purple)' },
  full: { label: 'כל הגוף', icon: '⚡', color: 'var(--pink)' },
  core: { label: 'בטן וליבה', icon: '🔥', color: 'var(--cyan)' },
  other: { label: 'אימון', icon: '📋', color: 'var(--muted)' },
};

const NAME_RULES: [RegExp, DayStyleKey][] = [
  [/עליון|upper/i, 'upper'],
  [/תחתון|רגליים|lower|legs?\b/i, 'lower'],
  [/דחיפה|push/i, 'push'],
  [/משיכה|pull/i, 'pull'],
  [/כל הגוף|full/i, 'full'],
  [/בטן|ליבה|core|abs/i, 'core'],
];

const GROUP_OF = new Map(Object.entries(EXERCISE_GROUPS).flatMap(([g, list]) => list.map((n) => [n, g] as const)));

/** Style of a training day: from its name when it says, otherwise from which muscles its exercises train. */
export function dayStyle(day: ProgramDay): DayStyleKey {
  for (const [re, key] of NAME_RULES) if (re.test(day.name)) return key;

  const count: Record<string, number> = {};
  for (const ex of day.exercises) {
    const g = GROUP_OF.get(ex.name);
    if (g) count[g] = (count[g] ?? 0) + 1;
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) return 'other';
  const share = (...groups: string[]) => groups.reduce((a, g) => a + (count[g] ?? 0), 0) / total;

  if (share('רגליים') >= 0.6) return 'lower';
  if (share('בטן') >= 0.6) return 'core';
  if (share('רגליים') >= 0.2 && share('חזה', 'גב', 'כתפיים', 'ידיים') >= 0.3) return 'full';
  if (share('חזה', 'כתפיים') >= 0.6) return 'push';
  if (share('גב') >= 0.5) return 'pull';
  if (share('חזה', 'גב', 'כתפיים', 'ידיים') >= 0.6) return 'upper';
  return 'full';
}

/** Rough session length: about 2.5 minutes per set including rest. */
export const estimateMinutes = (day: ProgramDay) =>
  Math.max(10, Math.round((day.exercises.reduce((a, e) => a + e.sets, 0) * 2.5) / 5) * 5);
