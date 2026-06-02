-- Harden beta allowlist administration against self-writable profile role escalation.

-- Profiles remain user-readable under RLS, but platform roles must not be
-- writable through browser/authenticated table grants. Keep only the profile
-- fields the app updates directly self-writable.
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, default_workspace_id) on table public.profiles to authenticated;

-- The allowlist is sensitive access-control data. Remove direct browser table
-- reachability and require hardened RPCs that derive the actor from auth.uid().
revoke all on table public.closed_beta_allowed_emails from anon, authenticated;

drop policy if exists "platform admins can review closed beta allowlist" on public.closed_beta_allowed_emails;
drop policy if exists "platform admins can add closed beta allowlist rows" on public.closed_beta_allowed_emails;
drop policy if exists "platform admins can update closed beta allowlist rows" on public.closed_beta_allowed_emails;

create or replace function public.read_closed_beta_allowlist_queue(requested_status text default null)
returns table(
  id uuid,
  normalized_email text,
  status text,
  invited_by uuid,
  invited_at timestamptz,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    beta.id,
    beta.normalized_email,
    beta.status,
    beta.invited_by,
    beta.invited_at,
    beta.accepted_at,
    beta.notes,
    beta.created_at,
    beta.updated_at
  from public.closed_beta_allowed_emails beta
  where public.is_platform_admin()
    and (requested_status is null or beta.status = requested_status)
    and (requested_status is null or requested_status in ('invited', 'active', 'revoked'))
  order by beta.created_at desc
  limit 100;
$$;

create or replace function public.create_closed_beta_allowlist_entry(
  entry_email text,
  entry_status text,
  entry_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  created_id uuid;
begin
  if actor_id is null or not public.is_platform_admin() then
    raise exception 'Only platform admins can manage closed beta allowlist entries.' using errcode = '42501';
  end if;

  insert into public.closed_beta_allowed_emails (normalized_email, status, invited_by, notes, metadata)
  values (lower(btrim(coalesce(entry_email, ''))), entry_status, actor_id, entry_notes, '{}'::jsonb)
  returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.update_closed_beta_allowlist_entry(
  entry_id uuid,
  entry_status text,
  entry_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Only platform admins can manage closed beta allowlist entries.' using errcode = '42501';
  end if;

  update public.closed_beta_allowed_emails
  set status = entry_status,
      notes = entry_notes
  where id = entry_id;
end;
$$;

revoke all on function public.read_closed_beta_allowlist_queue(text) from public, anon, authenticated;
revoke all on function public.create_closed_beta_allowlist_entry(text, text, text) from public, anon, authenticated;
revoke all on function public.update_closed_beta_allowlist_entry(uuid, text, text) from public, anon, authenticated;

grant execute on function public.read_closed_beta_allowlist_queue(text) to authenticated;
grant execute on function public.create_closed_beta_allowlist_entry(text, text, text) to authenticated;
grant execute on function public.update_closed_beta_allowlist_entry(uuid, text, text) to authenticated;
