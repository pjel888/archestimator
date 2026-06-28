-- Main sidebar favorites: bounded project/sheet tree payload.
--
-- Select the visible project containers in SQL before returning data to the
-- app. A container can be a favorited project, a project that only groups
-- favorite estimate sheets, or both.

create index if not exists estimate_favorites_workspace_user_project_created_idx
  on public.estimate_favorites(workspace_id, user_id, project_id, created_at desc);

create index if not exists project_favorites_workspace_user_project_idx
  on public.project_favorites(workspace_id, user_id, project_id);

create or replace function public.main_sidebar_favorite_projects(
  target_workspace_id uuid,
  project_limit int default 8,
  sheet_limit int default 5
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
      least(greatest(coalesce(project_limit, 8), 1), 50) as safe_project_limit,
      least(greatest(coalesce(sheet_limit, 5), 0), 25) as safe_sheet_limit,
      (select auth.uid()) as caller_id
  ),
  project_favorite_refs as (
    select
      pf.project_id,
      pf.created_at
    from input i
    join public.project_favorites pf
      on pf.workspace_id = i.workspace_id
     and pf.user_id = i.caller_id
    order by pf.created_at desc, pf.project_id desc
    limit (select safe_project_limit from input)
  ),
  latest_sheet_favorite_refs as (
    select
      refs.project_id,
      refs.created_at
    from (
      select distinct on (ef.project_id)
        ef.project_id,
        ef.created_at
      from input i
      join public.estimate_favorites ef
        on ef.workspace_id = i.workspace_id
       and ef.user_id = i.caller_id
      order by ef.project_id, ef.created_at desc, ef.estimate_id desc
    ) refs
    order by refs.created_at desc, refs.project_id desc
    limit (select safe_project_limit from input)
  ),
  candidate_project_ids as (
    select project_id from project_favorite_refs
    union
    select project_id from latest_sheet_favorite_refs
  ),
  latest_sheet_favorite_by_candidate as (
    select distinct on (ef.project_id)
      ef.project_id,
      ef.created_at
    from input i
    join candidate_project_ids c
      on true
    join public.estimate_favorites ef
      on ef.workspace_id = i.workspace_id
     and ef.user_id = i.caller_id
     and ef.project_id = c.project_id
    order by ef.project_id, ef.created_at desc, ef.estimate_id desc
  ),
  container_candidates as (
    select
      c.project_id,
      pf.created_at as project_favorite_created_at,
      lsf.created_at as newest_sheet_favorite_created_at,
      greatest(
        coalesce(pf.created_at, '-infinity'::timestamptz),
        coalesce(lsf.created_at, '-infinity'::timestamptz)
      ) as favorite_created_at
    from input i
    join candidate_project_ids c
      on true
    left join public.project_favorites pf
      on pf.workspace_id = i.workspace_id
     and pf.user_id = i.caller_id
     and pf.project_id = c.project_id
    left join latest_sheet_favorite_by_candidate lsf
      on lsf.project_id = c.project_id
  ),
  selected_containers as (
    select cc.*
    from container_candidates cc
    where cc.favorite_created_at > '-infinity'::timestamptz
    order by cc.favorite_created_at desc, cc.project_id desc
    limit (select safe_project_limit from input)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'project_code', p.project_code,
      'favorite_created_at', sc.favorite_created_at,
      'project_favorite_created_at', sc.project_favorite_created_at,
      'favorite_estimate_sheets', coalesce(sheets.favorite_estimate_sheets, '[]'::jsonb)
    )
    order by sc.favorite_created_at desc, p.id desc
  ), '[]'::jsonb)
  from selected_containers sc
  join public.projects p
    on p.id = sc.project_id
  left join lateral (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'project_id', e.project_id,
        'name', e.name,
        'sheet_code', e.sheet_code,
        'favorite_created_at', favorite_sheets.created_at
      )
      order by favorite_sheets.created_at desc, favorite_sheets.estimate_id desc
    ), '[]'::jsonb) as favorite_estimate_sheets
    from (
      select
        ef.estimate_id,
        ef.project_id,
        ef.created_at
      from input i
      join public.estimate_favorites ef
        on ef.workspace_id = i.workspace_id
       and ef.user_id = i.caller_id
       and ef.project_id = sc.project_id
      order by ef.created_at desc, ef.estimate_id desc
      limit (select safe_sheet_limit from input)
    ) favorite_sheets
    join public.estimates e
      on e.id = favorite_sheets.estimate_id
     and e.project_id = favorite_sheets.project_id
  ) sheets on true;
$$;

revoke execute on function public.main_sidebar_favorite_projects(uuid, int, int) from public, anon;
grant execute on function public.main_sidebar_favorite_projects(uuid, int, int) to authenticated;
