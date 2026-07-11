# 07 - Data, Database, API, And Network Plan

## Boundaries

- Local implementation may add `migrations/0066_publication_foreign_keys.sql`
  and migration tests under the `IMPLEMENT_LOCAL` ceiling.
- This pack's last observed run scope is `PLAN_ONLY`; it does not apply the
  migration locally or to hosted D1.
- The bound Archestimator D1 resource is covered by standing repository
  authorization. A later execution/release run must still record fresh local
  proof before applying it. Production deploy remains outside this pack.
- Migration 0014 is immutable history. Migration 0066 establishes the new
  schema contract. The allocation is `0066` in the durable Program
  `MIGRATION_LEASE_GENERATION.json` (generation 11, receipt SHA-256
  `9897153d7347b2e54b9b8439ff5c3cd7cfd364d49f69828df20c0b98bb8344e8`);
  `UNIT-008` must re-validate that generation immediately before writing
  because concurrent writers can advance the tail.

## DATA-001 - Fail-Closed Table Rebuild

SQLite/D1 cannot add these foreign keys with `ALTER TABLE ... ADD CONSTRAINT`.
UNIT-008 creates a single transaction-based table rebuild. It never deletes,
repairs, or filters orphaned source rows. Any orphan, constraint mismatch, count
mismatch, or copy failure aborts the entire transaction.

### Rebuild order and explicit column maps

Every `INSERT INTO ... (columns) SELECT columns ...` names its columns exactly;
`SELECT *` is forbidden.

1. `project_publications`
   - Columns: `id, workspace_id, project_id, token_hash, encrypted_token,
     password_hash, status, snapshot_version, selected_estimate_ids,
     snapshot_json, activity_target_labels_json, location_visibility,
     published_by, published_at, expires_at, revoked_at, open_count,
     latest_opened_at, created_at, updated_at`.
   - FKs: `workspace_id -> workspaces(id) ON DELETE CASCADE` and
     `project_id -> projects(id) ON DELETE CASCADE`.
2. `project_publication_events`
   - Columns: `id, publication_id, event_type, metadata_json, ip_hash,
     user_agent_hash, created_at`.
   - FK: `publication_id -> project_publications(id) ON DELETE CASCADE`.
   - Current CHECK **includes** `download_attempt_blocked`
     (`event_type IN ('open', 'password_success', 'password_failure',
     'download_attempt_blocked', 'password_attempt')`). The rebuild drops
     that value from the CHECK. The preflight must scan for rows whose
     `event_type = 'download_attempt_blocked'`; any such row is a data
     finding, not an orphan. Do not delete, rewrite, or filter such rows.
     If any exist, the fail-closed copy into the narrower CHECK aborts the
     transaction and requires a data-migration decision before retry.
3. `shared_link_recipients`
   - Columns: `id, publication_id, email, display_name, invited_by, invited_at,
     recipient_token_hash, delivery_status, last_opened_at,
     email_unsubscribed_at, resend_email_id, resend_last_event_id,
     resend_last_event_type, resend_last_event_at, resend_delivery_metadata,
     created_at, updated_at`.
   - FK: `publication_id -> project_publications(id) ON DELETE CASCADE`.
4. `shared_link_comments`
   - Columns: `id, publication_id, recipient_id, author_email, author_name,
     estimate_id, row_id, body, is_internal, target_kind, target_label,
     target_secondary_label, snapshot_version_at_comment, created_at`.
   - FKs: publication cascade; nullable `recipient_id -> shared_link_recipients(id)
     ON DELETE SET NULL` to preserve comment history.
5. `shared_link_responses`
   - Columns: `id, publication_id, recipient_id, decision, note,
     snapshot_version_at_decision, estimate_id, row_id, target_kind,
     target_label, target_secondary_label, signer_name,
     signature_intent_hash, created_at`.
   - FKs: publication cascade; nullable recipient `ON DELETE SET NULL` to
     preserve decision history.
6. `shared_link_events`
   - Columns: `id, publication_id, recipient_id, event_type, metadata_json,
     ip_hash, user_agent_hash, created_at`.
   - FKs: publication cascade; nullable recipient `ON DELETE SET NULL`.
7. `publication_digest_log`
   - Columns: `id, publication_id, activity_kind, delivery_status,
     owner_email_hash, resend_message_id, error_code, created_at`.
   - FK: publication cascade.

All column types, defaults, NOT NULL constraints, CHECK constraints, and unique
constraints are copied byte-for-byte from the current schema unless this plan
explicitly changes the event CHECK. Parent-table rebuild precedes child-table
rebuilds so every new child FK targets the final parent name.

### Transaction algorithm

1. Read and persist a local preflight report with per-table row count, stable
   ordered row digest, `PRAGMA foreign_key_check`, index definitions, and trigger
   definitions. A Node/Bun test harness computes SHA-256 over canonical JSON rows;
   the SQL migration does not pretend SQLite has a cryptographic digest function.
2. Assert the preflight has zero foreign-key/orphan findings. Do not delete them.
3. Begin one transaction and enable deferred FK checking while leaving foreign
   key enforcement on.
