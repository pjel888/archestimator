-- Ensure event CASE expressions inserted by upload RPCs resolve to the
-- upload_event_type enum on the linked provider.

drop function if exists public.record_upload_asset(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, text, bigint, text, public.upload_scan_status, jsonb);
drop function if exists public.finalize_upload_session(uuid, uuid, uuid, text, bigint, text, text, public.upload_scan_status, jsonb);

create or replace function public.record_upload_asset(
  target_workspace_id uuid,
  actor_user_id uuid,
  upload_surface public.upload_surface,
  target_entity_type text,
  target_entity_id uuid,
  storage_bucket text,
  storage_path text,
  thumbnail_path text,
  file_name text,
  content_type text,
  size_bytes bigint,
  checksum_sha256 text,
  scan_status public.upload_scan_status,
  metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_id uuid;
  asset_id uuid;
  metadata_payload jsonb := coalesce(metadata, '{}'::jsonb);
begin
  if auth.role() <> 'service_role' then
    raise exception 'record_upload_asset requires service_role' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = actor_user_id
  ) then
    raise exception 'Upload actor is not a workspace member.' using errcode = '42501';
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
    finalized_at
  )
  values (
    target_workspace_id,
    actor_user_id,
    upload_surface,
    nullif(trim(coalesce(target_entity_type, '')), ''),
    target_entity_id,
    storage_bucket,
    storage_path,
    file_name,
    content_type,
    size_bytes,
    nullif(lower(trim(coalesce(checksum_sha256, ''))), ''),
    'finalized',
    scan_status,
    metadata_payload,
    now()
  )
  returning id into session_id;

  insert into public.upload_assets (
    upload_session_id,
    workspace_id,
    actor_user_id,
    surface,
    target_entity_type,
    target_entity_id,
    storage_bucket,
    storage_path,
    thumbnail_path,
    file_name,
    content_type,
    size_bytes,
    checksum_sha256,
    status,
    scan_status,
    metadata
  )
  values (
    session_id,
    target_workspace_id,
    actor_user_id,
    upload_surface,
    nullif(trim(coalesce(target_entity_type, '')), ''),
    target_entity_id,
    storage_bucket,
    storage_path,
    thumbnail_path,
    file_name,
    content_type,
    size_bytes,
    nullif(lower(trim(coalesce(checksum_sha256, ''))), ''),
    'finalized',
    scan_status,
    metadata_payload
  )
  returning id into asset_id;

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
    asset_id,
    target_workspace_id,
    actor_user_id,
    (case when scan_status = 'pending' then 'scan_pending' else 'asset_finalized' end)::public.upload_event_type,
    jsonb_build_object('scanStatus', scan_status) || metadata_payload
  );

  return jsonb_build_object(
    'uploadSessionId', session_id,
    'assetId', asset_id,
    'scanStatus', scan_status
  );
end;
$$;

