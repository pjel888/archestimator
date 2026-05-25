-- Add variant-level specification fields to the existing component price-option
-- rows. The current price-option table remains the persisted child layer for a
-- component so estimate insertion/versioning keeps its existing snapshot path.

alter table public.cost_library_item_price_options
  add column if not exists variant_description text not null default '',
  add column if not exists variant_sort_order integer not null default 0,
  add column if not exists package_quantity numeric,
  add column if not exists package_unit text,
  add column if not exists dimension_length numeric,
  add column if not exists dimension_width numeric,
  add column if not exists dimension_height numeric,
  add column if not exists dimension_unit text,
  add column if not exists mass numeric,
  add column if not exists mass_unit text,
  add column if not exists variant_metadata jsonb not null default '{}'::jsonb;

with ordered_options as (
  select
    option_row.id,
    row_number() over (
      partition by option_row.item_id
      order by option_row.is_default desc, option_row.created_at, option_row.id
    ) as next_sort_order
  from public.cost_library_item_price_options option_row
  where option_row.variant_sort_order = 0
)
update public.cost_library_item_price_options option_row
set variant_sort_order = ordered_options.next_sort_order
from ordered_options
where ordered_options.id = option_row.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cost_library_item_price_options_package_quantity_positive'
  ) then
    alter table public.cost_library_item_price_options
      add constraint cost_library_item_price_options_package_quantity_positive
      check (package_quantity is null or package_quantity > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cost_library_item_price_options_dimensions_positive'
  ) then
    alter table public.cost_library_item_price_options
      add constraint cost_library_item_price_options_dimensions_positive
      check (
        (dimension_length is null or dimension_length > 0)
        and (dimension_width is null or dimension_width > 0)
        and (dimension_height is null or dimension_height > 0)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cost_library_item_price_options_mass_positive'
  ) then
    alter table public.cost_library_item_price_options
      add constraint cost_library_item_price_options_mass_positive
      check (mass is null or mass > 0);
  end if;
end;
$$;

create index if not exists cost_library_item_price_options_variant_sort_idx
  on public.cost_library_item_price_options(item_id, variant_sort_order, created_at, id);

create or replace function public.cost_library_price_option_snapshot(price_option public.cost_library_item_price_options)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', price_option.id,
    'itemId', price_option.item_id,
    'label', price_option.label,
    'variantDescription', price_option.variant_description,
    'variantSortOrder', price_option.variant_sort_order,
    'unit', price_option.unit,
    'unitCost', price_option.unit_cost,
    'miscCost', price_option.misc_cost,
    'currency', price_option.currency,
    'pricingSource', price_option.pricing_source,
    'pricingDate', price_option.pricing_date,
    'confidence', price_option.confidence,
    'sourceUrl', price_option.source_url,
    'notes', price_option.notes,
    'supplierId', price_option.supplier_id,
    'packageQuantity', price_option.package_quantity,
    'packageUnit', price_option.package_unit,
    'dimensionLength', price_option.dimension_length,
    'dimensionWidth', price_option.dimension_width,
    'dimensionHeight', price_option.dimension_height,
    'dimensionUnit', price_option.dimension_unit,
    'mass', price_option.mass,
    'massUnit', price_option.mass_unit,
    'variantMetadata', price_option.variant_metadata,
    'isActive', price_option.is_active,
    'isDefault', price_option.is_default,
    'createdAt', price_option.created_at,
    'updatedAt', price_option.updated_at
  );
$$;

