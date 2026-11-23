-- FitLogix update 4: today's planned workout.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.workouts
  add column if not exists program_id text,
  add column if not exists program_day int;

alter table public.programs
  add column if not exists schedule jsonb;

alter table public.profiles
  add column if not exists active_program_id text;
