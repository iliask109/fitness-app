import { useEffect, useMemo, useState } from 'react';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { BodyWeight, Program, Workout } from '../lib/types';
import TodayCard from '../components/TodayCard';
import { activeProgram } from '../lib/schedule';
import { formatDate, workoutVolume } from '../lib/utils';
import WeekView from '../components/WeekView';
import WeightDialog from '../components/WeightDialog';

/** Current time, refreshed every few seconds so the clock and greeting stay up to date. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 18) return 'צהריים טובים';
  return 'ערב טוב';
}

export default function Dashboard() {
  const now = useNow();
  const { profile } = useProfile();
  const workouts = useTable<Workout>('workouts');
  const weights = useTable<BodyWeight>('body_weights');
  const programs = useTable<Program>('programs');
  const active = programs.loading ? null : activeProgram(programs.rows, workouts.rows, profile);
  const [weightOpen, setWeightOpen] = useState(false);

  const sorted = useMemo(() => [...workouts.rows].sort((a, b) => b.date.localeCompare(a.date)), [workouts.rows]);
  const lastWeight = [...weights.rows].sort((a, b) => b.date.localeCompare(a.date))[0];

  const fullName = [profile.first_name || profile.display_name, profile.last_name].filter(Boolean).join(' ');

  return (
    <div className="stack">
      <div className="hello">
        <h2>{greeting(now.getHours())}{fullName ? `, ${fullName}` : ''} 👋</h2>
        <div className="clock">
          <span className="clock-time" dir="ltr">{now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="muted">{now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {!programs.loading && !workouts.loading && <TodayCard program={active} workouts={workouts.rows} />}

      <WeekView workouts={workouts.rows} goal={profile.training_days || 3} program={active} />

      <div className="grid2">
        <div className="card stat">
          <span className="stat-num">{workouts.rows.length}</span>
          <span className="muted">אימונים בסך הכול</span>
        </div>
        <div className="card stat">
          <span className="stat-num">{lastWeight ? lastWeight.weight : '–'}</span>
          <span className="muted">משקל אחרון (ק״ג)</span>
        </div>
      </div>

      <div className="grid2">
        <a className="btn primary big" href="#/workouts/new">+ אימון חדש</a>
        <button className="btn big" onClick={() => setWeightOpen(true)}>+ משקל חדש</button>
      </div>
      {weightOpen && <WeightDialog weights={weights.rows} save={weights.save} onClose={() => setWeightOpen(false)} />}

      <div className="card">
        <h3>אימונים אחרונים</h3>
        {sorted.length === 0 && <p className="muted">עוד אין אימונים. הזמן להתחיל!</p>}
        {sorted.slice(0, 4).map((w) => (
          <a key={w.id} href={`#/workouts/${w.id}`} className="list-item">
            <div>
              <strong>{w.name}</strong>
              <div className="muted small">{formatDate(w.date)} · {w.exercises.length} תרגילים</div>
            </div>
            <span className="muted small">{Math.round(workoutVolume(w)).toLocaleString()} ק״ג נפח</span>
          </a>
        ))}
      </div>
    </div>
  );
}
