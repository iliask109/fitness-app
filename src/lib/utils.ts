import type { Workout } from './types';

export const todayISO = () => toISO(new Date());
export function toISO(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('he-IL', opts);
}
/** Estimated one-rep max (Epley). */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export function workoutVolume(w: Workout) {
  return w.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.done).reduce((a, s) => a + s.reps * s.weight, 0), 0);
}
export const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/** Start of the week (Sunday, as in Israel) for a date. */
export function weekStart(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return toISO(d);
}
