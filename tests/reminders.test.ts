import { describe, expect, it } from 'vitest';
import { decideReminder, isDue, localNow } from '../src/lib/reminders';
import type { Profile, Program, Workout } from '../src/lib/types';

const ppl: Program = {
  id: 'ppl', name: 'PPL', schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 },
  days: ['Push', 'Pull', 'Legs'].map((n) => ({ name: n, exercises: [{ name: 'סקוואט', sets: 3, reps: 8 }] })),
};
const profile = (x: Partial<Profile> = {}): Profile => ({
  id: 'u', calorie_goal: 0, protein_goal: 0, carbs_goal: 0, fat_goal: 0, water_goal: 0,
  reminder_enabled: true, reminder_time: '18:00', reminder_tz: 'Asia/Jerusalem', active_program_id: 'ppl', ...x,
});
const did = (date: string, day = 0): Workout => ({ id: date, date, name: 'x', exercises: [], program_id: 'ppl', program_day: day });
// Israel is UTC+2 in November: 16:00Z is 18:00 local. 2026-11-23 is a Monday.
const at = (iso: string) => new Date(iso);

describe('when a reminder is due', () => {
  it('only inside the 15 minutes from the chosen time', () => {
    expect(isDue(profile(), at('2026-11-23T15:59:00Z'))).toBe(false);
    expect(isDue(profile(), at('2026-11-23T16:00:00Z'))).toBe(true);
    expect(isDue(profile(), at('2026-11-23T16:14:00Z'))).toBe(true);
    expect(isDue(profile(), at('2026-11-23T16:15:00Z'))).toBe(false);
  });
  it('at most once a day, and never when turned off', () => {
    expect(isDue(profile({ last_reminded_on: '2026-11-23' }), at('2026-11-23T16:00:00Z'))).toBe(false);
    expect(isDue(profile({ reminder_enabled: false }), at('2026-11-23T16:00:00Z'))).toBe(false);
  });
  it('uses the user time zone for the local date', () => {
    expect(localNow(at('2026-11-28T22:30:00Z'), 'Asia/Jerusalem').date).toBe('2026-11-29');
  });
});

describe('what the reminder says', () => {
  it('names the planned workout on a training day', () => {
    const r = decideReminder(profile(), [did('2026-11-22')], [ppl], at('2026-11-23T16:00:00Z'));
    expect(r?.kind).toBe('training_day');
    expect(r?.title).toContain('Pull');
    expect(r?.url).toContain('program=ppl&day=1');
  });
  it('says nothing if already trained today', () => {
    expect(decideReminder(profile(), [did('2026-11-22'), did('2026-11-23', 1)], [ppl], at('2026-11-23T16:00:00Z'))).toBeNull();
  });
  it('"no workout this week" only from Tuesday, and only when the week is empty', () => {
    const noProgram = profile({ active_program_id: null });
    expect(decideReminder(noProgram, [], [], at('2026-11-23T16:00:00Z'))).toBeNull(); // Monday
    expect(decideReminder(noProgram, [], [], at('2026-11-24T16:00:00Z'))?.kind).toBe('no_workout');
    expect(decideReminder(noProgram, [did('2026-11-22')], [], at('2026-11-24T16:00:00Z'))).toBeNull();
  });
  it('respects the two switches', () => {
    expect(decideReminder(profile({ remind_training_day: false, active_program_id: null }), [], [ppl], at('2026-11-25T16:00:00Z'))?.kind).toBe('no_workout');
    expect(decideReminder(profile({ remind_no_workout: false, active_program_id: null }), [], [], at('2026-11-24T16:00:00Z'))).toBeNull();
  });
});
