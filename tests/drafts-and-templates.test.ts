import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, DRAFT_TTL_MS, draftProgress, hasProgress, loadDraft, saveDraft } from '../src/lib/workoutDraft';
import { PROGRAM_TEMPLATES } from '../src/lib/templates';
import { ALL_EXERCISES } from '../src/lib/exercises';
import { EXERCISE_GUIDE } from '../src/lib/exerciseGuide';
import { requiredDays } from '../src/lib/schedule';
import type { Program, Workout } from '../src/lib/types';

// Minimal localStorage for the draft functions (tests run in Node).
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0,
} as Storage;

const workout = (doneSets: number): Workout => ({
  id: 'w', date: '2026-11-23', name: 'תחתון',
  exercises: [{ name: 'סקוואט', sets: [0, 1].map((i) => ({ reps: 8, weight: 60, done: i < doneSets })) }, { name: 'לאנג׳ים', sets: [{ reps: 12, weight: 0, done: false }] }],
});

describe('unfinished workout drafts', () => {
  beforeEach(() => mem.clear());
  it('are kept for an hour after the last change, then dropped', () => {
    saveDraft('u', { workout: workout(1), startedAt: 0, updatedAt: 1000 });
    expect(loadDraft('u', 1000 + DRAFT_TTL_MS - 1)?.workout.name).toBe('תחתון');
    expect(loadDraft('u', 1000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(loadDraft('u', 1000)).toBeNull(); // expired drafts are removed
  });
  it('belong to one user and can be cleared', () => {
    saveDraft('u', { workout: workout(1), startedAt: 0, updatedAt: Date.now() });
    expect(loadDraft('other')).toBeNull();
    clearDraft('u');
    expect(loadDraft('u')).toBeNull();
  });
  it('count progress only from completed sets', () => {
    expect(hasProgress(workout(0))).toBe(false);
    expect(hasProgress(workout(1))).toBe(true);
    expect(draftProgress(workout(2))).toEqual({ done: 1, total: 2, sets: 2 });
  });
});

describe('ready-made programs', () => {
  it.each(PROGRAM_TEMPLATES.map((t) => [t.name, t] as const))('%s is complete and consistent', (_n, t) => {
    expect(t.days.length).toBeGreaterThan(0);
    for (const d of t.days) {
      expect(d.exercises.length).toBeGreaterThan(0);
      for (const e of d.exercises) {
        expect(ALL_EXERCISES, `${e.name} missing from the exercise library`).toContain(e.name);
        expect(EXERCISE_GUIDE[e.name], `${e.name} has no guide`).toBeDefined();
      }
    }
    if (t.schedule.kind === 'weekly') {
      expect(t.schedule.weekdays.length).toBe(t.schedule.required);
      expect(requiredDays({ id: 'x', ...t } as Program)).toBe(t.schedule.required);
    }
  });
  it('every exercise in the library has a guide', () => {
    expect(ALL_EXERCISES.filter((n) => !EXERCISE_GUIDE[n])).toEqual([]);
  });
});
