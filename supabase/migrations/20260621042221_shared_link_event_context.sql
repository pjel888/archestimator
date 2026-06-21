-- Persist immutable proposal/estimate/line-item context on recipient feedback.
--
-- Public activity can no longer rely only on the current publication snapshot
-- label map because legal review history must remain stable after republish.
-- The app still computes labels from the snapshot at write time; the database
-- stores those labels beside each comment/decision for later audit rendering.

alter table public.shared_link_comments
  add column if not exists target_kind text not null default 'proposal',
  add column if not exists target_label text,
  add column if not exists target_secondary_label text,
  add column if not exists snapshot_version_at_comment integer;

alter table public.shared_link_comments
  drop constraint if exists shared_link_comments_target_kind_check,
  add constraint shared_link_comments_target_kind_check
    check (target_kind in ('proposal', 'estimate', 'row'));

alter table public.shared_link_responses
  add column if not exists estimate_id uuid,
  add column if not exists row_id uuid,
  add column if not exists target_kind text not null default 'proposal',
  add column if not exists target_label text,
  add column if not exists target_secondary_label text;

alter table public.shared_link_responses
  drop constraint if exists shared_link_responses_target_kind_check,
  add constraint shared_link_responses_target_kind_check
    check (target_kind in ('proposal', 'estimate', 'row'));

create index if not exists shared_link_responses_estimate_idx
  on public.shared_link_responses (publication_id, estimate_id)
  where estimate_id is not null;

create index if not exists shared_link_responses_row_idx
  on public.shared_link_responses (publication_id, row_id)
  where row_id is not null;

alter table public.project_publications
  alter column activity_target_labels_json
  set default '{"estimateLabels": {}, "rowLabels": {}, "rowEstimateIds": {}}'::jsonb;

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

update public.shared_link_comments
set
  target_kind = case
    when row_id is not null then 'row'
    when estimate_id is not null then 'estimate'
    else 'proposal'
  end,
  target_label = coalesce(
    target_label,
    case
      when row_id is not null then (
        select p.activity_target_labels_json #>> array['rowLabels', shared_link_comments.row_id::text]
        from public.project_publications p
        where p.id = shared_link_comments.publication_id
      )
      when estimate_id is not null then (
        select p.activity_target_labels_json #>> array['estimateLabels', shared_link_comments.estimate_id::text]
        from public.project_publications p
        where p.id = shared_link_comments.publication_id
      )
      else 'the proposal'
    end
  ),
  target_secondary_label = coalesce(
    target_secondary_label,
    case
      when row_id is not null and estimate_id is not null then (
        select p.activity_target_labels_json #>> array['estimateLabels', shared_link_comments.estimate_id::text]
        from public.project_publications p
        where p.id = shared_link_comments.publication_id
      )
      else null
    end
  )
where target_label is null
   or target_secondary_label is null;

update public.shared_link_responses
set
  target_kind = case
    when row_id is not null then 'row'
    when estimate_id is not null then 'estimate'
    else coalesce(nullif(target_kind, ''), 'proposal')
  end,
  target_label = coalesce(
    target_label,
    case
      when row_id is not null then (
        select p.activity_target_labels_json #>> array['rowLabels', shared_link_responses.row_id::text]
        from public.project_publications p
        where p.id = shared_link_responses.publication_id
      )
      when estimate_id is not null then (
        select p.activity_target_labels_json #>> array['estimateLabels', shared_link_responses.estimate_id::text]
        from public.project_publications p
        where p.id = shared_link_responses.publication_id
      )
      else 'the proposal'
    end
  ),
  target_secondary_label = coalesce(
    target_secondary_label,
    case
      when row_id is not null and estimate_id is not null then (
        select p.activity_target_labels_json #>> array['estimateLabels', shared_link_responses.estimate_id::text]
        from public.project_publications p
        where p.id = shared_link_responses.publication_id
      )
      else null
    end
  );

drop function if exists public.insert_client_comment(text, text, uuid, uuid, text, integer);

