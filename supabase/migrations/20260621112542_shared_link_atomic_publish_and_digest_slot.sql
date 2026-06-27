-- Shared link atomic publish and digest throttle reservation.
-- Closes the zero-live revoke/insert window for first-class publish and makes
-- the owner digest limiter a single DB-serialized reservation.

create or replace function public.reserve_security_rate_limit_slot(
  p_scope text,
  p_key_hash text,
  p_window_start timestamptz,
  p_expires_at timestamptz,
  p_metadata_json jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_scope), hashtext(p_key_hash));

  select count(*)::integer
    into v_existing_count
  from public.security_rate_limit_events
  where scope = p_scope
    and key_hash = p_key_hash
    and occurred_at >= p_window_start;

  if v_existing_count > 0 then
    return false;
  end if;

  insert into public.security_rate_limit_events (
    scope,
    key_hash,
    metadata_json,
    expires_at
  ) values (
    p_scope,
    p_key_hash,
    coalesce(p_metadata_json, '{}'::jsonb),
    p_expires_at
  );

  return true;
end;
$$;

revoke all on function public.reserve_security_rate_limit_slot(text, text, timestamptz, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.reserve_security_rate_limit_slot(text, text, timestamptz, timestamptz, jsonb)
  to service_role;

drop function if exists public.replace_project_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid[],
  uuid,
  timestamptz
);

create or replace function public.replace_project_publication(
  target_workspace_id uuid,
  target_project_id uuid,
  p_token_hash text,
  p_encrypted_token text,
  p_password_hash text,
  p_snapshot_json jsonb,
  p_activity_target_labels_json jsonb,
  p_location_visibility text,
  p_selected_estimate_ids uuid[],
  p_published_by uuid,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_publication_id uuid;
  v_snapshot_version integer;
begin
  if p_location_visibility not in ('exact', 'locality', 'hidden') then
    raise exception 'Invalid location visibility.';
  end if;

  perform 1
  from public.projects
  where id = target_project_id
    and workspace_id = target_workspace_id
  for update;

  if not found then
    raise exception 'Project not found.';
  end if;

  update public.project_publications
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where project_id = target_project_id
    and status = 'published';

  select coalesce(max(snapshot_version), 0) + 1
    into v_snapshot_version
  from public.project_publications
  where project_id = target_project_id;

  insert into public.project_publications (
    workspace_id,
    project_id,
    token_hash,
    encrypted_token,
    password_hash,
    snapshot_json,
    activity_target_labels_json,
    location_visibility,
    selected_estimate_ids,
    snapshot_version,
    published_by,
    expires_at
  ) values (
    target_workspace_id,
    target_project_id,
    p_token_hash,
    p_encrypted_token,
    p_password_hash,
    p_snapshot_json,
    coalesce(p_activity_target_labels_json, '{}'::jsonb),
    p_location_visibility,
    coalesce(p_selected_estimate_ids, '{}'::uuid[]),
    v_snapshot_version,
    p_published_by,
    p_expires_at
  )
  returning id into v_publication_id;

  return v_publication_id;
end;
$$;

revoke all on function public.replace_project_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid[],
  uuid,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.replace_project_publication(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid[],
  uuid,
  timestamptz
) to service_role;
;
