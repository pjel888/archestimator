-- Harden mass deletion audit attribution.
--
-- The first mass deletion RPCs accepted acting_user_id as an authenticated
-- client argument. That made audit rows caller-tamperable. Keep correlation_id
-- caller-supplied for idempotency/tracing, but derive every audit actor from
-- auth.uid() inside the SECURITY DEFINER function.

drop function if exists public.execute_bulk_delete_projects(uuid[], text, uuid, uuid);
drop function if exists public.execute_bulk_delete_projects(uuid[], text, uuid);
create function public.execute_bulk_delete_projects(target_project_ids uuid[], expected_preview_hash text, correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  preview jsonb;
  eligible uuid[];
  event_id uuid;
  workspace_id uuid;
begin
  if actor_id is null then
    raise exception 'Authenticated actor is required for mass deletion.' using errcode = '42501';
  end if;

  preview := public.preview_bulk_delete_projects(target_project_ids, actor_id);
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
  values (workspace_id, actor_id, 'project', 'delete', eligible, expected_preview_hash, correlation_id, 'storage_cleanup_pending', preview->'summary', preview->'blocked', preview->'storageTargets')
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

drop function if exists public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid, uuid);
drop function if exists public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid);
create function public.execute_bulk_delete_estimate_sheets(target_project_id uuid, target_estimate_ids uuid[], expected_preview_hash text, correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  preview jsonb;
  eligible uuid[];
  workspace_id uuid;
  event_id uuid;
begin
  if actor_id is null then
    raise exception 'Authenticated actor is required for mass deletion.' using errcode = '42501';
  end if;

  preview := public.preview_bulk_delete_estimate_sheets(target_project_id, target_estimate_ids, actor_id);
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
  values (workspace_id, actor_id, 'estimate_sheet', 'delete', eligible, expected_preview_hash, correlation_id, 'completed', preview->'summary', preview->'blocked', '[]'::jsonb)
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

drop function if exists public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid, uuid);
drop function if exists public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid);
create function public.execute_bulk_archive_library_components(target_workspace_id uuid, target_item_ids uuid[], expected_preview_hash text, correlation_id uuid default gen_random_uuid())
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  preview jsonb;
  eligible uuid[];
  event_id uuid;
begin
  if actor_id is null then
    raise exception 'Authenticated actor is required for mass deletion.' using errcode = '42501';
  end if;

  preview := public.preview_bulk_archive_library_components(target_workspace_id, target_item_ids, actor_id);
  if preview->>'previewHash' is distinct from expected_preview_hash then
    return preview || jsonb_build_object('ok', false, 'issues', (preview->'issues') || jsonb_build_array(jsonb_build_object('code', 'stale_preview', 'message', 'Preview changed; refresh the archive preview.')));
  end if;
  if coalesce(preview->>'ok', 'false') <> 'true' then
    return preview || jsonb_build_object('ok', false);
  end if;

  eligible := public._mass_deletion_uuid_array(preview->'eligibleIds');
  perform pg_advisory_xact_lock(hashtextextended('mass-archive-component:' || id::text, 0)) from unnest(eligible) as id;

  update public.cost_library_items
  set lifecycle_state = 'archived',
      lifecycle_state_changed_at = now(),
      lifecycle_state_changed_by = actor_id,
      updated_at = now()
  where workspace_id = target_workspace_id and id = any(eligible);

  insert into public.mass_deletion_events(workspace_id, actor_user_id, target_type, action, target_ids, preview_hash, correlation_id, status, summary, blocked, storage_targets)
  values (target_workspace_id, actor_id, 'library_component', 'archive', eligible, expected_preview_hash, correlation_id, 'completed', preview->'summary', preview->'blocked', '[]'::jsonb)
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

revoke execute on function public.execute_bulk_delete_projects(uuid[], text, uuid) from public, anon;
revoke execute on function public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid) from public, anon;
revoke execute on function public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid) from public, anon;

grant execute on function public.execute_bulk_delete_projects(uuid[], text, uuid) to authenticated;
grant execute on function public.execute_bulk_delete_estimate_sheets(uuid, uuid[], text, uuid) to authenticated;
grant execute on function public.execute_bulk_archive_library_components(uuid, uuid[], text, uuid) to authenticated;
