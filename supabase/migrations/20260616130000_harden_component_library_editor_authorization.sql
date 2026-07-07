-- Harden component-library write authorization.
--
-- Aardvark finding: the component versioning migration introduced SECURITY
-- DEFINER write RPCs and direct table policies that accepted any workspace
-- member. Workspace viewers must retain read access, but only workspace
-- editors/admins/owners may mutate component identity, price options, lifecycle
-- state, or immutable version/history tables.

begin;

create or replace function public.validate_cost_library_component_refs(
  target_workspace_id uuid,
  library_folder_id uuid,
  category_node_id text,
  supplier_id uuid,
  acting_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
begin
  if resolved_user_id is null or not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = resolved_user_id
        and member.role in ('owner'::public.workspace_role, 'admin'::public.workspace_role, 'member'::public.workspace_role)
    )
  ) then
    raise exception 'Workspace editor access required.';
  end if;

  if library_folder_id is not null and not exists (
    select 1 from public.library_folders folder
    where folder.id = library_folder_id
      and folder.workspace_id = target_workspace_id
  ) then
    raise exception 'Library folder not found in the current workspace.';
  end if;

  if category_node_id is not null and not exists (
    select 1 from public.component_category_nodes node
    where node.id = category_node_id
      and node.workspace_id = target_workspace_id
  ) then
    raise exception 'Category node not found in the current workspace.';
  end if;

  if supplier_id is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = supplier_id
      and supplier.workspace_id = target_workspace_id
  ) then
    raise exception 'Supplier not found in the current workspace.';
  end if;
end;
$$;

create or replace function public.assert_cost_library_component_editor(
  target_workspace_id uuid,
  acting_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  resolved_user_id uuid := coalesce(auth.uid(), acting_user_id);
begin
  if resolved_user_id is null or not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = resolved_user_id
        and member.role in ('owner'::public.workspace_role, 'admin'::public.workspace_role, 'member'::public.workspace_role)
    )
  ) then
    raise exception 'Workspace editor access required.';
  end if;

  return resolved_user_id;
end;
$$;

