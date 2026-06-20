alter table public.project_publications
  add column if not exists activity_target_labels_json jsonb not null default '{"estimateLabels": {}, "rowLabels": {}}'::jsonb;

with estimate_labels as (
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
row_labels as (
  select
    el.publication_id,
    nullif(btrim(row_item.row_json ->> 'id'), '') as row_id,
    coalesce(
      nullif(btrim(matched_node.node_json ->> 'name'), ''),
      nullif(btrim(row_item.row_json ->> 'areaName'), ''),
      nullif(btrim(row_item.row_json ->> 'area_name'), ''),
      nullif(btrim(row_item.row_json ->> 'material'), ''),
      nullif(btrim(row_item.row_json ->> 'description'), ''),
      el.estimate_label
    ) as row_label
  from estimate_labels el
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(el.estimate -> 'rows') = 'array' then el.estimate -> 'rows'
      else '[]'::jsonb
    end
  ) as row_item(row_json)
  left join lateral (
    select node_item.node_json
    from jsonb_array_elements(
      case
        when jsonb_typeof(el.estimate -> 'nodes') = 'array' then el.estimate -> 'nodes'
        else '[]'::jsonb
      end
    ) as node_item(node_json)
    where node_item.node_json ->> 'id' = coalesce(row_item.row_json ->> 'nodeId', row_item.row_json ->> 'node_id')
    limit 1
  ) matched_node on true
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
      )
    ) as activity_target_labels_json
  from public.project_publications pp
)
update public.project_publications pp
set activity_target_labels_json = publication_labels.activity_target_labels_json
from publication_labels
where pp.id = publication_labels.publication_id;

drop function if exists public.rotate_project_publication_credentials(uuid, text, text, text, text, jsonb, uuid[]);

create or replace function public.rotate_project_publication_credentials(
  target_publication_id uuid,
  expected_encrypted_token text,
  p_token_hash text,
  p_encrypted_token text,
  p_password_hash text,
  p_snapshot_json jsonb,
  p_selected_estimate_ids uuid[],
  p_activity_target_labels_json jsonb default '{"estimateLabels": {}, "rowLabels": {}}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_encrypted_token text;
  v_invalidated_count integer := 0;
  v_next_snapshot_version integer;
  v_revoked_at timestamptz;
  v_snapshot_version integer;
  v_status public.project_publication_status;
  v_expires_at timestamptz;
begin
  select encrypted_token, snapshot_version, status, revoked_at, expires_at
    into v_encrypted_token, v_snapshot_version, v_status, v_revoked_at, v_expires_at
  from public.project_publications
  where id = target_publication_id
  for update;

  if not found then
    raise exception 'Publication not found.';
  end if;

  if v_status is distinct from 'published'
     or v_revoked_at is not null
     or (v_expires_at is not null and v_expires_at <= now())
     or v_encrypted_token is distinct from expected_encrypted_token then
    return -1;
  end if;

  v_next_snapshot_version := coalesce(v_snapshot_version, 0) + 1;

  update public.project_publications
  set token_hash = p_token_hash,
      encrypted_token = p_encrypted_token,
      password_hash = p_password_hash,
      snapshot_json = p_snapshot_json,
      activity_target_labels_json = coalesce(p_activity_target_labels_json, '{"estimateLabels": {}, "rowLabels": {}}'::jsonb),
      selected_estimate_ids = coalesce(p_selected_estimate_ids, '{}'::uuid[]),
      snapshot_version = v_next_snapshot_version,
      published_at = now(),
      updated_at = now()
  where id = target_publication_id;

  update public.shared_link_recipients
  set recipient_token_hash = 'revoked:' || target_publication_id::text || ':' || id::text || ':' || v_next_snapshot_version::text,
      delivery_status = 'pending',
      resend_email_id = null,
      resend_last_event_at = null,
      resend_last_event_type = null,
      updated_at = now()
  where publication_id = target_publication_id;

  get diagnostics v_invalidated_count = row_count;
  return v_invalidated_count;
end;
$$;

revoke all on function public.rotate_project_publication_credentials(uuid, text, text, text, text, jsonb, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.rotate_project_publication_credentials(uuid, text, text, text, text, jsonb, uuid[], jsonb) to service_role;
