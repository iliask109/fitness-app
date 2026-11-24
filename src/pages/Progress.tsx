import { FormEvent, useState } from 'react';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { BodyWeight, Meal, Workout } from '../lib/types';
import { todayISO } from '../lib/utils';
import ProgressCharts from '../components/ProgressCharts';
import ProgressPhotos from '../components/ProgressPhotos';

export default function Progress() {
  const { profile } = useProfile();
  const weights = useTable<BodyWeight>('body_weights');
  const workouts = useTable<Workout>('workouts');
  const meals = useTable<Meal>('meals');
  const [w, setW] = useState('');
  const [wDate, setWDate] = useState(todayISO());

  async function addWeight(e: FormEvent) {
    e.preventDefault();
    const val = Number(w);
    if (!val) return;
    const existing = weights.rows.find((r) => r.date === wDate);
    await weights.save({ id: existing?.id, date: wDate, weight: val });
    setW('');
  }

  return (
    <div className="stack">
      <h2>התקדמות</h2>
      <ProgressCharts
        workouts={workouts.rows} meals={meals.rows} weights={weights.rows} profile={profile}
        weightForm={
          <form onSubmit={addWeight} className="row gap">
            <input type="number" step="0.1" inputMode="decimal" placeholder="משקל (ק״ג)" value={w} onChange={(e) => setW(e.target.value)} className="grow" />
            <input type="date" value={wDate} max={todayISO()} onChange={(e) => setWDate(e.target.value)} />
            <button className="btn primary">שמירה</button>
          </form>
        }
        photos={<ProgressPhotos weights={weights.rows} gender={profile.gender} />}
      />
    </div>
  );
}
