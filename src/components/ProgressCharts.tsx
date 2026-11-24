import { ReactNode, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BodyWeight, Meal, Profile, Workout } from '../lib/types';
import { addDays, formatDate, round, todayISO, weekStart, workoutVolume } from '../lib/utils';
import { nextNutritionUpdate } from '../lib/nutrition';
import { GOAL_PERIODS, GOALS, goalEndDate, labelOf } from '../lib/fitnessProfile';

const axis = { fontSize: 11, fill: 'var(--muted)' };
const tooltipStyle = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, direction: 'rtl' as const } };

interface Props {
  workouts: Workout[];
  meals: Meal[];
  weights: BodyWeight[];
  profile: Profile;
  /** Optional form shown inside the body-weight card (only for the user's own page). */
  weightForm?: ReactNode;
  /** Optional progress-photos card, shown after the body-weight card (only on the user's own page). */
  photos?: ReactNode;
}

/** All progress charts for one user. Used on the user's own page and in the admin user view. */
export default function ProgressCharts({ workouts, meals, weights, profile, weightForm, photos }: Props) {
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

  // Working weight per workout = the heaviest completed set of that exercise (more reps wins a tie).
  const { prs, history } = useMemo(() => {
    const prs = new Map<string, { weight: number; reps: number; date: string }>();
    const history = new Map<string, { date: string; weight: number; reps: number }[]>();
    const heavier = (a: { weight: number; reps: number }, b: { weight: number; reps: number }) =>
      a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);
    for (const wk of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
      for (const ex of wk.exercises) {
        const done = ex.sets.filter((s) => s.done && s.weight > 0);
        if (!done.length) continue;
        const top = done.reduce((b, s) => (heavier(s, b) ? s : b));
        const cur = prs.get(ex.name);
        if (!cur || heavier(top, cur)) prs.set(ex.name, { weight: top.weight, reps: top.reps, date: wk.date });
        history.set(ex.name, [...(history.get(ex.name) ?? []), { date: formatDate(wk.date), weight: top.weight, reps: top.reps }]);
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
      <GoalCard profile={profile} lastWeight={last} own={!!weightForm} />
      <NutritionGoals profile={profile} />

      <div className="card stack tight">
        <div className="row between">
          <h3>⚖️ משקל גוף</h3>
        </div>
        {first !== undefined && last !== undefined && <WeightChange first={first} last={last} count={weightData.length} goal={profile.fitness_goal} />}
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

      {photos}

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
        <h3>📈 מעקב משקלי עבודה</h3>
        {exerciseNames.length === 0 ? <p className="muted small">עוד אין סטים שהושלמו באימונים.</p> : (
          <>
            <select value={selected} onChange={(e) => setChosen(e.target.value)} aria-label="תרגיל">
              {exerciseNames.map((n) => <option key={n}>{n}</option>)}
            </select>
            <GainSummary points={history.get(selected) ?? []} />
            <div dir="ltr" className="chart">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history.get(selected)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={axis} />
                  <YAxis tick={axis} domain={['auto', 'auto']} />
                  <Tooltip {...tooltipStyle}
                    formatter={(v: number, _n: string, item: { payload?: { reps: number } }) => [`${v} ק״ג × ${item.payload?.reps ?? ''}`, 'משקל עבודה']} />
                  <Line type="monotone" dataKey="weight" stroke="var(--pink)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {prs.size > 0 && (
        <div className="card">
          <h3>🏆 שיאים אישיים</h3>
          {[...prs.entries()].sort((a, b) => b[1].weight - a[1].weight).map(([name, pr]) => (
            <div key={name} className="list-item">
              <div>
                <div>{name}</div>
                <div className="muted small">{pr.reps} חזרות · {formatDate(pr.date)}</div>
              </div>
              <strong>{pr.weight} ק״ג</strong>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** "40 kg ← 50 kg · +10 kg since the start" for the selected exercise. */
function GainSummary({ points }: { points: { weight: number }[] }) {
  if (!points.length) return null;
  const first = points[0].weight, last = points[points.length - 1].weight;
  if (points.length === 1) return <div className="gain muted small">משקל התחלה: {first} ק״ג. אחרי האימון הבא תראה כמה התקדמת.</div>;
  const diff = round(last - first, 1);
  return (
    <div className="gain">
      <span className="small muted">התחלה <strong className="gain-num">{first}</strong> ק״ג ← עכשיו <strong className="gain-num">{last}</strong> ק״ג</span>
      <span className={'gain-badge ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '')}>
        {diff > 0 ? <><span dir="ltr">+{diff}</span> ק״ג מההתחלה 💪</> : diff < 0 ? <><span dir="ltr">{diff}</span> ק״ג מההתחלה</> : 'אותו משקל כמו בהתחלה'}
      </span>
    </div>
  );
}

/** "Started at 80 kg, now 77 kg: down 3 kg since the start", green when the change matches the goal. */
function WeightChange({ first, last, count, goal }: { first: number; last: number; count: number; goal?: string | null }) {
  if (count < 2) return <div className="gain muted small">משקל התחלה: {first} ק״ג. בשקילה הבאה תראה כמה השתנה מתחילת התהליך.</div>;
  const diff = round(last - first, 1);
  const good = goal === 'bulk' ? diff > 0 : goal === 'maintain' ? Math.abs(diff) <= 1 : diff < 0;
  return (
    <div className="gain">
      <span className="small muted">התחלה <strong className="gain-num">{first}</strong> ק״ג ← עכשיו <strong className="gain-num">{last}</strong> ק״ג</span>
      <span className={'gain-badge ' + (diff === 0 ? '' : good ? 'up' : 'down')}>
        {diff < 0 ? <>ירידה של <span dir="ltr">{-diff}</span> ק״ג מתחילת התהליך</>
          : diff > 0 ? <>עלייה של <span dir="ltr">{diff}</span> ק״ג מתחילת התהליך</>
          : 'אותו משקל כמו בתחילת התהליך'}
      </span>
    </div>
  );
}

/** The goal chosen in the training profile, its target date and how much time is left. */
function GoalCard({ profile, lastWeight, own }: { profile: Profile; lastWeight?: number; own: boolean }) {
  const end = goalEndDate(profile);
  const start = profile.goal_start ?? profile.onboarded_at?.slice(0, 10);
  if (!profile.fitness_goal && !end) return null;
  const goal = GOALS.find((g) => g.key === profile.fitness_goal);
  const period = GOAL_PERIODS.find((p) => p.key === profile.goal_months);
  const day = 86400000, today = new Date(todayISO() + 'T12:00:00').getTime();
  const left = end ? Math.round((new Date(end + 'T12:00:00').getTime() - today) / day) : null;
  const total = end && start ? Math.max(1, Math.round((new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / day)) : null;
  const pct = total && left != null ? Math.min(100, Math.max(0, ((total - left) / total) * 100)) : 0;
  const toGoal = profile.weight_goal && lastWeight !== undefined ? round(profile.weight_goal - lastWeight, 1) : null;
  return (
    <div className="card stack tight">
      <div className="row between">
        <h3>🎯 {own ? 'היעד שלי' : 'היעד'}</h3>
        {goal && <span className="chip">{goal.icon} {labelOf(GOALS, profile.fitness_goal)}</span>}
      </div>
      {end ? (
        <>
          <div className="row between small">
            <span className="muted">{period ? `${period.label} · ` : ''}תאריך יעד: <strong>{formatDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            <span className={left! < 0 ? 'muted' : 'good'}>{left! > 0 ? `נשארו ${left} ימים` : left === 0 ? 'היום! 🎉' : 'תאריך היעד עבר'}</span>
          </div>
          <div className="bar"><div style={{ width: pct + '%', background: 'var(--primary)' }} /></div>
          {start && <span className="muted small">התחלה: {formatDate(start, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        </>
      ) : own ? (
        <a className="btn small" href="#/profile-setup">⏳ בחירת תאריך יעד (3 חודשים, חצי שנה או שנה)</a>
      ) : <span className="muted small">לא נבחר תאריך יעד.</span>}
      {profile.weight_goal ? (
        <span className="small">משקל יעד: <strong>{profile.weight_goal}</strong> ק״ג
          {toGoal != null && toGoal !== 0 ? <span className="muted"> · עוד <span dir="ltr">{Math.abs(toGoal)}</span> ק״ג {toGoal < 0 ? 'להוריד' : 'לעלות'}</span> : toGoal === 0 ? <span className="good"> · היעד הושג! 🎉</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/** Daily nutrition goals: read-only, calculated from the body weight and updated every month. */
function NutritionGoals({ profile }: { profile: Profile }) {
  const next = nextNutritionUpdate(profile);
  const items = [
    { label: 'קלוריות', value: profile.calorie_goal, unit: 'קק״ל' },
    { label: 'חלבון', value: profile.protein_goal, unit: 'ג׳' },
    { label: 'פחמימות', value: profile.carbs_goal, unit: 'ג׳' },
    { label: 'שומן', value: profile.fat_goal, unit: 'ג׳' },
  ];
  return (
    <div className="card stack tight">
      <h3>🍽️ יעדי תזונה יומיים</h3>
      <div className="grid4 nutrition-goals">
        {items.map((x) => (
          <div key={x.label} className="stat"><span className="stat-num">{x.value}</span><span className="muted small">{x.unit} {x.label}</span></div>
        ))}
      </div>
      <span className="muted small">
        {profile.nutrition_weight ? <>מחושב לפי משקל {profile.nutrition_weight} ק״ג. </> : null}
        מתעדכן אוטומטית כל חודש לפי המשקל האחרון{next ? <> · עדכון הבא: {formatDate(next, { day: 'numeric', month: 'long' })}</> : null}.
      </span>
    </div>
  );
}
