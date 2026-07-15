CREATE INDEX IF NOT EXISTS idx_cost_library_items_active_browse_cursor
  ON cost_library_items(workspace_id, created_at DESC, id ASC)
  WHERE lifecycle_state <> 'archived';
