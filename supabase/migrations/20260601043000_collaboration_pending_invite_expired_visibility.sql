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
  state text,
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
    case
      when invitation.lifecycle_state = 'expired' or invitation.expires_at <= now() then 'expired'
      else 'pending'
    end as state,
    invitation.expires_at,
    invitation.last_opened_at,
    invitation.created_at
  from public.collaboration_invitations invitation
  join public.projects project on project.id = invitation.project_id
  left join public.estimates estimate on estimate.id = invitation.estimate_id
  left join public.profiles inviter on inviter.id = invitation.invited_by
  where invitation.email = current_email
    and invitation.lifecycle_state in ('pending', 'expired')
    and invitation.accepted_at is null
    and invitation.revoked_at is null
  order by
    case
      when invitation.lifecycle_state = 'expired' or invitation.expires_at <= now() then 1
      else 0
    end,
    invitation.created_at desc;
end;
$$;

revoke all on function public.list_pending_collaboration_invitations() from public;
grant execute on function public.list_pending_collaboration_invitations() to authenticated;
