begin;

create or replace function public.delete_estimate_row_items_bulk_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_ids uuid[],
  expected_row_revisions jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  requested_count integer;
  missing_row_count integer;
  conflict_row record;
  deleted_row_count integer;
  old_snapshots jsonb;
  deleted_row_ids jsonb;
  deleted_total numeric;
  inserted_event_id uuid;
  first_row_id uuid;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  perform 1
  from public.estimates estimate
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if not found then
    raise exception 'Estimate not found in the current project.';
  end if;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  create temporary table if not exists estimate_sheet_bulk_requested_row_ids (
    id uuid primary key,
    expected_row_revision integer
  ) on commit drop;

  truncate table estimate_sheet_bulk_requested_row_ids;

  insert into estimate_sheet_bulk_requested_row_ids(id, expected_row_revision)
  select distinct
    row_id,
    nullif(expected_row_revisions->>(row_id::text), '')::integer
  from unnest(coalesce(target_row_ids, array[]::uuid[])) as requested(row_id)
  where row_id is not null;

  select count(*) into requested_count from estimate_sheet_bulk_requested_row_ids;

  if requested_count = 0 then
    raise exception 'At least one estimate row item is required for bulk delete.';
  end if;

  if requested_count > 100 then
    raise exception 'Selected row delete is limited to 100 rows at a time.';
  end if;

  select count(*) into missing_row_count
  from estimate_sheet_bulk_requested_row_ids requested
  where not exists (
    select 1
    from public.estimate_row_items row_item
    where row_item.id = requested.id
      and row_item.estimate_id = target_estimate_id
  );

  if missing_row_count > 0 then
    raise exception 'One or more estimate row items were not found in the current project.';
  end if;

  perform 1
  from public.estimate_row_items row_item
  join estimate_sheet_bulk_requested_row_ids requested on requested.id = row_item.id
  where row_item.estimate_id = target_estimate_id
  order by row_item.id
  for update;

  select row_item.id, requested.expected_row_revision, row_item.row_revision
    into conflict_row
  from public.estimate_row_items row_item
  join estimate_sheet_bulk_requested_row_ids requested on requested.id = row_item.id
  where row_item.estimate_id = target_estimate_id
    and (requested.expected_row_revision is null or row_item.row_revision <> requested.expected_row_revision)
  order by row_item.id
  limit 1;

  if conflict_row.id is not null then
    raise exception 'estimate_sheet_row_revision_conflict'
      using errcode = 'P0001',
            detail = jsonb_build_object(
              'rowId', conflict_row.id,
              'expectedRowRevision', conflict_row.expected_row_revision,
              'currentRowRevision', conflict_row.row_revision
            )::text;
  end if;

  select coalesce(jsonb_agg(public.estimate_row_item_snapshot(row_item) order by row_item.node_id, row_item.sort_order, row_item.id), '[]'::jsonb),
         coalesce(jsonb_agg(row_item.id order by row_item.node_id, row_item.sort_order, row_item.id), '[]'::jsonb),
         coalesce(sum(public.estimate_row_line_total(row_item)), 0),
         (array_agg(row_item.id order by row_item.node_id, row_item.sort_order, row_item.id))[1]
    into old_snapshots, deleted_row_ids, deleted_total, first_row_id
  from public.estimate_row_items row_item
  join estimate_sheet_bulk_requested_row_ids requested on requested.id = row_item.id
  where row_item.estimate_id = target_estimate_id;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    target_row_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    old_snapshot,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    first_row_id,
    'rows_bulk_deleted',
    'server_action',
    correlation_id,
    resolved_user_id,
    jsonb_build_object('deletedRows', old_snapshots),
    array['rows'],
    -deleted_total,
    jsonb_build_object(
      'deletedRowIds', deleted_row_ids,
      'deletedRowCount', requested_count,
      'deletedRows', old_snapshots
    )
  )
  returning id into inserted_event_id;

  delete from public.estimate_row_items row_item
  using estimate_sheet_bulk_requested_row_ids requested
  where row_item.id = requested.id
    and row_item.estimate_id = target_estimate_id;

  get diagnostics deleted_row_count = row_count;

  if deleted_row_count <> requested_count then
    raise exception 'Selected row delete did not remove every requested row.';
  end if;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'deletedRowIds', deleted_row_ids,
    'deletedRowCount', deleted_row_count
  );
end;
$$;

revoke all on function public.delete_estimate_row_items_bulk_with_history(uuid, uuid, uuid[], jsonb, uuid, uuid) from public, anon;
grant execute on function public.delete_estimate_row_items_bulk_with_history(uuid, uuid, uuid[], jsonb, uuid, uuid) to authenticated;

commit;
