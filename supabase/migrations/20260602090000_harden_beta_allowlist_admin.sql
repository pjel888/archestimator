-- Harden beta allowlist administration against self-writable profile role escalation.

-- Profiles remain user-readable under RLS, but platform roles must not be
-- writable through browser/authenticated table grants. Keep only the profile
-- fields the app updates directly self-writable.
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, default_workspace_id) on table public.profiles to authenticated;

-- If the vulnerable self-write path was exploited before this hardening lands,
-- persisted elevated profile roles would remain trusted by is_platform_admin().
-- Preserve Philip's founder account and demote every other elevated role until
-- a service/admin operator intentionally re-grants it through a privileged path.
create table if not exists public.profile_role_hardening_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  email text not null,
  old_role public.app_role not null,
  new_role public.app_role not null,
  reason text not null,
  created_at timestamptz not null default now()
);

revoke all on table public.profile_role_hardening_audit from public, anon, authenticated;

with candidates as (
  select id, email, role as old_role
  from public.profiles
  where role in ('ceo'::public.app_role, 'admin'::public.app_role)
    and lower(email) <> 'philipjonlewis@gmail.com'
),
demoted as (
  update public.profiles
  set role = 'member'::public.app_role,
      updated_at = now()
  from candidates c
  where public.profiles.id = c.id
  returning public.profiles.id, public.profiles.email, c.old_role, public.profiles.role as new_role
)
insert into public.profile_role_hardening_audit (profile_id, email, old_role, new_role, reason)
select d.id, d.email, d.old_role, d.new_role, 'demoted unexpected elevated role during beta allowlist hardening'
from demoted d;

create or replace function public.ensure_current_user_profile(
  profile_display_name text default null,
  profile_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt()->>'email', ''));
  existing_profile public.profiles;
  created_profile public.profiles;
begin
  if actor_id is null or actor_email = '' then
    raise exception 'Authenticated user context is required to create a profile.' using errcode = '42501';
  end if;

  select *
    into existing_profile
  from public.profiles
  where id = actor_id;

  if existing_profile.id is not null then
    return existing_profile;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    actor_id,
    actor_email,
    nullif(btrim(coalesce(profile_display_name, '')), ''),
    nullif(btrim(coalesce(profile_avatar_url, '')), ''),
    case
      when actor_email = 'philipjonlewis@gmail.com' then 'ceo'::public.app_role
      else 'member'::public.app_role
    end
  )
  returning * into created_profile;

  return created_profile;
end;
$$;

revoke all on function public.ensure_current_user_profile(text, text) from public, anon, authenticated;
grant execute on function public.ensure_current_user_profile(text, text) to authenticated;

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
    and (requested_status is null or requested_status in ('invited', 'active', 'revoked'))
    and (requested_status is null or beta.status = requested_status)
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

  if entry_status not in ('invited', 'active', 'revoked') then
    raise exception 'Closed beta allowlist status is invalid.' using errcode = '22000';
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

  if entry_status not in ('invited', 'active', 'revoked') then
    raise exception 'Closed beta allowlist status is invalid.' using errcode = '22000';
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
