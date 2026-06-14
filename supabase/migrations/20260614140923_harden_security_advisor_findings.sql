-- Focused Supabase advisor hardening pass.
--
-- Scope:
-- - Fix the current mutable-search-path advisor findings.
-- - Rewrite the remaining auth.uid()/auth.jwt() RLS policy calls as initplans.
-- - Remove broad execute grants from helper/trigger functions and two RPCs
--   that local migration history already treats as authenticated-only.
--
-- Intentionally deferred:
-- - Public invite resolution remains anon-callable.
-- - Public client/shared-link publication RPC grants are not changed here.
-- - Broader multiple-permissive-policy consolidation is a separate pass.

alter function public.resolve_app_role_for_email(text)
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.collaboration_role_rank(public.collaboration_role)
  set search_path = public, pg_temp;

alter policy "authenticated users can create owned workspaces"
on public.workspaces
with check (created_by = (select auth.uid()));

alter policy "users can view own profile"
on public.profiles
using ((id = (select auth.uid())) or public.is_platform_admin());

alter policy "users can update own display name"
on public.profiles
using ((id = (select auth.uid())) or public.is_platform_admin())
with check ((id = (select auth.uid())) or public.is_platform_admin());

alter policy "project access managers can read project invitations"
on public.collaboration_invitations
using (
  lower(coalesce((select auth.jwt()) ->> 'email', '')) = email
  or public.can_manage_collaboration_invitation(project_id, estimate_id, role)
);

alter policy "user_onboarding_profiles_select_own"
on public.user_onboarding_profiles
using ((select auth.uid()) = user_id);

alter policy "actors can view own ai action runs"
on public.ai_action_runs
using ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "actors can insert own ai action runs"
on public.ai_action_runs
with check ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "actors can view own ai tool calls"
on public.ai_tool_calls
using ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "actors can insert own ai tool calls"
on public.ai_tool_calls
with check ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "actors can view own ai data access events"
on public.ai_data_access_events
using ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "actors can insert own ai data access events"
on public.ai_data_access_events
with check ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "ai_package_apply_commands_select_authenticated"
on public.ai_package_apply_commands
using ((actor_user_id = (select auth.uid())) and public.is_workspace_member(workspace_id));

alter policy "beta feedback inserts must match actor context"
on public.beta_feedback_submissions
with check (
  (select auth.uid()) = user_id
  and lower(user_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and (workspace_id is null or public.is_workspace_member(workspace_id))
  and (project_id is null or public.can_access_project(project_id))
  and (
    workspace_id is null
    or project_id is null
    or exists (
      select 1
      from public.projects
      where projects.id = beta_feedback_submissions.project_id
        and projects.workspace_id = beta_feedback_submissions.workspace_id
    )
  )
);

revoke all privileges on function public.add_workspace_owner_membership()
  from public, anon, authenticated;

revoke all privileges on function public.enforce_estimate_row_item_area_node()
  from public, anon, authenticated;

revoke all privileges on function public.enforce_library_folder_tree()
  from public, anon, authenticated;

revoke all privileges on function public.handle_new_auth_user()
  from public, anon, authenticated;

revoke all privileges on function public.list_pending_collaboration_invitations()
  from public, anon;
grant execute on function public.list_pending_collaboration_invitations()
  to authenticated;

revoke all privileges on function public.set_cost_library_component_lifecycle_state(
  uuid,
  uuid,
  public.component_lifecycle_state,
  text,
  timestamp with time zone,
  uuid
) from public, anon;
grant execute on function public.set_cost_library_component_lifecycle_state(
  uuid,
  uuid,
  public.component_lifecycle_state,
  text,
  timestamp with time zone,
  uuid
) to authenticated;
