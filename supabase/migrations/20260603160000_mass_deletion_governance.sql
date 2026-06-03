-- Mass deletion governance: preview/execute RPCs, immutable-ish audit records,
-- permission gates, active-publication blockers, and storage cleanup outbox metadata.

create table if not exists public.mass_deletion_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('project', 'estimate_sheet', 'library_component')),
  action text not null check (action in ('delete', 'archive', 'hard_delete')),
  target_ids uuid[] not null default '{}',
  preview_hash text not null,
  correlation_id uuid not null,
  status text not null default 'completed' check (status in ('completed', 'failed', 'storage_cleanup_pending', 'storage_cleanup_failed')),
  summary jsonb not null default '{}'::jsonb,
  blocked jsonb not null default '[]'::jsonb,
  storage_targets jsonb not null default '[]'::jsonb,
  storage_cleanup_result jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.mass_deletion_events enable row level security;

create index if not exists mass_deletion_events_workspace_created_idx on public.mass_deletion_events(workspace_id, created_at desc);
create index if not exists mass_deletion_events_actor_correlation_idx on public.mass_deletion_events(actor_user_id, correlation_id);
create index if not exists estimate_row_items_source_library_item_id_idx on public.estimate_row_items(source_library_item_id);
create index if not exists cost_library_item_variant_attachments_item_idx on public.cost_library_item_variant_attachments(item_id);

create policy "mass deletion workspace managers can read events"
  on public.mass_deletion_events
  for select
  using (
    workspace_id is not null
    and (public.is_workspace_admin(workspace_id) or public.is_workspace_editor(workspace_id) or public.is_platform_admin())
  );

drop function if exists public._mass_deletion_uuid_array(jsonb);
create function public._mass_deletion_uuid_array(value jsonb)
returns uuid[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(distinct raw_id::uuid order by raw_id::uuid), '{}'::uuid[])
  from jsonb_array_elements_text(coalesce(value, '[]'::jsonb)) as ids(raw_id)
  where raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

drop function if exists public._mass_deletion_hash(jsonb);
create function public._mass_deletion_hash(value jsonb)
returns text
language sql
stable
set search_path = public
as $$
  select md5(value::text);
$$;

