export type TableName = 'profiles' | 'workouts' | 'programs' | 'meals' | 'body_weights' | 'water_logs' | 'push_subscriptions';

export interface BaseRow {
  id: string;
  user_id?: string;
  created_at?: string;
}

export interface SetEntry { reps: number; weight: number; done: boolean }
export interface WorkoutExercise { name: string; sets: SetEntry[]; /** Free text for this exercise in this workout. */ notes?: string }

export interface Workout extends BaseRow {
  date: string;
  name: string;
  notes?: string | null;
  duration_min?: number | null;
  exercises: WorkoutExercise[];
  /** Set when the workout was started from a program day; drives "today's workout". */
  program_id?: string | null;
  program_day?: number | null;
}

export interface ProgramExercise { name: string; sets: number; reps: number }
export interface ProgramDay { name: string; exercises: ProgramExercise[] }
/** A day index into Program.days, or a rest day. */
export type ScheduleSlot = number | 'rest';
/** "cycle": repeat the pattern day after day. "weekly": train on fixed weekdays (0 = Sunday), cycling through the days. */
export type ProgramSchedule =
  | { kind: 'cycle'; pattern: ScheduleSlot[] }
  /** `required`: how many weekdays this program asks for (e.g. 4 for Push/Pull/Legs). */
  | { kind: 'weekly'; weekdays: number[]; required?: number };
export interface Program extends BaseRow { name: string; days: ProgramDay[]; schedule?: ProgramSchedule | null }

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface Meal extends BaseRow {
  date: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyWeight extends BaseRow { date: string; weight: number }
export interface WaterLog extends BaseRow { date: string; glasses: number }

export interface Profile extends BaseRow {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  age?: number | null;
  birth_date?: string | null;
  gender?: 'male' | 'female' | null;
  height_cm?: number | null;
  experience?: string | null;
  fitness_goal?: string | null;
  training_days?: number | null;
  training_locations?: string[] | null;
  equipment?: string[] | null;
  /** Set when the training profile was completed; until then the app shows the onboarding page. */
  onboarded_at?: string | null;
  /** The program "today's workout" follows. */
  active_program_id?: string | null;
  reminder_enabled?: boolean | null;
  reminder_time?: string | null;
  reminder_tz?: string | null;
  remind_training_day?: boolean | null;
  remind_no_workout?: boolean | null;
  last_reminded_on?: string | null;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  water_goal: number;
  weight_goal?: number | null;
}

export const DEFAULT_PROFILE: Omit<Profile, 'id'> = {
  calorie_goal: 2200, protein_goal: 140, carbs_goal: 250, fat_goal: 70, water_goal: 8, weight_goal: null,
};
