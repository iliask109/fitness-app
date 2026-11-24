import type { MealType } from './types';

/** A meal in the library, for one standard portion. Values are approximate. */
export interface MealOption { id: string; slot: MealType; name: string; kcal: number; protein: number; carbs: number; fat: number }

/** One meal of the daily plan: which meal, and how many portions of it (sized to the calorie goal). */
export interface PlanItem { slot: MealType; meal_id: string; portion: number }

export interface MealPlanRow {
  id: string;
  items: PlanItem[];
  calorie_goal?: number | null;
  edited_by_admin?: boolean;
  created_at?: string;
}

export const MEAL_LIBRARY: MealOption[] = [
  // ---------- Breakfast ----------
  { id: 'b-omelet', slot: 'breakfast', name: 'חביתה מ-2 ביצים, 2 פרוסות לחם מלא וסלט', kcal: 420, protein: 22, carbs: 35, fat: 20 },
  { id: 'b-oats', slot: 'breakfast', name: 'דייסת שיבולת שועל עם חלב, בננה וכף חמאת בוטנים', kcal: 480, protein: 18, carbs: 68, fat: 15 },
  { id: 'b-yogurt', slot: 'breakfast', name: 'יוגורט חלבון עם גרנולה ופירות יער', kcal: 360, protein: 26, carbs: 48, fat: 7 },
  { id: 'b-cottage', slot: 'breakfast', name: 'קוטג׳ 5%, 2 פרוסות לחם מלא וירקות', kcal: 390, protein: 30, carbs: 38, fat: 12 },
  { id: 'b-shakshuka', slot: 'breakfast', name: 'שקשוקה מ-2 ביצים עם פיתה', kcal: 510, protein: 23, carbs: 62, fat: 18 },
  { id: 'b-tuna-toast', slot: 'breakfast', name: 'טוסט מלא עם טונה וגבינה צהובה', kcal: 430, protein: 34, carbs: 36, fat: 16 },
  { id: 'b-smoothie', slot: 'breakfast', name: 'שייק חלבון עם בננה, שיבולת שועל וחלב', kcal: 450, protein: 35, carbs: 58, fat: 8 },
  { id: 'b-avocado', slot: 'breakfast', name: '2 ביצים קשות, אבוקדו ולחם מלא', kcal: 470, protein: 20, carbs: 32, fat: 28 },

  // ---------- Lunch ----------
  { id: 'l-chicken-rice', slot: 'lunch', name: 'חזה עוף, אורז וירקות מוקפצים', kcal: 620, protein: 48, carbs: 70, fat: 14 },
  { id: 'l-beef-potato', slot: 'lunch', name: 'קציצות בקר ברוטב עגבניות עם תפוחי אדמה', kcal: 680, protein: 40, carbs: 60, fat: 30 },
  { id: 'l-salmon-quinoa', slot: 'lunch', name: 'סלמון בתנור עם קינואה וסלט', kcal: 650, protein: 42, carbs: 50, fat: 28 },
  { id: 'l-turkey-pasta', slot: 'lunch', name: 'פסטה מלאה ברוטב בולונז הודו', kcal: 640, protein: 42, carbs: 78, fat: 16 },
  { id: 'l-schnitzel', slot: 'lunch', name: 'שניצל אפוי, פירה וסלט ירקות', kcal: 700, protein: 44, carbs: 64, fat: 28 },
  { id: 'l-lentils', slot: 'lunch', name: 'מג׳דרה עם יוגורט וסלט', kcal: 560, protein: 22, carbs: 86, fat: 13 },
  { id: 'l-chicken-wrap', slot: 'lunch', name: 'טורטייה מלאה עם עוף בגריל וחומוס', kcal: 590, protein: 42, carbs: 58, fat: 20 },
  { id: 'l-tofu-bowl', slot: 'lunch', name: 'קערת טופו, אורז מלא, אדממה וירקות', kcal: 580, protein: 30, carbs: 72, fat: 18 },

  // ---------- Dinner ----------
  { id: 'd-tuna-salad', slot: 'dinner', name: 'סלט טונה עם ביצה, תפוח אדמה וירקות', kcal: 480, protein: 38, carbs: 34, fat: 20 },
  { id: 'd-chicken-sweet', slot: 'dinner', name: 'פרגיות בגריל עם בטטה בתנור', kcal: 560, protein: 42, carbs: 46, fat: 22 },
  { id: 'd-omelet-veg', slot: 'dinner', name: 'חביתת ירק מ-3 ביצים עם גבינה לבנה ולחם', kcal: 470, protein: 32, carbs: 30, fat: 24 },
  { id: 'd-fish-veg', slot: 'dinner', name: 'פילה דג לבן עם אורז וירקות מאודים', kcal: 500, protein: 40, carbs: 55, fat: 10 },
  { id: 'd-hummus-plate', slot: 'dinner', name: 'צלחת חומוס עם ביצה קשה, פיתה וסלט', kcal: 590, protein: 24, carbs: 70, fat: 24 },
  { id: 'd-cottage-plate', slot: 'dinner', name: 'קוטג׳, טונה, ירקות ו-2 פרוסות לחם', kcal: 450, protein: 44, carbs: 36, fat: 14 },
  { id: 'd-beef-stirfry', slot: 'dinner', name: 'מוקפץ בקר עם נודלס וירקות', kcal: 620, protein: 38, carbs: 66, fat: 22 },
  { id: 'd-soup', slot: 'dinner', name: 'מרק עדשים עם לחם מלא וגבינה', kcal: 430, protein: 24, carbs: 58, fat: 11 },

  // ---------- Snacks ----------
  { id: 's-yogurt', slot: 'snack', name: 'יוגורט חלבון', kcal: 120, protein: 20, carbs: 8, fat: 0 },
  { id: 's-banana-pb', slot: 'snack', name: 'בננה עם כף חמאת בוטנים', kcal: 200, protein: 5, carbs: 30, fat: 8 },
  { id: 's-almonds', slot: 'snack', name: 'חופן שקדים ותפוח', kcal: 260, protein: 7, carbs: 31, fat: 15 },
  { id: 's-shake', slot: 'snack', name: 'שייק חלבון במים', kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 's-cottage-crackers', slot: 'snack', name: 'קוטג׳ עם פריכיות אורז', kcal: 210, protein: 18, carbs: 22, fat: 5 },
  { id: 's-eggs', slot: 'snack', name: '2 ביצים קשות וירקות', kcal: 170, protein: 13, carbs: 5, fat: 10 },
  { id: 's-bar', slot: 'snack', name: 'חטיף חלבון', kcal: 200, protein: 20, carbs: 20, fat: 7 },
  { id: 's-fruit-cheese', slot: 'snack', name: 'פרי ו-2 פרוסות גבינה צהובה 9%', kcal: 190, protein: 13, carbs: 20, fat: 7 },
];