-- Project deletion preview: only project access managers can execute; active publications block.
drop function if exists public.preview_bulk_delete_projects(uuid[], uuid);
create function public.preview_bulk_delete_projects(target_project_ids uuid[], acting_user_id uuid default auth.uid())
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
        when ap.project_id is not null then 'blocked'
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
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb)
  into eligible_ids, blocked, issues
  from classified;

  with project_rows as (
    select p.id, p.metadata from public.projects p where p.id = any(eligible_ids)
  ), paths as (
    select metadata->>'projectImagePath' as path from project_rows
    union all
    select metadata->>'projectImageThumbnailPath' as path from project_rows
  )
  select coalesce(jsonb_agg(distinct jsonb_build_object('bucket', 'component-images', 'path', path)), '[]'::jsonb)
  into storage_targets
  from paths
  where path is not null;

  summary := jsonb_build_object(
    'requestedCount', cardinality(normalized_ids),
    'eligibleCount', cardinality(eligible_ids),
    'blockedCount', jsonb_array_length(blocked),
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

drop function if exists public.execute_bulk_delete_projects(uuid[], text, uuid, uuid);
create function public.execute_bulk_delete_projects(target_project_ids uuid[], expected_preview_hash text, acting_user_id uuid default auth.uid(), correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  preview jsonb;
  eligible uuid[];
  event_id uuid;
  workspace_id uuid;
begin
  preview := public.preview_bulk_delete_projects(target_project_ids, acting_user_id);
  if preview->>'previewHash' is distinct from expected_preview_hash then
    return preview || jsonb_build_object('ok', false, 'issues', (preview->'issues') || jsonb_build_array(jsonb_build_object('code', 'stale_preview', 'message', 'Preview changed; refresh the deletion preview.')));
  end if;
  if coalesce(preview->>'ok', 'false') <> 'true' then
    return preview || jsonb_build_object('ok', false);
  end if;

  eligible := public._mass_deletion_uuid_array(preview->'eligibleIds');
  perform pg_advisory_xact_lock(hashtextextended('mass-delete-project:' || id::text, 0)) from unnest(eligible) as id;
  select p.workspace_id into workspace_id from public.projects p where p.id = any(eligible) limit 1;

  delete from public.projects where id = any(eligible);

  insert into public.mass_deletion_events(workspace_id, actor_user_id, target_type, action, target_ids, preview_hash, correlation_id, status, summary, blocked, storage_targets)
  values (workspace_id, acting_user_id, 'project', 'delete', eligible, expected_preview_hash, correlation_id, 'storage_cleanup_pending', preview->'summary', preview->'blocked', preview->'storageTargets')
  returning id into event_id;

  return jsonb_build_object(
    'ok', true,
    'targetType', 'project',
    'ids', target_project_ids,
    'deletedIds', eligible,
    'auditEventId', event_id,
    'previewHash', expected_preview_hash,
    'summary', preview->'summary',
    'issues', '[]'::jsonb,
    'blocked', '[]'::jsonb,
    'storageTargets', preview->'storageTargets'
  );
end;
$$;

-- Estimate-sheet deletion preview: active publications selecting the sheet block deletion.
drop function if exists public.preview_bulk_delete_estimate_sheets(uuid, uuid[], uuid);
create function public.preview_bulk_delete_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], acting_user_id uuid default auth.uid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  normalized_ids uuid[] := coalesce(target_estimate_ids, '{}'::uuid[]);
  eligible_ids uuid[];
  blocked jsonb;
  issues jsonb;
  summary jsonb;
  preview_hash text;
begin
  normalized_ids := (select coalesce(array_agg(distinct id order by id), '{}'::uuid[]) from unnest(normalized_ids) as id);

  with requested as (
    select id from unnest(normalized_ids) as id
  ), active_publications as (
    select distinct selected_id::uuid as estimate_id
    from public.project_publications pp,
      lateral unnest(pp.selected_estimate_ids) as selected_id
    where pp.project_id = target_project_id
      and pp.status = 'published'
      and pp.revoked_at is null
      and (pp.expires_at is null or pp.expires_at > now())
  ), classified as (
    select
      r.id,
      e.name,
      case
        when e.id is null then 'not_found'
        when not public.can_edit_estimate(e.id) then 'forbidden'
        when ap.estimate_id is not null then 'blocked'
        else 'eligible'
      end as state,
      case
        when e.id is null then 'Estimate sheet was not found in this project.'
        when not public.can_edit_estimate(e.id) then 'You do not have edit access to this estimate sheet.'
        when ap.estimate_id is not null then 'Estimate sheet is selected in an active published shared link.'
        else 'Eligible for deletion.'
      end as message
    from requested r
    left join public.estimates e on e.id = r.id and e.project_id = target_project_id
    left join active_publications ap on ap.estimate_id = r.id
  )
  select
    coalesce(array_agg(id order by id) filter (where state = 'eligible'), '{}'::uuid[]),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb)
  into eligible_ids, blocked, issues
  from classified;

  summary := jsonb_build_object(
    'requestedCount', cardinality(normalized_ids),
    'eligibleCount', cardinality(eligible_ids),
    'blockedCount', jsonb_array_length(blocked),
    'nodeCount', (select count(*) from public.estimate_nodes where estimate_id = any(eligible_ids)),
    'rowItemCount', (select count(*) from public.estimate_row_items where estimate_id = any(eligible_ids))
  );
  preview_hash := public._mass_deletion_hash(jsonb_build_object('targetType', 'estimate_sheet', 'action', 'delete', 'projectId', target_project_id, 'ids', eligible_ids, 'blocked', blocked, 'summary', summary));

  return jsonb_build_object(
    'ok', cardinality(eligible_ids) > 0 and jsonb_array_length(blocked) = 0,
    'targetType', 'estimate_sheet',
    'ids', normalized_ids,
    'eligibleIds', eligible_ids,
    'previewHash', preview_hash,
    'summary', summary,
    'issues', issues,
    'blocked', blocked,
    'storageTargets', '[]'::jsonb
  );
end;
$$;

