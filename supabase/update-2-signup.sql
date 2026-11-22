-- FitLogix update 2: sign-up details (first name, last name, age, birth date).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists age int,
  add column if not exists birth_date date;

-- Create the profile from the details entered at sign-up. This runs inside Supabase,
-- so it works even when "Confirm email" is on and the user has no session yet.
-- Any bad value is skipped: it never blocks a sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  begin
    insert into public.profiles (id, user_id, first_name, last_name, display_name, age, birth_date)
    values (
      new.id::text, new.id,
      nullif(trim(m->>'first_name'), ''),
      nullif(trim(m->>'last_name'), ''),
      nullif(trim(m->>'first_name'), ''),
      case when m->>'age' ~ '^\d{1,3}$' then (m->>'age')::int end,
      case when m->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin list now includes full name and age (return type changed, so drop first).
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, is_admin boolean, display_name text,
  first_name text, last_name text, age int, birth_date date,
  workouts bigint, last_workout date, last_weight numeric
)
language sql stable security definer set search_path = public
as $$
  select
    u.id, u.email::text, u.created_at, u.last_sign_in_at,
    coalesce(u.banned_until > now(), false),
    exists (select 1 from public.admins a where a.user_id = u.id),
    p.display_name, p.first_name, p.last_name, p.age, p.birth_date,
    (select count(*) from public.workouts w where w.user_id = u.id),
    (select max(w.date) from public.workouts w where w.user_id = u.id),
    (select b.weight from public.body_weights b where b.user_id = u.id order by b.date desc limit 1)
  from auth.users u
  left join lateral (
    select * from public.profiles pr where pr.user_id = u.id limit 1
  ) p on true
  where public.is_admin()
  order by u.created_at desc
$$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
