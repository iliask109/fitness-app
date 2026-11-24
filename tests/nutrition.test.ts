import { describe, expect, it } from 'vitest';
import { calcNutritionGoals, dueNutritionUpdate } from '../src/lib/nutrition';

const base = { height_cm: 180, age: 30, gender: 'male' as const, training_days: 4 };

describe('calcNutritionGoals', () => {
  it('lowers calories for weight loss and raises them for mass', () => {
    const cut = calcNutritionGoals({ ...base, fitness_goal: 'cut' }, 85)!;
    const keep = calcNutritionGoals({ ...base, fitness_goal: 'maintain' }, 85)!;
    const bulk = calcNutritionGoals({ ...base, fitness_goal: 'bulk' }, 85)!;
    expect(keep.calorie_goal).toBe(2840); // (850 + 1125 - 150 + 5) × 1.55 = 2836.5
    expect(cut.calorie_goal).toBe(keep.calorie_goal - 500);
    expect(bulk.calorie_goal).toBe(keep.calorie_goal + 300);
    expect(cut.protein_goal).toBe(170);
  });
  it('macros add up to the calories', () => {
    const g = calcNutritionGoals({ ...base, fitness_goal: 'cut' }, 85)!;
    expect(Math.abs(g.protein_goal * 4 + g.carbs_goal * 4 + g.fat_goal * 9 - g.calorie_goal)).toBeLessThan(20);
  });
  it('needs height and weight', () => {
    expect(calcNutritionGoals({ ...base, height_cm: null }, 80)).toBeNull();
    expect(calcNutritionGoals(base, null)).toBeNull();
  });
});

describe('dueNutritionUpdate', () => {
  const weights = [{ id: 'a', date: '2026-10-01', weight: 90 }, { id: 'b', date: '2026-11-20', weight: 86 }];
  it('recalculates from the latest weight once a month has passed', () => {
    expect(dueNutritionUpdate({ ...base, nutrition_updated_on: '2026-11-01' }, weights, '2026-11-30')).toBeNull();
    const p = dueNutritionUpdate({ ...base, nutrition_updated_on: '2026-11-01' }, weights, '2026-12-01')!;
    expect(p.nutrition_weight).toBe(86);
    expect(p.nutrition_updated_on).toBe('2026-12-01');
  });
  it('calculates when never calculated', () => {
    expect(dueNutritionUpdate(base, weights, '2026-11-24')?.calorie_goal).toBeGreaterThan(0);
  });
});
