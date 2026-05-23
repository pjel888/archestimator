-- Component creation, pricing options, lifecycle states, and append-only history.
-- This migration keeps cost_library_items as the stable component identity while
-- adding versioned write paths for /workshop/library.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'component_lifecycle_state') then
    create type public.component_lifecycle_state as enum (
      'draft',
      'in_production',
      'available',
      'discontinued',
      'archived'
    );
  end if;
end;
$$;

alter table public.cost_library_items
  add column if not exists lifecycle_state public.component_lifecycle_state not null default 'available',
  add column if not exists lifecycle_state_changed_at timestamptz not null default now(),
  add column if not exists lifecycle_state_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists active_price_option_id uuid,
  add column if not exists current_version_number integer not null default 1 check (current_version_number > 0);

create table if not exists public.cost_library_item_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  change_summary text not null default '',
  change_reason text not null default '',
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cost_library_item_versions_item_version_key unique (item_id, version_number)
);

create table if not exists public.cost_library_item_price_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  unit text not null default 'unit' check (char_length(trim(unit)) > 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  misc_cost numeric(14, 2) not null default 0 check (misc_cost >= 0),
  currency text not null default 'PHP' check (char_length(currency) = 3),
  pricing_source text,
  pricing_date date,
  confidence text,
  source_url text,
  notes text not null default '',
  supplier_id uuid references public.component_suppliers(id) on delete set null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cost_library_item_price_history (
  id uuid primary key default gen_random_uuid(),
  price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade,
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  old_snapshot jsonb,
  new_snapshot jsonb not null,
  change_reason text not null default '',
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cost_library_item_state_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_state public.component_lifecycle_state,
  to_state public.component_lifecycle_state not null,
  effective_at timestamptz not null default now(),
  change_reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists cost_library_items_id_workspace_key
  on public.cost_library_items(id, workspace_id);
create unique index if not exists component_suppliers_id_workspace_key
  on public.component_suppliers(id, workspace_id);
create unique index if not exists library_folders_id_workspace_key
  on public.library_folders(id, workspace_id);
create index if not exists cost_library_items_workspace_lifecycle_idx
  on public.cost_library_items(workspace_id, lifecycle_state);
create index if not exists cost_library_item_versions_workspace_item_idx
  on public.cost_library_item_versions(workspace_id, item_id, version_number desc);
create index if not exists cost_library_item_price_options_workspace_item_idx
  on public.cost_library_item_price_options(workspace_id, item_id, is_active);
create unique index if not exists cost_library_item_price_options_default_active_key
  on public.cost_library_item_price_options(item_id)
  where is_default and is_active;
create index if not exists cost_library_item_price_history_workspace_item_idx
  on public.cost_library_item_price_history(workspace_id, item_id, effective_at desc);
create index if not exists cost_library_item_state_history_workspace_item_idx
  on public.cost_library_item_state_history(workspace_id, item_id, effective_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_item_price_options_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_price_options
      add constraint cost_library_item_price_options_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_item_versions_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_versions
      add constraint cost_library_item_versions_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_item_price_history_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_price_history
      add constraint cost_library_item_price_history_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_item_state_history_item_workspace_fkey'
  ) then
    alter table public.cost_library_item_state_history
      add constraint cost_library_item_state_history_item_workspace_fkey
      foreign key (item_id, workspace_id)
      references public.cost_library_items(id, workspace_id)
      on delete cascade
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cost_library_items_active_price_option_fkey'
  ) then
    alter table public.cost_library_items
      add constraint cost_library_items_active_price_option_fkey
      foreign key (active_price_option_id)
      references public.cost_library_item_price_options(id)
      on delete set null
      deferrable initially deferred;
  end if;
end;
$$;

drop trigger if exists cost_library_item_price_options_set_updated_at on public.cost_library_item_price_options;
create trigger cost_library_item_price_options_set_updated_at
  before update on public.cost_library_item_price_options
  for each row execute function public.set_updated_at();

create or replace function public.enforce_cost_library_item_workspace_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supplier_id is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = new.supplier_id
      and supplier.workspace_id = new.workspace_id
  ) then
    raise exception 'Component supplier must belong to the same workspace.';
  end if;

  if new.library_folder_id is not null and not exists (
    select 1 from public.library_folders folder
    where folder.id = new.library_folder_id
      and folder.workspace_id = new.workspace_id
  ) then
    raise exception 'Component folder must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists cost_library_items_enforce_workspace_refs on public.cost_library_items;
