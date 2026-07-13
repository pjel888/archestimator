# 07 — Data, Database, API, and Network Plan

> **Revision note (2026-07-07, Improve-Plan-Prompt pass).** The first draft
> rested on a column `upload_assets.object_key` lifted from the *fixture* in
> the existing rehearsal script, not from the real schema. An adversarial
> review (see `19_…`) confirmed that column **does not exist** in any of the 38
> migrations: `upload_assets` uses the nullable pair `(storage_bucket,
> storage_path)` (migration `0010`), and a second table
> `cost_library_item_variant_attachments` (migration `0022`) holds the
> `component-attachments` logical bucket. This revision corrects the R2
> reconciliation predicate, adds the second bucket/table, and adds the
> access-path matrix the strict prompt requires.

## Bound resource boundary (from `wrangler.jsonc` + migrations)

| Resource | Binding | Name | Prod id | Preview/isolated |
|---|---|---|---|---|
| D1 | `ARCH_DB` | `archestimator-proof-db` | `9bdb29bb-687e-4f51-ae81-7659c426ea5f` | `363c756a-7c4d-42fe-908f-6d328bfa4acb` |
| R2 (physical bucket) | `ARCH_UPLOADS_R2` | `archestimator-proof-uploads` | (prod bucket) | `archestimator-proof-uploads-dev` |

**Never**: Supabase `ebxxqidacheyapmmzavr`, the `archestimator` provider project, other accounts.

## R2 storage topology (corrected — the load-bearing model)

There is **one physical R2 bucket** (`archestimator-proof-uploads`) holding
objects whose key is `${logicalBucket}/${path}` (see
`buildCloudflareR2ObjectKey` in `src/lib/uploads/r2-storage-provider.ts:53`).
The logical bucket is the **first path segment** of the object key, not a
separate Cloudflare bucket. Two D1 tables track these objects:

| D1 table | Logical buckets (`storage_bucket` values) | Source migration | Key columns | NULLability |
|---|---|---|---|---|
| `upload_assets` | `project-images`, `component-images`, `component-attachments` (per `surface` CHECK at `0010:51`) | `0010_upload_metadata.sql:44-113` | `storage_bucket TEXT` (nullable), `storage_path TEXT` (nullable), `thumbnail_path TEXT` (nullable), `checksum_sha256` (nullable, 64-hex CHECK), `scan_status` | nullable — pre-finalized rows may have NULL storage columns |
| `cost_library_item_variant_attachments` | `component-attachments` **only** (hard CHECK `storage_bucket = 'component-attachments'` at `0022:6-8`) | `0022_component_attachment_metadata.sql:1-45` | `storage_bucket TEXT NOT NULL DEFAULT 'component-attachments'`, `storage_path TEXT NOT NULL` (with `..`/`//` rejection in CHECK), `checksum_sha256` (nullable), `review_status` | NOT NULL (always populated) |

**Runtime confirmation** (`src/lib/uploads/policy.ts`, `cleanup.ts`,
`cloudflare/upload-lifecycle-proof-router.ts`): the three logical buckets in
use are `project-images`, `component-images`, and `component-attachments`.

> **Correction of the first draft**: the rehearsal script's *fixture* defines
> a sanitized `upload_assets(object_key UNIQUE, …)` for its 5-table demo. That
> is **not** the production schema. The real reconciliation key is the
> **composite `(storage_bucket, storage_path)`**, rendered as the object key
> `${storage_bucket}/${storage_path}` for the live-bucket diff.

### Object-key safety (reuse, do not reinvent)
- `assertSafeLogicalBucket` (`/^[a-z0-9][a-z0-9-]{1,62}$/`) and
  `assertSafeStoragePath` (rejects `..`, `//`, leading `/`, backslash, bad
  segments) in `src/lib/uploads/r2-storage-provider.ts:118-133`.
- Migration `0022:13-16` adds an in-DB CHECK rejecting `..`/`//` in
  `storage_path` — defense in depth.
- The inventory/restore tools **must reuse** `assertSafeLogicalBucket` and
  `assertSafeStoragePath` before acting on any key, and must treat the logical
  bucket as the parsed first segment of the listed object key.

