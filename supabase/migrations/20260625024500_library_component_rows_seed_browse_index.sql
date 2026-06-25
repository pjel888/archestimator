create index if not exists cost_library_items_workspace_browse_active_idx
  on public.cost_library_items(workspace_id, category, name, id)
  where lifecycle_state <> 'archived';
