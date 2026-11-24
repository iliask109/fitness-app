import { ReactNode, useMemo, useState } from 'react';
import { tr, tx } from '../lib/i18n';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BodyWeight, Profile, Workout } from '../lib/types';
import { addDays, formatDate, round, todayISO, weekStart, workoutVolume } from '../lib/utils';
import { nextNutritionUpdate } from '../lib/nutrition';
import { GOAL_PERIODS, GOALS, goalEndDate, labelOf } from '../lib/fitnessProfile';

const axis = { fontSize: 11, fill: 'var(--muted)' };
const tooltipStyle = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, direction: 'rtl' as const } };

interface Props {
  workouts: Workout[];
  weights: BodyWeight[];
  profile: Profile;
  /** Optional form shown inside the body-weight card (only for the user's own page). */
  weightForm?: ReactNode;
}

/** All progress charts for one user. Used on the user's own page and in the admin user view. */
export default function ProgressCharts({ workouts, weights, profile, weightForm }: Props) {
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
          <h3>{tr('⚖️ משקל גוף', '⚖️ Body weight')}</h3>
        </div>
        {first !== undefined && last !== undefined && <WeightChange first={first} last={last} count={weightData.length} goal={profile.fitness_goal} />}
        {weightForm}
        {weightData.length > 0 ? (
          <div dir="ltr" className="chart" role="img" aria-label={tr('גרף משקל גוף: ', 'Body weight chart: ') + weightData.slice(-10).map((d) => `${d.label} ${d.weight}`).join(', ')}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axis} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={axis} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} ${tr('ק״ג', 'kg')}`, tr('משקל', 'Weight')]} />
                {profile.weight_goal ? <ReferenceLine y={profile.weight_goal} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: tr('יעד', 'Goal'), fill: 'var(--amber)', fontSize: 11 }} /> : null}
                <Line type="monotone" dataKey="weight" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="muted small">{tr('עוד אין שקילות.', 'No weigh-ins yet.')}</p>}
      </div>

      <div className="card">
        <h3>{tr('🏋️ אימונים בשבוע', '🏋️ Workouts per week')}</h3>
        <div dir="ltr" className="chart" role="img" aria-label={tr('אימונים בכל שבוע: ', 'Workouts per week: ') + weekly.map((w) => `${w.label} ${w.count}`).join(', ')}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--track)' }} formatter={(v: number) => [`${v} ${tr('אימונים', 'workouts')}`, tr('אימונים', 'Workouts')]} />
              <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card stack tight">
        <h3>{tr('📈 מעקב משקלי עבודה', '📈 Working weights')}</h3>
        {exerciseNames.length === 0 ? <p className="muted small">{tr('עוד אין סטים שהושלמו באימונים.', 'No completed sets in your workouts yet.')}</p> : (
          <>
            <select value={selected} onChange={(e) => setChosen(e.target.value)} aria-label={tr('תרגיל', 'Exercise')}>
              {exerciseNames.map((n) => <option key={n} value={n}>{tx(n)}</option>)}
            </select>
            <GainSummary points={history.get(selected) ?? []} />
            <div dir="ltr" className="chart" role="img" aria-label={tr(`משקל עבודה ב${tx(selected)}: `, `Working weight for ${tx(selected)}: `) + (history.get(selected) ?? []).slice(-10).map((h) => `${h.date} ${h.weight}×${h.reps}`).join(', ')}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history.get(selected)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={axis} />
                  <YAxis tick={axis} domain={['auto', 'auto']} />
                  <Tooltip {...tooltipStyle}
                    formatter={(v: number, _n: string, item: { payload?: { reps: number } }) => [`${v} ${tr('ק״ג', 'kg')} × ${item.payload?.reps ?? ''}`, tr('משקל עבודה', 'Working weight')]} />
                  <Line type="monotone" dataKey="weight" stroke="var(--pink)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {prs.size > 0 && (
        <div className="card">
          <h3>{tr('🏆 שיאים אישיים', '🏆 Personal records')}</h3>
          {[...prs.entries()].sort((a, b) => b[1].weight - a[1].weight).map(([name, pr]) => (
            <div key={name} className="list-item">
              <div>
                <div>{tx(name)}</div>
                <div className="muted small">{pr.reps} {tr('חזרות', 'reps')} · {formatDate(pr.date)}</div>
              </div>
              <strong>{pr.weight} {tr('ק״ג', 'kg')}</strong>
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
  if (points.length === 1) return <div className="gain muted small">{tr(`משקל התחלה: ${first} ק״ג. אחרי האימון הבא תראה כמה התקדמת.`, `Starting weight: ${first} kg. After your next workout you'll see how much you progressed.`)}</div>;
  const diff = round(last - first, 1);
  return (
    <div className="gain">
      <span className="small muted">{tr('התחלה', 'Start')} <strong className="gain-num">{first}</strong> {tr('ק״ג ← עכשיו', 'kg → now')} <strong className="gain-num">{last}</strong> {tr('ק״ג', 'kg')}</span>
      <span className={'gain-badge ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '')}>
        {diff > 0 ? <><span dir="ltr">+{diff}</span> {tr('ק״ג מההתחלה 💪', 'kg since the start 💪')}</> : diff < 0 ? <><span dir="ltr">{diff}</span> {tr('ק״ג מההתחלה', 'kg since the start')}</> : tr('אותו משקל כמו בהתחלה', 'Same weight as at the start')}
      </span>
    </div>
  );
}

/** "Started at 80 kg, now 77 kg: down 3 kg since the start", green when the change matches the goal. */
function WeightChange({ first, last, count, goal }: { first: number; last: number; count: number; goal?: string | null }) {
  if (count < 2) return <div className="gain muted small">{tr(`משקל התחלה: ${first} ק״ג. בשקילה הבאה תראה כמה השתנה מתחילת התהליך.`, `Starting weight: ${first} kg. At your next weigh-in you'll see how much it changed since the start.`)}</div>;
  const diff = round(last - first, 1);
  const good = goal === 'bulk' ? diff > 0 : goal === 'maintain' ? Math.abs(diff) <= 1 : diff < 0;
  return (
    <div className="gain">
      <span className="small muted">{tr('התחלה', 'Start')} <strong className="gain-num">{first}</strong> {tr('ק״ג ← עכשיו', 'kg → now')} <strong className="gain-num">{last}</strong> {tr('ק״ג', 'kg')}</span>
      <span className={'gain-badge ' + (diff === 0 ? '' : good ? 'up' : 'down')}>
        {diff < 0 ? <>{tr('ירידה של', 'Down')} <span dir="ltr">{-diff}</span> {tr('ק״ג מתחילת התהליך', 'kg since the start')}</>
          : diff > 0 ? <>{tr('עלייה של', 'Up')} <span dir="ltr">{diff}</span> {tr('ק״ג מתחילת התהליך', 'kg since the start')}</>
          : tr('אותו משקל כמו בתחילת התהליך', 'Same weight as at the start')}
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
        <h3>🎯 {own ? tr('היעד שלי', 'My goal') : tr('היעד', 'Goal')}</h3>
        {goal && <span className="chip">{goal.icon} {labelOf(GOALS, profile.fitness_goal)}</span>}
      </div>
      {end ? (
        <>
          <div className="row between small">
            <span className="muted">{period ? `${period.label} · ` : ''}{tr('תאריך יעד:', 'Target date:')} <strong>{formatDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            <span className={left! < 0 ? 'muted' : 'good'}>{left! > 0 ? tr(`נשארו ${left} ימים`, `${left} days left`) : left === 0 ? tr('היום! 🎉', 'Today! 🎉') : tr('תאריך היעד עבר', 'The target date has passed')}</span>
          </div>
          <div className="bar"><div style={{ width: pct + '%', background: 'var(--primary)' }} /></div>
          {start && <span className="muted small">{tr('התחלה:', 'Started:')} {formatDate(start, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        </>
      ) : own ? (
        <a className="btn small" href="#/profile-setup">{tr('⏳ בחירת תאריך יעד (3 חודשים, חצי שנה או שנה)', '⏳ Choose a target date (3 months, 6 months or a year)')}</a>
      ) : <span className="muted small">{tr('לא נבחר תאריך יעד.', 'No target date chosen.')}</span>}
      {profile.weight_goal ? (
        <span className="small">{tr('משקל יעד:', 'Target weight:')} <strong>{profile.weight_goal}</strong> {tr('ק״ג', 'kg')}
          {toGoal != null && toGoal !== 0 ? <span className="muted"> · {tr('עוד', '')} <span dir="ltr">{Math.abs(toGoal)}</span> {tr('ק״ג', 'kg')} {toGoal < 0 ? tr('להוריד', 'to lose') : tr('לעלות', 'to gain')}</span> : toGoal === 0 ? <span className="good"> · {tr('היעד הושג! 🎉', 'Goal reached! 🎉')}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/** Daily nutrition goals: read-only, calculated from the body weight and updated every month. */
function NutritionGoals({ profile }: { profile: Profile }) {
  const next = nextNutritionUpdate(profile);
  const items = [
    { label: tr('קלוריות', 'kcal'), value: profile.calorie_goal, unit: tr('קק״ל', '') },
    { label: tr('חלבון', 'protein'), value: profile.protein_goal, unit: tr('ג׳', 'g') },
    { label: tr('פחמימות', 'carbs'), value: profile.carbs_goal, unit: tr('ג׳', 'g') },
    { label: tr('שומן', 'fat'), value: profile.fat_goal, unit: tr('ג׳', 'g') },
  ];
  return (
    <div className="card stack tight">
      <h3>{tr('🍽️ יעדי תזונה יומיים', '🍽️ Daily nutrition goals')}</h3>
      <div className="grid4 nutrition-goals">
        {items.map((x) => (
          <div key={x.label} className="stat"><span className="stat-num">{x.value}</span><span className="muted small">{x.unit} {x.label}</span></div>
        ))}
      </div>
      <span className="muted small">
        {profile.nutrition_weight ? <>{tr(`מחושב לפי משקל ${profile.nutrition_weight} ק״ג. `, `Calculated for a weight of ${profile.nutrition_weight} kg. `)}</> : null}
        {tr('מתעדכן אוטומטית כל חודש לפי המשקל האחרון', 'Updated automatically every month from your latest weight')}{next ? <> · {tr('עדכון הבא:', 'Next update:')} {formatDate(next, { day: 'numeric', month: 'long' })}</> : null}.
      </span>
    </div>
  );
}
