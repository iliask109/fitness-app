import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/useProfile';
import { isDemo } from '../lib/supabase';
import { navigate } from '../lib/router';

const FIELDS = [
  ['calorie_goal', 'יעד קלוריות יומי'],
  ['protein_goal', 'יעד חלבון (ג׳)'],
  ['carbs_goal', 'יעד פחמימות (ג׳)'],
  ['fat_goal', 'יעד שומן (ג׳)'],
  ['water_goal', 'יעד מים (כוסות)'],
  ['weight_goal', 'משקל יעד (ק״ג)'],
] as const;

export default function Settings() {
  const { user, signOut, isAdmin, adminCheckError } = useAuth();
  const { profile, loading, save } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    const f: Record<string, string> = { display_name: profile.display_name ?? '' };
    for (const [k] of FIELDS) f[k] = profile[k] == null ? '' : String(profile[k]);
    setForm(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const patch: Record<string, unknown> = { display_name: form.display_name || null };
    for (const [k] of FIELDS) patch[k] = form[k] === '' ? (k === 'weight_goal' ? null : profile[k]) : Number(form[k]);
    await save(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack">
      <h2>הגדרות</h2>
      <form onSubmit={submit} className="card stack">
        <label>שם להצגה<input value={form.display_name ?? ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
        <div className="grid2">
          {FIELDS.map(([k, label]) => (
            <label key={k}>{label}
              <input type="number" step={k === 'weight_goal' ? '0.1' : '1'} value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <button className="btn primary">{saved ? '✓ נשמר' : 'שמירה'}</button>
      </form>
      {isAdmin && <a className="btn" href="#/admin">🛡️ ניהול משתמשים</a>}
      <div className="card stack tight">
        <div className="muted small">מחובר בתור</div>
        <div dir="ltr" style={{ textAlign: 'right' }}>{user?.email}</div>
        <div className="muted small">הרשאה: {isAdmin ? '🛡️ מנהל' : 'משתמש רגיל'}</div>
        {adminCheckError && <div className="notice" dir="ltr">admin check: {adminCheckError}</div>}
        {isDemo && <p className="notice">מצב הדגמה: הנתונים נשמרים רק בדפדפן הזה. כדי לשמור בענן, הגדר Supabase לפי ה-README.</p>}
        <button className="btn danger" onClick={async () => { await signOut(); navigate('/'); }}>התנתקות</button>
      </div>
    </div>
  );
}
