# 01 — Executive Summary

Plan: D1/R2 Referential Integrity Orphan Audit
Status: `CONDITIONALLY READY` (verification_mode: `emulated` → readiness cap 97; high-blast-radius remediation slices gated on OPEN-DEC-001 and an independent reviewer)
Date: 2026-07-07

## What this plan is

A **planning-only** package that designs a read-only-first, dry-run-first, owner-gated orphan-audit and remediation capability for cross-store referential integrity across:

- **D1 records** (all 69 tables across 38 active migrations in `migrations/`).
- **R2 upload objects** in binding `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`).
- The cross-store linkage between them (upload metadata rows ↔ R2 object keys).

It is **not** the execution of the audit against production data, and it does not mutate D1, R2, migrations, or application code.

## Why now

Archestimator is pre-launch closed-beta. The codebase has accumulated a multi-layer integrity model — declared `ON DELETE CASCADE / SET NULL` foreign keys in 22 migrations, application-enforced deletion batches (e.g. `src/lib/projects/actions.ts:538–757`), a scheduled upload-cleanup cron, a retention cron, and a DSAR intake register — but no single instrument proves these layers stay consistent. Before first users, the project needs a way to detect and safely repair silent orphans (D1 rows pointing at deleted parents, R2 objects whose owning D1 row is gone, and cross-store drift after partial failure).

## The headline finding (P0)

**Foreign-key enforcement is unverified at runtime.** A repo-wide search for `PRAGMA foreign_keys` in `src/` and `migrations/` returns zero hits. SQLite/D1 defaults FK enforcement **off** unless the driver sets the pragma on each connection. Therefore every declared `ON DELETE CASCADE / SET NULL` is, at best, unverified — and any code path that relies on transitive cascade (rather than explicit deletes) is a real orphan risk if enforcement is off.

Two consequences dominate:

1. The **entire 0014 publication/shared-link cluster (7 tables)** has **zero `REFERENCES` clauses at all** — `project_publications`, `project_publication_events`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `publication_digest_log`. Integrity is enforced only by the application's project-delete batch (`src/lib/projects/actions.ts:602–622`). Any other deletion or partial failure orphans all of them.
2. Project delete relies on **transitive cascade** for `estimate_sheet_events` and `estimate_sheet_adjustments` (it does not delete them explicitly, unlike the estimate-delete path at `src/lib/estimates/d1-action-client.ts:1885–1886`). If FK enforcement is off, these become orphans.

## The cross-store drift finding (P0)

The R2 object lifecycle and the D1 upload-metadata lifecycle desync in multiple production paths:

- **User-initiated DELETE routes** (`src/app/api/projects/images/route.ts:512`, `src/app/api/component-library/images/route.ts:317`, `src/app/api/component-library/attachments/route.ts:527`) remove R2 objects but **never update the D1 `upload_assets`/`upload_sessions` rows**. The rows keep claiming a live object.
- **Bulk project delete** (`src/lib/projects/actions.ts:710`) sets `upload_assets.project_id = NULL` and deletes `upload_sessions` rows, but the corresponding R2 project-image object is removed in a **separate, non-atomic** phase (`actions.ts:951`). A failure between the two leaves R2 orphans or D1 ghost rows.
- **The scheduled cleanup job** (`src/lib/uploads/cleanup-job.ts:279`) only processes rows already marked `status='deleted'`, but **no production code path ever sets that status** on a finalized asset. So the cleanup job currently finds nothing, and finalized-but-orphaned assets are never reclaimed.
- **Workspace cascade** (`upload_sessions.workspace_id` / `upload_assets.workspace_id ON DELETE CASCADE`) would hard-delete all upload metadata with **no R2 cleanup hook** — a full R2 leak. (Mitigated today only because no production path deletes workspaces.)

## What the plan delivers

1. **A full ownership-relationship inventory** (see `03_SOURCE_AND_CODEBASE_AUDIT.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`) — 69 tables, the ownership edge list, the R2-key storage map, and the retention/DSAR surface.
2. **A canonical orphan taxonomy** (see `04_REQUIREMENTS_SPECIFICATION.md` §taxonomy and `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`) with four classes: D1-row-without-parent, R2-object-without-D1-row, D1-row-referencing-deleted-R2-object, cross-store-drift-after-partial-failure.
3. **A dry-run-first detection design** — SQL orphan checks (`LEFT JOIN … WHERE parent.id IS NULL`, `PRAGMA foreign_key_check`) plus R2-key reconciliation via `R2.list()`, emitting redacted evidence (counts, key prefixes, hashes — never raw object contents or private keys).
4. **A repair policy** gated behind dry-run + evidence + owner review (matches PROMPT.md constraint: "No destructive cleanup should be planned without a dry-run, evidence output, and owner-review gate").
5. **A CI/operator cadence** (dry-run on preview after each migration apply; full audit weekly on prod; alerting on non-zero orphan counts for P0 classes).
6. **A two-track remediation design for the FK gap**: (Track A) defense-in-depth explicit deletes in application batches so correctness does not depend on FK enforcement; (Track B) enable `PRAGMA foreign_keys = ON` and prove it via a cascade-behavior test, pending OPEN-DEC-001.

## Cost posture

Stays on free-tier/bundled Cloudflare limits (per AGENTS.md cost posture). The R2 `list()` reconciliation is the only new metered surface; the plan designs it as bounded, paginated, and scheduled off-peak, and includes a cost-input worksheet (`20_COST_MODEL_AND_PRICING_INPUTS.md`) so the owner can approve before the first billed scan.

## Readiness

- The **audit/detection tooling** slices are internally complete and implementation-ready in design.
- The **remediation slices** (especially Track B FK-enablement and any repair that mutates D1/R2) are `CONDITIONALLY READY`: they depend on OPEN-DEC-001 (FK enforcement policy) and on a real independent reviewer signing off the package, because verification_mode is `emulated`.

See `17_FINAL_READINESS_REVIEW.md` for the requirement-by-requirement audit and scores.

## What did NOT change

No application code, tests, migrations, schemas, infrastructure, configuration, or Git state was modified. Only files inside this plan folder were created.