drop function if exists public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid, uuid);
create function public.execute_bulk_delete_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], expected_preview_hash text, acting_user_id uuid default auth.uid(), correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  preview jsonb;
  eligible uuid[];
  workspace_id uuid;
  event_id uuid;
begin
  preview := public.preview_bulk_delete_estimate_sheets(target_project_id, target_estimate_ids, acting_user_id);
  if preview->>'previewHash' is distinct from expected_preview_hash then
    return preview || jsonb_build_object('ok', false, 'issues', (preview->'issues') || jsonb_build_array(jsonb_build_object('code', 'stale_preview', 'message', 'Preview changed; refresh the deletion preview.')));
  end if;
  if coalesce(preview->>'ok', 'false') <> 'true' then
    return preview || jsonb_build_object('ok', false);
  end if;

  eligible := public._mass_deletion_uuid_array(preview->'eligibleIds');
  perform pg_advisory_xact_lock(hashtextextended('mass-delete-estimate:' || id::text, 0)) from unnest(eligible) as id;
  select p.workspace_id into workspace_id from public.projects p where p.id = target_project_id;

  delete from public.estimates where project_id = target_project_id and id = any(eligible);

  insert into public.mass_deletion_events(workspace_id, actor_user_id, target_type, action, target_ids, preview_hash, correlation_id, status, summary, blocked, storage_targets)
  values (workspace_id, acting_user_id, 'estimate_sheet', 'delete', eligible, expected_preview_hash, correlation_id, 'completed', preview->'summary', preview->'blocked', '[]'::jsonb)
  returning id into event_id;

  return jsonb_build_object(
    'ok', true,
    'targetType', 'estimate_sheet',
    'ids', target_estimate_ids,
    'deletedIds', eligible,
    'auditEventId', event_id,
    'previewHash', expected_preview_hash,
    'summary', preview->'summary',
    'issues', '[]'::jsonb,
    'blocked', '[]'::jsonb,
    'storageTargets', '[]'::jsonb
  );
end;
$$;

-- Component library archive preview/execute. Hard delete remains intentionally absent from first-release UI.
drop function if exists public.preview_bulk_archive_library_components(uuid, uuid[], uuid);
create function public.preview_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[], acting_user_id uuid default auth.uid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  normalized_ids uuid[] := coalesce(target_item_ids, '{}'::uuid[]);
  eligible_ids uuid[];
  blocked jsonb;
  issues jsonb;
  summary jsonb;
  preview_hash text;
begin
  normalized_ids := (select coalesce(array_agg(distinct id order by id), '{}'::uuid[]) from unnest(normalized_ids) as id);

  with requested as (
    select id from unnest(normalized_ids) as id
  ), classified as (
    select
      r.id,
      i.name,
      case
        when i.id is null then 'not_found'
        when not public.is_workspace_editor(target_workspace_id) then 'forbidden'
        when i.lifecycle_state = 'archived' then 'blocked'
        else 'eligible'
      end as state,
      case
        when i.id is null then 'Component was not found in this workspace.'
        when not public.is_workspace_editor(target_workspace_id) then 'Only workspace editors/admins can archive components.'
        when i.lifecycle_state = 'archived' then 'Component is already archived.'
        else 'Eligible for archive.'
      end as message
    from requested r
    left join public.cost_library_items i on i.id = r.id and i.workspace_id = target_workspace_id
  )
  select
    coalesce(array_agg(id order by id) filter (where state = 'eligible'), '{}'::uuid[]),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', state, 'message', message) order by id) filter (where state <> 'eligible'), '[]'::jsonb)
  into eligible_ids, blocked, issues
  from classified;

  summary := jsonb_build_object(
    'requestedCount', cardinality(normalized_ids),
    'eligibleCount', cardinality(eligible_ids),
    'blockedCount', jsonb_array_length(blocked),
    'referencedRowItemCount', (select count(*) from public.estimate_row_items where source_library_item_id = any(eligible_ids))
  );
  preview_hash := public._mass_deletion_hash(jsonb_build_object('targetType', 'library_component', 'action', 'archive', 'workspaceId', target_workspace_id, 'ids', eligible_ids, 'blocked', blocked, 'summary', summary));

  return jsonb_build_object(
    'ok', cardinality(eligible_ids) > 0 and jsonb_array_length(blocked) = 0,
    'targetType', 'library_component',
    'ids', normalized_ids,
    'eligibleIds', eligible_ids,
    'previewHash', preview_hash,
    'summary', summary,
    'issues', issues,
    'blocked', blocked,
    'storageTargets', '[]'::jsonb
  );
