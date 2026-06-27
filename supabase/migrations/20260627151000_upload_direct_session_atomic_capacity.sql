-- Enforce direct-upload reserved-session capacity at the atomic reservation
-- point. The route-level read remains an advisory fast-fail; this function is
-- the concurrency-safe gate because the capacity count and session insert run
-- while a workspace/surface transaction advisory lock is held.

create or replace function public.create_upload_session(
  target_workspace_id uuid,
  actor_user_id uuid,
  upload_surface public.upload_surface,
  target_entity_type text,
  target_entity_id uuid,
  storage_bucket text,
  storage_path text,
  file_name text,
  content_type text,
  size_bytes bigint,
  checksum_sha256 text,
  session_expires_at timestamptz,
  metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_id uuid;
  metadata_payload jsonb := coalesce(metadata, '{}'::jsonb);
  requested_workspace_id uuid := target_workspace_id;
  requested_actor_user_id uuid := actor_user_id;
  requested_surface public.upload_surface := upload_surface;
  active_actor_session_count integer := 0;
  active_workspace_session_count integer := 0;
  initial_scan_status public.upload_scan_status := case
    when upload_surface = 'component-attachment' then 'pending'::public.upload_scan_status
    else 'not_required'::public.upload_scan_status
  end;
begin
  if auth.role() <> 'service_role' then
    raise exception 'create_upload_session requires service_role' using errcode = '42501';
  end if;

  if session_expires_at is null or session_expires_at <= now() then
    raise exception 'Upload session expiry must be in the future.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = requested_workspace_id
      and member.user_id = requested_actor_user_id
  ) then
    raise exception 'Upload actor is not a workspace member.' using errcode = '42501';
  end if;

  if requested_surface = 'component-attachment' then
    perform pg_advisory_xact_lock(
      hashtextextended('upload-session-capacity:' || requested_workspace_id::text || ':' || requested_surface::text, 0)
    );

    select count(*) into active_actor_session_count
    from public.upload_sessions upload_session
    where upload_session.workspace_id = requested_workspace_id
      and upload_session.actor_user_id = requested_actor_user_id
      and upload_session.surface = requested_surface
      and upload_session.status = 'reserved'
      and upload_session.expires_at > now();

    if active_actor_session_count >= 3 then
      raise exception 'Upload direct session actor capacity exceeded.' using errcode = '53300';
    end if;

    select count(*) into active_workspace_session_count
    from public.upload_sessions upload_session
    where upload_session.workspace_id = requested_workspace_id
      and upload_session.surface = requested_surface
      and upload_session.status = 'reserved'
      and upload_session.expires_at > now();

    if active_workspace_session_count >= 6 then
      raise exception 'Upload direct session workspace capacity exceeded.' using errcode = '53300';
    end if;
  end if;

  insert into public.upload_sessions (
    workspace_id,
    actor_user_id,
    surface,
    target_entity_type,
    target_entity_id,
    storage_bucket,
    storage_path,
    file_name,
    content_type,
    size_bytes,
    checksum_sha256,
    status,
    scan_status,
    metadata,
    expires_at
  )
  values (
    requested_workspace_id,
    requested_actor_user_id,
    requested_surface,
    nullif(trim(coalesce(target_entity_type, '')), ''),
    target_entity_id,
    storage_bucket,
    storage_path,
    file_name,
    content_type,
    size_bytes,
    nullif(lower(trim(coalesce(checksum_sha256, ''))), ''),
    'reserved',
    initial_scan_status,
    metadata_payload,
    session_expires_at
  )
  returning id into session_id;

  insert into public.upload_events (
    upload_session_id,
    upload_asset_id,
    workspace_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    session_id,
    null,
    requested_workspace_id,
    requested_actor_user_id,
    'session_reserved',
    jsonb_build_object('expiresAt', session_expires_at) || metadata_payload
  );

  return jsonb_build_object(
    'uploadSessionId', session_id,
    'expiresAt', session_expires_at
  );
end;
$$;

revoke execute on function public.create_upload_session(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, bigint, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.create_upload_session(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, bigint, text, timestamptz, jsonb) to service_role;

select pg_notify('pgrst', 'reload schema');
