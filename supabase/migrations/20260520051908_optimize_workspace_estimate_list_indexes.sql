-- Improve list-page access patterns that filter by parent id and sort by updated_at.
create index if not exists projects_workspace_updated_at_idx
  on public.projects(workspace_id, updated_at desc);

create index if not exists estimates_project_updated_at_idx
  on public.estimates(project_id, updated_at desc);
