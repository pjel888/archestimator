-- Lock mass deletion storage cleanup audit writes to the server service role.
--
-- Project deletion storage cleanup runs after the destructive RPC returns. The
-- browser-authenticated user session can delete only through the preview/execute
-- flow, but it must not be able to directly rewrite cleanup audit outcomes.

drop function if exists public.record_mass_deletion_storage_cleanup_result(uuid, jsonb);
create function public.record_mass_deletion_storage_cleanup_result(target_event_id uuid, cleanup_result jsonb)
returns jsonb
language plpgsql
SECURITY DEFINER
set search_path = public
as $$
declare
  normalized_result jsonb := coalesce(cleanup_result, '{}'::jsonb);
  updated_status text := 'completed';
  updated_row public.mass_deletion_events;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role is required to record mass deletion cleanup results.' using errcode = '42501';
  end if;

  if jsonb_typeof(normalized_result) <> 'object' then
    raise exception 'Cleanup result must be a JSON object.' using errcode = '22023';
  end if;

  if normalized_result ? 'failed' and jsonb_typeof(normalized_result->'failed') <> 'array' then
    raise exception 'Cleanup result failed field must be an array.' using errcode = '22023';
  end if;

  if jsonb_array_length(coalesce(normalized_result->'failed', '[]'::jsonb)) > 0 then
    updated_status := 'storage_cleanup_failed';
  end if;

  update public.mass_deletion_events
  set storage_cleanup_result = normalized_result,
      status = updated_status
  where id = target_event_id
    and target_type = 'project'
    and status = 'storage_cleanup_pending'
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Mass deletion cleanup event not found or already finalized.' using errcode = '42501';
  end if;

  return to_jsonb(updated_row);
end;
$$;

revoke execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_mass_deletion_storage_cleanup_result(uuid, jsonb) to service_role;