create or replace function public.upsert_cost_library_component_price_option(
  target_workspace_id uuid,
  target_item_id uuid,
  price_option jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.cost_library_items;
  option_id uuid := nullif(price_option->>'id', '')::uuid;
  current_user_id uuid := coalesce(auth.uid(), nullif(price_option->>'updatedBy', '')::uuid, nullif(price_option->>'createdBy', '')::uuid);
  old_snapshot jsonb := null;
  new_snapshot jsonb;
  saved_option public.cost_library_item_price_options;
  make_default boolean := coalesce((price_option->>'isDefault')::boolean, false);
  change_reason text := coalesce(price_option->>'changeReason', '');
  effective_at timestamptz := coalesce(nullif(price_option->>'effectiveAt', '')::timestamptz, now());
  next_version integer;
begin
  current_user_id := public.assert_cost_library_component_editor(target_workspace_id, current_user_id);

  select *
    into item_row
  from public.cost_library_items
  where id = target_item_id
    and workspace_id = target_workspace_id
  for update;

  if item_row.id is null then
    raise exception 'Component not found in the current workspace.';
  end if;

  if nullif(price_option->>'supplierId', '')::uuid is not null and not exists (
    select 1 from public.component_suppliers supplier
    where supplier.id = nullif(price_option->>'supplierId', '')::uuid
      and supplier.workspace_id = target_workspace_id
  ) then
    raise exception 'Price option supplier not found in the current workspace.';
  end if;

  if option_id is not null then
    select public.cost_library_price_option_snapshot(existing_option)
      into old_snapshot
    from public.cost_library_item_price_options existing_option
    where existing_option.id = option_id
      and existing_option.item_id = target_item_id
      and existing_option.workspace_id = target_workspace_id
    for update;

    if old_snapshot is null then
      raise exception 'Price option not found in the current component.';
    end if;

    if make_default then
      update public.cost_library_item_price_options
      set is_default = false
      where item_id = target_item_id
        and id <> option_id
        and is_default;
    end if;

    update public.cost_library_item_price_options
    set label = coalesce(nullif(trim(price_option->>'label'), ''), label),
        unit = coalesce(nullif(trim(price_option->>'unit'), ''), unit),
        unit_cost = coalesce(nullif(price_option->>'unitCost', '')::numeric, unit_cost),
        misc_cost = coalesce(nullif(price_option->>'miscCost', '')::numeric, misc_cost),
        currency = coalesce(nullif(trim(price_option->>'currency'), ''), currency),
        pricing_source = nullif(trim(coalesce(price_option->>'pricingSource', pricing_source)), ''),
        pricing_date = coalesce(nullif(price_option->>'pricingDate', '')::date, pricing_date),
        confidence = nullif(trim(coalesce(price_option->>'confidence', confidence)), ''),
        source_url = nullif(trim(coalesce(price_option->>'sourceUrl', source_url)), ''),
        notes = coalesce(price_option->>'notes', notes),
        supplier_id = coalesce(nullif(price_option->>'supplierId', '')::uuid, supplier_id),
        is_active = coalesce((price_option->>'isActive')::boolean, is_active),
        is_default = make_default
    where id = option_id
    returning * into saved_option;
  else
    insert into public.cost_library_item_price_options (
      item_id,
      workspace_id,
      label,
      unit,
      unit_cost,
      misc_cost,
      currency,
      pricing_source,
      pricing_date,
      confidence,
      source_url,
      notes,
      supplier_id,
      is_active,
      is_default,
      created_by
    )
    values (
      target_item_id,
      target_workspace_id,
      trim(coalesce(price_option->>'label', '')),
      coalesce(nullif(trim(price_option->>'unit'), ''), item_row.unit),
      coalesce(nullif(price_option->>'unitCost', '')::numeric, 0),
      coalesce(nullif(price_option->>'miscCost', '')::numeric, 0),
      coalesce(nullif(trim(price_option->>'currency'), ''), 'PHP'),
      nullif(trim(price_option->>'pricingSource'), ''),
      nullif(price_option->>'pricingDate', '')::date,
      nullif(trim(price_option->>'confidence'), ''),
      nullif(trim(price_option->>'sourceUrl'), ''),
      coalesce(price_option->>'notes', ''),
      coalesce(nullif(price_option->>'supplierId', '')::uuid, item_row.supplier_id),
      coalesce((price_option->>'isActive')::boolean, true),
      false,
      current_user_id
    )
    returning * into saved_option;

    if make_default then
      update public.cost_library_item_price_options
      set is_default = false
      where item_id = target_item_id
        and id <> saved_option.id
        and is_default;

      update public.cost_library_item_price_options
      set is_default = true
      where id = saved_option.id
      returning * into saved_option;
    end if;
  end if;

  if char_length(trim(saved_option.label)) = 0 then
    raise exception 'Price option label is required.';
  end if;

  if make_default and saved_option.is_active then
    update public.cost_library_items
    set active_price_option_id = saved_option.id,
        unit = saved_option.unit,
        unit_cost = saved_option.unit_cost,
        misc_cost = saved_option.misc_cost,
        pricing_source = saved_option.pricing_source,
        pricing_date = saved_option.pricing_date,
        confidence = saved_option.confidence
    where id = target_item_id
      and workspace_id = target_workspace_id;
  end if;

  select *
    into saved_option
  from public.cost_library_item_price_options
  where id = saved_option.id;

  new_snapshot := public.cost_library_price_option_snapshot(saved_option);

  insert into public.cost_library_item_price_history (
    price_option_id,
    item_id,
    workspace_id,
    old_snapshot,
    new_snapshot,
    change_reason,
    effective_at,
    created_by
  )
  values (
    saved_option.id,
    target_item_id,
    target_workspace_id,
    old_snapshot,
    new_snapshot,
    change_reason,
    effective_at,
    current_user_id
  );

  next_version := item_row.current_version_number + 1;
  update public.cost_library_items
  set current_version_number = next_version
  where id = target_item_id
    and workspace_id = target_workspace_id;

  insert into public.cost_library_item_versions (
    item_id,
    workspace_id,
    version_number,
    snapshot,
    change_summary,
    change_reason,
    effective_at,
    created_by
  )
  values (
    target_item_id,
    target_workspace_id,
    next_version,
    public.cost_library_item_version_snapshot(target_item_id),
    'Price option changed',
    change_reason,
    effective_at,
    current_user_id
  );

  return jsonb_build_object(
    'itemId', target_item_id,
    'priceOptionId', saved_option.id,
    'versionNumber', next_version
  );
end;
$$;

create or replace function public.set_cost_library_component_lifecycle_state(
  target_workspace_id uuid,
  target_item_id uuid,
  next_state public.component_lifecycle_state,
  change_reason text default '',
  effective_at timestamptz default now(),
  acting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.cost_library_items;
  current_user_id uuid := coalesce(auth.uid(), acting_user_id);
  next_version integer;
begin
  if next_state is null then
    raise exception 'Lifecycle state is required.';
  end if;

  current_user_id := public.assert_cost_library_component_editor(target_workspace_id, current_user_id);

  select *
    into item_row
  from public.cost_library_items
  where id = target_item_id
    and workspace_id = target_workspace_id
  for update;

  if item_row.id is null then
    raise exception 'Component not found in the current workspace.';
  end if;

  if item_row.lifecycle_state = next_state then
    return jsonb_build_object(
      'itemId', target_item_id,
      'versionNumber', item_row.current_version_number,
      'lifecycleState', next_state
    );
  end if;

  next_version := item_row.current_version_number + 1;

  update public.cost_library_items
  set lifecycle_state = next_state,
      lifecycle_state_changed_at = coalesce(effective_at, now()),
      lifecycle_state_changed_by = current_user_id,
      current_version_number = next_version
  where id = target_item_id
    and workspace_id = target_workspace_id;

  insert into public.cost_library_item_state_history (
    item_id,
    workspace_id,
    from_state,
    to_state,
    effective_at,
    change_reason,
    created_by
  )
  values (
    target_item_id,
    target_workspace_id,
    item_row.lifecycle_state,
    next_state,
    coalesce(effective_at, now()),
    coalesce(change_reason, ''),
    current_user_id
  );

  insert into public.cost_library_item_versions (
    item_id,
    workspace_id,
    version_number,
    snapshot,
    change_summary,
    change_reason,
    effective_at,
    created_by
  )
  values (
    target_item_id,
    target_workspace_id,
    next_version,
    public.cost_library_item_version_snapshot(target_item_id),
    'Lifecycle state changed',
    coalesce(change_reason, ''),
    coalesce(effective_at, now()),
    current_user_id
  );

  return jsonb_build_object(
    'itemId', target_item_id,
    'versionNumber', next_version,
    'lifecycleState', next_state
  );
end;
$$;

alter table public.cost_library_item_versions enable row level security;
alter table public.cost_library_item_price_options enable row level security;
alter table public.cost_library_item_price_history enable row level security;
alter table public.cost_library_item_state_history enable row level security;

drop policy if exists "members can view component versions" on public.cost_library_item_versions;
drop policy if exists "members can insert component versions" on public.cost_library_item_versions;
drop policy if exists "workspace editors can insert component versions" on public.cost_library_item_versions;

create policy "members can view component versions" on public.cost_library_item_versions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "workspace editors can insert component versions" on public.cost_library_item_versions
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));

