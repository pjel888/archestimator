drop function if exists public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid, boolean, uuid);

create or replace function public.read_project_collaboration_audit_events(
  target_project_id uuid,
  target_estimate_id uuid default null,
  page_limit integer default 51,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  target_project_only boolean default false,
  target_actor_user_id uuid default null,
  target_action_buckets text[] default null
)
returns table (
  id uuid,
  project_id uuid,
  estimate_id uuid,
  actor_user_id uuid,
  event_type text,
  metadata jsonb,
  created_at timestamptz,
  source_total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  safe_limit integer := least(51, greatest(1, coalesce(page_limit, 51)));
begin
  if not public.can_edit_project(target_project_id) then
    raise exception 'permission denied for project collaboration activity'
      using errcode = '42501';
  end if;

  return query
  with base as (
    select
      cae.id,
      cae.project_id,
      cae.estimate_id,
      cae.actor_user_id,
      cae.event_type,
      cae.metadata,
      cae.created_at
    from public.collaboration_audit_events cae
    where cae.project_id = target_project_id
      and (target_estimate_id is null or cae.estimate_id = target_estimate_id)
      and (target_project_only is false or cae.estimate_id is null)
      and (target_actor_user_id is null or cae.actor_user_id = target_actor_user_id)
      and (
        target_action_buckets is null
        or (
          'invited' = any(target_action_buckets)
          and cae.event_type = any(array['invite_email_attempted', 'invite_email_sent', 'member_removed', 'role_changed']::text[])
        )
        or (
          'edited' = any(target_action_buckets)
          and cae.event_type = 'project_metadata_updated'
        )
        or (
          'system' = any(target_action_buckets)
          and not (
            cae.event_type = any(array['invite_email_attempted', 'invite_email_sent', 'member_removed', 'project_metadata_updated', 'role_changed']::text[])
          )
        )
      )
  ),
  bounded as (
    select b.*
    from base b
    where cursor_created_at is null
      or b.created_at < cursor_created_at
      or (b.created_at = cursor_created_at and b.id < cursor_id)
    order by b.created_at desc, b.id desc
    limit safe_limit
  )
  select
    bounded.id,
    bounded.project_id,
    bounded.estimate_id,
    bounded.actor_user_id,
    bounded.event_type,
    bounded.metadata,
    bounded.created_at,
    (select count(*) from base) as source_total_count
  from bounded
  order by bounded.created_at desc, bounded.id desc;
end;
$$;

revoke execute on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid, boolean, uuid, text[]) from public;
revoke execute on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid, boolean, uuid, text[]) from anon;
grant execute on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid, boolean, uuid, text[]) to authenticated;