## Access-path matrix (per source — required by the strict prompt)

For every data source the drills touch, the chosen runtime path, its
authorization, its current schema/policy posture, the proof source, and the
fallback. A row whose chosen path cannot actually read/write the source is a
P0; none remains after this revision.

| Source | Chosen API/binding/path | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| D1 prod `ARCH_DB` (read-only for export) | `wrangler d1 export ARCH_DB --remote --output=…` (operator CLI) | operator scoped token | wrangler `whoami` + **manual scope probe** (see note) | 38 migrations; latest `0038` | `19_…` D1 wrangler-commands doc | preview DB export |
| D1 isolated target (write, drill) | `wrangler d1 execute <TARGET> --remote --file=…` where TARGET id ≠ `9bdb29bb-…` (asserted) | operator scoped token | target-isolation assertion (TASK-101) | disposable target | `19_…` + assertion test | drop + recreate target |
| D1 `upload_assets` (read, reconcile) | `wrangler d1 execute ARCH_DB --remote --command "SELECT storage_bucket, storage_path, checksum_sha256, scan_status, status FROM upload_assets WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL"` | operator scoped token | same | `0010:44-113`; nullable storage cols | migration file + `EXPLAIN` | join via `cost_library_item_variant_attachments` |
| D1 `cost_library_item_variant_attachments` (read, reconcile) | `wrangler d1 execute ARCH_DB --remote --command "SELECT storage_bucket, storage_path, checksum_sha256 FROM cost_library_item_variant_attachments WHERE is_current_approved = 1"` | operator scoped token | same | `0022:1-45`; NOT NULL | migration file | n/a (second source) |
| R2 prod bucket `archestimator-proof-uploads` (list/get) | REST `POST /accounts/{aid}/r2/buckets/archestimator-proof-uploads/objects/list` OR S3 `ListObjectsV2` OR Worker `bucket.list()` | operator scoped token | R2 read scope (manual probe) | one physical bucket; logical bucket = key prefix | `19_…` list API doc | prefix-sampled list |
| R2 preview bucket `archestimator-proof-uploads-dev` (put, drill) | `wrangler r2 object put --remote archestimator-proof-uploads-dev/_drill/<key> --file=…` | operator scoped token | R2 write scope (manual probe) | disposable preview bucket | `19_…` wrangler r2 doc | local sqlite only |

**Manual scope-probe note** (corrects P0-3): `cf:check-wrangler-auth` runs
only `wrangler whoami --json` and verifies **authentication + account
presence**, **not** D1/R2 token scopes. The runbook (`13_…`) must add a
manual pre-flight: `wrangler d1 list` (proves D1 read) and `wrangler r2
bucket list` (proves R2 read); a single `wrangler r2 object get --remote` on
a known preview object proves R2 read+get. Scope verification is a
**manual gate**, not automated by the existing script.

## D1 backup mechanisms (assumptions, free-tier bounds)

