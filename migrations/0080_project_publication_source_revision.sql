-- Project-scoped source fence used by guarded publication commits.
-- Development rollback: ALTER TABLE projects DROP COLUMN publication_source_revision;

ALTER TABLE projects
ADD COLUMN publication_source_revision INTEGER NOT NULL DEFAULT 0
CHECK (publication_source_revision >= 0);
