-- FitLogix schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Every table has the same shape (id, user_id, created_at + data columns),
-- and Row Level Security makes each user see only their own rows.

create table if not exists public.profiles (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  first_name text,
  last_name text,
  age int,
  birth_date date,
  height_cm int,
  experience text,
  fitness_goal text,
  training_days int,
  training_locations jsonb,
  equipment jsonb,
  onboarded_at timestamptz,
  calorie_goal int not null default 2200,
  protein_goal int not null default 140,
  carbs_goal int not null default 250,
  fat_goal int not null default 70,
  water_goal int not null default 8,
  weight_goal numeric
);

create table if not exists public.workouts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  name text not null,
  notes text,
  duration_min int,
  exercises jsonb not null default '[]'
);

create table if not exists public.programs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  days jsonb not null default '[]'
);

create table if not exists public.meals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  meal_type text not null default 'snack',
  name text not null,
  calories int not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0
);

create table if not exists public.body_weights (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  weight numeric not null
);

create table if not exists public.water_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  glasses int not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['profiles','workouts','programs','meals','body_weights','water_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
  end loop;
end $$;

-- Newer Supabase projects don't grant table access to signed-in users by default.
-- RLS above still limits every user to their own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.workouts, public.programs,
  public.meals, public.body_weights, public.water_logs
to authenticated;
