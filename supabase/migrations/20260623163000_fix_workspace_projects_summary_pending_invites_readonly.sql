-- Fix workspace_projects_summary read-only execution.
--
-- The projects summary RPC is STABLE, so it cannot call helper functions that
-- write while materializing expired invitations. Keep pending-invite visibility
-- behind the original SECURITY DEFINER boundary, but make the helper read-only
-- so the stable summary RPC can call it without SQLSTATE 25006.
--
-- Why DROP + CREATE instead of CREATE OR REPLACE: the existing live function
-- is `language plpgsql volatile` (set by 20260601043000). CREATE OR REPLACE
-- FUNCTION will not change an existing function's LANGUAGE or VOLATILITY on
-- this Postgres version, so the prior redefine silently left the old volatile
-- plpgsql body in place. Dropping and recreating forces the conversion.

drop function if exists public.list_pending_collaboration_invitations();

create function public.list_pending_collaboration_invitations()
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
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
  join public.projects project
    on project.id = invitation.project_id
  left join public.estimates estimate
    on estimate.id = invitation.estimate_id
  left join public.profiles inviter
    on inviter.id = invitation.invited_by
  where auth.uid() is not null
    and lower(coalesce(auth.jwt() ->> 'email', '')) <> ''
    and invitation.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and invitation.lifecycle_state in ('pending', 'expired')
    and invitation.accepted_at is null
    and invitation.revoked_at is null
  order by
    case
      when invitation.lifecycle_state = 'expired' or invitation.expires_at <= now() then 1
      else 0
    end,
    invitation.created_at desc;
$$;

revoke all on function public.list_pending_collaboration_invitations() from public, anon;
grant execute on function public.list_pending_collaboration_invitations() to authenticated;
