ALTER TABLE estimates ADD COLUMN project_budget REAL;

CREATE INDEX IF NOT EXISTS idx_estimates_project_sheet_code
  ON estimates(project_id, sheet_code, id);

CREATE INDEX IF NOT EXISTS idx_estimates_project_updated
  ON estimates(project_id, updated_at DESC, id DESC);