drop policy if exists "members can manage component price options" on public.cost_library_item_price_options;
drop policy if exists "members can view component price options" on public.cost_library_item_price_options;
drop policy if exists "workspace editors can insert component price options" on public.cost_library_item_price_options;
drop policy if exists "workspace editors can update component price options" on public.cost_library_item_price_options;

create policy "members can view component price options" on public.cost_library_item_price_options
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "workspace editors can insert component price options" on public.cost_library_item_price_options
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));
create policy "workspace editors can update component price options" on public.cost_library_item_price_options
  for update to authenticated
  using (public.is_workspace_editor(workspace_id))
  with check (public.is_workspace_editor(workspace_id));

drop policy if exists "members can view component price history" on public.cost_library_item_price_history;
drop policy if exists "members can insert component price history" on public.cost_library_item_price_history;
drop policy if exists "workspace editors can insert component price history" on public.cost_library_item_price_history;

create policy "members can view component price history" on public.cost_library_item_price_history
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "workspace editors can insert component price history" on public.cost_library_item_price_history
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));

drop policy if exists "members can view component state history" on public.cost_library_item_state_history;
drop policy if exists "members can insert component state history" on public.cost_library_item_state_history;
drop policy if exists "workspace editors can insert component state history" on public.cost_library_item_state_history;

create policy "members can view component state history" on public.cost_library_item_state_history
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "workspace editors can insert component state history" on public.cost_library_item_state_history
  for insert to authenticated
  with check (public.is_workspace_editor(workspace_id));

revoke all on public.cost_library_item_versions from public;
revoke all on public.cost_library_item_price_options from public;
revoke all on public.cost_library_item_price_history from public;
revoke all on public.cost_library_item_state_history from public;
revoke all on public.cost_library_item_versions from anon;
revoke all on public.cost_library_item_price_options from anon;
revoke all on public.cost_library_item_price_history from anon;
revoke all on public.cost_library_item_state_history from anon;
revoke insert, update, delete on public.cost_library_item_versions from authenticated;
revoke insert, update, delete on public.cost_library_item_price_options from authenticated;
revoke insert, update, delete on public.cost_library_item_price_history from authenticated;
revoke insert, update, delete on public.cost_library_item_state_history from authenticated;
revoke truncate, references, trigger on public.cost_library_item_versions from authenticated;
revoke truncate, references, trigger on public.cost_library_item_price_options from authenticated;
revoke truncate, references, trigger on public.cost_library_item_price_history from authenticated;
revoke truncate, references, trigger on public.cost_library_item_state_history from authenticated;

grant select on public.cost_library_item_versions to authenticated;
grant select on public.cost_library_item_price_options to authenticated;
grant select on public.cost_library_item_price_history to authenticated;
grant select on public.cost_library_item_state_history to authenticated;

revoke execute on function public.assert_cost_library_component_editor(uuid, uuid) from public;
revoke execute on function public.assert_cost_library_component_editor(uuid, uuid) from anon, authenticated;
revoke execute on function public.validate_cost_library_component_refs(uuid, uuid, text, uuid, uuid) from public;
revoke execute on function public.validate_cost_library_component_refs(uuid, uuid, text, uuid, uuid) from anon, authenticated;
revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from public;
revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from anon;
revoke execute on function public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz, uuid) from public;
revoke execute on function public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz, uuid) from anon;

grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated;
grant execute on function public.set_cost_library_component_lifecycle_state(uuid, uuid, public.component_lifecycle_state, text, timestamptz, uuid) to authenticated;

commit;
