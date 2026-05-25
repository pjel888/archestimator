-- Clean up current component-library seed/demo rows after brand separation.
--
-- Rules:
-- - Component identity names should be product/material names, not brand-prefixed labels.
-- - "Allowance" belongs in notes/pricing context, not the component name.
-- - Current category/categoryNodeId metadata should match the product form.
-- - Single-option variant labels should be concise; old quote/pricing text is preserved in notes/metadata.

create temporary table _repair_counts (
  label text primary key,
  affected_rows bigint not null
) on commit drop;

create temporary table _category_paths on commit drop as
with recursive paths as (
  select id,
         parent_id,
         label,
         array[label]::text[] as path_labels
    from public.component_category_nodes
   where parent_id is null

  union all

  select child.id,
         child.parent_id,
         child.label,
         parent.path_labels || child.label
    from public.component_category_nodes child
    join paths parent on parent.id = child.parent_id
)
select id, label, path_labels
from paths;

create temporary table _component_cleanup_targets on commit drop as
with brand_basis as (
  select item.id,
         item.name,
         item.category,
         item.category_node_id,
         item.metadata,
         coalesce(nullif(trim(item.brand), ''), brand.name) as brand_name
    from public.cost_library_items item
    left join public.component_brands brand on brand.id = item.brand_id
),
cleaned_names as (
  select basis.*,
         nullif(
           btrim(
             regexp_replace(
               regexp_replace(
                 case
                   when basis.name ~* '^Smoke Component [0-9]+$'
                     then 'Smoke Curtain System'
                   when basis.brand_name = 'ABC Phil.' and basis.name ilike 'ABC %'
                     then substring(basis.name from 5)
                   when basis.brand_name is not null and lower(basis.name) like lower(basis.brand_name) || '%'
                     then substring(basis.name from char_length(basis.brand_name) + 1)
                   else basis.name
                 end,
                 '^[[:space:][:punct:]]+',
                 '',
                 'g'
               ),
               '\s+allowance$',
               '',
               'i'
             )
           ),
           ''
         ) as stripped_name
    from brand_basis basis
),
normalized as (
  select cleaned.*,
         case
           when stripped_name is null then cleaned.name
           when stripped_name ~ '^[[:alpha:]]'
             then upper(left(stripped_name, 1)) || substring(stripped_name from 2)
           else stripped_name
         end as proposed_name
    from cleaned_names cleaned
),
category_rules as (
  select normalized.*,
         case
           when lower(proposed_name) ~ 'smoke curtain|smoke control'
             then 'life-safety-emergency-equipment'
           when lower(proposed_name) ~ 'water closet|toilet'
             then 'fixtures-sanitary-fixtures'
           when lower(proposed_name) ~ 'kitchen.*(sink|faucet|tap)|undermount kitchen sink|service sink|single bowl stainless kitchen sink|stainless steel kitchen sink'
             then 'fixtures-kitchen-fixtures'
           when lower(proposed_name) ~ 'laundry.*sink|utility sink|wall faucet|angle valve|braided hose'
             then 'fixtures-plumbing-fixtures'
           when lower(proposed_name) ~ 'shower|basin mixer|basin faucet|lavatory faucet|rain shower'
             then 'fixtures-bath-fixtures'
           when lower(proposed_name) ~ 'lavatory|basin'
             then 'fixtures-sanitary-fixtures'
           when lower(proposed_name) ~ 'vanity cabinet'
             then 'casework-vanities'
           when lower(proposed_name) ~ 'wardrobe|closet system|bedroom closet|walk-in closet'
             then 'casework-closets'
           when lower(proposed_name) ~ 'loveseat|sofa|sectional'
             then 'furniture-sofas'
           when lower(proposed_name) ~ 'bedside table|nightstand'
             then 'furniture-nightstands'
           when lower(proposed_name) ~ 'coffee table|nesting table|side and coffee'
             then 'furniture-coffee-tables'
           when lower(proposed_name) ~ 'dining chair'
             then 'furniture-dining-chairs'
           when lower(proposed_name) ~ 'dining table|dining set|8-seat|8-seater'
             then 'furniture-dining-tables'
           when lower(proposed_name) ~ 'carpet'
             then 'floor-finishes-carpet'
           when lower(proposed_name) ~ 'vinyl floor|vinyl roll'
             then 'floor-finishes-vinyl-flooring'
           when lower(proposed_name) ~ 'skimcoat|wall filler|putty'
             then 'paint-putty'
           else null
         end as proposed_category_node_id
    from normalized
)
select rules.id,
       rules.name as old_name,
       rules.category as old_category,
       rules.category_node_id as old_category_node_id,
       rules.proposed_name,
       coalesce(rules.proposed_category_node_id, rules.category_node_id) as proposed_category_node_id,
       coalesce(path.label, rules.category) as proposed_category,
       path.path_labels as proposed_category_path
  from category_rules rules
  left join _category_paths path on path.id = coalesce(rules.proposed_category_node_id, rules.category_node_id)
 where rules.proposed_name is distinct from rules.name
    or (
      rules.proposed_category_node_id is not null
      and rules.proposed_category_node_id is distinct from rules.category_node_id
    );

