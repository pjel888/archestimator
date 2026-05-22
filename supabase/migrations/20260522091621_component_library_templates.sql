-- Persist reusable estimate templates for the component library.
-- Templates are workspace scoped and copy their group/area/row contents into estimates later.

create table if not exists public.estimate_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  category text not null default 'General' check (char_length(trim(category)) > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_template_nodes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.estimate_templates(id) on delete cascade,
  parent_id uuid references public.estimate_template_nodes(id) on delete cascade,
  kind public.estimate_node_kind not null,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_template_nodes_active_kind_check check (kind in ('group', 'area')),
  constraint estimate_template_nodes_parent_not_self_check check (parent_id is null or parent_id <> id),
  constraint estimate_template_nodes_template_id_id_key unique (template_id, id),
  constraint estimate_template_nodes_parent_same_template_fkey foreign key (template_id, parent_id)
    references public.estimate_template_nodes(template_id, id) on delete cascade,
  constraint estimate_template_nodes_unique_sort unique nulls not distinct (template_id, parent_id, sort_order) deferrable initially deferred
);

create table if not exists public.estimate_template_row_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.estimate_templates(id) on delete cascade,
  template_node_id uuid not null references public.estimate_template_nodes(id) on delete cascade,
  sort_order integer not null default 0,
  source_library_item_id uuid references public.cost_library_items(id) on delete set null,
  source_snapshot jsonb,
  category_node_id text references public.component_category_nodes(id) on delete set null,
  supplier_id uuid references public.component_suppliers(id) on delete set null,
  material text not null default '',
  description text not null default '',
  supplier text not null default '',
  unit text not null default 'unit',
  quantity numeric(14,4) not null default 0 check (quantity >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  misc_cost numeric(14,2) not null default 0 check (misc_cost >= 0),
  discipline text not null default '',
  designation text not null default '',
  link_state public.estimate_row_link_state not null default 'unlinked',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_template_row_items_node_same_template_fkey foreign key (template_id, template_node_id)
    references public.estimate_template_nodes(template_id, id) on delete cascade,
  constraint estimate_template_row_items_unique_sort unique (template_node_id, sort_order) deferrable initially deferred
);

create index if not exists estimate_templates_workspace_sort_idx on public.estimate_templates(workspace_id, sort_order, name);
create index if not exists estimate_template_nodes_template_parent_sort_idx on public.estimate_template_nodes(template_id, parent_id, sort_order);
create index if not exists estimate_template_row_items_template_node_sort_idx on public.estimate_template_row_items(template_id, template_node_id, sort_order);
create index if not exists estimate_template_row_items_source_library_item_id_idx on public.estimate_template_row_items(source_library_item_id);
create index if not exists estimate_template_row_items_category_node_id_idx on public.estimate_template_row_items(category_node_id);
create index if not exists estimate_template_row_items_supplier_id_idx on public.estimate_template_row_items(supplier_id);

drop trigger if exists estimate_templates_set_updated_at on public.estimate_templates;
drop trigger if exists estimate_template_nodes_set_updated_at on public.estimate_template_nodes;
drop trigger if exists estimate_template_row_items_set_updated_at on public.estimate_template_row_items;

create trigger estimate_templates_set_updated_at before update on public.estimate_templates for each row execute function public.set_updated_at();
create trigger estimate_template_nodes_set_updated_at before update on public.estimate_template_nodes for each row execute function public.set_updated_at();
create trigger estimate_template_row_items_set_updated_at before update on public.estimate_template_row_items for each row execute function public.set_updated_at();

