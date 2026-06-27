-- Provider-neutral upload ledger. Application routes own object writes through
-- service-role brokers; authenticated users can only read descriptors through
-- narrow RPCs and RLS-aware policies.

create extension if not exists pgcrypto;

do $$
begin
  create type public.upload_surface as enum ('project-image', 'component-image', 'component-attachment');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.upload_session_status as enum ('pending', 'finalized', 'failed', 'aborted');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.upload_asset_status as enum ('finalized', 'removed');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.upload_scan_status as enum ('not_required', 'pending', 'clean', 'failed', 'infected', 'unsupported');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.upload_event_type as enum (
    'upload_started',
    'asset_finalized',
    'scan_pending',
    'scan_clean',
    'scan_infected',
    'download_url_issued',
    'cleanup_queued',
    'cleanup_failed',
    'cleanup_succeeded'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  surface public.upload_surface not null,
  target_entity_type text,
  target_entity_id uuid,
  storage_bucket text not null,
  storage_path text not null,
  original_file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum_sha256 text,
  status public.upload_session_status not null default 'finalized',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint upload_sessions_storage_path_safe check (
    storage_path !~ '(^/|//|\\.\\.)'
    and char_length(storage_path) <= 1024
  ),
  constraint upload_sessions_bucket_matches_surface check (
    (surface = 'project-image' and storage_bucket = 'project-images')
    or (surface = 'component-image' and storage_bucket = 'component-images')
    or (surface = 'component-attachment' and storage_bucket = 'component-attachments')
  ),
  constraint upload_sessions_path_matches_actor check (
    storage_path like workspace_id::text || '/' || actor_user_id::text || '/%'
  ),
  constraint upload_sessions_project_path_shape check (
    surface <> 'project-image'
    or storage_path like workspace_id::text || '/' || actor_user_id::text || '/project-images/' || coalesce(target_entity_id::text, '') || '/%'
  )
);

