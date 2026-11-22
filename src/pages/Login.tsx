import { FormEvent, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isDemo } from '../lib/supabase';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        const { needsConfirm } = await signUp(email, password);
        if (needsConfirm) setMsg('נשלח אליך מייל לאישור החשבון. אחרי האישור אפשר להתחבר.');
      }
    } catch (err) {
      setMsg(translate((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-logo">💪</div>
        <h1>FitTrack</h1>
        <p className="muted">אימונים, תזונה והתקדמות, הכול במקום אחד</p>
        {isDemo && (
          <p className="notice">מצב הדגמה: לא הוגדר Supabase, והנתונים נשמרים רק בדפדפן הזה. אפשר להיכנס עם כל אימייל.</p>
        )}
        <div className="segmented">
          <button className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>התחברות</button>
          <button className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>הרשמה</button>
        </div>
        <form onSubmit={submit} className="stack">
          <label>אימייל<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></label>
          <label>סיסמה<input type="password" required={!isDemo} minLength={isDemo ? 0 : 6} value={password}
            onChange={(e) => setPassword(e.target.value)} dir="ltr" /></label>
          <button className="btn primary" disabled={busy}>{busy ? '...' : mode === 'in' ? 'כניסה' : 'יצירת חשבון'}</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
    </div>
  );
}

function translate(m: string) {
  if (/banned/i.test(m)) return 'החשבון שלך נחסם. פנה למנהל';
  if (/invalid login/i.test(m)) return 'אימייל או סיסמה שגויים';
  if (/already registered/i.test(m)) return 'המשתמש כבר קיים. נסה להתחבר';
  if (/email not confirmed/i.test(m)) return 'צריך לאשר את האימייל לפני ההתחברות';
  if (/password/i.test(m)) return 'הסיסמה צריכה להכיל לפחות 6 תווים';
  return m;
}
