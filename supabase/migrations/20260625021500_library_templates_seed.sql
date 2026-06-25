create or replace function public.library_templates_seed(
  target_workspace_id uuid,
  target_template_id uuid default null
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
template_rows as (
  select template.*
  from public.estimate_templates template
  join authorized_workspace workspace on workspace.id = template.workspace_id
  where target_template_id is null
     or template.id = target_template_id
  order by template.sort_order asc, template.name asc, template.id asc
),
template_ids as (
  select template.id
  from template_rows template
)
select jsonb_build_object(
  'templates',
  coalesce(
    (
      select jsonb_agg(to_jsonb(template) order by template.sort_order asc, template.name asc, template.id asc)
      from template_rows template
    ),
    '[]'::jsonb
  ),
  'nodes',
  coalesce(
    (
      select jsonb_agg(to_jsonb(node) order by node.sort_order asc, node.id asc)
      from public.estimate_template_nodes node
      where exists (
        select 1
        from template_ids template
        where template.id = node.template_id
      )
    ),
    '[]'::jsonb
  ),
  'rowItems',
  coalesce(
    (
      select jsonb_agg(to_jsonb(row_item) order by row_item.sort_order asc, row_item.id asc)
      from public.estimate_template_row_items row_item
      where exists (
        select 1
        from template_ids template
        where template.id = row_item.template_id
      )
    ),
    '[]'::jsonb
  )
);
$$;

revoke execute on function public.library_templates_seed(uuid, uuid) from public, anon;
grant execute on function public.library_templates_seed(uuid, uuid) to authenticated;
