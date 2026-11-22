import { ReactNode, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BodyWeight, Meal, Profile, Workout } from '../lib/types';
import { addDays, e1rm, formatDate, round, todayISO, weekStart, workoutVolume } from '../lib/utils';

const axis = { fontSize: 11, fill: 'var(--muted)' };
const tooltipStyle = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, direction: 'rtl' as const } };

interface Props {
  workouts: Workout[];
  meals: Meal[];
  weights: BodyWeight[];
  profile: Profile;
  /** Optional form shown inside the body-weight card (only for the user's own page). */
  weightForm?: ReactNode;
}

/** All progress charts for one user. Used on the user's own page and in the admin user view. */
export default function ProgressCharts({ workouts, meals, weights, profile, weightForm }: Props) {
  const weightData = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, label: formatDate(r.date) })), [weights]);

  const weekly = useMemo(() => {
    const start = weekStart(todayISO());
    return Array.from({ length: 8 }, (_, i) => {
      const ws = addDays(start, -7 * (7 - i)), we = addDays(ws, 7);
      const list = workouts.filter((x) => x.date >= ws && x.date < we);
      return { label: formatDate(ws), count: list.length, volume: Math.round(list.reduce((a, x) => a + workoutVolume(x), 0)) };
    });
  }, [workouts]);

  const calories = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = addDays(todayISO(), i - 13);
    return { label: formatDate(d), kcal: meals.filter((m) => m.date === d).reduce((a, m) => a + m.calories, 0) };
  }), [meals]);

  const { prs, history } = useMemo(() => {
    const prs = new Map<string, { weight: number; reps: number; e: number; date: string }>();
    const history = new Map<string, { date: string; e: number }[]>();
    for (const wk of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
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
  }, [workouts]);
  const exerciseNames = [...history.keys()];
  const [chosen, setChosen] = useState('');
  const selected = chosen || exerciseNames[0] || '';

  const first = weightData[0]?.weight, last = weightData.at(-1)?.weight;

  return (
    <>
      <div className="card stack tight">
        <div className="row between">
          <h3>⚖️ משקל גוף</h3>
          {first !== undefined && last !== undefined && weightData.length > 1 && (
            <span className={last <= first ? 'good' : 'muted'}><span dir="ltr">{last - first > 0 ? '+' : ''}{round(last - first, 1)}</span> ק״ג</span>
          )}
        </div>
        {weightForm}
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
        ) : <p className="muted small">עוד אין שקילות.</p>}
      </div>

      <div className="card">
        <h3>🏋️ אימונים בשבוע</h3>
        <div dir="ltr" className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--track)' }} formatter={(v: number) => [`${v} אימונים`, 'אימונים']} />
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
        {exerciseNames.length === 0 ? <p className="muted small">עוד אין סטים שהושלמו באימונים.</p> : (
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
    </>
  );
}