create constraint trigger cost_library_items_enforce_workspace_refs
after insert or update of workspace_id, supplier_id, library_folder_id on public.cost_library_items
deferrable initially deferred
for each row execute function public.enforce_cost_library_item_workspace_refs();

create or replace function public.enforce_cost_library_price_option_workspace_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supplier_id is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = new.supplier_id
      and supplier.workspace_id = new.workspace_id
  ) then
    raise exception 'Price option supplier must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists cost_library_item_price_options_enforce_workspace_refs on public.cost_library_item_price_options;
create constraint trigger cost_library_item_price_options_enforce_workspace_refs
after insert or update of workspace_id, supplier_id on public.cost_library_item_price_options
deferrable initially deferred
for each row execute function public.enforce_cost_library_price_option_workspace_refs();

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
      select jsonb_agg(public.cost_library_price_option_snapshot(option_row) order by option_row.is_default desc, option_row.created_at, option_row.id)
      from public.cost_library_item_price_options option_row
      where option_row.item_id = item.id
        and option_row.is_active
    ), '[]'::jsonb)
  )
  from public.cost_library_items item
  where item.id = target_item_id;
$$;

drop function if exists public.validate_cost_library_component_refs(uuid, uuid, text, uuid);
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

  if resolved_user_id is null or not exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = resolved_user_id
  ) then
    raise exception 'Workspace access denied.';
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
    raise exception 'At least one price option is required.';
  end if;

  select count(*), count(*) filter (where coalesce((option_row.value->>'isDefault')::boolean, false))
    into option_count, default_count
  from jsonb_array_elements(price_options) option_row;

  if option_count = 0 then
    raise exception 'At least one price option is required.';
  end if;
  if default_count <> 1 then
    raise exception 'Exactly one default price option is required.';
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
    is_active,
    is_default,
    created_by
  )
  select
    new_item_id,
    target_workspace_id,
    trim(coalesce(option_row.value->>'label', '')),
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
    true,
    coalesce((option_row.value->>'isDefault')::boolean, false),
    current_user_id
  from jsonb_array_elements(price_options) option_row;

  if exists (
    select 1 from public.cost_library_item_price_options option_row
    where option_row.item_id = new_item_id
      and char_length(trim(option_row.label)) = 0
  ) then
    raise exception 'Price option label is required.';
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
    'activePriceOptionId', default_price_option_id
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
  next_version integer;
  new_category_node_id text := nullif(trim(component->>'categoryNodeId'), '');
  new_supplier_id uuid := nullif(component->>'supplierId', '')::uuid;
  new_supplier_name text := nullif(trim(component->>'supplier'), '');
  new_supplier_normalized text;
  new_library_folder_id uuid := nullif(component->>'libraryFolderId', '')::uuid;
  change_reason text := coalesce(component->>'changeReason', '');
  effective_at timestamptz := coalesce(nullif(component->>'effectiveAt', '')::timestamptz, now());
