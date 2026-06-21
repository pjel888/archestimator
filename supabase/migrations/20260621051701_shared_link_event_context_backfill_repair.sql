-- Repair historical shared-link review target labels after the event-context
-- migration. The previous migration correctly enforced new writes, but its
-- one-time SQL backfill did not include every tree-node source that the app
-- parser reads and did not hydrate row comments with their owning estimate.

with recursive
estimate_labels as (
  select
    pp.id as publication_id,
    nullif(btrim(estimate_item.estimate ->> 'id'), '') as estimate_id,
    coalesce(
      nullif(btrim(estimate_item.estimate ->> 'name'), ''),
      nullif(btrim(estimate_item.estimate ->> 'sheetCode'), ''),
      nullif(btrim(estimate_item.estimate ->> 'sheet_code'), ''),
      'Proposal'
    ) as estimate_label,
    estimate_item.estimate
  from public.project_publications pp
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(pp.snapshot_json -> 'estimates') = 'array' then pp.snapshot_json -> 'estimates'
      else '[]'::jsonb
    end
  ) as estimate_item(estimate)
),
node_roots as (
  select el.publication_id, el.estimate_id, el.estimate_label, el.estimate -> 'nodes' as nodes_json
  from estimate_labels el
  where jsonb_typeof(el.estimate -> 'nodes') = 'array'

  union all

  select el.publication_id, el.estimate_id, el.estimate_label, el.estimate -> 'treeNodes' as nodes_json
  from estimate_labels el
  where jsonb_typeof(el.estimate -> 'treeNodes') = 'array'

  union all

  select el.publication_id, el.estimate_id, el.estimate_label, el.estimate -> 'tree_nodes' as nodes_json
  from estimate_labels el
  where jsonb_typeof(el.estimate -> 'tree_nodes') = 'array'

  union all

  select el.publication_id, el.estimate_id, el.estimate_label, tab_item.tab_json -> 'treeNodes' as nodes_json
  from estimate_labels el
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(el.estimate -> 'tabs') = 'array' then el.estimate -> 'tabs'
      else '[]'::jsonb
    end
  ) as tab_item(tab_json)
  where jsonb_typeof(tab_item.tab_json -> 'treeNodes') = 'array'

  union all

  select el.publication_id, el.estimate_id, el.estimate_label, tab_item.tab_json -> 'tree_nodes' as nodes_json
  from estimate_labels el
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(el.estimate -> 'tabs') = 'array' then el.estimate -> 'tabs'
      else '[]'::jsonb
    end
  ) as tab_item(tab_json)
  where jsonb_typeof(tab_item.tab_json -> 'tree_nodes') = 'array'
),
all_nodes as (
  select
    nr.publication_id,
    nr.estimate_id,
    nr.estimate_label,
    node_item.node_json
  from node_roots nr
  cross join lateral jsonb_array_elements(nr.nodes_json) as node_item(node_json)

  union all

  select
    parent.publication_id,
    parent.estimate_id,
    parent.estimate_label,
    child.node_json
  from all_nodes parent
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(parent.node_json -> 'children') = 'array' then parent.node_json -> 'children'
      else '[]'::jsonb
    end
  ) as child(node_json)
),
node_labels as (
  select
    an.publication_id,
    an.estimate_id,
    nullif(btrim(an.node_json ->> 'id'), '') as node_id,
    nullif(btrim(an.node_json ->> 'name'), '') as node_label
  from all_nodes an
  where nullif(btrim(an.node_json ->> 'id'), '') is not null
    and nullif(btrim(an.node_json ->> 'name'), '') is not null
),
estimate_rows as (
  select
    el.publication_id,
    el.estimate_id,
    el.estimate_label,
    row_item.row_json
  from estimate_labels el
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(el.estimate -> 'rows') = 'array' then el.estimate -> 'rows'
      else '[]'::jsonb
    end
  ) as row_item(row_json)

  union all

  select
    el.publication_id,
    el.estimate_id,
    el.estimate_label,
    row_item.row_json
  from estimate_labels el
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(el.estimate -> 'tabs') = 'array' then el.estimate -> 'tabs'
      else '[]'::jsonb
    end
  ) as tab_item(tab_json)
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(tab_item.tab_json -> 'rows') = 'array' then tab_item.tab_json -> 'rows'
      else '[]'::jsonb
    end
  ) as row_item(row_json)
),
row_labels as (
  select
    er.publication_id,
    er.estimate_id,
    nullif(btrim(er.row_json ->> 'id'), '') as row_id,
    coalesce(
      (
        select nl.node_label
        from node_labels nl
        where nl.publication_id = er.publication_id
          and nl.estimate_id is not distinct from er.estimate_id
          and nl.node_id = coalesce(
            nullif(btrim(er.row_json ->> 'nodeId'), ''),
            nullif(btrim(er.row_json ->> 'node_id'), '')
          )
        limit 1
      ),
      nullif(btrim(er.row_json ->> 'areaName'), ''),
      nullif(btrim(er.row_json ->> 'area_name'), ''),
      nullif(btrim(er.row_json ->> 'description'), ''),
      nullif(btrim(er.row_json ->> 'material'), ''),
      er.estimate_label
    ) as row_label
  from estimate_rows er
),
publication_labels as (
  select
    pp.id as publication_id,
    jsonb_build_object(
      'estimateLabels',
      coalesce(
        (
          select jsonb_object_agg(el.estimate_id, el.estimate_label)
          from estimate_labels el
          where el.publication_id = pp.id
            and el.estimate_id is not null
        ),
        '{}'::jsonb
      ),
      'rowLabels',
      coalesce(
        (
          select jsonb_object_agg(rl.row_id, rl.row_label)
          from row_labels rl
          where rl.publication_id = pp.id
            and rl.row_id is not null
        ),
        '{}'::jsonb
      ),
      'rowEstimateIds',
      coalesce(
        (
          select jsonb_object_agg(rl.row_id, rl.estimate_id)
          from row_labels rl
          where rl.publication_id = pp.id
            and rl.row_id is not null
            and rl.estimate_id is not null
        ),
        '{}'::jsonb
      )
    ) as activity_target_labels_json
  from public.project_publications pp
)
update public.project_publications pp
set activity_target_labels_json = publication_labels.activity_target_labels_json
from publication_labels
where pp.id = publication_labels.publication_id;

