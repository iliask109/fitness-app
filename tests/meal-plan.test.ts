import { describe, expect, it } from 'vitest';
import { alternatives, buildPlan, itemNutrition, MEAL_LIBRARY, planTotals, resizePlan, SLOTS } from '../src/lib/mealPlan';
import { CONTENT_EN } from '../src/lib/contentEn';

describe('meal plan', () => {
  it('builds four meals close to the calorie goal, for small and large goals', () => {
    for (const goal of [1400, 1800, 2210, 2800, 3400]) {
      const plan = buildPlan(goal, 'user-' + goal);
      expect(plan.map((p) => p.slot)).toEqual(SLOTS);
      const kcal = planTotals(plan).kcal;
      expect(Math.abs(kcal - goal) / goal, `goal ${goal}: ${kcal}`).toBeLessThan(0.12);
    }
  });
  it('varies between users but is stable for the same user', () => {
    expect(buildPlan(2200, 'a')).toEqual(buildPlan(2200, 'a'));
    const menus = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => buildPlan(2200, s).map((p) => p.meal_id).join()));
    expect(menus.size).toBeGreaterThan(1);
  });
  it('offers swaps from the same meal with similar calories', () => {
    const item = buildPlan(2200, 'x')[1];
    const current = itemNutrition(item)!.kcal;
    const alts = alternatives(item);
    expect(alts.length).toBe(4);
    for (const a of alts) {
      expect(a.slot).toBe(item.slot);
      expect(a.meal_id).not.toBe(item.meal_id);
      expect(Math.abs(a.kcal - current) / current).toBeLessThan(0.3);
    }
  });
  it('re-sizes portions for a new goal, keeping the meals', () => {
    const plan = buildPlan(1800, 'y');
    const bigger = resizePlan(plan, 3000);
    expect(bigger.map((p) => p.meal_id)).toEqual(plan.map((p) => p.meal_id));
    expect(planTotals(bigger).kcal).toBeGreaterThan(planTotals(plan).kcal);
  });
  it('every meal has an English name and every slot has enough choices', () => {
    expect(MEAL_LIBRARY.filter((m) => !CONTENT_EN[m.name]).map((m) => m.name)).toEqual([]);
    for (const s of SLOTS) expect(MEAL_LIBRARY.filter((m) => m.slot === s).length).toBeGreaterThanOrEqual(6);
  });
});
