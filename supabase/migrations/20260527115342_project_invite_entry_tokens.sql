-- Project invite entry tokens, lifecycle, and narrow RPC boundary.

alter table public.collaboration_invitations
  add column if not exists lifecycle_state text not null default 'pending',
  add column if not exists accepted_via text,
  add column if not exists direct_granted_at timestamptz,
  add column if not exists direct_granted_user_id uuid references auth.users(id) on delete set null,
  add column if not exists last_opened_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collaboration_invitations_lifecycle_state_check'
      and conrelid = 'public.collaboration_invitations'::regclass
  ) then
    alter table public.collaboration_invitations
      add constraint collaboration_invitations_lifecycle_state_check
      check (lifecycle_state in ('pending', 'direct_granted_existing_user', 'accepted_by_recipient', 'revoked', 'expired'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'collaboration_invitations_accepted_via_check'
      and conrelid = 'public.collaboration_invitations'::regclass
  ) then
    alter table public.collaboration_invitations
      add constraint collaboration_invitations_accepted_via_check
      check (accepted_via is null or accepted_via in ('invite_route', 'auth_trigger', 'manager_direct_grant'));
  end if;
end;
$$;

update public.collaboration_invitations
set lifecycle_state = case
  when revoked_at is not null then 'revoked'
  when accepted_at is not null then 'accepted_by_recipient'
  when expires_at <= now() then 'expired'
  else lifecycle_state
end
where lifecycle_state = 'pending'
  and (revoked_at is not null or accepted_at is not null or expires_at <= now());

create table if not exists public.collaboration_invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.collaboration_invitations(id) on delete cascade,
  token_hash text not null unique,
  token_hint text,
  delivery_method text not null check (delivery_method in ('email', 'copy_url')),
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_opened_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);

create index if not exists collaboration_invitation_tokens_invitation_idx
  on public.collaboration_invitation_tokens(invitation_id);
create index if not exists collaboration_invitation_tokens_expires_idx
  on public.collaboration_invitation_tokens(expires_at);
create unique index if not exists collaboration_invitation_tokens_one_active_idx
  on public.collaboration_invitation_tokens(invitation_id)
  where used_at is null and revoked_at is null;

