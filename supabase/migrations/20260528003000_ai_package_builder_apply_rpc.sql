-- Transactional Apply boundary for confirmed Ask Flip package-builder drafts.
-- The application route verifies the server-signed draft token and explicit
-- confirmation, writes a metadata-only ai_action_runs authorization row, then
-- invokes this authenticated RPC. The database derives the actor from auth.uid()
-- and rejects direct calls that do not have that server-side authorization row.

create extension if not exists pgcrypto;

create table if not exists public.ai_package_apply_commands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idempotency_key text not null check (char_length(trim(idempotency_key)) > 0),
  draft_id text not null check (char_length(trim(draft_id)) > 0),
  draft_hash text not null check (draft_hash like 'sha256:%'),
  status text not null default 'started' check (status in ('started', 'completed')),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  estimate_id uuid references public.estimates(id) on delete set null,
  selected_node_id uuid references public.estimate_nodes(id) on delete set null,
  created_node_ids jsonb not null default '{}'::jsonb,
  inserted_row_ids uuid[] not null default '{}'::uuid[],
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workspace_id, idempotency_key)
);

alter table public.ai_package_apply_commands enable row level security;

drop policy if exists ai_package_apply_commands_select_authenticated on public.ai_package_apply_commands;
create policy ai_package_apply_commands_select_authenticated on public.ai_package_apply_commands
  for select to authenticated
  using (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

revoke all on public.ai_package_apply_commands from public;
revoke all on public.ai_package_apply_commands from anon, authenticated;

drop function if exists public.create_project_estimate_package_with_history(uuid, jsonb, text, text, uuid, uuid);

create or replace function public.create_project_estimate_package_with_history(
  target_workspace_id uuid,
  package_draft jsonb,
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
  draft_id text := package_draft->>'draftId';
  metadata jsonb;
  created_project_id uuid;
  created_estimate_id uuid;
  selected_node_id uuid;
  created_node_ids jsonb := '{}'::jsonb;
  node_kind_by_client_id jsonb := '{}'::jsonb;
  remaining_nodes jsonb := coalesce(package_draft->'treeDraft', '[]'::jsonb);
  next_remaining_nodes jsonb;
  node_payload jsonb;
  row_payload jsonb;
  parent_client_id text;
  parent_node_id uuid;
  new_node_id uuid;
  new_row_id uuid;
  processed_any boolean;
  row_index integer := 0;
  source_type text;
  source_item_id uuid;
  price_option_id uuid;
  item_row public.cost_library_items%rowtype;
  price_option_row public.cost_library_item_price_options%rowtype;
  row_source_snapshot jsonb;
  row_quantity numeric;
  row_unit_cost numeric;
  row_misc_cost numeric;
  row_contingency numeric;
  package_total numeric := 0;
  inserted_row_ids uuid[] := '{}'::uuid[];
  result_payload jsonb;
  authenticated_user_id uuid := auth.uid();
  authorization_run public.ai_action_runs%rowtype;
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
     and run_row.created_at >= now() - interval '30 minutes'
   for update;

  if authorization_run.run_id is null then
    raise exception 'Package Apply requires server-side confirmation authorization.';
  end if;

  if coalesce((package_draft #>> '{applyEligibility,eligible}')::boolean, false) is not true then
    raise exception 'Package draft is not eligible for Apply.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(package_draft->'operations', '[]'::jsonb)) operation
    where coalesce((operation->>'applyEligible')::boolean, false) is not true
  ) then
    raise exception 'Package draft contains an ineligible operation.';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(package_draft->'operations', '[]'::jsonb)) operation
    where operation->>'type' = 'create_project'
  ) or not exists (
    select 1
    from jsonb_array_elements(coalesce(package_draft->'operations', '[]'::jsonb)) operation
    where operation->>'type' = 'create_estimate'
  ) then
    raise exception 'Package draft must include project and estimate creation operations.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(package_draft->'rowDraft', '[]'::jsonb)) as row_item(value)
    where coalesce((row_item.value->>'applyEligible')::boolean, false) is not true
  ) then
    raise exception 'Package draft contains an ineligible row.';
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
       and command_row.idempotency_key = create_project_estimate_package_with_history.idempotency_key
     for update;

    if existing_command.draft_hash <> draft_hash then
      raise exception 'Idempotency key already belongs to a different package draft.';
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
               'projectId', existing_command.project_id,
               'estimateId', existing_command.estimate_id,
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
        'create_project_estimate_package_with_history',
        'apply',
        'completed',
        existing_command.project_id,
        existing_command.estimate_id,
        existing_command.selected_node_id,
        'sha256:' || encode(extensions.digest(draft_hash || ':' || idempotency_key, 'sha256'), 'hex'),
        'sha256:' || encode(extensions.digest(result_payload::text, 'sha256'), 'hex'),
        'Returned existing confirmed AI package Apply for the same idempotency key.',
        now()
      );

      return result_payload;
    end if;

    raise exception 'Previous package Apply with this idempotency key is incomplete; manual recovery is required before retrying.';
  end if;

  metadata := jsonb_build_object(
    'aiPackageBuilder',
    jsonb_build_object(
      'draftId', draft_id,
      'schemaVersion', package_draft->>'schemaVersion',
      'draftHash', draft_hash,
      'idempotencyKey', idempotency_key,
      'source', 'ask-flip'
    )
  );

  insert into public.projects (
    workspace_id,
    created_by,
    name,
    client_name,
    location,
    project_code,
    currency_code,
    metadata
  )
  values (
    target_workspace_id,
    authenticated_user_id,
    package_draft #>> '{projectDraft,name}',
    nullif(package_draft #>> '{projectDraft,clientName}', ''),
    nullif(package_draft #>> '{projectDraft,location}', ''),
    null,
    coalesce(package_draft #>> '{brief,currencyCode}', 'PHP'),
    metadata || jsonb_build_object('projectBudget', nullif(package_draft #>> '{projectDraft,projectBudget}', '')::numeric)
  )
  returning id into created_project_id;

  insert into public.estimates (
    project_id,
    created_by,
    name,
    sheet_code,
    currency_code,
    project_budget,
    notes,
    metadata
  )
  values (
    created_project_id,
    authenticated_user_id,
    package_draft #>> '{estimateDraft,name}',
    coalesce(nullif(package_draft #>> '{estimateDraft,sheetCode}', ''), 'ES-001'),
    coalesce(package_draft #>> '{brief,currencyCode}', 'PHP'),
    nullif(package_draft #>> '{projectDraft,projectBudget}', '')::numeric,
    null,
    metadata
  )
  returning id into created_estimate_id;

  while jsonb_array_length(remaining_nodes) > 0 loop
    processed_any := false;
    next_remaining_nodes := '[]'::jsonb;

    for node_payload in select value from jsonb_array_elements(remaining_nodes) loop
      parent_client_id := nullif(node_payload->>'parentClientDraftId', '');
      if parent_client_id is null or created_node_ids ? parent_client_id then
        parent_node_id := case when parent_client_id is null then null else (created_node_ids->>parent_client_id)::uuid end;
        new_node_id := gen_random_uuid();

        insert into public.estimate_nodes (
          id,
          estimate_id,
          parent_id,
          kind,
          name,
          sort_order,
          metadata
        )
        values (
          new_node_id,
          created_estimate_id,
          parent_node_id,
          (node_payload->>'kind')::public.estimate_node_kind,
          node_payload->>'name',
          coalesce((node_payload->>'sortOrder')::integer, 0),
          jsonb_build_object(
            'aiPackageBuilder',
            jsonb_build_object(
              'draftId', draft_id,
              'clientDraftId', node_payload->>'clientDraftId',
              'idempotencyKey', idempotency_key
            )
          )
        );

        created_node_ids := created_node_ids || jsonb_build_object(node_payload->>'clientDraftId', new_node_id::text);
        node_kind_by_client_id := node_kind_by_client_id || jsonb_build_object(node_payload->>'clientDraftId', node_payload->>'kind');
        if selected_node_id is null and node_payload->>'kind' = 'area' then
          selected_node_id := new_node_id;
        end if;
        processed_any := true;
      else
        next_remaining_nodes := next_remaining_nodes || jsonb_build_array(node_payload);
      end if;
    end loop;

    if not processed_any then
      raise exception 'Package tree hierarchy is invalid.';
    end if;

    remaining_nodes := next_remaining_nodes;
  end loop;

  if selected_node_id is null then
    select (value #>> '{}')::uuid
      into selected_node_id
      from jsonb_each(created_node_ids)
     limit 1;
  end if;

  for row_payload in select value from jsonb_array_elements(coalesce(package_draft->'rowDraft', '[]'::jsonb)) loop
    if not (created_node_ids ? (row_payload->>'targetAreaClientDraftId')) then
      raise exception 'Package row target Area Node is missing.';
    end if;
    if node_kind_by_client_id->>(row_payload->>'targetAreaClientDraftId') <> 'area' then
      raise exception 'Package rows must target Area Nodes.';
    end if;

    source_type := row_payload->>'sourceType';
    source_item_id := null;
    price_option_id := null;
    item_row := null;
    price_option_row := null;
    row_source_snapshot := case
      when jsonb_typeof(row_payload->'sourceSnapshot') = 'object' then row_payload->'sourceSnapshot'
      else '{}'::jsonb
    end;

    if source_type = 'library_item' then
      source_item_id := nullif(row_payload->>'sourceLibraryItemId', '')::uuid;
      select *
        into item_row
        from public.cost_library_items item
       where item.id = source_item_id
         and item.workspace_id = target_workspace_id
         and item.lifecycle_state::text not in ('archived', 'discontinued');

      if item_row.id is null then
        raise exception 'Package row references an inactive or unavailable component.';
      end if;

      if nullif(row_payload->>'priceOptionId', '') is not null then
        price_option_id := (row_payload->>'priceOptionId')::uuid;
        if nullif(row_payload->>'priceOptionUpdatedAt', '') is null then
          raise exception 'Package row with a price option requires a confirmed updated timestamp.';
        end if;

        select *
          into price_option_row
          from public.cost_library_item_price_options option_row
         where option_row.id = price_option_id
           and option_row.item_id = source_item_id
           and option_row.workspace_id = target_workspace_id
           and option_row.is_active = true;

        if price_option_row.id is null then
          raise exception 'Package row references a stale or inactive price option.';
        end if;

        if (row_payload->>'priceOptionUpdatedAt')::timestamptz <> price_option_row.updated_at then
          raise exception 'Package draft is stale because a price option changed.';
        end if;
      elsif nullif(row_source_snapshot->>'componentVersionNumber', '') is null then
        raise exception 'Package row without a price option requires a component version snapshot.';
      elsif (row_source_snapshot->>'componentVersionNumber')::integer <> item_row.current_version_number then
        raise exception 'Package draft is stale because a component version changed.';
      end if;
    elsif source_type <> 'allowance' then
      raise exception 'Unsupported package row source type.';
    end if;

    row_quantity := coalesce((row_payload->>'quantity')::numeric, 0);
    row_unit_cost := coalesce(price_option_row.unit_cost, item_row.unit_cost, (row_payload->>'unitCost')::numeric, 0);
    row_misc_cost := coalesce(price_option_row.misc_cost, item_row.misc_cost, (row_payload->>'miscCost')::numeric, 0);
    row_contingency := coalesce((row_payload->>'contingencyPercentage')::numeric, 0);
    package_total := package_total + (row_quantity * row_unit_cost) + row_misc_cost + ((row_quantity * row_unit_cost) * row_contingency / 100);
    new_row_id := gen_random_uuid();

    insert into public.estimate_row_items (
      id,
      estimate_id,
      node_id,
      sort_order,
      source_library_item_id,
      source_snapshot,
      category_node_id,
      supplier_id,
      material,
      description,
      supplier,
      unit,
      quantity,
      unit_cost,
      contingency_percentage,
      misc_cost,
      discipline,
      designation,
      metadata,
      link_state
    )
    values (
      new_row_id,
      created_estimate_id,
      (created_node_ids->>(row_payload->>'targetAreaClientDraftId'))::uuid,
      row_index,
      case when source_type = 'library_item' then source_item_id else null end,
      case
        when source_type = 'library_item' then row_source_snapshot || jsonb_build_object(
          'sourceType', 'library_item',
          'sourceLibraryItemId', source_item_id,
          'category', item_row.category,
          'categoryNodeId', item_row.category_node_id,
          'brand', item_row.brand,
          'brandId', item_row.brand_id,
          'componentVersionNumber', item_row.current_version_number,
          'imageUrl', item_row.thumbnail_path,
          'lifecycleState', item_row.lifecycle_state,
          'priceOptionId', coalesce(price_option_row.id, item_row.active_price_option_id),
          'priceOptionLabel', price_option_row.label,
          'priceOptionUpdatedAt', price_option_row.updated_at,
          'pricingDate', coalesce(price_option_row.pricing_date, item_row.pricing_date),
          'pricingSource', coalesce(price_option_row.pricing_source, item_row.pricing_source, 'Component library'),
          'supplier', item_row.supplier,
          'supplierId', coalesce(price_option_row.supplier_id, item_row.supplier_id),
          'unit', coalesce(price_option_row.unit, item_row.unit),
          'unit_cost', row_unit_cost,
          'misc_cost', row_misc_cost,
          'confidence', coalesce(price_option_row.confidence, item_row.confidence),
          'currency', coalesce(price_option_row.currency, 'PHP'),
          'snapshotPreservedAt', now()
        )
        else row_source_snapshot || jsonb_build_object(
          'sourceType', 'allowance',
          'generatedBy', 'ai-package-builder',
          'notSupplierPriced', true,
          'sourceLibraryItemId', null,
          'snapshotPreservedAt', now()
        )
      end,
      case when source_type = 'library_item' then item_row.category_node_id else null end,
      case when source_type = 'library_item' then coalesce(price_option_row.supplier_id, item_row.supplier_id) else null end,
      row_payload->>'material',
      row_payload->>'description',
      case when source_type = 'library_item' then coalesce(item_row.supplier, row_payload->>'supplier', '') else '' end,
      coalesce(price_option_row.unit, item_row.unit, row_payload->>'unit', 'unit'),
      row_quantity,
      row_unit_cost,
      row_contingency,
      row_misc_cost,
      '',
      case when source_type = 'allowance' then 'AI allowance' else '' end,
      jsonb_build_object(
        'aiPackageBuilder',
        jsonb_build_object(
          'draftId', draft_id,
          'clientDraftId', row_payload->>'clientDraftId',
          'sourceType', source_type,
          'idempotencyKey', idempotency_key,
          'allowance', source_type = 'allowance'
        ),
        'assumption', row_payload->>'assumption',
        'warnings', coalesce(row_payload->'warnings', '[]'::jsonb)
      ),
      case when source_type = 'library_item' then 'linked-clean'::public.estimate_row_link_state else 'unlinked'::public.estimate_row_link_state end
    );

    inserted_row_ids := array_append(inserted_row_ids, new_row_id);
    row_index := row_index + 1;
  end loop;

  insert into public.estimate_sheet_events (
    workspace_id,
    estimate_id,
    actor_user_id,
    event_type,
    event_source,
    estimate_node_id,
    target_row_id,
    row_context,
    old_snapshot,
    new_snapshot,
    changed_fields,
    total_delta,
    payload,
    metadata,
    correlation_id
  )
  values (
    target_workspace_id,
    created_estimate_id,
    authenticated_user_id,
    'ai_package_applied',
    'ai_package_builder',
    selected_node_id,
    null,
    '{}'::jsonb,
    null,
    jsonb_build_object(
      'projectId', created_project_id,
      'estimateId', created_estimate_id,
      'createdNodeIds', created_node_ids,
      'insertedRowIds', to_jsonb(inserted_row_ids),
      'total', package_total,
      'budgetSummary', package_draft->'budgetSummary'
    ),
    array['project', 'estimate', 'tree', 'rows'],
    package_total,
    jsonb_build_object(
      'draftId', draft_id,
      'draftHash', draft_hash,
      'idempotencyKey', idempotency_key,
      'warnings', coalesce(package_draft->'warnings', '[]'::jsonb)
    ),
    metadata,
    correlation_id
  );

  result_payload := jsonb_build_object(
    'projectId', created_project_id,
    'estimateId', created_estimate_id,
    'selectedNodeId', selected_node_id,
    'createdNodeIds', created_node_ids,
    'insertedRowIds', to_jsonb(inserted_row_ids),
    'total', package_total,
    'warnings', coalesce(package_draft->'warnings', '[]'::jsonb),
    'recoveryStatus', 'completed',
    'idempotencyKey', idempotency_key,
    'idempotentReplay', false,
    'auditRunId', correlation_id
  );

  update public.ai_action_runs action_run
     set status = 'completed'::public.ai_run_status,
         model = 'server-validator',
         provider_send_categories = array['server_verified_draft_token', 'explicit_user_confirmation', 'validated_draft_hash', 'created_ids', 'safe_summary'],
         redaction_status = 'metadata_only'::public.ai_redaction_status,
         metadata = action_run.metadata || jsonb_build_object(
           'projectId', created_project_id,
           'estimateId', created_estimate_id,
           'insertedRowCount', array_length(inserted_row_ids, 1)
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
    'create_project_estimate_package_with_history',
    'apply',
    'completed',
    created_project_id,
    created_estimate_id,
    selected_node_id,
    'sha256:' || encode(extensions.digest(draft_hash || ':' || idempotency_key, 'sha256'), 'hex'),
    'sha256:' || encode(extensions.digest(result_payload::text, 'sha256'), 'hex'),
    'Applied confirmed AI package draft transactionally with server-side validation and idempotency.',
    now()
  );

  update public.ai_package_apply_commands
     set status = 'completed',
         project_id = created_project_id,
         estimate_id = created_estimate_id,
         selected_node_id = selected_node_id,
         created_node_ids = created_node_ids,
         inserted_row_ids = inserted_row_ids,
         result = result_payload,
         completed_at = now()
   where id = command_id;

  return result_payload;
end;
$$;

revoke execute on function public.create_project_estimate_package_with_history(uuid, jsonb, text, text, uuid) from public;
revoke execute on function public.create_project_estimate_package_with_history(uuid, jsonb, text, text, uuid) from anon;
revoke execute on function public.create_project_estimate_package_with_history(uuid, jsonb, text, text, uuid) from service_role;
grant execute on function public.create_project_estimate_package_with_history(uuid, jsonb, text, text, uuid) to authenticated;
