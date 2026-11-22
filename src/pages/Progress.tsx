import { FormEvent, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { BodyWeight, Meal, Workout } from '../lib/types';
import { addDays, e1rm, formatDate, round, todayISO, weekStart, workoutVolume } from '../lib/utils';

const axis = { fontSize: 11, fill: 'var(--muted)' };
const tooltipStyle = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, direction: 'rtl' as const } };

export default function Progress() {
  const { profile } = useProfile();
  const weights = useTable<BodyWeight>('body_weights');
  const workouts = useTable<Workout>('workouts');
  const meals = useTable<Meal>('meals');
  const [w, setW] = useState('');
  const [wDate, setWDate] = useState(todayISO());

  const weightData = useMemo(() => [...weights.rows].sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, label: formatDate(r.date) })), [weights.rows]);

  // Workouts and volume per week, last 8 weeks.
  const weekly = useMemo(() => {
    const start = weekStart(todayISO());
    return Array.from({ length: 8 }, (_, i) => {
      const ws = addDays(start, -7 * (7 - i)), we = addDays(ws, 7);
      const list = workouts.rows.filter((x) => x.date >= ws && x.date < we);
      return { label: formatDate(ws), count: list.length, volume: Math.round(list.reduce((a, x) => a + workoutVolume(x), 0)) };
    });
  }, [workouts.rows]);

  // Calories per day, last 14 days.
  const calories = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = addDays(todayISO(), i - 13);
    return { label: formatDate(d), kcal: meals.rows.filter((m) => m.date === d).reduce((a, m) => a + m.calories, 0) };
  }), [meals.rows]);

  // Best estimated 1RM per exercise over time.
  const { prs, history } = useMemo(() => {
    const prs = new Map<string, { weight: number; reps: number; e: number; date: string }>();
    const history = new Map<string, { date: string; e: number }[]>();
    for (const wk of [...workouts.rows].sort((a, b) => a.date.localeCompare(b.date))) {
      for (const ex of wk.exercises) {
        const done = ex.sets.filter((s) => s.done && s.weight > 0);
        if (!done.length) continue;
        const top = done.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b));
        const e = round(e1rm(top.weight, top.reps), 1);
        const cur = prs.get(ex.name);
        if (!cur || e > cur.e) prs.set(ex.name, { weight: top.weight, reps: top.reps, e, date: wk.date });
        history.set(ex.name, [...(history.get(ex.name) ?? []), { date: formatDate(wk.date), e }]);
      }
    }
    return { prs, history };
  }, [workouts.rows]);
  const exerciseNames = [...history.keys()];
  const [chosen, setChosen] = useState<string>('');
  const selected = chosen || exerciseNames[0] || '';

  async function addWeight(e: FormEvent) {
    e.preventDefault();
    const val = Number(w);
    if (!val) return;
    const existing = weights.rows.find((r) => r.date === wDate);
    await weights.save({ id: existing?.id, date: wDate, weight: val });
    setW('');
  }

  const first = weightData[0]?.weight, last = weightData.at(-1)?.weight;

  return (
    <div className="stack">
      <h2>התקדמות</h2>

      <div className="card stack tight">
        <div className="row between">
          <h3>⚖️ משקל גוף</h3>
          {first !== undefined && last !== undefined && weightData.length > 1 && (
            <span className={last <= first ? 'good' : 'muted'}>{last - first > 0 ? '+' : ''}{round(last - first, 1)} ק״ג</span>
          )}
        </div>
        <form onSubmit={addWeight} className="row gap">
          <input type="number" step="0.1" inputMode="decimal" placeholder="משקל (ק״ג)" value={w} onChange={(e) => setW(e.target.value)} className="grow" />
          <input type="date" value={wDate} max={todayISO()} onChange={(e) => setWDate(e.target.value)} />
          <button className="btn primary">שמירה</button>
        </form>
        {weightData.length > 0 ? (
          <div dir="ltr" className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axis} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={axis} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} ק״ג`, 'משקל']} />
                {profile.weight_goal ? <ReferenceLine y={profile.weight_goal} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'יעד', fill: 'var(--amber)', fontSize: 11 }} /> : null}
                <Line type="monotone" dataKey="weight" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="muted small">הוסף שקילה ראשונה כדי לראות גרף.</p>}
      </div>

      <div className="card">
        <h3>🏋️ אימונים בשבוע</h3>
        <div dir="ltr" className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--track)' }}
                formatter={(v: number, k: string) => [k === 'count' ? `${v} אימונים` : `${v.toLocaleString()} ק״ג`, k === 'count' ? 'אימונים' : 'נפח']} />
              <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>🔥 קלוריות, 14 ימים אחרונים</h3>
        <div dir="ltr" className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={calories} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} interval={1} />
              <YAxis tick={axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--track)' }} formatter={(v: number) => [`${v} קק״ל`, 'קלוריות']} />
              <ReferenceLine y={profile.calorie_goal} stroke="var(--amber)" strokeDasharray="4 4" />
              <Bar dataKey="kcal" fill="var(--green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card stack tight">
        <h3>📈 כוח לפי תרגיל (1RM משוער)</h3>
        {exerciseNames.length === 0 ? <p className="muted small">סמן סטים כהושלמו באימונים כדי לראות התקדמות.</p> : (
          <>
            <select value={selected} onChange={(e) => setChosen(e.target.value)}>
              {exerciseNames.map((n) => <option key={n}>{n}</option>)}
            </select>
            <div dir="ltr" className="chart">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history.get(selected)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={axis} />
                  <YAxis tick={axis} domain={['auto', 'auto']} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} ק״ג`, '1RM משוער']} />
                  <Line type="monotone" dataKey="e" stroke="var(--pink)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {prs.size > 0 && (
        <div className="card">
          <h3>🏆 שיאים אישיים</h3>
          {[...prs.entries()].sort((a, b) => b[1].e - a[1].e).map(([name, pr]) => (
            <div key={name} className="list-item">
              <div>
                <div>{name}</div>
                <div className="muted small">{pr.weight} ק״ג × {pr.reps} · {formatDate(pr.date)}</div>
              </div>
              <strong>{pr.e} ק״ג</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
