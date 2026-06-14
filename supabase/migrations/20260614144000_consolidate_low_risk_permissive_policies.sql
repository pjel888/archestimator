drop policy if exists "actors can view own ai action runs" on public.ai_action_runs;
drop policy if exists "workspace admins can view ai action runs" on public.ai_action_runs;
create policy "ai action runs can be viewed by actors and workspace admins"
  on public.ai_action_runs
  for select
  to authenticated
  using (
    ((actor_user_id = (select auth.uid())) and is_workspace_member(workspace_id))
    or is_workspace_admin(workspace_id)
  );

drop policy if exists "actors can view own ai data access events" on public.ai_data_access_events;
drop policy if exists "workspace admins can view ai data access events" on public.ai_data_access_events;
create policy "ai data access events can be viewed by actors and workspace admins"
  on public.ai_data_access_events
  for select
  to authenticated
  using (
    ((actor_user_id = (select auth.uid())) and is_workspace_member(workspace_id))
    or is_workspace_admin(workspace_id)
  );

drop policy if exists "actors can view own ai tool calls" on public.ai_tool_calls;
drop policy if exists "workspace admins can view ai tool calls" on public.ai_tool_calls;
create policy "ai tool calls can be viewed by actors and workspace admins"
  on public.ai_tool_calls
  for select
  to authenticated
  using (
    ((actor_user_id = (select auth.uid())) and is_workspace_member(workspace_id))
    or is_workspace_admin(workspace_id)
  );

drop policy if exists "platform admins can manage all estimate favorites" on public.estimate_favorites;
drop policy if exists "users can manage own estimate favorites" on public.estimate_favorites;
create policy "estimate favorites can be managed by owners and platform admins"
  on public.estimate_favorites
  for all
  to authenticated
  using (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  )
  with check (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  );

drop policy if exists "platform admins can manage all project favorites" on public.project_favorites;
drop policy if exists "users can manage own project favorites" on public.project_favorites;
create policy "project favorites can be managed by owners and platform admins"
  on public.project_favorites
  for all
  to authenticated
  using (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  )
  with check (
    is_platform_admin()
    or ((user_id = (select auth.uid())) and is_workspace_member(workspace_id))
  );
