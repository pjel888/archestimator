drop function if exists public.rotate_project_publication_credentials(uuid, text, text, text, jsonb, uuid[], integer);

create or replace function public.rotate_project_publication_credentials(
  target_publication_id uuid,
  expected_encrypted_token text,
  p_token_hash text,
  p_encrypted_token text,
  p_password_hash text,
  p_snapshot_json jsonb,
  p_selected_estimate_ids uuid[]
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

revoke all on function public.rotate_project_publication_credentials(uuid, text, text, text, text, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.rotate_project_publication_credentials(uuid, text, text, text, text, jsonb, uuid[]) to service_role;

create or replace function public.persist_shared_link_recipient_resend(
  target_publication_id uuid,
  target_recipient_id uuid,
  expected_encrypted_token text,
  p_recipient_token_hash text,
  p_resend_email_id text,
  p_invited_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_encrypted_token text;
begin
  select encrypted_token into v_encrypted_token
  from public.project_publications
  where id = target_publication_id
  for update;

  if v_encrypted_token is null or v_encrypted_token is distinct from expected_encrypted_token then
    return false;
  end if;

  update public.shared_link_recipients
  set recipient_token_hash = p_recipient_token_hash,
      delivery_status = 'sent',
      resend_email_id = p_resend_email_id,
      invited_by = p_invited_by,
      updated_at = now()
  where publication_id = target_publication_id
    and id = target_recipient_id;

  return found;
end;
$$;

revoke all on function public.persist_shared_link_recipient_resend(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.persist_shared_link_recipient_resend(uuid, uuid, text, text, text, uuid) to service_role;

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

  if p_expected_snapshot_version is null or p_expected_snapshot_version < 1 or p_expected_snapshot_version > v_snapshot_version then
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

  if p_expected_snapshot_version is null or p_expected_snapshot_version < 1 or p_expected_snapshot_version > v_snapshot_version then
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
