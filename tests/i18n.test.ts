import { afterEach, describe, expect, it } from 'vitest';
import { ALL_EXERCISES, EXERCISE_GROUPS } from '../src/lib/exercises';
import { PROGRAM_TEMPLATES } from '../src/lib/templates';
import { QUICK_FOODS } from '../src/lib/foods';
import { EQUIPMENT_BY_LOCATION, GOALS } from '../src/lib/fitnessProfile';
import { CONTENT_EN } from '../src/lib/contentEn';
import { EXERCISE_EQUIPMENT_EN, EXERCISE_GUIDE_EN } from '../src/lib/exerciseGuideEn';
import { EXERCISE_GUIDE } from '../src/lib/exerciseGuide';
import { setLang, tr, tx } from '../src/lib/i18n';
import { decideReminder } from '../src/lib/reminders';
import type { Profile, Program } from '../src/lib/types';

const mem = new Map<string, string>();
globalThis.localStorage ??= {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0,
} as Storage;

describe('English content', () => {
  afterEach(() => setLang('he'));

  it('every exercise, group, built-in program, food and equipment item has an English name', () => {
    const texts = [
      ...ALL_EXERCISES, ...Object.keys(EXERCISE_GROUPS),
      ...PROGRAM_TEMPLATES.flatMap((t) => [t.name, t.description, t.equipment, ...t.days.map((d) => d.name)]),
      ...QUICK_FOODS.map(([name]) => name),
      ...Object.values(EQUIPMENT_BY_LOCATION).flat(),
    ];
    expect([...new Set(texts)].filter((t) => /[א-ת]/.test(t) && !CONTENT_EN[t])).toEqual([]);
  });

  it('every exercise guide has a full English version', () => {
    for (const n of ALL_EXERCISES) {
      const he = EXERCISE_GUIDE[n], en = EXERCISE_GUIDE_EN[n];
      expect(en, n).toBeDefined();
      expect(en.steps.length, n).toBe(he.steps.length);
      expect(en.tips.length, n).toBe(he.tips.length);
      expect(en.avoid.length, n).toBe(he.avoid.length);
      expect(EXERCISE_EQUIPMENT_EN[n], n).toBeDefined();
      expect(JSON.stringify(en) + EXERCISE_EQUIPMENT_EN[n], n).not.toMatch(/[א-ת]/);
    }
  });

  it('tr / tx follow the chosen language and labels switch with it', () => {
    expect(tr('שלום', 'Hello')).toBe('שלום');
    expect(tx('סקוואט')).toBe('סקוואט');
    expect(GOALS[1].label).toBe('ירידה במשקל');
    setLang('en');
    expect(tr('שלום', 'Hello')).toBe('Hello');
    expect(tx('סקוואט')).toBe('Barbell squat');
    expect(tx('my own exercise')).toBe('my own exercise');
    expect(GOALS[1].label).toBe('Lose weight');
  });
});

describe('reminders language', () => {
  const program: Program = { id: 'p', name: 'x', days: [{ name: 'Legs: רגליים', exercises: [{ name: 'סקוואט', sets: 3, reps: 5 }] }], schedule: { kind: 'cycle', pattern: [0] } } as Program;
  const base = { id: 'u', reminder_enabled: true, reminder_time: '18:00', reminder_tz: 'UTC', active_program_id: 'p' } as unknown as Profile;
  const now = new Date('2026-11-24T18:05:00Z');
  it('writes Hebrew by default and English when the profile says so', () => {
    const he = decideReminder(base, [], [program], now)!;
    expect(he.title).toContain('היום יש לך אימון');
    expect(he.dir).toBe('rtl');
    const en = decideReminder({ ...base, language: 'en' }, [], [program], now)!;
    expect(en.title).toBe('💪 Workout today: Legs');
    expect(en.lang).toBe('en');
    expect(en.dir).toBe('ltr');
  });
});
