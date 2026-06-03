-- Private project image storage.
-- Project covers can contain client-identifying visual context, so they must not
-- live under the public/listable component image bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  false,
  12582912,
  array['image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "component images are publicly readable" on storage.objects;
create policy "component images are publicly readable" on storage.objects
  for select to public
  using (
    bucket_id = 'component-images'
    and coalesce((storage.foldername(name))[3], '') <> 'project-images'
  );

drop policy if exists "project images can be read by project members" on storage.objects;
drop policy if exists "project editors can upload own project images" on storage.objects;
drop policy if exists "project editors can update own project images" on storage.objects;
drop policy if exists "project editors can delete own project images" on storage.objects;

create policy "project images can be read by project members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[3] = 'project-images'
        and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.projects p
        where p.id = ((storage.foldername(name))[4])::uuid
          and p.workspace_id = ((storage.foldername(name))[1])::uuid
          and public.can_access_project(p.id)
      )
      else false
    end
  );

create policy "project editors can upload own project images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'project-images'
        and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(name))[4])::uuid)
      else false
    end
  );

create policy "project editors can update own project images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'project-images'
        and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(name))[4])::uuid)
      else false
    end
  )
  with check (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'project-images'
        and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(name))[4])::uuid)
      else false
    end
  );

create policy "project editors can delete own project images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(name))[2] = auth.uid()::text
        and (storage.foldername(name))[3] = 'project-images'
        and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(name))[4])::uuid)
      else false
    end
  );
