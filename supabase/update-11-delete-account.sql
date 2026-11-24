-- FitLogix update 11: users can delete their own account (Settings -> delete account).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Deleting the auth user also deletes all their rows (every table references auth.users on delete cascade).

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- Admins are not removed this way, so the site never loses its admin by accident.
  if public.is_admin() then raise exception 'admins cannot delete themselves'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
