export type TableName = 'profiles' | 'workouts' | 'programs' | 'meals' | 'body_weights' | 'water_logs';

export interface BaseRow {
  id: string;
  user_id?: string;
  created_at?: string;
}

export interface SetEntry { reps: number; weight: number; done: boolean }
export interface WorkoutExercise { name: string; sets: SetEntry[] }

export interface Workout extends BaseRow {
  date: string;
  name: string;
  notes?: string | null;
  duration_min?: number | null;
  exercises: WorkoutExercise[];
}

export interface ProgramExercise { name: string; sets: number; reps: number }
export interface ProgramDay { name: string; exercises: ProgramExercise[] }
export interface Program extends BaseRow { name: string; days: ProgramDay[] }

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
