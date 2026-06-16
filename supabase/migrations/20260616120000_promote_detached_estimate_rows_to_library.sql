begin;

create or replace function public.promote_estimate_row_to_library_component(
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
  is_express_row boolean := false;
  is_detached_project_row boolean := false;
  promotion_kind text;
  promotion_label text;
begin
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  if not public.is_workspace_editor(resolved_workspace_id) then
    raise exception 'Only workspace editors/admins can promote project components.';
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
     and coalesce(source_row.source_snapshot->>'sourceType', '') in (
       'promoted_express_component',
       'promoted_project_component',
       'promoted_project_specific_component'
     ) then
    return jsonb_build_object(
      'idempotent', true,
      'rowId', source_row.id,
      'itemId', source_row.source_library_item_id,
      'row', public.estimate_row_item_snapshot(source_row)
    );
  end if;

  is_express_row := coalesce(source_row.metadata->'expressComponent'->>'kind', '') = 'express';
  is_detached_project_row := source_row.source_library_item_id is null
    and (
      source_row.link_state = 'detached'
      or coalesce(source_row.metadata->'projectComponentProjection'->>'classification', '') = 'detached-library'
    );

  if not is_express_row and not is_detached_project_row then
    raise exception 'Only express or project-specific component rows can be promoted.';
  end if;

  if source_row.source_library_item_id is not null then
    return jsonb_build_object(
      'idempotent', true,
      'rowId', source_row.id,
      'itemId', source_row.source_library_item_id,
      'row', public.estimate_row_item_snapshot(source_row)
    );
  end if;

  if target_library_folder_id is not null and not exists (
    select 1
    from public.library_folders folder
    where folder.id = target_library_folder_id
      and folder.workspace_id = resolved_workspace_id
  ) then
    raise exception 'Library folder not found in the current workspace.';
  end if;

  promotion_kind := case
    when is_express_row then 'express-component-promotion'
    else 'project-specific-component-promotion'
  end;
  promotion_label := case
    when is_express_row then 'Express component promotion'
    else 'Project-specific component promotion'
  end;

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
      'changeReason', 'Promoted from estimate row',
      'metadata', (coalesce(source_row.metadata, '{}'::jsonb) - 'expressComponent' - 'projectComponentProjection') || jsonb_build_object(
        'source', 'library',
        'createdFrom', promotion_kind,
        'promotedFromEstimateRowId', source_row.id,
        'promotedFromEstimateId', target_estimate_id,
        'promotedFromProjectId', target_project_id,
        'promotedFromLinkState', source_row.link_state
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
      'pricingSource', promotion_label,
      'pricingDate', pricing_date,
      'sourceUrl', nullif(source_row.source_snapshot->>'sourceUrl', ''),
      'confidence', 'project-estimate',
      'isDefault', true,
      'variantMetadata', jsonb_build_object(
        'promotedFromEstimateRowId', source_row.id,
        'source', promotion_kind
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
        'sourceType', case
          when is_express_row then 'promoted_express_component'
          else 'promoted_project_specific_component'
        end,
        'sourceLibraryItemId', promoted_item_id,
        'priceOptionId', promoted_price_option_id,
        'pricingSource', promotion_label,
        'pricingDate', pricing_date,
        'unit', source_row.unit,
        'unit_cost', source_row.unit_cost,
        'misc_cost', source_row.misc_cost
      ),
      'metadata', (coalesce(source_row.metadata, '{}'::jsonb) - 'expressComponent' - 'projectComponentProjection') || jsonb_build_object(
        'promotedLibraryItemId', promoted_item_id,
        'promotedAt', now(),
        'promotedFrom', promotion_kind,
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
    'row', update_result->'row',
    'createResult', create_result,
    'updateResult', update_result
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
begin
  return public.promote_estimate_row_to_library_component(
    target_project_id,
    target_estimate_id,
    target_row_id,
    target_library_folder_id,
    acting_user_id,
    correlation_id
  );
end;
$$;

revoke execute on function public.promote_estimate_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.promote_estimate_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
revoke execute on function public.promote_express_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.promote_express_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;

commit;
