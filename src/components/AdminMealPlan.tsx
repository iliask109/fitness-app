import { useEffect, useState } from 'react';
import { listRows, saveRow } from '../lib/db';
import type { BaseRow, MealType } from '../lib/types';
import { buildPlan, MEAL_LIBRARY, MealPlanRow, PlanItem, PORTIONS, itemNutrition, planTotals } from '../lib/mealPlan';

const SLOT_HE: Record<MealType, string> = { breakfast: '🍳 בוקר', lunch: '🍲 צהריים', dinner: '🍽️ ערב', snack: '🍎 נשנוש' };

/** Admin: see and change a user's daily menu (meal and portion for each meal). */
export default function AdminMealPlan({ uid, calorieGoal }: { uid: string; calorieGoal: number }) {
  const [plan, setPlan] = useState<(MealPlanRow & BaseRow) | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRows<MealPlanRow & BaseRow>(uid, 'meal_plans')
      .then((rows) => { setPlan(rows[0] ?? null); setItems(rows[0]?.items ?? buildPlan(calorieGoal, uid)); })
      .catch((e) => setMsg({ ok: false, text: /could not find the table|does not exist/i.test((e as Error).message) ? 'צריך להריץ את update-14-meal-plan-and-messages.sql' : (e as Error).message }));
  }, [uid, calorieGoal]);

  const set = (i: number, patch: Partial<PlanItem>) => { setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it))); setMsg(null); };
  const totals = planTotals(items);

  async function save(next: PlanItem[], byAdmin: boolean) {
    setBusy(true);
    try {
      const row = await saveRow<MealPlanRow & BaseRow>(uid, 'meal_plans', { ...plan, id: plan?.id ?? uid, items: next, calorie_goal: calorieGoal, edited_by_admin: byAdmin });
      setPlan(row);
      setItems(next);
      setMsg({ ok: true, text: byAdmin ? '✓ התפריט נשמר. המשתמש יראה אותו בפעם הבאה שייכנס לתזונה.' : '✓ התפריט נבנה מחדש לפי יעד הקלוריות.' });
    } catch (e) {
      setMsg({ ok: false, text: 'השמירה נכשלה: ' + (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack tight">
      <div className="row between">
        <h3 style={{ margin: 0 }}>🥗 תפריט יומי</h3>
        <span className={'small ' + (Math.abs(totals.kcal - calorieGoal) > calorieGoal * 0.1 ? 'over' : 'muted')}>{totals.kcal} / {calorieGoal} קק״ל · {totals.protein} ג׳ חלבון</span>
      </div>
      {!plan && <span className="muted small">למשתמש עוד אין תפריט שמור. זו הצעה לפי יעד הקלוריות שלו.</span>}
      {plan?.edited_by_admin && <span className="muted small">✏️ נערך על ידי מנהל (לא מתעדכן אוטומטית כשהיעד משתנה)</span>}
      {items.map((it, i) => {
        const n = itemNutrition(it);
        return (
          <div key={it.slot + i} className="admin-plan-row">
            <span className="small">{SLOT_HE[it.slot]}</span>
            <select value={it.meal_id} onChange={(e) => set(i, { meal_id: e.target.value })} aria-label={'ארוחה: ' + SLOT_HE[it.slot]}>
              {MEAL_LIBRARY.filter((m) => m.slot === it.slot).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.kcal})</option>)}
            </select>
            <select value={it.portion} onChange={(e) => set(i, { portion: Number(e.target.value) })} aria-label="מנות">
              {PORTIONS.map((p) => <option key={p} value={p}>×{p}</option>)}
            </select>
            <span className="muted small">{n?.kcal ?? '–'} קק״ל</span>
          </div>
        );
      })}
      {msg && <p className={msg.ok ? 'good small' : 'notice'} style={{ margin: 0 }}>{msg.text}</p>}
      <div className="row gap">
        <button className="btn primary grow" disabled={busy} onClick={() => save(items, true)}>שמירת התפריט</button>
        <button className="btn" disabled={busy} onClick={() => save(buildPlan(calorieGoal, uid), false)}>בנייה מחדש</button>
      </div>
    </div>
  );
}