create temporary table _updated_component_items on commit drop as
with updated as (
  update public.cost_library_items item
     set name = target.proposed_name,
         category = target.proposed_category,
         category_node_id = target.proposed_category_node_id,
         description = case
           when item.name ~* '^Smoke Component [0-9]+$'
             then 'Smoke control curtain/system allowance priced per square meter; verify exact code-compliant product before issue.'
           else item.description
         end,
         metadata = coalesce(item.metadata, '{}'::jsonb)
                    || jsonb_build_object('dataRepairNameCategoryVariantCleanupAt', now())
                    || case
                         when item.name is distinct from target.proposed_name
                              and not (coalesce(item.metadata, '{}'::jsonb) ? 'dataRepairNameCategoryVariantPreviousName')
                           then jsonb_build_object('dataRepairNameCategoryVariantPreviousName', item.name)
                         else '{}'::jsonb
                       end
                    || case
                         when item.category_node_id is distinct from target.proposed_category_node_id
                              and not (coalesce(item.metadata, '{}'::jsonb) ? 'dataRepairNameCategoryVariantPreviousCategoryNodeId')
                           then jsonb_build_object(
                             'dataRepairNameCategoryVariantPreviousCategoryNodeId', item.category_node_id,
                             'dataRepairNameCategoryVariantPreviousCategory', item.category
                           )
                         else '{}'::jsonb
                       end
                    || jsonb_strip_nulls(jsonb_build_object(
                         'categoryNodeId', target.proposed_category_node_id,
                         'categoryPath', to_jsonb(target.proposed_category_path)
                       )),
         updated_at = now()
    from _component_cleanup_targets target
   where item.id = target.id
     and (
       item.name is distinct from target.proposed_name
       or item.category is distinct from target.proposed_category
       or item.category_node_id is distinct from target.proposed_category_node_id
       or (
         item.name ~* '^Smoke Component [0-9]+$'
         and item.description is distinct from 'Smoke control curtain/system allowance priced per square meter; verify exact code-compliant product before issue.'
       )
     )
   returning item.id,
             target.old_name,
             item.name as new_name,
             target.old_category,
             item.category as new_category,
             target.old_category_node_id,
             item.category_node_id as new_category_node_id
)
select * from updated;

insert into _repair_counts(label, affected_rows)
select 'cost_library_item_names_categories_cleaned', count(*)
from _updated_component_items;

