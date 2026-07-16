CREATE TRIGGER enforce_component_category_folder_insert
BEFORE INSERT ON cost_library_items
WHEN NEW.category_node_id IS NOT NULL
  OR NEW.library_folder_id IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM library_folders AS folder
    WHERE folder.id = NEW.library_folder_id
      AND folder.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(ABORT, 'component category folder must belong to the component workspace');
END;

CREATE TRIGGER enforce_component_category_folder_update
BEFORE UPDATE OF workspace_id, library_folder_id, category_node_id ON cost_library_items
WHEN NEW.category_node_id IS NOT NULL
  OR NEW.library_folder_id IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM library_folders AS folder
    WHERE folder.id = NEW.library_folder_id
      AND folder.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(ABORT, 'component category folder must belong to the component workspace');
END;

CREATE TRIGGER enforce_category_policy_folder_insert
BEFORE INSERT ON workspace_price_freshness_policies
WHEN NEW.category_node_id IS NOT NULL
  OR (
    NEW.category_folder_id IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM library_folders AS folder
    WHERE folder.id = NEW.category_folder_id
      AND folder.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'category policy folder must belong to the policy workspace');
END;

CREATE TRIGGER enforce_category_policy_folder_update
BEFORE UPDATE OF workspace_id, category_folder_id, category_node_id ON workspace_price_freshness_policies
WHEN NEW.category_node_id IS NOT NULL
  OR (
    NEW.category_folder_id IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM library_folders AS folder
    WHERE folder.id = NEW.category_folder_id
      AND folder.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'category policy folder must belong to the policy workspace');
END;

CREATE TRIGGER enforce_library_folder_parent_insert
BEFORE INSERT ON library_folders
WHEN NEW.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM library_folders AS parent
    WHERE parent.id = NEW.parent_id
      AND parent.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(ABORT, 'library folder parent must belong to the folder workspace');
END;

CREATE TRIGGER enforce_library_folder_parent_update
BEFORE UPDATE OF workspace_id, parent_id ON library_folders
WHEN NEW.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM library_folders AS parent
    WHERE parent.id = NEW.parent_id
      AND parent.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(ABORT, 'library folder parent must belong to the folder workspace');
END;

CREATE TRIGGER protect_default_component_category_update
BEFORE UPDATE OF workspace_id, parent_id, name, is_default_category ON library_folders
WHEN OLD.is_default_category = 1
  AND (
    NEW.workspace_id <> OLD.workspace_id
    OR NEW.parent_id IS NOT NULL
    OR NEW.name <> 'Uncategorized'
    OR NEW.is_default_category <> 1
  )
BEGIN
  SELECT RAISE(ABORT, 'default component category cannot be renamed, reparented, moved, or cleared');
END;

CREATE TRIGGER protect_default_component_category_delete
BEFORE DELETE ON library_folders
WHEN OLD.is_default_category = 1
BEGIN
  SELECT RAISE(ABORT, 'default component category cannot be deleted');
END;

CREATE TRIGGER rehome_component_category_before_folder_delete
BEFORE DELETE ON library_folders
WHEN OLD.is_default_category = 0
BEGIN
  DELETE FROM workspace_price_freshness_policies
  WHERE workspace_id = OLD.workspace_id
    AND category_folder_id = OLD.id
    AND EXISTS (
      SELECT 1
      FROM workspace_price_freshness_policies AS destination
      WHERE destination.workspace_id = OLD.workspace_id
        AND destination.category_folder_id = COALESCE(
          OLD.parent_id,
          (
            SELECT default_folder.id
            FROM library_folders AS default_folder
            WHERE default_folder.workspace_id = OLD.workspace_id
              AND default_folder.is_default_category = 1
            LIMIT 1
          )
        )
    );

  UPDATE workspace_price_freshness_policies
  SET category_folder_id = COALESCE(
        OLD.parent_id,
        (
          SELECT default_folder.id
          FROM library_folders AS default_folder
          WHERE default_folder.workspace_id = OLD.workspace_id
            AND default_folder.is_default_category = 1
          LIMIT 1
        )
      ),
      category_node_id = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = OLD.workspace_id
    AND category_folder_id = OLD.id;

  UPDATE cost_library_items
  SET library_folder_id = COALESCE(
        OLD.parent_id,
        (
          SELECT default_folder.id
          FROM library_folders AS default_folder
          WHERE default_folder.workspace_id = OLD.workspace_id
            AND default_folder.is_default_category = 1
          LIMIT 1
        )
      ),
      category = COALESCE(
        (
          SELECT parent.name
          FROM library_folders AS parent
          WHERE parent.id = OLD.parent_id
            AND parent.workspace_id = OLD.workspace_id
        ),
        'Uncategorized'
      ),
      category_node_id = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = OLD.workspace_id
    AND library_folder_id = OLD.id;

  UPDATE library_folders
  SET parent_id = OLD.parent_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE workspace_id = OLD.workspace_id
    AND parent_id = OLD.id;
END;
