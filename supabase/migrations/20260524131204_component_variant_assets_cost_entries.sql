-- Variant assets, private attachments, and selectable dated cost entries.
-- Component identity stays in cost_library_items; variants stay in
-- cost_library_item_price_options for estimate insertion compatibility.

alter table public.cost_library_item_price_options
  add column if not exists image_bucket text,
  add column if not exists image_path text,
  add column if not exists thumbnail_path text,
  add column if not exists image_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists cost_library_item_price_options_id_workspace_key
  on public.cost_library_item_price_options(id, workspace_id);

create table if not exists public.cost_library_item_variant_cost_entries (
  id uuid primary key default gen_random_uuid(),
  price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade,
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  misc_cost numeric(14, 2) not null default 0 check (misc_cost >= 0),
  currency text not null default 'PHP' check (char_length(currency) = 3),
  pricing_source text,
  pricing_date date not null default current_date,
  confidence text,
  source_url text,
  notes text not null default '',
  is_current boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_variant_cost_entries_option_workspace_fkey'
  ) then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_variant_cost_entries_option_workspace_fkey
      foreign key (price_option_id, workspace_id)
      references public.cost_library_item_price_options(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_variant_cost_entries_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_variant_cost_entries_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;
end;
$$;

create unique index if not exists cost_library_variant_cost_entries_current_key
  on public.cost_library_item_variant_cost_entries(price_option_id)
  where is_current and deleted_at is null;

create index if not exists cost_library_variant_cost_entries_option_idx
  on public.cost_library_item_variant_cost_entries(price_option_id, deleted_at, is_current desc, pricing_date desc, created_at desc);

alter table public.cost_library_item_price_options
  add column if not exists active_cost_entry_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_item_price_options_active_cost_entry_fkey'
  ) then
    alter table public.cost_library_item_price_options
      add constraint cost_library_item_price_options_active_cost_entry_fkey
      foreign key (active_cost_entry_id)
      references public.cost_library_item_variant_cost_entries(id)
      on delete set null
      deferrable initially deferred;
  end if;
end;
$$;

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
  created_by,
  created_at,
  updated_at
)
select
  option_row.id,
  option_row.item_id,
  option_row.workspace_id,
  option_row.unit_cost,
  option_row.misc_cost,
  option_row.currency,
  option_row.pricing_source,
  coalesce(option_row.pricing_date, option_row.created_at::date),
  option_row.confidence,
  option_row.source_url,
  option_row.notes,
  true,
  option_row.created_by,
  option_row.created_at,
  option_row.updated_at
from public.cost_library_item_price_options option_row
where not exists (
  select 1
  from public.cost_library_item_variant_cost_entries entry
  where entry.price_option_id = option_row.id
);

update public.cost_library_item_price_options option_row
set active_cost_entry_id = entry.id
from public.cost_library_item_variant_cost_entries entry
where entry.price_option_id = option_row.id
  and entry.is_current
  and entry.deleted_at is null
  and option_row.active_cost_entry_id is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'component-attachments',
  'component-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.cost_library_item_variant_attachments (
  id uuid primary key default gen_random_uuid(),
  price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade,
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_bucket text not null default 'component-attachments',
  storage_path text not null,
  file_name text not null check (char_length(trim(file_name)) > 0),
  content_type text not null check (content_type in (
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  size_bytes bigint not null check (size_bytes > 0),
  attachment_kind text not null check (attachment_kind in ('pdf', 'excel')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_library_variant_attachments_path_key unique (storage_bucket, storage_path)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_variant_attachments_option_workspace_fkey'
  ) then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_variant_attachments_option_workspace_fkey
      foreign key (price_option_id, workspace_id)
      references public.cost_library_item_price_options(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_variant_attachments_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_variant_attachments_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;
end;
$$;

create index if not exists cost_library_variant_attachments_option_idx
  on public.cost_library_item_variant_attachments(price_option_id, created_at desc);

drop trigger if exists cost_library_variant_cost_entries_set_updated_at on public.cost_library_item_variant_cost_entries;
create trigger cost_library_variant_cost_entries_set_updated_at
  before update on public.cost_library_item_variant_cost_entries
  for each row execute function public.set_updated_at();

drop trigger if exists cost_library_variant_attachments_set_updated_at on public.cost_library_item_variant_attachments;
create trigger cost_library_variant_attachments_set_updated_at
  before update on public.cost_library_item_variant_attachments
  for each row execute function public.set_updated_at();

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

set constraints all immediate;

alter table public.cost_library_item_variant_cost_entries enable row level security;
alter table public.cost_library_item_variant_attachments enable row level security;

drop policy if exists "members can manage variant cost entries" on public.cost_library_item_variant_cost_entries;
drop policy if exists "members can manage variant attachments" on public.cost_library_item_variant_attachments;

create policy "members can manage variant cost entries" on public.cost_library_item_variant_cost_entries
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can manage variant attachments" on public.cost_library_item_variant_attachments
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

revoke all on public.cost_library_item_variant_cost_entries from public;
revoke all on public.cost_library_item_variant_attachments from public;
grant select, insert, update on public.cost_library_item_variant_cost_entries to authenticated;
grant select, insert, update, delete on public.cost_library_item_variant_attachments to authenticated;

drop policy if exists "workspace members can read component attachments" on storage.objects;
drop policy if exists "workspace members can upload own component attachments" on storage.objects;
drop policy if exists "workspace members can update own component attachments" on storage.objects;
drop policy if exists "workspace members can delete own component attachments" on storage.objects;

create policy "workspace members can read component attachments" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'component-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "workspace members can upload own component attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'component-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "workspace members can update own component attachments" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'component-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'component-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "workspace members can delete own component attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'component-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from public;
revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from anon, authenticated;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from public;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from anon;
grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated;