create table if not exists public.collaboration_audit_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.collaboration_invitations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  estimate_id uuid references public.estimates(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists collaboration_audit_events_invitation_idx
  on public.collaboration_audit_events(invitation_id, created_at desc);
create index if not exists collaboration_audit_events_project_idx
  on public.collaboration_audit_events(project_id, created_at desc);

alter table public.collaboration_invitation_tokens enable row level security;
alter table public.collaboration_audit_events enable row level security;

drop index if exists public.collaboration_invitations_active_project_email_idx;
create unique index collaboration_invitations_active_project_email_idx
  on public.collaboration_invitations(project_id, email)
  where scope = 'project' and lifecycle_state = 'pending';

drop index if exists public.collaboration_invitations_active_estimate_email_idx;
create unique index collaboration_invitations_active_estimate_email_idx
  on public.collaboration_invitations(estimate_id, email)
  where scope = 'estimate' and lifecycle_state = 'pending';

create or replace function public.materialize_expired_collaboration_invitations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public.collaboration_invitations
  set lifecycle_state = 'expired'
  where lifecycle_state = 'pending'
    and accepted_at is null
    and revoked_at is null
    and expires_at <= now();

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.apply_pending_collaboration_invitations(target_user_id uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Invite route owns recipient acceptance; auth user creation must not auto-grant by email.
  perform public.materialize_expired_collaboration_invitations();
  return;
end;
$$;

create or replace function public.record_collaboration_invitation_delivery(
  invitation_id uuid,
  token_id uuid,
  delivery_method text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation record;
begin
  perform public.materialize_expired_collaboration_invitations();

  select *
  into invitation
  from public.collaboration_invitations
  where id = record_collaboration_invitation_delivery.invitation_id
    and lifecycle_state in ('pending', 'direct_granted_existing_user');

  if invitation.id is null then
    raise exception 'Invitation is unavailable.';
  end if;

  if not public.can_manage_collaboration_invitation(invitation.project_id, invitation.estimate_id, invitation.role) then
    raise exception 'Only project owners and admins can manage this invite.';
  end if;

  if not exists (
    select 1
    from public.collaboration_invitation_tokens token
    where token.id = record_collaboration_invitation_delivery.token_id
      and token.invitation_id = invitation.id
      and token.used_at is null
      and token.revoked_at is null
      and token.expires_at > now()
  ) then
    raise exception 'Invite token is unavailable.';
  end if;

  insert into public.collaboration_audit_events (
    invitation_id,
    project_id,
    estimate_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    invitation.id,
    invitation.project_id,
    invitation.estimate_id,
    auth.uid(),
    case delivery_method
      when 'copy_url' then 'collaboration_invite_link_copied'
      else 'collaboration_invite_email_sent'
    end,
    jsonb_build_object('delivery_method', delivery_method, 'token_id', token_id)
  );
end;
$$;

-- public.issue_collaboration_invitation_token(invitation_id uuid, invitation_token_hash text, token_hint text, delivery_method text, token_expires_at timestamptz, revoke_existing boolean)
create or replace function public.issue_collaboration_invitation_token(
  invitation_id uuid,
  invitation_token_hash text,
  token_hint text,
  delivery_method text,
  token_expires_at timestamptz,
  revoke_existing boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation record;
  inserted_token_id uuid;
begin
  perform public.materialize_expired_collaboration_invitations();

  select *
  into invitation
  from public.collaboration_invitations
  where id = issue_collaboration_invitation_token.invitation_id
    and lifecycle_state in ('pending', 'direct_granted_existing_user')
  for update;

  if invitation.id is null then
    raise exception 'Invitation is unavailable.';
  end if;

  if not public.can_manage_collaboration_invitation(invitation.project_id, invitation.estimate_id, invitation.role) then
    raise exception 'Only project owners and admins can manage this invite.';
  end if;

  if revoke_existing then
    update public.collaboration_invitation_tokens
    set revoked_at = now(),
        revoked_by = auth.uid()
    where collaboration_invitation_tokens.invitation_id = invitation.id
      and used_at is null
      and revoked_at is null;
  end if;

  insert into public.collaboration_invitation_tokens (
    invitation_id,
    token_hash,
    token_hint,
    delivery_method,
    created_by,
    expires_at
  )
  values (
    invitation.id,
    invitation_token_hash,
    token_hint,
    delivery_method,
    auth.uid(),
    token_expires_at
  )
  returning id into inserted_token_id;

  insert into public.collaboration_audit_events (
    invitation_id,
    project_id,
    estimate_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    invitation.id,
    invitation.project_id,
    invitation.estimate_id,
    auth.uid(),
    'collaboration_invite_token_issued',
    jsonb_build_object('delivery_method', delivery_method, 'token_hint', token_hint)
  );

  return inserted_token_id;
end;
$$;

create or replace function public.resolve_collaboration_invitation(invitation_token_hash text)
returns table (
  state text,
  invitation_id uuid,
  project_id uuid,
  estimate_id uuid,
  project_name text,
  project_code text,
  estimate_name text,
  role text,
  scope text,
  inviter_label text,
  invited_email text,
  expires_at timestamptz,
  token_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  token record;
begin
  perform public.materialize_expired_collaboration_invitations();

  select
    t.id as token_id,
    t.expires_at as token_expires_at,
    t.used_at,
    t.revoked_at as token_revoked_at,
    i.id as invitation_id,
    i.project_id,
    i.estimate_id,
    i.email,
    i.role,
    i.scope,
    i.expires_at,
    i.revoked_at as invitation_revoked_at,
    i.lifecycle_state,
    p.name as project_name,
    p.project_code,
    e.name as estimate_name,
    coalesce(inviter.display_name, inviter.email, 'Archestimator collaborator') as inviter_label
  into token
  from public.collaboration_invitation_tokens t
  join public.collaboration_invitations i on i.id = t.invitation_id
  join public.projects p on p.id = i.project_id
  left join public.estimates e on e.id = i.estimate_id
  left join public.profiles inviter on inviter.id = i.invited_by
  where t.token_hash = invitation_token_hash;

  if token.token_id is null then
    return query select 'invalid'::text, null::uuid, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::uuid;
    return;
  end if;

  update public.collaboration_invitation_tokens
  set last_opened_at = now()
  where id = token.token_id;

  update public.collaboration_invitations
  set last_opened_at = now()
  where id = token.invitation_id;

  if token.token_revoked_at is not null or token.invitation_revoked_at is not null or token.lifecycle_state = 'revoked' then
    return query select 'revoked'::text, null::uuid, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::uuid;
    return;
  end if;

  if token.used_at is not null then
    return query select 'already_used'::text, token.invitation_id, token.project_id, token.estimate_id, token.project_name, token.project_code, token.estimate_name, token.role::text, token.scope, token.inviter_label, token.email, token.expires_at, token.token_id;
    return;
  end if;

  if token.token_expires_at <= now() or token.expires_at <= now() or token.lifecycle_state = 'expired' then
    return query select 'expired'::text, token.invitation_id, token.project_id, token.estimate_id, token.project_name, token.project_code, token.estimate_name, token.role::text, token.scope, token.inviter_label, token.email, token.expires_at, token.token_id;
    return;
  end if;

  return query select 'active'::text, token.invitation_id, token.project_id, token.estimate_id, token.project_name, token.project_code, token.estimate_name, token.role::text, token.scope, token.inviter_label, token.email, token.expires_at, token.token_id;
end;
$$;

create or replace function public.accept_collaboration_invitation(invitation_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
  current_user_id uuid := auth.uid();
  token record;
  already_has_access boolean := false;
begin
  if current_user_id is null or current_email = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  perform public.materialize_expired_collaboration_invitations();

  select
    t.id as token_id,
    t.expires_at as token_expires_at,
    t.used_at,
    t.revoked_at as token_revoked_at,
    i.*
  into token
  from public.collaboration_invitation_tokens t
  join public.collaboration_invitations i on i.id = t.invitation_id
  where t.token_hash = invitation_token_hash
  for update of t, i;

  if token.token_id is null then
    return jsonb_build_object('state', 'invalid');
  end if;

  if token.token_revoked_at is not null or token.revoked_at is not null or token.lifecycle_state = 'revoked' then
    return jsonb_build_object('state', 'revoked');
  end if;

  if token.token_expires_at <= now() or token.expires_at <= now() or token.lifecycle_state = 'expired' then
    return jsonb_build_object('state', 'expired');
  end if;

  if token.used_at is not null and token.invited_user_id is distinct from current_user_id then
    insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
    values (token.id, token.project_id, token.estimate_id, current_user_id, 'collaboration_invite_replay_blocked', '{}'::jsonb);
    return jsonb_build_object('state', 'already_used');
  end if;

  if token.email <> current_email then
    insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
    values (token.id, token.project_id, token.estimate_id, current_user_id, 'collaboration_invite_wrong_account', '{}'::jsonb);
    return jsonb_build_object('state', 'wrong_account', 'invited_email', token.email);
  end if;

  if token.scope = 'project' then
    already_has_access := exists (
      select 1 from public.project_members
      where project_id = token.project_id and user_id = current_user_id
    );

    insert into public.project_members (project_id, workspace_id, user_id, role, added_by)
    values (token.project_id, token.workspace_id, current_user_id, token.role, token.invited_by)
    on conflict (project_id, user_id) do update
      set role = case
            when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.project_members.role)
              then excluded.role
            else public.project_members.role
          end,
          added_by = coalesce(public.project_members.added_by, excluded.added_by);
  else
    already_has_access := exists (
      select 1 from public.estimate_sheet_members
      where estimate_id = token.estimate_id and user_id = current_user_id
    );

    insert into public.estimate_sheet_members (estimate_id, project_id, user_id, role, added_by)
    values (token.estimate_id, token.project_id, current_user_id, token.role, token.invited_by)
    on conflict (estimate_id, user_id) do update
      set role = case
            when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.estimate_sheet_members.role)
              then excluded.role
            else public.estimate_sheet_members.role
          end,
          added_by = coalesce(public.estimate_sheet_members.added_by, excluded.added_by);
  end if;

  update public.collaboration_invitation_tokens
  set used_at = coalesce(used_at, now())
  where id = token.token_id;

  update public.collaboration_invitations
  set accepted_at = coalesce(accepted_at, now()),
      invited_user_id = current_user_id,
      accepted_via = 'invite_route',
      lifecycle_state = 'accepted_by_recipient'
  where id = token.id;

  insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
  values (
    token.id,
    token.project_id,
    token.estimate_id,
    current_user_id,
    case when already_has_access then 'collaboration_invite_already_member_confirmed' else 'collaboration_invite_accepted' end,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'state',
    case when already_has_access then 'already_member' else 'accepted' end,
    'project_id',
    token.project_id,
    'estimate_id',
    token.estimate_id
  );
end;
$$;

create or replace function public.revoke_collaboration_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation record;
begin
  select *
  into invitation
  from public.collaboration_invitations
  where id = revoke_collaboration_invitation.invitation_id
  for update;

  if invitation.id is null then
    raise exception 'Invitation was not found.';
  end if;

  if not public.can_manage_collaboration_invitation(invitation.project_id, invitation.estimate_id, invitation.role) then
    raise exception 'Only project owners and admins can revoke this invite.';
  end if;

  update public.collaboration_invitations
  set revoked_at = coalesce(revoked_at, now()),
      lifecycle_state = 'revoked'
  where id = invitation.id;

  update public.collaboration_invitation_tokens
  set revoked_at = coalesce(revoked_at, now()),
      revoked_by = auth.uid()
  where collaboration_invitation_tokens.invitation_id = invitation.id
    and used_at is null
    and revoked_at is null;

  insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
  values (invitation.id, invitation.project_id, invitation.estimate_id, auth.uid(), 'collaboration_invite_revoked', '{}'::jsonb);
end;
$$;

revoke all on table public.collaboration_invitation_tokens from public, anon, authenticated;
revoke insert, update, delete on table public.collaboration_invitations from anon, authenticated;
revoke insert, update, delete on table public.collaboration_audit_events from public, anon, authenticated;
revoke all on function public.materialize_expired_collaboration_invitations() from public;
revoke all on function public.materialize_expired_collaboration_invitations() from anon;
revoke all on function public.materialize_expired_collaboration_invitations() from authenticated;
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from public;
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from anon;
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from authenticated;

revoke all on function public.resolve_collaboration_invitation(text) from public;
revoke all on function public.accept_collaboration_invitation(text) from public;
revoke all on function public.accept_collaboration_invitation(text) from anon;
revoke all on function public.revoke_collaboration_invitation(uuid) from public;
revoke all on function public.revoke_collaboration_invitation(uuid) from anon;
revoke all on function public.issue_collaboration_invitation_token(uuid, text, text, text, timestamptz, boolean) from public;
revoke all on function public.issue_collaboration_invitation_token(uuid, text, text, text, timestamptz, boolean) from anon;
revoke all on function public.record_collaboration_invitation_delivery(uuid, uuid, text) from public;
revoke all on function public.record_collaboration_invitation_delivery(uuid, uuid, text) from anon;

grant execute on function public.resolve_collaboration_invitation(text) to anon, authenticated;
grant execute on function public.accept_collaboration_invitation(text) to authenticated;
grant execute on function public.revoke_collaboration_invitation(uuid) to authenticated;
grant execute on function public.issue_collaboration_invitation_token(uuid, text, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.record_collaboration_invitation_delivery(uuid, uuid, text) to authenticated;
