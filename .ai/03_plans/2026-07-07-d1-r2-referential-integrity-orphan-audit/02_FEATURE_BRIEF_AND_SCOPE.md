# 02 — Feature Brief and Scope

## Source brief

From `PROMPT.md` (the authoritative FEATURE BRIEF for this pack):

> Create a plan pack for proving there are no silent data or object orphans across D1 records, R2 upload objects, projects, estimates, shares, comments, proposals, and audit-like tables.

Required plan pack content (PROMPT.md §"Required Plan Pack"):

> List every ownership relationship, expected deletion/retention behavior, orphan SQL/object checks, repair policy, safe reporting format, CI/operator cadence, and interaction with retention/DSAR workflows.

Constraints (PROMPT.md §"Constraints"):

> No destructive cleanup should be planned without a dry-run, evidence output, and owner-review gate. Keep secrets and object contents out of evidence files.

Stop condition (PROMPT.md §"Stop Condition"):

> The pack gives an executor a precise audit and remediation path for cross-store referential integrity before production use.

Mode (PROMPT.md header):

> Mode: planning only. Create the plan pack in this folder; do not change application code.

## In-scope

1. **All 38 active D1 migrations** in `migrations/` (0001–0038). Legacy `supabase/migrations/` (182 files) are explicitly out of scope as active schema; they are referenced only where a migration's archaeology explains current D1 shape.
2. **All R2 upload-object storage** through binding `ARCH_UPLOADS_R2`, including the three logical buckets (`project-images`, `component-images`, `component-attachments`) which are prefixes inside the single physical bucket.
3. **All D1 tables that store R2 object keys**: `upload_sessions`, `upload_assets`, `cost_library_item_variant_attachments`, and the `cost_library_items.thumbnail_path` column.
4. **All production deletion/lifecycle paths**: project delete, estimate delete, component archive, publication create/revoke/replace, collaborator removal, retention cron, DSAR intake, mass-deletion events, upload cleanup cron.
5. **The interaction with retention** (`migrations/0034_data_retention_events.sql`, `src/lib/compliance/retention-core.ts`) **and DSAR** (`migrations/0033_privacy_request_register.sql`, `src/lib/compliance/privacy-request-repository.ts`) workflows — specifically how an orphan audit must avoid clobbering legally-held retention rows and how DSAR erasure (when implemented) must propagate to R2.
6. **The audit capability itself**: detection queries, R2 reconciliation, dry-run mode, safe reporting format, repair gates, CI/operator cadence.

## Out of scope (explicitly)

- **Executing the audit against production data** — planning only.
- **Mutating D1, R2, migrations, application code, or provider state** — planning only.
- **Designing a workspace/user hard-delete feature.** No production path deletes workspaces or Better Auth `user`/`account`/`session`/`verification` rows today. Full DSAR erasure closure depends on that feature, which is a separate, larger effort. This pack calls it out as a blocker (OPEN-DEC-002) and scopes the audit to *detect* the resulting orphans, not to *build* the delete feature.
- **Cloudflare Images (`IMAGES` binding) as an object store.** Confirmed by source audit: `IMAGES` is used only as an image-transform pipeline (`src/lib/uploads/server-image-processing.ts:109–117`); the transformed WebP bytes are written to **R2**. There is no `IMAGES` delete path and no separate object namespace. Out of scope for orphan scanning.
- **Durable Object `COLLAB_ROOMS` room state.** The DO is SQLite-backed and room-local; it is not part of the D1↔R2 referential graph. Listed in blast radius as explicitly unaffected.
- **Re-litigating the Supabase→Cloudflare migration.** Complete. Legacy project `ebxxqidacheyapmmzavr` is referenced only as historical evidence.
- **Building a new reusable skill.** No genuine capability gap requires one; the plan reuses existing `node:sqlite` test patterns, `FakeR2Bucket` shape, and the `recordRetentionEventInD1` audit writer.

## Stakeholders

- **Philip (owner):** approves repair gates, FK-enforcement policy (OPEN-DEC-001), R2 `list()` cost approval, and any production repair run.
- **Executor (future implementation AI):** builds the audit tooling per `11_IMPLEMENTATION_PLAN.md`, runs dry-runs, produces evidence.
- **Operators:** run the audit on cadence, triage non-zero findings, gate repairs.

## Success metrics (for the audit capability, once built)

- Dry-run audit completes against preview D1+R2 in ≤ 60s and emits a redacted report.
- Orphan detection has **zero false negatives** for the four P0 classes (publication cluster, upload D1↔R2 drift, AI audit chain, transitive-cascade reliance) under a seeded-fixture test.
- Dry-run reports **zero raw secrets, zero raw R2 object contents, zero private keys** (redaction verified by a dedicated test).
- Repair runs are impossible without `--confirm` and produce a before/after count diff.

## Failure metrics (what would make the audit capability a failure)

- A destructive repair runs without a prior successful dry-run.
- Orphan evidence leaks raw object bytes or secrets.
- The audit itself causes a write to D1 or a delete from R2 (must be strictly read-only in detection mode).
- A P0 orphan class is missed by the detector (false negative in seeded test).

## Assumptions (validated where possible)

- ASSUMP-001: D1 batches via `database.batch()` are atomic (single implicit transaction, rollback on any statement failure). **Validated**: `src/lib/projects/actions.ts:294` uses `database.batch()`; D1 documents batched statements as a single transaction. → The in-batch orphan risk (O-1) only materializes if FK enforcement is off, not from mid-batch partial commit.
- ASSUMP-002: The Worker does not issue `PRAGMA foreign_keys = ON` per connection. **Validated**: `rg "foreign_keys|PRAGMA" src/ migrations/` returns empty.
- ASSUMP-003: No production code path deletes a workspace or a Better Auth user. **Validated**: `rg "DELETE FROM workspaces|DELETE FROM \"user\"|deleteWorkspace"` finds only proof/test routers.
- ASSUMP-004: `IMAGES` binding is transform-only, not an object store. **Validated**: only `processUploadImageWithCloudflareImages` reads it; no `IMAGES` delete call exists.
- ASSUMP-005: The scheduled upload-cleanup cron runs daily at `0 3 * * *` and the scan cron at `15 3 * * *`, with retention at `30 3 * * *`. **Validated**: `wrangler.jsonc:59–64` and `worker.ts:109–115`.
- ASSUMP-006: R2 `list()` is metered (Class B operations) and therefore the reconciliation scan must be bounded and scheduled. **Validated** by Cloudflare pricing model; cost worksheet in `20`.

## Open decisions (detailed in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- OPEN-DEC-001: Should the Worker enable `PRAGMA foreign_keys = ON` per connection (Track B), or should the codebase rely solely on defense-in-depth explicit deletes (Track A)? **Recommendation: both, with Track A as the correctness floor and Track B as a provable safety net.** Owner decision required because enabling FKs can surface pre-existing violations as hard errors.
- OPEN-DEC-002: When/how to implement workspace/user hard-delete to close the DSAR erasure loop. **Out of scope for this pack; flagged as a dependency for full DSAR closure.**
- OPEN-DEC-003: Whether to implement the declared-but-empty `uploads_orphaned` and `sessions_expired` retention classes as part of this work or separately. **Recommendation: implement `uploads_orphaned` here (it is the audit's natural output); defer `sessions_expired` to the Better Auth lifecycle work.**
