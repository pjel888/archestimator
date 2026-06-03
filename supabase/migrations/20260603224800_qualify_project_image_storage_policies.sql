-- Qualify storage object path reads inside project-image policies.
-- The projects table also has a "name" column, so unqualified name references
-- inside EXISTS subqueries can bind to the inner projects row instead of the
-- outer storage.objects row.

begin;

drop policy if exists "project images can be read by project members" on storage.objects;
drop policy if exists "project editors can upload own project images" on storage.objects;
drop policy if exists "project editors can update own project images" on storage.objects;
drop policy if exists "project editors can delete own project images" on storage.objects;

create policy "project images can be read by project members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[3] = 'project-images'
        and (storage.foldername(storage.objects.name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1
        from public.projects p
        where p.id = ((storage.foldername(storage.objects.name))[4])::uuid
          and p.workspace_id = ((storage.foldername(storage.objects.name))[1])::uuid
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
      when (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
        and (storage.foldername(storage.objects.name))[3] = 'project-images'
        and (storage.foldername(storage.objects.name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(storage.objects.name))[4])::uuid)
      else false
    end
  );

create policy "project editors can update own project images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
        and (storage.foldername(storage.objects.name))[3] = 'project-images'
        and (storage.foldername(storage.objects.name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(storage.objects.name))[4])::uuid)
      else false
    end
  )
  with check (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
        and (storage.foldername(storage.objects.name))[3] = 'project-images'
        and (storage.foldername(storage.objects.name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(storage.objects.name))[4])::uuid)
      else false
    end
  );

create policy "project editors can delete own project images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-images'
    and case
      when (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (storage.foldername(storage.objects.name))[2] = auth.uid()::text
        and (storage.foldername(storage.objects.name))[3] = 'project-images'
        and (storage.foldername(storage.objects.name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_edit_project(((storage.foldername(storage.objects.name))[4])::uuid)
      else false
    end
  );

commit;
