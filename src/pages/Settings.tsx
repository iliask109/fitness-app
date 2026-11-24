import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/useProfile';
import { isDemo } from '../lib/supabase';
import { navigate } from '../lib/router';
import { ageFromBirthDate, todayISO } from '../lib/utils';
import { ThemePicker } from '../components/ThemeControls';
import SetPassword from '../components/SetPassword';
import { GENDERS } from '../lib/gender';
import NotificationSettings from '../components/NotificationSettings';

// Calories and macros are not edited here: they are calculated from the body weight every month (lib/nutrition.ts).
const FIELDS = [
  ['weight_goal', 'משקל יעד (ק״ג)'],
] as const;

export default function Settings() {
  const { user, signOut, adminCheckError } = useAuth();
  const { profile, loading, save } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    const f: Record<string, string> = {
      first_name: profile.first_name ?? profile.display_name ?? '', last_name: profile.last_name ?? '',
      age: profile.birth_date ? String(ageFromBirthDate(profile.birth_date)) : profile.age == null ? '' : String(profile.age),
      birth_date: profile.birth_date ?? '',
      gender: profile.gender ?? '',
    };
    for (const [k] of FIELDS) f[k] = profile[k] == null ? '' : String(profile[k]);
    setForm(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const age = Number(form.age);
    const patch: Record<string, unknown> = {
      first_name: form.first_name.trim() || null, last_name: form.last_name.trim() || null,
      display_name: form.first_name.trim() || null,
      age: Number.isInteger(age) && age > 0 ? age : null, birth_date: form.birth_date || null,
      gender: form.gender === 'male' || form.gender === 'female' ? form.gender : null,
    };
    for (const [k] of FIELDS) patch[k] = form[k] === '' ? (k === 'weight_goal' ? null : profile[k]) : Number(form[k]);
    await save(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack">
      <h2>הגדרות</h2>
      <form onSubmit={submit} className="card stack">
        <h3>👤 פרטים אישיים</h3>
        <div className="grid2">
          <label>שם פרטי<input value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
          <label>שם משפחה<input value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
          <label>גיל<input type="number" min={10} max={120} value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
          <label><span>תאריך לידה <span className="optional">(לא חובה)</span></span>
            <input type="date" max={todayISO()} value={form.birth_date ?? ''} onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, birth_date: v, age: v ? String(ageFromBirthDate(v)) : form.age });
            }} /></label>
        </div>
        <span className="small muted">מגדר</span>
        <div className="segmented" role="radiogroup" aria-label="מגדר">
          {GENDERS.map((g) => (
            <button key={g.key} type="button" role="radio" aria-checked={form.gender === g.key}
              className={form.gender === g.key ? 'on' : ''} onClick={() => setForm({ ...form, gender: g.key })}>{g.label}</button>
          ))}
        </div>
        <a className="btn" href="#/profile-setup">🏋️ עריכת פרופיל אימון (גובה, מטרה, ציוד…)</a>
        <h3>🎯 יעדים</h3>
        <div className="grid2">
          {FIELDS.map(([k, label]) => (
            <label key={k}>{label}
              <input type="number" step={k === 'weight_goal' ? '0.1' : '1'} value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <p className="muted small">יעדי הקלוריות, החלבון, הפחמימות והשומן מחושבים אוטומטית לפי המשקל שלך ומתעדכנים כל חודש. אפשר לראות אותם בדף ההתקדמות.</p>
        <button className="btn primary">{saved ? '✓ נשמר' : 'שמירה'}</button>
      </form>
      <NotificationSettings />
      <ThemePicker />
      {!isDemo && <SetPassword />}
      <div className="card stack tight">
        <div className="muted small">מחובר בתור</div>
        <div dir="ltr" style={{ textAlign: 'right' }}>{user?.email}</div>
        {adminCheckError && <div className="notice" dir="ltr">admin check: {adminCheckError}</div>}
        {isDemo && <p className="notice">מצב הדגמה: הנתונים נשמרים רק בדפדפן הזה. כדי לשמור בענן, הגדר Supabase לפי ה-README.</p>}
        <button className="btn danger" onClick={async () => { await signOut(); navigate('/'); }}>התנתקות</button>
      </div>
    </div>
  );
}
