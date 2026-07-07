# 02 — Feature Brief and Scope

## Source brief (verbatim, from PROMPT.md)

> **Goal.** Create an operational backup/restore plan pack for D1 data and R2
> objects that is practical for the current free-tier Cloudflare posture.
>
> **Evidence To Start From.**
> - `AGENTS.md` references daily D1 backups and `cf:d1-restore-rehearsal`.
> - `scripts/cf-d1-restore-rehearsal.mjs` and related package scripts exist.
> - R2 uploads are active through `ARCH_UPLOADS_R2`, upload storage providers,
>   and upload proof scripts.
> - No single pack proves restore target isolation, R2 object inventory, object
>   restoration, RTO/RPO, and operator runbook readiness.
>
> **Required Plan Pack.** Include D1 backup assumptions, restore rehearsal
> procedure, safe target isolation, R2 inventory/export/restore strategy,
> RTO/RPO targets, failure drills, evidence artifacts, and what is impossible to
> prove locally.
>
> **Constraints.** Use only Cloudflare resources bound in `wrangler.jsonc`.
> Keep costs inside free-tier/bundled limits unless a future owner explicitly
> approves otherwise.
>
> **Stop Condition.** The pack is complete when a future executor can run or
> simulate a recovery drill and know exactly what evidence proves restore
> readiness.

## Corrections to the brief (reconciled against current repo reality)

These are reconciliations, not scope changes. Each is recorded so a future
executor does not act on a stale assumption.

| Brief says | Reality (with evidence) | Resolution |
|---|---|---|
| "daily D1 backups" (in `AGENTS.md`) | No automated daily D1 export exists in the repo. The reference is to Cloudflare's automatic **Time Travel** (continuous, not scheduled) plus the **manual** `wrangler d1 export`. | Treat "daily D1 backups" as an *aspiration* that **OPEN-02** addresses, not a current fact. The pack makes this explicit. |
| "`scripts/cf-d1-restore-rehearsal.mjs`" | The actual script is **TypeScript**: `scripts/generate-cloudflare-d1-restore-rehearsal.ts`, package script `cf:d1-restore-rehearsal`. | Use the `.ts` path + `bun run cf:d1-restore-rehearsal` throughout. |
| "upload proof scripts" (plural, for R2) | R2 *runtime* proof exists (`cf:verify-hosted-upload-*`), but **no R2 inventory/export/restore** script exists. | Treat R2 restore tooling as a Phase-2/3 build, not an audit of existing scripts. |

No conflict required escalation; the brief's intent and the repo reality agree
once these are reconciled.

## Scope (in)

