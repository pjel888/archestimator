begin;

-- U4 (SEC-1 / DEF-4): the live `insert_estimate_template_into_estimate_with_history`
-- gates on workspace membership only (`resolve_estimate_workspace`), so a workspace
-- member who is a *viewer* on a restricted estimate can still insert a template.
--
-- This standalone hardening swaps the gate to `assert_can_edit_estimate_for_history`
-- (membership + `can_edit_estimate`) WITHOUT requiring the `estimate_tabs` foundation
-- migration (20260612094734). It re-creates the LIVE (no-tab) RPC body verbatim and
-- changes ONLY the single gate line.
--
-- ⚠ Do NOT copy the foundation migration's RPC body here: that body reads/writes
-- `estimate_tab_id` columns that are absent on the live database, so it would fail to
-- apply (doc 16, U4-4). The foundation already uses the same hardened gate, so applying
-- the foundation later (D-A) preserves this fix.

-- 1) The gate helper — identical to 20260612094734_estimate_tabs_foundation.sql:180-206.
--    It has no tab dependency: membership resolve → bypass short-circuit → can_edit.
create or replace function public.assert_can_edit_estimate_for_history(
  target_project_id uuid,
  target_estimate_id uuid,
  acting_user_id uuid default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_workspace_id uuid;
begin
  resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

  if public.estimate_sheet_can_bypass_auth() then
    return resolved_workspace_id;
  end if;

  if not public.can_edit_estimate(target_estimate_id) then
    raise exception 'Estimate edit access denied.';
  end if;

  return resolved_workspace_id;
end;
$$;

-- 2) Re-create the LIVE insert RPC body (from 20260524033151_estimate_sheet_version_control.sql)
--    swapping ONLY the gate line (resolve_estimate_workspace -> assert_can_edit_estimate_for_history).
--    The live no-tab events insert and the live inner copy are unchanged.
create or replace function public.insert_estimate_template_into_estimate_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid,
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
  insert_result jsonb;
  inserted_event_id uuid;
begin
  -- U4: was public.resolve_estimate_workspace(...) (membership only).
  resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);
  perform 1 from public.estimates estimate where estimate.id = target_estimate_id for update;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result;
  end if;

  insert_result := public.insert_estimate_template_into_estimate(
    target_project_id,
    target_estimate_id,
    target_parent_node_id,
    source_template_id
  );

  insert into public.estimate_sheet_events (
    estimate_id,
    workspace_id,
    estimate_node_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    changed_fields,
    payload
  )
  values (
    target_estimate_id,
    resolved_workspace_id,
    target_parent_node_id,
    'template_inserted',
    'server_action',
    correlation_id,
    resolved_user_id,
    array['template'],
    insert_result || jsonb_build_object('sourceTemplateId', source_template_id, 'targetParentNodeId', target_parent_node_id)
  )
  returning id into inserted_event_id;

  return insert_result || jsonb_build_object(
    'idempotent', false,
    'eventId', inserted_event_id
  );
end;
$$;

commit;
