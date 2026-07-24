CREATE TABLE __0103_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0103_assertion_fail
BEFORE INSERT ON __0103_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'onboarding_activation_resource_integrity_failed');
END;

UPDATE beta_activation_progress
SET
  project_id = (
    SELECT estimate.project_id
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_progress.estimate_id
      AND project.workspace_id = beta_activation_progress.workspace_id
  ),
  estimate_id = CASE
    WHEN EXISTS (
      SELECT 1
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = beta_activation_progress.estimate_id
        AND project.workspace_id = beta_activation_progress.workspace_id
    )
      THEN estimate_id
    ELSE NULL
  END
WHERE estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_progress.estimate_id
      AND estimate.project_id = beta_activation_progress.project_id
      AND project.workspace_id = beta_activation_progress.workspace_id
  );

UPDATE beta_activation_events
SET
  project_id = (
    SELECT estimate.project_id
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_events.estimate_id
      AND project.workspace_id = beta_activation_events.workspace_id
  ),
  estimate_id = CASE
    WHEN EXISTS (
      SELECT 1
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = beta_activation_events.estimate_id
        AND project.workspace_id = beta_activation_events.workspace_id
    )
      THEN estimate_id
    ELSE NULL
  END
WHERE estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_events.estimate_id
      AND estimate.project_id = beta_activation_events.project_id
      AND project.workspace_id = beta_activation_events.workspace_id
  );

UPDATE beta_activation_outbox
SET
  project_id = (
    SELECT estimate.project_id
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_outbox.estimate_id
      AND project.workspace_id = beta_activation_outbox.workspace_id
  ),
  estimate_id = CASE
    WHEN EXISTS (
      SELECT 1
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = beta_activation_outbox.estimate_id
        AND project.workspace_id = beta_activation_outbox.workspace_id
    )
      THEN estimate_id
    ELSE NULL
  END
WHERE estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    JOIN projects project ON project.id = estimate.project_id
    WHERE estimate.id = beta_activation_outbox.estimate_id
      AND estimate.project_id = beta_activation_outbox.project_id
      AND project.workspace_id = beta_activation_outbox.workspace_id
  );

UPDATE beta_activation_progress
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND estimate_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = beta_activation_progress.project_id
      AND project.workspace_id = beta_activation_progress.workspace_id
  );

UPDATE beta_activation_events
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND estimate_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = beta_activation_events.project_id
      AND project.workspace_id = beta_activation_events.workspace_id
  );

UPDATE beta_activation_outbox
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND estimate_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = beta_activation_outbox.project_id
      AND project.workspace_id = beta_activation_outbox.workspace_id
  );

INSERT INTO __0103_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM beta_activation_progress progress
  WHERE (
    progress.project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.id = progress.project_id
        AND project.workspace_id = progress.workspace_id
    )
  )
  OR (
    progress.estimate_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM estimates estimate
      WHERE estimate.id = progress.estimate_id
        AND estimate.project_id = progress.project_id
    )
  )
);

INSERT INTO __0103_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM beta_activation_events event
  WHERE (
    event.project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.id = event.project_id
        AND project.workspace_id = event.workspace_id
    )
  )
  OR (
    event.estimate_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM estimates estimate
      WHERE estimate.id = event.estimate_id
        AND estimate.project_id = event.project_id
    )
  )
);

INSERT INTO __0103_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM beta_activation_outbox outbox
  WHERE (
    outbox.project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.id = outbox.project_id
        AND project.workspace_id = outbox.workspace_id
    )
  )
  OR (
    outbox.estimate_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM estimates estimate
      WHERE estimate.id = outbox.estimate_id
        AND estimate.project_id = outbox.project_id
    )
  )
);

CREATE TRIGGER beta_activation_progress_resource_integrity_insert
BEFORE INSERT ON beta_activation_progress
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER beta_activation_progress_resource_integrity_update
BEFORE UPDATE OF workspace_id, project_id, estimate_id ON beta_activation_progress
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER beta_activation_events_resource_integrity_insert
BEFORE INSERT ON beta_activation_events
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER beta_activation_events_resource_integrity_update
BEFORE UPDATE OF workspace_id, project_id, estimate_id ON beta_activation_events
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER beta_activation_outbox_resource_integrity_insert
BEFORE INSERT ON beta_activation_outbox
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER beta_activation_outbox_resource_integrity_update
BEFORE UPDATE OF workspace_id, project_id, estimate_id ON beta_activation_outbox
WHEN (
  NEW.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM projects project
    WHERE project.id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.estimate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimates estimate
    WHERE estimate.id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER projects_clear_activation_resources_before_delete
BEFORE DELETE ON projects
BEGIN
  UPDATE beta_activation_progress
  SET project_id = NULL, estimate_id = NULL
  WHERE project_id = OLD.id;

  UPDATE beta_activation_events
  SET project_id = NULL, estimate_id = NULL
  WHERE project_id = OLD.id;

  UPDATE beta_activation_outbox
  SET project_id = NULL, estimate_id = NULL
  WHERE project_id = OLD.id;
END;

CREATE TRIGGER projects_reject_activation_resource_workspace_move
BEFORE UPDATE OF workspace_id ON projects
WHEN NEW.workspace_id IS NOT OLD.workspace_id
  AND EXISTS (
    SELECT 1
    FROM beta_activation_progress
    WHERE project_id = OLD.id
    UNION ALL
    SELECT 1
    FROM beta_activation_events
    WHERE project_id = OLD.id
    UNION ALL
    SELECT 1
    FROM beta_activation_outbox
    WHERE project_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

CREATE TRIGGER estimates_reject_activation_resource_project_move
BEFORE UPDATE OF project_id ON estimates
WHEN NEW.project_id IS NOT OLD.project_id
  AND EXISTS (
    SELECT 1
    FROM beta_activation_progress
    WHERE estimate_id = OLD.id
    UNION ALL
    SELECT 1
    FROM beta_activation_events
    WHERE estimate_id = OLD.id
    UNION ALL
    SELECT 1
    FROM beta_activation_outbox
    WHERE estimate_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'activation_resource_integrity');
END;

INSERT INTO __0103_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0103_assertion_fail;
DROP TABLE __0103_assertion;
