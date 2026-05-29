-- Transactional Apply boundary for confirmed Ask Flip component-library create drafts.
-- Reuses ai_package_apply_commands so component-only Apply gets the same
-- idempotency semantics as package project creation without project/estimate
-- side effects.

create extension if not exists pgcrypto;

create or replace function public.create_ai_package_library_components_with_history(
  target_workspace_id uuid,
  component_payloads jsonb,
  draft_id text,
  draft_hash text,
  idempotency_key text,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  command_id uuid;
  existing_command public.ai_package_apply_commands%rowtype;
  authenticated_user_id uuid := auth.uid();
  authorization_run public.ai_action_runs%rowtype;
  payload jsonb;
  component_result jsonb;
  created_component_ids uuid[] := '{}'::uuid[];
  created_component_count integer := 0;
  package_total numeric := 0;
  result_payload jsonb;
begin
  if authenticated_user_id is null then
    raise exception 'Package Apply requires an authenticated user.';
  end if;

  if public.is_workspace_editor(target_workspace_id) is not true then
    raise exception 'Package Apply requires workspace editor access.';
  end if;

  if draft_id is null or char_length(trim(draft_id)) = 0 then
    raise exception 'Package Apply requires a valid draft id.';
  end if;

  if draft_hash is null or draft_hash not like 'sha256:%' then
    raise exception 'Package Apply requires a valid draft hash.';
  end if;

  if idempotency_key is null or char_length(trim(idempotency_key)) = 0 then
    raise exception 'Package Apply requires a valid idempotency key.';
  end if;

  if component_payloads is null
    or jsonb_typeof(component_payloads) <> 'array'
    or jsonb_array_length(component_payloads) = 0
  then
    raise exception 'Component Apply requires at least one component payload.';
  end if;

  select run_row.*
    into authorization_run
    from public.ai_action_runs run_row
   where run_row.run_id = correlation_id
     and run_row.workspace_id = target_workspace_id
     and run_row.actor_user_id = authenticated_user_id
     and run_row.mode = 'apply'::public.ai_interaction_mode
     and run_row.status = 'started'::public.ai_run_status
     and run_row.provider = 'app-command'
     and run_row.model = 'server-authorization'
     and run_row.metadata->>'draftId' = draft_id
     and run_row.metadata->>'draftHash' = draft_hash
     and run_row.metadata->>'idempotencyKey' = idempotency_key
     and run_row.metadata->>'draftTokenVerified' = 'true'
     and run_row.metadata->>'serverConfirmation' = 'true'
     and coalesce((run_row.metadata->>'componentCreateCount')::integer, 0) > 0
     and run_row.created_at >= now() - interval '30 minutes'
   for update;

  if authorization_run.run_id is null then
    raise exception 'Package Apply requires server-side confirmation authorization.';
  end if;

  insert into public.ai_package_apply_commands (
    workspace_id,
    idempotency_key,
    draft_id,
    draft_hash,
    status,
    actor_user_id
  )
  values (
    target_workspace_id,
    idempotency_key,
    draft_id,
    draft_hash,
    'started',
    authenticated_user_id
  )
  on conflict on constraint ai_package_apply_commands_workspace_id_idempotency_key_key do nothing
  returning id into command_id;

  if command_id is null then
    select command_row.*
      into existing_command
      from public.ai_package_apply_commands command_row
     where command_row.workspace_id = target_workspace_id
       and command_row.idempotency_key = create_ai_package_library_components_with_history.idempotency_key
     for update;

    if existing_command.draft_hash <> draft_hash then
      raise exception 'Idempotency key already belongs to a different component draft.';
    end if;

    if existing_command.status = 'completed' and existing_command.result is not null then
      result_payload := existing_command.result
        || jsonb_build_object(
          'recoveryStatus', 'idempotent_replay',
          'idempotentReplay', true,
          'auditRunId', correlation_id::text
        );

      update public.ai_action_runs action_run
         set status = 'completed'::public.ai_run_status,
             model = 'server-validator',
             provider_send_categories = array['server_verified_draft_token', 'explicit_user_confirmation', 'validated_draft_hash', 'idempotency_replay', 'safe_summary'],
             redaction_status = 'metadata_only'::public.ai_redaction_status,
             metadata = action_run.metadata || jsonb_build_object(
               'createdComponentIds', result_payload->'createdComponentIds',
               'createdComponentCount', result_payload->'createdComponentCount',
               'idempotentReplay', true
             ),
             completed_at = now()
       where action_run.run_id = correlation_id;

      insert into public.ai_tool_calls (
        run_id,
        workspace_id,
        actor_user_id,
        tool_name,
        mode,
        status,
        target_project_id,
        target_estimate_id,
        target_node_id,
        args_hash,
        result_hash,
        safe_summary,
        completed_at
      )
      values (
        correlation_id,
        target_workspace_id,
        authenticated_user_id,
        'create_ai_package_library_components_with_history',
        'apply',
        'completed',
        null,
        null,
        null,
        'sha256:' || encode(extensions.digest(draft_hash || ':' || idempotency_key, 'sha256'), 'hex'),
        'sha256:' || encode(extensions.digest(result_payload::text, 'sha256'), 'hex'),
        'Replayed confirmed AI component-library create draft idempotently.',
        now()
      );

      return result_payload;
    end if;

    raise exception 'Package Apply is already in progress for this idempotency key.';
  end if;

  for payload in
    select value from jsonb_array_elements(component_payloads)
  loop
    if jsonb_typeof(payload->'component') <> 'object' then
      raise exception 'Component Apply payload is missing component data.';
    end if;
    if jsonb_typeof(payload->'priceOptions') <> 'array'
      or jsonb_array_length(payload->'priceOptions') = 0
    then
      raise exception 'Component Apply payload is missing price options.';
    end if;
    if (payload->'component') ? 'workspaceId' or (payload->'component') ? 'workspace_id' then
      raise exception 'Component Apply payload must not provide workspace identity.';
    end if;

    component_result := public.create_cost_library_component(
      target_workspace_id,
      payload->'component',
      payload->'priceOptions'
    );

    if nullif(component_result->>'itemId', '') is null then
      raise exception 'Component Apply returned an incomplete component result.';
    end if;

    created_component_ids := array_append(created_component_ids, (component_result->>'itemId')::uuid);
    created_component_count := created_component_count + 1;
    package_total := package_total + coalesce(nullif(payload->>'total', '')::numeric, 0);
  end loop;

  result_payload := jsonb_build_object(
    'projectId', null,
    'estimateId', null,
    'selectedNodeId', null,
    'createdNodeIds', '{}'::jsonb,
    'insertedRowIds', '[]'::jsonb,
    'updatedRowIds', '[]'::jsonb,
    'replacedRowIds', '[]'::jsonb,
    'deletedRowIds', '[]'::jsonb,
    'createdComponentIds', to_jsonb(created_component_ids),
    'createdComponentCount', created_component_count,
    'total', package_total,
    'warnings', '[]'::jsonb,
    'recoveryStatus', 'completed',
    'idempotencyKey', idempotency_key,
    'idempotentReplay', false,
    'auditRunId', correlation_id::text
  );

  update public.ai_action_runs action_run
     set status = 'completed'::public.ai_run_status,
         model = 'server-validator',
         provider_send_categories = array['server_verified_draft_token', 'explicit_user_confirmation', 'validated_draft_hash', 'component_library_create', 'safe_summary'],
         redaction_status = 'metadata_only'::public.ai_redaction_status,
         metadata = action_run.metadata || jsonb_build_object(
           'createdComponentIds', to_jsonb(created_component_ids),
           'createdComponentCount', created_component_count,
           'idempotentReplay', false
         ),
         completed_at = now()
   where action_run.run_id = correlation_id;

  insert into public.ai_tool_calls (
    run_id,
    workspace_id,
    actor_user_id,
    tool_name,
    mode,
    status,
    target_project_id,
    target_estimate_id,
    target_node_id,
    args_hash,
    result_hash,
    safe_summary,
    completed_at
  )
  values (
    correlation_id,
    target_workspace_id,
    authenticated_user_id,
    'create_ai_package_library_components_with_history',
    'apply',
    'completed',
    null,
    null,
    null,
    'sha256:' || encode(extensions.digest(draft_hash || ':' || idempotency_key, 'sha256'), 'hex'),
    'sha256:' || encode(extensions.digest(result_payload::text, 'sha256'), 'hex'),
    'Created confirmed AI component-library draft transactionally with server-side validation and idempotency.',
    now()
  );

  update public.ai_package_apply_commands
     set status = 'completed',
         result = result_payload,
         completed_at = now()
   where id = command_id;

  return result_payload;
end;
$$;

revoke execute on function public.create_ai_package_library_components_with_history(uuid, jsonb, text, text, text, uuid) from public;
revoke execute on function public.create_ai_package_library_components_with_history(uuid, jsonb, text, text, text, uuid) from anon;
revoke execute on function public.create_ai_package_library_components_with_history(uuid, jsonb, text, text, text, uuid) from service_role;
grant execute on function public.create_ai_package_library_components_with_history(uuid, jsonb, text, text, text, uuid) to authenticated;
