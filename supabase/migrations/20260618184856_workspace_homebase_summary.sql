-- Workshop Dashboard Query Batching — Phase 3.
--
-- Additive, flag-gated RPC for the /workshop homebase fast path. The caller
-- keeps the Phase 1 app path as fallback. This function deliberately excludes
-- optional publication and pending-invite data; those remain app-side
-- best-effort reads so an optional table cannot fail the whole homebase.

create or replace function public.workspace_homebase_summary(
  target_workspace_id uuid,
  recent_limit int default 12
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
      least(greatest(coalesce(recent_limit, 12), 1), 50) as safe_recent_limit,
      (select auth.uid()) as caller_id
  ),
  authorized_projects as (
    select
      p.id,
      p.name,
      p.client_name,
      p.project_code,
      p.location,
      p.updated_at,
      p.workspace_id,
      p.created_by
    from input i
    join public.projects p
      on p.workspace_id = i.workspace_id
    where i.caller_id is not null
      and (
        public.is_platform_admin()
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = p.workspace_id
            and wm.user_id = i.caller_id
        )
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.workspace_id = p.workspace_id
            and pm.user_id = i.caller_id
        )
        or exists (
          select 1
          from public.estimate_sheet_members esm
          where esm.project_id = p.id
            and esm.user_id = i.caller_id
        )
      )
  ),
  recent_projects as (
    select ap.*
    from authorized_projects ap
    order by ap.updated_at desc, ap.id desc
    limit (select safe_recent_limit from input)
  ),
  project_favorite_refs as (
    select
      pf.project_id,
      pf.created_at
    from input i
    join public.project_favorites pf
      on pf.workspace_id = i.workspace_id
     and pf.user_id = (select auth.uid())
    order by pf.created_at desc, pf.project_id desc
    limit (select safe_recent_limit from input)
  ),
  favorite_projects as (
    select
      ap.id,
      ap.name,
      ap.client_name,
      ap.project_code,
      ap.location,
      ap.updated_at,
      ap.workspace_id,
      ap.created_by,
      pfr.created_at as favorite_created_at
    from project_favorite_refs pfr
    join authorized_projects ap
      on ap.id = pfr.project_id
    order by pfr.created_at desc, ap.id desc
  ),
  recent_estimate_project_ids as (
    select id as project_id from recent_projects
    union
    select project_id from project_favorite_refs
  ),
  recent_estimates as (
    select
      e.id,
      e.project_id,
      e.name,
      e.sheet_code,
      e.updated_at
    from recent_estimate_project_ids rep
    join authorized_projects ap
      on ap.id = rep.project_id
    join public.estimates e
      on e.project_id = ap.id
    order by e.updated_at desc, e.id desc
    limit (select safe_recent_limit from input)
  ),
  estimate_favorite_refs as (
    select
      ef.estimate_id,
      ef.project_id,
      ef.created_at
    from input i
    join public.estimate_favorites ef
      on ef.workspace_id = i.workspace_id
     and ef.user_id = (select auth.uid())
    order by ef.created_at desc, ef.estimate_id desc
    limit (select safe_recent_limit from input)
  ),
  favorite_estimates as (
    select
      e.id,
      e.project_id,
      e.name,
      e.sheet_code,
      e.updated_at,
      efr.created_at as favorite_created_at
    from estimate_favorite_refs efr
    join authorized_projects ap
      on ap.id = efr.project_id
    join public.estimates e
      on e.id = efr.estimate_id
     and e.project_id = ap.id
    order by efr.created_at desc, e.id desc
  ),
  visible_estimate_ids as (
    select id as estimate_id from recent_estimates
    union
    select id as estimate_id from favorite_estimates
  ),
  estimate_projects as (
    select distinct
      ap.id,
      ap.name,
      ap.client_name,
      ap.project_code,
      ap.location,
      ap.updated_at,
      ap.workspace_id,
      ap.created_by
    from authorized_projects ap
    join (
      select project_id from recent_estimates
      union
      select project_id from favorite_estimates
    ) ep on ep.project_id = ap.id
  ),
  visible_estimate_nodes as (
    select
      n.id,
      n.estimate_id,
      n.kind,
      n.parent_id,
      n.sort_order
    from visible_estimate_ids vei
    join public.estimate_nodes n
      on n.estimate_id = vei.estimate_id
    order by n.estimate_id asc, n.sort_order asc, n.id asc
  )
  select jsonb_build_object(
    'projectFavorites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'project_id', pfr.project_id,
          'created_at', pfr.created_at
        )
        order by pfr.created_at desc, pfr.project_id desc
      )
      from project_favorite_refs pfr
    ), '[]'::jsonb),
    'estimateFavorites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'estimate_id', efr.estimate_id,
          'project_id', efr.project_id,
          'created_at', efr.created_at
        )
        order by efr.created_at desc, efr.estimate_id desc
      )
      from estimate_favorite_refs efr
    ), '[]'::jsonb),
    'recentProjects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rp.id,
          'name', rp.name,
          'client_name', rp.client_name,
          'project_code', rp.project_code,
          'location', rp.location,
          'updated_at', rp.updated_at,
          'workspace_id', rp.workspace_id,
          'created_by', rp.created_by
        )
        order by rp.updated_at desc, rp.id desc
      )
      from recent_projects rp
    ), '[]'::jsonb),
    'favoriteProjects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', fp.id,
          'name', fp.name,
          'client_name', fp.client_name,
          'project_code', fp.project_code,
          'location', fp.location,
          'updated_at', fp.updated_at,
          'workspace_id', fp.workspace_id,
          'created_by', fp.created_by,
          'favorite_created_at', fp.favorite_created_at
        )
        order by fp.favorite_created_at desc, fp.id desc
      )
      from favorite_projects fp
    ), '[]'::jsonb),
    'estimateProjects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ep.id,
          'name', ep.name,
          'client_name', ep.client_name,
          'project_code', ep.project_code,
          'location', ep.location,
          'updated_at', ep.updated_at,
          'workspace_id', ep.workspace_id,
          'created_by', ep.created_by
        )
        order by ep.updated_at desc, ep.id desc
      )
      from estimate_projects ep
    ), '[]'::jsonb),
    'recentEstimates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', re.id,
          'project_id', re.project_id,
          'name', re.name,
          'sheet_code', re.sheet_code,
          'updated_at', re.updated_at
        )
        order by re.updated_at desc, re.id desc
      )
      from recent_estimates re
    ), '[]'::jsonb),
    'favoriteEstimates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', fe.id,
          'project_id', fe.project_id,
          'name', fe.name,
          'sheet_code', fe.sheet_code,
          'updated_at', fe.updated_at,
          'favorite_created_at', fe.favorite_created_at
        )
        order by fe.favorite_created_at desc, fe.id desc
      )
      from favorite_estimates fe
    ), '[]'::jsonb),
    'estimateNodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ven.id,
          'estimate_id', ven.estimate_id,
          'kind', ven.kind,
          'parent_id', ven.parent_id,
          'sort_order', ven.sort_order
        )
        order by ven.estimate_id asc, ven.sort_order asc, ven.id asc
      )
      from visible_estimate_nodes ven
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.workspace_homebase_summary(uuid, int) from public, anon;
grant execute on function public.workspace_homebase_summary(uuid, int) to authenticated;
