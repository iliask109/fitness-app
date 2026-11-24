import { FormEvent, useEffect, useState } from 'react';
import { tr } from '../lib/i18n';
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
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError(tr('כתובת האימייל לא תקינה', 'The email address is not valid')); return; }
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
    if (clean.length < 6) { setError(tr('נא להזין את כל הקוד מהמייל', 'Please enter the full code from the email')); return; }
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
        <h2 style={{ fontSize: 20 }}>{tr('שחזור סיסמה', 'Reset password')}</h2>
        {step === 'email' ? (
          <p className="muted small" style={{ margin: 0 }}>{tr('נשלח לך מייל עם קוד זמני. הקוד בתוקף לשעה, ואחרי שתזין אותו תבחר סיסמה חדשה.', 'We\'ll email you a temporary code. It is valid for an hour; after entering it you\'ll choose a new password.')}</p>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            {tr('אם יש חשבון עם הכתובת', 'If there is an account for')} <span dir="ltr">{email}</span>{tr(', נשלח אליו מייל עם קוד זמני. הקוד בתוקף לשעה. לא מוצא? כדאי לבדוק גם בתיקיית הספאם.', ", we've emailed it a temporary code, valid for an hour. Can't find it? Check your spam folder too.")}
          </p>
        )}
      </div>

      {step === 'email' ? (
        <form onSubmit={send} className="stack" noValidate>
          <label>{tr('אימייל', 'Email')}<input id="reset-email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
          <button className="btn primary" disabled={busy}>{busy ? tr('שולח…', 'Sending…') : tr('שליחת קוד למייל', 'Email me a code')}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="stack" noValidate>
          {demoCode && <p className="notice" style={{ margin: 0 }}>{tr('מצב הדגמה (אין שליחת מיילים): הקוד הוא', 'Demo mode (no emails are sent): the code is')} <strong dir="ltr">{demoCode}</strong></p>}
          <label>{tr('קוד מהמייל', 'Code from the email')}
            <input id="reset-code" className="code-input" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
              placeholder="••••••••" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null); }} autoFocus />
          </label>
          <button className="btn primary" disabled={busy}>{busy ? tr('בודק…', 'Checking…') : tr('אימות והמשך', 'Verify and continue')}</button>
          <div className="row between small">
            <button type="button" className="link-btn" onClick={() => send()} disabled={wait > 0 || busy}>
              {wait > 0 ? tr(`שליחה מחדש בעוד ${wait} שנ׳`, `Resend in ${wait}s`) : tr('שליחת קוד חדש', 'Send a new code')}
            </button>
            <button type="button" className="link-btn" onClick={() => { setStep('email'); setError(null); }}>{tr('כתובת אחרת', 'Different address')}</button>
          </div>
        </form>
      )}

      {error && <p className="notice" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button type="button" className="link-btn" onClick={onBack}>{tr('→ חזרה להתחברות', '← Back to sign in')}</button>
    </div>
  );
}
