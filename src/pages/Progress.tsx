import { FormEvent, useState } from 'react';
import { tr } from '../lib/i18n';
import { useTable } from '../lib/useTable';
import { useProfile } from '../lib/useProfile';
import type { BodyWeight, Workout } from '../lib/types';
import { todayISO } from '../lib/utils';
import ProgressCharts from '../components/ProgressCharts';

export default function Progress() {
  const { profile } = useProfile();
  const weights = useTable<BodyWeight>('body_weights');
  const workouts = useTable<Workout>('workouts');
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
      <h2>{tr('התקדמות', 'Progress')}</h2>
      <ProgressCharts
        workouts={workouts.rows} weights={weights.rows} profile={profile}
        weightForm={
          <form onSubmit={addWeight} className="row gap">
            <input type="number" step="0.1" inputMode="decimal" aria-label={tr('משקל (ק״ג)', 'Weight (kg)')} placeholder={tr('משקל (ק״ג)', 'Weight (kg)')} value={w} onChange={(e) => setW(e.target.value)} className="grow" />
            <input type="date" aria-label={tr('תאריך השקילה', 'Weigh-in date')} value={wDate} max={todayISO()} onChange={(e) => setWDate(e.target.value)} />
            <button className="btn primary">{tr('שמירה', 'Save')}</button>
          </form>
        }
      />
    </div>
  );
}