begin
  perform public.validate_cost_library_component_refs(target_workspace_id, new_library_folder_id, new_category_node_id, new_supplier_id, current_user_id);

  if new_supplier_id is null and new_supplier_name is not null then
    new_supplier_normalized := lower(regexp_replace(new_supplier_name, '[^a-z0-9]+', ' ', 'g'));
    new_supplier_normalized := trim(regexp_replace(new_supplier_normalized, '\s+', ' ', 'g'));

    insert into public.component_suppliers (workspace_id, name, normalized_name, created_by)
    values (target_workspace_id, new_supplier_name, new_supplier_normalized, current_user_id)
    on conflict (workspace_id, normalized_name)
    do update set name = excluded.name
    returning id into new_supplier_id;
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

  next_version := item_row.current_version_number + 1;

  update public.cost_library_items
  set kind = coalesce(nullif(component->>'kind', '')::public.cost_library_item_kind, kind),
      name = coalesce(nullif(trim(component->>'name'), ''), name),
      description = coalesce(component->>'description', description),
      category = coalesce(nullif(trim(component->>'category'), ''), category),
      supplier = nullif(trim(coalesce(component->>'supplier', supplier)), ''),
      brand = nullif(trim(coalesce(component->>'brand', brand)), ''),
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
    raise exception 'Price option supplier not found in the current workspace.';
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
      raise exception 'Price option not found in the current component.';
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
        is_active = coalesce((price_option->>'isActive')::boolean, is_active),
        is_default = make_default
    where id = option_id
    returning * into saved_option;
  else
    insert into public.cost_library_item_price_options (
      item_id,
      workspace_id,
      label,
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
      is_active,
      is_default,
      created_by
    )
    values (
      target_item_id,
      target_workspace_id,
      trim(coalesce(price_option->>'label', '')),
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
    raise exception 'Price option label is required.';
  end if;

  if make_default and saved_option.is_active then
    update public.cost_library_items
    set active_price_option_id = saved_option.id,
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
    'Price option changed',
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

drop function if exists public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz);
create or replace function public.set_cost_library_component_lifecycle_state(
  target_workspace_id uuid,
  target_item_id uuid,
  next_state public.component_lifecycle_state,
  change_reason text default '',
  effective_at timestamptz default now(),
  acting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.cost_library_items;
  current_user_id uuid := coalesce(auth.uid(), acting_user_id);
  next_version integer;
begin
  if next_state is null then
    raise exception 'Lifecycle state is required.';
  end if;

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

  if item_row.lifecycle_state = next_state then
    return jsonb_build_object(
      'itemId', target_item_id,
      'versionNumber', item_row.current_version_number,
      'lifecycleState', next_state
    );
  end if;

  next_version := item_row.current_version_number + 1;

  update public.cost_library_items
  set lifecycle_state = next_state,
      lifecycle_state_changed_at = coalesce(effective_at, now()),
      lifecycle_state_changed_by = current_user_id,
      current_version_number = next_version
  where id = target_item_id
    and workspace_id = target_workspace_id;

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
    target_item_id,
    target_workspace_id,
    item_row.lifecycle_state,
    next_state,
    coalesce(effective_at, now()),
    coalesce(change_reason, ''),
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
    target_item_id,
    target_workspace_id,
    next_version,
    public.cost_library_item_version_snapshot(target_item_id),
    'Lifecycle state changed',
    coalesce(change_reason, ''),
    coalesce(effective_at, now()),
    current_user_id
  );

  return jsonb_build_object(
    'itemId', target_item_id,
    'versionNumber', next_version,
    'lifecycleState', next_state
  );
end;
$$;

insert into public.cost_library_item_price_options (
  item_id,
  workspace_id,
  label,
  unit,
  unit_cost,
  misc_cost,
  currency,
  pricing_source,
  pricing_date,
  confidence,
  supplier_id,
  is_active,
  is_default,
  created_by
)
select
  item.id,
  item.workspace_id,
  coalesce(nullif(item.pricing_source, ''), 'Default price'),
  item.unit,
  item.unit_cost,
  item.misc_cost,
  'PHP',
  item.pricing_source,
  item.pricing_date,
  item.confidence,
  item.supplier_id,
  true,
  true,
  item.created_by
from public.cost_library_items item
where not exists (
  select 1
  from public.cost_library_item_price_options existing_option
  where existing_option.item_id = item.id
);