with option_counts as (
  select item_id, count(*) as option_count
    from public.cost_library_item_price_options
   group by item_id
),
updated as (
  update public.cost_library_item_price_options option
     set label = 'Standard',
         notes = btrim(concat_ws(
           E'\n',
           nullif(option.notes, ''),
           case
             when not (coalesce(option.variant_metadata, '{}'::jsonb) ? 'dataRepairPreviousVariantLabel')
               then 'Previous variant label: ' || option.label
             else null
           end
         )),
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object(
                              'dataRepairNameCategoryVariantCleanupAt', now(),
                              'dataRepairPreviousVariantLabel', coalesce(
                                option.variant_metadata->>'dataRepairPreviousVariantLabel',
                                option.label
                              )
                            ),
         updated_at = now()
    from option_counts counts
   where counts.item_id = option.item_id
     and counts.option_count = 1
     and option.label is distinct from 'Standard'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'single_variant_labels_normalized', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set package_quantity = kg.parts[1]::numeric,
         package_unit = 'kg',
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairPackageSource', 'name:kg', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(item.name, '([0-9]+(?:\.[0-9]+)?)\s*kg', 'i') as kg(parts)
   where option.item_id = item.id
     and option.package_quantity is null
     and option.package_unit is null
     and item.name ~* '([0-9]+(?:\.[0-9]+)?)\s*kg'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_package_kg_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set package_quantity = liters.parts[1]::numeric,
         package_unit = 'L',
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairPackageSource', 'name:liters', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(item.name, '([0-9]+(?:\.[0-9]+)?)\s*L([^[:alpha:]]|$)') as liters(parts)
   where option.item_id = item.id
     and option.package_quantity is null
     and option.package_unit is null
     and item.name ~* '(paint|primer|putty|skimcoat|filler)'
     and item.name ~ '([0-9]+(?:\.[0-9]+)?)\s*L([^[:alpha:]]|$)'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_package_liters_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set package_quantity = meters.parts[1]::numeric,
         package_unit = 'm',
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairPackageSource', 'name:linear-meter-roll', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(item.name, '([0-9]+(?:\.[0-9]+)?)\s*m\s+roll\b', 'i') as meters(parts)
   where option.item_id = item.id
     and option.package_quantity is null
     and option.package_unit is null
     and item.name ~* '([0-9]+(?:\.[0-9]+)?)\s*m\s+roll\b'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_package_roll_length_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set dimension_length = dims.parts[1]::numeric,
         dimension_width = dims.parts[2]::numeric,
         dimension_height = dims.parts[3]::numeric,
         dimension_unit = dims.parts[4],
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairDimensionSource', 'name-or-description:3d', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(
      coalesce(item.name, '') || ' ' || coalesce(item.description, ''),
      '([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|ft)',
      'i'
    ) as dims(parts)
   where option.item_id = item.id
     and option.dimension_length is null
     and option.dimension_width is null
     and option.dimension_height is null
     and option.dimension_unit is null
     and (
       coalesce(item.name, '') || ' ' || coalesce(item.description, '')
     ) ~* '([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|ft)'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_dimensions_3d_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set dimension_length = dims.parts[1]::numeric,
         dimension_width = dims.parts[2]::numeric,
         dimension_unit = dims.parts[3],
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairDimensionSource', 'name-or-description:2d', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(
      coalesce(item.name, '') || ' ' || coalesce(item.description, ''),
      '([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|ft)',
      'i'
    ) as dims(parts)
   where option.item_id = item.id
     and option.dimension_length is null
     and option.dimension_width is null
     and option.dimension_height is null
     and option.dimension_unit is null
     and (
       coalesce(item.name, '') || ' ' || coalesce(item.description, '')
     ) ~* '([0-9]+(?:\.[0-9]+)?)\s*(?:×|x)\s*([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|ft)'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_dimensions_2d_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set dimension_length = dims.parts[1]::numeric,
         dimension_unit = 'ft',
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairDimensionSource', 'name:feet', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(item.name, '([0-9]+(?:\.[0-9]+)?)\s*ft', 'i') as dims(parts)
   where option.item_id = item.id
     and option.dimension_length is null
     and option.dimension_width is null
     and option.dimension_height is null
     and option.dimension_unit is null
     and item.name ~* '([0-9]+(?:\.[0-9]+)?)\s*ft'
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_dimensions_feet_inferred', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_options option
     set dimension_height = dims.parts[1]::numeric,
         dimension_unit = 'mm',
         variant_metadata = coalesce(option.variant_metadata, '{}'::jsonb)
                            || jsonb_build_object('dataRepairDimensionSource', 'name:thickness-mm', 'dataRepairNameCategoryVariantCleanupAt', now()),
         updated_at = now()
    from public.cost_library_items item
    cross join lateral regexp_match(item.name, '([0-9]+(?:\.[0-9]+)?)\s*mm', 'i') as dims(parts)
   where option.item_id = item.id
     and item.name ~* 'panel|board'
     and item.name ~* '([0-9]+(?:\.[0-9]+)?)\s*mm'
     and option.dimension_length is null
     and option.dimension_width is null
     and option.dimension_height is null
     and option.dimension_unit is null
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'variant_thickness_mm_inferred', count(*)
from updated;

create temporary table _current_library_items on commit drop as
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
from public.cost_library_items
where id in (select id from _updated_component_items);

