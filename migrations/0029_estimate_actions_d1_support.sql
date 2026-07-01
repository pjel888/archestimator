ALTER TABLE estimates ADD COLUMN notes TEXT;
ALTER TABLE estimates ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'PHP';
ALTER TABLE estimates ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK (
  json_valid(metadata)
  AND json_type(metadata) = 'object'
);

ALTER TABLE estimate_tabs ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK (
  json_valid(metadata)
  AND json_type(metadata) = 'object'
);
ALTER TABLE estimate_tabs ADD COLUMN created_by TEXT;

CREATE TABLE IF NOT EXISTS estimate_sheet_adjustments (
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('contingency', 'discount')),
  percentage REAL NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  row_revision INTEGER NOT NULL DEFAULT 1 CHECK (row_revision >= 1),
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (estimate_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_adjustments_updated
  ON estimate_sheet_adjustments(updated_at DESC, estimate_id);
