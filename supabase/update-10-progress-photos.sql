-- FitLogix update 10: monthly progress photos, compared by Claude.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Photos are private: each user can only see their own (also not the admins).

create table if not exists public.progress_photos (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  date date not null,
  path text not null,             -- file in the private "progress-photos" storage bucket: <user id>/<photo id>.jpg
  weight numeric,                 -- body weight when the photo was taken
  analysis text,                  -- Claude's comparison with the previous photo
  compared_to text                -- id of the photo it was compared with
);
alter table public.progress_photos enable row level security;
drop policy if exists "own rows" on public.progress_photos;
create policy "own rows" on public.progress_photos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists progress_photos_user_idx on public.progress_photos (user_id);
grant select, insert, update, delete on public.progress_photos to authenticated;
grant select, insert, update, delete on public.progress_photos to service_role;

-- Private storage bucket (no public links), up to 5 MB per photo, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each user reads, uploads and deletes only files in their own folder.
drop policy if exists "progress photos: own folder" on storage.objects;
create policy "progress photos: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
