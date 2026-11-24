import { FormEvent, useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { Meal, MealType } from '../lib/types';
import { addDays, formatDate, round, todayISO } from '../lib/utils';
import { QUICK_FOODS } from '../lib/foods';
import MealPlanCard from '../components/MealPlanCard';

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', get label() { return tr('🍳 בוקר', '🍳 Breakfast'); } },
  { key: 'lunch', get label() { return tr('🍲 צהריים', '🍲 Lunch'); } },
  { key: 'dinner', get label() { return tr('🍽️ ערב', '🍽️ Dinner'); } },
  { key: 'snack', get label() { return tr('🍎 נשנושים', '🍎 Snacks'); } },
];

const emptyForm = { name: '', calories: '', protein: '', carbs: '', fat: '' };

export default function Nutrition() {
  const { profile } = useProfile();
  const meals = useTable<Meal>('meals');
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState<MealType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const dayMeals = meals.rows.filter((m) => m.date === date);
  const total = dayMeals.reduce((a, m) => ({
    calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Recently used meals, de-duplicated by name, for one-tap re-adding.
  const recent = Array.from(new Map([...meals.rows].reverse().map((m) => [m.name, m])).values()).slice(0, 8);

  async function addMeal(type: MealType, m: Omit<Meal, 'id' | 'date' | 'meal_type'>) {
    await meals.save({ ...m, date, meal_type: type });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!adding || !form.name.trim()) return;
    await addMeal(adding, {
      name: form.name.trim(), calories: Number(form.calories) || 0, protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0,
    });
    setForm(emptyForm);
    setAdding(null);
  }

  const remaining = profile.calorie_goal - total.calories;

  return (
    <div className="stack">
      <div className="row between">
        <button className="btn small" onClick={() => setDate(addDays(date, -1))} aria-label={tr('יום קודם', 'Previous day')}>{tr('→', '←')}</button>
        <strong>{date === todayISO() ? tr('היום', 'Today') : formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
        <button className="btn small" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()} aria-label={tr('יום הבא', 'Next day')}>{tr('←', '→')}</button>
      </div>

      <div className="card stack tight">
        <div className="row between">
          <span><strong className="big-num">{total.calories}</strong> / {profile.calorie_goal} {tr('קק״ל', 'kcal')}</span>
          <span className={remaining < 0 ? 'over' : 'muted'}>{remaining >= 0 ? tr(`נשארו ${remaining}`, `${remaining} left`) : tr(`חריגה של ${-remaining}`, `${-remaining} over`)}</span>
        </div>
        <Bar value={total.calories} goal={profile.calorie_goal} color="var(--green)" />
        <Macro label={tr('חלבון', 'Protein')} value={total.protein} goal={profile.protein_goal} color="var(--blue)" />
        <Macro label={tr('פחמימות', 'Carbs')} value={total.carbs} goal={profile.carbs_goal} color="var(--amber)" />
        <Macro label={tr('שומן', 'Fat')} value={total.fat} goal={profile.fat_goal} color="var(--pink)" />
      </div>

      <MealPlanCard dayMeals={dayMeals} onEat={addMeal} />

      {MEAL_TYPES.map((mt) => {
        const list = dayMeals.filter((m) => m.meal_type === mt.key);
        const kcal = list.reduce((a, m) => a + m.calories, 0);
        return (
          <div key={mt.key} className="card stack tight">
            <div className="row between">
              <strong>{mt.label}</strong>
              <span className="muted small">{kcal} {tr('קק״ל', 'kcal')}</span>
            </div>
            {list.map((m) => (
              <div key={m.id} className="list-item">
                <div>
                  <div>{tx(m.name)}</div>
                  <div className="muted small">{tr('ח׳', 'P')} {round(m.protein)} · {tr('פ׳', 'C')} {round(m.carbs)} · {tr('ש׳', 'F')} {round(m.fat)}</div>
                </div>
                <div className="row gap">
                  <span>{m.calories}</span>
                  <button className="icon-btn" aria-label={tr('מחיקה', 'Delete')} onClick={() => meals.remove(m.id)}>✕</button>
                </div>
              </div>
            ))}
            {adding === mt.key ? (
              <form onSubmit={submit} className="stack tight">
                <input placeholder={tr('מה אכלת?', 'What did you eat?')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                <div className="grid4">
                  <label>{tr('קלוריות', 'Calories')}<input type="number" inputMode="numeric" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></label>
                  <label>{tr('חלבון', 'Protein')}<input type="number" inputMode="decimal" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></label>
                  <label>{tr('פחמ׳', 'Carbs')}<input type="number" inputMode="decimal" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></label>
                  <label>{tr('שומן', 'Fat')}<input type="number" inputMode="decimal" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} /></label>
                </div>
                <div className="row gap">
                  <button className="btn primary grow">{tr('הוספה', 'Add')}</button>
                  <button type="button" className="btn" onClick={() => setAdding(null)}>{tr('ביטול', 'Cancel')}</button>
                </div>
                <div className="muted small">{tr('הוספה מהירה:', 'Quick add:')}</div>
                <div className="chips">
                  {recent.map((m) => (
                    <button type="button" key={'r' + m.id} className="chip btn-chip recent"
                      onClick={() => { addMeal(mt.key, { name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }); setAdding(null); }}>
                      ↺ {tx(m.name)}
                    </button>
                  ))}
                  {QUICK_FOODS.map(([name, calories, protein, carbs, fat]) => (
                    <button type="button" key={name} className="chip btn-chip"
                      onClick={() => setForm({ name: tx(name), calories: String(calories), protein: String(protein), carbs: String(carbs), fat: String(fat) })}>
                      {tx(name)}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <button className="btn dashed small" onClick={() => { setAdding(mt.key); setForm(emptyForm); }}>{tr('+ הוספה', '+ Add')}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Bar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return <div className="bar"><div style={{ width: pct + '%', background: value > goal ? 'var(--red)' : color }} /></div>;
}
function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div className="row between small"><span>{label}</span><span className="muted">{round(value)} / {goal} {tr('ג׳', 'g')}</span></div>
      <Bar value={value} goal={goal} color={color} />
    </div>
  );
}
