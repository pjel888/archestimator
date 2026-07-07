# 21 — Provider Parity Matrix

Maps each restore/recovery **need** to the Cloudflare D1/R2 capability that
satisfies it (free-tier), and flags where no native capability exists (gap).

## D1 parity

| Need | Native D1 capability (free-tier) | Status | Gap / action |
|---|---|---|---|
| Short-window point-in-time recovery | Time Travel: any minute within 7 days | **met** | none (OPEN-02 extends beyond 7d) |
| Long-term/ archival backup | Manual `wrangler d1 export` to `.sql` (full, no incremental) | **partial** | no automation (OPEN-02); no incremental |
| Non-destructive restore rehearsal | `export` → `execute --remote --file` into isolated DB | **met (procedure)** | needs the target-isolation tool (TASK-101) + provider drill (OPEN-01) |
| Destructive production restore | `time-travel restore` (in-place) | **met (capability)** | runbook-only, never drilled (DEC-03) |
| Restore into a different DB | No `--target` flag; export→reimport | **met (workaround)** | documented in `07_…` |
| Contractual RTO/RPO | Not published | **gap** | derived targets in `09_…`, not claimed as SLA |
| Schema-aware restore verification | App-level (row/checksum/FK/authz-denial) | **met (app-level)** | the rehearsal gates; no native D1 equivalent |

## R2 parity

R2 topology: **one physical bucket** (`archestimator-proof-uploads`) holding
objects across **two logical-bucket populations** —
`project-images`/`component-images` (tracked by `upload_assets`) and
`component-attachments` (tracked by both `upload_assets` and
`cost_library_item_variant_attachments`).

| Need | Native R2 capability (free-tier) | Status | Gap / action |
|---|---|---|---|
| Infra-failure durability | 11 nines (replication + erasure coding) | **met (design target)** | not a contractual SLA |
| Object versioning / undelete | **None** (docs 404) | **gap** | user-error RPO undefined; OPEN-03 (second bucket / app soft-delete) |
| Object lifecycle (retention/transition) | Lifecycle rules | **met** | not configured in `wrangler.jsonc`; out of scope |
| List objects (**both** logical buckets) | REST `/objects/list`, S3 `ListObjectsV2`, Worker `bucket.list()` (`wrangler r2 object list` absent) | **met (via API)** | needs inventory tool (TASK-201) covering both populations |
| Reconcile vs D1 | App-level diff on `(storage_bucket, storage_path)` across **both** tables | **met (app-level)** | needs TASK-202; de-dup for `component-attachments` in both tables |
| Download/export one object | `wrangler r2 object get --remote` | **met** | needs drill (TASK-301) |
| Restore/PUT one object | `wrangler r2 object put --remote` into **`_drill/`** preview key | **met** | needs drill (TASK-301); restore = put from saved copy (no versioning) |
| Bulk export | No batch API; S3 API / rclone / Worker loop | **partial** | not needed at current volume; OPEN-03 if needed |
| Cross-region replication | Not a native knob | **gap** | out of scope (single-region free-tier) |
| Contractual RTO/RPO | Not published | **gap** | derived in `09_…` |

## Cross-provider note (legacy)

This pack is **Cloudflare-only**. The historical Supabase project
`ebxxqidacheyapmmzavr` is **not** a restore target or comparison surface here
(per `AGENTS.md` resource boundary). Legacy provider exit/parity is handled by
the separate `2026-06-29-Cloudflare-Migration-Codex` and
`2026-07-07-provider-exit-final-proof-closure` packs.

## Summary

- D1 recovery needs are **met** by Time Travel + export/import + target
  isolation; the only gaps are automation (OPEN-02) and contractual RTO/RPO
  (derived).
- R2 recovery needs are **partially met**: infra durability is covered, but
  **user-error recovery is a real gap** (no versioning) — mitigated by the
  sampled-object drill and escalated via OPEN-03.
- No need requires a paid product at current volume.
