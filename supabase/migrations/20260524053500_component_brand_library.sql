-- Workspace-scoped component brands for the Add Component modal.
-- The existing cost_library_items.brand text remains a snapshot/display fallback.

create table if not exists public.component_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  normalized_name text not null check (char_length(trim(normalized_name)) > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint component_brands_workspace_normalized_name_key unique (workspace_id, normalized_name)
);

alter table public.cost_library_items
  add column if not exists brand_id uuid references public.component_brands(id) on delete set null;

create index if not exists component_brands_workspace_sort_idx on public.component_brands(workspace_id, sort_order, name);
create index if not exists cost_library_items_brand_id_idx on public.cost_library_items(brand_id);

drop trigger if exists component_brands_set_updated_at on public.component_brands;
create trigger component_brands_set_updated_at before update on public.component_brands for each row execute function public.set_updated_at();

alter table public.component_brands enable row level security;

drop policy if exists "members can manage component brands" on public.component_brands;
create policy "members can manage component brands" on public.component_brands
  for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.component_brands to authenticated;

create or replace function public.normalize_component_brand_name(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(regexp_replace(lower(regexp_replace(coalesce(value, ''), '[^a-z0-9]+', ' ', 'g')), '\s+', ' ', 'g'));
$$;

create or replace function public.sync_cost_library_item_brand_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_brand text;
  resolved_brand public.component_brands;
begin
  if new.brand_id is not null then
    select *
      into resolved_brand
    from public.component_brands brand
    where brand.id = new.brand_id
      and brand.workspace_id = new.workspace_id;

    if resolved_brand.id is null then
      raise exception 'Component brand must belong to the same workspace.';
    end if;

    new.brand := coalesce(nullif(trim(new.brand), ''), resolved_brand.name);
    return new;
  end if;

  new.brand := nullif(trim(new.brand), '');
  if new.brand is null then
    return new;
  end if;

  normalized_brand := public.normalize_component_brand_name(new.brand);
  if normalized_brand = '' then
    new.brand := null;
    return new;
  end if;

  insert into public.component_brands (workspace_id, name, normalized_name, created_by)
  values (new.workspace_id, new.brand, normalized_brand, coalesce(auth.uid(), new.created_by))
  on conflict (workspace_id, normalized_name)
  do update set name = excluded.name
  returning * into resolved_brand;

  new.brand_id := resolved_brand.id;
  return new;
end;
$$;

drop trigger if exists cost_library_items_sync_brand_ref on public.cost_library_items;
create trigger cost_library_items_sync_brand_ref
before insert or update of workspace_id, brand, brand_id on public.cost_library_items
for each row execute function public.sync_cost_library_item_brand_ref();

insert into public.component_brands (workspace_id, name, normalized_name, created_by)
select distinct
  item.workspace_id,
  trim(item.brand),
  public.normalize_component_brand_name(item.brand),
  item.created_by
from public.cost_library_items item
where nullif(trim(item.brand), '') is not null
  and public.normalize_component_brand_name(item.brand) <> ''
on conflict (workspace_id, normalized_name)
do update set name = excluded.name;

update public.cost_library_items item
set brand_id = brand.id
from public.component_brands brand
where brand.workspace_id = item.workspace_id
  and brand.normalized_name = public.normalize_component_brand_name(item.brand)
  and item.brand_id is null
  and nullif(trim(item.brand), '') is not null;

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

  if new.brand_id is not null and not exists (
    select 1 from public.component_brands brand
    where brand.id = new.brand_id
      and brand.workspace_id = new.workspace_id
  ) then
    raise exception 'Component brand must belong to the same workspace.';
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
after insert or update of workspace_id, supplier_id, brand_id, library_folder_id on public.cost_library_items
deferrable initially deferred
for each row execute function public.enforce_cost_library_item_workspace_refs();

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
      select jsonb_agg(public.cost_library_price_option_snapshot(option_row) order by option_row.is_default desc, option_row.created_at, option_row.id)
      from public.cost_library_item_price_options option_row
      where option_row.item_id = item.id
        and option_row.is_active
    ), '[]'::jsonb)
  )
  from public.cost_library_items item
  where item.id = target_item_id;
$$;