| Mechanism | What it is | Free-tier bound | Citation |
|---|---|---|---|
| **Time Travel** (automatic) | Point-in-time restore to any minute within retention; by timestamp or bookmark. | **7-day retention** (Free) vs 30-day (Paid). Restore rate limit **10 restores / 10 min / database**. | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) |
| **`wrangler d1 export`** (manual) | Full `.sql` dump (schema + data; `--no-data`/`--no-schema` flags). No incremental. | Counts against **rows-read/day (5M free)** — shared with app traffic. | [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 wrangler](https://developers.cloudflare.com/d1/wrangler-commands/) |
| **`wrangler d1 time-travel restore`** (destructive) | Rewinds the DB in-place to a timestamp/bookmark. | 10-restores/10-min cap; **destructive, no target isolation.** | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) |
| Legacy `wrangler d1 backup …` | Deprecated; also in-place. | — | [D1 legacy backups](https://developers.cloudflare.com/d1/reference/backups/) |
| Anything else | **None native.** Long-term/automated = export to R2 via Workflows (community pattern) or a cron. | — | [Workflows D1→R2 example](https://developers.cloudflare.com/workflows/examples/backup-d1/) |

**Key implication**: "daily D1 backups" (per `AGENTS.md`) is an *aspiration*,
not a current fact. Today it is Time Travel (automatic, 7-day free) + manual
export. Automated export is OPEN-02.

### Restore target isolation (REQ-D1-02)

Cloudflare provides **no** `--target`/`--into` flag for `time-travel restore`;
it always overwrites the same DB in place. Non-destructive rehearsal therefore
requires the **export→re-import** path into a *different* DB:

1. **Source** = staging DB (or a sanitized fixture for the mechanism rehearsal).
   **Never** export from prod into a drill and then mutate prod.
2. **Destination** = an isolated D1 DB. Candidates:
   - The bound **preview** DB (`363c756a-…`) via
     `wrangler d1 execute <PREVIEW> --remote --file=…`.
   - A **second named staging DB** (`wrangler d1 create archestimator-restore-drill`).
     Note: D1 free-tier allows 10 databases per account (`19_…` limits doc) —
     2 are in use, so headroom is ample.
3. **Hard assertion** (script-level, TASK-101): parse `wrangler.jsonc`, read
   the destination `database_id`, abort if it equals `9bdb29bb-…`.
4. `database_id` vs `preview_database_id` are **binding dispatch** fields, not
   restore-target overrides — but the preview id is a valid isolated target.

### D1 schema the restore must round-trip

- **38 migrations**, latest `0038_component_draft_resource_limits.sql`.
- Representative FK chains already covered by the rehearsal fixture:
  `workspaces → workspace_members`, `workspaces → projects → estimate_rows`,
  `projects → upload_assets`. (The fixture's `upload_assets` shape is
  sanitized and must not be treated as the real schema — see correction above.)
- **Full-schema variant** (TASK-103): generate the fixture from
  `migrations/*.sql` (schema only) + sanitized inserts, or document a
  "sanitize a real export" procedure.
- **Privacy/security rows** (`privacy_request_register` [0033],
  `data_retention_events` [0034], `account_security_events` [0004]/[0035]):
  a restore **resurrects** soft-deleted/erased rows. The runbook includes a
  concrete post-restore re-erasure gate (REQ-SEC-03, see `08_…`/`13_…`).

### Database change blueprint (for the *future* tooling, not this plan)

The future implementation does **not** change the D1 schema; it only reads
`upload_assets` and `cost_library_item_variant_attachments` for reconciliation.
The optional `backup_run_log` table (out of scope) blueprint:

- Migration `0039_backup_run_log.sql` (additive, after `0038`).
- Table `backup_run_log(id, kind, target_id, started_at, finished_at, status, artifact_path, rows_seen, checksum)` — append-only.
- Index `idx_backup_run_log_kind_started` on `(kind, started_at DESC)`.
- Rollback: `DROP TABLE backup_run_log;` (additive, safe).
- **Out of scope for the current plan.**

## R2 inventory + reconciliation design (corrected — REQ-R2-02)

### Reconciliation predicate (the corrected load-bearing query)
The inventory lists live R2 objects (key = `${logicalBucket}/${path}`); the
reconciliation diffs them against the **two** D1 tables' `(storage_bucket,
storage_path)` populations:

```sql
-- Live-in-DB keys (both tables, finalized/current rows only)
SELECT storage_bucket || '/' || storage_path AS object_key,
       'upload_assets' AS source_table
FROM upload_assets
WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL
  AND status NOT IN ('deleted', 'removed', 'aborted', 'failed')
UNION ALL
SELECT storage_bucket || '/' || storage_path AS object_key,
       'cost_library_item_variant_attachments' AS source_table
FROM cost_library_item_variant_attachments
WHERE is_current_approved = 1;
```

- **Orphans** = in bucket, not in either table (cleanup candidates — never
  delete without owner approval; out of scope here).
- **Dangling** = in a table, not in bucket (data-integrity flag; the row
  references a lost object).

### Listing API options (`wrangler r2 object list` does not exist)
1. **REST**: `POST /accounts/{account_id}/r2/buckets/archestimator-proof-uploads/objects/list` ([list API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/)).
2. **S3-compatible**: `ListObjectsV2` ([R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/)).
3. **Worker**: `bucket.list({ prefix, cursor, limit })` ([Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)).
- **Recommendation**: CLI + REST or S3 first (no new runtime surface).

### Two-bucket coverage (corrects P0-2)
The inventory must list **both** logical-bucket populations in the single
physical bucket:
- `project-images/…` and `component-images/…` → tracked by `upload_assets`.
- `component-attachments/…` → tracked by **both** `upload_assets` (surface =
  `component-attachment`) **and** `cost_library_item_variant_attachments`
  (hard-CHECKED to `component-attachments`). The reconciliation must
  de-duplicate: an object under `component-attachments/…` may legitimately
  appear in either table — report it as "covered" if present in at least one.

### Sampled vs full inventory (escalation trigger)
- Default = full list per logical bucket (paginated). Headroom ample at launch.
- **Escalation to sampled** when: object count > 100k, or a single full list
  would exceed 50% of the monthly Class-A budget (`20_…`). Record the sampling
  rate and the coverage confidence in the report.
- **Full-scan required** when: a DSAR/privacy incident demands complete
  coverage, or the orphan rate exceeds 5%.

## R2 restore design (REQ-R2-03, corrected for key-collision P1-11)

- **Sample one** non-orphan object across both tables (deterministic, e.g.
  median key by name, for reproducibility).
- `wrangler r2 object get --remote archestimator-proof-uploads/<key>` → local
  temp file (must use `--remote`; default is local simulator per
  [issue #13034](https://github.com/cloudflare/workers-sdk/issues/13034)).
- **PUT into a drill-namespaced key in the PREVIEW bucket** to avoid
  colliding with live preview objects:
  `wrangler r2 object put --remote archestimator-proof-uploads-dev/_drill/<key> --file=…`.
  Hard-assert the destination key starts with `_drill/` so a real preview
  object can never be overwritten (R2 has no versioning → overwrite is
  irreversible).
- Verify: re-head the `_drill/…` preview object; compare
  `checksums.toJSON().sha256` and `etag` to source; emit PASS/FAIL + artifact.
- **Cleanup**: delete the `_drill/…` preview object; `rmSync` the temp dir.

### R2 "backup" posture (REQ-R2-04)
- **Infra failure RPO ≈ 0**: 11 nines via replication + erasure coding (design
  target, not SLA) ([durability](https://developers.cloudflare.com/r2/reference/durability/)).
- **User-error RPO undefined**: no native versioning. Unrecoverable without an
  app-owned copy. Central R2 risk.
- **Free-tier posture**: durability + sampled-object drill; a second physical
  bucket or bulk copy is OPEN-03 (doubles Class A ops).

## API / network behavior

- All wrangler/REST/S3 calls are **operator-initiated from a local CLI**, not
  from the app runtime. No new Route Handler, no new fetch path in `src/`.
- **Auth**: wrangler uses the operator's scoped token (manual scope probe
  required — see access-path matrix). New tools must not read `.env*` and must
  not print the token.
- **Rate limits / quotas** (free-tier): rows-read/day (D1 export, shared with
  app), Class A ops/month (R2 list + put), Class B ops/month (R2 get). Modeled
  in `20_…`.
- **Retries**: wrangler has its own retry; tools must not retry destructively
  (a partial `execute --remote --file` aborts + restarts into a fresh target).
- **Timeouts**: large exports may be slow; reuse the
  `scripts/wrangler-undici-timeout.mjs` import pattern (used by `cf:deploy`).
- **Off-peak rule**: schedule provider drills **outside the 03:00–03:30 UTC
  cron window** (`0/15/30 3 * * *` in `wrangler.jsonc`) to avoid quota
  contention with production scheduled jobs.

## Out of scope (recorded)

- **Durable Object** state (`COLLAB_ROOMS`) and **Queue** replay/DLQ — separate
  surfaces; this pack is D1 + R2 only.
- **R2 lifecycle rules** (retention/transition/expiration) — not configured in
  `wrangler.jsonc`; would need owner approval.
- **Next.js / Worker `scheduled()` path** — not drilled (CLI-only tools); the
  existing 03:00–03:30 UTC crons are untouched.

## Generated-type / Worker Env impact

None. No binding is added or changed, so `bun run cf:typegen` is not required.
A future Worker-variant inventory route (not the CLI default) would require it.