4. For each table in the order above: create `__0066` with the full contract,
   copy with explicit columns, compare source/copy row counts, drop the old
   table, rename the copy, and recreate every index.
5. Recreate and compare all triggers. The expected current trigger inventory is
   captured by the preflight even when it is empty.
6. Run `PRAGMA foreign_key_check` and abort on any row.
7. Commit only after the post-copy counts match. Generate the postflight report
   and assert row digests, index definitions, trigger definitions, FK targets,
   and CHECK constraints match the expected contract.

The migration must not use `DROP CONSTRAINT`, `DELETE orphan`, `INSERT OR IGNORE`,
or an implicit-column copy.

### Failure injection and rollback proof

`tests/vitest/publication-fk-migration.test.ts` runs 0066 against fresh local D1
fixtures and covers:

- clean schema upgrade with identical counts and row digests;
- one orphan at each FK edge, proving the transaction aborts and source digests
  remain unchanged;
- a mid-copy constraint failure, proving no half-rebuilt table survives;
- index, trigger, CHECK, default, nullability, and uniqueness parity;
- project/workspace cascade behavior and nullable-recipient SET NULL behavior;
- `PRAGMA foreign_key_check` before and after;
- reverse rebuild on a disposable database.

Rollback is either a tested reverse table rebuild that removes only the added
FK clauses while preserving rows and schema parity, or the repository's D1
restore path (`bun run cf:d1-restore-rehearsal` evidence followed by the approved
restore operation). SQLite `DROP CONSTRAINT` is not a rollback mechanism. Hosted
restore or reverse migration execution belongs to the release run.

`TEST-030` through `TEST-033` prove AC-048 and AC-049. `GATE-002` remains `FAIL`
until the local migration and failure-injection suite passes.

`UNIT-008` must read the durable Program generation receipt (currently
generation 11, tail `0065_activity_history_lifecycle.sql`, allocation
`0066_publication_foreign_keys.sql`, status `UNCLAIMED`) immediately before
the first edit and refuse the write on any generation, tail, owner-manifest,
allocation, or receipt mismatch. Concurrent workspace writers have already
advanced the tail from `0053` through `0065`; the exact path and allocation
must be re-proven, not assumed.

## DATA-002 - Roster Aggregation And Pagination

UNIT-009 replaces child-row fan-out with bounded aggregate queries keyed by
`publication_id`:

- recipient count: `COUNT(*) GROUP BY publication_id`;
- latest public comment: `MAX(created_at) GROUP BY publication_id`;
- latest response: `MAX(created_at) GROUP BY publication_id`;
- roster page: deterministic server-side order plus bounded `LIMIT` and cursor
  or offset contract.

The repository keeps authorization predicates before aggregation and returns no
metadata for publications outside the caller's manageable project set. The
evaluator seeds 10, 50, and 100 publications and records wall time without
claiming hosted-production performance. `TEST-034` covers AC-050;
`TEST-035`-`TEST-037` cover AC-053; the broader mapped `TEST-039` covers AC-051.

## API Contract Changes

| Route/surface | Change | Compatibility |
|---|---|---|
| Public POST routes | Bounded byte reader before parsing | Same success response; new 413/415 failures |
| Comment GET | Optional opaque `{createdAt,id}` cursor and bounded page | Existing first-page fields preserved |
| Decision POST | Durable D1 rate-limit denial remains authoritative | Existing typed denial retained |
| `/api/share/[token]/events` | Route removed | No consumers exist; static proof required |
| `/workshop/publisher/preview/[projectId]` | New authenticated server route | No public token or preview credential |
| Recipient proposals repository | Fail-closed typed unavailable on bad row | No partial metadata |

## Body Parsing Contract

`src/lib/http/read-bounded-body.ts` reads actual stream bytes, cancels on limit,
and provides bytes to JSON or form decoders. It handles absent/invalid/understated
`Content-Length`, chunked delivery, exact-boundary payloads, and early overflow.
Unsupported `Content-Encoding` is 415. Route limits are documented in
`08_SECURITY_PRIVACY_THREAT_MODEL.md` and tested by `TEST-018`-`TEST-020`.

## Preview Data Flow

`/workshop/publisher/preview/[projectId]` resolves the current Better Auth context,
authorizes that `projectId`, loads the current publication and sanitized snapshot,
and renders the recipient view in explicit read-only preview mode. No preview
cookie, preview token, or recipient-session mutation is created. Every navigation
or refresh repeats authorization.

## No New Dependency

Share controls use the URL, Clipboard API, and progressive native Web Share.
There is no QR renderer and no `package.json` or lockfile edit in this pack.

## Verification Commands

```bash
bun test tests/vitest/publication-fk-migration.test.ts
bun test tests/vitest/perf/publisher-roster-evaluator.test.ts
bun test tests/vitest/publication-body-size.test.ts
bun test tests/vitest/publisher-manager-preview-route.test.tsx
bun test tests/vitest/recipient-inbox-dead-end.test.tsx
bun run type-check
```
