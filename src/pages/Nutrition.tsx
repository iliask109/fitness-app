import { tr } from '../lib/i18n';
import { useProfile } from '../lib/useProfile';
import MealPlanCard from '../components/MealPlanCard';

/**
 * Nutrition: what the user should eat each day — the daily targets (calculated from body weight,
 * see lib/nutrition.ts) and the suggested menu, whose meals can be swapped. Nothing is logged here.
 */
export default function Nutrition() {
  const { profile } = useProfile();
  const targets = [
    { label: tr('קלוריות', 'Calories'), value: profile.calorie_goal, unit: tr('קק״ל', 'kcal') },
    { label: tr('חלבון', 'Protein'), value: profile.protein_goal, unit: tr('ג׳', 'g') },
    { label: tr('פחמימות', 'Carbs'), value: profile.carbs_goal, unit: tr('ג׳', 'g') },
    { label: tr('שומן', 'Fat'), value: profile.fat_goal, unit: tr('ג׳', 'g') },
  ];

  return (
    <div className="stack">
      <h2>{tr('תזונה', 'Nutrition')}</h2>
      <div className="card stack tight">
        <h3 style={{ margin: 0 }}>🎯 {tr('היעד היומי שלי', 'My daily targets')}</h3>
        <div className="grid4 nutrition-goals">
          {targets.map((x) => (
            <div key={x.label} className="stat">
              <span className="stat-num">{x.value}</span>
              <span className="muted small">{x.unit} {x.label}</span>
            </div>
          ))}
        </div>
        <span className="muted small">{tr('מחושב לפי המשקל שלך ומתעדכן אוטומטית כל חודש.', 'Calculated from your weight and updated automatically every month.')}</span>
      </div>
      <MealPlanCard />
    </div>
  );
}
