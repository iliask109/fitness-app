import type { Profile, Program, ProgramSchedule, ScheduleSlot, Workout } from './types';
import { addDays } from './utils';

const WEEKDAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_MS = 86400000;
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / DAY_MS);
const weekday = (iso: string) => new Date(iso + 'T12:00:00').getDay();

/** The program's schedule; older programs without one get a sensible default. */
export function scheduleOf(p: Program): ProgramSchedule {
  if (p.schedule) return p.schedule;
  if (/מתחילים|כל הגוף/.test(p.name) && p.days.length <= 3) return { kind: 'weekly', weekdays: [0, 2, 4] };
  // Every day in order, then a rest day: Push/Pull/Legs -> 3 + rest, Upper/Lower -> 2 + rest.
  return { kind: 'cycle', pattern: [...p.days.map((_, i) => i as ScheduleSlot), 'rest'] };
}

export function describeSchedule(p: Program): string {
  const s = scheduleOf(p);
  if (s.kind === 'weekly') return `${s.weekdays.length} אימונים בשבוע: ${s.weekdays.map((d) => WEEKDAY_LETTERS[d]).join(', ')}`;
  return s.pattern.map((x) => (x === 'rest' ? 'מנוחה' : p.days[x]?.name ?? '?')).join(' ← ');
}

/** Most recent workout done from this program (by link, or by matching a day's name for older workouts). */
export function lastProgramWorkout(p: Program, workouts: Workout[]): { date: string; dayIndex: number } | null {
  let best: { date: string; created: string; dayIndex: number } | null = null;
  for (const w of workouts) {
    let dayIndex = -1;
    if (w.program_id === p.id && w.program_day != null && w.program_day < p.days.length) dayIndex = w.program_day;
    else if (!w.program_id) dayIndex = p.days.findIndex((d) => d.name === w.name);
    if (dayIndex < 0) continue;
    const created = w.created_at ?? '';
    if (!best || w.date > best.date || (w.date === best.date && created > best.created)) best = { date: w.date, created, dayIndex };
  }
  return best && { date: best.date, dayIndex: best.dayIndex };
}

type Last = { date: string; dayIndex: number } | null;

/** What the schedule says for `date`, given the last workout done before it. */
function planFor(p: Program, s: ProgramSchedule, date: string, last: Last): { train: true; dayIndex: number } | { train: false } {
  if (s.kind === 'weekly') {
    if (!s.weekdays.includes(weekday(date))) return { train: false };
    return { train: true, dayIndex: last ? (last.dayIndex + 1) % p.days.length : 0 };
  }
  const pat = s.pattern;
  const firstWorkout = pat.find((x) => x !== 'rest') as number | undefined;
  if (firstWorkout === undefined) return { train: false };
  if (!last) return { train: true, dayIndex: firstWorkout };
  // Rest days scheduled right after the last workout; a missed workout is never skipped, it waits for the next day.
  let pos = Math.max(0, pat.indexOf(last.dayIndex));
  let rest = 0, next = firstWorkout;
  for (let k = 1; k <= pat.length; k++) {
    const slot = pat[(pos + k) % pat.length];
    if (slot === 'rest') rest++;
    else { next = slot; break; }
  }
  return daysBetween(last.date, date) <= rest ? { train: false } : { train: true, dayIndex: next };
}

export type TodayPlan =
  | { kind: 'train'; dayIndex: number }
  | { kind: 'rest'; next?: { dayIndex: number; date: string } }
  | { kind: 'done'; dayIndex: number; next?: { dayIndex: number; date: string } };

export function planToday(p: Program, workouts: Workout[], today: string): TodayPlan | null {
  if (!p.days.length) return null;
  const s = scheduleOf(p);
  const last = lastProgramWorkout(p, workouts);
  const nextAfter = (from: string, l: Last) => {
    for (let k = 1; k <= 14; k++) {
      const date = addDays(from, k);
      const r = planFor(p, s, date, l);
      if (r.train) return { dayIndex: r.dayIndex, date };
    }
    return undefined;
  };
  if (last && last.date === today) return { kind: 'done', dayIndex: last.dayIndex, next: nextAfter(today, last) };
  const r = planFor(p, s, today, last);
  return r.train ? { kind: 'train', dayIndex: r.dayIndex } : { kind: 'rest', next: nextAfter(today, last) };
}

/** The program the user follows: their explicit choice, else the one they trained from last, else the newest. */
export function activeProgram(programs: Program[], workouts: Workout[], profile: Profile): Program | null {
  if (!programs.length) return null;
  const chosen = programs.find((p) => p.id === profile.active_program_id);
  if (chosen) return chosen;
  const recent = [...workouts].filter((w) => w.program_id).sort((a, b) => b.date.localeCompare(a.date))[0];
  return programs.find((p) => p.id === recent?.program_id) ?? programs[programs.length - 1];
}

/** "מחר", "ביום שלישי", or a date, for an upcoming day. */
export function whenLabel(date: string, today: string) {
  const d = daysBetween(today, date);
  if (d === 1) return 'מחר';
  if (d < 7) return 'ביום ' + new Date(date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long' }).replace('יום ', '');
  return new Date(date + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
