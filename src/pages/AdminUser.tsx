import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { AdminUser as AdminUserT, deleteUser, fullName, listUsers, setAdmin, setBanned } from '../lib/admin';
import { listRows } from '../lib/db';
import { navigate } from '../lib/router';
import { BodyWeight, DEFAULT_PROFILE, Meal, Profile, Workout } from '../lib/types';
import { addDays, currentAge, daysAgo, formatDate, todayISO, weekStart, workoutVolume } from '../lib/utils';
import ProgressCharts from '../components/ProgressCharts';

interface Data { workouts: Workout[]; meals: Meal[]; weights: BodyWeight[]; profile: Profile }

export default function AdminUser({ id }: { id: string }) {
  const { user: me, isAdmin } = useAuth();
  const [u, setU] = useState<AdminUserT | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const all = await listUsers();
      const found = all.find((x) => x.id === id);
      if (!found) { navigate('/admin'); return; }
      setU(found);
      const [workouts, meals, weights, profiles] = await Promise.all([
        listRows<Workout>(id, 'workouts'), listRows<Meal>(id, 'meals'),
        listRows<BodyWeight>(id, 'body_weights'), listRows<Profile>(id, 'profiles'),
      ]);
      setData({ workouts, meals, weights, profile: { ...DEFAULT_PROFILE, ...profiles[0], id } });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, isAdmin]);

  if (!isAdmin) return <div className="card muted">אין לך הרשאת מנהל.</div>;
  if (error) return <div className="card notice">שגיאה: {error}</div>;
  if (!u || !data) return <p className="muted">טוען…</p>;

  const isMe = u.id === me?.id;
  const name = fullName(u);
  const age = currentAge(u);

  async function act(fn: () => Promise<void>, done?: () => void) {
    setBusy(true);
    try { await fn(); done ? done() : await load(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  const today = todayISO();
  const week = weekStart(today);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const loggedDays = last7.filter((d) => data.meals.some((m) => m.date === d));
  const avgKcal = loggedDays.length
    ? Math.round(data.meals.filter((m) => loggedDays.includes(m.date)).reduce((a, m) => a + m.calories, 0) / loggedDays.length) : null;
  const recent = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div className="stack">
      <a href="#/admin" className="muted">→ כל המשתמשים</a>

      <div className="card stack tight">
        <div className="row gap">
          <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
          <div className="grow">
            <div className="row gap">
              <h2>{name}</h2>
              {u.is_admin && <span className="chip tag-admin">מנהל</span>}
              {u.banned && <span className="chip tag-banned">חסום</span>}
            </div>
            <div className="muted small" dir="ltr" style={{ textAlign: 'right' }}>{u.email}</div>
          </div>
        </div>
        {(age != null || u.birth_date) && (
          <div className="small">
            {age != null && <>גיל {age}</>}
            {u.birth_date && <span className="muted"> · נולד/ה {formatDate(u.birth_date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          </div>
        )}
        <div className="muted small">
          הצטרף {formatDate(u.created_at.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' })} ·
          התחברות אחרונה: {daysAgo(u.last_sign_in_at)}
        </div>
      </div>

      <div className="grid2">
        <div className="card stat"><span className="stat-num">{data.workouts.length}</span><span className="muted small">אימונים בסך הכול</span></div>
        <div className="card stat"><span className="stat-num">{data.workouts.filter((w) => w.date >= week).length}</span><span className="muted small">אימונים השבוע</span></div>
        <div className="card stat"><span className="stat-num">{avgKcal ?? '–'}</span><span className="muted small">ממוצע קלוריות (7 ימים)</span></div>
        <div className="card stat"><span className="stat-num">{u.last_weight ?? '–'}</span><span className="muted small">משקל אחרון</span></div>
      </div>

      <div className="card stack tight">
        <h3>🎯 יעדים</h3>
        <div className="chips">
          <span className="chip">{data.profile.calorie_goal} קק״ל</span>
          <span className="chip">{data.profile.protein_goal} ג׳ חלבון</span>
          <span className="chip">{data.profile.water_goal} כוסות מים</span>
          {data.profile.weight_goal ? <span className="chip">משקל יעד {data.profile.weight_goal}</span> : null}
        </div>
      </div>

      <ProgressCharts workouts={data.workouts} meals={data.meals} weights={data.weights} profile={data.profile} />

      <div className="card">
        <h3>📝 אימונים אחרונים</h3>
        {recent.length === 0 && <p className="muted small">עוד אין אימונים.</p>}
        {recent.map((w) => (
          <details key={w.id} className="workout-details">
            <summary>
              <span><strong>{w.name}</strong> <span className="muted small">· {formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></span>
              <span className="muted small">{Math.round(workoutVolume(w)).toLocaleString()} ק״ג</span>
            </summary>
            {w.exercises.map((ex, i) => (
              <div key={i} className="small">
                <strong>{ex.name}:</strong>{' '}
                <span className="muted">{ex.sets.filter((s) => s.done).map((s) => `${s.weight}×${s.reps}`).join(', ') || 'לא הושלמו סטים'}</span>
              </div>
            ))}
            {w.notes && <div className="muted small">💬 {w.notes}</div>}
            {w.duration_min ? <div className="muted small">⏱️ {w.duration_min} דקות</div> : null}
          </details>
        ))}
      </div>

      {!isMe ? (
        <div className="card stack tight">
          <h3>⚙️ פעולות ניהול</h3>
          <button className="btn" disabled={busy} onClick={() => act(() => setAdmin(u.id, !u.is_admin))}>
            {u.is_admin ? 'הסרת הרשאת מנהל' : 'הפיכה למנהל'}
          </button>
          <button className="btn" disabled={busy} onClick={() => {
            if (u.banned || confirm(`לחסום את ${name}? הוא לא יוכל להתחבר לאפליקציה.`)) act(() => setBanned(u.id, !u.banned));
          }}>
            {u.banned ? '✅ ביטול חסימה' : '🚫 חסימת משתמש'}
          </button>
          <button className="btn danger" disabled={busy} onClick={() => {
            if (confirm(`למחוק את ${name} לצמיתות?\nכל האימונים, הארוחות והנתונים שלו יימחקו ואי אפשר לשחזר.`))
              act(() => deleteUser(u.id), () => navigate('/admin'));
          }}>🗑️ מחיקת משתמש</button>
        </div>
      ) : (
        <p className="muted small">זה החשבון שלך. אי אפשר לחסום, למחוק או להסיר הרשאת מנהל מעצמך.</p>
      )}
    </div>
  );
}
