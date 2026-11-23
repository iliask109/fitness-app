import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { authErrorHe } from '../lib/authErrors';

const RESEND_AFTER_S = 60;

/** Two steps: ask for the email, then take the one-hour code from that email. */
export default function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { requestPasswordReset, verifyResetCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('כתובת האימייל לא תקינה'); return; }
    setBusy(true);
    setError(null);
    try {
      const r = await requestPasswordReset(email.trim());
      setDemoCode(r.demoCode);
      setStep('code');
      setCode('');
      setWait(RESEND_AFTER_S);
    } catch (err) {
      setError(authErrorHe((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length < 6) { setError('הקוד מכיל 6 ספרות'); return; }
    setBusy(true);
    setError(null);
    try {
      await verifyResetCode(email.trim(), clean);
      // Signed in: the app now shows the new-password screen.
    } catch (err) {
      setError(authErrorHe((err as Error).message));
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="stack tight" style={{ textAlign: 'start' }}>
        <h2 style={{ fontSize: 20 }}>שחזור סיסמה</h2>
        {step === 'email' ? (
          <p className="muted small" style={{ margin: 0 }}>נשלח לך מייל עם קוד זמני. הקוד בתוקף לשעה, ואחרי שתזין אותו תבחר סיסמה חדשה.</p>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            אם יש חשבון עם הכתובת <span dir="ltr">{email}</span>, נשלח אליו מייל עם קוד בן 6 ספרות. הקוד בתוקף לשעה.
            לא מוצא? כדאי לבדוק גם בתיקיית הספאם.
          </p>
        )}
      </div>

      {step === 'email' ? (
        <form onSubmit={send} className="stack" noValidate>
          <label>אימייל<input id="reset-email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
          <button className="btn primary" disabled={busy}>{busy ? 'שולח…' : 'שליחת קוד למייל'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="stack" noValidate>
          {demoCode && <p className="notice" style={{ margin: 0 }}>מצב הדגמה (אין שליחת מיילים): הקוד הוא <strong dir="ltr">{demoCode}</strong></p>}
          <label>קוד מהמייל
            <input id="reset-code" className="code-input" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={10}
              placeholder="••••••" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null); }} autoFocus />
          </label>
          <button className="btn primary" disabled={busy}>{busy ? 'בודק…' : 'אימות והמשך'}</button>
          <div className="row between small">
            <button type="button" className="link-btn" onClick={() => send()} disabled={wait > 0 || busy}>
              {wait > 0 ? `שליחה מחדש בעוד ${wait} שנ׳` : 'שליחת קוד חדש'}
            </button>
            <button type="button" className="link-btn" onClick={() => { setStep('email'); setError(null); }}>כתובת אחרת</button>
          </div>
        </form>
      )}

      {error && <p className="notice" style={{ margin: 0 }}>{error}</p>}
      <button type="button" className="link-btn" onClick={onBack}>→ חזרה להתחברות</button>
    </div>
  );
}
