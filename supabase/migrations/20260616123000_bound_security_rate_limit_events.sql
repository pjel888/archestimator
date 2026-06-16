create or replace function public.check_security_rate_limit_event(
  event_scope text,
  event_key_hash text,
  event_metadata_json jsonb,
  event_expires_at timestamptz,
  window_start timestamptz,
  max_events integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_events integer;
begin
  if event_scope is null or btrim(event_scope) = '' then
    raise exception 'event_scope is required';
  end if;
  if event_key_hash is null or btrim(event_key_hash) = '' then
    raise exception 'event_key_hash is required';
  end if;
  if max_events < 1 then
    raise exception 'max_events must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(event_scope), hashtext(event_key_hash));

  delete from public.security_rate_limit_events
  where scope = event_scope
    and key_hash = event_key_hash
    and expires_at < now();

  select count(*)
    into current_events
  from public.security_rate_limit_events
  where scope = event_scope
    and key_hash = event_key_hash
    and occurred_at >= window_start;

  if current_events >= max_events then
    return false;
  end if;

  insert into public.security_rate_limit_events(
    scope,
    key_hash,
    metadata_json,
    expires_at
  ) values (
    event_scope,
    event_key_hash,
    coalesce(event_metadata_json, '{}'::jsonb),
    event_expires_at
  );

  return true;
end;
$$;

revoke all on function public.check_security_rate_limit_event(text, text, jsonb, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.check_security_rate_limit_event(text, text, jsonb, timestamptz, timestamptz, integer) to service_role;
