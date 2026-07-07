-- Harden component-library mutation RPCs so authenticated workspace viewers cannot
-- create, update, or mutate component pricing through SECURITY DEFINER functions.
-- The app-layer server actions also gate these writes with is_workspace_editor;
-- this migration makes the database boundary enforce the same role model for
-- direct RPC calls.

create or replace function public.validate_cost_library_component_refs(
  target_workspace_id uuid,
  target_library_folder_id uuid,
  target_category_node_id text,
  target_supplier_id uuid,
  acting_user_id uuid default null
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
begin
  if target_workspace_id is null then
    raise exception 'Workspace id is required.';
  end if;

  if resolved_user_id is null or public.is_workspace_editor(target_workspace_id) is not true then
    raise exception 'Workspace editor access required.';
  end if;

  if target_library_folder_id is not null and not exists (
    select 1 from public.library_folders folder
    where folder.id = target_library_folder_id
      and folder.workspace_id = target_workspace_id
  ) then
    raise exception 'Library folder not found in the current workspace.';
  end if;

  if target_category_node_id is not null and not exists (
    select 1 from public.component_category_nodes category
    where category.id = target_category_node_id
  ) then
    raise exception 'Component category not found.';
  end if;

  if target_supplier_id is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = target_supplier_id
      and supplier.workspace_id = target_workspace_id
  ) then
    raise exception 'Component supplier not found in the current workspace.';
  end if;
end;
$$;

