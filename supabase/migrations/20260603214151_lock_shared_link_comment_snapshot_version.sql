-- 20260603214151_lock_shared_link_comment_snapshot_version.sql
-- Lock shared-link comments to the recipient-viewed publication snapshot.
-- The route verifies the signed recipient session against the current DB
-- snapshot before calling this RPC; this expected version argument closes the
-- race between route verification and the final comment insert.

drop function if exists public.insert_client_comment(text, text, uuid, uuid, text);

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
