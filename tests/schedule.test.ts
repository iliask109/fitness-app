import { describe, expect, it } from 'vitest';
import { describeSchedule, planToday, projectDays, requiredDays } from '../src/lib/schedule';
import type { Program, Workout } from '../src/lib/types';

const day = (name: string) => ({ name, exercises: [{ name: 'סקוואט', sets: 3, reps: 8 }] });
const ppl: Program = { id: 'ppl', name: 'Push / Pull / Legs', days: [day('Push'), day('Pull'), day('Legs')] };
const pplWeekly: Program = { ...ppl, id: 'pplw', schedule: { kind: 'weekly', weekdays: [0, 1, 3, 4], required: 4 } };
const ul: Program = { id: 'ul', name: 'עליון / תחתון', days: [day('עליון'), day('תחתון')] };
const beginner: Program = { id: 'b', name: 'מתחילים: כל הגוף', days: [day('אימון A'), day('אימון B')] };

const done = (p: Program, dayIndex: number, date: string): Workout =>
  ({ id: `${p.id}-${date}`, date, name: p.days[dayIndex].name, exercises: [], program_id: p.id, program_day: dayIndex });
const name = (p: Program, plan: ReturnType<typeof planToday>) =>
  !plan ? null : plan.kind === 'rest' ? 'rest' : `${plan.kind}:${p.days[plan.dayIndex].name}`;

// 2026-11-22 is a Sunday.
describe('cycle schedule (all days, then a rest day)', () => {
  it('starts with the first day', () => {
    expect(name(ppl, planToday(ppl, [], '2026-11-23'))).toBe('train:Push');
  });
  it('push yesterday -> pull today; legs yesterday -> rest; then push again', () => {
    expect(name(ppl, planToday(ppl, [done(ppl, 0, '2026-11-22')], '2026-11-23'))).toBe('train:Pull');
    expect(name(ppl, planToday(ppl, [done(ppl, 2, '2026-11-24')], '2026-11-25'))).toBe('rest');
    expect(name(ppl, planToday(ppl, [done(ppl, 2, '2026-11-24')], '2026-11-26'))).toBe('train:Push');
  });
  it('a missed workout is not skipped', () => {
    expect(name(ppl, planToday(ppl, [done(ppl, 0, '2026-11-22')], '2026-11-25'))).toBe('train:Pull');
  });
  it('upper/lower: upper -> lower -> rest', () => {
    expect(name(ul, planToday(ul, [done(ul, 0, '2026-11-22')], '2026-11-23'))).toBe('train:תחתון');
    expect(name(ul, planToday(ul, [done(ul, 1, '2026-11-22')], '2026-11-23'))).toBe('rest');
  });
  it('reports a workout already done today, and what comes next', () => {
    const plan = planToday(ppl, [done(ppl, 1, '2026-11-23')], '2026-11-23');
    expect(plan).toMatchObject({ kind: 'done', dayIndex: 1, next: { dayIndex: 2, date: '2026-11-24' } });
  });
});

describe('weekly schedule (fixed weekdays, rotating days)', () => {
  it('beginners train Sun/Tue/Thu, alternating A and B', () => {
    expect(describeSchedule(beginner)).toContain('א׳, ג׳, ה׳');
    expect(name(beginner, planToday(beginner, [], '2026-11-22'))).toBe('train:אימון A');
    expect(name(beginner, planToday(beginner, [done(beginner, 0, '2026-11-22')], '2026-11-23'))).toBe('rest');
    expect(name(beginner, planToday(beginner, [done(beginner, 0, '2026-11-22')], '2026-11-24'))).toBe('train:אימון B');
  });
  it('projects the rest of the week on the chosen days', () => {
    const plan = projectDays(pplWeekly, [done(pplWeekly, 0, '2026-11-22')], '2026-11-23', '2026-11-28');
    const summary = Object.entries(plan).map(([d, r]) => `${d.slice(8)}:${r.train ? pplWeekly.days[r.dayIndex].name : '-'}`);
    expect(summary).toEqual(['23:Pull', '24:-', '25:Legs', '26:Push', '27:-', '28:-']);
  });
});

describe('required training days per program', () => {
  it('knows Push/Pull/Legs and Upper/Lower need 4, beginners 3, custom any', () => {
    expect(requiredDays(ppl)).toBe(4);
    expect(requiredDays(ul)).toBe(4);
    expect(requiredDays(beginner)).toBe(3);
    expect(requiredDays({ id: 'c', name: 'שלי', days: [day('יום 1')] })).toBeNull();
    expect(requiredDays(pplWeekly)).toBe(4);
  });
});
