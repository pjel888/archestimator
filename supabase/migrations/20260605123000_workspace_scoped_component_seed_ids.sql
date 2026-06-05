-- Repair the component-library taxonomy seed so each workspace receives its own
-- deterministic seed component IDs instead of competing for global fixture UUIDs.

create or replace function public.component_library_seed_uuid(target_workspace_id uuid, source_key text)
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
  from (select md5(target_workspace_id::text || ':component-library:' || source_key) as hash) seed;
$$;

with legacy_seed_items as (
  select distinct on (legacy.metadata->>'sourceFixtureId')
    legacy.*
  from public.cost_library_items legacy
  where legacy.metadata->>'seedVersion' = '2026-05-22-component-library-taxonomy-source'
    and nullif(legacy.metadata->>'sourceFixtureId', '') is not null
  order by legacy.metadata->>'sourceFixtureId', legacy.created_at asc
),
workspace_seed_items as (
  select
    public.component_library_seed_uuid(workspace.id, legacy.metadata->>'sourceFixtureId') as id,
    workspace.id as workspace_id,
    legacy.name,
    legacy.description,
    legacy.category,
    legacy.category_node_id,
    coalesce(supplier.name, legacy.supplier) as supplier,
    supplier.id as supplier_id,
    legacy.unit,
    legacy.unit_cost,
    legacy.misc_cost,
    legacy.pricing_source,
    legacy.pricing_date,
    legacy.confidence,
    legacy.thumbnail_path,
    legacy.metadata || jsonb_build_object('workspaceScopedSeed', true) as metadata
  from public.workspaces workspace
  cross join legacy_seed_items legacy
  left join public.component_suppliers supplier
    on supplier.workspace_id = workspace.id
   and supplier.normalized_name = coalesce(nullif(legacy.metadata->>'supplierKey', ''), 'manual-no-supplier')
)
insert into public.cost_library_items (
  id,
  workspace_id,
  name,
  description,
  category,
  category_node_id,
  supplier,
  supplier_id,
  unit,
  unit_cost,
  misc_cost,
  pricing_source,
  pricing_date,
  confidence,
  thumbnail_path,
  metadata
)
select
  id,
  workspace_id,
  name,
  description,
  category,
  category_node_id,
  supplier,
  supplier_id,
  unit,
  unit_cost,
  misc_cost,
  pricing_source,
  pricing_date,
  confidence,
  thumbnail_path,
  metadata
from workspace_seed_items
on conflict (id) do update
  set workspace_id = excluded.workspace_id,
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      category_node_id = excluded.category_node_id,
      supplier = excluded.supplier,
      supplier_id = excluded.supplier_id,
      unit = excluded.unit,
      unit_cost = excluded.unit_cost,
      misc_cost = excluded.misc_cost,
      pricing_source = excluded.pricing_source,
      pricing_date = excluded.pricing_date,
      confidence = excluded.confidence,
      thumbnail_path = excluded.thumbnail_path,
      metadata = public.cost_library_items.metadata || excluded.metadata,
      updated_at = now();

with relink_targets as (
  select
    row_item.id as row_item_id,
    replacement.id as replacement_item_id
  from public.estimate_row_items row_item
  join public.cost_library_items legacy
    on legacy.id = row_item.source_library_item_id
  join public.estimates estimate
    on estimate.id = row_item.estimate_id
  join public.projects project
    on project.id = estimate.project_id
  join public.cost_library_items replacement
    on replacement.id = public.component_library_seed_uuid(project.workspace_id, legacy.metadata->>'sourceFixtureId')
   and replacement.workspace_id = project.workspace_id
  where legacy.metadata->>'seedVersion' = '2026-05-22-component-library-taxonomy-source'
    and nullif(legacy.metadata->>'sourceFixtureId', '') is not null
    and legacy.id <> replacement.id
)
update public.estimate_row_items row_item
set source_library_item_id = relink_targets.replacement_item_id,
    source_snapshot = jsonb_set(
      coalesce(row_item.source_snapshot, '{}'::jsonb),
      '{sourceLibraryItemId}',
      to_jsonb(relink_targets.replacement_item_id::text),
      true
    ),
    metadata = row_item.metadata || jsonb_build_object('sourceLibraryItemRelinkedAt', '2026-06-05T12:30:00Z'),
    updated_at = now()
from relink_targets
where row_item.id = relink_targets.row_item_id;

update public.cost_library_items legacy
set lifecycle_state = 'archived'::public.component_lifecycle_state,
    lifecycle_state_changed_at = now(),
    metadata = legacy.metadata || jsonb_build_object('replacedByWorkspaceScopedSeedIds', true),
    updated_at = now()
where legacy.metadata->>'seedVersion' = '2026-05-22-component-library-taxonomy-source'
  and nullif(legacy.metadata->>'sourceFixtureId', '') is not null
  and legacy.id <> public.component_library_seed_uuid(legacy.workspace_id, legacy.metadata->>'sourceFixtureId')
  and not exists (
    select 1
    from public.estimate_row_items row_item
    where row_item.source_library_item_id = legacy.id
  )
  and not exists (
    select 1
    from public.estimate_template_row_items template_row_item
    where template_row_item.source_library_item_id = legacy.id
  );

revoke execute on function public.component_library_seed_uuid(uuid, text) from public;