create or replace function public.cost_library_item_version_snapshot(target_item_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', item.id,
    'workspaceId', item.workspace_id,
    'kind', item.kind,
    'name', item.name,
    'description', item.description,
    'category', item.category,
    'categoryNodeId', item.category_node_id,
    'supplier', item.supplier,
    'supplierId', item.supplier_id,
    'brand', item.brand,
    'brandId', item.brand_id,
    'sku', item.sku,
    'unit', item.unit,
    'unitCost', item.unit_cost,
    'miscCost', item.misc_cost,
    'pricingSource', item.pricing_source,
    'pricingDate', item.pricing_date,
    'confidence', item.confidence,
    'thumbnailPath', item.thumbnail_path,
    'libraryFolderId', item.library_folder_id,
    'lifecycleState', item.lifecycle_state,
    'lifecycleStateChangedAt', item.lifecycle_state_changed_at,
    'activePriceOptionId', item.active_price_option_id,
    'currentVersionNumber', item.current_version_number,
    'metadata', item.metadata,
    'priceOptions', coalesce((
      select jsonb_agg(public.cost_library_price_option_snapshot(option_row) order by option_row.is_default desc, option_row.variant_sort_order, option_row.created_at, option_row.id)
      from public.cost_library_item_price_options option_row
      where option_row.item_id = item.id
        and option_row.is_active
    ), '[]'::jsonb)
  )
  from public.cost_library_items item
  where item.id = target_item_id;
$$;

