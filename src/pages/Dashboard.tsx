import { useMemo } from 'react';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { BodyWeight, Meal, WaterLog, Workout } from '../lib/types';
import { formatDate, todayISO, weekStart, workoutVolume, round } from '../lib/utils';
import Ring from '../components/Ring';

export default function Dashboard() {
  const today = todayISO();
  const { profile } = useProfile();
  const workouts = useTable<Workout>('workouts');
  const meals = useTable<Meal>('meals');
  const water = useTable<WaterLog>('water_logs');
  const weights = useTable<BodyWeight>('body_weights');

  const todayMeals = meals.rows.filter((m) => m.date === today);
  const kcal = todayMeals.reduce((a, m) => a + m.calories, 0);
  const protein = todayMeals.reduce((a, m) => a + m.protein, 0);
  const glasses = water.rows.find((w) => w.date === today)?.glasses ?? 0;

  const week = weekStart(today);
  const weekWorkouts = workouts.rows.filter((w) => w.date >= week);
  const sorted = useMemo(() => [...workouts.rows].sort((a, b) => b.date.localeCompare(a.date)), [workouts.rows]);
  const lastWeight = [...weights.rows].sort((a, b) => b.date.localeCompare(a.date))[0];

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <div className="stack">
      <h2>{greet}{(profile.first_name || profile.display_name) ? `, ${profile.first_name || profile.display_name}` : ''} 👋</h2>
      <p className="muted">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <div className="card rings">
        <Ring value={kcal} goal={profile.calorie_goal} label="קלוריות" color="var(--green)" />
        <Ring value={round(protein)} goal={profile.protein_goal} label="חלבון (ג׳)" color="var(--blue)" />
        <Ring value={glasses} goal={profile.water_goal} label="כוסות מים" color="var(--cyan)" />
      </div>

      <div className="grid2">
        <div className="card stat">
          <span className="stat-num">{weekWorkouts.length}</span>
          <span className="muted">אימונים השבוע</span>
        </div>
        <div className="card stat">
          <span className="stat-num">{lastWeight ? lastWeight.weight : '–'}</span>
          <span className="muted">משקל אחרון (ק״ג)</span>
        </div>
      </div>

      <div className="row gap">
        <a className="btn primary grow" href="#/workouts/new">+ אימון חדש</a>
        <a className="btn grow" href="#/nutrition">+ ארוחה</a>
      </div>

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
