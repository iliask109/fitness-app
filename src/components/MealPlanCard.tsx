import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useTable } from '../lib/useTable';
import { tr, tx } from '../lib/i18n';
import type { BaseRow, Meal, MealType } from '../lib/types';
import { alternatives, itemNutrition, MealPlanRow, PlanItem, planTotals } from '../lib/mealPlan';

const SLOT_LABEL = (slot: MealType) => ({
  breakfast: tr('🍳 בוקר', '🍳 Breakfast'), lunch: tr('🍲 צהריים', '🍲 Lunch'),
  dinner: tr('🍽️ ערב', '🍽️ Dinner'), snack: tr('🍎 נשנוש', '🍎 Snack'),
}[slot]);

/** Name of a plan item as it is logged when eaten: in the user's language, with the portion when it is not 1. */
export const loggedName = (item: PlanItem) => {
  const n = itemNutrition(item);
  if (!n) return '';
  return tx(n.meal.name) + (item.portion !== 1 ? ` ×${item.portion}` : '');
};

/**
 * The daily menu: built from the calorie goal when the user signs up (see UserShell). Each meal can be
 * logged as eaten with one tap, or swapped for another meal with similar calories.
 */
export default function MealPlanCard({ dayMeals, onEat }: { dayMeals: Meal[]; onEat: (slot: MealType, m: Omit<Meal, 'id' | 'date' | 'meal_type'>) => Promise<void> }) {
  const { user } = useAuth();
  const plans = useTable<MealPlanRow & BaseRow>('meal_plans');
  const plan = plans.rows[0];
  const [swapping, setSwapping] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (plans.loading && !plan) return null;
  if (!plan) {
    return plans.error ? null : <div className="card muted small">{tr('התפריט שלך נבנה…', 'Building your menu…')}</div>;
  }
  const totals = planTotals(plan.items);

  async function swap(index: number, item: PlanItem) {
    setError(null);
    try {
      const items = plan.items.map((it, i) => (i === index ? item : it));
      await plans.save({ ...plan, id: plan.id ?? user!.id, items });
      setSwapping(null);
    } catch (e) {
      setError(tr('השמירה נכשלה: ', 'Saving failed: ') + (e as Error).message);
    }
  }

  return (
    <div className="card stack tight meal-plan">
      <div className="row between">
        <h3 style={{ margin: 0 }}>🥗 {tr('התפריט שלי', 'My menu')}</h3>
        <span className="muted small">{totals.kcal} {tr('קק״ל', 'kcal')} · {totals.protein} {tr('ג׳ חלבון', 'g protein')}</span>
      </div>
      {plan.edited_by_admin && <span className="muted small">✏️ {tr('המאמן התאים את התפריט בשבילך', 'Your coach adjusted this menu for you')}</span>}
      {plan.items.map((item, i) => {
        const n = itemNutrition(item);
        if (!n) return null;
        const name = loggedName(item);
        const eaten = dayMeals.some((m) => m.meal_type === item.slot && m.name === name);
        return (
          <div key={item.slot + i} className="plan-item stack tight">
            <div className="row between">
              <span className="muted small">{SLOT_LABEL(item.slot)}</span>
              <span className="muted small">{n.kcal} {tr('קק״ל', 'kcal')} · {tr('ח׳', 'P')} {n.protein}</span>
            </div>
            <strong>{tx(n.meal.name)}{item.portion !== 1 && <span className="muted small"> · <span dir="ltr">×{item.portion}</span> {tr('מנה', 'portion')}</span>}</strong>
            <div className="row gap">
              {eaten
                ? <span className="good small">✓ {tr('נרשם ביומן', 'Logged')}</span>
                : <button className="btn small primary" onClick={() => onEat(item.slot, { name, calories: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat })}>✓ {tr('אכלתי', 'I ate this')}</button>}
              <button className="btn small" onClick={() => setSwapping(swapping === i ? null : i)}>🔄 {swapping === i ? tr('ביטול', 'Cancel') : tr('החלפה', 'Swap')}</button>
            </div>
            {swapping === i && (
              <div className="stack tight swap-list">
                <span className="muted small">{tr('ארוחות דומות בקלוריות:', 'Meals with similar calories:')}</span>
                {alternatives(item).map((alt) => (
                  <button key={alt.meal_id} className="library-row" onClick={() => swap(i, { slot: alt.slot, meal_id: alt.meal_id, portion: alt.portion })}>
                    <span>
                      <span className="library-name">{tx(itemNutrition(alt)!.meal.name)}</span>
                      <span className="muted small">{alt.kcal} {tr('קק״ל', 'kcal')}{alt.portion !== 1 ? ` · ×${alt.portion}` : ''}</span>
                    </span>
                    <span className="muted" aria-hidden>{tr('←', '→')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="notice" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
