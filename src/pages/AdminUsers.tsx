import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { AdminUser, listUsers } from '../lib/admin';
import { addDays, daysAgo, formatDate, todayISO } from '../lib/utils';

type Filter = 'all' | 'active' | 'inactive' | 'banned';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'כולם' },
  { key: 'active', label: 'פעילים' },
  { key: 'inactive', label: 'לא פעילים' },
  { key: 'banned', label: 'חסומים' },
];

/** Active = trained in the last 14 days. */
const isActive = (u: AdminUser) => !!u.last_workout && u.last_workout >= addDays(todayISO(), -14);

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (isAdmin) listUsers().then(setUsers).catch((e) => setError(e.message));
  }, [isAdmin]);

  if (!isAdmin) return <div className="card muted">אין לך הרשאת מנהל.</div>;
  if (error) return <div className="card notice">שגיאה בטעינת המשתמשים: {error}</div>;
  if (!users) return <p className="muted">טוען…</p>;

  const weekAgo = addDays(todayISO(), -7);
  const shown = users
    .filter((u) => (u.email + ' ' + (u.display_name ?? '')).toLowerCase().includes(q.trim().toLowerCase()))
    .filter((u) => filter === 'all' || (filter === 'active' && isActive(u)) || (filter === 'inactive' && !isActive(u)) || (filter === 'banned' && u.banned));

  return (
    <div className="stack">
      <h2>🛡️ ניהול משתמשים</h2>

      <div className="grid2">
        <div className="card stat"><span className="stat-num">{users.length}</span><span className="muted small">משתמשים</span></div>
        <div className="card stat"><span className="stat-num">{users.filter((u) => u.last_workout && u.last_workout >= weekAgo).length}</span><span className="muted small">התאמנו השבוע</span></div>
        <div className="card stat"><span className="stat-num">{users.reduce((a, u) => a + u.workouts, 0)}</span><span className="muted small">אימונים בסך הכול</span></div>
        <div className="card stat"><span className="stat-num">{users.filter((u) => u.created_at.slice(0, 10) >= weekAgo).length}</span><span className="muted small">נרשמו השבוע</span></div>
      </div>

      <input placeholder="🔍 חיפוש לפי שם או אימייל" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.key} className={'chip btn-chip' + (filter === f.key ? ' selected' : '')} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      {shown.length === 0 && <div className="card muted">לא נמצאו משתמשים.</div>}
      {shown.map((u) => (
        <a key={u.id} href={`#/admin/${u.id}`} className="card list-card">
          <div className="row between">
            <div className="row gap">
              <span className={'dot' + (isActive(u) ? ' on' : '')} />
              <strong>{u.display_name || u.email.split('@')[0]}</strong>
              {u.is_admin && <span className="chip tag-admin">מנהל</span>}
              {u.banned && <span className="chip tag-banned">חסום</span>}
            </div>
            <span className="muted small">←</span>
          </div>
          <div className="muted small" dir="ltr" style={{ textAlign: 'right' }}>{u.email}</div>
          <div className="chips">
            <span className="chip">{u.workouts} אימונים</span>
            <span className="chip">אימון אחרון: {daysAgo(u.last_workout)}</span>
            {u.last_weight != null && <span className="chip">{u.last_weight} ק״ג</span>}
            <span className="chip">הצטרף {formatDate(u.created_at.slice(0, 10), { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
