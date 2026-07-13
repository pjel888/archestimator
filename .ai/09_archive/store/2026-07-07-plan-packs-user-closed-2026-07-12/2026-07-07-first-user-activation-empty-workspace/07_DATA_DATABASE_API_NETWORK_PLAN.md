# 07 — Data, Database, API, and Network Plan

## 7.1 Provider/resource boundary (from `wrangler.jsonc` + standing mandate)

- D1 `ARCH_DB` (`archestimator-proof-db`) is the active data store. All new tables/migrations go in `./migrations/`.
- R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES` are not touched by activation.
- No Supabase/Vercel/Resend mutation. Legacy `supabase/migrations/*` and `data/local/seed.json` are out of scope.

## 7.2 Database change blueprint — `workspace_activation_milestones`

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | TEXT PK | FK→`workspaces(id) ON DELETE CASCADE`. One row per workspace. |
| `first_project_created_at` | INTEGER (unix ms) | Nullable; idempotent stamp. |
| `first_estimate_created_at` | INTEGER | Nullable. |
| `first_area_created_at` | INTEGER | Nullable. |
| `first_template_inserted_at` | INTEGER | Nullable. |
| `first_line_item_created_at` | INTEGER | Nullable. |
| `first_publication_created_at` | INTEGER | Nullable; terminal rung. |
| `welcome_dismissed_at` | INTEGER | Nullable. |
| `sample_opted_in_at` | INTEGER | Nullable; only used if OPEN-DEC-01 accepted. |
| `created_at` | INTEGER DEFAULT (unix ms) | |
| `updated_at` | INTEGER DEFAULT (unix ms) | Updated on any stamp. |

- **Migration filename:** `0039_workspace_activation_milestones.sql` (next after `0038_component_draft_resource_limits.sql`).
- **Backfill:** none — rows are lazily seeded by `ensureDefaultWorkspace`. Existing workspaces get a row on first dashboard load (upsert) or on first milestone write.
- **Index:** PK on `workspace_id` is sufficient (single-row reads/writes by workspace).
- **Concurrency/idempotency:** all milestone stamps use `INSERT INTO … ON CONFLICT(workspace_id) DO UPDATE SET <col>=COALESCE(<col>, excluded.<col>), updated_at=excluded.updated_at` so the first writer wins each column and concurrent writers cannot duplicate rows or overwrite an existing timestamp. This is the DATA-002 contract. To support the `milestone_first` event flag, `markMilestone` must report whether **this call** was the winner: prefer a `RETURNING <col>` clause and compare the returned value to the incoming timestamp (equal → winner); if the driver lacks `RETURNING`, fall back to a single-column PK read before the upsert. COALESCE guarantees one surviving timestamp; at worst two concurrent winners both emit `milestone_first=true`, deduped downstream by `(workspace_id, event_type, milestone_first=true)` keeping the earliest `ts`. See `11_…` T0.2.
- **Rollback:** `DROP TABLE workspace_activation_milestones;` — no user-visible data loss (pure metadata). Safe fix-forward.
- **Expected query cost:** one single-row read folded into the homebase `Promise.all` wave (PERF-001). One single-row upsert per rung mutation. Negligible D1 cost.
- **Cardinality:** 1 row per workspace. At 1×/10×/100×/1000× workspace counts this remains one row per workspace — no scan risk.
- **Generated types:** if Worker `Env` bindings change (they do not here), run `bun run cf:typegen`. Not required for this table.
- **EXPLAIN/proof:** single-row PK lookup — trivially indexed; documented EXPLAIN deferred as not informative for a PK point lookup.
- **Local proof command:** `bunx vitest run tests/vitest/<new-milestone-repo-test> --maxWorkers=1` + `bun run cf:d1-restore-rehearsal` unchanged.

## 7.3 Access-path matrix

| Source | Chosen API/repository | Runtime role | Authorization check | Latest schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Milestones read (homebase) | `getMilestones(workspaceId)` in `src/lib/activation/milestones.ts`, called as a 7th parallel arm inside `getWorkshopHomebaseDataAppPath()` (`workspace-repository.ts:2129`, the **active** app path; the RPC path at L2125 is disabled) | Authenticated workspace member | Existing homebase workspace-membership authz (same as projects/favorites read) | New table `0039` | `workshop-homebase-app-path-activation.test.ts` | If null/missing → `activationMilestones=null`, `firstRun=(projects.length===0)`; no throw |
| Milestone stamp (rung N) | `markMilestone(workspaceId, col)` called inline from each Server Action | Authenticated workspace member with create/edit | Existing action authz (e.g., `canEditWorkspaceContentRole` for project/estimate create) | New table `0039` | Repository unit + concurrency test | Emit + log on D1 error; never fail the parent action |
| Activation event emit | `emitActivationEvent(payload)` in `src/lib/activation/events.ts` | Server-only, called inline | Inherits caller authz | n/a (logs only) | Telemetry schema unit test | Caught + logged; never thrown |

## 7.4 API / network behavior

- **No new public API route.** Activation is server-side inline hooks into existing Server Actions + the active homebase app path.
- **Homebase payload contract:** `activationMilestones: ActivationMilestones | null` and derived `firstRun: boolean` are **additive optional** fields on `WorkshopHomebaseData` (`workspace-repository.ts:296`), populated by `getWorkshopHomebaseDataAppPath()` (L2129). The **disabled** RPC path (`getWorkshopHomebaseDataRpcPath`, L2125) and the legacy `supabase/migrations/20260618184856_workspace_homebase_summary.sql` are out of scope. `workshop-homebase-summary-rpc-contract.test.ts` (which guards the disabled-RPC parser) is **left unchanged** — it does not own the app-path payload; a new `workshop-homebase-app-path-activation.test.ts` proves the additive fields.
- **Idempotency:** milestone writes are intrinsically idempotent (COALESCE). Activation events are **not** idempotent by themselves (each emits), but `milestone_first=true|false` distinguishes the first occurrence so downstream aggregation dedupes by `(workspace_id, event_type, milestone_first=true)`.
- **Retries/timeouts:** emits are synchronous fire-and-log within the action's existing transaction boundary; no retry loop (logs are best-effort). Milestone writes are single-statement upserts.
- **Rate limits:** none added. The activation path reuses existing rate limits (e.g., `checkProposalExportRateLimit` on the terminal rung's export).
- **Pagination:** n/a (single-row reads).
- **Versioning/back-compat:** additive only; old clients that ignore the new fields still work.

## 7.5 Shadow-path coverage summary

Full shadow-path matrices for the three behavior-bearing flows (post-login landing, create-first-project, first-publish) are in `04_REQUIREMENTS_SPECIFICATION.md` §shadow. The adversarial matrix (hostile/edge) is in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

## 7.6 Data integrity, retention, recovery

- **Ownership:** each milestone row is owned by its workspace; cascade-deletes with the workspace.
- **Retention:** milestones live for the workspace's lifetime. No TTL.
- **Deletion:** no explicit delete UI; workspace deletion cascades.
- **Audit:** activation events flow to the observability log (existing redaction in `src/lib/observability/redact`). No separate audit table for closed beta.
- **Recovery:** daily D1 backups cover the table. `cf:d1-restore-rehearsal` path is unchanged.
- **Verification:** post-migration readback: `SELECT COUNT(*) FROM workspace_activation_milestones;` returns row count; sample workspace row matches the seeded/first-stamp expectation.

## 7.7 Idempotency and partial-failure behavior

- If a Server Action succeeds at its core mutation (e.g., project inserted) but the milestone upsert fails, the action **must still succeed** for the user. The milestone is reconciled on the next mutation of that rung (or on a subsequent dashboard load via a lazy backfill). This is the fail-safe rule: **activation metadata never blocks core estimating flow.**
- Reconciliation strategy: a lightweight `ensureMilestonesWorkspaceRow(workspaceId)` runs inside the homebase read path; if a workspace has rows in `projects`/`estimates`/etc. but a null milestone column, the read path backfills the timestamp from the earliest `created_at` of the corresponding table. This self-heals partial-failure gaps without a separate backfill migration. (Implementation note: keep this best-effort and logged.)
