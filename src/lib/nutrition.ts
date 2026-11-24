import type { BodyWeight, Profile } from './types';
import { addMonths, currentAge, round, todayISO } from './utils';

export type NutritionGoals = Pick<Profile, 'calorie_goal' | 'protein_goal' | 'carbs_goal' | 'fat_goal'>;

/**
 * Daily calories and macros from body weight, height, age, gender, training days and goal.
 * Mifflin-St Jeor BMR × activity, then −500 kcal to lose weight / +300 for mass;
 * protein per kg by goal, fat 25% of calories, carbs the rest. Null without height or weight.
 */
export function calcNutritionGoals(p: Partial<Profile>, weight: number | null | undefined): NutritionGoals | null {
  if (!weight || !p.height_cm) return null;
  const age = currentAge(p) ?? 30;
  const sex = p.gender === 'male' ? 5 : p.gender === 'female' ? -161 : -78;
  const bmr = 10 * weight + 6.25 * p.height_cm - 5 * age + sex;
  const days = p.training_days ?? 3;
  const activity = days <= 2 ? 1.375 : days <= 4 ? 1.55 : 1.725;
  const goal = p.fitness_goal;
  const minimum = p.gender === 'female' ? 1200 : 1500;
  const calories = Math.max(minimum, bmr * activity + (goal === 'cut' ? -500 : goal === 'bulk' ? 300 : 0));
  const protein = weight * (goal === 'cut' ? 2 : goal === 'bulk' ? 1.8 : 1.6);
  const fat = (calories * 0.25) / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return { calorie_goal: round(calories / 10) * 10, protein_goal: round(protein), carbs_goal: round(carbs), fat_goal: round(fat) };
}

/** The most recent weigh-in. */
export const latestWeight = (weights: BodyWeight[]) =>
  weights.reduce<BodyWeight | null>((a, w) => (!a || w.date > a.date ? w : a), null)?.weight ?? null;

/** Next automatic recalculation (a month after the last one), or null if never calculated. */
export const nextNutritionUpdate = (p: Partial<Profile>) => (p.nutrition_updated_on ? addMonths(p.nutrition_updated_on, 1) : null);

/** Profile fields to save when the goals are due for recalculation (never calculated, or a month has passed); else null. */
export function dueNutritionUpdate(p: Partial<Profile>, weights: BodyWeight[], today = todayISO()): Partial<Profile> | null {
  const next = nextNutritionUpdate(p);
  if (next && next > today) return null;
  const weight = latestWeight(weights);
  const goals = calcNutritionGoals(p, weight);
  return goals ? { ...goals, nutrition_updated_on: today, nutrition_weight: weight } : null;
}
