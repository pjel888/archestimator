-- 0050_admin_query_indexes.sql
-- Add missing indexes for admin surface query performance.
-- These indexes support ORDER BY clauses on single columns where existing
-- composite indexes have the sort column as a trailing (non-leading) key,
-- forcing full table scans + sorts on unfiltered admin list queries.
-- All use CREATE INDEX IF NOT EXISTS so they are idempotent and safe on
-- tables that may not exist yet (e.g. the Better Auth "session" table).

-- session(expiresAt): admin users list counts active sessions via
-- "WHERE expiresAt > ? GROUP BY userId" — without this index, every
-- admin users page load full-scans the entire session table.
CREATE INDEX IF NOT EXISTS "idx_session_expires"
  ON "session"("expiresAt");

-- Composite (userId, expiresAt) for scoped per-page aggregation.
CREATE INDEX IF NOT EXISTS "idx_session_user_expires"
  ON "session"("userId", "expiresAt");

-- profiles(created_at DESC): admin users list ORDER BY p.created_at DESC
-- has no supporting index (0003 only indexes email/role/default_workspace).
CREATE INDEX IF NOT EXISTS idx_profiles_created
  ON profiles(created_at DESC);

-- admin_audit_events(created_at DESC): unfiltered audit list ORDER BY
-- created_at DESC — existing composites have created_at trailing.
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_events(created_at DESC);

-- cron_run_events(started_at DESC): unfiltered admin observability list
-- — existing composites have started_at trailing.
CREATE INDEX IF NOT EXISTS idx_cron_run_started
  ON cron_run_events(started_at DESC);

-- ops_run_events(created_at DESC): unfiltered admin observability list
-- — existing composite has created_at trailing.
CREATE INDEX IF NOT EXISTS idx_ops_run_created
  ON ops_run_events(created_at DESC);

-- support_conversations(last_message_at DESC): unfiltered admin support
-- inbox list — existing composite has last_message_at trailing.
CREATE INDEX IF NOT EXISTS idx_support_conv_last_message
  ON support_conversations(last_message_at DESC);