create or replace function public.upsert_cost_library_component_price_option(
  target_workspace_id uuid,
  target_item_id uuid,
  price_option jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.cost_library_items;
  option_id uuid := nullif(price_option->>'id', '')::uuid;
  current_user_id uuid := coalesce(auth.uid(), nullif(price_option->>'updatedBy', '')::uuid, nullif(price_option->>'createdBy', '')::uuid);
  old_snapshot jsonb := null;
  new_snapshot jsonb;
  saved_option public.cost_library_item_price_options;
  make_default boolean := coalesce((price_option->>'isDefault')::boolean, false);
  change_reason text := coalesce(price_option->>'changeReason', '');
  effective_at timestamptz := coalesce(nullif(price_option->>'effectiveAt', '')::timestamptz, now());
  next_version integer;
begin
  if current_user_id is null or public.is_workspace_editor(target_workspace_id) is not true then
    raise exception 'Workspace editor access required.';
  end if;

  select *
    into item_row
  from public.cost_library_items
  where id = target_item_id
    and workspace_id = target_workspace_id
  for update;

  if item_row.id is null then
    raise exception 'Component not found in the current workspace.';
  end if;

  if nullif(price_option->>'supplierId', '')::uuid is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = nullif(price_option->>'supplierId', '')::uuid
      and supplier.workspace_id = target_workspace_id
  ) then
    raise exception 'Variant supplier not found in the current workspace.';
  end if;

  if option_id is not null then
    select public.cost_library_price_option_snapshot(existing_option)
      into old_snapshot
    from public.cost_library_item_price_options existing_option
    where existing_option.id = option_id
      and existing_option.item_id = target_item_id
      and existing_option.workspace_id = target_workspace_id
    for update;

    if old_snapshot is null then
      raise exception 'Variant not found in the current component.';
    end if;

    if make_default then
      update public.cost_library_item_price_options
      set is_default = false
      where item_id = target_item_id
        and id <> option_id
        and is_default;
    end if;

    update public.cost_library_item_price_options
    set label = coalesce(nullif(trim(price_option->>'label'), ''), label),
        variant_description = coalesce(price_option->>'variantDescription', variant_description),
        variant_sort_order = coalesce(nullif(price_option->>'variantSortOrder', '')::integer, variant_sort_order),
        unit = coalesce(nullif(trim(price_option->>'unit'), ''), unit),
        unit_cost = coalesce(nullif(price_option->>'unitCost', '')::numeric, unit_cost),
        misc_cost = coalesce(nullif(price_option->>'miscCost', '')::numeric, misc_cost),
        currency = coalesce(nullif(trim(price_option->>'currency'), ''), currency),
        pricing_source = nullif(trim(coalesce(price_option->>'pricingSource', pricing_source)), ''),
        pricing_date = coalesce(nullif(price_option->>'pricingDate', '')::date, pricing_date),
        confidence = nullif(trim(coalesce(price_option->>'confidence', confidence)), ''),
        source_url = nullif(trim(coalesce(price_option->>'sourceUrl', source_url)), ''),
        notes = coalesce(price_option->>'notes', notes),
        supplier_id = coalesce(nullif(price_option->>'supplierId', '')::uuid, supplier_id),
        package_quantity = coalesce(nullif(price_option->>'packageQuantity', '')::numeric, package_quantity),
        package_unit = nullif(trim(coalesce(price_option->>'packageUnit', package_unit)), ''),
        dimension_length = coalesce(nullif(price_option->>'dimensionLength', '')::numeric, dimension_length),
        dimension_width = coalesce(nullif(price_option->>'dimensionWidth', '')::numeric, dimension_width),
        dimension_height = coalesce(nullif(price_option->>'dimensionHeight', '')::numeric, dimension_height),
        dimension_unit = nullif(trim(coalesce(price_option->>'dimensionUnit', dimension_unit)), ''),
        mass = coalesce(nullif(price_option->>'mass', '')::numeric, mass),
        mass_unit = nullif(trim(coalesce(price_option->>'massUnit', mass_unit)), ''),
        variant_metadata = coalesce(price_option->'variantMetadata', variant_metadata),
        is_active = coalesce((price_option->>'isActive')::boolean, is_active),
        is_default = make_default
    where id = option_id
    returning * into saved_option;
  else
    insert into public.cost_library_item_price_options (
      item_id,
      workspace_id,
      label,
      variant_description,
      variant_sort_order,
      unit,
      unit_cost,
      misc_cost,
      currency,
      pricing_source,
      pricing_date,
      confidence,
      source_url,
      notes,
      supplier_id,
      package_quantity,
      package_unit,
      dimension_length,
      dimension_width,
      dimension_height,
      dimension_unit,
      mass,
      mass_unit,
      variant_metadata,
      is_active,
      is_default,
      created_by
    )
    values (
      target_item_id,
      target_workspace_id,
      trim(coalesce(price_option->>'label', '')),
      coalesce(price_option->>'variantDescription', ''),
      coalesce(nullif(price_option->>'variantSortOrder', '')::integer, 0),
      coalesce(nullif(trim(price_option->>'unit'), ''), item_row.unit),
      coalesce(nullif(price_option->>'unitCost', '')::numeric, 0),
      coalesce(nullif(price_option->>'miscCost', '')::numeric, 0),
      coalesce(nullif(trim(price_option->>'currency'), ''), 'PHP'),
      nullif(trim(price_option->>'pricingSource'), ''),
      nullif(price_option->>'pricingDate', '')::date,
      nullif(trim(price_option->>'confidence'), ''),
      nullif(trim(price_option->>'sourceUrl'), ''),
      coalesce(price_option->>'notes', ''),
      coalesce(nullif(price_option->>'supplierId', '')::uuid, item_row.supplier_id),
      nullif(price_option->>'packageQuantity', '')::numeric,
      nullif(trim(price_option->>'packageUnit'), ''),
      nullif(price_option->>'dimensionLength', '')::numeric,
      nullif(price_option->>'dimensionWidth', '')::numeric,
      nullif(price_option->>'dimensionHeight', '')::numeric,
      nullif(trim(price_option->>'dimensionUnit'), ''),
      nullif(price_option->>'mass', '')::numeric,
      nullif(trim(price_option->>'massUnit'), ''),
      coalesce(price_option->'variantMetadata', '{}'::jsonb),
      coalesce((price_option->>'isActive')::boolean, true),
      false,
      current_user_id
    )
    returning * into saved_option;

    if make_default then
      update public.cost_library_item_price_options
      set is_default = false
      where item_id = target_item_id
        and id <> saved_option.id
        and is_default;

      update public.cost_library_item_price_options
      set is_default = true
      where id = saved_option.id
      returning * into saved_option;
    end if;
  end if;

  if char_length(trim(saved_option.label)) = 0 then
    raise exception 'Variant name is required.';
  end if;

  if make_default and saved_option.is_active then
    update public.cost_library_items
    set active_price_option_id = saved_option.id,
        description = coalesce(nullif(saved_option.variant_description, ''), description),
        unit = saved_option.unit,
        unit_cost = saved_option.unit_cost,
        misc_cost = saved_option.misc_cost,
        pricing_source = saved_option.pricing_source,
        pricing_date = saved_option.pricing_date,
        confidence = saved_option.confidence
    where id = target_item_id
      and workspace_id = target_workspace_id;
  end if;

  select *
    into saved_option
  from public.cost_library_item_price_options
  where id = saved_option.id;

  new_snapshot := public.cost_library_price_option_snapshot(saved_option);

  insert into public.cost_library_item_price_history (
    price_option_id,
    item_id,
    workspace_id,
    old_snapshot,
    new_snapshot,
    change_reason,
    effective_at,
    created_by
  )
  values (
    saved_option.id,
    target_item_id,
    target_workspace_id,
    old_snapshot,
    new_snapshot,
    change_reason,
    effective_at,
    current_user_id
  );

  next_version := item_row.current_version_number + 1;
  update public.cost_library_items
  set current_version_number = next_version
  where id = target_item_id
    and workspace_id = target_workspace_id;

  insert into public.cost_library_item_versions (
    item_id,
    workspace_id,
    version_number,
    snapshot,
    change_summary,
    change_reason,
    effective_at,
    created_by
  )
  values (
    target_item_id,
    target_workspace_id,
    next_version,
    public.cost_library_item_version_snapshot(target_item_id),
    'Variant changed',
    change_reason,
    effective_at,
    current_user_id
  );

  return jsonb_build_object(
    'itemId', target_item_id,
    'priceOptionId', saved_option.id,
    'versionNumber', next_version
  );
end;
$$;

