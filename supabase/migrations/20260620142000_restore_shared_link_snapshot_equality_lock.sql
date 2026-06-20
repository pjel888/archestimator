-- Restore strict snapshot-version equality for recipient writes.
--
-- A content-only republish keeps recipient/password sessions valid through
-- credentialVersion, but comments and final decisions must still be made
-- against the currently published snapshot. Otherwise an old browser tab can
-- submit feedback against proposal content the owner already replaced.

create or replace function public.insert_client_comment(
  p_token_hash text,
  p_recipient_token_hash text,
  p_estimate_id uuid,
  p_row_id uuid,
  p_body text,
  p_expected_snapshot_version integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_publication_id uuid;
  v_recipient_id uuid;
  v_snapshot_version integer;
  v_comment_id uuid;
begin
  select id, snapshot_version into v_publication_id, v_snapshot_version
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

  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  insert into public.shared_link_comments (
    publication_id, recipient_id, author_email, estimate_id, row_id, body
  )
  select
    v_publication_id,
    v_recipient_id,
    r.email,
    p_estimate_id,
    p_row_id,
    left(p_body, 1000)
  from public.shared_link_recipients r
  where r.id = v_recipient_id
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

revoke all on function public.insert_client_comment(text, text, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.insert_client_comment(text, text, uuid, uuid, text, integer) to service_role;

create or replace function public.submit_client_response(
  p_token_hash text,
  p_recipient_token_hash text,
  p_decision text,
  p_note text,
  p_expected_snapshot_version integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_publication_id uuid;
  v_recipient_id uuid;
  v_snapshot_version integer;
  v_response_id uuid;
begin
  select id, snapshot_version into v_publication_id, v_snapshot_version
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

  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  insert into public.shared_link_responses (
    publication_id, recipient_id, decision, note, snapshot_version_at_decision
  ) values (
    v_publication_id, v_recipient_id, p_decision, left(p_note, 2000), p_expected_snapshot_version
  )
  on conflict (recipient_id, publication_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'Decision already submitted.';
  end if;

  return v_response_id;
end;
$$;

revoke all on function public.submit_client_response(text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.submit_client_response(text, text, text, text, integer) to service_role;
