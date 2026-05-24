-- Component library image storage.
-- Public-read bucket for optimized WebP component thumbnails/full images.
-- Writes remain constrained to authenticated workspace members and user-owned path prefixes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'component-images',
  'component-images',
  true,
  12582912,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "component images are publicly readable" on storage.objects;
drop policy if exists "workspace members can upload own component images" on storage.objects;
drop policy if exists "workspace members can update own component images" on storage.objects;
drop policy if exists "workspace members can delete own component images" on storage.objects;

create policy "component images are publicly readable" on storage.objects
  for select to public
  using (bucket_id = 'component-images');

create policy "workspace members can upload own component images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'component-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "workspace members can update own component images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'component-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'component-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "workspace members can delete own component images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'component-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