create table if not exists public.upload_assets (
  id uuid primary key default gen_random_uuid(),
  upload_session_id uuid not null references public.upload_sessions(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  surface public.upload_surface not null,
  target_entity_type text,
  target_entity_id uuid,
  storage_bucket text not null,
  storage_path text not null,
  thumbnail_path text,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum_sha256 text,
  status public.upload_asset_status not null default 'finalized',
  scan_status public.upload_scan_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint upload_assets_storage_path_key unique (storage_bucket, storage_path),
  constraint upload_assets_storage_path_safe check (
    storage_path !~ '(^/|//|\\.\\.)'
    and char_length(storage_path) <= 1024
    and (thumbnail_path is null or (thumbnail_path !~ '(^/|//|\\.\\.)' and char_length(thumbnail_path) <= 1024))
  ),
  constraint upload_assets_bucket_matches_surface check (
    (surface = 'project-image' and storage_bucket = 'project-images')
    or (surface = 'component-image' and storage_bucket = 'component-images')
    or (surface = 'component-attachment' and storage_bucket = 'component-attachments')
  ),
  constraint upload_assets_path_matches_actor check (
    storage_path like workspace_id::text || '/' || actor_user_id::text || '/%'
  ),
  constraint upload_assets_project_path_shape check (
    surface <> 'project-image'
    or storage_path like workspace_id::text || '/' || actor_user_id::text || '/project-images/' || coalesce(target_entity_id::text, '') || '/%'
    or storage_path like workspace_id::text || '/' || actor_user_id::text || '/project-images/' || coalesce(target_entity_id::text, '') || '/estimate-row-images/%'
  )
);

create table if not exists public.upload_events (
  id uuid primary key default gen_random_uuid(),
  upload_session_id uuid references public.upload_sessions(id) on delete cascade,
  upload_asset_id uuid references public.upload_assets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.upload_event_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists upload_sessions_workspace_actor_idx on public.upload_sessions(workspace_id, actor_user_id, created_at desc);
create index if not exists upload_sessions_target_idx on public.upload_sessions(surface, target_entity_type, target_entity_id);
create index if not exists upload_assets_workspace_actor_idx on public.upload_assets(workspace_id, actor_user_id, created_at desc);
create index if not exists upload_assets_session_idx on public.upload_assets(upload_session_id);
create index if not exists upload_assets_target_idx on public.upload_assets(surface, target_entity_type, target_entity_id);
create index if not exists upload_events_workspace_created_idx on public.upload_events(workspace_id, created_at desc);
create index if not exists upload_events_asset_idx on public.upload_events(upload_asset_id, created_at desc);

alter table public.upload_sessions enable row level security;
alter table public.upload_assets enable row level security;
alter table public.upload_events enable row level security;

drop policy if exists "members can read own upload sessions" on public.upload_sessions;
create policy "members can read own upload sessions"
  on public.upload_sessions
  for select
  to authenticated
  using (
    actor_user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists "members can read own upload assets" on public.upload_assets;
create policy "members can read own upload assets"
  on public.upload_assets
  for select
  to authenticated
  using (
    actor_user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists "members can read own upload events" on public.upload_events;
create policy "members can read own upload events"
  on public.upload_events
  for select
  to authenticated
  using (
    actor_user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

revoke all on public.upload_sessions from public, anon, authenticated;
revoke all on public.upload_assets from public, anon, authenticated;
revoke all on public.upload_events from public, anon, authenticated;
grant all on public.upload_sessions to service_role;
grant all on public.upload_assets to service_role;
grant all on public.upload_events to service_role;

create or replace function public.enforce_upload_asset_session_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.upload_sessions%rowtype;
begin
  select * into session_row
  from public.upload_sessions
  where id = new.upload_session_id;

  if not found then
    raise exception 'Upload session was not found.' using errcode = '23503';
  end if;

  if session_row.workspace_id <> new.workspace_id
    or session_row.actor_user_id <> new.actor_user_id
    or session_row.surface <> new.surface
    or session_row.target_entity_type is distinct from new.target_entity_type
    or session_row.target_entity_id is distinct from new.target_entity_id
    or session_row.storage_bucket <> new.storage_bucket
    or session_row.storage_path <> new.storage_path then
    raise exception 'Upload asset does not match its session.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_upload_asset_session_consistency on public.upload_assets;
create trigger enforce_upload_asset_session_consistency
before insert or update of upload_session_id, workspace_id, actor_user_id, surface, target_entity_type, target_entity_id, storage_bucket, storage_path
on public.upload_assets
for each row
execute function public.enforce_upload_asset_session_consistency();

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
    original_file_name,
    content_type,
    size_bytes,
    checksum_sha256,
    status,
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
    checksum_sha256,
    'finalized',
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
    checksum_sha256,
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
    case when scan_status = 'pending' then 'scan_pending' else 'asset_finalized' end,
    jsonb_build_object('scanStatus', scan_status) || metadata_payload
  );

  return jsonb_build_object(
    'uploadSessionId', session_id,
    'assetId', asset_id,
    'scanStatus', scan_status
  );
end;
$$;

create or replace function public.get_upload_asset_descriptor(target_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.upload_assets%rowtype;
begin
  select * into target_row
  from public.upload_assets
  where id = target_asset_id
    and status = 'finalized';

  if not found then
    return null;
  end if;

  if target_row.actor_user_id <> (select auth.uid()) then
    return null;
  end if;

  if not public.is_workspace_member(target_row.workspace_id) then
    return null;
  end if;

  return jsonb_build_object(
    'assetId', target_row.id,
    'uploadSessionId', target_row.upload_session_id,
    'bucket', target_row.storage_bucket,
    'path', target_row.storage_path,
    'thumbnailPath', target_row.thumbnail_path,
    'fileName', target_row.file_name,
    'contentType', target_row.content_type,
    'sizeBytes', target_row.size_bytes,
    'scanStatus', target_row.scan_status,
    'metadata', target_row.metadata
  );
end;
$$;

create or replace function public.validate_estimate_row_image_asset(
  target_asset_id uuid,
  target_upload_session_id uuid,
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  project_workspace_id uuid;
  asset_row public.upload_assets%rowtype;
begin
  select project.workspace_id into project_workspace_id
  from public.projects project
  where project.id = target_project_id;

  if not found then
    return null;
  end if;

  if not public.is_workspace_member(project_workspace_id) then
    return null;
  end if;

  if not exists (
    select 1
    from public.estimates estimate
    where estimate.id = target_estimate_id
      and estimate.project_id = target_project_id
  ) then
    return null;
  end if;

  if not exists (
    select 1
    from public.estimate_row_items row_item
    where row_item.id = target_row_id
      and row_item.estimate_id = target_estimate_id
  ) then
    return null;
  end if;

  select * into asset_row
  from public.upload_assets
  where id = target_asset_id
    and upload_session_id = target_upload_session_id
    and status = 'finalized';

  if not found then
    return null;
  end if;

  if asset_row.workspace_id is distinct from project_workspace_id
    or asset_row.actor_user_id <> (select auth.uid())
    or asset_row.surface is distinct from 'project-image'
    or asset_row.target_entity_type is distinct from 'estimate-row'
    or asset_row.target_entity_id is distinct from target_project_id
    or asset_row.storage_bucket is distinct from 'project-images'
    or asset_row.scan_status is distinct from 'not_required'
    or asset_row.metadata->>'projectId' is distinct from target_project_id::text
    or asset_row.metadata->>'estimateId' is distinct from target_estimate_id::text
    or asset_row.metadata->>'rowItemId' is distinct from target_row_id::text then
    return null;
  end if;

  return jsonb_build_object(
    'assetId', asset_row.id,
    'uploadSessionId', asset_row.upload_session_id,
    'bucket', asset_row.storage_bucket,
    'path', asset_row.storage_path,
    'thumbnailPath', asset_row.thumbnail_path,
    'fileName', asset_row.file_name,
    'contentType', asset_row.content_type,
    'sizeBytes', asset_row.size_bytes,
    'scanStatus', asset_row.scan_status,
    'metadata', asset_row.metadata
  );
end;
$$;

revoke execute on function public.record_upload_asset(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, text, bigint, text, public.upload_scan_status, jsonb) from public, anon, authenticated;
revoke execute on function public.get_upload_asset_descriptor(uuid) from public, anon;
revoke execute on function public.validate_estimate_row_image_asset(uuid, uuid, uuid, uuid, uuid) from public, anon;

grant execute on function public.record_upload_asset(uuid, uuid, public.upload_surface, text, uuid, text, text, text, text, text, bigint, text, public.upload_scan_status, jsonb) to service_role;
grant execute on function public.get_upload_asset_descriptor(uuid) to authenticated, service_role;
grant execute on function public.validate_estimate_row_image_asset(uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
