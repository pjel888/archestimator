# Implementation Closeout Log

Date: 2026-06-14

## Implemented

- Applied `delete_library_folder` to provider and verified the function exists.
- Applied notification tables/RLS/indexes/grants to provider and verified tables
  plus policies exist.
- Reconciled provider alias drift by renaming local migration files to the
  provider-recorded versions.
- Moved stale/deferred SQL out of the auto-apply path:
  - AI package-builder memory
  - chart bucket RPC
  - stale sibling-order RPC rewrite
- Regenerated `src/lib/supabase/types.ts` from linked provider typegen, then
  restored non-schema env helper exports and patched nullable RPC argument types
  that Supabase typegen emits too strictly.
- Added a runtime schema-availability guard for AI package-builder memory so
  `AI_PACKAGE_BUILDER_MEMORY_ENABLED=1` does not read or write the deferred
  `ai_package_builder_memory_preferences` table unless the schema probe passes.
- Normalized `library_folders.folder_kind` at the repository boundary because the
  linked schema emits it as `string` while UI code accepts only `taxonomy|custom`.
- Updated tests that pinned old local-only migration timestamps to locate the
  provider-recorded filenames or latest suffix.

## Verified

- Supabase MCP project boundary: `ebxxqidacheyapmmzavr`, `Archestimator`,
  `ACTIVE_HEALTHY`, Postgres 17.6.1.121.
- `supabase migration list --linked` passed after reconciliation with no
  remote-only rows; only `20260520100459`, `20260605123000`, and
  `20260605131500` remain local-only and are documented in
  `migration-ledger-map.md`.
- Provider migration list after repair contains:
  - `20260614125239` / `20260605113000_transactional_library_folder_delete`
  - `20260614125313` / `20260606090000_notification_system`
- Post-repair SQL probe reports:
  - `has_delete_library_folder: true`
  - `has_notification_definitions: true`
  - `has_notification_deliveries: true`
  - `has_ai_memory_preferences: false`
  - `has_get_project_chart_buckets: false`
- `bun run type-check` passed after generated-type refresh and compatibility
  boundary fixes.
- Targeted migration/runtime contract suite passed: 6 Vitest files, 53 tests.
- `bun x vitest run tests/vitest/ai-package-builder-route.test.ts --maxWorkers=1`
  passed 33 route tests, including memory disabled by absent schema.
- `git diff --check` passed.
- `POSTGRES_BIN_DIR=/opt/homebrew/bin bun run prove:notification-rls` passed
  with same-user read, cross-user denial, authenticated write denial,
  authenticated definition insert denial, and anonymous denial assertions.
- Supabase CLI upgraded to `2.106.0`; `supabase migration list --linked` still
  passes with no remote-only rows, and official advisors now run.
- Focused hardening migration `20260614140923` applied and recorded in the
  linked migration ledger. It cleared all mutable-search-path and auth-RLS
  initplan advisor warnings, and reduced broad security-definer execute grants.
- Suspicious local `osascript` persistence was confirmed at
  `/Library/LaunchDaemons/com.39825.plist`. User-writable dotfiles were moved to
  local quarantine; removing the root-owned LaunchDaemon requires administrator
  authority.

## Not Applied

- AI package-builder memory: deferred while default-off feature flag remains off.
- Chart bucket RPC: deferred while repository uses JS reducer.
- AC-MOD-04 and AC-MOD-06 pending-review SQL: left outside canonical migrations.
- T4 database pass: left outside canonical migrations.
- Broad advisor hardening: left as residual risk because the plan scoped this
  implementation to app-facing missing objects and ledger reconciliation.
  Fresh advisor counts are recorded in
  `supabase-advisors-after-cli-upgrade.md`.
- Remaining post-hardening advisor backlog: leaked-password protection,
  security-definer helper grant tightening after policy-surface audit, and
  multiple-permissive-policy consolidation.

## Incident

A no-op MCP migration row named `noop_test_should_not_apply` was accidentally
created with only `select 1;`. It was removed from
`supabase_migrations.schema_migrations` by exact version/name/statement match,
and a subsequent migration list confirmed it was absent.
