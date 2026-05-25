-- Normalize component-library brand/supplier shape after separating brands from suppliers.
--
-- Current rule: supplier is the vendor/store/channel; brand is the manufacturer/product brand.
-- Cost-library components must not store composite brand strings such as `Franke/Grohe`,
-- and reference/JSON snapshots should carry the current supplierId/brandId shape.

create temporary table _repair_counts (
  label text primary key,
  affected_rows bigint not null
) on commit drop;

create or replace function public.normalize_component_brand_name(value text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function pg_temp.normalize_library_name(input text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function pg_temp.replace_jsonb_tag_value(doc jsonb, old_value text, new_value text)
returns jsonb
language plpgsql
as $$
declare
  repaired_tags jsonb;
begin
  if doc is null then
    return '{}'::jsonb;
  end if;

  if old_value is null
     or new_value is null
     or not (doc ? 'tags')
     or jsonb_typeof(doc->'tags') <> 'array' then
    return doc;
  end if;

  select jsonb_agg(
           case
             when jsonb_typeof(tag_value) = 'string' and tag_value #>> '{}' = old_value then to_jsonb(new_value)
             else tag_value
           end
           order by ordinality
         )
    into repaired_tags
  from jsonb_array_elements(doc->'tags') with ordinality as tags(tag_value, ordinality);

  return jsonb_set(doc, '{tags}', coalesce(repaired_tags, '[]'::jsonb), true);
end;
$$;

with updated as (
  update public.cost_library_items
     set name = 'Laundry utility sink and faucet set allowance',
         description = 'Premium laundry utility sink and faucet allowance; brand-neutral until exact sink and faucet brands are quoted.',
         brand = null,
         brand_id = null,
         pricing_source = 'Wilcon Depot laundry utility fixture allowance',
         metadata = jsonb_set(
                      coalesce(metadata, '{}'::jsonb),
                      '{imageSearchQuery}',
                      to_jsonb('Laundry utility sink faucet set Plumbing Fixtures product thumbnail'::text),
                      true
                    ) || jsonb_build_object(
                      'dataRepairOneBrandPerComponent', true,
                      'dataRepairBrandSupplierShapeAt', now(),
                      'brandPolicy', 'brand-neutral bundled allowance; do not store composite brand strings'
                    ),
         updated_at = now()
   where id = '9f1b5fab-096b-4f3c-b963-98542df6b0b5'
     and (brand = 'Franke/Grohe' or coalesce(brand, '') ~ '/')
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'cost_library_items_composite_brand_cleared', count(*) from updated;

with updated as (
  update public.cost_library_item_price_options
     set pricing_source = 'Wilcon Depot laundry utility fixture allowance',
         notes = 'Brand-neutral laundry utility sink and faucet allowance. Verify exact brands and live supplier quote before issuing.',
         variant_description = 'Brand-neutral laundry utility sink and faucet set allowance',
         sku = 'LEWIS-ES002_LAUNDRY_UTILITY_FIXTURE_SET',
         updated_at = now()
   where item_id = '9f1b5fab-096b-4f3c-b963-98542df6b0b5'
     and (
       pricing_source is distinct from 'Wilcon Depot laundry utility fixture allowance'
       or notes is distinct from 'Brand-neutral laundry utility sink and faucet allowance. Verify exact brands and live supplier quote before issuing.'
       or variant_description is distinct from 'Brand-neutral laundry utility sink and faucet set allowance'
       or sku is distinct from 'LEWIS-ES002_LAUNDRY_UTILITY_FIXTURE_SET'
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'price_options_composite_brand_text_removed', count(*) from updated;

with updated as (
  update public.cost_library_item_variant_cost_entries
     set pricing_source = 'Wilcon Depot laundry utility fixture allowance',
         notes = 'Brand-neutral laundry utility sink and faucet allowance. Verify exact brands and live supplier quote before issuing.',
         updated_at = now()
   where item_id = '9f1b5fab-096b-4f3c-b963-98542df6b0b5'
     and (
       pricing_source is distinct from 'Wilcon Depot laundry utility fixture allowance'
       or notes is distinct from 'Brand-neutral laundry utility sink and faucet allowance. Verify exact brands and live supplier quote before issuing.'
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_cost_entries_composite_brand_text_removed', count(*) from updated;

with updated as (
  update public.component_brands
     set normalized_name = pg_temp.normalize_library_name(name),
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('dataRepairBrandSupplierShapeAt', now())
   where normalized_name is distinct from pg_temp.normalize_library_name(name)
      or (name is not null and normalized_name is null)
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'component_brands_normalized_name_repaired_final', count(*) from updated;

with updated as (
  update public.component_suppliers
     set normalized_name = pg_temp.normalize_library_name(name),
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('dataRepairBrandSupplierShapeAt', now())
   where normalized_name is distinct from pg_temp.normalize_library_name(name)
      or (name is not null and normalized_name is null)
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'component_suppliers_normalized_name_repaired_final', count(*) from updated;

create temporary table _current_library_items as
select id,
       workspace_id,
       name,
       description,
       category,
       category_node_id,
       supplier,
       supplier_id,
       brand,
       brand_id,
       unit,
       unit_cost,
       misc_cost,
       pricing_source,
       pricing_date,
       confidence,
       metadata
from public.cost_library_items;

with updated as (
  update public.cost_library_item_versions v
     set snapshot = pg_temp.replace_jsonb_tag_value(
                      coalesce(v.snapshot, '{}'::jsonb) || jsonb_build_object(
                        'name', i.name,
                        'description', i.description,
                        'category', i.category,
                        'categoryNodeId', i.category_node_id,
                        'supplier', i.supplier,
                        'supplierId', i.supplier_id,
                        'brand', i.brand,
                        'brandId', i.brand_id,
                        'unit', i.unit,
                        'unit_cost', i.unit_cost,
                        'misc_cost', i.misc_cost,
                        'pricingSource', i.pricing_source,
                        'pricingDate', i.pricing_date,
                        'confidence', i.confidence,
                        'sourceLibraryItemId', i.id,
                        'dataRepairBrandSupplierShapeAt', now()
                      ),
                      v.snapshot->>'supplier',
                      i.supplier
                    )
    from _current_library_items i
   where i.id = v.item_id
     and v.version_number = (select cli.current_version_number from public.cost_library_items cli where cli.id = v.item_id)
     and (
       (i.supplier is not null and coalesce(v.snapshot->>'supplierId', '') <> i.supplier_id::text)
       or (i.supplier is not null and coalesce(v.snapshot->>'supplier', '') <> i.supplier)
       or (i.brand is not null and coalesce(v.snapshot->>'brandId', '') <> i.brand_id::text)
       or (i.brand is not null and coalesce(v.snapshot->>'brand', '') <> i.brand)
       or coalesce(v.snapshot->>'supplier', '') ~ '/'
       or coalesce(v.snapshot->>'brand', '') ~ '/'
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'current_library_version_snapshots_repaired', count(*) from updated;

with updated as (
  update public.cost_library_item_price_history ph
     set new_snapshot = pg_temp.replace_jsonb_tag_value(
                          coalesce(ph.new_snapshot, '{}'::jsonb) || jsonb_build_object(
                            'name', i.name,
                            'description', i.description,
                            'category', i.category,
                            'categoryNodeId', i.category_node_id,
                            'supplier', i.supplier,
                            'supplierId', i.supplier_id,
                            'brand', i.brand,
                            'brandId', i.brand_id,
                            'unit', i.unit,
                            'unit_cost', i.unit_cost,
                            'misc_cost', i.misc_cost,
                            'pricingSource', i.pricing_source,
                            'pricingDate', i.pricing_date,
                            'confidence', i.confidence,
                            'sourceLibraryItemId', i.id,
                            'dataRepairBrandSupplierShapeAt', now()
                          ),
                          ph.new_snapshot->>'supplier',
                          i.supplier
                        )
    from _current_library_items i
   where i.id = ph.item_id
     and (
       (i.supplier is not null and coalesce(ph.new_snapshot->>'supplierId', '') <> i.supplier_id::text)
       or (i.supplier is not null and coalesce(ph.new_snapshot->>'supplier', '') <> i.supplier)
       or (i.brand is not null and coalesce(ph.new_snapshot->>'brandId', '') <> i.brand_id::text)
       or (i.brand is not null and coalesce(ph.new_snapshot->>'brand', '') <> i.brand)
       or coalesce(ph.new_snapshot->>'supplier', '') ~ '/'
       or coalesce(ph.new_snapshot->>'brand', '') ~ '/'
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'price_history_new_snapshots_repaired', count(*) from updated;

create temporary table _estimate_row_source_targets as
select eri.id as row_id,
       i.id as item_id,
       coalesce(eri.source_snapshot->>'supplier', eri.supplier) as old_supplier_text,
       (
         eri.link_state = 'linked-clean'
         or coalesce(eri.supplier, '') ~ '/'
         or eri.supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
       ) as should_update_visible_supplier,
       eri.link_state = 'linked-clean' as should_refresh_visible_row
from public.estimate_row_items eri
join _current_library_items i
  on i.id = coalesce(
    eri.source_library_item_id,
    case
      when eri.metadata->>'sourceComponentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (eri.metadata->>'sourceComponentId')::uuid
    end,
    case
      when eri.source_snapshot->>'sourceLibraryItemId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (eri.source_snapshot->>'sourceLibraryItemId')::uuid
    end,
    case
      when eri.source_snapshot->>'imageSyncedFromLibraryItemId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (eri.source_snapshot->>'imageSyncedFromLibraryItemId')::uuid
    end
  )
where eri.source_snapshot is not null
  and (
    (i.supplier is not null and coalesce(eri.source_snapshot->>'supplierId', '') <> i.supplier_id::text)
    or (i.supplier is not null and coalesce(eri.source_snapshot->>'supplier', '') <> i.supplier)
    or (i.brand is not null and coalesce(eri.source_snapshot->>'brandId', '') <> i.brand_id::text)
    or (i.brand is not null and coalesce(eri.source_snapshot->>'brand', '') <> i.brand)
    or coalesce(eri.source_snapshot->>'supplier', '') ~ '/'
    or coalesce(eri.source_snapshot->>'brand', '') ~ '/'
    or coalesce(eri.supplier, '') ~ '/'
    or eri.supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
    or (eri.link_state = 'linked-clean' and (eri.supplier is distinct from i.supplier or eri.supplier_id is distinct from i.supplier_id))
  );

with updated as (
  update public.estimate_row_items eri
     set supplier = case when t.should_update_visible_supplier then i.supplier else eri.supplier end,
         supplier_id = case when t.should_update_visible_supplier then i.supplier_id else eri.supplier_id end,
         material = case when t.should_refresh_visible_row then i.name else eri.material end,
         description = case when t.should_refresh_visible_row then i.description else eri.description end,
         unit = case when t.should_refresh_visible_row then i.unit else eri.unit end,
         unit_cost = case when t.should_refresh_visible_row then i.unit_cost else eri.unit_cost end,
         misc_cost = case when t.should_refresh_visible_row then i.misc_cost else eri.misc_cost end,
         source_snapshot = pg_temp.replace_jsonb_tag_value(
                             coalesce(eri.source_snapshot, '{}'::jsonb) || jsonb_build_object(
                               'name', i.name,
                               'description', i.description,
                               'category', i.category,
                               'categoryNodeId', i.category_node_id,
                               'supplier', i.supplier,
                               'supplierId', i.supplier_id,
                               'brand', i.brand,
                               'brandId', i.brand_id,
                               'unit', i.unit,
                               'unit_cost', i.unit_cost,
                               'misc_cost', i.misc_cost,
                               'pricingSource', i.pricing_source,
                               'pricingDate', i.pricing_date,
                               'confidence', i.confidence,
                               'sourceLibraryItemId', i.id,
                               'dataRepairBrandSupplierShapeAt', now()
                             ),
                             t.old_supplier_text,
                             i.supplier
                           ),
         metadata = pg_temp.replace_jsonb_tag_value(
                      coalesce(eri.metadata, '{}'::jsonb) || jsonb_build_object(
                        'supplierId', i.supplier_id,
                        'sourceComponentId', i.id,
                        'dataRepairBrandSupplierShapeAt', now()
                      ),
                      t.old_supplier_text,
                      i.supplier
                    ),
         row_revision = coalesce(eri.row_revision, 0) + 1,
         updated_at = now()
    from _estimate_row_source_targets t
    join _current_library_items i on i.id = t.item_id
   where eri.id = t.row_id
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'estimate_row_source_snapshots_repaired', count(*) from updated;

create temporary table _template_row_source_targets as
select tri.id as row_id,
       i.id as item_id,
       coalesce(tri.source_snapshot->>'supplier', tri.supplier) as old_supplier_text,
       (tri.link_state = 'linked-clean' or coalesce(tri.supplier, '') ~ '/' or tri.supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')) as should_update_visible_supplier,
       tri.link_state = 'linked-clean' as should_refresh_visible_row
from public.estimate_template_row_items tri
join _current_library_items i
  on i.id = coalesce(
    tri.source_library_item_id,
    case
      when tri.source_snapshot->>'sourceLibraryItemId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (tri.source_snapshot->>'sourceLibraryItemId')::uuid
    end
  )
where tri.source_snapshot is not null
  and (
    (i.supplier is not null and coalesce(tri.source_snapshot->>'supplierId', '') <> i.supplier_id::text)
    or (i.supplier is not null and coalesce(tri.source_snapshot->>'supplier', '') <> i.supplier)
    or (i.brand is not null and coalesce(tri.source_snapshot->>'brandId', '') <> i.brand_id::text)
    or (i.brand is not null and coalesce(tri.source_snapshot->>'brand', '') <> i.brand)
    or coalesce(tri.source_snapshot->>'supplier', '') ~ '/'
    or coalesce(tri.source_snapshot->>'brand', '') ~ '/'
    or coalesce(tri.supplier, '') ~ '/'
    or tri.supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
    or (tri.link_state = 'linked-clean' and (tri.supplier is distinct from i.supplier or tri.supplier_id is distinct from i.supplier_id))
  );

with updated as (
  update public.estimate_template_row_items tri
     set supplier = case when t.should_update_visible_supplier then i.supplier else tri.supplier end,
         supplier_id = case when t.should_update_visible_supplier then i.supplier_id else tri.supplier_id end,
         material = case when t.should_refresh_visible_row then i.name else tri.material end,
         description = case when t.should_refresh_visible_row then i.description else tri.description end,
         unit = case when t.should_refresh_visible_row then i.unit else tri.unit end,
         unit_cost = case when t.should_refresh_visible_row then i.unit_cost else tri.unit_cost end,
         misc_cost = case when t.should_refresh_visible_row then i.misc_cost else tri.misc_cost end,
         source_snapshot = pg_temp.replace_jsonb_tag_value(
                             coalesce(tri.source_snapshot, '{}'::jsonb) || jsonb_build_object(
                               'name', i.name,
                               'description', i.description,
                               'category', i.category,
                               'categoryNodeId', i.category_node_id,
                               'supplier', i.supplier,
                               'supplierId', i.supplier_id,
                               'brand', i.brand,
                               'brandId', i.brand_id,
                               'unit', i.unit,
                               'unit_cost', i.unit_cost,
                               'misc_cost', i.misc_cost,
                               'pricingSource', i.pricing_source,
                               'pricingDate', i.pricing_date,
                               'confidence', i.confidence,
                               'sourceLibraryItemId', i.id,
                               'dataRepairBrandSupplierShapeAt', now()
                             ),
                             t.old_supplier_text,
                             i.supplier
                           ),
         metadata = pg_temp.replace_jsonb_tag_value(
                      coalesce(tri.metadata, '{}'::jsonb) || jsonb_build_object(
                        'supplierId', i.supplier_id,
                        'sourceComponentId', i.id,
                        'dataRepairBrandSupplierShapeAt', now()
                      ),
                      t.old_supplier_text,
                      i.supplier
                    ),
         updated_at = now()
    from _template_row_source_targets t
    join _current_library_items i on i.id = t.item_id
   where tri.id = t.row_id
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'template_row_source_snapshots_repaired', count(*) from updated;

do $$
declare
  remaining_refs bigint;
begin
  select count(*) into remaining_refs
  from (
    select i.supplier_id as id from public.cost_library_items i join public.component_suppliers s on s.id = i.supplier_id where coalesce(s.name, '') ~ '/'
    union all
    select po.supplier_id from public.cost_library_item_price_options po join public.component_suppliers s on s.id = po.supplier_id where coalesce(s.name, '') ~ '/'
    union all
    select eri.supplier_id from public.estimate_row_items eri join public.component_suppliers s on s.id = eri.supplier_id where coalesce(s.name, '') ~ '/'
    union all
    select tri.supplier_id from public.estimate_template_row_items tri join public.component_suppliers s on s.id = tri.supplier_id where coalesce(s.name, '') ~ '/'
  ) refs;

  if remaining_refs <> 0 then
    raise exception 'Composite supplier rows still have % FK references; refusing to delete.', remaining_refs;
  end if;
end $$;

with deleted as (
  delete from public.component_suppliers
   where coalesce(name, '') ~ '/'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'legacy_composite_supplier_rows_deleted', count(*) from deleted;

with deleted as (
  delete from public.component_brands
   where coalesce(name, '') ~ '/'
     and not exists (
       select 1 from public.cost_library_items i where i.brand_id = component_brands.id
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'legacy_composite_brand_rows_deleted', count(*) from deleted;

do $$
declare
  duplicate_supplier_norms bigint;
  duplicate_brand_norms bigint;
  bad_library_rows bigint;
  bad_refs bigint;
  bad_current_versions bigint;
  bad_estimate_snapshots bigint;
  bad_price_history bigint;
begin
  select count(*) into duplicate_supplier_norms
  from (
    select workspace_id, normalized_name
    from public.component_suppliers
    where normalized_name is not null
    group by workspace_id, normalized_name
    having count(*) > 1
  ) d;

  select count(*) into duplicate_brand_norms
  from (
    select workspace_id, normalized_name
    from public.component_brands
    where normalized_name is not null
    group by workspace_id, normalized_name
    having count(*) > 1
  ) d;

  select count(*) into bad_library_rows
  from public.cost_library_items i
  where coalesce(i.brand, '') ~ '/'
     or coalesce(i.supplier, '') ~ '/'
     or exists (select 1 from public.component_suppliers s where s.id = i.supplier_id and coalesce(s.name, '') ~ '/')
     or exists (select 1 from public.component_brands b where b.id = i.brand_id and coalesce(b.name, '') ~ '/')
     or (i.brand is not null and i.brand_id is null)
     or (i.supplier is not null and i.supplier_id is null);

  select count(*) into bad_refs
  from (
    select supplier_id as id from public.cost_library_item_price_options where supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
    union all
    select supplier_id from public.estimate_row_items where supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
    union all
    select supplier_id from public.estimate_template_row_items where supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
  ) refs;

  select count(*) into bad_current_versions
  from public.cost_library_item_versions v
  join public.cost_library_items i on i.id = v.item_id and i.current_version_number = v.version_number
  where (i.supplier is not null and coalesce(v.snapshot->>'supplierId', '') <> i.supplier_id::text)
     or (i.supplier is not null and coalesce(v.snapshot->>'supplier', '') <> i.supplier)
     or (i.brand is not null and coalesce(v.snapshot->>'brandId', '') <> i.brand_id::text)
     or (i.brand is not null and coalesce(v.snapshot->>'brand', '') <> i.brand)
     or coalesce(v.snapshot->>'supplier', '') ~ '/'
     or coalesce(v.snapshot->>'brand', '') ~ '/';

  select count(*) into bad_estimate_snapshots
  from public.estimate_row_items eri
  join public.cost_library_items i on i.id = coalesce(
    eri.source_library_item_id,
    case
      when eri.metadata->>'sourceComponentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (eri.metadata->>'sourceComponentId')::uuid
    end
  )
  where eri.source_snapshot is not null
    and (
      (i.supplier is not null and coalesce(eri.source_snapshot->>'supplierId', '') <> i.supplier_id::text)
      or (i.supplier is not null and coalesce(eri.source_snapshot->>'supplier', '') <> i.supplier)
      or (i.brand is not null and coalesce(eri.source_snapshot->>'brandId', '') <> i.brand_id::text)
      or (i.brand is not null and coalesce(eri.source_snapshot->>'brand', '') <> i.brand)
      or coalesce(eri.source_snapshot->>'supplier', '') ~ '/'
      or coalesce(eri.source_snapshot->>'brand', '') ~ '/'
      or coalesce(eri.supplier, '') ~ '/'
      or eri.supplier_id in (select id from public.component_suppliers where coalesce(name, '') ~ '/')
    );

  select count(*) into bad_price_history
  from public.cost_library_item_price_history ph
  join public.cost_library_items i on i.id = ph.item_id
  where (i.supplier is not null and coalesce(ph.new_snapshot->>'supplierId', '') <> i.supplier_id::text)
     or (i.supplier is not null and coalesce(ph.new_snapshot->>'supplier', '') <> i.supplier)
     or (i.brand is not null and coalesce(ph.new_snapshot->>'brandId', '') <> i.brand_id::text)
     or (i.brand is not null and coalesce(ph.new_snapshot->>'brand', '') <> i.brand)
     or coalesce(ph.new_snapshot->>'supplier', '') ~ '/'
     or coalesce(ph.new_snapshot->>'brand', '') ~ '/';

  if duplicate_supplier_norms <> 0 then
    raise exception 'Duplicate supplier normalized names after repair: %', duplicate_supplier_norms;
  end if;
  if duplicate_brand_norms <> 0 then
    raise exception 'Duplicate brand normalized names after repair: %', duplicate_brand_norms;
  end if;
  if bad_library_rows <> 0 then
    raise exception 'Bad cost library brand/supplier rows after repair: %', bad_library_rows;
  end if;
  if bad_refs <> 0 then
    raise exception 'Composite supplier references remain after repair: %', bad_refs;
  end if;
  if bad_current_versions <> 0 then
    raise exception 'Current library version snapshots still drift after repair: %', bad_current_versions;
  end if;
  if bad_estimate_snapshots <> 0 then
    raise exception 'Estimate source snapshots still drift after repair: %', bad_estimate_snapshots;
  end if;
  if bad_price_history <> 0 then
    raise exception 'Price history new snapshots still drift after repair: %', bad_price_history;
  end if;
end $$;



-- Some seeded estimate templates are not linked to a source library item but
-- still carried legacy combined supplier/brand text in their visible supplier
-- column. Keep them supplier-only and attach the canonical Wilcon supplier ref.
with wilcon as (
  select id from public.component_suppliers where name = 'Wilcon Depot' limit 1
)
update public.estimate_template_row_items tri
   set supplier = 'Wilcon Depot',
       supplier_id = (select id from wilcon),
       source_snapshot = coalesce(tri.source_snapshot, '{}'::jsonb) || jsonb_build_object(
         'supplier', 'Wilcon Depot',
         'supplierId', (select id from wilcon),
         'dataRepairBrandSupplierShapeAt', now()
       ),
       metadata = coalesce(tri.metadata, '{}'::jsonb) || jsonb_build_object(
         'supplierId', (select id from wilcon),
         'dataRepairBrandSupplierShapeAt', now()
       ),
       updated_at = now()
 where coalesce(tri.supplier, '') ~ '/'
   and (select id from wilcon) is not null;

do $$
declare
  bad_template_rows bigint;
begin
  select count(*) into bad_template_rows
  from public.estimate_template_row_items tri
  where coalesce(tri.supplier, '') ~ '/'
     or coalesce(tri.source_snapshot->>'supplier', '') ~ '/'
     or coalesce(tri.source_snapshot->>'brand', '') ~ '/';

  if bad_template_rows <> 0 then
    raise exception 'Estimate template rows still contain composite brand/supplier text after repair: %', bad_template_rows;
  end if;
end $$;
