-- Express Components foundation: insert history classification and server-owned row ordering.
-- Scope: keep Express rows in public.estimate_row_items. No new table.

begin;

-- Project-source/template/tab copy paths must not preserve the same
-- row-lifetime express id. The copy RPCs already mark copied rows with
-- provenance keys; a DB-side trigger keeps the rekey invariant centralized and
-- covers both RPC and server-action copy surfaces.
create or replace function public.rekey_copied_express_component_row_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.metadata->'expressComponent'->>'kind', '') = 'express'
     and (
       coalesce(new.metadata, '{}'::jsonb) ? 'sourceRowId'
       or coalesce(new.metadata, '{}'::jsonb) ? 'sourceTemplateRowId'
       or coalesce(new.metadata, '{}'::jsonb) ? 'duplicatedFromRowId'
     ) then
    new.metadata := jsonb_set(
      coalesce(new.metadata, '{}'::jsonb),
      '{expressComponent,id}',
      to_jsonb(gen_random_uuid()::text),
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists rekey_copied_express_component_row_metadata on public.estimate_row_items;
create trigger rekey_copied_express_component_row_metadata
before insert on public.estimate_row_items
for each row
execute function public.rekey_copied_express_component_row_metadata();

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
  requested_sort_order integer;
  is_legacy_blank boolean;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);

  -- Serializes sibling row allocation and keeps same-estimate inserts from
  -- racing on the deferrable (node_id, sort_order) uniqueness constraint.
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

  if row_payload ? 'sortOrder' then
    requested_sort_order := coalesce(nullif(row_payload->>'sortOrder', '')::integer, 0);
  else
    select coalesce(max(row_item.sort_order) + 1, 0)
      into requested_sort_order
    from public.estimate_row_items row_item
    where row_item.estimate_id = target_estimate_id
      and row_item.node_id = target_node_id;
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
    requested_sort_order,
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

  is_legacy_blank :=
    inserted_row.material = 'Drag or add a component here'
    or coalesce(inserted_row.metadata->'tags', '[]'::jsonb) ? 'manual-row-placeholder';

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
    case when is_legacy_blank then 'row_blank_added' else 'row_added' end,
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

create or replace function public.promote_express_row_to_library_component(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  target_library_folder_id uuid default null,
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
  source_row public.estimate_row_items;
  create_result jsonb;
  update_result jsonb;
  promoted_item_id uuid;
  promoted_price_option_id uuid;
  pricing_date date := current_date;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  if not public.is_workspace_editor(resolved_workspace_id) then
    raise exception 'Only workspace editors/admins can promote express components.';
  end if;

  select row_item.*
    into source_row
  from public.estimate_row_items row_item
  join public.estimate_nodes node on node.id = row_item.node_id
  join public.estimates estimate on estimate.id = row_item.estimate_id
  where row_item.id = target_row_id
    and row_item.estimate_id = target_estimate_id
    and node.estimate_id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if source_row.id is null then
    raise exception 'Estimate row item not found in the current project.';
  end if;
  if source_row.source_library_item_id is not null
     and coalesce(source_row.source_snapshot->>'sourceType', '') = 'promoted_express_component' then
    return jsonb_build_object(
      'idempotent', true,
      'rowId', source_row.id,
      'itemId', source_row.source_library_item_id,
      'row', public.estimate_row_item_snapshot(source_row)
    );
  end if;
  if coalesce(source_row.metadata->'expressComponent'->>'kind', '') <> 'express' then
    raise exception 'Only express component rows can be promoted.';
  end if;

  if target_library_folder_id is not null and not exists (
    select 1
    from public.library_folders folder
    where folder.id = target_library_folder_id
      and folder.workspace_id = resolved_workspace_id
  ) then
    raise exception 'Library folder not found in the current workspace.';
  end if;

  if source_row.source_library_item_id is not null then
    return jsonb_build_object(
      'idempotent', true,
      'rowId', source_row.id,
      'itemId', source_row.source_library_item_id,
      'row', public.estimate_row_item_snapshot(source_row)
    );
  end if;

  create_result := public.create_cost_library_component(
    resolved_workspace_id,
    jsonb_build_object(
      'name', coalesce(nullif(source_row.material, ''), 'Untitled component'),
      'description', coalesce(source_row.description, ''),
      'category', coalesce(nullif(source_row.source_snapshot->>'category', ''), 'Project'),
      'thumbnailPath', nullif(source_row.source_snapshot->>'thumbnailPath', ''),
      'supplier', nullif(source_row.supplier, ''),
      'unit', coalesce(nullif(source_row.unit, ''), 'unit'),
      'libraryFolderId', target_library_folder_id,
      'lifecycleState', 'available',
      'effectiveAt', now(),
      'changeReason', 'Promoted from express estimate row',
      'metadata', (coalesce(source_row.metadata, '{}'::jsonb) - 'expressComponent') || jsonb_build_object(
        'source', 'library',
        'createdFrom', 'express-component-promotion',
        'promotedFromEstimateRowId', source_row.id,
        'promotedFromEstimateId', target_estimate_id,
        'promotedFromProjectId', target_project_id
      ),
      'createdBy', resolved_user_id
    ),
    jsonb_build_array(jsonb_build_object(
      'label', 'Default',
      'variantDescription', coalesce(source_row.description, ''),
      'unit', coalesce(nullif(source_row.unit, ''), 'unit'),
      'unitCost', coalesce(source_row.unit_cost, 0),
      'miscCost', coalesce(source_row.misc_cost, 0),
      'currency', 'PHP',
      'pricingSource', 'Express component promotion',
      'pricingDate', pricing_date,
      'sourceUrl', nullif(source_row.source_snapshot->>'sourceUrl', ''),
      'confidence', 'project-estimate',
      'isDefault', true,
      'variantMetadata', jsonb_build_object(
        'promotedFromEstimateRowId', source_row.id,
        'source', 'express-component-promotion'
      )
    ))
  );

  promoted_item_id := nullif(create_result->>'itemId', '')::uuid;
  promoted_price_option_id := nullif(create_result->>'activePriceOptionId', '')::uuid;

  update_result := public.update_estimate_row_item_with_history(
    target_project_id,
    target_estimate_id,
    target_row_id,
    source_row.row_revision,
    jsonb_build_object(
      'sourceLibraryItemId', promoted_item_id,
      'sourceSnapshot', coalesce(source_row.source_snapshot, '{}'::jsonb) || jsonb_build_object(
        'sourceType', 'promoted_express_component',
        'sourceLibraryItemId', promoted_item_id,
        'priceOptionId', promoted_price_option_id,
        'pricingSource', 'Express component promotion',
        'pricingDate', pricing_date,
        'unit', source_row.unit,
        'unit_cost', source_row.unit_cost,
        'misc_cost', source_row.misc_cost
      ),
      'metadata', (coalesce(source_row.metadata, '{}'::jsonb) - 'expressComponent') || jsonb_build_object(
        'promotedLibraryItemId', promoted_item_id,
        'promotedAt', now(),
        'linkStateBeforePromotion', source_row.link_state
      ),
      'linkState', 'linked-clean'
    ),
    resolved_user_id,
    correlation_id
  );

  return jsonb_build_object(
    'idempotent', false,
    'rowId', target_row_id,
    'itemId', promoted_item_id,
    'activePriceOptionId', promoted_price_option_id,
    'createResult', create_result,
    'updateResult', update_result
  );
end;
$$;

revoke execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated;
revoke execute on function public.rekey_copied_express_component_row_metadata() from public, anon;
revoke execute on function public.promote_express_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.promote_express_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;

commit;
