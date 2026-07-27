CREATE TRIGGER project_publications_cutover_freeze_insert
BEFORE INSERT ON project_publications
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER project_publications_cutover_freeze_update
BEFORE UPDATE ON project_publications
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER project_publications_cutover_freeze_delete
BEFORE DELETE ON project_publications
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_insert
BEFORE INSERT ON shared_link_recipients
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_update
BEFORE UPDATE ON shared_link_recipients
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_delete
BEFORE DELETE ON shared_link_recipients
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_insert
BEFORE INSERT ON shared_link_comments
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_update
BEFORE UPDATE ON shared_link_comments
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_delete
BEFORE DELETE ON shared_link_comments
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_insert
BEFORE INSERT ON shared_link_responses
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_update
BEFORE UPDATE ON shared_link_responses
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_delete
BEFORE DELETE ON shared_link_responses
WHEN COALESCE((SELECT enabled FROM feature_flags WHERE key = 'client_portal_legacy_write_freeze'), 0) = 1
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;
