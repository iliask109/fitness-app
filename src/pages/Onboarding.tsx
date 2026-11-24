import { useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listRows } from '../lib/db';
import { saveToTable } from '../lib/tableStore';
import type { BodyWeight, Profile } from '../lib/types';
import { todayISO } from '../lib/utils';
import { calcNutritionGoals, latestWeight } from '../lib/nutrition';
import {
  EQUIPMENT_BY_LOCATION, EXPERIENCE, FULL_GYM, GOAL_PERIODS, GOALS, LOCATIONS, NO_EQUIPMENT,
} from '../lib/fitnessProfile';

interface Props {
  profile: Profile;
  save: (p: Partial<Profile>) => Promise<unknown>;
  /** Called after a successful save. */
  onDone: () => void;
  /** Editing later from Settings (not the first-time gate). */
  editing?: boolean;
}

/**
 * Training profile. Shown right after sign-up and required before the app can be used;
 * also reachable from Settings to edit the answers.
 */
export default function Onboarding({ profile, save, onDone, editing }: Props) {
  const { user } = useAuth();
  const [height, setHeight] = useState(profile.height_cm ? String(profile.height_cm) : '');
  const [weight, setWeight] = useState('');
  const [experience, setExperience] = useState(profile.experience ?? '');
  const [goal, setGoal] = useState(profile.fitness_goal ?? '');
  const [target, setTarget] = useState(profile.weight_goal ? String(profile.weight_goal) : '');
  const [months, setMonths] = useState<number | null>(profile.goal_months ?? null);
  const [days, setDays] = useState<number | null>(profile.training_days ?? null);
  const [locations, setLocations] = useState<string[]>(profile.training_locations ?? []);
  const [equipment, setEquipment] = useState<string[]>(profile.equipment ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const equipmentOptions = Array.from(new Set([
    ...locations.flatMap((l) => EQUIPMENT_BY_LOCATION[l] ?? []),
    ...equipment.filter((e) => e !== NO_EQUIPMENT),
    NO_EQUIPMENT,
  ]));

  function toggleLocation(key: string) {
    const next = locations.includes(key) ? locations.filter((l) => l !== key) : [...locations, key];
    setLocations(next);
    // A gym has everything: pre-select it, and drop it again when the gym is unselected.
    if (key === 'gym') {
      setEquipment((eq) => next.includes('gym')
        ? [...eq.filter((e) => e !== NO_EQUIPMENT && e !== FULL_GYM), FULL_GYM]
        : eq.filter((e) => e !== FULL_GYM));
    }
  }

  function toggleEquipment(item: string) {
    setEquipment((eq) => {
      if (eq.includes(item)) return eq.filter((e) => e !== item);
      if (item === NO_EQUIPMENT) return [NO_EQUIPMENT];
      return [...eq.filter((e) => e !== NO_EQUIPMENT), item];
    });
  }

  function validate(): string | null {
    const h = Number(height), w = Number(weight);
    if (!height || !Number.isFinite(h) || h < 100 || h > 250) return tr('נא למלא גובה תקין בס״מ (100 עד 250)', 'Please enter a valid height in cm (100 to 250)');
    if (!editing || weight) {
      if (!weight || !Number.isFinite(w) || w < 30 || w > 300) return tr('נא למלא משקל תקין בק״ג (30 עד 300)', 'Please enter a valid weight in kg (30 to 300)');
    }
    if (!experience) return tr('נא לבחור רמת ניסיון', 'Please choose your experience level');
    if (!goal) return tr('נא לבחור מטרה', 'Please choose a goal');
    const t = Number(target);
    if (goal !== 'maintain' && (!target || !Number.isFinite(t) || t < 30 || t > 300)) return tr('נא למלא משקל יעד בק״ג (30 עד 300)', 'Please enter a target weight in kg (30 to 300)');
    if (goal === 'maintain' && target && (!Number.isFinite(t) || t < 30 || t > 300)) return tr('משקל היעד לא תקין (30 עד 300 ק״ג)', 'The target weight is not valid (30 to 300 kg)');
    if (!months) return tr('נא לבחור תוך כמה זמן להגיע ליעד', 'Please choose how long you give yourself to reach the goal');
    if (!days) return tr('נא לבחור כמה ימים בשבוע תתאמן', 'Please choose how many days a week you will train');
    if (!locations.length) return tr('נא לבחור איפה תתאמן', 'Please choose where you will train');
    if (!equipment.length) return tr('נא לבחור ציוד (או "ללא ציוד")', 'Please choose equipment (or "No equipment")');
    return null;
  }

  async function submit() {
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError(null);
    try {
      if (weight) {
        // The weight entered here is also the first point on the body-weight chart.
        // Saved before the profile: saving the profile switches to the home screen, which must already see it.
        const today = todayISO();
        const existing = (await listRows<BodyWeight>(user!.id, 'body_weights')).find((r) => r.date === today);
        await saveToTable<BodyWeight>(user!.id, 'body_weights', { id: existing?.id, date: today, weight: Number(weight) });
      }
      const fields = {
        height_cm: Math.round(Number(height)),
        experience, fitness_goal: goal, training_days: days,
        goal_months: months,
        // A new goal or period starts counting today; an unchanged one keeps its start date.
        goal_start: goal === profile.fitness_goal && months === profile.goal_months && profile.goal_start ? profile.goal_start : todayISO(),
        training_locations: locations, equipment,
        weight_goal: target ? Number(target) : goal === 'maintain' && weight ? Number(weight) : profile.weight_goal ?? null,
        onboarded_at: profile.onboarded_at ?? new Date().toISOString(),
      };
      // Nutrition goals follow the new profile right away (and then every month, see UserShell).
      const bodyWeight = weight ? Number(weight) : latestWeight(await listRows<BodyWeight>(user!.id, 'body_weights'));
      const goals = calcNutritionGoals({ ...profile, ...fields }, bodyWeight);
      await save(goals ? { ...fields, ...goals, nutrition_updated_on: todayISO(), nutrition_weight: bodyWeight } : fields);
      onDone();
    } catch (e) {
      const m = (e as Error).message;
      setError(/column|schema cache/i.test(m)
        ? tr('השמירה נכשלה: מסד הנתונים עוד לא עודכן (update-3-onboarding.sql). פנה למנהל האתר.', 'Saving failed: the database has not been updated yet (update-3-onboarding.sql). Contact the site admin.')
        : tr('השמירה נכשלה: ', 'Saving failed: ') + m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack onboarding">
      <div>
        <h2>{editing ? tr('פרופיל אימון', 'Training profile') : tr(`נעים להכיר${profile.first_name ? `, ${profile.first_name}` : ''}! 👋`, `Nice to meet you${profile.first_name ? `, ${profile.first_name}` : ''}! 👋`)}</h2>
        {!editing && <p className="muted">{tr('עוד כמה פרטים קצרים, ואפשר להתחיל להתאמן.', 'Just a few more details and you can start training.')}</p>}
      </div>

      <section className="card stack tight">
        <h3>{tr('📏 גובה ומשקל', '📏 Height and weight')}</h3>
        <div className="grid2">
          <label>{tr('גובה (ס״מ)', 'Height (cm)')}
            <input type="number" inputMode="numeric" min={100} max={250} placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label>{editing ? tr('משקל נוכחי (לא חובה)', 'Current weight (optional)') : tr('משקל (ק״ג)', 'Weight (kg)')}
            <input type="number" inputMode="decimal" step="0.1" min={30} max={300} placeholder="75" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card stack tight">
        <h3>{tr('🎓 רמת ניסיון', '🎓 Experience')}</h3>
        <div className="options">
          {EXPERIENCE.map((x) => (
            <button key={x.key} className={'option' + (experience === x.key ? ' on' : '')} onClick={() => setExperience(x.key)}>
              <strong>{x.label}</strong><span className="muted small">{x.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>{tr('🎯 מה היעד שלך?', '🎯 What\'s your goal?')}</h3>
        <div className="options three">
          {GOALS.map((g) => (
            <button key={g.key} className={'option centered' + (goal === g.key ? ' on' : '')} onClick={() => setGoal(g.key)}>
              <span className="option-icon">{g.icon}</span><strong>{g.label}</strong><span className="muted small">{g.hint}</span>
            </button>
          ))}
        </div>
        <label>{goal === 'maintain' ? tr('משקל יעד (ק״ג, לא חובה)', 'Target weight (kg, optional)') : tr('משקל יעד (ק״ג)', 'Target weight (kg)')}
          <input type="number" inputMode="decimal" step="0.1" min={30} max={300} placeholder={goal === 'bulk' ? '80' : '70'} value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <h3>{tr('⏳ תוך כמה זמן?', '⏳ In how long?')}</h3>
        <div className="options three">
          {GOAL_PERIODS.map((g) => (
            <button key={g.key} className={'option centered' + (months === g.key ? ' on' : '')} onClick={() => setMonths(g.key)}>
              <strong>{g.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>{tr('📅 ימי אימון בשבוע', '📅 Training days a week')}</h3>
        <div className="day-picker">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d}</button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>{tr('📍 איפה תתאמן?', '📍 Where will you train?')}</h3>
        <p className="muted small">{tr('אפשר לבחור יותר מאחד', 'You can choose more than one')}</p>
        <div className="options three">
          {LOCATIONS.map((l) => (
            <button key={l.key} className={'option centered' + (locations.includes(l.key) ? ' on' : '')} onClick={() => toggleLocation(l.key)}>
              <span className="option-icon">{l.icon}</span><strong>{l.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>{tr('🧰 ציוד זמין', '🧰 Available equipment')}</h3>
        {locations.length === 0 ? <p className="muted small">{tr('בחר קודם איפה תתאמן.', 'First choose where you will train.')}</p> : (
          <div className="chips">
            {equipmentOptions.map((item) => (
              <button key={item} className={'chip btn-chip' + (equipment.includes(item) ? ' selected' : '')} onClick={() => toggleEquipment(item)}>
                {equipment.includes(item) ? '✓ ' : ''}{tx(item)}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className="notice" role="alert">{error}</p>}
      <button className="btn primary big" onClick={submit} disabled={busy}>
        {busy ? tr('שומר…', 'Saving…') : editing ? tr('שמירה', 'Save') : tr('בוא נתחיל! 🚀', 'Let\'s start! 🚀')}
      </button>
    </div>
  );
}
