create or replace function public.create_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  parent_node_id uuid,
  node_kind public.estimate_node_kind,
  node_name text,
  initial_sort_order integer,
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
  inserted_node public.estimate_nodes;
  inserted_event_id uuid;
  reordered_count integer;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  if parent_node_id is not null and not exists (
    select 1
    from public.estimate_nodes parent_node
    where parent_node.id = parent_node_id
      and parent_node.estimate_id = target_estimate_id
  ) then
    raise exception 'Parent estimate node not found in the current project.';
  end if;

  insert into public.estimate_nodes (
    estimate_id,
    parent_id,
    kind,
    name,
    sort_order
  )
  values (
    target_estimate_id,
    parent_node_id,
    node_kind,
    nullif(trim(node_name), ''),
    coalesce(initial_sort_order, 0)
  )
  returning * into inserted_node;

  if inserted_node.name is null then
    raise exception 'Estimate tree node name is required.';
  end if;

  with sibling_order as (
    select
      node.id,
      row_number() over (
        order by
          case
            when node.kind in ('group', 'lot', 'general', 'structure', 'level', 'assembly') then 0
            when node.kind = 'area' then 1
            else 99
          end,
          node.sort_order,
          node.created_at,
          node.id
      ) * 10 as next_sort_order
    from public.estimate_nodes node
    where node.estimate_id = target_estimate_id
      and node.parent_id is not distinct from parent_node_id
  ),
  updated_siblings as (
    update public.estimate_nodes node
    set sort_order = sibling_order.next_sort_order
    from sibling_order
    where node.id = sibling_order.id
    returning node.id
  )
  select count(*) into reordered_count from updated_siblings;

  select *
    into inserted_node
  from public.estimate_nodes node
  where node.id = inserted_node.id;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    new_snapshot,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    inserted_node.id,
    'node_created',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['tree'],
    jsonb_build_object(
      'nodeId', inserted_node.id,
      'estimateId', inserted_node.estimate_id,
      'parentId', inserted_node.parent_id,
      'kind', inserted_node.kind,
      'name', inserted_node.name,
      'sortOrder', inserted_node.sort_order
    ),
    jsonb_build_object(
      'nodeId', inserted_node.id,
      'parentId', inserted_node.parent_id,
      'kind', inserted_node.kind,
      'name', inserted_node.name,
      'sortOrder', inserted_node.sort_order,
      'reorderedSiblingCount', reordered_count
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'nodeId', inserted_node.id,
    'name', inserted_node.name,
    'kind', inserted_node.kind,
    'parentId', inserted_node.parent_id,
    'sortOrder', inserted_node.sort_order
  );
end;
$$;

create or replace function public.rename_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
  next_name text,
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
  existing_node public.estimate_nodes;
  renamed_node public.estimate_nodes;
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select *
    into existing_node
  from public.estimate_nodes node
  where node.id = target_node_id
    and node.estimate_id = target_estimate_id
  for update;

  if existing_node.id is null then
    raise exception 'Estimate tree node not found in the current project.';
  end if;

  update public.estimate_nodes node
  set name = nullif(trim(next_name), '')
  where node.id = existing_node.id
    and node.estimate_id = target_estimate_id
  returning * into renamed_node;

  if renamed_node.name is null then
    raise exception 'Estimate tree node name is required.';
  end if;

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    old_snapshot,
    new_snapshot,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    renamed_node.id,
    'node_renamed',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['name'],
    jsonb_build_object(
      'nodeId', existing_node.id,
      'parentId', existing_node.parent_id,
      'kind', existing_node.kind,
      'name', existing_node.name,
      'sortOrder', existing_node.sort_order
    ),
    jsonb_build_object(
      'nodeId', renamed_node.id,
      'parentId', renamed_node.parent_id,
      'kind', renamed_node.kind,
      'name', renamed_node.name,
      'sortOrder', renamed_node.sort_order
    ),
    jsonb_build_object(
      'nodeId', renamed_node.id,
      'oldName', existing_node.name,
      'newName', renamed_node.name
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'nodeId', renamed_node.id,
    'name', renamed_node.name
  );
end;
$$;

revoke execute on function public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid) from public;
revoke execute on function public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid) from anon;
grant execute on function public.create_estimate_node_with_history(uuid, uuid, uuid, public.estimate_node_kind, text, integer, uuid, uuid) to authenticated;

revoke execute on function public.rename_estimate_node_with_history(uuid, uuid, uuid, text, uuid, uuid) from public;
revoke execute on function public.rename_estimate_node_with_history(uuid, uuid, uuid, text, uuid, uuid) from anon;
grant execute on function public.rename_estimate_node_with_history(uuid, uuid, uuid, text, uuid, uuid) to authenticated;
