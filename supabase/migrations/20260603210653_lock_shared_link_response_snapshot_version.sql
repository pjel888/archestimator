-- Lock shared-link decisions to the recipient-viewed publication snapshot.
-- The route verifies the signed session against the current DB snapshot before
-- calling this RPC; the expected version argument closes the race between that
-- verification and the final response insert.

drop function if exists public.submit_client_response(text, text, text, text);

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
