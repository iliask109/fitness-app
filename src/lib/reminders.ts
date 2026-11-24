import type { Profile, Program, Workout } from './types';
import { activeProgram, planToday } from './schedule';
import { addDays, weekStart } from './utils';
import { CONTENT_EN } from './contentEn';

/** Reminder settings kept on the profile. */
export interface ReminderSettings {
  reminder_enabled?: boolean | null;
  /** "HH:MM" in the user's own time zone. */
  reminder_time?: string | null;
  reminder_tz?: string | null;
  remind_training_day?: boolean | null;
  remind_no_workout?: boolean | null;
  /** Local date of the last reminder sent, so at most one goes out per day. */
  last_reminded_on?: string | null;
}

export const DEFAULT_REMINDER_TIME = '18:00';
/** How often the server checks; a reminder is due within this many minutes after its time. */
export const CHECK_EVERY_MIN = 15;
/** "No workout this week" starts on Tuesday (Sunday = 0), giving the week a fair start. */
const NO_WORKOUT_FROM_WEEKDAY = 2;

/** Local date ("YYYY-MM-DD"), minutes since midnight and weekday of `now` in a time zone. */
export function localNow(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: new Date(date + 'T12:00:00Z').getUTCDay() };
}

/**
 * Cheap check without any workout data: reminders on, the current 15-minute slot holds the chosen time,
 * and nothing was sent today. The server only loads data for users who pass it.
 */
export function isDue(profile: ReminderSettings, now: Date): boolean {
  if (!profile.reminder_enabled) return false;
  const local = localNow(now, profile.reminder_tz || 'Asia/Jerusalem');
  const [h, m] = (profile.reminder_time || DEFAULT_REMINDER_TIME).split(':').map(Number);
  const late = local.minutes - (h * 60 + m);
  return late >= 0 && late < CHECK_EVERY_MIN && profile.last_reminded_on !== local.date;
}

/** How far back the server looks at workouts (this week, plus the last workout of the program). */
export const HISTORY_DAYS = 60;

export interface ReminderMessage { title: string; body: string; url: string; kind: 'training_day' | 'no_workout'; lang: 'he' | 'en'; dir: 'rtl' | 'ltr' }

/**
 * What to send this user right now, or null. Called every CHECK_EVERY_MIN minutes by the server;
 * fires once, in the slot that contains the user's chosen time.
 */
export function decideReminder(
  profile: Profile & ReminderSettings, workouts: Workout[], programs: Program[], now: Date,
): ReminderMessage | null {
  if (!isDue(profile, now)) return null;
  const local = localNow(now, profile.reminder_tz || 'Asia/Jerusalem');
  if (workouts.some((w) => w.date === local.date)) return null; // already trained today

  // The server has no app language state: the profile says which language to write in.
  const en = (profile as { language?: string | null }).language === 'en';
  const lang = en ? 'en' as const : 'he' as const, dir = en ? 'ltr' as const : 'rtl' as const;
  const program = activeProgram(programs, workouts, profile);
  if (program && profile.remind_training_day !== false) {
    const plan = planToday(program, workouts, local.date);
    if (plan?.kind === 'train') {
      const day = program.days[plan.dayIndex];
      return {
        kind: 'training_day',
        title: en ? `💪 Workout today: ${CONTENT_EN[day.name] ?? day.name}` : `💪 היום יש לך אימון: ${day.name}`,
        body: en ? `${day.exercises.length} exercises are waiting for you. Tap to start.` : `${day.exercises.length} תרגילים מחכים לך. לחץ כדי להתחיל.`,
        lang, dir,
        url: `/#/workouts/new?program=${program.id}&day=${plan.dayIndex}`,
      };
    }
  }

  if (profile.remind_no_workout !== false && local.weekday >= NO_WORKOUT_FROM_WEEKDAY) {
    const start = weekStart(local.date);
    const end = addDays(start, 6);
    if (!workouts.some((w) => w.date >= start && w.date <= end)) {
      return {
        kind: 'no_workout',
        title: en ? "You haven't trained this week yet 🏃" : 'עוד לא התאמנת השבוע 🏃',
        body: en ? 'Even a short 20-minute workout beats nothing. Let’s go!' : 'גם אימון קצר של 20 דקות עדיף על כלום. בוא נתחיל!',
        lang, dir,
        url: '/#/',
      };
    }
  }
  return null;
}