export const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
/** Share of the daily calories for each meal. */
export const SLOT_SHARE: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
export const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const mealById = (id: string) => MEAL_LIBRARY.find((m) => m.id === id);
export const slotTarget = (slot: MealType, calorieGoal: number) => calorieGoal * SLOT_SHARE[slot];

/** The portion that brings a meal closest to a calorie target. */
export function bestPortion(meal: MealOption, target: number) {
  return PORTIONS.reduce((best, p) => (Math.abs(meal.kcal * p - target) < Math.abs(meal.kcal * best - target) ? p : best), 1);
}

/** Calories and macros of a plan item (meal × portion), rounded. */
export function itemNutrition(item: PlanItem) {
  const m = mealById(item.meal_id);
  if (!m) return null;
  const r = (n: number) => Math.round(n * item.portion);
  return { meal: m, kcal: r(m.kcal), protein: r(m.protein), carbs: r(m.carbs), fat: r(m.fat) };
}

export function planTotals(items: PlanItem[]) {
  return items.reduce((a, it) => {
    const n = itemNutrition(it);
    return n ? { kcal: a.kcal + n.kcal, protein: a.protein + n.protein, carbs: a.carbs + n.carbs, fat: a.fat + n.fat } : a;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

/** A stable small number from a string, so different users get different (but repeatable) menus. */
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * A daily plan for a calorie goal: for each meal, one of the meals that fit its share of the calories best
 * (preferring a normal portion), varied between users by `seed`.
 */
export function buildPlan(calorieGoal: number, seed = ''): PlanItem[] {
  return SLOTS.map((slot) => {
    const target = slotTarget(slot, calorieGoal);
    const ranked = MEAL_LIBRARY.filter((m) => m.slot === slot)
      .map((m) => { const portion = bestPortion(m, target); return { m, portion, score: Math.abs(m.kcal * portion - target) + Math.abs(portion - 1) * 60 }; })
      .sort((a, b) => a.score - b.score);
    const pick = ranked[hash(seed + slot) % Math.min(3, ranked.length)];
    return { slot, meal_id: pick.m.id, portion: pick.portion };
  });
}

/** Same meals, portions re-sized for a new calorie goal. */
export const resizePlan = (items: PlanItem[], calorieGoal: number): PlanItem[] =>
  items.map((it) => { const m = mealById(it.meal_id); return m ? { ...it, portion: bestPortion(m, slotTarget(it.slot, calorieGoal)) } : it; });

/** Other meals for the same slot with similar calories (each at its best portion), closest first. */
export function alternatives(item: PlanItem, count = 4) {
  const current = itemNutrition(item);
  if (!current) return [];
  return MEAL_LIBRARY.filter((m) => m.slot === item.slot && m.id !== item.meal_id)
    .map((m) => { const portion = bestPortion(m, current.kcal); return { slot: item.slot, meal_id: m.id, portion, kcal: Math.round(m.kcal * portion) }; })
    .sort((a, b) => Math.abs(a.kcal - current.kcal) - Math.abs(b.kcal - current.kcal))
    .slice(0, count);
}
