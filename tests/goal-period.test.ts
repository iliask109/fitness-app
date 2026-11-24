import { describe, expect, it } from 'vitest';
import { goalEndDate } from '../src/lib/fitnessProfile';

describe('goalEndDate', () => {
  it('adds the goal period to the start date', () => {
    expect(goalEndDate({ goal_months: 3, goal_start: '2026-11-24' })).toBe('2027-02-24');
    expect(goalEndDate({ goal_months: 6, goal_start: '2026-11-24' })).toBe('2027-05-24');
    expect(goalEndDate({ goal_months: 12, goal_start: '2026-11-24' })).toBe('2027-11-24');
  });
  it('clamps to the end of a shorter month', () => {
    expect(goalEndDate({ goal_months: 6, goal_start: '2026-08-31' })).toBe('2027-02-28');
  });
  it('falls back to the onboarding day, and is null without a period', () => {
    expect(goalEndDate({ goal_months: 3, onboarded_at: '2026-01-10T08:00:00Z' })).toBe('2026-04-10');
    expect(goalEndDate({ goal_start: '2026-01-10' })).toBeNull();
  });
});
