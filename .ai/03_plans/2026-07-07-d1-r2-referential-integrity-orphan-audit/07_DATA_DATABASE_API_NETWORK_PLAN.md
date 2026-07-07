# 07 — Data, Database, API, and Network Plan

This is a database-centric pack. The "API" surface is the audit script + lib port; there is no HTTP API in the core scope (an optional internal route for cron-triggered audit is discussed but not required).

## Database change blueprint

This pack is **planning-only**; no migrations are applied here. The blueprint below is for the future executor and is the single source of truth for any D1/migration work the pack implies.

### DB-CHG-001 — No schema change required for detection
- Detection is pure read-only SQL against the existing schema. No migration.
- Ordering dependency: none.

### DB-CHG-002 — Track A (DATA-003): no migration, application-batch change only
- `src/lib/projects/actions.ts` project-delete batch gains two explicit `DELETE FROM estimate_sheet_events WHERE estimate_id IN (...)` and `DELETE FROM estimate_sheet_adjustments WHERE estimate_id IN (...)` statements (before `DELETE FROM estimates`).
- No schema change. Batch remains atomic via `database.batch()`.
- Rollback: revert the two statements; behavior returns to transitive-cascade reliance.

### DB-CHG-003 — Track B (DATA-004, gated): connection pragma + possible constraint additions
- Enable `PRAGMA foreign_keys = ON` in the D1 connection helper (`src/lib/cloudflare/d1.ts`) per connection.
- Pre-flight: run `PRAGMA foreign_key_check` dry-run repair FIRST to clear any existing violations; otherwise enabling FKs can hard-error writes.
- Optional follow-up migration (separate pack): add real `REFERENCES` to the 0014 publication cluster. **Not** in this pack — it is a schema change requiring its own blueprint and is blocked on OPEN-DEC-001 + a clean dry-run.
- Rollback: remove the pragma line; behavior returns to today's unverified state.

### DB-CHG-004 — `uploads_orphaned` retention rule (OPEN-DEC-003)
- Add a rule to `DEFAULT_RETENTION_RULES` in `src/lib/compliance/retention-core.ts` for `class_name='uploads_orphaned'` so the repair audit row has a retention home. TTL: short (e.g., 90d) — these are operational audit rows, not user data.
- No migration (the enum already exists in `0034`).
- Rollback: remove the rule.

## Data ownership (summary)

Ownership is membership-derived, not column-derived (see `03` §4 and `src/lib/authz/d1-access.ts`). The audit does not depend on ownership semantics — it checks raw referential integrity. This is intentional: the audit must catch bugs the authz layer cannot.

## Relationships / referential integrity

Full edge list in `03` §2. The audit's detection queries are generated from this list.

## Constraints / validation

- `cost_library_item_variant_attachments` has anti-traversal `CHECK` on `storage_path` and `storage_bucket='component-attachments'` (0022). The audit must respect these constraints when forming repair actions (never synthesize a path that violates them).
- `UNIQUE(storage_bucket, storage_path)` on attachments (0022:46) — repair dedupe relies on it.

## Transaction boundaries

- Detection: none (read-only).
- Repair: one D1 `batch()` per orphan class (atomic within the class); R2 deletes are best-effort with idempotent retry. D1↔R2 remains non-transactional — the audit row is the durability surface for the R2 side.

## Concurrency

- Detection is read-only and safe to run concurrently with app traffic.
- Repair should run in a single-operator window (no concurrent repairs). The `--from-report` file is the coordination token; a second repair on the same report is a no-op (idempotent).

## Referential integrity (the point of this pack)

See `03` §7 (ORPH-001…015). The audit closes the "is integrity actually enforced?" question for every edge.

## Migration sequencing

- No migration in core scope.
- DB-CHG-004 (retention rule) is a code change in `retention-core.ts`, not a migration.
- DB-CHG-003 optional follow-up migration is out of scope and would be its own pack.

## Backfill

- N/A (no new columns).

## Existing-data compatibility

- Track A (DB-CHG-002) is purely additive deletes in a batch; compatible with existing data.
- Track B (DB-CHG-003) requires a clean dry-run first; pre-existing orphans would hard-error after enablement.

## Data retention / deletion / audit / recovery

- Repair writes audit rows to `data_retention_events` (reusing `recordRetentionEventInD1`).
- Retention of the audit rows themselves: DB-CHG-004 (90d proposed).
- Recovery: repair is idempotent and audited; a bad repair can be re-derived from the audit row + report.

## Data verification

- The audit IS the data verification. Self-referential but sound: the detection queries are independent of the application layer.

## API / network behavior

- No HTTP API in core scope.
- Optional: an internal route `/api/internal/orphan-audit` mirroring `/api/internal/upload-cleanup` (cron-triggered, `CRON_SECRET`-gated). Not required for the dry-run script; listed as an option in `13`.

## Input validation

- Script inputs: `--dry-run` (default), `--target local|preview|production`, `--from-report <path>`, `--confirm`, `--class <filter>`, `--r2-cost-cap <usd>`.
- All inputs validated at the script boundary; invalid → hard error.

## Error contracts

- Exit codes: 0 clean/warning, non-zero critical/partial/read-only-violated.
- stderr: human-readable error + the failing component.
- Report `gaps[]`: structured list of classes skipped and why.

## Idempotency

- Detection: fully idempotent (read-only).
- Repair: per-action idempotent; re-run on same report = no-op.

## Pagination

- D1 orphan queries paginated by `id > last_id LIMIT N`.
- R2 `list()` paginated by cursor.

## Provider-proof boundary

- Local (`node:sqlite`): proves logic; not provider behavior.
- Preview (Cloudflare D1 preview + R2 preview): provider-backed; dry-run target.
- Production: provider-backed; owner-gated.
- Cannot claim "production clean" from a local run; evidence class labeled per run.

## Access-path matrix

| Source | Chosen path | Runtime role | Authorization | Latest schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| D1 (local) | `node:sqlite` `DatabaseSync` | test | n/a | migrations 0001–0038 | unit test | — |
| D1 (preview) | `ARCH_DB` binding read-only helper | operator | operator token | applied migrations | dry-run report | local logic test |
| D1 (prod) | `ARCH_DB` binding read-only helper | operator | operator token + owner gate | applied migrations | dry-run report | preview dry-run |
| R2 (preview/prod) | `ARCH_UPLOADS_R2.list/head` | operator | operator token | single bucket, 3 prefixes | reconciliation report | D1-only audit (Class A) |

If a chosen path cannot read a source after current migrations/policies, that is a P0 planning defect — none found here (all targets are readable by raw SQL / R2 list).
