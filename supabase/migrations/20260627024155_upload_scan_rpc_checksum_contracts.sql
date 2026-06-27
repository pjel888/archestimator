-- Repair the linked-provider scanner RPC contract after the original lifecycle
-- migration was applied with an older signature. Scanner results and overrides
-- must be checksum-bound before they count as provider proof.

drop function if exists public.record_upload_scan_result(uuid, text, public.upload_scan_status, jsonb);
drop function if exists public.record_upload_scan_result(uuid, text, text, public.upload_scan_status, jsonb);
drop function if exists public.approve_upload_scan_override(uuid, uuid, text, timestamptz, text);

create or replace function public.record_upload_scan_result(
  target_asset_id uuid,
  expected_checksum_sha256 text,
  scanner_provider text,
  scanner_status public.upload_scan_status,
  scanner_result jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  asset_row public.upload_assets%rowtype;
  next_event_type public.upload_event_type;
begin
  if auth.role() <> 'service_role' then
    raise exception 'record_upload_scan_result requires service_role' using errcode = '42501';
  end if;

  select * into asset_row
  from public.upload_assets
  where id = target_asset_id
  for update;

  if not found then
    raise exception 'Upload asset was not found.' using errcode = 'P0002';
  end if;

  if asset_row.surface <> 'component-attachment' then
    raise exception 'Only component attachments can receive scanner results.' using errcode = '23514';
  end if;

  if asset_row.checksum_sha256 is distinct from expected_checksum_sha256 then
    raise exception 'Scan result checksum does not match the uploaded asset.' using errcode = '23514';
  end if;

  if scanner_status not in ('clean', 'infected', 'failed_transient', 'failed_permanent', 'unsupported') then
    raise exception 'Scanner result status is invalid.' using errcode = '23514';
  end if;

  next_event_type := case scanner_status
    when 'clean' then 'scan_clean'::public.upload_event_type
    when 'infected' then 'scan_infected'::public.upload_event_type
    when 'failed_transient' then 'scan_failed_transient'::public.upload_event_type
    when 'failed_permanent' then 'scan_failed_permanent'::public.upload_event_type
    else 'scan_unsupported'::public.upload_event_type
  end;

  update public.upload_assets
  set scan_status = scanner_status,
      scan_provider = nullif(trim(coalesce(scanner_provider, '')), ''),
      scan_result = coalesce(scanner_result, '{}'::jsonb),
      scanned_at = now(),
      updated_at = now()
  where id = asset_row.id
  returning * into asset_row;

  insert into public.upload_events (
    upload_session_id,
    upload_asset_id,
    workspace_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    asset_row.upload_session_id,
    asset_row.id,
    asset_row.workspace_id,
    asset_row.actor_user_id,
    next_event_type,
    jsonb_build_object(
      'scanProvider', scanner_provider,
      'scanStatus', scanner_status,
      'scanResult', coalesce(scanner_result, '{}'::jsonb)
    )
  );

  return jsonb_build_object(
    'assetId', asset_row.id,
    'scanStatus', asset_row.scan_status,
    'scanProvider', asset_row.scan_provider,
    'scannedAt', asset_row.scanned_at
  );
end;
$$;

create or replace function public.approve_upload_scan_override(
  target_asset_id uuid,
  override_actor_user_id uuid,
  override_reason text,
  override_expires_at timestamptz,
  expected_checksum_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  asset_row public.upload_assets%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'approve_upload_scan_override requires service_role' using errcode = '42501';
  end if;

  select * into asset_row
  from public.upload_assets
  where id = target_asset_id
  for update;

  if not found then
    raise exception 'Upload asset was not found.' using errcode = 'P0002';
  end if;

  if asset_row.surface <> 'component-attachment' then
    raise exception 'Only component attachments can receive scan overrides.' using errcode = '23514';
  end if;

  if asset_row.scan_status not in ('failed_permanent', 'unsupported') then
    raise exception 'Only permanent scanner failures or unsupported files can be override-approved.' using errcode = '23514';
  end if;

  if asset_row.checksum_sha256 is distinct from expected_checksum_sha256 then
    raise exception 'Scan override checksum does not match the uploaded asset.' using errcode = '23514';
  end if;

  if override_actor_user_id is null
    or char_length(trim(coalesce(override_reason, ''))) < 8
    or override_expires_at is null
    or override_expires_at <= now() then
    raise exception 'Scan override requires actor, reason, and future expiry.' using errcode = '23514';
  end if;

  update public.upload_assets
  set scan_status = 'override_approved',
      scan_override_actor_user_id = override_actor_user_id,
      scan_override_reason = override_reason,
      scan_override_expires_at = override_expires_at,
      scan_override_checksum_sha256 = expected_checksum_sha256,
      updated_at = now()
  where id = asset_row.id
  returning * into asset_row;

  insert into public.upload_events (
    upload_session_id,
    upload_asset_id,
    workspace_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    asset_row.upload_session_id,
    asset_row.id,
    asset_row.workspace_id,
    override_actor_user_id,
    'scan_override_approved'::public.upload_event_type,
    jsonb_build_object(
      'reason', override_reason,
      'expiresAt', override_expires_at,
      'checksumSha256', expected_checksum_sha256
    )
  );

  return jsonb_build_object(
    'assetId', asset_row.id,
    'scanStatus', asset_row.scan_status,
    'overrideExpiresAt', asset_row.scan_override_expires_at
  );
end;
$$;

revoke execute on function public.record_upload_scan_result(uuid, text, text, public.upload_scan_status, jsonb) from public, anon, authenticated;
revoke execute on function public.approve_upload_scan_override(uuid, uuid, text, timestamptz, text) from public, anon, authenticated;

grant execute on function public.record_upload_scan_result(uuid, text, text, public.upload_scan_status, jsonb) to service_role;
grant execute on function public.approve_upload_scan_override(uuid, uuid, text, timestamptz, text) to service_role;

select pg_notify('pgrst', 'reload schema');
