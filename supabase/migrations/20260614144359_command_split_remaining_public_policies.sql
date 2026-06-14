drop policy if exists "estimate tab editors can manage tabs" on public.estimate_tabs;
drop policy if exists "platform admins can manage all estimate tabs" on public.estimate_tabs;
drop policy if exists "estimate tab viewers can read tabs" on public.estimate_tabs;
create policy "estimate tabs can be read by viewers and managers"
  on public.estimate_tabs
  for select
  to authenticated
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
    or can_access_estimate(estimate_id)
  );
create policy "estimate tabs can be inserted by managers"
  on public.estimate_tabs
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate tabs can be updated by managers"
  on public.estimate_tabs
  for update
  to authenticated
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  )
  with check (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );
create policy "estimate tabs can be deleted by managers"
  on public.estimate_tabs
  for delete
  to authenticated
  using (
    is_platform_admin()
    or can_edit_estimate(estimate_id)
  );

drop policy if exists "platform admins can manage all estimates" on public.estimates;
drop policy if exists "estimate editors can delete estimates" on public.estimates;
drop policy if exists "project editors can insert estimates" on public.estimates;
drop policy if exists "estimate viewers can read estimates" on public.estimates;
drop policy if exists "estimate editors can update estimates" on public.estimates;
create policy "estimates can be read by viewers and managers"
  on public.estimates
  for select
  to public
  using (
    is_platform_admin()
    or can_access_estimate(id)
  );
create policy "estimates can be inserted by project managers"
  on public.estimates
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or can_edit_project(project_id)
  );
create policy "estimates can be updated by estimate managers"
  on public.estimates
  for update
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(id)
  )
  with check (
    is_platform_admin()
    or can_edit_estimate(id)
  );
create policy "estimates can be deleted by estimate managers"
  on public.estimates
  for delete
  to public
  using (
    is_platform_admin()
    or can_edit_estimate(id)
  );

drop policy if exists "platform admins can manage profiles" on public.profiles;
drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "users can update own display name" on public.profiles;
create policy "profiles can be inserted by platform admins"
  on public.profiles
  for insert
  to public
  with check (is_platform_admin());
create policy "profiles can be updated by owners and platform admins"
  on public.profiles
  for update
  to public
  using (
    (id = (select auth.uid()))
    or is_platform_admin()
  )
  with check (
    (id = (select auth.uid()))
    or is_platform_admin()
  );
create policy "profiles can be deleted by platform admins"
  on public.profiles
  for delete
  to public
  using (is_platform_admin());

drop policy if exists "platform admins can manage all projects" on public.projects;
drop policy if exists "project editors can delete projects" on public.projects;
drop policy if exists "project editors can insert projects" on public.projects;
drop policy if exists "project viewers can read projects" on public.projects;
drop policy if exists "project editors can update projects" on public.projects;
create policy "projects can be read by viewers and managers"
  on public.projects
  for select
  to public
  using (
    is_platform_admin()
    or can_access_project(id)
  );
create policy "projects can be inserted by workspace editors"
  on public.projects
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or is_workspace_editor(workspace_id)
  );
create policy "projects can be updated by project managers"
  on public.projects
  for update
  to public
  using (
    is_platform_admin()
    or can_edit_project(id)
  )
  with check (
    is_platform_admin()
    or can_edit_project(id)
  );
create policy "projects can be deleted by project managers"
  on public.projects
  for delete
  to public
  using (
    is_platform_admin()
    or can_edit_project(id)
  );

drop policy if exists "platform admins can manage all workspaces" on public.workspaces;
drop policy if exists "authenticated users can create owned workspaces" on public.workspaces;
drop policy if exists "workspace account participants can view workspaces" on public.workspaces;
drop policy if exists "workspace admins can update workspaces" on public.workspaces;
create policy "workspaces can be read by account participants and platform admins"
  on public.workspaces
  for select
  to authenticated
  using (
    is_platform_admin()
    or can_access_workspace_account_scope(id)
  );
create policy "workspaces can be inserted by owners and platform admins"
  on public.workspaces
  for insert
  to authenticated
  with check (
    is_platform_admin()
    or (created_by = (select auth.uid()))
  );
create policy "workspaces can be updated by workspace admins"
  on public.workspaces
  for update
  to public
  using (
    is_platform_admin()
    or is_workspace_admin(id)
  )
  with check (
    is_platform_admin()
    or is_workspace_admin(id)
  );
create policy "workspaces can be deleted by platform admins"
  on public.workspaces
  for delete
  to public
  using (is_platform_admin());
