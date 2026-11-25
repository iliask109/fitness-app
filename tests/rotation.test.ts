import { describe, expect, it } from 'vitest';
import { planToday } from '../src/lib/schedule';
import type { Program, Workout } from '../src/lib/types';

// Push / Pull / Legs on Sunday, Monday, Wednesday and Thursday (Sunday = 0).
const ppl: Program = {
  id: 'ppl', name: 'Push / Pull / Legs',
  days: [{ name: 'Push', exercises: [] }, { name: 'Pull', exercises: [] }, { name: 'Legs', exercises: [] }],
  schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
} as Program;
const done = (date: string, day: number): Workout => ({ id: date, date, name: ppl.days[day].name, exercises: [], program_id: 'ppl', program_day: day, created_at: date + 'T18:00:00Z' } as Workout);
const today = (date: string, history: Workout[]) => {
  const p = planToday(ppl, history, date);
  return p?.kind === 'train' ? ppl.days[p.dayIndex].name : p?.kind;
};

describe('Push / Pull / Legs rotation across weeks', () => {
  // Week 1: Sun 22 Nov … Thu 26 Nov 2026.
  const week1 = [done('2026-11-22', 0), done('2026-11-23', 1), done('2026-11-25', 2), done('2026-11-26', 0)];

  it('the next week starts where the last one stopped, and the week after moves on again', () => {
    expect(today('2026-11-29', week1)).toBe('Pull'); // week 2 starts with Pull
    const week2 = [...week1, done('2026-11-29', 1), done('2026-11-30', 2), done('2026-12-02', 0), done('2026-12-03', 1)];
    expect(today('2026-12-06', week2)).toBe('Legs'); // week 3 starts with Legs
  });

  it('a missed workout is not skipped: it moves to the next training day', () => {
    const history = [done('2026-11-22', 0)]; // Push on Sunday, Monday missed
    expect(today('2026-11-24', history)).toBe('rest'); // Tuesday is not a training day
    expect(today('2026-11-25', history)).toBe('Pull'); // Wednesday: still Pull
  });

  it('rest days in between do not change the order', () => {
    expect(today('2026-11-28', week1)).toBe('rest'); // Saturday
  });
});
