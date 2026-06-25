drop function if exists public.library_component_rows_seed(uuid);

create or replace function public.library_component_rows_seed(
  target_workspace_id uuid,
  item_limit integer default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with authorized_workspace as (
  select workspace.id
  from public.workspaces workspace
  where workspace.id = target_workspace_id
    and public.is_workspace_member(workspace.id)
),
bounded_limit as (
  select case
    when item_limit is null then null::integer
    else greatest(1, least(1000, item_limit))
  end as value
),
all_item_rows as (
  select item.*
  from public.cost_library_items item
  join authorized_workspace workspace on workspace.id = item.workspace_id
  where item.lifecycle_state <> 'archived'
),
item_rows as (
  select item.*
  from all_item_rows item
  order by item.category asc, item.name asc, item.id asc
  limit (select value from bounded_limit)
),
item_ids as (
  select item.id
  from item_rows item
)
select jsonb_build_object(
  'componentCount',
  coalesce((select count(*) from all_item_rows), 0),
  'categoryRows',
  coalesce(
    (
      select jsonb_agg(to_jsonb(category) order by category.sort_order asc, category.label asc, category.id asc)
      from public.component_category_nodes category
      cross join authorized_workspace workspace
    ),
    '[]'::jsonb
  ),
  'suppliers',
  coalesce(
    (
      select jsonb_agg(to_jsonb(supplier) order by supplier.sort_order asc, supplier.name asc, supplier.id asc)
      from public.component_suppliers supplier
      join authorized_workspace workspace on workspace.id = supplier.workspace_id
    ),
    '[]'::jsonb
  ),
  'brands',
  coalesce(
    (
      select jsonb_agg(to_jsonb(brand) order by brand.sort_order asc, brand.name asc, brand.id asc)
      from public.component_brands brand
      join authorized_workspace workspace on workspace.id = brand.workspace_id
    ),
    '[]'::jsonb
  ),
  'libraryFolders',
  coalesce(
    (
      select jsonb_agg(to_jsonb(folder) order by folder.sort_order asc, folder.name asc, folder.id asc)
      from public.library_folders folder
      join authorized_workspace workspace on workspace.id = folder.workspace_id
      where folder.folder_kind = 'custom'
    ),
    '[]'::jsonb
  ),
  'itemRows',
  coalesce(
    (
      select jsonb_agg(to_jsonb(item) order by item.category asc, item.name asc, item.id asc)
      from item_rows item
    ),
    '[]'::jsonb
  ),
  'priceOptions',
  coalesce(
    (
      select jsonb_agg(
        to_jsonb(option_row)
        order by option_row.is_default desc, option_row.variant_sort_order asc, option_row.created_at asc, option_row.id asc
      )
      from public.cost_library_item_price_options option_row
      join authorized_workspace workspace on workspace.id = option_row.workspace_id
      where exists (
        select 1
        from item_ids item
        where item.id = option_row.item_id
      )
    ),
    '[]'::jsonb
  ),
  'costEntries',
  coalesce(
    (
      select jsonb_agg(
        to_jsonb(cost_entry)
        order by cost_entry.is_current desc, cost_entry.pricing_date desc nulls last, cost_entry.created_at desc, cost_entry.id asc
      )
      from public.cost_library_item_variant_cost_entries cost_entry
      join authorized_workspace workspace on workspace.id = cost_entry.workspace_id
      where cost_entry.deleted_at is null
        and exists (
          select 1
          from item_ids item
          where item.id = cost_entry.item_id
        )
    ),
    '[]'::jsonb
  )
);
$$;

revoke execute on function public.library_component_rows_seed(uuid, integer) from public, anon;
grant execute on function public.library_component_rows_seed(uuid, integer) to authenticated;
