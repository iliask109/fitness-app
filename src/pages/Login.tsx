import { FormEvent, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isDemo } from '../lib/supabase';
import { ageFromBirthDate, todayISO } from '../lib/utils';
import { authErrorHe } from '../lib/authErrors';
import ForgotPassword from '../components/ForgotPassword';
import { GENDERS, Gender } from '../lib/gender';

const emptySignup = { first_name: '', last_name: '', age: '', birth_date: '', gender: '' as Gender | '' };

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [details, setDetails] = useState(emptySignup);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Filling in a birth date fills in the age too. */
  function setBirthDate(value: string) {
    const age = value ? ageFromBirthDate(value) : NaN;
    setDetails((d) => ({ ...d, birth_date: value, age: age >= 0 && age < 130 ? String(age) : d.age }));
  }

  function validate(): string | null {
    if (mode === 'in') return null;
    if (!details.first_name.trim()) return 'נא למלא שם פרטי';
    if (!details.last_name.trim()) return 'נא למלא שם משפחה';
    if (!details.gender) return 'נא לבחור מגדר';
    const age = Number(details.age);
    if (!Number.isInteger(age) || age < 10 || age > 120) return 'נא למלא גיל תקין (10 עד 120)';
    if (details.birth_date && details.birth_date > todayISO()) return 'תאריך הלידה לא יכול להיות בעתיד';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'כתובת האימייל לא תקינה';
    if (!isDemo && password.length < 6) return 'הסיסמה צריכה להכיל לפחות 6 תווים';
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) { setMsg(invalid); return; }
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        const { needsConfirm } = await signUp(email, password, {
          first_name: details.first_name.trim(),
          last_name: details.last_name.trim(),
          age: Number(details.age),
          birth_date: details.birth_date || undefined,
          gender: details.gender as Gender,
        });
        if (needsConfirm) setMsg('נשלח אליך מייל לאישור החשבון. אחרי האישור אפשר להתחבר.');
      }
    } catch (err) {
      setMsg(authErrorHe((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (m: 'in' | 'up' | 'forgot') => { setMode(m); setMsg(null); };

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-logo">💪</div>
        <h1>FitLogix</h1>
        <p className="muted">אימונים, תזונה והתקדמות, הכול במקום אחד</p>
        {isDemo && (
          <p className="notice">מצב הדגמה: לא הוגדר Supabase, והנתונים נשמרים רק בדפדפן הזה. אפשר להיכנס עם כל אימייל.</p>
        )}
        {mode === 'forgot' ? (
          <ForgotPassword initialEmail={email} onBack={() => switchMode('in')} />
        ) : (
          <>
            <div className="segmented">
              <button className={mode === 'in' ? 'on' : ''} onClick={() => switchMode('in')}>התחברות</button>
              <button className={mode === 'up' ? 'on' : ''} onClick={() => switchMode('up')}>הרשמה</button>
            </div>
            <form onSubmit={submit} className="stack" noValidate={mode === 'up'}>
              {mode === 'up' && (
                <>
                  <div className="grid2">
                    <label>שם פרטי<input required autoComplete="given-name" value={details.first_name}
                      onChange={(e) => setDetails({ ...details, first_name: e.target.value })} /></label>
                    <label>שם משפחה<input required autoComplete="family-name" value={details.last_name}
                      onChange={(e) => setDetails({ ...details, last_name: e.target.value })} /></label>
                  </div>
                  <div className="stack tight">
                    <span className="small muted" style={{ textAlign: 'start' }}>מגדר</span>
                    <div className="segmented" role="radiogroup" aria-label="מגדר">
                      {GENDERS.map((g) => (
                        <button key={g.key} type="button" role="radio" aria-checked={details.gender === g.key}
                          className={details.gender === g.key ? 'on' : ''} onClick={() => setDetails({ ...details, gender: g.key })}>{g.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid2">
                    <label>גיל<input type="number" inputMode="numeric" min={10} max={120} required value={details.age}
                      onChange={(e) => setDetails({ ...details, age: e.target.value })} /></label>
                    <label><span>תאריך לידה <span className="optional">(לא חובה)</span></span>
                      <input type="date" autoComplete="bday" max={todayISO()} value={details.birth_date}
                        onChange={(e) => setBirthDate(e.target.value)} /></label>
                  </div>
                </>
              )}
              <label>אימייל<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></label>
              <label>סיסמה<input type="password" required={!isDemo} minLength={isDemo ? 0 : 6} value={password}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                {mode === 'up' && <span className="optional">לפחות 6 תווים</span>}
              </label>
              <button className="btn primary" disabled={busy}>{busy ? '...' : mode === 'in' ? 'כניסה' : 'יצירת חשבון'}</button>
              {mode === 'in' && <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>שכחתי סיסמה</button>}
            </form>
            {msg && <p className="notice">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
