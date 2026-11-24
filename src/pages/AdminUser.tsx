import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { AdminUser as AdminUserT, deleteUser, fullName, listUsers, setAdmin, setBanned } from '../lib/admin';
import { listRows } from '../lib/db';
import { navigate } from '../lib/router';
import { BodyWeight, DEFAULT_PROFILE, Meal, Profile, Workout } from '../lib/types';
import { addDays, currentAge, daysAgo, formatDate, todayISO, weekStart, workoutVolume } from '../lib/utils';
import ProgressCharts from '../components/ProgressCharts';
import AdminMealPlan from '../components/AdminMealPlan';
import ConfirmInline from '../components/ConfirmInline';
import { EXPERIENCE, GOAL_PERIODS, GOALS, LOCATIONS, labelOf } from '../lib/fitnessProfile';

interface Data { workouts: Workout[]; meals: Meal[]; weights: BodyWeight[]; profile: Profile }

export default function AdminUser({ id }: { id: string }) {
  const { user: me, isAdmin } = useAuth();
  const [u, setU] = useState<AdminUserT | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<'ban' | 'delete' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    try { await fn(); setAsking(null); done ? done() : await load(); }
    catch (e) { setActionError((e as Error).message); }
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
        {(age != null || u.birth_date || data.profile.gender) && (
          <div className="small">
            {data.profile.gender && <>{data.profile.gender === 'male' ? 'זכר' : 'נקבה'} · </>}
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
        <h3>🏋️ פרופיל אימון</h3>
        {!data.profile.onboarded_at ? <p className="muted small">המשתמש עוד לא מילא את פרופיל האימון.</p> : (
          <div className="info-grid">
            <span className="muted">גובה</span><span>{data.profile.height_cm} ס״מ</span>
            {u.last_weight != null && data.profile.height_cm ? (
              <><span className="muted">BMI</span><span>{(u.last_weight / (data.profile.height_cm / 100) ** 2).toFixed(1)}</span></>
            ) : null}
            <span className="muted">ניסיון</span><span>{labelOf(EXPERIENCE, data.profile.experience)}</span>
            <span className="muted">מטרה</span><span>{labelOf(GOALS, data.profile.fitness_goal)}</span>
            <span className="muted">תוך</span><span>{GOAL_PERIODS.find((p) => p.key === data.profile.goal_months)?.label ?? '–'}</span>
            <span className="muted">ימי אימון</span><span>{data.profile.training_days} בשבוע</span>
            <span className="muted">איפה</span><span>{(data.profile.training_locations ?? []).map((l) => labelOf(LOCATIONS, l)).join(', ')}</span>
            <span className="muted">ציוד</span><span>{(data.profile.equipment ?? []).join(', ')}</span>
          </div>
        )}
      </div>

      <div className="card stack tight">
        <h3>🎯 יעדים</h3>
        <div className="chips">
          <span className="chip">{data.profile.calorie_goal} קק״ל</span>
          <span className="chip">{data.profile.protein_goal} ג׳ חלבון</span>
          {data.profile.weight_goal ? <span className="chip">משקל יעד {data.profile.weight_goal}</span> : null}
        </div>
      </div>

      <AdminMealPlan uid={id} calorieGoal={data.profile.calorie_goal} />
      <a className="btn" href={`#/admin-messages/${id}`}>💬 הודעות עם המשתמש</a>

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
                <strong>{ex.name}{ex.notes?.trim() ? ` (📝 ${ex.notes.trim()})` : ''}:</strong>{' '}
                <span className="muted" dir={ex.sets.some((s) => s.done) ? 'ltr' : undefined}>{ex.sets.filter((s) => s.done).map((s) => `${s.weight}×${s.reps}`).join(', ') || 'לא הושלמו סטים'}</span>
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
          {asking === 'ban' ? (
            <ConfirmInline message={`לחסום את ${name}? ${data.profile.gender === 'female' ? 'היא לא תוכל' : 'הוא לא יוכל'} להתחבר לאפליקציה.`}
              confirmLabel="כן, לחסום" busy={busy} onCancel={() => setAsking(null)} onConfirm={() => act(() => setBanned(u.id, true))} />
          ) : (
            <button className="btn" disabled={busy} onClick={() => (u.banned ? act(() => setBanned(u.id, false)) : setAsking('ban'))}>
              {u.banned ? '✅ ביטול חסימה' : '🚫 חסימת משתמש'}
            </button>
          )}
          {asking === 'delete' ? (
            <ConfirmInline message={`למחוק את ${name} לצמיתות? כל האימונים, הארוחות והנתונים יימחקו ואי אפשר לשחזר.`}
              busy={busy} onCancel={() => setAsking(null)} onConfirm={() => act(() => deleteUser(u.id), () => navigate('/admin'))} />
          ) : (
            <button className="btn danger" disabled={busy} onClick={() => setAsking('delete')}>🗑️ מחיקת משתמש</button>
          )}
          {actionError && <p className="notice" role="alert" style={{ margin: 0 }}>{actionError}</p>}
        </div>
      ) : (
        <p className="muted small">זה החשבון שלך. אי אפשר לחסום, למחוק או להסיר הרשאת מנהל מעצמך.</p>
      )}
    </div>
  );
}