1. **D1 backup/restore operational design** for `ARCH_DB`
   (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`):
   - Time Travel assumptions (7-day free retention, per-minute granularity,
     destructive in-place restore).
   - Manual `wrangler d1 export` procedure and its free-tier quota bounds.
   - **Restore target isolation**: non-destructive drill into an isolated D1 DB
     (preview `363c756a-7c4d-42fe-908f-6d328bfa4acb` or a named staging DB),
     never the production `database_id`.
   - Restore rehearsal procedure (local SQLite + provider-backed when approved).
2. **R2 backup/restore operational design** for `ARCH_UPLOADS_R2`
   (`archestimator-proof-uploads`):
   - Object inventory (list via REST/S3/Worker API; reconcile against
     both `upload_assets` and `cost_library_item_variant_attachments`, keyed by
     the composite `(storage_bucket, storage_path)`).
   - Selective export (single object `get` to local) and restore (`put` back).
   - The "no native versioning" constraint and its RPO consequence for user
     error.
3. **RTO/RPO targets** derived from the free-tier posture, with the proof that
   bounds each.
4. **Failure drill matrix**: D1 corruption, accidental R2 delete, partial
   restore, oversized export, provider outage, drill-rollback.
5. **Evidence artifacts** and the **local-vs-provider proof boundary** (what
   cannot be proven locally).
6. **Operator runbook**: drill cadence, pre-flight checks, rollback of the
   drill itself.

## Scope (out / non-goals)

- Implementing any code, script, route, migration, config, or runtime change.
- Enabling any Cloudflare **paid** add-on (D1 paid plan, R2 paid tier, Smart
  Placement paid, Workers Analytics paid, dedicated egress, etc.).
- Mutating provider state (no `--remote` execute/restore, no R2 put/delete
  against bound buckets, no deploys, no DNS/email changes).
- Touching the historical Supabase project `ebxxqidacheyapmmzavr`, the
  unrelated `archestimator` provider project, or other Cloudflare accounts.
- Cross-region DR, multi-cloud, paid backup products, or contractual SLAs.
- A redesign of the upload/R2 object-key scheme (out of scope; the pack
  consumes the existing `projects/{id}/…` key shape).
- Durable Object / Queue / Email restore (those are separate operational
  surfaces; this pack is D1 + R2 only, per the brief).

## Assumptions (labeled, with validation path)

| ID | Assumption | Strength | Validation |
|---|---|---|---|
| ASSUMP-01 | The project stays on **Workers Free** (D1 Time Travel 7-day retention; 5M rows-read/day; R2 10 GB-month + 1M Class A + 10M Class B). | repo evidence (`AGENTS.md` cost posture) | Re-read `AGENTS.md` cost posture before execution; re-check [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) + [R2 pricing](https://developers.cloudflare.com/r2/pricing/). |
| ASSUMP-02 | Pre-launch data volume is small enough that a full `wrangler d1 export` and a single-object R2 get/put fit comfortably in free-tier quotas. | derived (pre-launch) | Confirmed by absence of scale in `03_SOURCE_AND_CODEBASE_AUDIT.md`; re-confirm before any provider drill. |
| ASSUMP-03 | The `preview_database_id` `363c756a-…` is a usable **isolated** restore target for non-destructive D1 drills. | official docs (preview DB is for `wrangler dev`/Pages preview) | Validate with `wrangler d1 list` + a tiny `execute --remote` against the preview DB before relying on it (OPEN-01). |
| ASSUMP-04 | R2 has no native object versioning and `wrangler r2 object list` does not exist; inventory must use REST/S3/Worker API. | official docs (404 + open issue) | Re-check [R2 wrangler commands](https://developers.cloudflare.com/r2/reference/wrangler-commands/) and [R2 release notes](https://developers.cloudflare.com/r2/platform/release-notes/) before execution. |
| ASSUMP-05 | No `./migrations/` file after `0038` changes the R2 reconciliation columns `upload_assets(storage_bucket, storage_path, checksum_sha256, scan_status, status)` or `cost_library_item_variant_attachments(storage_bucket, storage_path, is_current_approved)`, so the reconciliation keys are stable. | repo evidence | `rg -n 'storage_bucket\|storage_path' migrations/ \| sort` before execution. |

## Constraints (binding)

- **Resource boundary**: only `ARCH_DB`, `ARCH_UPLOADS_R2`, and (for the drill
  only) an isolated staging/preview D1 DB inside the same account. Never
  `ebxxqidacheyapmmzavr`, never the `archestimator` provider project, never
  other accounts.
- **Cost posture**: free-tier/bundled only. Any paid enablement is OPEN-02 and
  requires explicit owner approval.
- **Git/shared-worktree**: no branch/worktree creation, no commits, no pushes.
  All writes confined to this plan folder.
- **Secret hygiene**: no env reads, no secret values in artifacts; redact
  tokens/account IDs to prefixes/hashes.
- **Local-only planning**: this pack does not call any Cloudflare API.

## Success metrics (for the *implementation* that follows, not this pack)

| Metric | Target | Proof |
|---|---|---|
| D1 restore drill pass rate | 100% of isolated-target drills: row counts match, checksums match, FK check clean, ≥1 authorization-denial assertion holds | drill output JSON (mirrors existing rehearsal report shape) |
| R2 inventory completeness | every live object in the physical bucket maps to a `(storage_bucket, storage_path)` row in `upload_assets` (non-deleted) or `cost_library_item_variant_attachments` (current-approved), with orphan/dangling reported | inventory reconciliation report |
| R2 restore round-trip | sampled object sha256/etag unchanged after get→put | restore drill report |
| RPO statement | D1 ≤ 7 days (free Time Travel); R2 ≈ 0 infra / undefined user-error | contract in `09_…` |
| RTO statement | drill-measured at current volume; target < 30 min for full export+reimport | measured in OPEN-01 drill |
| Free-tier budget | drill stays within 5M rows-read/day and 1M Class A ops/month | cost model in `20_…` |

## Failure metrics (anti-goals)

- Claiming hosted restore is proven from local-only SQLite rehearsal.
- Claiming R2 restore is proven without a real get→put round-trip.
- Enabling any paid add-on without owner approval.
- Running a destructive `time-travel restore` against the production
  `database_id`.
- Mutating any provider resource during this planning task.