create or replace function public.validate_estimate_template_tree(target_template_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if target_template_id is null then
    raise exception 'Template id is required.';
  end if;

  if exists (
    select 1
    from public.estimate_template_nodes child
    left join public.estimate_template_nodes parent
      on parent.id = child.parent_id
      and parent.template_id = child.template_id
    where child.template_id = target_template_id
      and child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Template node tree contains a missing parent reference.';
  end if;

  if exists (
    select 1
    from public.estimate_template_nodes child
    left join public.estimate_template_nodes parent
      on parent.id = child.parent_id
      and parent.template_id = child.template_id
    where child.template_id = target_template_id
      and not (
        (child.parent_id is null and child.kind in ('group'))
        or (parent.kind in ('group') and child.kind in ('group', 'area'))
      )
  ) then
    raise exception 'Template node tree violates hierarchy rules.';
  end if;

  if exists (
    select 1
    from public.estimate_template_row_items row_item
    left join public.estimate_template_nodes node
      on node.id = row_item.template_node_id
      and node.template_id = row_item.template_id
    where row_item.template_id = target_template_id
      and (node.id is null or node.kind <> 'area')
  ) then
    raise exception 'Template row items must belong to area nodes.';
  end if;

  if exists (
    with recursive tree_nodes as (
      select node.id, node.parent_id
      from public.estimate_template_nodes node
      where node.template_id = target_template_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select tree_nodes.id, tree_nodes.parent_id, array[tree_nodes.id], false
      from tree_nodes
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join tree_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Template node tree creates a cycle.';
  end if;
end;
$$;

create or replace function public.enforce_estimate_template_node_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.validate_estimate_template_tree(new.template_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.template_id is distinct from new.template_id) then
    perform public.validate_estimate_template_tree(old.template_id);
  end if;

  return null;
end;
$$;

drop trigger if exists estimate_template_nodes_enforce_tree on public.estimate_template_nodes;
create constraint trigger estimate_template_nodes_enforce_tree
after insert or update or delete on public.estimate_template_nodes
deferrable initially deferred
for each row execute function public.enforce_estimate_template_node_tree();

create or replace function public.enforce_estimate_template_row_item_area_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.id = new.template_node_id
      and node.template_id = new.template_id
      and node.kind = 'area'
  ) then
    raise exception 'Template row items must belong to area nodes.';
  end if;

  return null;
end;
$$;

drop trigger if exists estimate_template_row_items_enforce_area_node on public.estimate_template_row_items;
create constraint trigger estimate_template_row_items_enforce_area_node
after insert or update of template_id, template_node_id on public.estimate_template_row_items
deferrable initially deferred
for each row execute function public.enforce_estimate_template_row_item_area_node();

create or replace function public.insert_estimate_template_into_estimate(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  target_workspace_id uuid;
  source_workspace_id uuid;
  source_template_name text;
  max_sibling_sort_order integer;
  inserted_node_count integer := 0;
  inserted_row_item_count integer := 0;
  inserted_root_node_ids jsonb := '[]'::jsonb;
begin
  if target_project_id is null or target_estimate_id is null or target_parent_node_id is null or source_template_id is null then
    raise exception 'Project, estimate, target parent, and source template are required.';
  end if;

  select project.workspace_id
    into target_workspace_id
  from public.estimates estimate
  join public.projects project on project.id = estimate.project_id
  where estimate.id = target_estimate_id
    and project.id = target_project_id;

  if target_workspace_id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  select template.workspace_id, template.name
    into source_workspace_id, source_template_name
  from public.estimate_templates template
  where template.id = source_template_id;

  if source_workspace_id is null then
    raise exception 'Estimate template not found in the current workspace.';
  end if;

  if source_workspace_id <> target_workspace_id then
    raise exception 'Estimate template does not belong to the target estimate workspace.';
  end if;

  if not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_parent_node_id
      and node.estimate_id = target_estimate_id
      and node.kind = 'group'
  ) then
    raise exception 'Target Group Node not found in the current project.';
  end if;

  perform public.validate_estimate_template_tree(source_template_id);

  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.template_id = source_template_id
  ) then
    raise exception 'Estimate template must include at least one node.';
  end if;

  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
  for update;

  set constraints estimate_nodes_unique_sort, estimate_nodes_unique_sort_with_root deferred;

  create temporary table if not exists estimate_template_copy_map (
    source_node_id uuid primary key,
    target_node_id uuid not null,
    source_parent_id uuid,
    kind public.estimate_node_kind not null,
    source_sort_order integer not null,
    root_rank integer
  ) on commit drop;

  truncate table estimate_template_copy_map;

  insert into estimate_template_copy_map (source_node_id, target_node_id, source_parent_id, kind, source_sort_order, root_rank)
  select
    node.id,
    gen_random_uuid(),
    node.parent_id,
    node.kind,
    node.sort_order,
    case
      when node.parent_id is null then row_number() over (partition by node.parent_id order by node.sort_order, node.id)
      else null
    end
  from public.estimate_template_nodes node
  where node.template_id = source_template_id;

  select coalesce(max(node.sort_order), 0)
    into max_sibling_sort_order
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id = target_parent_node_id;

  insert into public.estimate_nodes (id, estimate_id, parent_id, kind, name, sort_order, metadata)
  select
    node_map.target_node_id,
    target_estimate_id,
    coalesce(parent_map.target_node_id, target_parent_node_id),
    template_node.kind,
    template_node.name,
    case
      when template_node.parent_id is null then max_sibling_sort_order + (node_map.root_rank * 10)
      else template_node.sort_order
    end,
    template_node.metadata || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateNodeId', template_node.id
    )
  from public.estimate_template_nodes template_node
  join estimate_template_copy_map node_map on node_map.source_node_id = template_node.id
  left join estimate_template_copy_map parent_map on parent_map.source_node_id = template_node.parent_id
  where template_node.template_id = source_template_id;

  get diagnostics inserted_node_count = row_count;

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
    misc_cost,
    discipline,
    designation,
    link_state,
    metadata
  )
  select
    gen_random_uuid(),
    target_estimate_id,
    node_map.target_node_id,
    row_item.sort_order,
    row_item.source_library_item_id,
    coalesce(row_item.source_snapshot, '{}'::jsonb) || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateRowId', row_item.id
    ),
    row_item.category_node_id,
    row_item.supplier_id,
    row_item.material,
    row_item.description,
    row_item.supplier,
    row_item.unit,
    row_item.quantity,
    row_item.unit_cost,
    row_item.misc_cost,
    row_item.discipline,
    row_item.designation,
    row_item.link_state,
    row_item.metadata || jsonb_build_object(
      'sourceTemplateId', source_template_id,
      'sourceTemplateName', source_template_name,
      'sourceTemplateRowId', row_item.id
    )
  from public.estimate_template_row_items row_item
  join estimate_template_copy_map node_map on node_map.source_node_id = row_item.template_node_id
  where row_item.template_id = source_template_id;

  get diagnostics inserted_row_item_count = row_count;

  if inserted_node_count <> (select count(*) from estimate_template_copy_map) then
    raise exception 'Estimate template copy did not insert every template node.';
  end if;

  select coalesce(jsonb_agg(node_map.target_node_id order by node_map.root_rank), '[]'::jsonb)
    into inserted_root_node_ids
  from estimate_template_copy_map node_map
  where node_map.source_parent_id is null;

  perform public.validate_estimate_node_tree(target_estimate_id);

  return jsonb_build_object(
    'inserted_root_node_ids', inserted_root_node_ids,
    'inserted_node_count', inserted_node_count,
    'inserted_row_item_count', inserted_row_item_count
  );
