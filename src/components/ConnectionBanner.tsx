import { useEffect, useState, useSyncExternalStore } from 'react';
import { failedTables, refreshTables, subscribeErrors } from '../lib/tableStore';

/** Shown at the top when data could not be loaded, so an empty screen isn't mistaken for lost data. */
export default function ConnectionBanner() {
  const failed = useSyncExternalStore(subscribeErrors, () => failedTables().length);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!failed && online) return null;
  return (
    <div className="conn-banner" role="alert">
      <span>{online ? '⚠️ לא הצלחנו לטעון את הנתונים מהשרת.' : '📡 אין חיבור לאינטרנט. מה שמוצג אולי לא מעודכן.'}</span>
      {online && <button className="btn small" onClick={() => refreshTables(true)}>נסה שוב</button>}
    </div>
  );
}
