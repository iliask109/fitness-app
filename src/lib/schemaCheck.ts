import { supabase } from './supabase';

/** Each SQL update and something it adds; if that is missing, the update was not run. */
const UPDATES: { file: string; table: string; columns?: string[] }[] = [
  { file: 'update-2-signup.sql', table: 'profiles', columns: ['first_name', 'last_name', 'age', 'birth_date'] },
  { file: 'update-3-onboarding.sql', table: 'profiles', columns: ['height_cm', 'experience', 'fitness_goal', 'training_days', 'training_locations', 'equipment', 'onboarded_at'] },
  { file: 'update-4-schedule.sql', table: 'profiles', columns: ['active_program_id'] },
  { file: 'update-4-schedule.sql', table: 'workouts', columns: ['program_id', 'program_day'] },
  { file: 'update-4-schedule.sql', table: 'programs', columns: ['schedule'] },
  { file: 'update-5-reminders.sql', table: 'profiles', columns: ['reminder_enabled', 'reminder_time', 'reminder_tz', 'remind_training_day', 'remind_no_workout', 'last_reminded_on'] },
  { file: 'update-5-reminders.sql', table: 'push_subscriptions' },
  { file: 'update-6-program-templates.sql', table: 'program_templates' },
  { file: 'update-7-gender.sql', table: 'profiles', columns: ['gender'] },
  { file: 'update-8-goal-period.sql', table: 'profiles', columns: ['goal_months', 'goal_start'] },
  { file: 'update-9-auto-nutrition.sql', table: 'profiles', columns: ['nutrition_updated_on', 'nutrition_weight'] },
  { file: 'update-12-language.sql', table: 'profiles', columns: ['language'] },
  { file: 'update-13-ai-coach.sql', table: 'ai_usage' },
];

export const SQL_FILE_URL = (file: string) => `https://github.com/iliask109/fitness-app/blob/main/supabase/${file}`;

/** SQL update files that have not been run on this database (empty in demo mode or when all is up to date). */
export async function missingUpdates(): Promise<string[]> {
  if (!supabase) return [];
  const missing = new Set<string>();
  await Promise.all(UPDATES.map(async (u) => {
    const { error } = await supabase!.from(u.table).select(u.columns?.join(',') ?? '*').limit(0);
    // 42703: column does not exist. 42P01 / PGRST205: table does not exist. Other errors (network) say nothing.
    if (error && (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message))) {
      missing.add(u.file);
    }
  }));
  return [...missing].sort();
}
