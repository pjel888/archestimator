ALTER TABLE library_folders
  ADD COLUMN is_default_category INTEGER NOT NULL DEFAULT 0
  CHECK (is_default_category IN (0, 1));

ALTER TABLE workspace_price_freshness_policies
  ADD COLUMN category_folder_id TEXT REFERENCES library_folders(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_workspace_price_freshness_policies_default;

CREATE UNIQUE INDEX idx_workspace_price_freshness_policies_default
  ON workspace_price_freshness_policies(workspace_id)
  WHERE category_node_id IS NULL AND category_folder_id IS NULL;

INSERT INTO library_folders (
  id,
  workspace_id,
  parent_id,
  name,
  sort_order,
  folder_kind,
  created_by,
  created_at,
  updated_at,
  is_default_category
)
SELECT
  lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
  workspace.id,
  NULL,
  'Uncategorized',
  0,
  'custom',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  1
FROM workspaces AS workspace
WHERE NOT EXISTS (
  SELECT 1
  FROM library_folders AS folder
  WHERE folder.workspace_id = workspace.id
    AND folder.parent_id IS NULL
    AND lower(trim(folder.name)) = 'uncategorized'
);

UPDATE library_folders
SET is_default_category = CASE
  WHEN id = (
    SELECT candidate.id
    FROM library_folders AS candidate
    WHERE candidate.workspace_id = library_folders.workspace_id
      AND candidate.parent_id IS NULL
      AND lower(trim(candidate.name)) = 'uncategorized'
    ORDER BY
      CASE WHEN candidate.name = 'Uncategorized' THEN 0 ELSE 1 END,
      candidate.id ASC
    LIMIT 1
  ) THEN 1
  ELSE 0
END;

UPDATE library_folders
SET name = 'Uncategorized',
    updated_at = CURRENT_TIMESTAMP
WHERE is_default_category = 1
  AND name <> 'Uncategorized';

CREATE UNIQUE INDEX uq_library_folders_workspace_default_category
  ON library_folders(workspace_id)
  WHERE is_default_category = 1;

INSERT INTO library_folders (
  id,
  workspace_id,
  parent_id,
  name,
  sort_order,
  folder_kind,
  created_by,
  created_at,
  updated_at,
  is_default_category
)
SELECT
  lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
  legacy.workspace_id,
  NULL,
  legacy.category_name,
  COALESCE((
    SELECT MAX(existing.sort_order)
    FROM library_folders AS existing
    WHERE existing.workspace_id = legacy.workspace_id
      AND existing.parent_id IS NULL
  ), 0) + (legacy.category_rank * 10),
  'custom',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  0
FROM (
  SELECT
    item.workspace_id,
    MIN(trim(item.category)) AS category_name,
    ROW_NUMBER() OVER (
      PARTITION BY item.workspace_id
      ORDER BY lower(trim(item.category))
    ) AS category_rank
  FROM cost_library_items AS item
  WHERE trim(item.category) <> ''
    AND lower(trim(item.category)) <> 'uncategorized'
    AND (
      item.library_folder_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM library_folders AS assigned
        WHERE assigned.id = item.library_folder_id
          AND assigned.workspace_id = item.workspace_id
      )
    )
  GROUP BY item.workspace_id, lower(trim(item.category))
) AS legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM library_folders AS existing
  WHERE existing.workspace_id = legacy.workspace_id
    AND existing.parent_id IS NULL
    AND lower(trim(existing.name)) = lower(trim(legacy.category_name))
);

UPDATE cost_library_items AS item
SET library_folder_id = (
  SELECT folder.id
  FROM library_folders AS folder
  WHERE folder.workspace_id = item.workspace_id
    AND folder.parent_id IS NULL
    AND lower(trim(folder.name)) = lower(trim(item.category))
  ORDER BY folder.id ASC
  LIMIT 1
)
WHERE (
    item.library_folder_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM library_folders AS assigned
      WHERE assigned.id = item.library_folder_id
        AND assigned.workspace_id = item.workspace_id
    )
  )
  AND EXISTS (
    SELECT 1
    FROM library_folders AS folder
    WHERE folder.workspace_id = item.workspace_id
      AND folder.parent_id IS NULL
      AND lower(trim(folder.name)) = lower(trim(item.category))
  );

UPDATE cost_library_items AS item
SET library_folder_id = (
  SELECT folder.id
  FROM library_folders AS folder
  WHERE folder.workspace_id = item.workspace_id
    AND folder.is_default_category = 1
  LIMIT 1
)
WHERE item.library_folder_id IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM library_folders AS assigned
     WHERE assigned.id = item.library_folder_id
       AND assigned.workspace_id = item.workspace_id
   );