end;
$$;

drop function if exists public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid, uuid);
create function public.execute_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[], expected_preview_hash text, acting_user_id uuid default auth.uid(), correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  preview jsonb;
  eligible uuid[];
  event_id uuid;
begin
  preview := public.preview_bulk_archive_library_components(target_workspace_id, target_item_ids, acting_user_id);
  if preview->>'previewHash' is distinct from expected_preview_hash then
    return preview || jsonb_build_object('ok', false, 'issues', (preview->'issues') || jsonb_build_array(jsonb_build_object('code', 'stale_preview', 'message', 'Preview changed; refresh the archive preview.')));
  end if;
  if coalesce(preview->>'ok', 'false') <> 'true' then
    return preview || jsonb_build_object('ok', false);
  end if;

  eligible := public._mass_deletion_uuid_array(preview->'eligibleIds');
  perform pg_advisory_xact_lock(hashtextextended('mass-archive-component:' || id::text, 0)) from unnest(eligible) as id;

  update public.cost_library_items
  set lifecycle_state = 'archived', lifecycle_state_changed_at = now(), lifecycle_state_changed_by = acting_user_id, updated_at = now()
  where workspace_id = target_workspace_id and id = any(eligible);

  insert into public.mass_deletion_events(workspace_id, actor_user_id, target_type, action, target_ids, preview_hash, correlation_id, status, summary, blocked, storage_targets)
  values (target_workspace_id, acting_user_id, 'library_component', 'archive', eligible, expected_preview_hash, correlation_id, 'completed', preview->'summary', preview->'blocked', '[]'::jsonb)
  returning id into event_id;

  return jsonb_build_object(
    'ok', true,
    'targetType', 'library_component',
    'ids', target_item_ids,
    'archivedIds', eligible,
    'auditEventId', event_id,
    'previewHash', expected_preview_hash,
    'summary', preview->'summary',
    'issues', '[]'::jsonb,
    'blocked', '[]'::jsonb,
    'storageTargets', '[]'::jsonb
  );
end;
$$;

drop function if exists public.record_mass_deletion_storage_cleanup_result(uuid, jsonb);
create function public.record_mass_deletion_storage_cleanup_result(target_event_id uuid, cleanup_result jsonb)
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  updated_status text := 'completed';
  updated_row public.mass_deletion_events;
begin
  if jsonb_array_length(coalesce(cleanup_result->'failed', '[]'::jsonb)) > 0 then
    updated_status := 'storage_cleanup_failed';
  end if;

  update public.mass_deletion_events
  set storage_cleanup_result = coalesce(cleanup_result, '{}'::jsonb),
      status = updated_status
  where id = target_event_id
  returning * into updated_row;

  return to_jsonb(updated_row);
end;
$$;

revoke execute on function public.preview_bulk_delete_projects(uuid[], uuid) from public, anon;
revoke execute on function public.execute_bulk_delete_projects(uuid[], text, uuid, uuid) from public, anon;
revoke execute on function public.preview_bulk_delete_estimate_sheets(uuid, uuid[], uuid) from public, anon;
revoke execute on function public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid, uuid) from public, anon;
revoke execute on function public.preview_bulk_archive_library_components(uuid, uuid[], uuid) from public, anon;
revoke execute on function public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid, uuid) from public, anon;
revoke execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) from public, anon;

grant execute on function public.preview_bulk_delete_projects(uuid[], uuid) to authenticated;
grant execute on function public.execute_bulk_delete_projects(uuid[], text, uuid, uuid) to authenticated;
grant execute on function public.preview_bulk_delete_estimate_sheets(uuid, uuid[], uuid) to authenticated;
grant execute on function public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid, uuid) to authenticated;
grant execute on function public.preview_bulk_archive_library_components(uuid, uuid[], uuid) to authenticated;
grant execute on function public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid, uuid) to authenticated;
grant execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) to authenticated;
