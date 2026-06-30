-- Transitional Cloudflare auth bridge:
-- Better Auth owns session identity, while the legacy Supabase/Postgres
-- collaboration tables remain the database of record until the D1 migration.
-- These service-role-only RPCs keep the old acceptance mutations atomic without
-- depending on Supabase Auth cookies or database-session identity claims.

create or replace function public.accept_collaboration_invitation_for_actor(
  invitation_token_hash text,
  actor_user_id uuid,
  actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text := lower(coalesce(actor_email, ''));
  current_user_id uuid := actor_user_id;
  token record;
  already_has_access boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'accept_collaboration_invitation_for_actor requires service_role' using errcode = '42501';
  end if;

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
  where t.token_hash = accept_collaboration_invitation_for_actor.invitation_token_hash
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

create or replace function public.accept_collaboration_invitation_by_id_for_actor(
  target_invitation_id uuid,
  actor_user_id uuid,
  actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text := lower(coalesce(actor_email, ''));
  current_user_id uuid := actor_user_id;
  invitation record;
  already_has_access boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'accept_collaboration_invitation_by_id_for_actor requires service_role' using errcode = '42501';
  end if;

  if current_user_id is null or current_email = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  perform public.materialize_expired_collaboration_invitations();

  select invitation_row.*
  into invitation
  from public.collaboration_invitations invitation_row
  where invitation_row.id = accept_collaboration_invitation_by_id_for_actor.target_invitation_id
  for update;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if invitation.revoked_at is not null or invitation.lifecycle_state = 'revoked' then
    return jsonb_build_object('state', 'revoked');
  end if;

  if invitation.expires_at <= now() or invitation.lifecycle_state = 'expired' then
    return jsonb_build_object('state', 'expired');
  end if;

  if invitation.accepted_at is not null or invitation.lifecycle_state in ('accepted_by_recipient', 'direct_granted_existing_user') then
    if invitation.invited_user_id is not null and invitation.invited_user_id is not distinct from current_user_id then
      return jsonb_build_object(
        'state',
        'already_member',
        'project_id',
        invitation.project_id,
        'estimate_id',
        invitation.estimate_id
      );
    end if;

    insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
    values (invitation.id, invitation.project_id, invitation.estimate_id, current_user_id, 'collaboration_invite_replay_blocked', '{}'::jsonb);
    return jsonb_build_object('state', 'already_used');
  end if;

  if invitation.email <> current_email then
    insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
    values (
      invitation.id,
      invitation.project_id,
      invitation.estimate_id,
      current_user_id,
      'collaboration_invite_wrong_account',
      jsonb_build_object('invited_email', invitation.email)
    );
    return jsonb_build_object('state', 'wrong_account', 'invited_email', invitation.email);
  end if;

  if invitation.scope = 'project' then
    already_has_access := exists (
      select 1 from public.project_members
      where project_id = invitation.project_id and user_id = current_user_id
    );

    insert into public.project_members (project_id, workspace_id, user_id, role, added_by)
    values (invitation.project_id, invitation.workspace_id, current_user_id, invitation.role, invitation.invited_by)
    on conflict (project_id, user_id) do update
      set role = case
            when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.project_members.role)
              then excluded.role
            else public.project_members.role
          end,
          added_by = coalesce(public.project_members.added_by, excluded.added_by);
  elsif invitation.scope = 'estimate' and invitation.estimate_id is not null then
    already_has_access := exists (
      select 1 from public.estimate_sheet_members
      where estimate_id = invitation.estimate_id and user_id = current_user_id
    );

    insert into public.estimate_sheet_members (estimate_id, project_id, user_id, role, added_by)
    values (invitation.estimate_id, invitation.project_id, current_user_id, invitation.role, invitation.invited_by)
    on conflict (estimate_id, user_id) do update
      set role = case
            when public.collaboration_role_rank(excluded.role) > public.collaboration_role_rank(public.estimate_sheet_members.role)
              then excluded.role
            else public.estimate_sheet_members.role
          end,
          added_by = coalesce(public.estimate_sheet_members.added_by, excluded.added_by);
  else
    return jsonb_build_object('state', 'invalid');
  end if;

  update public.collaboration_invitation_tokens
  set used_at = coalesce(used_at, now())
  where invitation_id = invitation.id
    and used_at is null
    and revoked_at is null;

  update public.collaboration_invitations
  set accepted_at = coalesce(accepted_at, now()),
      invited_user_id = current_user_id,
      accepted_via = 'invite_route',
      lifecycle_state = 'accepted_by_recipient'
  where id = invitation.id;

  insert into public.collaboration_audit_events (invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata)
  values (
    invitation.id,
    invitation.project_id,
    invitation.estimate_id,
    current_user_id,
    case when already_has_access then 'collaboration_invite_already_member_confirmed' else 'collaboration_invite_accepted' end,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'state',
    case when already_has_access then 'already_member' else 'accepted' end,
    'project_id',
    invitation.project_id,
    'estimate_id',
    invitation.estimate_id
  );
end;
$$;

revoke all on function public.accept_collaboration_invitation_for_actor(text, uuid, text) from public;
revoke all on function public.accept_collaboration_invitation_for_actor(text, uuid, text) from anon;
revoke all on function public.accept_collaboration_invitation_for_actor(text, uuid, text) from authenticated;
revoke all on function public.accept_collaboration_invitation_by_id_for_actor(uuid, uuid, text) from public;
revoke all on function public.accept_collaboration_invitation_by_id_for_actor(uuid, uuid, text) from anon;
revoke all on function public.accept_collaboration_invitation_by_id_for_actor(uuid, uuid, text) from authenticated;

grant execute on function public.accept_collaboration_invitation_for_actor(text, uuid, text) to service_role;
grant execute on function public.accept_collaboration_invitation_by_id_for_actor(uuid, uuid, text) to service_role;
