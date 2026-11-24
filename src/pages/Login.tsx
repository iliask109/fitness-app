import { FormEvent, useState } from 'react';
import { isEn, setLang, tr } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { isDemo } from '../lib/supabase';
import { ageFromBirthDate, todayISO } from '../lib/utils';
import { authErrorHe } from '../lib/authErrors';
import ForgotPassword from '../components/ForgotPassword';
import A11yMenu from '../components/A11yMenu';
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
    if (!details.first_name.trim()) return tr('נא למלא שם פרטי', 'Please enter your first name');
    if (!details.last_name.trim()) return tr('נא למלא שם משפחה', 'Please enter your last name');
    if (!details.gender) return tr('נא לבחור מגדר', 'Please choose a gender');
    const age = Number(details.age);
    if (!Number.isInteger(age) || age < 10 || age > 120) return tr('נא למלא גיל תקין (10 עד 120)', 'Please enter a valid age (10 to 120)');
    if (details.birth_date && details.birth_date > todayISO()) return tr('תאריך הלידה לא יכול להיות בעתיד', 'The birth date cannot be in the future');
    if (!/^\S+@\S+\.\S+$/.test(email)) return tr('כתובת האימייל לא תקינה', 'The email address is not valid');
    if (!isDemo && password.length < 8) return tr('הסיסמה צריכה להכיל לפחות 8 תווים', 'The password must be at least 8 characters');
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
        if (needsConfirm) setMsg(tr('נשלח אליך מייל לאישור החשבון. אחרי האישור אפשר להתחבר.', 'We sent you an email to confirm your account. Once confirmed, you can sign in.'));
      }
    } catch (err) {
      setMsg(authErrorHe((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (m: 'in' | 'up' | 'forgot') => { setMode(m); setMsg(null); };

  return (
    <main className="login" id="main-content">
      <div className="login-card card">
        <div className="login-logo">💪</div>
        <h1>FitLogix</h1>
        <button type="button" className="link-btn lang-switch" onClick={() => setLang(isEn() ? 'he' : 'en')}>{isEn() ? 'עברית' : 'English'}</button>
        <p className="muted">{tr('אימונים, תזונה והתקדמות, הכול במקום אחד', 'Workouts, nutrition and progress, all in one place')}</p>
        {isDemo && (
          <p className="notice">{tr('מצב הדגמה: לא הוגדר Supabase, והנתונים נשמרים רק בדפדפן הזה. אפשר להיכנס עם כל אימייל.', 'Demo mode: Supabase is not set up, and data is saved only in this browser. You can sign in with any email.')}</p>
        )}
        <div className="row gap login-tools"><A11yMenu /><a className="link-btn small" href="#/accessibility">{tr('הצהרת נגישות', 'Accessibility statement')}</a></div>
        {mode === 'forgot' ? (
          <ForgotPassword initialEmail={email} onBack={() => switchMode('in')} />
        ) : (
          <>
            <div className="segmented">
              <button className={mode === 'in' ? 'on' : ''} onClick={() => switchMode('in')}>{tr('התחברות', 'Sign in')}</button>
              <button className={mode === 'up' ? 'on' : ''} onClick={() => switchMode('up')}>{tr('הרשמה', 'Sign up')}</button>
            </div>
            <form onSubmit={submit} className="stack" noValidate={mode === 'up'}>
              {mode === 'up' && (
                <>
                  <div className="grid2">
                    <label>{tr('שם פרטי', 'First name')}<input required autoComplete="given-name" value={details.first_name}
                      maxLength={60} onChange={(e) => setDetails({ ...details, first_name: e.target.value })} /></label>
                    <label>{tr('שם משפחה', 'Last name')}<input required autoComplete="family-name" value={details.last_name}
                      maxLength={60} onChange={(e) => setDetails({ ...details, last_name: e.target.value })} /></label>
                  </div>
                  <div className="stack tight">
                    <span className="small muted" style={{ textAlign: 'start' }}>{tr('מגדר', 'Gender')}</span>
                    <div className="segmented" role="radiogroup" aria-label={tr('מגדר', 'Gender')}>
                      {GENDERS.map((g) => (
                        <button key={g.key} type="button" role="radio" aria-checked={details.gender === g.key}
                          className={details.gender === g.key ? 'on' : ''} onClick={() => setDetails({ ...details, gender: g.key })}>{g.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid2">
                    <label>{tr('גיל', 'Age')}<input type="number" inputMode="numeric" min={10} max={120} required value={details.age}
                      onChange={(e) => setDetails({ ...details, age: e.target.value })} /></label>
                    <label><span>{tr('תאריך לידה', 'Birth date')} <span className="optional">{tr('(לא חובה)', '(optional)')}</span></span>
                      <input type="date" autoComplete="bday" max={todayISO()} value={details.birth_date}
                        onChange={(e) => setBirthDate(e.target.value)} /></label>
                  </div>
                </>
              )}
              <label>{tr('אימייל', 'Email')}<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></label>
              <label>{tr('סיסמה', 'Password')}<input type="password" required={!isDemo} minLength={isDemo ? 0 : 8} value={password}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                {mode === 'up' && <span className="optional">{tr('לפחות 8 תווים', 'At least 8 characters')}</span>}
              </label>
              <button className="btn primary" disabled={busy}>{busy ? '...' : mode === 'in' ? tr('כניסה', 'Sign in') : tr('יצירת חשבון', 'Create account')}</button>
              {mode === 'in' && <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>{tr('שכחתי סיסמה', 'Forgot password')}</button>}
            </form>
            {msg && <p className="notice" role="alert">{msg}</p>}
          </>
        )}
      </div>
    </main>
  );
}
