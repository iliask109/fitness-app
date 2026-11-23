import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/useProfile';
import { deviceSubscribed, disablePushOnDevice, enablePushOnDevice, pushSupport, sendTestNotification } from '../lib/push';
import { DEFAULT_REMINDER_TIME } from '../lib/reminders';

/** Quarter-hour slots, matching how often the server checks. */
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)
  .filter((t) => t >= '05:00');

export default function NotificationSettings() {
  const { user } = useAuth();
  const { profile, save, loading } = useProfile();
  const [onDevice, setOnDevice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const support = pushSupport();
  const enabled = !!profile.reminder_enabled;
  /** Notifications are on for the account, but this device isn't registered (e.g. after signing out here). */
  const notHere = enabled && onDevice === false;

  useEffect(() => { deviceSubscribed().then(setOnDevice); }, []);

  async function turnOn() {
    setBusy(true); setMsg(null);
    try {
      await enablePushOnDevice(user!.id);
      await save({
        reminder_enabled: true,
        reminder_time: profile.reminder_time || DEFAULT_REMINDER_TIME,
        reminder_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setOnDevice(true);
      setMsg({ ok: true, text: '✓ ההתראות הופעלו במכשיר הזה' });
    } catch (e) {
      const m = (e as Error).message;
      setMsg({ ok: false, text: m === 'blocked'
        ? 'ההתראות חסומות בדפדפן. כדי לאפשר: לחץ על סמל המנעול ליד כתובת האתר ← הרשאות ← התראות ← אפשר.'
        : m === 'dismissed' ? 'לא אישרת התראות. אפשר לנסות שוב.' : 'ההפעלה נכשלה: ' + m });
    } finally { setBusy(false); }
  }

  async function turnOff() {
    setBusy(true); setMsg(null);
    await disablePushOnDevice(user!.id);
    await save({ reminder_enabled: false });
    setOnDevice(false);
    setBusy(false);
  }

  async function test() {
    setBusy(true); setMsg(null);
    try {
      if (onDevice === false) await enablePushOnDevice(user!.id).then(() => setOnDevice(true));
      const r = await sendTestNotification();
      if (r.kind === 'sent') setMsg({ ok: true, text: `✓ נשלחה התראת בדיקה${r.devices > 1 ? ` ל-${r.devices} מכשירים` : ''}. היא אמורה להופיע תוך כמה שניות.` });
      else if (r.kind === 'no-devices') setMsg({ ok: false, text: 'המכשיר לא נרשם להתראות. כבה והדלק את המתג ונסה שוב.' });
      else setMsg({ ok: false, text: `שירות ההתראות דחה את השליחה (קוד ${r.codes.join(', ') || '?'}).`
        + (r.codes.some((c) => c === 401 || c === 403) ? ' כנראה שהמשתנה VAPID_PRIVATE_KEY ב-Vercel לא הועתק נכון.' : ' כבה והדלק את המתג ונסה שוב.') });
    } catch (e) {
      setMsg({ ok: false, text: 'השליחה נכשלה: ' + (e as Error).message });
    } finally { setBusy(false); }
  }

  if (loading) return null;
  return (
    <div className="card stack tight">
      <div className="row between">
        <h3 style={{ margin: 0 }}>🔔 התראות לאימונים</h3>
        {support.ok && (
          <label className="switch" aria-label="התראות לאימונים">
            <input type="checkbox" checked={enabled && !notHere} disabled={busy} onChange={(e) => (e.target.checked ? turnOn() : turnOff())} />
            <span />
          </label>
        )}
      </div>

      {!support.ok && (
        <p className="notice" style={{ margin: 0 }}>
          {support.reason === 'ios-install'
            ? 'באייפון, התראות עובדות רק כשהאפליקציה מותקנת: לחץ על כפתור השיתוף ⬆️ ← "הוסף למסך הבית", ואז פתח את FitLogix מהמסך הבית.'
            : support.reason === 'blocked'
              ? 'ההתראות חסומות בדפדפן הזה. כדי לאפשר: סמל המנעול ליד כתובת האתר ← הרשאות ← התראות ← אפשר.'
              : 'הדפדפן הזה לא תומך בהתראות. נסה ב-Chrome, או התקן את האפליקציה למסך הבית.'}
        </p>
      )}

      {notHere && support.ok && (
        <p className="notice" style={{ margin: 0 }}>📱 ההתראות פעילות בחשבון, אבל המכשיר הזה עוד לא רשום (למשל אחרי התנתקות). הדלק את המתג כדי לקבל התראות גם כאן.</p>
      )}

      {enabled && (
        <>
          <label>⏰ שעת האימון שלי
            <select id="reminder-time" value={profile.reminder_time || DEFAULT_REMINDER_TIME}
              onChange={(e) => save({ reminder_time: e.target.value, reminder_tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="row gap check-row">
            <input type="checkbox" checked={profile.remind_training_day !== false} onChange={(e) => save({ remind_training_day: e.target.checked })} />
            תזכורת ביום אימון ("היום יש לך Pull")
          </label>
          <label className="row gap check-row">
            <input type="checkbox" checked={profile.remind_no_workout !== false} onChange={(e) => save({ remind_no_workout: e.target.checked })} />
            התראה אם עוד לא התאמנתי השבוע (מיום שלישי)
          </label>
          <p className="muted small" style={{ margin: 0 }}>לכל היותר התראה אחת ביום, בשעה שבחרת. אם כבר התאמנת באותו יום, לא תקבל התראה.</p>
          <button className="btn" disabled={busy} onClick={test}>שליחת התראת בדיקה</button>
        </>
      )}
      {msg && <p className={msg.ok ? 'good small' : 'notice'} style={{ margin: 0 }}>{msg.text}</p>}
    </div>
  );
}
