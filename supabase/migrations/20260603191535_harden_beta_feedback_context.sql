-- Harden beta feedback submissions against forged cross-tenant context.
--
-- The server action supplies user/workspace/project fields from the
-- authenticated session, but the table grant is still reachable by
-- authenticated clients. Keep the direct insert path safe by requiring every
-- tenant-scoped column to match the actor's real memberships.

drop policy if exists "beta_feedback_submissions_insert_own" on public.beta_feedback_submissions;
drop policy if exists "beta feedback inserts must match actor context" on public.beta_feedback_submissions;

create policy "beta feedback inserts must match actor context"
  on public.beta_feedback_submissions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and lower(user_email) = lower(coalesce(auth.jwt()->>'email', ''))
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
