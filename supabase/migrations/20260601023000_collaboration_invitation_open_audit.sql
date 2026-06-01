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

  insert into public.collaboration_audit_events (
    invitation_id,
    project_id,
    estimate_id,
    actor_user_id,
    event_type,
    metadata
  )
  values (
    token.invitation_id,
    token.project_id,
    token.estimate_id,
    auth.uid(),
    'collaboration_invite_opened',
    jsonb_build_object(
      'scope', token.scope,
      'role', token.role,
      'token_id', token.token_id
    )
  );

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
