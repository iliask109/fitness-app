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
  // Re-check when coming back from the phone's settings, so allowing notifications there shows up right away.
  const [, setTick] = useState(0);
  useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible') setTick((t) => t + 1); };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => { document.removeEventListener('visibilitychange', onBack); window.removeEventListener('focus', onBack); };
  }, []);
  const support = pushSupport();
  const enabled = !!profile.reminder_enabled;
  /** Notifications are on for the account, but this device isn't registered (e.g. after signing out here). */
  const notHere = enabled && onDevice === false;

  // Already allowed on this phone and on for the account: register silently instead of asking to switch it on.
  useEffect(() => {
    (async () => {
      let here = await deviceSubscribed();
      if (!here && enabled && support.ok && Notification.permission === 'granted') {
        try { await enablePushOnDevice(user!.id); here = true; } catch { /* the notice below explains */ }
      }
      setOnDevice(here);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

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
              ? <>ההתראות חסומות בדפדפן עבור האתר הזה, ולכן הוא לא יכול לבקש אישור שוב. כדי לאפשר:<br />
                  <strong>בכרום באנדרואיד:</strong> לחץ על הסמל שמשמאל לכתובת האתר (מנעול או פסים) ← הרשאות ← התראות ← אפשר.<br />
                  <strong>אם האפליקציה מותקנת במסך הבית:</strong> לחיצה ארוכה על האייקון ← פרטי אפליקציה (ⓘ) ← התראות ← הפעלה.<br />
                  אחר כך חזור לכאן.</>
              : 'הדפדפן הזה לא תומך בהתראות. נסה ב-Chrome, או התקן את האפליקציה למסך הבית.'}
        </p>
      )}

      {enabled && onDevice === true && <p className="good small" style={{ margin: 0 }}>📱 המכשיר הזה מקבל התראות ✓</p>}
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