end;
$$;

create or replace function public.estimate_template_seed_uuid(target_workspace_id uuid, source_key text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select (
    substr(seed.hash, 1, 8) || '-' ||
    substr(seed.hash, 9, 4) || '-4' ||
    substr(seed.hash, 14, 3) || '-8' ||
    substr(seed.hash, 18, 3) || '-' ||
    substr(seed.hash, 21, 12)
  )::uuid
  from (select md5(target_workspace_id::text || ':' || source_key) as hash) seed;
$$;

with seed_templates(source_key, name, description, category, sort_order) as (
  values
    ('condo-fit-out-starter', 'Condo Fit-Out Starter', 'Room-ready interior fit-out structure with living, kitchen, and primary bedroom allowance rows.', 'Residential Rooms', 10),
    ('powder-room-basic', 'Powder Room Basic', 'Compact toilet and bath area template with vanity, faucet, floor drain, and wall finish rows.', 'Residential Rooms', 20),
    ('roof-deck-lounge', 'Roof Deck Lounge', 'Exterior entertainment structure with lounge, bar counter, and toilet areas.', 'Exterior + Site', 30)
)
insert into public.estimate_templates (
  id,
  workspace_id,
  name,
  description,
  category,
  sort_order,
  metadata
)
select
  public.estimate_template_seed_uuid(workspace.id, 'template:' || seed.source_key),
  workspace.id,
  seed.name,
  seed.description,
  seed.category,
  seed.sort_order,
  jsonb_build_object('seeded', true, 'seedVersion', '2026-05-22-component-library-templates', 'sourceKey', seed.source_key)
from public.workspaces workspace
cross join seed_templates seed
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      sort_order = excluded.sort_order,
      metadata = public.estimate_templates.metadata || excluded.metadata;

with seed_nodes(template_key, node_key, parent_node_key, kind, name, sort_order) as (
  values
    ('condo-fit-out-starter', 'condo-interior-fit-out', null, 'group'::public.estimate_node_kind, 'Interior Fit-Out', 10),
    ('condo-fit-out-starter', 'condo-living-dining', 'condo-interior-fit-out', 'area'::public.estimate_node_kind, 'Living + Dining', 10),
    ('condo-fit-out-starter', 'condo-kitchen', 'condo-interior-fit-out', 'area'::public.estimate_node_kind, 'Kitchen', 20),
    ('condo-fit-out-starter', 'condo-private-rooms', null, 'group'::public.estimate_node_kind, 'Private Rooms', 20),
    ('condo-fit-out-starter', 'condo-primary-bedroom', 'condo-private-rooms', 'area'::public.estimate_node_kind, 'Primary Bedroom', 10),
    ('powder-room-basic', 'powder-room-group', null, 'group'::public.estimate_node_kind, 'Powder Room', 10),
    ('powder-room-basic', 'powder-room-area', 'powder-room-group', 'area'::public.estimate_node_kind, 'Toilet + Bath', 10),
    ('roof-deck-lounge', 'roof-deck-group', null, 'group'::public.estimate_node_kind, 'Roof Deck', 10),
    ('roof-deck-lounge', 'roof-lounge-area', 'roof-deck-group', 'area'::public.estimate_node_kind, 'Lounge', 10),
    ('roof-deck-lounge', 'roof-toilet-area', 'roof-deck-group', 'area'::public.estimate_node_kind, 'Toilet', 20)
)
insert into public.estimate_template_nodes (
  id,
  template_id,
  parent_id,
  kind,
  name,
  sort_order,
  metadata
)
select
  public.estimate_template_seed_uuid(workspace.id, 'template-node:' || seed.node_key),
  public.estimate_template_seed_uuid(workspace.id, 'template:' || seed.template_key),
  case
    when seed.parent_node_key is null then null
    else public.estimate_template_seed_uuid(workspace.id, 'template-node:' || seed.parent_node_key)
  end,
  seed.kind,
  seed.name,
  seed.sort_order,
  jsonb_build_object('seeded', true, 'seedVersion', '2026-05-22-component-library-templates', 'sourceKey', seed.node_key)
from public.workspaces workspace
cross join seed_nodes seed
on conflict (id) do update
  set parent_id = excluded.parent_id,
      kind = excluded.kind,
      name = excluded.name,
      sort_order = excluded.sort_order,
      metadata = public.estimate_template_nodes.metadata || excluded.metadata;

with seed_rows(template_key, node_key, row_key, sort_order, material, description, supplier, unit, quantity, unit_cost, misc_cost, category, category_node_key, pricing_source, pricing_date) as (
  values
    ('condo-fit-out-starter', 'condo-living-dining', 'condo-living-sofa', 10, 'HEMLINGBY Loveseat', 'Compact living-room loveseat allowance.', 'IKEA Philippines', 'pc', 1::numeric, 7999::numeric, 1200::numeric, 'Furniture', 'furniture', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-living-dining', 'condo-living-dining-table', 20, 'SANDSBERG Dining Table', 'Compact dining-table benchmark.', 'IKEA Philippines', 'pc', 1::numeric, 2999::numeric, 3700::numeric, 'Tables', 'furniture-tables', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-living-dining', 'condo-living-dining-chair', 30, 'IKEA Dining Chair', 'Loose dining chair allowance.', 'IKEA Philippines', 'pc', 6::numeric, 1990::numeric, 250::numeric, 'Seating', 'furniture-seating', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-kitchen', 'condo-kitchen-sink', 10, 'Franke Single Bowl Sink', 'Stainless kitchen sink allowance.', 'Wilcon Depot / Franke dealers', 'pc', 1::numeric, 9800::numeric, 900::numeric, 'Kitchen Fixtures', 'plumbing-kitchen-fixtures', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-kitchen', 'condo-kitchen-mixer', 20, 'IKEA Kitchen Mixer', 'Single-lever kitchen faucet allowance.', 'IKEA Philippines', 'pc', 1::numeric, 4999::numeric, 750::numeric, 'Kitchen Fixtures', 'plumbing-kitchen-fixtures', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-primary-bedroom', 'condo-bedroom-bed', 10, 'BRUKSVARA Bed Frame', 'Queen bed-frame benchmark.', 'IKEA Philippines', 'set', 1::numeric, 6999::numeric, 3300::numeric, 'Beds', 'furniture-beds', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-primary-bedroom', 'condo-bedroom-bedside', 20, 'IKEA Bedside Table', 'Pair of bedside table allowances.', 'IKEA Philippines', 'pc', 2::numeric, 2799::numeric, 250::numeric, 'Tables', 'furniture-tables', 'Template allowance', '2026-05-22'),
    ('condo-fit-out-starter', 'condo-primary-bedroom', 'condo-bedroom-wardrobe', 30, 'KLEPPSTAD Wardrobe', 'Bedroom wardrobe allowance.', 'IKEA Philippines', 'set', 1::numeric, 8999::numeric, 2200::numeric, 'Storage Systems', 'casework-storage-systems', 'Template allowance', '2026-05-22'),
    ('powder-room-basic', 'powder-room-area', 'powder-vanity', 10, 'Pozzi Vanity Cabinet Allowance', 'Compact vanity with basin allowance.', 'Wilcon Depot / Pozzi', 'set', 1::numeric, 32000::numeric, 7000::numeric, 'Storage Systems', 'casework-storage-systems', 'Template allowance', '2026-05-22'),
    ('powder-room-basic', 'powder-room-area', 'powder-faucet', 20, 'GROHE Lavatory Faucet', 'Lavatory faucet allowance.', 'Wilcon Depot / GROHE dealers', 'pc', 1::numeric, 6200::numeric, 850::numeric, 'Plumbing Fixtures', 'plumbing-fixtures', 'Template allowance', '2026-05-22'),
    ('powder-room-basic', 'powder-room-area', 'powder-floor-drain', 30, 'Stainless Floor Drain', 'Stainless bathroom floor drain allowance.', 'Wilcon Depot', 'pc', 1::numeric, 1250::numeric, 250::numeric, 'Plumbing Fixtures', 'plumbing-fixtures', 'Template allowance', '2026-05-22'),
    ('powder-room-basic', 'powder-room-area', 'powder-tile', 40, 'Porcelain Tile', 'Wall or floor tile allowance.', 'Tile supplier quote required', 'sqm', 14::numeric, 950::numeric, 300::numeric, 'Tile Flooring', 'floor-finishes-tile-flooring', 'Template allowance', '2026-05-22'),
    ('roof-deck-lounge', 'roof-lounge-area', 'roof-lounge-set', 10, 'Outdoor Lounge Set', 'Weather-resistant outdoor lounge set allowance.', 'Outdoor Living PH', 'set', 1::numeric, 76000::numeric, 4200::numeric, 'Outdoor', 'landscape-outdoor-furniture', 'Template allowance', '2026-05-22'),
    ('roof-deck-lounge', 'roof-toilet-area', 'roof-toilet-wc', 10, 'HCG One-Piece WC', 'One-piece water closet allowance.', 'Wilcon Depot / HCG dealers', 'pc', 1::numeric, 14200::numeric, 1500::numeric, 'Plumbing Fixtures', 'plumbing-fixtures', 'Template allowance', '2026-05-22'),
    ('roof-deck-lounge', 'roof-toilet-area', 'roof-toilet-floor-drain', 20, 'Stainless Floor Drain', 'Stainless bathroom floor drain allowance.', 'Wilcon Depot', 'pc', 1::numeric, 1250::numeric, 250::numeric, 'Plumbing Fixtures', 'plumbing-fixtures', 'Template allowance', '2026-05-22')
)
insert into public.estimate_template_row_items (
  id,
  template_id,
  template_node_id,
  sort_order,
  source_snapshot,
  material,
  description,
  supplier,
  unit,
  quantity,
  unit_cost,
  misc_cost,
  link_state,
  metadata
)
select
  public.estimate_template_seed_uuid(workspace.id, 'template-row:' || seed.row_key),
  public.estimate_template_seed_uuid(workspace.id, 'template:' || seed.template_key),
  public.estimate_template_seed_uuid(workspace.id, 'template-node:' || seed.node_key),
  seed.sort_order,
  jsonb_build_object(
    'source', 'library',
    'category', seed.category,
    'categoryNodeId', seed.category_node_key,
    'currency', 'PHP',
    'pricingSource', seed.pricing_source,
    'pricingDate', seed.pricing_date
  ),
  seed.material,
  seed.description,
  seed.supplier,
  seed.unit,
  seed.quantity,
  seed.unit_cost,
  seed.misc_cost,
  'unlinked',
  jsonb_build_object('seeded', true, 'seedVersion', '2026-05-22-component-library-templates', 'sourceKey', seed.row_key, 'source', 'library')
from public.workspaces workspace
cross join seed_rows seed
on conflict (id) do update
  set sort_order = excluded.sort_order,
      source_snapshot = excluded.source_snapshot,
      material = excluded.material,
      description = excluded.description,
      supplier = excluded.supplier,
      unit = excluded.unit,
      quantity = excluded.quantity,
      unit_cost = excluded.unit_cost,
      misc_cost = excluded.misc_cost,
      link_state = excluded.link_state,
      metadata = public.estimate_template_row_items.metadata || excluded.metadata;

-- The seed upserts fire deferrable hierarchy triggers. Force them to run before
-- the RLS ALTER TABLE statements below, because Postgres rejects ALTER TABLE
-- while pending trigger events exist in the same migration transaction.
set constraints all immediate;

alter table public.estimate_templates enable row level security;
alter table public.estimate_template_nodes enable row level security;
alter table public.estimate_template_row_items enable row level security;

drop policy if exists "members can manage estimate templates" on public.estimate_templates;
drop policy if exists "members can manage estimate template nodes" on public.estimate_template_nodes;
drop policy if exists "members can manage estimate template row items" on public.estimate_template_row_items;

create policy "members can manage estimate templates" on public.estimate_templates
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members can manage estimate template nodes" on public.estimate_template_nodes
  for all to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_nodes.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  );

create policy "members can manage estimate template row items" on public.estimate_template_row_items
  for all to authenticated
  using (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.estimate_templates template
      where template.id = estimate_template_row_items.template_id
        and public.is_workspace_member(template.workspace_id)
    )
  );

revoke all on public.estimate_templates from public;
revoke all on public.estimate_template_nodes from public;
revoke all on public.estimate_template_row_items from public;

grant select, insert, update, delete on public.estimate_templates to authenticated;
grant select, insert, update, delete on public.estimate_template_nodes to authenticated;
grant select, insert, update, delete on public.estimate_template_row_items to authenticated;

revoke execute on function public.validate_estimate_template_tree(uuid) from public;
revoke execute on function public.enforce_estimate_template_node_tree() from public;
revoke execute on function public.enforce_estimate_template_row_item_area_node() from public;
revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public;
revoke execute on function public.estimate_template_seed_uuid(uuid, text) from public;
revoke execute on function public.enforce_estimate_template_node_tree() from anon, authenticated;
revoke execute on function public.enforce_estimate_template_row_item_area_node() from anon, authenticated;
grant execute on function public.validate_estimate_template_tree(uuid) to authenticated;
grant execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) to authenticated;
