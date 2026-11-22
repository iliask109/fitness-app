-- FitLogix admin area. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Then make yourself an admin with the line at the bottom of this file.

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
-- No policies on purpose: the table is only reachable through the functions below.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- Admins may read (not change) every user's data, to follow their progress.
do $$
declare t text;
begin
  foreach t in array array['profiles','workouts','programs','meals','body_weights','water_logs'] loop
    execute format('drop policy if exists "admins read all" on public.%I', t);
    execute format('create policy "admins read all" on public.%I for select using (public.is_admin())', t);
  end loop;
end $$;

-- All users with a short summary. Returns nothing for non-admins.
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

create or replace function public.admin_set_banned(target uuid, ban boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if target = auth.uid() then raise exception 'cannot block yourself'; end if;
  update auth.users
     set banned_until = case when ban then now() + interval '100 years' else null end
   where id = target;
end $$;

create or replace function public.admin_set_admin(target uuid, make boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if target = auth.uid() and not make then raise exception 'cannot remove yourself as admin'; end if;
  if make then
    insert into public.admins (user_id) values (target) on conflict do nothing;
  else
    delete from public.admins where user_id = target;
  end if;
end $$;

-- Deletes the account and, through "on delete cascade", all of its data.
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if target = auth.uid() then raise exception 'cannot delete yourself'; end if;
  delete from auth.users where id = target;
end $$;

revoke execute on function public.is_admin(), public.admin_list_users(),
  public.admin_set_banned(uuid, boolean), public.admin_set_admin(uuid, boolean),
  public.admin_delete_user(uuid) from public, anon;
grant execute on function public.is_admin(), public.admin_list_users(),
  public.admin_set_banned(uuid, boolean), public.admin_set_admin(uuid, boolean),
  public.admin_delete_user(uuid) to authenticated;

-- Make yourself the first admin (sign up in the app first, then put your email here):
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';
