alter policy "cost library items can be read by members and managers" on public.cost_library_items to authenticated;
alter policy "cost library items can be inserted by managers" on public.cost_library_items to authenticated;
alter policy "cost library items can be updated by managers" on public.cost_library_items to authenticated;
alter policy "cost library items can be deleted by managers" on public.cost_library_items to authenticated;

alter policy "estimate nodes can be read by viewers and managers" on public.estimate_nodes to authenticated;
alter policy "estimate nodes can be inserted by managers" on public.estimate_nodes to authenticated;
alter policy "estimate nodes can be updated by managers" on public.estimate_nodes to authenticated;
alter policy "estimate nodes can be deleted by managers" on public.estimate_nodes to authenticated;

alter policy "estimate rows can be read by viewers and managers" on public.estimate_row_items to authenticated;
alter policy "estimate rows can be inserted by managers" on public.estimate_row_items to authenticated;
alter policy "estimate rows can be updated by managers" on public.estimate_row_items to authenticated;
alter policy "estimate rows can be deleted by managers" on public.estimate_row_items to authenticated;

alter policy "estimate viewers can read sheet access settings" on public.estimate_sheet_access_settings to authenticated;
alter policy "estimate access managers can update sheet access settings" on public.estimate_sheet_access_settings to authenticated;
alter policy "estimate access managers can delete sheet access settings" on public.estimate_sheet_access_settings to authenticated;

alter policy "estimate viewers can read sheet memberships" on public.estimate_sheet_members to authenticated;
alter policy "estimate access managers can update sheet memberships" on public.estimate_sheet_members to authenticated;
alter policy "estimate access managers can delete sheet memberships" on public.estimate_sheet_members to authenticated;

alter policy "estimates can be read by viewers and managers" on public.estimates to authenticated;
alter policy "estimates can be updated by estimate managers" on public.estimates to authenticated;
alter policy "estimates can be deleted by estimate managers" on public.estimates to authenticated;

alter policy "projects can be read by viewers and managers" on public.projects to authenticated;
alter policy "projects can be updated by project managers" on public.projects to authenticated;
alter policy "projects can be deleted by project managers" on public.projects to authenticated;

alter policy "project members can read project memberships" on public.project_members to authenticated;
alter policy "project access managers can update project memberships" on public.project_members to authenticated;
alter policy "project access managers can delete project memberships" on public.project_members to authenticated;

alter policy "project access managers can read project invitations" on public.collaboration_invitations to authenticated;
alter policy "project access managers can update project invitations" on public.collaboration_invitations to authenticated;
alter policy "project access managers can delete project invitations" on public.collaboration_invitations to authenticated;

alter policy "profiles can be inserted by platform admins" on public.profiles to authenticated;
alter policy "collaborators can view collaborator profiles" on public.profiles to authenticated;
alter policy "profiles can be updated by owners and platform admins" on public.profiles to authenticated;
alter policy "profiles can be deleted by platform admins" on public.profiles to authenticated;

alter policy "workspace memberships can be read by members and managers" on public.workspace_members to authenticated;
alter policy "workspace memberships can be inserted by managers" on public.workspace_members to authenticated;
alter policy "workspace memberships can be updated by managers" on public.workspace_members to authenticated;
alter policy "workspace memberships can be deleted by managers" on public.workspace_members to authenticated;

alter policy "workspaces can be updated by workspace admins" on public.workspaces to authenticated;
alter policy "workspaces can be deleted by platform admins" on public.workspaces to authenticated;

alter policy "mass deletion workspace managers can read events" on public.mass_deletion_events to authenticated;

revoke execute on function public.can_access_estimate(uuid) from public;
revoke execute on function public.can_access_estimate(uuid) from anon;
grant execute on function public.can_access_estimate(uuid) to authenticated;

revoke execute on function public.can_access_project(uuid) from public;
revoke execute on function public.can_access_project(uuid) from anon;
grant execute on function public.can_access_project(uuid) to authenticated;

revoke execute on function public.can_assign_estimate_role(uuid, uuid, public.collaboration_role) from public;
revoke execute on function public.can_assign_estimate_role(uuid, uuid, public.collaboration_role) from anon;
grant execute on function public.can_assign_estimate_role(uuid, uuid, public.collaboration_role) to authenticated;

revoke execute on function public.can_assign_project_role(uuid, uuid, public.collaboration_role) from public;
revoke execute on function public.can_assign_project_role(uuid, uuid, public.collaboration_role) from anon;
grant execute on function public.can_assign_project_role(uuid, uuid, public.collaboration_role) to authenticated;

revoke execute on function public.can_change_estimate_access_settings(uuid, boolean) from public;
revoke execute on function public.can_change_estimate_access_settings(uuid, boolean) from anon;
grant execute on function public.can_change_estimate_access_settings(uuid, boolean) to authenticated;

revoke execute on function public.can_edit_estimate(uuid) from public;
revoke execute on function public.can_edit_estimate(uuid) from anon;
grant execute on function public.can_edit_estimate(uuid) to authenticated;

revoke execute on function public.can_edit_project(uuid) from public;
revoke execute on function public.can_edit_project(uuid) from anon;
grant execute on function public.can_edit_project(uuid) to authenticated;

revoke execute on function public.can_manage_collaboration_invitation(uuid, uuid, public.collaboration_role) from public;
revoke execute on function public.can_manage_collaboration_invitation(uuid, uuid, public.collaboration_role) from anon;
grant execute on function public.can_manage_collaboration_invitation(uuid, uuid, public.collaboration_role) to authenticated;

revoke execute on function public.can_manage_estimate_access(uuid) from public;
revoke execute on function public.can_manage_estimate_access(uuid) from anon;
grant execute on function public.can_manage_estimate_access(uuid) to authenticated;

revoke execute on function public.can_manage_estimate_member(uuid, uuid, public.collaboration_role) from public;
revoke execute on function public.can_manage_estimate_member(uuid, uuid, public.collaboration_role) from anon;
grant execute on function public.can_manage_estimate_member(uuid, uuid, public.collaboration_role) to authenticated;

revoke execute on function public.can_manage_project_member(uuid, uuid, public.collaboration_role) from public;
revoke execute on function public.can_manage_project_member(uuid, uuid, public.collaboration_role) from anon;
grant execute on function public.can_manage_project_member(uuid, uuid, public.collaboration_role) to authenticated;

revoke execute on function public.is_platform_admin() from public;
revoke execute on function public.is_platform_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated;

revoke execute on function public.is_workspace_admin(uuid) from public;
revoke execute on function public.is_workspace_admin(uuid) from anon;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

revoke execute on function public.is_workspace_editor(uuid) from public;
revoke execute on function public.is_workspace_editor(uuid) from anon;
grant execute on function public.is_workspace_editor(uuid) to authenticated;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
