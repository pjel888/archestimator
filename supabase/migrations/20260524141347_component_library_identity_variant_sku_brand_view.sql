alter table public.cost_library_item_price_options
  add column if not exists sku text;

update public.cost_library_item_price_options option_row
set sku = nullif(trim(item.sku), '')
from public.cost_library_items item
where option_row.item_id = item.id
  and option_row.is_default
  and option_row.sku is null
  and nullif(trim(item.sku), '') is not null;

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
    'sku', price_option.sku,
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
    'imageBucket', price_option.image_bucket,
    'imagePath', price_option.image_path,
    'thumbnailPath', price_option.thumbnail_path,
    'imageMetadata', price_option.image_metadata,
    'activeCostEntryId', price_option.active_cost_entry_id,
    'costEntries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entry.id,
        'unitCost', entry.unit_cost,
        'miscCost', entry.misc_cost,
        'currency', entry.currency,
        'pricingSource', entry.pricing_source,
        'pricingDate', entry.pricing_date,
        'confidence', entry.confidence,
        'sourceUrl', entry.source_url,
        'notes', entry.notes,
        'isCurrent', entry.is_current,
        'createdAt', entry.created_at,
        'updatedAt', entry.updated_at
      ) order by entry.is_current desc, entry.pricing_date desc, entry.created_at desc, entry.id)
      from public.cost_library_item_variant_cost_entries entry
      where entry.price_option_id = price_option.id
        and entry.deleted_at is null
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', attachment.id,
        'bucket', attachment.storage_bucket,
        'path', attachment.storage_path,
        'fileName', attachment.file_name,
        'contentType', attachment.content_type,
        'sizeBytes', attachment.size_bytes,
        'kind', attachment.attachment_kind,
        'metadata', attachment.metadata,
        'createdAt', attachment.created_at
      ) order by attachment.created_at desc, attachment.id)
      from public.cost_library_item_variant_attachments attachment
      where attachment.price_option_id = price_option.id
    ), '[]'::jsonb),
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
    'name', item.name,
    'description', item.description,
    'category', item.category,
    'categoryNodeId', item.category_node_id,
    'supplier', item.supplier,
    'supplierId', item.supplier_id,
    'brand', item.brand,
    'brandId', item.brand_id,
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
      select jsonb_agg(public.cost_library_price_option_snapshot(option_record) order by option_record.is_default desc, option_record.created_at, option_record.id)
      from public.cost_library_item_price_options option_record
      where option_record.item_id = item.id
        and option_record.is_active
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
  component_name text := trim(coalesce(component->>'name', ''));
  component_description text := coalesce(component->>'description', '');
  component_category text := coalesce(nullif(trim(component->>'category'), ''), 'General');
  component_supplier text := nullif(trim(component->>'supplier'), '');
  component_supplier_normalized text;
  component_brand text := nullif(trim(component->>'brand'), '');
  component_brand_id uuid := nullif(component->>'brandId', '')::uuid;
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
    name,
    description,
    category,
    supplier,
    brand,
    brand_id,
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
    component_name,
    component_description,
    component_category,
    component_supplier,
    component_brand,
    component_brand_id,
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
    sku,
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
    image_bucket,
    image_path,
    thumbnail_path,
    image_metadata,
    variant_metadata,
    is_active,
    is_default,
    created_by
  )
  select
    new_item_id,
    target_workspace_id,
    trim(coalesce(option_row.value->>'label', '')),
    nullif(trim(option_row.value->>'sku'), ''),
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
    nullif(trim(coalesce(option_row.value->>'imageBucket', option_row.value->>'bucket')), ''),
    nullif(trim(option_row.value->>'imagePath'), ''),
    nullif(trim(option_row.value->>'thumbnailPath'), ''),
    coalesce(option_row.value->'imageMetadata', '{}'::jsonb),
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

  with option_sources as (
    select
      option_row.value,
      option_row.ordinality,
      coalesce(nullif(option_row.value->>'variantSortOrder', '')::integer, option_row.ordinality::integer) as variant_sort_order
    from jsonb_array_elements(price_options) with ordinality as option_row(value, ordinality)
  ),
  saved_options as (
    select
      option_row.id,
      option_row.item_id,
      option_row.workspace_id,
      option_source.value as option_json,
      option_source.ordinality
    from public.cost_library_item_price_options option_row
    join option_sources option_source
      on option_source.variant_sort_order = option_row.variant_sort_order
    where option_row.item_id = new_item_id
  ),
  cost_entry_sources as (
    select
      saved_option.id as price_option_id,
      saved_option.item_id,
      saved_option.workspace_id,
      entry_row.value as entry_json,
      entry_row.ordinality,
      (
        coalesce((entry_row.value->>'isCurrent')::boolean, false)
        or nullif(saved_option.option_json->>'activeCostEntryId', '') = nullif(entry_row.value->>'clientId', '')
      ) as requested_current
    from saved_options saved_option
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(saved_option.option_json->'costEntries') = 'array'
          and jsonb_array_length(saved_option.option_json->'costEntries') > 0
        then saved_option.option_json->'costEntries'
        else jsonb_build_array(jsonb_build_object(
          'unitCost', saved_option.option_json->>'unitCost',
          'miscCost', coalesce(saved_option.option_json->>'miscCost', '0'),
          'currency', coalesce(saved_option.option_json->>'currency', 'PHP'),
          'pricingSource', saved_option.option_json->>'pricingSource',
          'pricingDate', saved_option.option_json->>'pricingDate',
          'confidence', saved_option.option_json->>'confidence',
          'sourceUrl', saved_option.option_json->>'sourceUrl',
          'notes', saved_option.option_json->>'notes',
          'isCurrent', true
        ))
      end
    ) with ordinality as entry_row(value, ordinality)
  ),
  ranked_cost_entries as (
    select
      *,
      row_number() over (
        partition by price_option_id
        order by requested_current desc, ordinality asc
      ) = 1 as should_be_current
    from cost_entry_sources
  ),
  inserted_cost_entries as (
    insert into public.cost_library_item_variant_cost_entries (
      price_option_id,
      item_id,
      workspace_id,
      unit_cost,
      misc_cost,
      currency,
      pricing_source,
      pricing_date,
      confidence,
      source_url,
      notes,
      is_current,
      created_by
    )
    select
      price_option_id,
      item_id,
      workspace_id,
      coalesce(nullif(entry_json->>'unitCost', '')::numeric, 0),
      coalesce(nullif(entry_json->>'miscCost', '')::numeric, 0),
      coalesce(nullif(trim(entry_json->>'currency'), ''), 'PHP'),
      nullif(trim(entry_json->>'pricingSource'), ''),
      coalesce(nullif(entry_json->>'pricingDate', '')::date, current_date),
      nullif(trim(entry_json->>'confidence'), ''),
      nullif(trim(entry_json->>'sourceUrl'), ''),
      coalesce(entry_json->>'notes', ''),
      should_be_current,
      current_user_id
    from ranked_cost_entries
    returning *
  )
  update public.cost_library_item_price_options option_row
  set active_cost_entry_id = inserted_cost_entries.id,
      unit_cost = inserted_cost_entries.unit_cost,
      misc_cost = inserted_cost_entries.misc_cost,
      currency = inserted_cost_entries.currency,
      pricing_source = inserted_cost_entries.pricing_source,
      pricing_date = inserted_cost_entries.pricing_date,
      confidence = inserted_cost_entries.confidence,
      source_url = inserted_cost_entries.source_url,
      notes = inserted_cost_entries.notes
  from inserted_cost_entries
  where option_row.id = inserted_cost_entries.price_option_id
    and inserted_cost_entries.is_current;

  with option_sources as (
    select
      option_row.value,
      coalesce(nullif(option_row.value->>'variantSortOrder', '')::integer, option_row.ordinality::integer) as variant_sort_order
    from jsonb_array_elements(price_options) with ordinality as option_row(value, ordinality)
  ),
  saved_options as (
    select
      option_row.id,
      option_row.item_id,
      option_row.workspace_id,
      option_source.value as option_json
    from public.cost_library_item_price_options option_row
    join option_sources option_source
      on option_source.variant_sort_order = option_row.variant_sort_order
    where option_row.item_id = new_item_id
  )
  insert into public.cost_library_item_variant_attachments (
    price_option_id,
    item_id,
    workspace_id,
    storage_bucket,
    storage_path,
    file_name,
    content_type,
    size_bytes,
    attachment_kind,
    metadata,
    created_by
  )
  select
    saved_option.id,
    saved_option.item_id,
    saved_option.workspace_id,
    coalesce(nullif(trim(attachment.value->>'bucket'), ''), 'component-attachments'),
    trim(attachment.value->>'path'),
    trim(attachment.value->>'fileName'),
    trim(attachment.value->>'contentType'),
    coalesce(nullif(attachment.value->>'sizeBytes', '')::bigint, 0),
    case
      when trim(attachment.value->>'contentType') = 'application/pdf' then 'pdf'
      else 'excel'
    end,
    coalesce(attachment.value->'metadata', '{}'::jsonb),
    current_user_id
  from saved_options saved_option
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(saved_option.option_json->'attachments') = 'array'
      then saved_option.option_json->'attachments'
      else '[]'::jsonb
    end
  ) attachment(value)
  where trim(coalesce(attachment.value->>'path', '')) <> ''
    and trim(coalesce(attachment.value->>'fileName', '')) <> '';

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
      confidence = default_price_option.confidence,
      thumbnail_path = coalesce(default_price_option.thumbnail_path, item.thumbnail_path)
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
  set name = coalesce(nullif(trim(component->>'name'), ''), name),
      description = coalesce(component->>'description', description),
      category = coalesce(nullif(trim(component->>'category'), ''), category),
      supplier = nullif(trim(coalesce(component->>'supplier', supplier)), ''),
      brand = nullif(trim(coalesce(component->>'brand', brand)), ''),
      brand_id = case when component ? 'brandId' then new_brand_id else brand_id end,
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

alter table public.cost_library_items
  drop column if exists kind,
  drop column if exists sku;

revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from public;
revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from anon, authenticated;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from public;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from anon;
revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from public;
revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from anon;
grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_cost_library_component(uuid, uuid, jsonb) to authenticated;
