-- Shared link D1-D11 hardening.
-- Promotes the ratified beta gates for location privacy, named approval audit,
-- durable owner digest logging, one-live-publication guard, and manager-read telemetry RLS.

alter table public.project_publications
  add column if not exists location_visibility text;

update public.project_publications
set location_visibility = coalesce(nullif(location_visibility, ''), 'locality')
where location_visibility is null or location_visibility = '';

alter table public.project_publications
  alter column location_visibility set default 'locality',
  alter column location_visibility set not null;

alter table public.project_publications
  drop constraint if exists project_publications_location_visibility_check,
  add constraint project_publications_location_visibility_check
    check (location_visibility in ('exact', 'locality', 'hidden'));

alter table public.shared_link_responses
  add column if not exists signer_name text,
  add column if not exists signature_intent_hash text;

alter table public.shared_link_responses
  drop constraint if exists shared_link_responses_signer_name_check,
  add constraint shared_link_responses_signer_name_check
    check (signer_name is null or char_length(signer_name) <= 120),
  drop constraint if exists shared_link_responses_signature_intent_hash_check,
  add constraint shared_link_responses_signature_intent_hash_check
    check (signature_intent_hash is null or signature_intent_hash ~ '^[a-f0-9]{64}$');

create table if not exists public.publication_digest_log (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  activity_kind text not null check (activity_kind in ('comment', 'decision')),
  delivery_status text not null check (delivery_status in ('sent', 'mocked', 'failed', 'skipped', 'rate_limited')),
  owner_email_hash text,
  resend_message_id text,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists publication_digest_log_publication_idx
  on public.publication_digest_log(publication_id, created_at desc);

alter table public.publication_digest_log enable row level security;

drop policy if exists "project publication managers can read publication digest log" on public.publication_digest_log;
create policy "project publication managers can read publication digest log"
  on public.publication_digest_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_publications pp
      where pp.id = publication_digest_log.publication_id
        and public.can_manage_project_publication(pp.project_id)
    )
  );

revoke all on table public.publication_digest_log from public, anon, authenticated;
grant select on table public.publication_digest_log to authenticated;
grant select, insert on table public.publication_digest_log to service_role;

drop function if exists public.submit_client_response(text, text, text, text, integer);
drop function if exists public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text);
drop function if exists public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text, text, text);

create or replace function public.submit_client_response(
  p_token_hash text,
  p_recipient_token_hash text,
  p_decision text,
  p_note text,
  p_expected_snapshot_version integer,
  p_estimate_id uuid default null,
  p_row_id uuid default null,
  p_signer_name text default null,
  p_signature_intent_hash text default null,
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
  v_response_id uuid;
  v_row_estimate_id uuid;
  v_signature_intent_hash text := null;
  v_signer_name text := nullif(left(trim(coalesce(p_signer_name, '')), 120), '');
  v_snapshot_version integer;
  v_submitted_at timestamptz := now();
  v_target_kind text := case
    when p_row_id is not null then 'row'
    when p_estimate_id is not null then 'estimate'
    when p_target_kind in ('proposal', 'estimate', 'row') then p_target_kind
    else 'proposal'
  end;
begin
  if p_decision not in ('accepted', 'declined', 'revision_requested') then
    raise exception 'Invalid decision.';
  end if;

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

  if p_decision = 'accepted' then
    if v_signer_name is null then
      raise exception 'Signer name is required for accepted decisions.';
    end if;
    v_signature_intent_hash := encode(
      extensions.digest(
        v_publication_id::text || ':' || p_expected_snapshot_version::text || ':' || v_signer_name || ':' || v_submitted_at::text,
        'sha256'
      ),
      'hex'
    );
  else
    v_signer_name := null;
  end if;

  insert into public.shared_link_responses (
    publication_id,
    recipient_id,
    decision,
    note,
    snapshot_version_at_decision,
    estimate_id,
    row_id,
    signer_name,
    signature_intent_hash,
    target_kind,
    target_label,
    target_secondary_label,
    created_at
  ) values (
    v_publication_id,
    v_recipient_id,
    p_decision,
    left(p_note, 2000),
    p_expected_snapshot_version,
    v_estimate_id,
    p_row_id,
    v_signer_name,
    v_signature_intent_hash,
    v_target_kind,
    nullif(left(coalesce(p_target_label, 'the proposal'), 300), ''),
    nullif(left(coalesce(p_target_secondary_label, ''), 300), ''),
    v_submitted_at
  )
  on conflict (recipient_id, publication_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'Decision already submitted.';
  end if;

  return v_response_id;
end;
$$;

revoke all on function public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_client_response(text, text, text, text, integer, uuid, uuid, text, text, text, text, text) to service_role;

with ranked as (
  select
    id,
    row_number() over (partition by project_id order by published_at desc, id desc) as rn
  from public.project_publications
  where status = 'published'
)
update public.project_publications pp
set status = 'revoked',
    revoked_at = now(),
    updated_at = now()
from ranked
where pp.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists project_publications_one_published_per_project_idx
  on public.project_publications(project_id)
  where status = 'published';

drop policy if exists "project publication managers can read publication events" on public.project_publication_events;

create policy "project publication managers can read publication events"
  on public.project_publication_events
  for select
  to authenticated
  using (
    publication_id in (
      select id
      from public.project_publications
      where public.can_manage_project_publication(project_id)
    )
  );

grant select on table public.project_publication_events to authenticated;
