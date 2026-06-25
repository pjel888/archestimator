-- Library overview query batching.
--
-- Additive RPC for /workshop/library. The application keeps the existing
-- multi-query app path as fallback when this function is unavailable or returns
-- an incompatible payload.

create or replace function public.library_overview_summary(
  target_workspace_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with input as (
    select
      target_workspace_id as workspace_id,
      (select auth.uid()) as caller_id,
      (current_date - interval '90 days')::date as stale_pricing_cutoff
  ),
  authorized_workspace as (
    select workspace.id as workspace_id
    from input
    join public.workspaces workspace
      on workspace.id = input.workspace_id
    where input.caller_id is not null
      and public.is_workspace_member(workspace.id)
  ),
  active_components as (
    select
      item.id,
      item.name,
      item.category,
      item.supplier,
      item.unit,
      item.unit_cost,
      item.thumbnail_path,
      item.pricing_source,
      item.pricing_date,
      item.confidence,
      item.lifecycle_state,
      item.updated_at,
      item.brand_id,
      item.brand
    from authorized_workspace workspace
    join public.cost_library_items item
      on item.workspace_id = workspace.workspace_id
    where item.lifecycle_state <> 'archived'
  ),
  recent_components as (
    select *
    from active_components
    order by updated_at desc, id desc
    limit 6
  ),
  recent_templates as (
    select template.*
    from authorized_workspace workspace
    join public.estimate_templates template
      on template.workspace_id = workspace.workspace_id
    order by template.updated_at desc, template.id desc
    limit 5
  ),
  recent_template_ids as (
    select id as template_id
    from recent_templates
  ),
  recent_template_nodes as (
    select node.*
    from public.estimate_template_nodes node
    join recent_template_ids template
      on template.template_id = node.template_id
    order by node.sort_order asc, node.id asc
  ),
  recent_template_row_items as (
    select row_item.*
    from public.estimate_template_row_items row_item
    join recent_template_ids template
      on template.template_id = row_item.template_id
    order by row_item.sort_order asc, row_item.id asc
  ),
  template_categories as (
    select template.category
    from authorized_workspace workspace
    join public.estimate_templates template
      on template.workspace_id = workspace.workspace_id
  ),
  discontinued_components as (
    select item.id
    from authorized_workspace workspace
    join public.cost_library_items item
      on item.workspace_id = workspace.workspace_id
    where item.lifecycle_state = 'discontinued'
  ),
  discontinued_refs as (
    select distinct row_item.source_library_item_id as item_id
    from public.estimate_template_row_items row_item
    join discontinued_components component
      on component.id = row_item.source_library_item_id
    where row_item.source_library_item_id is not null

    union

    select distinct row_item.source_library_item_id as item_id
    from public.estimate_row_items row_item
    join discontinued_components component
      on component.id = row_item.source_library_item_id
    where row_item.source_library_item_id is not null
  )
  select jsonb_build_object(
    'componentCount', (select count(*) from active_components)::int,
    'categoryCount', (
      select count(*)::int
      from authorized_workspace
      cross join public.component_category_nodes category
      where category.parent_id is null
    ),
    'supplierCount', (
      select count(*)::int
      from authorized_workspace workspace
      join public.component_suppliers supplier
        on supplier.workspace_id = workspace.workspace_id
    ),
    'brandCount', (
      select count(*)::int
      from authorized_workspace workspace
      join public.component_brands brand
        on brand.workspace_id = workspace.workspace_id
    ),
    'templateCount', (select count(*) from template_categories)::int,
    'templateCategories', coalesce((
      select jsonb_agg(distinct category order by category)
      from template_categories
    ), '[]'::jsonb),
    'recentComponents', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', component.id,
          'name', component.name,
          'category', component.category,
          'supplier', component.supplier,
          'unit', component.unit,
          'unit_cost', component.unit_cost,
          'thumbnail_path', component.thumbnail_path,
          'pricing_source', component.pricing_source,
          'pricing_date', component.pricing_date,
          'confidence', component.confidence,
          'lifecycle_state', component.lifecycle_state,
          'updated_at', component.updated_at
        )
        order by component.updated_at desc, component.id desc
      )
      from recent_components component
    ), '[]'::jsonb),
    'recentTemplateRows', coalesce((
      select jsonb_agg(to_jsonb(template) order by template.updated_at desc, template.id desc)
      from recent_templates template
    ), '[]'::jsonb),
    'recentTemplateNodes', coalesce((
      select jsonb_agg(to_jsonb(node) order by node.sort_order asc, node.id asc)
      from recent_template_nodes node
    ), '[]'::jsonb),
    'recentTemplateRowItems', coalesce((
      select jsonb_agg(to_jsonb(row_item) order by row_item.sort_order asc, row_item.id asc)
      from recent_template_row_items row_item
    ), '[]'::jsonb),
    'health', jsonb_build_object(
      'staleComponentCount', (
        select count(*)::int
        from active_components component
        cross join input
        where component.pricing_date is not null
          and component.pricing_date < input.stale_pricing_cutoff
      ),
      'discontinuedInUseCount', (select count(*) from discontinued_refs)::int,
      'missingBrandCount', (
        select count(*)::int
        from active_components component
        where component.brand_id is null
          and (component.brand is null or component.brand = '')
      ),
      'lastLibraryUpdate', (
        select component.updated_at
        from active_components component
        order by component.updated_at desc, component.id desc
        limit 1
      )
    )
  );
$$;

revoke execute on function public.library_overview_summary(uuid) from public, anon;
grant execute on function public.library_overview_summary(uuid) to authenticated;
