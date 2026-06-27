-- Scanner RPCs must be able to advance scan_status without breaking the
-- upload session identity/path consistency trigger.

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

select pg_notify('pgrst', 'reload schema');
