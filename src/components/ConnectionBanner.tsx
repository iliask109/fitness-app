import { useEffect, useState, useSyncExternalStore } from 'react';
import { tr } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { failedTables, flushOutbox, pendingCount, refreshTables, subscribeErrors, subscribeOutbox } from '../lib/tableStore';

/**
 * Connection status at the top: offline (with how many changes wait to be sent), a failed load,
 * or changes still waiting to be sent after the connection is back.
 */
export default function ConnectionBanner() {
  const { user } = useAuth();
  const failed = useSyncExternalStore(subscribeErrors, () => failedTables().length);
  const pending = useSyncExternalStore(subscribeOutbox, () => (user ? pendingCount(user.id) : 0));
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const waiting = pending ? tr(` ${pending === 1 ? 'שינוי אחד ממתין' : `${pending} שינויים ממתינים`} לסנכרון.`, ` ${pending === 1 ? '1 change is' : `${pending} changes are`} waiting to sync.`) : '';
  if (!online) {
    return <div className="conn-banner offline" role="status">📡 {tr('אין חיבור לאינטרנט. אפשר להמשיך להתאמן, הכול נשמר בטלפון.', 'No internet connection. You can keep training; everything is saved on your phone.')}{waiting}</div>;
  }
  if (failed) {
    return (
      <div className="conn-banner" role="alert">
        <span>⚠️ {tr('לא הצלחנו לטעון את הנתונים מהשרת. מוצג מה שנשמר בטלפון.', 'Couldn’t load data from the server. Showing what is saved on your phone.')}{waiting}</span>
        <button className="btn small" onClick={() => { if (user) flushOutbox(user.id); refreshTables(true); }}>{tr('נסה שוב', 'Try again')}</button>
      </div>
    );
  }
  if (pending && user) {
    return (
      <div className="conn-banner" role="status">
        <span>⏳{waiting}</span>
        <button className="btn small" onClick={() => flushOutbox(user.id)}>{tr('סנכרון עכשיו', 'Sync now')}</button>
      </div>
    );
  }
  return null;
}
