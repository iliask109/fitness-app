import { useState } from 'react';
import { tr } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/useProfile';
import { enablePushOnDevice, promptSnoozed, pushSupport, snoozePrompt } from '../lib/push';
import { DEFAULT_REMINDER_TIME } from '../lib/reminders';

/** Home-screen card asking to allow workout reminders (the browser only shows its permission dialog after a tap). */
export default function NotificationPrompt() {
  const { user } = useAuth();
  const { profile, save, loading } = useProfile();
  const [hidden, setHidden] = useState(promptSnoozed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const support = pushSupport();
  const remindersOn = !!profile.reminder_enabled;

  if (loading || hidden) return null;
  const permission = 'Notification' in window ? Notification.permission : 'default';
  // Nothing to ask: already on here, blocked by the user, or not possible in this browser.
  if (remindersOn && permission === 'granted') return null;
  if (!support.ok && support.reason !== 'ios-install') return null;

  const later = () => { snoozePrompt(); setHidden(true); };

  async function allow() {
    setBusy(true); setError(null);
    try {
      await enablePushOnDevice(user!.id);
      await save({
        reminder_enabled: true,
        reminder_time: profile.reminder_time || DEFAULT_REMINDER_TIME,
        reminder_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setHidden(true);
    } catch (e) {
      const m = (e as Error).message;
      if (m === 'blocked') setError(tr('ההתראות נחסמו. אפשר לאשר אותן בהגדרות הדפדפן, באתר FitLogix ← התראות.', 'Notifications are blocked. You can allow them in the browser settings, for the FitLogix site → Notifications.'));
      else if (m === 'dismissed') setError(tr('לא אישרת. אפשר לנסות שוב מתי שתרצה.', 'You didn\'t allow them. You can try again whenever you like.'));
      else setError(tr('ההפעלה נכשלה: ', 'Turning on failed: ') + m);
    } finally { setBusy(false); }
  }

  return (
    <div className="card notif-prompt stack tight" role="region" aria-label={tr('התראות', 'Notifications')}>
      <div className="row gap">
        <span className="notif-prompt-icon">🔔</span>
        <div className="grow">
          <strong>{tr('רוצה תזכורות לאימונים?', 'Want workout reminders?')}</strong>
          <div className="muted small">
            {support.ok
              ? tr(`נזכיר לך ביום אימון, בשעה ${profile.reminder_time || DEFAULT_REMINDER_TIME} (אפשר לשנות בהגדרות).`, `We'll remind you on training days at ${profile.reminder_time || DEFAULT_REMINDER_TIME} (you can change this in Settings).`)
              : tr('באייפון צריך קודם להתקין: כפתור השיתוף ⬆️ ← "הוסף למסך הבית", ואז לפתוח את FitLogix מהמסך הבית.', 'On iPhone, first install the app: Share button ⬆️ → "Add to Home Screen", then open FitLogix from the home screen.')}
          </div>
        </div>
      </div>
      {error && <p className="notice small" style={{ margin: 0 }}>{error}</p>}
      <div className="row gap">
        {support.ok && <button className="btn primary grow" disabled={busy} onClick={allow}>{busy ? tr('רגע…', 'One moment…') : tr('🔔 אישור התראות', '🔔 Allow notifications')}</button>}
        <button className="btn" onClick={later}>{tr('לא עכשיו', 'Not now')}</button>
      </div>
    </div>
  );
}
