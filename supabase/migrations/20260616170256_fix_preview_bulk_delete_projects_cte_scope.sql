create or replace function public.preview_bulk_delete_projects(target_project_ids uuid[], acting_user_id uuid default auth.uid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  normalized_ids uuid[] := coalesce(target_project_ids, '{}'::uuid[]);
  eligible_ids uuid[];
  blocked jsonb;
  issues jsonb;
  active_publication_warnings jsonb;
  storage_targets jsonb;
  summary jsonb;
  preview_hash text;
begin
  normalized_ids := (select coalesce(array_agg(distinct id order by id), '{}'::uuid[]) from unnest(normalized_ids) as id);

  with requested as (
    select id from unnest(normalized_ids) as id
  ), project_rows as (
    select p.* from public.projects p join requested r on r.id = p.id
  ), active_publications as (
    select distinct pp.project_id
    from public.project_publications pp
    join requested r on r.id = pp.project_id
    where pp.status = 'published'
      and pp.revoked_at is null
      and (pp.expires_at is null or pp.expires_at > now())
  ), classified as (
    select
      r.id,
      p.name,
      case
        when p.id is null then 'not_found'
        when not public.can_manage_project_access(r.id) then 'forbidden'
        else 'eligible'
      end as state,
      case
        when p.id is null then 'Project was not found in this workspace.'
        when not public.can_manage_project_access(r.id) then 'Only project owners/admins can delete projects.'
        when ap.project_id is not null then 'Project has an active published shared link.'
        else 'Eligible for deletion.'
      end as message
    from requested r
    left join project_rows p on p.id = r.id
    left join active_publications ap on ap.project_id = r.id
  )
  select
    coalesce(array_agg(id order by id) filter (where state = 'eligible'), '{}'::uuid[]),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb)
  into eligible_ids, blocked
  from classified;

  -- Active published links are warnings, not blockers: deleting the project revokes
  -- them via ON DELETE CASCADE. Only warn for projects that are actually eligible.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'code', 'active_publication',
    'message', 'This project has an active published shared link that will be revoked upon deletion.'
  ) order by name), '[]'::jsonb)
  into active_publication_warnings
  from (
    select distinct p.id, p.name
    from public.projects p
    join public.project_publications pp on pp.project_id = p.id
    where p.id = any(eligible_ids)
      and pp.status = 'published'
      and pp.revoked_at is null
      and (pp.expires_at is null or pp.expires_at > now())
  ) active_publication_items;

  issues := blocked || active_publication_warnings;

  with project_image_rows as (
    select p.metadata from public.projects p where p.id = any(eligible_ids)
  ), paths as (
    select metadata->>'projectImagePath' as path from project_image_rows
    union all
    select metadata->>'projectImageThumbnailPath' as path from project_image_rows
  ), project_image_paths as (
    select distinct path
    from paths
    where path is not null
      and path = btrim(path)
      and path like '%/project-images/%'
      and right(path, 5) = '.webp'
      and left(path, 1) <> '/'
      and position('..' in path) = 0
      and position('//' in path) = 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('bucket', 'project-images', 'path', path) order by path), '[]'::jsonb)
  into storage_targets
  from project_image_paths;

  summary := jsonb_build_object(
    'requestedCount', cardinality(normalized_ids),
    'eligibleCount', cardinality(eligible_ids),
    'blockedCount', jsonb_array_length(blocked),
    'warningsCount', jsonb_array_length(active_publication_warnings),
    'estimateCount', (select count(*) from public.estimates where project_id = any(eligible_ids)),
    'storageTargetCount', jsonb_array_length(storage_targets)
  );
  preview_hash := public._mass_deletion_hash(jsonb_build_object('targetType', 'project', 'action', 'delete', 'ids', eligible_ids, 'blocked', blocked, 'summary', summary));

  return jsonb_build_object(
    'ok', cardinality(eligible_ids) > 0 and jsonb_array_length(blocked) = 0,
    'targetType', 'project',
    'ids', normalized_ids,
    'eligibleIds', eligible_ids,
    'previewHash', preview_hash,
    'summary', summary,
    'issues', issues,
    'blocked', blocked,
    'storageTargets', storage_targets
  );
end;
$$;

revoke execute on function public.preview_bulk_delete_projects(uuid[], uuid) from public, anon;
grant execute on function public.preview_bulk_delete_projects(uuid[], uuid) to authenticated;;