create or replace function public.create_cost_library_component(
  target_workspace_id uuid,
  component jsonb,
  price_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_item_id uuid := coalesce(nullif(component->>'id', '')::uuid, gen_random_uuid());
  current_user_id uuid := coalesce(auth.uid(), nullif(component->>'createdBy', '')::uuid);
  component_kind public.cost_library_item_kind := coalesce(nullif(component->>'kind', '')::public.cost_library_item_kind, 'material');
  component_name text := trim(coalesce(component->>'name', ''));
  component_description text := coalesce(component->>'description', '');
  component_category text := coalesce(nullif(trim(component->>'category'), ''), 'General');
  component_supplier text := nullif(trim(component->>'supplier'), '');
  component_supplier_normalized text;
  component_brand text := nullif(trim(component->>'brand'), '');
  component_brand_id uuid := nullif(component->>'brandId', '')::uuid;
  component_sku text := nullif(trim(component->>'sku'), '');
  component_unit text := coalesce(nullif(trim(component->>'unit'), ''), 'unit');
  component_thumbnail_path text := nullif(trim(component->>'thumbnailPath'), '');
  component_category_node_id text := nullif(trim(component->>'categoryNodeId'), '');
  component_supplier_id uuid := nullif(component->>'supplierId', '')::uuid;
  component_library_folder_id uuid := nullif(component->>'libraryFolderId', '')::uuid;
  component_lifecycle_state public.component_lifecycle_state := coalesce(nullif(component->>'lifecycleState', '')::public.component_lifecycle_state, 'available');
  component_effective_at timestamptz := coalesce(nullif(component->>'effectiveAt', '')::timestamptz, now());
  component_change_reason text := coalesce(component->>'changeReason', '');
  component_metadata jsonb := coalesce(component->'metadata', '{}'::jsonb);
  option_count integer;
  default_count integer;
  default_price_option_id uuid;
  default_price_option public.cost_library_item_price_options;
begin
  if component_name = '' then
    raise exception 'Component name is required.';
  end if;

  if price_options is null or jsonb_typeof(price_options) <> 'array' then
    raise exception 'At least one variant is required.';
  end if;

  select count(*), count(*) filter (where coalesce((option_row.value->>'isDefault')::boolean, false))
    into option_count, default_count
  from jsonb_array_elements(price_options) option_row;

  if option_count = 0 then
    raise exception 'At least one variant is required.';
  end if;
  if default_count <> 1 then
    raise exception 'Exactly one default variant is required.';
  end if;

  perform public.validate_cost_library_component_refs(
    target_workspace_id,
    component_library_folder_id,
    component_category_node_id,
    component_supplier_id,
    current_user_id
  );

  if component_supplier_id is null and component_supplier is not null then
    component_supplier_normalized := lower(regexp_replace(component_supplier, '[^a-z0-9]+', ' ', 'g'));
    component_supplier_normalized := trim(regexp_replace(component_supplier_normalized, '\s+', ' ', 'g'));

    insert into public.component_suppliers (workspace_id, name, normalized_name, created_by)
    values (target_workspace_id, component_supplier, component_supplier_normalized, current_user_id)
    on conflict (workspace_id, normalized_name)
    do update set name = excluded.name
    returning id into component_supplier_id;
  end if;

  insert into public.cost_library_items (
    id,
    workspace_id,
    kind,
    name,
    description,
    category,
    supplier,
    brand,
    brand_id,
    sku,
    unit,
    unit_cost,
    misc_cost,
    pricing_source,
    pricing_date,
    confidence,
    thumbnail_path,
    metadata,
    created_by,
    category_node_id,
    supplier_id,
    library_folder_id,
    lifecycle_state,
    lifecycle_state_changed_at,
    lifecycle_state_changed_by,
    current_version_number
  )
  values (
    new_item_id,
    target_workspace_id,
    component_kind,
    component_name,
    component_description,
    component_category,
    component_supplier,
    component_brand,
    component_brand_id,
    component_sku,
    component_unit,
    0,
    0,
    null,
    null,
    null,
    component_thumbnail_path,
    component_metadata,
    current_user_id,
    component_category_node_id,
    component_supplier_id,
    component_library_folder_id,
    component_lifecycle_state,
    component_effective_at,
    current_user_id,
    1
  );

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
  select
    new_item_id,
    target_workspace_id,
    trim(coalesce(option_row.value->>'label', '')),
    coalesce(option_row.value->>'variantDescription', ''),
    coalesce(nullif(option_row.value->>'variantSortOrder', '')::integer, option_row.ordinality::integer),
    coalesce(nullif(trim(option_row.value->>'unit'), ''), component_unit),
    coalesce(nullif(option_row.value->>'unitCost', '')::numeric, 0),
    coalesce(nullif(option_row.value->>'miscCost', '')::numeric, 0),
    coalesce(nullif(trim(option_row.value->>'currency'), ''), 'PHP'),
    nullif(trim(option_row.value->>'pricingSource'), ''),
    nullif(option_row.value->>'pricingDate', '')::date,
    nullif(trim(option_row.value->>'confidence'), ''),
    nullif(trim(option_row.value->>'sourceUrl'), ''),
    coalesce(option_row.value->>'notes', ''),
    coalesce(nullif(option_row.value->>'supplierId', '')::uuid, component_supplier_id),
    nullif(option_row.value->>'packageQuantity', '')::numeric,
    nullif(trim(option_row.value->>'packageUnit'), ''),
    nullif(option_row.value->>'dimensionLength', '')::numeric,
    nullif(option_row.value->>'dimensionWidth', '')::numeric,
    nullif(option_row.value->>'dimensionHeight', '')::numeric,
    nullif(trim(option_row.value->>'dimensionUnit'), ''),
    nullif(option_row.value->>'mass', '')::numeric,
    nullif(trim(option_row.value->>'massUnit'), ''),
    coalesce(option_row.value->'variantMetadata', '{}'::jsonb),
    true,
    coalesce((option_row.value->>'isDefault')::boolean, false),
    current_user_id
  from jsonb_array_elements(price_options) with ordinality as option_row(value, ordinality);

  if exists (
    select 1 from public.cost_library_item_price_options option_row
    where option_row.item_id = new_item_id
      and char_length(trim(option_row.label)) = 0
  ) then
    raise exception 'Variant name is required.';
  end if;

  select option_row.id
    into default_price_option_id
  from public.cost_library_item_price_options option_row
  where option_row.item_id = new_item_id
    and option_row.is_default
    and option_row.is_active;

  select *
    into default_price_option
  from public.cost_library_item_price_options
  where id = default_price_option_id;

  update public.cost_library_items item
  set active_price_option_id = default_price_option.id,
      description = coalesce(nullif(default_price_option.variant_description, ''), item.description),
      unit = default_price_option.unit,
      unit_cost = default_price_option.unit_cost,
      misc_cost = default_price_option.misc_cost,
      pricing_source = default_price_option.pricing_source,
      pricing_date = default_price_option.pricing_date,
      confidence = default_price_option.confidence
  where item.id = new_item_id;

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
  select
    option_row.id,
    option_row.item_id,
    option_row.workspace_id,
    null,
    public.cost_library_price_option_snapshot(option_row),
    component_change_reason,
    component_effective_at,
    current_user_id
  from public.cost_library_item_price_options option_row
  where option_row.item_id = new_item_id;

  insert into public.cost_library_item_state_history (
    item_id,
    workspace_id,
    from_state,
    to_state,
    effective_at,
    change_reason,
    created_by
  )
  values (
    new_item_id,
    target_workspace_id,
    null,
    component_lifecycle_state,
    component_effective_at,
    component_change_reason,
    current_user_id
  );

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
    new_item_id,
    target_workspace_id,
    1,
    public.cost_library_item_version_snapshot(new_item_id),
    'Component created',
    component_change_reason,
    component_effective_at,
    current_user_id
  );

  return jsonb_build_object(
    'itemId', new_item_id,
    'versionNumber', 1,
    'activePriceOptionId', default_price_option_id,
    'priceOptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', option_row.id, 'label', option_row.label, 'isDefault', option_row.is_default) order by option_row.variant_sort_order, option_row.created_at, option_row.id)
      from public.cost_library_item_price_options option_row
      where option_row.item_id = new_item_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.update_cost_library_component(
  target_workspace_id uuid,
  target_item_id uuid,
  component jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.cost_library_items;
  current_user_id uuid := coalesce(auth.uid(), nullif(component->>'updatedBy', '')::uuid, nullif(component->>'createdBy', '')::uuid);
  new_category_node_id text := nullif(trim(component->>'categoryNodeId'), '');
  new_supplier_id uuid := nullif(component->>'supplierId', '')::uuid;
  new_brand_id uuid := nullif(component->>'brandId', '')::uuid;
  new_library_folder_id uuid := nullif(component->>'libraryFolderId', '')::uuid;
  change_reason text := coalesce(component->>'changeReason', '');
  effective_at timestamptz := coalesce(nullif(component->>'effectiveAt', '')::timestamptz, now());
  next_version integer;
begin
  perform public.validate_cost_library_component_refs(
    target_workspace_id,
    new_library_folder_id,
    new_category_node_id,
    new_supplier_id,
    current_user_id
  );

  select *
    into item_row
  from public.cost_library_items
  where id = target_item_id
    and workspace_id = target_workspace_id
  for update;

  if item_row.id is null then
    raise exception 'Component not found in the current workspace.';
  end if;

  next_version := item_row.current_version_number + 1;

  update public.cost_library_items
  set kind = coalesce(nullif(component->>'kind', '')::public.cost_library_item_kind, kind),
      name = coalesce(nullif(trim(component->>'name'), ''), name),
      description = coalesce(component->>'description', description),
      category = coalesce(nullif(trim(component->>'category'), ''), category),
      supplier = nullif(trim(coalesce(component->>'supplier', supplier)), ''),
      brand = nullif(trim(coalesce(component->>'brand', brand)), ''),
      brand_id = case when component ? 'brandId' then new_brand_id else brand_id end,
      sku = nullif(trim(coalesce(component->>'sku', sku)), ''),
      thumbnail_path = nullif(trim(coalesce(component->>'thumbnailPath', thumbnail_path)), ''),
      metadata = coalesce(component->'metadata', metadata),
      category_node_id = new_category_node_id,
      supplier_id = new_supplier_id,
      library_folder_id = new_library_folder_id,
      current_version_number = next_version
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
    'Component updated',
    change_reason,
    effective_at,
    current_user_id
  );

  return jsonb_build_object('itemId', target_item_id, 'versionNumber', next_version);
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
  if current_user_id is null or not exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = current_user_id
  ) then
    raise exception 'Workspace access denied.';
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

revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from public;
revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from anon, authenticated;
grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_cost_library_component(uuid, uuid, jsonb) to authenticated;
grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated;
