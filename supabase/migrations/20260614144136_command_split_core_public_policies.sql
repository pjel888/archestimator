drop policy if exists "platform admins can manage all cost library items" on public.cost_library_items;
drop policy if exists "workspace editors can manage cost library items" on public.cost_library_items;
drop policy if exists "workspace members can read cost library items" on public.cost_library_items;
create policy "cost library items can be read by members and managers"
  on public.cost_library_items
  for select
  to public
  using (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
    or is_workspace_member(workspace_id)
  );
create policy "cost library items can be inserted by managers"
  on public.cost_library_items
  for insert
  to public
  with check (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
  );
create policy "cost library items can be updated by managers"
  on public.cost_library_items
  for update
  to public
  using (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
  )
  with check (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
  );
create policy "cost library items can be deleted by managers"
  on public.cost_library_items
  for delete
  to public
  using (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
  );

drop policy if exists "estimate editors can manage estimate nodes" on public.estimate_nodes;
drop policy if exists "platform admins can manage all estimate nodes" on public.estimate_nodes;
drop policy if exists "estimate viewers can read estimate nodes" on public.estimate_nodes;
create policy "estimate nodes can be read by viewers and managers"
  on public.estimate_nodes
  for select
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
    or can_access_estimate(estimate_id)
  );
create policy "estimate nodes can be inserted by managers"
  on public.estimate_nodes
  for insert
  to public
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate nodes can be updated by managers"
  on public.estimate_nodes
  for update
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  )
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate nodes can be deleted by managers"
  on public.estimate_nodes
  for delete
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );

drop policy if exists "estimate editors can manage estimate rows" on public.estimate_row_items;
drop policy if exists "platform admins can manage all estimate row items" on public.estimate_row_items;
drop policy if exists "estimate viewers can read estimate rows" on public.estimate_row_items;
create policy "estimate rows can be read by viewers and managers"
  on public.estimate_row_items
  for select
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
    or can_access_estimate(estimate_id)
  );
create policy "estimate rows can be inserted by managers"
  on public.estimate_row_items
  for insert
  to public
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate rows can be updated by managers"
  on public.estimate_row_items
  for update
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  )
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate rows can be deleted by managers"
  on public.estimate_row_items
  for delete
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );

drop policy if exists "platform admins can manage all memberships" on public.workspace_members;
drop policy if exists "workspace admins can manage memberships" on public.workspace_members;
drop policy if exists "members can view workspace memberships" on public.workspace_members;
create policy "workspace memberships can be read by members and managers"
  on public.workspace_members
  for select
  to public
  using (
    is_platform_admin()
    or is_workspace_admin(workspace_id)
    or is_workspace_member(workspace_id)
  );
create policy "workspace memberships can be inserted by managers"
  on public.workspace_members
  for insert
  to public
  with check (
    is_platform_admin()
    or is_workspace_admin(workspace_id)
  );
create policy "workspace memberships can be updated by managers"
  on public.workspace_members
  for update
  to public
  using (
    is_platform_admin()
    or is_workspace_admin(workspace_id)
  )
  with check (
    is_platform_admin()
    or is_workspace_admin(workspace_id)
  );
create policy "workspace memberships can be deleted by managers"
  on public.workspace_members
  for delete
  to public
  using (
    is_platform_admin()
    or is_workspace_admin(workspace_id)
  );
