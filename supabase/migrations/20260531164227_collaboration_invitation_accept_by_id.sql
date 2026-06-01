-- Signed-in invite visibility and by-id acceptance.
-- Raw invite tokens stay confined to the emailed invite-entry route; authenticated
-- users accept visible pending invitations by invitation id.

drop function if exists public.list_pending_collaboration_invitations();

create or replace function public.list_pending_collaboration_invitations()
returns table (
  invitation_id uuid,
  project_id uuid,
  estimate_id uuid,
  project_name text,
  project_code text,
  estimate_name text,
  role text,
  scope text,
  inviter_label text,
  expires_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null or current_email = '' then
    return;
  end if;

  perform public.materialize_expired_collaboration_invitations();

  return query
  select
    invitation.id as invitation_id,
    invitation.project_id,
    invitation.estimate_id,
    project.name as project_name,
    project.project_code,
    estimate.name as estimate_name,
    invitation.role::text as role,
    invitation.scope,
    coalesce(inviter.display_name, inviter.email, 'Archestimator collaborator') as inviter_label,
    invitation.expires_at,
    invitation.last_opened_at,
    invitation.created_at
  from public.collaboration_invitations invitation
  join public.projects project on project.id = invitation.project_id
  left join public.estimates estimate on estimate.id = invitation.estimate_id
  left join public.profiles inviter on inviter.id = invitation.invited_by
  where invitation.email = current_email
    and invitation.lifecycle_state = 'pending'
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  order by invitation.created_at desc;
end;
$$;

create or replace function public.accept_collaboration_invitation_by_id(target_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
  current_user_id uuid := auth.uid();
  invitation record;
  already_has_access boolean := false;
begin
  if current_user_id is null or current_email = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  perform public.materialize_expired_collaboration_invitations();

  select invitation_row.*
  into invitation
  from public.collaboration_invitations invitation_row
  where invitation_row.id = target_invitation_id
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

revoke all on function public.list_pending_collaboration_invitations() from public;
revoke all on function public.list_pending_collaboration_invitations() from anon;
revoke all on function public.list_pending_collaboration_invitations() from authenticated;
revoke all on function public.accept_collaboration_invitation_by_id(uuid) from public;
revoke all on function public.accept_collaboration_invitation_by_id(uuid) from anon;
revoke all on function public.accept_collaboration_invitation_by_id(uuid) from authenticated;

grant execute on function public.list_pending_collaboration_invitations() to authenticated;
grant execute on function public.accept_collaboration_invitation_by_id(uuid) to authenticated;
