-- Projects page query batching.
--
-- Additive RPC for /workshop/projects. The application keeps the existing
-- multi-query app path as fallback when this function is unavailable.

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

create or replace function public.workspace_projects_summary(
  target_workspace_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with input as (
    select
      target_workspace_id as workspace_id,
      (select auth.uid()) as caller_id
  ),
  owned_projects as (
    select p.*
    from input i
    join public.projects p
      on p.workspace_id = i.workspace_id
    where i.caller_id is not null
    order by p.updated_at desc, p.id desc
  ),
  owned_project_ids as (
    select id as project_id from owned_projects
  ),
  project_favorite_refs as (
    select pf.project_id
    from input i
    join public.project_favorites pf
      on pf.workspace_id = i.workspace_id
     and pf.user_id = i.caller_id
    order by pf.created_at desc, pf.project_id desc
  ),
  estimate_favorite_refs as (
    select
      ef.estimate_id,
      ef.project_id,
      ef.created_at
    from input i
    join public.estimate_favorites ef
      on ef.workspace_id = i.workspace_id
     and ef.user_id = i.caller_id
    order by ef.created_at desc, ef.estimate_id desc
  ),
  project_member_rows as (
    select
      pm.project_id,
      pm.workspace_id,
      pm.role,
      pm.user_id
    from input i
    join public.project_members pm
      on pm.user_id = i.caller_id
  ),
  sheet_member_rows as (
    select
      esm.estimate_id,
      esm.project_id,
      esm.role,
      esm.user_id
    from input i
    join public.estimate_sheet_members esm
      on esm.user_id = i.caller_id
  ),
  workspace_membership_row as (
    select wm.role
    from input i
    join public.workspace_members wm
      on wm.workspace_id = i.workspace_id
     and wm.user_id = i.caller_id
    limit 1
  ),
  shared_project_ids as (
    select project_id from project_member_rows
    union
    select project_id from sheet_member_rows
    except
    select project_id from owned_project_ids
  ),
  shared_projects as (
    select p.*
    from public.projects p
    join shared_project_ids spi
      on spi.project_id = p.id
    order by p.updated_at desc, p.id desc
  ),
  favorite_estimates as (
    select
      e.id,
      e.project_id,
      e.name,
      e.sheet_code,
      e.updated_at
    from estimate_favorite_refs efr
    join public.estimates e
      on e.id = efr.estimate_id
    order by efr.created_at desc, e.id desc
  ),
  project_group_rows as (
    select
      pg.id,
      pg.name,
      pg.accent_id,
      pg.position,
      pg.created_at
    from input i
    join public.project_groups pg
      on pg.workspace_id = i.workspace_id
     and pg.user_id = i.caller_id
    order by pg.position asc, pg.created_at asc, pg.id asc
  ),
  project_group_membership_rows as (
    select
      pgm.project_id,
      pgm.group_id
    from input i
    join public.project_group_memberships pgm
      on pgm.workspace_id = i.workspace_id
     and pgm.user_id = i.caller_id
  ),
  all_project_ids as (
    select project_id from owned_project_ids
    union
    select project_id from shared_project_ids
  ),
  publication_rows as (
    select
      pp.id,
      pp.project_id,
      pp.encrypted_token,
      pp.password_hash,
      pp.status,
      pp.snapshot_version,
      pp.published_at,
      pp.expires_at,
      pp.revoked_at,
      pp.open_count,
      pp.latest_opened_at,
      pp.location_visibility
    from public.project_publications pp
    join all_project_ids api
      on api.project_id = pp.project_id
    order by pp.published_at desc, pp.id desc
  ),
  sent_invite_counts as (
    select
      ci.project_id,
      count(*)::int as count
    from public.collaboration_invitations ci
    join all_project_ids api
      on api.project_id = ci.project_id
    where ci.lifecycle_state = 'pending'
      and ci.accepted_at is null
      and ci.revoked_at is null
      and ci.expires_at > now()
    group by ci.project_id
  ),
  received_pending_invites as (
    select *
    from public.list_pending_collaboration_invitations()
  )
  select jsonb_build_object(
    'ownedProjects', coalesce((
      select jsonb_agg(to_jsonb(op) order by op.updated_at desc, op.id desc)
      from owned_projects op
    ), '[]'::jsonb),
    'sharedProjects', coalesce((
      select jsonb_agg(to_jsonb(sp) order by sp.updated_at desc, sp.id desc)
      from shared_projects sp
    ), '[]'::jsonb),
    'projectFavorites', coalesce((
      select jsonb_agg(to_jsonb(pfr) order by pfr.project_id desc)
      from project_favorite_refs pfr
    ), '[]'::jsonb),
    'estimateFavorites', coalesce((
      select jsonb_agg(to_jsonb(efr) order by efr.created_at desc, efr.estimate_id desc)
      from estimate_favorite_refs efr
    ), '[]'::jsonb),
    'favoriteEstimates', coalesce((
      select jsonb_agg(to_jsonb(fe) order by fe.updated_at desc, fe.id desc)
      from favorite_estimates fe
    ), '[]'::jsonb),
    'projectMembers', coalesce((
      select jsonb_agg(to_jsonb(pmr) order by pmr.project_id asc)
      from project_member_rows pmr
    ), '[]'::jsonb),
    'sheetMembers', coalesce((
      select jsonb_agg(to_jsonb(smr) order by smr.project_id asc, smr.estimate_id asc)
      from sheet_member_rows smr
    ), '[]'::jsonb),
    'workspaceMembership', (
      select to_jsonb(wmr)
      from workspace_membership_row wmr
      limit 1
    ),
    'projectGroups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pgr.id,
          'name', pgr.name,
          'accent_id', pgr.accent_id,
          'position', pgr.position
        )
        order by pgr.position asc, pgr.created_at asc, pgr.id asc
      )
      from project_group_rows pgr
    ), '[]'::jsonb),
    'projectGroupMemberships', coalesce((
      select jsonb_agg(to_jsonb(pgm) order by pgm.project_id asc)
      from project_group_membership_rows pgm
    ), '[]'::jsonb),
    'publications', coalesce((
      select jsonb_agg(to_jsonb(pr) order by pr.published_at desc, pr.id desc)
      from publication_rows pr
    ), '[]'::jsonb),
    'receivedPendingInvites', coalesce((
      select jsonb_agg(
        to_jsonb(rpi)
        order by case when rpi.state = 'expired' then 1 else 0 end, rpi.created_at desc
      )
      from received_pending_invites rpi
    ), '[]'::jsonb),
    'sentInviteCounts', coalesce((
      select jsonb_agg(to_jsonb(sic) order by sic.project_id asc)
      from sent_invite_counts sic
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.workspace_projects_summary(uuid) from public, anon;
grant execute on function public.workspace_projects_summary(uuid) to authenticated;