with updated as (
  update public.cost_library_item_versions version
     set snapshot = coalesce(version.snapshot, '{}'::jsonb)
                    || jsonb_build_object(
                      'name', item.name,
                      'description', item.description,
                      'category', item.category,
                      'categoryNodeId', item.category_node_id,
                      'category_node_id', item.category_node_id,
                      'supplier', item.supplier,
                      'supplierId', item.supplier_id,
                      'supplier_id', item.supplier_id,
                      'brand', item.brand,
                      'brandId', item.brand_id,
                      'brand_id', item.brand_id,
                      'unit', item.unit,
                      'unit_cost', item.unit_cost,
                      'misc_cost', item.misc_cost,
                      'pricingSource', item.pricing_source,
                      'pricingDate', item.pricing_date,
                      'confidence', item.confidence,
                      'sourceLibraryItemId', item.id,
                      'dataRepairNameCategoryVariantCleanupAt', now()
                    )
    from _current_library_items item
   where version.item_id = item.id
     and version.version_number = (
       select current_version_number
       from public.cost_library_items current_item
       where current_item.id = version.item_id
     )
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'current_library_version_snapshots_name_category_repaired', count(*)
from updated;

with updated as (
  update public.cost_library_item_price_history history
     set new_snapshot = coalesce(history.new_snapshot, '{}'::jsonb)
                        || jsonb_build_object(
                          'name', item.name,
                          'description', item.description,
                          'category', item.category,
                          'categoryNodeId', item.category_node_id,
                          'category_node_id', item.category_node_id,
                          'supplier', item.supplier,
                          'supplierId', item.supplier_id,
                          'supplier_id', item.supplier_id,
                          'brand', item.brand,
                          'brandId', item.brand_id,
                          'brand_id', item.brand_id,
                          'unit', item.unit,
                          'unit_cost', item.unit_cost,
                          'misc_cost', item.misc_cost,
                          'pricingSource', item.pricing_source,
                          'pricingDate', item.pricing_date,
                          'confidence', item.confidence,
                          'sourceLibraryItemId', item.id,
                          'dataRepairNameCategoryVariantCleanupAt', now()
                        )
    from _current_library_items item
   where history.item_id = item.id
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'price_history_new_snapshots_name_category_repaired', count(*)
from updated;

create temporary table _estimate_row_source_targets on commit drop as
select row_item.id as row_id,
       item.id as item_id,
       row_item.link_state = 'linked-clean' as should_refresh_visible_row
  from public.estimate_row_items row_item
  join _current_library_items item
    on item.id = coalesce(
      row_item.source_library_item_id,
      case
        when row_item.metadata->>'sourceComponentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (row_item.metadata->>'sourceComponentId')::uuid
      end,
      case
        when row_item.source_snapshot->>'sourceLibraryItemId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (row_item.source_snapshot->>'sourceLibraryItemId')::uuid
      end
    )
 where row_item.source_snapshot is not null;

with updated as (
  update public.estimate_row_items row_item
     set material = case when target.should_refresh_visible_row then item.name else row_item.material end,
         description = case when target.should_refresh_visible_row then item.description else row_item.description end,
         category_node_id = case when target.should_refresh_visible_row then item.category_node_id else row_item.category_node_id end,
         source_snapshot = coalesce(row_item.source_snapshot, '{}'::jsonb)
                           || jsonb_build_object(
                             'name', item.name,
                             'category', item.category,
                             'categoryNodeId', item.category_node_id,
                             'category_node_id', item.category_node_id,
                             'sourceLibraryItemId', item.id,
                             'dataRepairNameCategoryVariantCleanupAt', now()
                           ),
         metadata = coalesce(row_item.metadata, '{}'::jsonb)
                    || jsonb_build_object(
                      'sourceComponentId', item.id,
                      'dataRepairNameCategoryVariantCleanupAt', now()
                    ),
         row_revision = case when target.should_refresh_visible_row then coalesce(row_item.row_revision, 0) + 1 else row_item.row_revision end,
         updated_at = now()
    from _estimate_row_source_targets target
    join _current_library_items item on item.id = target.item_id
   where row_item.id = target.row_id
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'estimate_row_source_snapshots_name_category_repaired', count(*)
from updated;

create temporary table _template_row_source_targets on commit drop as
select row_item.id as row_id,
       item.id as item_id,
       row_item.link_state = 'linked-clean' as should_refresh_visible_row
  from public.estimate_template_row_items row_item
  join _current_library_items item
    on item.id = coalesce(
      row_item.source_library_item_id,
      case
        when row_item.source_snapshot->>'sourceLibraryItemId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (row_item.source_snapshot->>'sourceLibraryItemId')::uuid
      end
    )
 where row_item.source_snapshot is not null;

with updated as (
  update public.estimate_template_row_items row_item
     set material = case when target.should_refresh_visible_row then item.name else row_item.material end,
         description = case when target.should_refresh_visible_row then item.description else row_item.description end,
         category_node_id = case when target.should_refresh_visible_row then item.category_node_id else row_item.category_node_id end,
         source_snapshot = coalesce(row_item.source_snapshot, '{}'::jsonb)
                           || jsonb_build_object(
                             'name', item.name,
                             'category', item.category,
                             'categoryNodeId', item.category_node_id,
                             'category_node_id', item.category_node_id,
                             'sourceLibraryItemId', item.id,
                             'dataRepairNameCategoryVariantCleanupAt', now()
                           ),
         metadata = coalesce(row_item.metadata, '{}'::jsonb)
                    || jsonb_build_object(
                      'sourceComponentId', item.id,
                      'dataRepairNameCategoryVariantCleanupAt', now()
                    ),
         updated_at = now()
    from _template_row_source_targets target
    join _current_library_items item on item.id = target.item_id
   where row_item.id = target.row_id
   returning 1
)
insert into _repair_counts(label, affected_rows)
select 'template_row_source_snapshots_name_category_repaired', count(*)
from updated;

do $$
declare
  brand_prefixed_names bigint;
  allowance_names bigint;
  pricing_note_labels bigint;
  water_closets_outside_sanitary bigint;
  obvious_furniture_misfiles bigint;
begin
  select count(*) into brand_prefixed_names
  from public.cost_library_items item
  left join public.component_brands brand on brand.id = item.brand_id
  where coalesce(nullif(trim(item.brand), ''), brand.name) is not null
    and lower(item.name) like lower(coalesce(nullif(trim(item.brand), ''), brand.name)) || '%';

  select count(*) into allowance_names
  from public.cost_library_items
  where name ~* '\s+allowance$';

  select count(*) into pricing_note_labels
  from public.cost_library_item_price_options option
  join (
    select item_id, count(*) as option_count
      from public.cost_library_item_price_options
     group by item_id
  ) counts on counts.item_id = option.item_id
  where counts.option_count = 1
    and option.label is distinct from 'Standard';

  select count(*) into water_closets_outside_sanitary
  from public.cost_library_items
  where name ~* 'water closet|toilet'
    and category_node_id is distinct from 'fixtures-sanitary-fixtures';

  select count(*) into obvious_furniture_misfiles
  from public.cost_library_items
  where (
      name ~* 'loveseat|sofa|sectional'
      and category_node_id is distinct from 'furniture-sofas'
    )
    or (
      name ~* 'bedside table|nightstand'
      and category_node_id is distinct from 'furniture-nightstands'
    )
    or (
      name ~* 'coffee table|nesting table|side and coffee'
      and category_node_id is distinct from 'furniture-coffee-tables'
    )
    or (
      name ~* 'dining chair'
      and category_node_id is distinct from 'furniture-dining-chairs'
    )
    or (
      name ~* 'dining table|dining set|8-seat|8-seater'
      and category_node_id is distinct from 'furniture-dining-tables'
    );

  if brand_prefixed_names <> 0 then
    raise exception 'Brand-prefixed component names remain: %', brand_prefixed_names;
  end if;
  if allowance_names <> 0 then
    raise exception 'Allowance-suffixed component names remain: %', allowance_names;
  end if;
  if pricing_note_labels <> 0 then
    raise exception 'Single-option variant labels are not normalized: %', pricing_note_labels;
  end if;
  if water_closets_outside_sanitary <> 0 then
    raise exception 'Water closet/toilet rows outside sanitary fixtures remain: %', water_closets_outside_sanitary;
  end if;
  if obvious_furniture_misfiles <> 0 then
    raise exception 'Obvious furniture category misfiles remain: %', obvious_furniture_misfiles;
  end if;
end $$;

select label, affected_rows
from _repair_counts
order by label;
