import { FormEvent, useState } from 'react';
import { tr } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { authErrorHe } from '../lib/authErrors';

/**
 * New password form. `forced` is the screen shown after a recovery code or link:
 * the app stays locked until a new password is saved.
 */
export default function SetPassword({ forced, onDone, embedded }: { forced?: boolean; onDone?: () => void; /** Inside another card (no card frame of its own). */ embedded?: boolean }) {
  const { updatePassword, signOut, user } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setMsg({ ok: false, text: tr('הסיסמה צריכה להכיל לפחות 6 תווים', 'The password must be at least 6 characters') });
    if (pw !== pw2) return setMsg({ ok: false, text: tr('הסיסמאות לא תואמות', 'The passwords don\'t match') });
    setBusy(true);
    setMsg(null);
    try {
      await updatePassword(pw);
      setPw(''); setPw2('');
      setMsg({ ok: true, text: tr('✓ הסיסמה עודכנה', '✓ Password updated') });
      onDone?.();
    } catch (err) {
      setMsg({ ok: false, text: authErrorHe((err as Error).message) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={embedded ? 'stack' : 'card stack'} onSubmit={submit} noValidate>
      <h3>{forced ? tr('🔐 בחירת סיסמה חדשה', '🔐 Choose a new password') : tr('🔐 שינוי סיסמה', '🔐 Change password')}</h3>
      {forced && <p className="muted small" style={{ margin: 0 }}>{tr('נכנסת עם קוד זמני. כדי להמשיך, בחר סיסמה חדשה לחשבון', 'You signed in with a temporary code. To continue, choose a new password for')} <span dir="ltr">{user?.email}</span>.</p>}
      <label>{tr('סיסמה חדשה', 'New password')}
        <input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <label>{tr('אימות סיסמה', 'Confirm password')}
        <input id="new-password-2" type={show ? 'text' : 'password'} autoComplete="new-password" dir="ltr" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      <label className="row gap check-row"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {tr('הצגת הסיסמה', 'Show password')}</label>
      {msg && <p className={msg.ok ? 'good small' : 'notice'} style={{ margin: 0 }}>{msg.text}</p>}
      <button className="btn primary" disabled={busy}>{busy ? tr('שומר…', 'Saving…') : tr('שמירת סיסמה', 'Save password')}</button>
      {forced && <button type="button" className="btn" onClick={signOut}>{tr('ביטול והתנתקות', 'Cancel and sign out')}</button>}
    </form>
  );
}
