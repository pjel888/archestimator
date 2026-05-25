create or replace function public.get_estimate_activity_retention_metrics(
  target_project_id uuid
)
returns table (
  workspace_event_bytes bigint,
  workspace_version_bytes bigint,
  largest_event_payload_bytes integer,
  max_estimate_event_count bigint,
  estimates_over_event_threshold bigint,
  workspace_storage_over_threshold boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := auth.uid();
begin
  if target_project_id is null then
    raise exception 'Project id is required.';
  end if;

  select project.workspace_id
    into resolved_workspace_id
  from public.projects project
  where project.id = target_project_id;

  if resolved_workspace_id is null then
    raise exception 'Project not found in the current workspace.';
  end if;

  if not public.estimate_sheet_can_bypass_auth()
    and (
      resolved_user_id is null
      or not exists (
        select 1
        from public.workspace_members member
        where member.workspace_id = resolved_workspace_id
          and member.user_id = resolved_user_id
      )
    )
  then
    raise exception 'Workspace access denied.';
  end if;

  return query
  with project_estimates as (
    select estimate.id
    from public.estimates estimate
    where estimate.project_id = target_project_id
  ),
  event_rows as (
    select event.*
    from public.estimate_sheet_events event
    join project_estimates estimate on estimate.id = event.estimate_id
    where event.workspace_id = resolved_workspace_id
  ),
  version_rows as (
    select version.*
    from public.estimate_sheet_versions version
    join project_estimates estimate on estimate.id = version.estimate_id
    where version.workspace_id = resolved_workspace_id
  ),
  event_metrics as (
    select
      coalesce(sum(pg_column_size(to_jsonb(event_rows))), 0)::bigint as event_bytes,
      coalesce(max(greatest(
        pg_column_size(event_rows.row_context),
        pg_column_size(event_rows.payload),
        coalesce(pg_column_size(event_rows.old_snapshot), 0),
        coalesce(pg_column_size(event_rows.new_snapshot), 0)
      )), 0)::integer as largest_payload_bytes
    from event_rows
  ),
  version_metrics as (
    select coalesce(sum(pg_column_size(to_jsonb(version_rows))), 0)::bigint as version_bytes
    from version_rows
  ),
  estimate_event_counts as (
    select
      estimate.id,
      count(event_rows.id)::bigint as event_count
    from project_estimates estimate
    left join event_rows on event_rows.estimate_id = estimate.id
    group by estimate.id
  ),
  count_metrics as (
    select
      coalesce(max(event_count), 0)::bigint as max_event_count,
      count(*) filter (where event_count > 10000)::bigint as estimates_over_threshold
    from estimate_event_counts
  )
  select
    event_metrics.event_bytes,
    version_metrics.version_bytes,
    event_metrics.largest_payload_bytes,
    count_metrics.max_event_count,
    count_metrics.estimates_over_threshold,
    (event_metrics.event_bytes + version_metrics.version_bytes) > 262144000
  from event_metrics
  cross join version_metrics
  cross join count_metrics;
end;
$$;

revoke execute on function public.get_estimate_activity_retention_metrics(uuid) from public;
revoke execute on function public.get_estimate_activity_retention_metrics(uuid) from anon;
grant execute on function public.get_estimate_activity_retention_metrics(uuid) to authenticated;
