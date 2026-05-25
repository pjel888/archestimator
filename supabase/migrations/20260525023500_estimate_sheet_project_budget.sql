-- Move the active project-budget contract from project metadata to each estimate sheet.

alter table public.estimates
  add column if not exists project_budget numeric(14, 2)
    check (project_budget is null or project_budget >= 0);

update public.estimates estimate
set project_budget = (project.metadata->>'projectBudget')::numeric
from public.projects project
where estimate.project_id = project.id
  and estimate.project_budget is null
  and jsonb_typeof(project.metadata->'projectBudget') = 'number';

update public.estimates
set project_budget = 2000000.00
where project_id = '22222222-2222-4222-8222-222222222222'
  and project_budget is null;

create or replace function public.update_estimate_details_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  estimate_patch jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
  committed_result jsonb;
  old_estimate public.estimates;
  updated_estimate public.estimates;
  old_snapshot jsonb;
  new_snapshot jsonb;
  changed_fields text[];
  inserted_event_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  select * into old_estimate
  from public.estimates estimate
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  for update;

  if old_estimate.id is null then
    raise exception 'Estimate not found in the current project.';
  end if;

  if estimate_patch ? 'projectBudget'
    and estimate_patch->'projectBudget' <> 'null'::jsonb
    and jsonb_typeof(estimate_patch->'projectBudget') <> 'number' then
    raise exception 'Project budget must be a number or null.';
  end if;

  if estimate_patch ? 'projectBudget'
    and estimate_patch->'projectBudget' <> 'null'::jsonb
    and (estimate_patch->>'projectBudget')::numeric < 0 then
    raise exception 'Project budget must be zero or greater.';
  end if;

  old_snapshot := jsonb_build_object(
    'name', old_estimate.name,
    'sheetCode', old_estimate.sheet_code,
    'projectBudget', old_estimate.project_budget,
    'metadata', old_estimate.metadata
  );

  update public.estimates estimate
  set name = case
        when estimate_patch ? 'name' then coalesce(nullif(trim(estimate_patch->>'name'), ''), estimate.name)
        else estimate.name
      end,
      sheet_code = case
        when estimate_patch ? 'sheetCode' then coalesce(nullif(trim(estimate_patch->>'sheetCode'), ''), estimate.sheet_code)
        else estimate.sheet_code
      end,
      project_budget = case
        when estimate_patch ? 'projectBudget' and estimate_patch->'projectBudget' = 'null'::jsonb then null
        when estimate_patch ? 'projectBudget' then (estimate_patch->>'projectBudget')::numeric
        else estimate.project_budget
      end,
      metadata = case
        when estimate_patch ? 'metadata' then coalesce(estimate_patch->'metadata', '{}'::jsonb)
        else estimate.metadata
      end,
      updated_at = now()
  where estimate.id = target_estimate_id
    and estimate.project_id = target_project_id
  returning * into updated_estimate;

  new_snapshot := jsonb_build_object(
    'name', updated_estimate.name,
    'sheetCode', updated_estimate.sheet_code,
    'projectBudget', updated_estimate.project_budget,
    'metadata', updated_estimate.metadata
  );
  changed_fields := public.estimate_sheet_changed_fields(old_snapshot, new_snapshot, array['name', 'sheetCode', 'projectBudget', 'metadata']);

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    old_snapshot,
    new_snapshot,
    changed_fields,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    case
      when changed_fields = array['sheetCode']::text[] then 'sheet_code_updated'
      else 'sheet_metadata_updated'
    end,
    'server_action',
    correlation_id,
    resolved_user_id,
    old_snapshot,
    new_snapshot,
    changed_fields,
    jsonb_build_object(
      'estimateId', target_estimate_id,
      'old', old_snapshot,
      'new', new_snapshot
    )
  )
  returning id into inserted_event_id;

  return jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id,
    'estimateId', updated_estimate.id,
    'estimate', new_snapshot
  );
end;
$$;

revoke execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) to authenticated;