UPDATE cost_library_items
SET category = (
      SELECT folder.name
      FROM library_folders AS folder
      WHERE folder.id = cost_library_items.library_folder_id
        AND folder.workspace_id = cost_library_items.workspace_id
    ),
    category_node_id = NULL
WHERE library_folder_id IS NOT NULL;

UPDATE workspace_price_freshness_policies
SET category_folder_id = (
  SELECT folder.id
  FROM library_folders AS folder
  WHERE folder.workspace_id = workspace_price_freshness_policies.workspace_id
    AND folder.source_category_node_id = workspace_price_freshness_policies.category_node_id
  ORDER BY folder.id ASC
  LIMIT 1
)
WHERE category_node_id IS NOT NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM library_folders AS folder
    WHERE folder.workspace_id = workspace_price_freshness_policies.workspace_id
      AND folder.source_category_node_id = workspace_price_freshness_policies.category_node_id
  );

UPDATE workspace_price_freshness_policies
SET category_folder_id = (
  SELECT folder.id
  FROM library_folders AS folder
  INNER JOIN component_category_nodes AS category_node
    ON category_node.id = workspace_price_freshness_policies.category_node_id
  WHERE folder.workspace_id = workspace_price_freshness_policies.workspace_id
    AND lower(trim(folder.name)) = lower(trim(category_node.label))
  ORDER BY folder.id ASC
  LIMIT 1
)
WHERE category_node_id IS NOT NULL
  AND category_folder_id IS NULL
  AND 1 = (
    SELECT COUNT(*)
    FROM library_folders AS folder
    INNER JOIN component_category_nodes AS category_node
      ON category_node.id = workspace_price_freshness_policies.category_node_id
    WHERE folder.workspace_id = workspace_price_freshness_policies.workspace_id
      AND lower(trim(folder.name)) = lower(trim(category_node.label))
  );

CREATE TABLE __0085_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0085_assertion_fail
BEFORE INSERT ON __0085_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'component_category_folder_unification_preflight_failed');
END;

INSERT INTO __0085_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM workspaces AS workspace
  WHERE 1 <> (
    SELECT COUNT(*)
    FROM library_folders AS folder
    WHERE folder.workspace_id = workspace.id
      AND folder.parent_id IS NULL
      AND folder.name = 'Uncategorized'
      AND folder.is_default_category = 1
  )
);

INSERT INTO __0085_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM cost_library_items AS item
  WHERE item.library_folder_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM library_folders AS folder
       WHERE folder.id = item.library_folder_id
         AND folder.workspace_id = item.workspace_id
     )
);

INSERT INTO __0085_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM workspace_price_freshness_policies AS policy
  WHERE policy.category_node_id IS NOT NULL
    AND policy.category_folder_id IS NULL
);

INSERT INTO __0085_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT policy.workspace_id, policy.category_folder_id
  FROM workspace_price_freshness_policies AS policy
  WHERE policy.category_folder_id IS NOT NULL
  GROUP BY policy.workspace_id, policy.category_folder_id
  HAVING COUNT(*) > 1
);

DROP TRIGGER __0085_assertion_fail;
DROP TABLE __0085_assertion;

UPDATE workspace_price_freshness_policies
SET category_node_id = NULL
WHERE category_folder_id IS NOT NULL;

UPDATE library_folders
SET folder_kind = 'custom',
    source_category_node_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE folder_kind = 'taxonomy'
   OR source_category_node_id IS NOT NULL;

CREATE UNIQUE INDEX uq_workspace_price_freshness_category_folder
  ON workspace_price_freshness_policies(workspace_id, category_folder_id)
  WHERE category_folder_id IS NOT NULL;

DROP INDEX IF EXISTS idx_workspace_price_freshness_policies_category;

CREATE TRIGGER create_workspace_default_component_category
AFTER INSERT ON workspaces
BEGIN
  INSERT INTO library_folders (
    id,
    workspace_id,
    parent_id,
    name,
    sort_order,
    folder_kind,
    created_by,
    created_at,
    updated_at,
    is_default_category
  ) VALUES (
    lower(hex(randomblob(4))) || '-' ||
      lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
      lower(hex(randomblob(6))),
    NEW.id,
    NULL,
    'Uncategorized',
    0,
    'custom',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    1
  );
END;
