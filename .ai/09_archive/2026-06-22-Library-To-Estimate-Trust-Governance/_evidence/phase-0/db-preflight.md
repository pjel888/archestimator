# Phase 0 DB Preflight

Status: live provider preflight complete for the Archestimator linked project.
Durable governance migration `20260622143000_library_trust_governance.sql`
was applied to the linked project and then marked applied in the migration
ledger. Existing unrelated migration drift remains documented below.

Captured: 2026-06-22 provider pass.

## Project Guard

- Supabase project ref: `ebxxqidacheyapmmzavr`.
- Project status observed: `ACTIVE_HEALTHY`, region `ap-southeast-2`,
  Postgres `17.6`.
- Command/tool used: Supabase CLI linked-project read/write commands scoped to
  the configured Archestimator project.
- Confirmation that no unrelated provider project was touched: yes.
- PITR/cost posture: unchanged; no PITR or paid backup posture was enabled.

## Migration History

- `supabase migration list --linked` showed existing drift before this work:
  several local-only migrations and two remote-only migrations predate the new
  governance migration.
- `supabase db push` was intentionally not used because it would mix this
  governance change with unrelated migration-history drift.
- Applied SQL directly with:
  `supabase db query --linked --file supabase/migrations/20260622143000_library_trust_governance.sql`.
- Repaired only this migration version with:
  `supabase migration repair --linked --status applied 20260622143000`.
- Post-repair `supabase migration list --linked` shows
  `20260622143000 | 20260622143000`.

## Live Data Snapshot

- Cost entry rows: `155`.
- Price option rows: `155`.
- Attachment rows: `0`.
- SQL-001 duplicate current cost groups: `0`.
- SQL-002 bad active cost references: `0`.
- SQL-003 bad attachment paths: `0`.

## Schema Snapshot

- Governance columns found: `19`.
- Governance event tables found: `2`.
- Added cost-entry state includes `review_status`, reviewer/timestamp/note,
  assignment/due date, lock fields, `superseded_by`, and `review_revision`.
- Added attachment state includes `review_status`,
  `applicable_cost_entry_id`, `is_current_approved`, reviewer/timestamp/note,
  `superseded_by`, and `review_revision`.
- Sidebar performance indexes added:
  `cost_library_items_sidebar_lite_idx`,
  `cost_library_price_options_sidebar_item_idx`, and
  `cost_library_cost_entries_sidebar_item_idx`.

## Policy And Grant Snapshot

- Broad write grants found on cost entries, attachments, and governance event
  tables for `PUBLIC`, `anon`, or `authenticated`: `0`.
- Public/anon governance RPC execute grants found: `0`.
- Authenticated governance RPC execute grants found: `9`; each RPC performs the
  beta admin/platform-admin check internally.
- Event table read policies are admin-only; cost entries and attachments remain
  member-readable.

## Probes

- SQL-001 result: pass, `0` rows.
- SQL-002 result: pass, `0` rows.
- SQL-003 result: pass, `0` rows.
- SQL-004 result: pass, broad write grants `0`.
- SQL-005 result: pass, public/anon governance RPC execute grants `0`.
- SQL-006A sidebar item-page query-plan result: pass on current live dataset.
  `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` used
  `cost_library_items_sidebar_lite_idx`, node type `Index Scan`, actual rows
  `50`, execution time about `0.296 ms`.
- SQL-006A related cost-entry query-plan retry: partial. A subquery-shaped
  EXPLAIN on the small live dataset chose a sequential scan over `155` rows
  despite the new bounded index; the app sends an explicit bounded `IN` list.
  A later literal-shape provider retry reached the linked project, but the CLI
  role saw `0` library rows through hardened policies, so the retry was not
  row-count-representative.
- SQL-006B governance queue query-plan result: partial. The first attempt was
  blocked by Supabase temp-role authentication throttling after successful
  migration and preflight probes. A later retry reached the provider; because
  the temp role saw `0` library rows, the queue EXPLAIN chose a zero-cost
  sequential scan and does not prove real workload latency.

## Migration Readiness

- Duplicate repair needed: no duplicate current cost groups were found.
- Backfill rule applied: existing current costs default to `proposed`;
  existing attachments default to `uploaded`.
- Generated types impact: local `src/lib/supabase/types.ts` was updated for the
  new enums, columns, event tables, and RPCs. Regenerate from provider after the
  unrelated migration-history drift is reconciled.
- Local reset/migration test command: not run; Docker/local Supabase was not
  available in this environment.
- Backup/fix-forward posture: additive migration; no destructive data rewrite;
  fix-forward path is a follow-up migration.

## Decision

- Durable cost governance allowed to proceed: yes, with provider migration
  applied and grant/RPC probes green.
- Durable attachment governance allowed to proceed: yes, with provider migration
  applied and delete-route guard implemented.
- Remaining provider proof gap: row-count-representative SQL-006B and
  literal-shape related-query EXPLAIN. The retry after Supabase temp-role auth
  throttling cleared did not invalidate the applied schema/RPC/grant proof, but
  it remains a performance-evidence gap because the CLI role sees no governed
  library rows under the hardened policies.
