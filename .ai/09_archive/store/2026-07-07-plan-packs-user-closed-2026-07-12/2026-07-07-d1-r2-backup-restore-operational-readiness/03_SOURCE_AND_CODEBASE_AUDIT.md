# 03 — Source and Codebase Audit

> Read-only audit of the current D1/R2 backup, restore, export, inventory, and
> rehearsal capability. No file was modified.

## Repository inventory (relevant surfaces only)

| Path | Kind | Why relevant |
|---|---|---|
| `wrangler.jsonc` | config | Defines the bound resources: D1 `ARCH_DB` (`archestimator-proof-db`, prod id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`, preview id `363c756a-7c4d-42fe-908f-6d328bfa4acb`), R2 `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`, preview `…-dev`), 3 cron triggers (`0/15/30 3 * * *`), Queue `UPLOAD_JOBS_QUEUE`, DO `COLLAB_ROOMS`, Email `EMAIL`, Images `IMAGES`. |
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | script | The **only** restore-rehearsal artifact. Local-only SQLite dump→import round-trip on sanitized fixtures. |
| `package.json` | manifest | `cf:d1-restore-rehearsal` script; many `cf:d1-*` and `cf:verify-hosted-upload-*` scripts; **no** `cf:r2-*` inventory/restore script; **no** `cf:d1-export`/`cf:d1-backup` automation script. |
| `src/lib/uploads/r2-storage-provider.ts` | source | The R2 storage provider: `put`/`get`/`delete`/`head`/`createSignedReadUrl`/`getPublicUrl`; object key = `${bucket}/${path}`; path-segment safety validator. |
| `src/lib/uploads/runtime-storage-provider.ts` | source | Selects `cloudflare-r2` at runtime; requires `ARCH_UPLOADS_R2` bound. |
| `migrations/0010_upload_metadata.sql` | migration | Defines `upload_assets` (id, workspace_id, project_id, `storage_bucket`/`storage_path` nullable, `checksum_sha256` CHECK length=64, `scan_status`, `surface`/`status`) + indexes used for inventory reconciliation. **No `object_key` column.** |
| `migrations/0022_component_attachment_metadata.sql` | migration | Defines `cost_library_item_variant_attachments` (`storage_bucket` hard-CHECKED to `component-attachments`, `storage_path` NOT NULL, `is_current_approved`) — the **second** R2 reconciliation source. |
| `migrations/0004_account_security_events.sql`, `0035_…_hmac_checks.sql` | migration | Audit/security rows — relevant because a restore must preserve these for DSAR/security evidence. |
| `migrations/` (38 files, latest `0038`) | migrations | Full D1 schema the restore must round-trip; no file post-`0038` changes the R2-relevant columns (ASSUMP-05). |
| `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` | sibling plan | Reference for exhaustive pack shape and the original "restore/performance proof" gating. |

## Detailed audit: the restore rehearsal script

`scripts/generate-cloudflare-d1-restore-rehearsal.ts` (read in full, 452 lines):

**What it does (correct, reusable):**
- Builds a temporary SQLite DB from a **sanitized** fixture SQL (5 tables:
  `workspaces`, `workspace_members`, `projects`, `estimate_rows`,
  `upload_assets`) — `buildLocalSqliteRehearsal()` at lines 223–294.
- Dumps it (`sqlite3 .dump`), imports into a fresh DB, runs
  `PRAGMA foreign_key_check`, compares row counts and a SHA-256 checksum of the
  JSON snapshots, and removes temp artifacts (lines 236–289).
- Produces a structured report (`CloudflareD1RestoreRehearsalReport`) with
  gates: `d1ExportReady`, `d1ImportReady`, `restoreRehearsalReady`,
  `destructiveRestoreDocumented`, `localOnly: true`, `providerBacked: false`.
- Documents the canonical commands (lines 73–82):
  - Export: `wrangler d1 export ARCH_DB --remote --output=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql`
  - Import: `wrangler d1 execute ARCH_DB --remote --file=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql`
  - Local rehearsal shape: `sqlite3 source.db .dump > export.sql && sqlite3 restored.db < export.sql`
  - Destructive: `wrangler d1 time-travel restore ARCH_DB --timestamp=<ISO-8601-or-unix-timestamp>`
- Documents a 5-step destructive-restore runbook (lines 84–90): take a fresh
  export first, confirm target DB/id/account/env, treat time-travel as
  destructive, run only in staging until owner-approved cutover, and run
  post-restore schema/row-count/FK/authz-denial/RPC-golden/route-smoke checks.
- Honest `note` (line 347): states it is local-only, creates no D1 DBs, makes no
  Cloudflare API calls, runs no Time Travel restore, and does not prove a
  hosted restore.

**What it does NOT do (the gaps this pack addresses):**
- It never calls a Cloudflare API — `providerBacked: false` is hardcoded.
- Its fixture tables are a **subset** (5 of the real ~30+ tables across 38
  migrations); it proves the *mechanism*, not full-schema round-trip.
- It does not document **restore target isolation** (how to point the import at
  an isolated DB instead of production).
- It has **no R2 component** at all.
- It does not state an **RTO/RPO** target.
- It has no **failure drill matrix** beyond the destructive-restore note.

**Assessment:** the script is a strong, honest foundation. The implementation
plan (Phase 1) extends it rather than replacing it: add a provider-backed
variant gated behind OPEN-01, expand the fixture to cover the full schema (or
export a sanitized real subset), and add the target-isolation wiring.

## Detailed audit: R2 storage and object model

`src/lib/uploads/r2-storage-provider.ts` (read in full, 134 lines):
- Object key shape: `buildCloudflareR2ObjectKey(bucket, path)` → `${bucket}/${path}` (line 53). Logical bucket validated by `/^[a-z0-9][a-z0-9-]{1,62}$/`; path validated against traversal (`..`, `//`, leading `/`, backslash) (lines 118–133).
- Operations: `uploadObject` (put), `removeObjects` (per-key delete, parallel), `downloadObject` (get → arrayBuffer + contentType/size/etag/sha256), `headObject` (head → metadata), `createSignedReadUrl` (app-owned signer), `getPublicUrl` (requires explicit base URL).
- The provider exposes **no list operation** — consistent with the absence of a repo-level R2 inventory tool.

`src/lib/uploads/runtime-storage-provider.ts` (read in full, ~58 lines):
- Default provider `cloudflare-r2`; throws if `ARCH_UPLOADS_R2` is unbound; loads Cloudflare env via `@opennextjs/cloudflare` `getCloudflareContext`.

`migrations/0010_upload_metadata.sql` (audit, lines 44–113):
- `upload_assets` table columns: `id`, `workspace_id`, `project_id`, `estimate_id`, `surface` (CHECK `project-image`/`component-image`/`component-attachment`), `status`, `file_name`, `content_type`, `size_bytes`, **`checksum_sha256` (nullable, CHECK length=64 AND lower=…)**, **`scan_status`** (nullable, CHECK in pending/not_required/clean/infected/unsupported/failed_transient/failed_permanent/override_approved), **`storage_bucket` (nullable)**, **`storage_path` (nullable)**, `thumbnail_path` (nullable), plus scan-override columns.
- Indexes: `idx_upload_assets_scan_override_queue` (surface, status, scan_status, created_at, filtered to `surface='component-attachment' AND status='finalized' AND scan_status IN ('failed_permanent','unsupported')`), `idx_upload_assets_workspace_created`, `idx_upload_assets_project_created`.
- **There is no `object_key` column** — the first draft of this pack incorrectly lifted `object_key UNIQUE` from the *fixture* in `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (sanitized, not real). The real reconciliation key is the composite **`(storage_bucket, storage_path)`**, nullable (pre-finalized rows).
- `migrations/0022_component_attachment_metadata.sql` (lines 1–45) defines a **second** table `cost_library_item_variant_attachments` with `storage_bucket TEXT NOT NULL DEFAULT 'component-attachments' CHECK (storage_bucket = 'component-attachments')`, `storage_path TEXT NOT NULL` (in-DB CHECK rejecting `..`/`//`), `checksum_sha256` (nullable), `review_status`, `is_current_approved`.
- **R2 topology**: one physical bucket `archestimator-proof-uploads` holds objects keyed `${logicalBucket}/${path}` where logicalBucket ∈ {`project-images`, `component-images`, `component-attachments`} (confirmed in `src/lib/uploads/policy.ts`, `cleanup.ts`). Both tables are reconciliation sources.

## Detailed audit: package.json scripts

Relevant `cf:*` scripts (lines 9–58+):
- `cf:d1-restore-rehearsal` → `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (the one restore artifact).
- Many `cf:d1-*-proof` and `cf:verify-hosted-upload-*` scripts — runtime/feature proof, **not** backup/restore.
- `cf:pricing` → `scripts/generate-cloudflare-pricing-snapshot.ts` — refreshes free-tier pricing facts (reusable for the cost model).
- `cf:provider-exit-pack` → `scripts/generate-cloudflare-provider-exit-pack.ts` — legacy-provider exit ledger (tangential; the backup/restore pack is Cloudflare-only).
- `cf:inventory` → `scripts/generate-cloudflare-migration-inventory.ts` — D1 **migration** inventory, not R2 object inventory.
- **Absent**: `cf:r2-inventory`, `cf:r2-export`, `cf:r2-restore`, `cf:d1-export`, `cf:d1-backup`. These are the Phase 1–3 build targets.

## Detailed audit: wrangler.jsonc bindings

- D1 `ARCH_DB`: prod `database_id` `9bdb29bb-687e-4f51-ae81-7659c426ea5f`, preview `363c756a-7c4d-42fe-908f-6d328bfa4acb`. The preview id is the **candidate isolated restore target** (ASSUMP-03).
- R2 `ARCH_UPLOADS_R2`: `archestimator-proof-uploads` (prod), `archestimator-proof-uploads-dev` (preview).
- Cron: **3 triggers** — `0 3 * * *`, `15 3 * * *`, `30 3 * * *` (all slots used; an automated backup cron needs OPEN-02 + a slot decision).
- Observability enabled (logs + traces, head-sampled) — useful for drill evidence.
- `vars`: upload memory/body/concurrency/route-duration/p95 latency caps — relevant to R2 drill sizing.

## Documentation impact matrix

| Doc | Relevant section | Accuracy | Needs update by this plan? |
|---|---|---|---|
| `AGENTS.md` | "daily D1 backups plus the `cf:d1-restore-rehearsal` script for the cheaper recovery path" | **Imprecise**: implies daily backups exist. Only Time Travel (automatic) + manual export exist. | Yes (out of scope to edit here) — the pack documents the truth and flags OPEN-02. |
| `AGENTS.md` | cost posture (free-tier only) | Accurate. | No. |
| `2026-06-29-Cloudflare-Migration-Codex` | restore/performance proof gating | Accurate as historical baseline. | No (it's a sibling baseline). |
| Cloudflare official docs | D1 Time Travel/export; R2 list/restore/durability | Refreshed 2026-07 via research lane. | No — cited in `19_…`. |

## Patterns to reuse (do not reinvent)

- **Report shape**: `generate-cloudflare-d1-restore-rehearsal.ts` already
  produces `{ generatedAt, mode, sources, commands, …Ready gates, blockers, note }`
  JSON + Markdown. New R2 drill scripts should mirror this shape for
  consistency (`cf:r2-inventory`, `cf:r2-restore-rehearsal`).
- **Object-key safety**: `assertSafeLogicalBucket` / `assertSafeStoragePath` in
  `r2-storage-provider.ts` must be reused by any new inventory/restore tool to
  avoid path-traversal in keys.
- **Secret-free posture**: the rehearsal script reads no env, prints no
  secrets, and cleans temp artifacts. New tools must preserve this.
- **Pricing snapshot**: `cf:pricing` already refreshes free-tier facts; the
  cost model in `20_…` consumes its output shape rather than re-fetching.

## Symbols and paths referenced by the future implementation

| Symbol / path | Responsibility | Reuse / extend / new |
|---|---|---|
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | D1 local rehearsal + command docs | **Extend** (provider-backed variant gated by OPEN-01; full-schema fixture). |
| `src/lib/uploads/r2-storage-provider.ts` `buildCloudflareR2ObjectKey`, `assertSafeStoragePath` | Key safety | **Reuse** in new R2 tools. |
| `src/lib/uploads/runtime-storage-provider.ts` `createRuntimeUploadStorageProvider` | R2 binding resolution | **Reuse** (read pattern) in a Worker-based inventory. |
| `migrations/0010_upload_metadata.sql` `upload_assets` | Reconciliation source | **Read-only** (no schema change). |
| `wrangler.jsonc` `d1_databases[0].preview_database_id` | Isolated D1 target | **Reference** for target isolation. |
| `migrations/0022_component_attachment_metadata.sql` `cost_library_item_variant_attachments` | Second reconciliation source (component-attachments bucket) | **Read-only** (no schema change). |
| (new) `scripts/generate-cloudflare-r2-inventory.ts` | R2 object list + reconciliation against both tables | **New** (Phase 2). |
| (new) `scripts/generate-cloudflare-r2-restore-rehearsal.ts` | R2 get→put round-trip into `_drill/` preview key | **New** (Phase 3). |
| (new) `scripts/generate-cloudflare-d1-restore-target-isolation.ts` | Target-isolation pre-flight + isolated remote round-trip | **New** (Phase 1). |

## What was NOT analyzed (and why that's fine)

- The full ~30+ D1 table set is not enumerated here; the restore drill proves
  the *mechanism* on a representative subset and a full-schema variant is a
  Phase-1 task (the existing fixture already covers FK chains).
- Durable Object / Queue state restore is out of scope (brief is D1 + R2).
- Legacy Supabase migrations are **never** extended (per `AGENTS.md`); they are
  irrelevant to this Cloudflare-native restore pack.