create or replace function public.finalize_upload_session(
  target_upload_session_id uuid,
  target_workspace_id uuid,
  actor_user_id uuid,
  observed_content_type text,
  observed_size_bytes bigint,
  observed_checksum_sha256 text,
  observed_etag text,
  scan_status public.upload_scan_status,
  metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.upload_sessions%rowtype;
  asset_row public.upload_assets%rowtype;
  asset_id uuid;
  metadata_payload jsonb := coalesce(metadata, '{}'::jsonb);
  normalized_observed_checksum text := nullif(lower(trim(coalesce(observed_checksum_sha256, ''))), '');
  normalized_expected_checksum text;
  normalized_etag text := nullif(trim(coalesce(observed_etag, '')), '');
  requested_scan_status public.upload_scan_status := scan_status;
begin
  if auth.role() <> 'service_role' then
    raise exception 'finalize_upload_session requires service_role' using errcode = '42501';
  end if;

  if requested_scan_status not in ('not_required', 'pending') then
    raise exception 'Initial upload finalization only accepts not_required or pending scan status.' using errcode = '22023';
  end if;

  select * into session_row
  from public.upload_sessions
  where id = target_upload_session_id
  for update;

  if not found
    or session_row.workspace_id <> target_workspace_id
    or session_row.actor_user_id <> actor_user_id then
    raise exception 'Upload session was not found.' using errcode = '42501';
  end if;

  if session_row.status = 'finalized' then
    select * into asset_row
    from public.upload_assets
    where upload_session_id = session_row.id
    limit 1;

    if not found then
      raise exception 'Finalized upload session has no asset.' using errcode = '23503';
    end if;

    return jsonb_build_object(
      'uploadSessionId', asset_row.upload_session_id,
      'assetId', asset_row.id,
      'scanStatus', asset_row.scan_status
    );
  end if;

  if session_row.status <> 'reserved' then
    raise exception 'Upload session is not reserved.' using errcode = '22023';
  end if;

  if session_row.expires_at is null or session_row.expires_at <= now() then
    raise exception 'Upload session expired.' using errcode = '22023';
  end if;

  if session_row.content_type <> observed_content_type then
    raise exception 'Upload content type mismatch.' using errcode = '23514';
  end if;

  if session_row.size_bytes <> observed_size_bytes then
    raise exception 'Upload size mismatch.' using errcode = '23514';
  end if;

  normalized_expected_checksum := nullif(lower(trim(coalesce(session_row.checksum_sha256, ''))), '');
  if normalized_expected_checksum is not null
    and normalized_observed_checksum is not null
    and normalized_expected_checksum <> normalized_observed_checksum then
    raise exception 'Upload checksum mismatch.' using errcode = '23514';
  end if;

  if normalized_observed_checksum is null and normalized_etag is null then
    raise exception 'Upload finalization requires checksum or ETag proof.' using errcode = '23514';
  end if;

  update public.upload_sessions
  set
    status = 'finalized',
    scan_status = requested_scan_status,
    finalized_at = now(),
    metadata = coalesce(session_row.metadata, '{}'::jsonb) || metadata_payload
  where id = session_row.id;

  insert into public.upload_assets (
    upload_session_id,
    workspace_id,
    actor_user_id,
    surface,
    target_entity_type,
    target_entity_id,
    storage_bucket,
    storage_path,
    thumbnail_path,
    file_name,
    content_type,
    size_bytes,
    checksum_sha256,
    status,
    scan_status,
    metadata
  )
  values (
    session_row.id,
    session_row.workspace_id,
    session_row.actor_user_id,
    session_row.surface,
    session_row.target_entity_type,
    session_row.target_entity_id,
    session_row.storage_bucket,
    session_row.storage_path,
    null,
    session_row.file_name,
    session_row.content_type,
    session_row.size_bytes,
    coalesce(normalized_expected_checksum, normalized_observed_checksum),
    'finalized',
    requested_scan_status,
    coalesce(session_row.metadata, '{}'::jsonb) || jsonb_build_object('providerEtag', normalized_etag) || metadata_payload
  )
  returning id into asset_id;

  insert into public.upload_events (
    upload_session_id,
    upload_asset_id,
    workspace_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    session_row.id,
    asset_id,
    session_row.workspace_id,
    session_row.actor_user_id,
    (case when requested_scan_status = 'pending' then 'scan_pending' else 'asset_finalized' end)::public.upload_event_type,
    jsonb_build_object('scanStatus', requested_scan_status, 'providerEtag', normalized_etag) || metadata_payload
  );

  return jsonb_build_object(
    'uploadSessionId', session_row.id,
    'assetId', asset_id,
    'scanStatus', requested_scan_status
  );
end;
$$;

revoke execute on function public.record_upload_asset(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, text, bigint, text, public.upload_scan_status, jsonb) from public, anon, authenticated;
revoke execute on function public.finalize_upload_session(uuid, uuid, uuid, text, bigint, text, text, public.upload_scan_status, jsonb) from public, anon, authenticated;

grant execute on function public.record_upload_asset(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, text, bigint, text, public.upload_scan_status, jsonb) to service_role;
grant execute on function public.finalize_upload_session(uuid, uuid, uuid, text, bigint, text, text, public.upload_scan_status, jsonb) to service_role;

select pg_notify('pgrst', 'reload schema');
