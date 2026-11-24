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


export default function Settings() {
  const { user, signOut, adminCheckError } = useAuth();
  const { profile, loading, save } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    if (loading) return;
    const f: Record<string, string> = {
      first_name: profile.first_name ?? profile.display_name ?? '', last_name: profile.last_name ?? '',
      age: profile.birth_date ? String(ageFromBirthDate(profile.birth_date)) : profile.age == null ? '' : String(profile.age),
      birth_date: profile.birth_date ?? '',
      gender: profile.gender ?? '',
    };
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
    await save(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack">
      <h2>הגדרות</h2>
      <div className="card stack">
      <button type="button" className="collapse-head" aria-expanded={openDetails} onClick={() => setOpenDetails(!openDetails)}>
        <h3>👤 פרטים אישיים{isDemo ? '' : ' וסיסמה'}</h3>
        <span className="collapse-arrow" aria-hidden>{openDetails ? '▴' : '▾'}</span>
      </button>
      {openDetails && <>
      <form onSubmit={submit} className="stack">
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
        <button className="btn primary">{saved ? '✓ נשמר' : 'שמירת פרטים'}</button>
      </form>
      {!isDemo && <><hr className="divider" /><SetPassword embedded /></>}
      </>}
      </div>
      <div className="card stack">
        <h3>🎯 יעדים</h3>
        <a className="btn" href="#/profile-setup">🏋️ עריכת פרופיל אימון (גובה, מטרה, משקל יעד, ציוד…)</a>
        <p className="muted small">יעדי הקלוריות, החלבון, הפחמימות והשומן מחושבים אוטומטית לפי המשקל שלך ומתעדכנים כל חודש. אפשר לראות אותם בדף ההתקדמות.</p>
      </div>
      <NotificationSettings />
      <ThemePicker />
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
