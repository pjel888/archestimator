-- Activity history feeds filter estimate events by target row/node and sort by
-- newest event first. The existing estimate-created index cannot serve these
-- drill-down paths without scanning unrelated events for the estimate.
CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_estimate_target_row_created
  ON estimate_sheet_events(estimate_id, target_row_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_estimate_node_created
  ON estimate_sheet_events(estimate_id, estimate_node_id, created_at DESC, id DESC);