create or replace function public.insert_client_comment(
  p_token_hash text,
  p_recipient_token_hash text,
  p_estimate_id uuid,
  p_row_id uuid,
  p_body text,
  p_expected_snapshot_version integer,
  p_target_kind text default 'proposal',
  p_target_label text default null,
  p_target_secondary_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_target_labels_json jsonb;
  v_estimate_id uuid := p_estimate_id;
  v_publication_id uuid;
  v_recipient_id uuid;
  v_snapshot_version integer;
  v_comment_id uuid;
  v_row_estimate_id uuid;
  v_target_kind text := case
    when p_row_id is not null then 'row'
    when p_estimate_id is not null then 'estimate'
    when p_target_kind in ('proposal', 'estimate', 'row') then p_target_kind
    else 'proposal'
  end;
begin
  select id, snapshot_version, activity_target_labels_json
    into v_publication_id, v_snapshot_version, v_activity_target_labels_json
  from public.project_publications
  where token_hash = p_token_hash
    and status = 'published'
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_publication_id is null then
    raise exception 'Publication not found or expired.';
  end if;

  if p_expected_snapshot_version is null or v_snapshot_version is distinct from p_expected_snapshot_version then
    raise exception 'Publication snapshot version changed.';
  end if;

  if p_estimate_id is not null
     and not (coalesce(v_activity_target_labels_json -> 'estimateLabels', '{}'::jsonb) ? p_estimate_id::text) then
    raise exception 'Invalid review target: selected estimate is not part of this publication.';
  end if;

  if p_row_id is not null then
    if not (coalesce(v_activity_target_labels_json -> 'rowLabels', '{}'::jsonb) ? p_row_id::text) then
      raise exception 'Invalid review target: selected line item is not part of this publication.';
    end if;

    v_row_estimate_id := nullif(v_activity_target_labels_json #>> array['rowEstimateIds', p_row_id::text], '')::uuid;
    if v_row_estimate_id is null then
      raise exception 'Invalid review target: selected line item is not part of this publication.';
    end if;

    if p_estimate_id is not null and v_row_estimate_id is distinct from p_estimate_id then
      raise exception 'Invalid review target: selected line item does not belong to the selected estimate.';
    end if;

    v_estimate_id := coalesce(p_estimate_id, v_row_estimate_id);
  end if;

  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  insert into public.shared_link_comments (
    publication_id,
    recipient_id,
    author_email,
    estimate_id,
    row_id,
    body,
    target_kind,
    target_label,
    target_secondary_label,
    snapshot_version_at_comment
  )
  select
    v_publication_id,
    v_recipient_id,
    r.email,
    v_estimate_id,
    p_row_id,
    left(p_body, 1000),
    v_target_kind,
    nullif(left(coalesce(p_target_label, 'the proposal'), 300), ''),
    nullif(left(coalesce(p_target_secondary_label, ''), 300), ''),
    p_expected_snapshot_version
  from public.shared_link_recipients r
  where r.id = v_recipient_id
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

revoke all on function public.insert_client_comment(text, text, uuid, uuid, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.insert_client_comment(text, text, uuid, uuid, text, integer, text, text, text) to service_role;

drop function if exists public.submit_client_response(text, text, text, text, integer);

create or replace function public.submit_client_response(
  p_token_hash text,
  p_recipient_token_hash text,
  p_decision text,
  p_note text,
  p_expected_snapshot_version integer,
  p_estimate_id uuid default null,
  p_row_id uuid default null,
  p_target_kind text default 'proposal',
  p_target_label text default null,
  p_target_secondary_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_target_labels_json jsonb;
  v_estimate_id uuid := p_estimate_id;
  v_publication_id uuid;
  v_recipient_id uuid;
  v_snapshot_version integer;
  v_response_id uuid;
  v_row_estimate_id uuid;
  v_target_kind text := case
    when p_row_id is not null then 'row'
    when p_estimate_id is not null then 'estimate'
    when p_target_kind in ('proposal', 'estimate', 'row') then p_target_kind
    else 'proposal'
  end;
begin
  select id, snapshot_version, activity_target_labels_json
    into v_publication_id, v_snapshot_version, v_activity_target_labels_json
  from public.project_publications
  where token_hash = p_token_hash
    and status = 'published'
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_publication_id is null then
    raise exception 'Publication not found or expired.';
  end if;

  if p_expected_snapshot_version is null or v_snapshot_version is distinct from p_expected_snapshot_version then
    raise exception 'Publication snapshot version changed.';
  end if;

  if p_estimate_id is not null
     and not (coalesce(v_activity_target_labels_json -> 'estimateLabels', '{}'::jsonb) ? p_estimate_id::text) then
    raise exception 'Invalid review target: selected estimate is not part of this publication.';
  end if;

  if p_row_id is not null then
    if not (coalesce(v_activity_target_labels_json -> 'rowLabels', '{}'::jsonb) ? p_row_id::text) then
      raise exception 'Invalid review target: selected line item is not part of this publication.';
    end if;

    v_row_estimate_id := nullif(v_activity_target_labels_json #>> array['rowEstimateIds', p_row_id::text], '')::uuid;
    if v_row_estimate_id is null then
      raise exception 'Invalid review target: selected line item is not part of this publication.';
    end if;

    if p_estimate_id is not null and v_row_estimate_id is distinct from p_estimate_id then
      raise exception 'Invalid review target: selected line item does not belong to the selected estimate.';
    end if;

    v_estimate_id := coalesce(p_estimate_id, v_row_estimate_id);
  end if;

  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  insert into public.shared_link_responses (
    publication_id,
    recipient_id,
    decision,
    note,
    snapshot_version_at_decision,
    estimate_id,
    row_id,
    target_kind,
    target_label,
    target_secondary_label
  ) values (
    v_publication_id,
    v_recipient_id,
    p_decision,
    left(p_note, 2000),
    p_expected_snapshot_version,
    v_estimate_id,
    p_row_id,
    v_target_kind,
    nullif(left(coalesce(p_target_label, 'the proposal'), 300), ''),
    nullif(left(coalesce(p_target_secondary_label, ''), 300), '')
  )
  on conflict (recipient_id, publication_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'Decision already submitted.';
  end if;

  return v_response_id;
end;
$$;

revoke all on function public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text) to service_role;
