import { FormEvent, useState } from 'react';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { Meal, MealType } from '../lib/types';
import { addDays, formatDate, round, todayISO } from '../lib/utils';
import { QUICK_FOODS } from '../lib/foods';

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '🍳 בוקר' },
  { key: 'lunch', label: '🍲 צהריים' },
  { key: 'dinner', label: '🍽️ ערב' },
  { key: 'snack', label: '🍎 נשנושים' },
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
        <button className="btn small" onClick={() => setDate(addDays(date, -1))}>→</button>
        <strong>{date === todayISO() ? 'היום' : formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
        <button className="btn small" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayISO()}>←</button>
      </div>

      <div className="card stack tight">
        <div className="row between">
          <span><strong className="big-num">{total.calories}</strong> / {profile.calorie_goal} קק״ל</span>
          <span className={remaining < 0 ? 'over' : 'muted'}>{remaining >= 0 ? `נשארו ${remaining}` : `חריגה של ${-remaining}`}</span>
        </div>
        <Bar value={total.calories} goal={profile.calorie_goal} color="var(--green)" />
        <Macro label="חלבון" value={total.protein} goal={profile.protein_goal} color="var(--blue)" />
        <Macro label="פחמימות" value={total.carbs} goal={profile.carbs_goal} color="var(--amber)" />
        <Macro label="שומן" value={total.fat} goal={profile.fat_goal} color="var(--pink)" />
      </div>

      {MEAL_TYPES.map((mt) => {
        const list = dayMeals.filter((m) => m.meal_type === mt.key);
        const kcal = list.reduce((a, m) => a + m.calories, 0);
        return (
          <div key={mt.key} className="card stack tight">
            <div className="row between">
              <strong>{mt.label}</strong>
              <span className="muted small">{kcal} קק״ל</span>
            </div>
            {list.map((m) => (
              <div key={m.id} className="list-item">
                <div>
                  <div>{m.name}</div>
                  <div className="muted small">ח׳ {round(m.protein)} · פ׳ {round(m.carbs)} · ש׳ {round(m.fat)}</div>
                </div>
                <div className="row gap">
                  <span>{m.calories}</span>
                  <button className="icon-btn" aria-label="מחיקה" onClick={() => meals.remove(m.id)}>✕</button>
                </div>
              </div>
            ))}
            {adding === mt.key ? (
              <form onSubmit={submit} className="stack tight">
                <input placeholder="מה אכלת?" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                <div className="grid4">
                  <label>קלוריות<input type="number" inputMode="numeric" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></label>
                  <label>חלבון<input type="number" inputMode="decimal" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></label>
                  <label>פחמ׳<input type="number" inputMode="decimal" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></label>
                  <label>שומן<input type="number" inputMode="decimal" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} /></label>
                </div>
                <div className="row gap">
                  <button className="btn primary grow">הוספה</button>
                  <button type="button" className="btn" onClick={() => setAdding(null)}>ביטול</button>
                </div>
                <div className="muted small">הוספה מהירה:</div>
                <div className="chips">
                  {recent.map((m) => (
                    <button type="button" key={'r' + m.id} className="chip btn-chip recent"
                      onClick={() => { addMeal(mt.key, { name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }); setAdding(null); }}>
                      ↺ {m.name}
                    </button>
                  ))}
                  {QUICK_FOODS.map(([name, calories, protein, carbs, fat]) => (
                    <button type="button" key={name} className="chip btn-chip"
                      onClick={() => setForm({ name, calories: String(calories), protein: String(protein), carbs: String(carbs), fat: String(fat) })}>
                      {name}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <button className="btn dashed small" onClick={() => { setAdding(mt.key); setForm(emptyForm); }}>+ הוספה</button>
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
      <div className="row between small"><span>{label}</span><span className="muted">{round(value)} / {goal} ג׳</span></div>
      <Bar value={value} goal={goal} color={color} />
    </div>
  );
}