update public.cost_library_items item
set active_price_option_id = option_row.id
from public.cost_library_item_price_options option_row
where option_row.item_id = item.id
  and option_row.is_default
  and option_row.is_active
  and item.active_price_option_id is null;

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
  'Initial backfill',
  option_row.created_at,
  option_row.created_by
from public.cost_library_item_price_options option_row
where not exists (
  select 1
  from public.cost_library_item_price_history existing_history
  where existing_history.price_option_id = option_row.id
);

insert into public.cost_library_item_state_history (
  item_id,
  workspace_id,
  from_state,
  to_state,
  effective_at,
  change_reason,
  created_by
)
select
  item.id,
  item.workspace_id,
  null,
  item.lifecycle_state,
  item.lifecycle_state_changed_at,
  'Initial backfill',
  item.created_by
from public.cost_library_items item
where not exists (
  select 1
  from public.cost_library_item_state_history existing_history
  where existing_history.item_id = item.id
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
select
  item.id,
  item.workspace_id,
  1,
  public.cost_library_item_version_snapshot(item.id),
  'Initial version backfill',
  'Initial backfill',
  item.created_at,
  item.created_by
from public.cost_library_items item
where not exists (
  select 1
  from public.cost_library_item_versions existing_version
  where existing_version.item_id = item.id
    and existing_version.version_number = 1
);

set constraints all immediate;

alter table public.cost_library_item_versions enable row level security;
alter table public.cost_library_item_price_options enable row level security;
alter table public.cost_library_item_price_history enable row level security;
alter table public.cost_library_item_state_history enable row level security;

drop policy if exists "members can view component versions" on public.cost_library_item_versions;
drop policy if exists "members can insert component versions" on public.cost_library_item_versions;
drop policy if exists "members can manage component price options" on public.cost_library_item_price_options;
drop policy if exists "members can view component price history" on public.cost_library_item_price_history;
drop policy if exists "members can insert component price history" on public.cost_library_item_price_history;
drop policy if exists "members can view component state history" on public.cost_library_item_state_history;
drop policy if exists "members can insert component state history" on public.cost_library_item_state_history;

create policy "members can view component versions" on public.cost_library_item_versions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members can insert component versions" on public.cost_library_item_versions
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can manage component price options" on public.cost_library_item_price_options
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can view component price history" on public.cost_library_item_price_history
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members can insert component price history" on public.cost_library_item_price_history
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "members can view component state history" on public.cost_library_item_state_history
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members can insert component state history" on public.cost_library_item_state_history
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

revoke all on public.cost_library_item_versions from public;
revoke all on public.cost_library_item_price_options from public;
revoke all on public.cost_library_item_price_history from public;
revoke all on public.cost_library_item_state_history from public;

grant select, insert on public.cost_library_item_versions to authenticated;
grant select, insert, update on public.cost_library_item_price_options to authenticated;
grant select, insert on public.cost_library_item_price_history to authenticated;
grant select, insert on public.cost_library_item_state_history to authenticated;

revoke execute on function public.enforce_cost_library_item_workspace_refs() from public;
revoke execute on function public.enforce_cost_library_price_option_workspace_refs() from public;
revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from public;
revoke execute on function public.cost_library_item_version_snapshot(uuid) from public;
revoke execute on function public.validate_cost_library_component_refs(uuid, uuid, text, uuid, uuid) from public;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from public;
revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from public;
revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from public;
revoke execute on function public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz, uuid) from public;
revoke execute on function public.enforce_cost_library_item_workspace_refs() from anon, authenticated;
revoke execute on function public.enforce_cost_library_price_option_workspace_refs() from anon, authenticated;
revoke execute on function public.cost_library_price_option_snapshot(public.cost_library_item_price_options) from anon, authenticated;
revoke execute on function public.cost_library_item_version_snapshot(uuid) from anon, authenticated;
revoke execute on function public.validate_cost_library_component_refs(uuid, uuid, text, uuid, uuid) from anon, authenticated;

grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_cost_library_component(uuid, uuid, jsonb) to authenticated;
grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated;
grant execute on function public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz, uuid) to authenticated;
