-- Require explicit estimate edit access before inserting row items through the
-- authenticated SECURITY DEFINER history RPC. P6 intentionally relaxed the
-- target-node kind guard so rows can attach to any estimate node; this keeps
-- that behavior while closing the membership-only viewer write bypass.

create or replace function public.insert_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
  row_payload jsonb,
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
  inserted_row public.estimate_row_items;
  inserted_event_id uuid;
  requested_row_id uuid := coalesce(nullif(row_payload->>'id', '')::uuid, gen_random_uuid());
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if target_node_id is null or not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_node_id
      and node.estimate_id = target_estimate_id
  ) then
    raise exception 'Target estimate node not found in the current estimate.';
  end if;

  insert into public.estimate_row_items (
    id,
    estimate_id,
    node_id,
    sort_order,
    source_library_item_id,
    source_snapshot,
    category_node_id,
    supplier_id,
    material,
    description,
    supplier,
    unit,
    quantity,
    unit_cost,
    contingency_percentage,
    misc_cost,
    discipline,
    designation,
    link_state,
    metadata,
    row_revision
  )
  values (
    requested_row_id,
    target_estimate_id,
    target_node_id,
    coalesce(nullif(row_payload->>'sortOrder', '')::integer, 0),
    nullif(row_payload->>'sourceLibraryItemId', '')::uuid,
    row_payload->'sourceSnapshot',
    nullif(row_payload->>'categoryNodeId', ''),
    nullif(row_payload->>'supplierId', '')::uuid,
    coalesce(row_payload->>'material', ''),
    coalesce(row_payload->>'description', ''),
    coalesce(row_payload->>'supplier', ''),
    coalesce(nullif(row_payload->>'unit', ''), 'unit'),
    coalesce(nullif(row_payload->>'quantity', '')::numeric, 0),
    coalesce(nullif(row_payload->>'unitCost', '')::numeric, 0),
    coalesce(nullif(row_payload->>'contingencyPercentage', '')::numeric, 0),
    coalesce(nullif(row_payload->>'miscCost', '')::numeric, 0),
    coalesce(row_payload->>'discipline', ''),
    coalesce(row_payload->>'designation', ''),
    coalesce(nullif(row_payload->>'linkState', '')::public.estimate_row_link_state, 'unlinked'),
    coalesce(row_payload->'metadata', '{}'::jsonb),
    1
  )
  returning * into inserted_row;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    target_row_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    row_context,
    new_snapshot,
    changed_fields,
    total_delta,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    target_node_id,
    inserted_row.id,
    case when inserted_row.source_library_item_id is null then 'row_blank_added' else 'row_added' end,
    'server_action',
    correlation_id,
    resolved_user_id,
    public.estimate_row_context(inserted_row),
    public.estimate_row_item_snapshot(inserted_row),
    array['row'],
    public.estimate_row_line_total(inserted_row),
    jsonb_build_object('rowId', inserted_row.id, 'nodeId', target_node_id)
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'rowId', inserted_row.id,
    'row', public.estimate_row_item_snapshot(inserted_row)
  );
end;
$$;


revoke execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated;
