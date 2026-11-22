import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { listRows, saveRow } from '../lib/db';
import type { BodyWeight, Profile } from '../lib/types';
import { todayISO } from '../lib/utils';
import {
  EQUIPMENT_BY_LOCATION, EXPERIENCE, FULL_GYM, GOALS, LOCATIONS, NO_EQUIPMENT,
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
    if (!height || !Number.isFinite(h) || h < 100 || h > 250) return 'נא למלא גובה תקין בס״מ (100 עד 250)';
    if (!editing || weight) {
      if (!weight || !Number.isFinite(w) || w < 30 || w > 300) return 'נא למלא משקל תקין בק״ג (30 עד 300)';
    }
    if (!experience) return 'נא לבחור רמת ניסיון';
    if (!goal) return 'נא לבחור מטרה';
    if (!days) return 'נא לבחור כמה ימים בשבוע תתאמן';
    if (!locations.length) return 'נא לבחור איפה תתאמן';
    if (!equipment.length) return 'נא לבחור ציוד (או "ללא ציוד")';
    return null;
  }

  async function submit() {
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError(null);
    try {
      await save({
        height_cm: Math.round(Number(height)),
        experience, fitness_goal: goal, training_days: days,
        training_locations: locations, equipment,
        onboarded_at: profile.onboarded_at ?? new Date().toISOString(),
      });
      if (weight) {
        // The weight entered here is also the first point on the body-weight chart.
        const today = todayISO();
        const existing = (await listRows<BodyWeight>(user!.id, 'body_weights')).find((r) => r.date === today);
        await saveRow<BodyWeight>(user!.id, 'body_weights', { id: existing?.id, date: today, weight: Number(weight) });
      }
      onDone();
    } catch (e) {
      const m = (e as Error).message;
      setError(/column|schema cache/i.test(m)
        ? 'השמירה נכשלה: מסד הנתונים עוד לא עודכן (update-3-onboarding.sql). פנה למנהל האתר.'
        : 'השמירה נכשלה: ' + m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack onboarding">
      <div>
        <h2>{editing ? 'פרופיל אימון' : `נעים להכיר${profile.first_name ? `, ${profile.first_name}` : ''}! 👋`}</h2>
        {!editing && <p className="muted">עוד כמה פרטים קצרים, ואפשר להתחיל להתאמן.</p>}
      </div>

      <section className="card stack tight">
        <h3>📏 גובה ומשקל</h3>
        <div className="grid2">
          <label>גובה (ס״מ)
            <input type="number" inputMode="numeric" min={100} max={250} placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label>{editing ? 'משקל נוכחי (לא חובה)' : 'משקל (ק״ג)'}
            <input type="number" inputMode="decimal" step="0.1" min={30} max={300} placeholder="75" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card stack tight">
        <h3>🎓 רמת ניסיון</h3>
        <div className="options">
          {EXPERIENCE.map((x) => (
            <button key={x.key} className={'option' + (experience === x.key ? ' on' : '')} onClick={() => setExperience(x.key)}>
              <strong>{x.label}</strong><span className="muted small">{x.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>🎯 מטרה</h3>
        <div className="options three">
          {GOALS.map((g) => (
            <button key={g.key} className={'option centered' + (goal === g.key ? ' on' : '')} onClick={() => setGoal(g.key)}>
              <span className="option-icon">{g.icon}</span><strong>{g.label}</strong><span className="muted small">{g.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>📅 ימי אימון בשבוע</h3>
        <div className="day-picker">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d}</button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>📍 איפה תתאמן?</h3>
        <p className="muted small">אפשר לבחור יותר מאחד</p>
        <div className="options three">
          {LOCATIONS.map((l) => (
            <button key={l.key} className={'option centered' + (locations.includes(l.key) ? ' on' : '')} onClick={() => toggleLocation(l.key)}>
              <span className="option-icon">{l.icon}</span><strong>{l.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack tight">
        <h3>🧰 ציוד זמין</h3>
        {locations.length === 0 ? <p className="muted small">בחר קודם איפה תתאמן.</p> : (
          <div className="chips">
            {equipmentOptions.map((item) => (
              <button key={item} className={'chip btn-chip' + (equipment.includes(item) ? ' selected' : '')} onClick={() => toggleEquipment(item)}>
                {equipment.includes(item) ? '✓ ' : ''}{item}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className="notice">{error}</p>}
      <button className="btn primary big" onClick={submit} disabled={busy}>
        {busy ? 'שומר…' : editing ? 'שמירה' : 'בוא נתחיל! 🚀'}
      </button>
    </div>
  );
}