with row_context as (
  select
    c.id,
    nullif(p.activity_target_labels_json #>> array['rowEstimateIds', c.row_id::text], '')::uuid as row_estimate_id,
    p.activity_target_labels_json #>> array['rowLabels', c.row_id::text] as row_label,
    case
      when nullif(p.activity_target_labels_json #>> array['rowEstimateIds', c.row_id::text], '') is not null then
        p.activity_target_labels_json #>> array[
          'estimateLabels',
          nullif(p.activity_target_labels_json #>> array['rowEstimateIds', c.row_id::text], '')
        ]
      else null
    end as estimate_label
  from public.shared_link_comments c
  join public.project_publications p on p.id = c.publication_id
  where c.row_id is not null
)
update public.shared_link_comments c
set
  estimate_id = case
    when row_context.row_estimate_id is not null then row_context.row_estimate_id
    else c.estimate_id
  end,
  target_kind = 'row',
  target_label = case
    when c.snapshot_version_at_comment is null and row_context.row_label is not null then row_context.row_label
    else c.target_label
  end,
  target_secondary_label = coalesce(row_context.estimate_label, c.target_secondary_label)
from row_context
where c.id = row_context.id
  and (
    c.estimate_id is distinct from row_context.row_estimate_id
    or c.target_kind is distinct from 'row'
    or (c.snapshot_version_at_comment is null and c.target_label is distinct from row_context.row_label)
    or c.target_secondary_label is distinct from row_context.estimate_label
  );

with row_context as (
  select
    r.id,
    nullif(p.activity_target_labels_json #>> array['rowEstimateIds', r.row_id::text], '')::uuid as row_estimate_id,
    p.activity_target_labels_json #>> array['rowLabels', r.row_id::text] as row_label,
    case
      when nullif(p.activity_target_labels_json #>> array['rowEstimateIds', r.row_id::text], '') is not null then
        p.activity_target_labels_json #>> array[
          'estimateLabels',
          nullif(p.activity_target_labels_json #>> array['rowEstimateIds', r.row_id::text], '')
        ]
      else null
    end as estimate_label
  from public.shared_link_responses r
  join public.project_publications p on p.id = r.publication_id
  where r.row_id is not null
)
update public.shared_link_responses r
set
  estimate_id = case
    when row_context.row_estimate_id is not null then row_context.row_estimate_id
    else r.estimate_id
  end,
  target_kind = 'row',
  target_label = coalesce(r.target_label, row_context.row_label),
  target_secondary_label = coalesce(r.target_secondary_label, row_context.estimate_label)
from row_context
where r.id = row_context.id
  and (
    r.estimate_id is distinct from row_context.row_estimate_id
    or r.target_kind is distinct from 'row'
    or r.target_label is null
    or r.target_secondary_label is null
  );
