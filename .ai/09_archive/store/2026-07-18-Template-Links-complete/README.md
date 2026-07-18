# Linked Estimate Template Instances

**Package ID:** `PLAN-2026-07-18-template-links`  
**Posture:** `IMPLEMENTATION_COMPLETE`; archive-ready local implementation  
**Execution ceiling:** local repository implementation only  
**Release status:** not evaluated; deployment and hosted mutation are excluded  
**Canonical execution artifact:** `00-PLAN.md`  
**Exact next unit:** none  
**Automated test authorization:** granted for focused implementation tests; 64 tests passed

## Target Outcome

An Estimate Template becomes a versioned master that can be inserted into multiple Estimate Sheets as durable linked instances. A linked instance remains materialized in `estimate_nodes` and `estimate_row_items`, so normal Estimate Sheet reads, calculations, history, publication, and export keep their current fast path. Confirmed master-owned changes propagate to every active instance. A user can detach an entire instance to keep its current materialized content and stop all future propagation.

The selected design is **versioned materialization with a durable D1 propagation job**:

1. a shared mutation updates the master, writes an immutable Template version, advances every active instance target version, and upserts one propagation job per instance in one guarded D1 transaction;
2. the request immediately drains the initiating instance and a bounded number of additional jobs;
3. the existing `*/5 * * * *` Worker schedule resumes any remaining or expired jobs; and
4. every individual instance is reconciled atomically and idempotently to an immutable target version.

No new Cloudflare Queue, binding, paid service, feature flag, compatibility layer, or live read-through architecture is part of the MVP.

## Implementation Result

| Before | Implemented result |
| --- | --- |
| Inserting a Template creates an independent snapshot copy. | The primary insert mode creates a durable linked instance; `Insert copy` remains explicit. |
| Estimate nodes and rows retain no canonical Template-instance identity. | Stable instance, node-map, and row-map records connect materialized Estimate data to one master. |
| Template edits stop at Template tables. | Confirmed structural/content edits create a new master version and converge every active instance. |
| A row/component can be added inside a copied branch without warning. | Master-owned actions first show affected instance/project/estimate counts and require confirmation. |
| Component linkage has visual semantics; Template linkage does not. | Every linked branch carries a virtualization-safe rail, badge, source name, version state, and recovery status. |
| Deleting a Template has no downstream relationship to inspect. | Archive is non-destructive; permanent delete requires detaching active instances and never deletes Estimate content. |
| Large fan-out would need one oversized request or a new queue. | D1 target jobs provide immediate progress plus bounded cron recovery with no new provider resource. |

## Product Decisions

- `DEC-AUTO-001` — Keep Estimate data materialized; reject live read-through.
- `DEC-AUTO-002` — Only whole-Template insertion creates a linked instance in the MVP. Whole/subtree copy paths remain available and independent.
- `DEC-AUTO-003` — While linked, Template structure/content is master-owned; quantities and takeoff adjustments are instance-owned.
- `DEC-AUTO-004` — Use a D1 propagation job, immediate bounded drain, and the existing five-minute schedule. Do not add or repurpose a Queue.
- `DEC-AUTO-005` — Do not infer links for historical copies. Linking starts with new linked insertions.
- `DEC-AUTO-006` — Detach is whole-instance, one-way in the MVP. Partial detach and relink are excluded.
- `DEC-AUTO-007` — Component Library linkage remains independently authoritative for component fields and versions.
- `DEC-AUTO-008` — Master permanent delete detaches active instances first and preserves their Estimate content.
- `DEC-AUTO-009` — Propagation is per-instance atomic and eventually convergent; stale, updating, and failed states are visible.
- `DEC-AUTO-010` — Nested linked Templates and AI package-builder links are excluded; those paths remain snapshot copies.
- `DEC-AUTO-011` — Linked styling uses stable branch-level scalar state and fixed geometry so virtualization and memoization remain intact.
- `DEC-AUTO-012` — The user authorized focused implementation tests; the scoped 64-test Vitest suite passed.
- `DEC-AUTO-013` — Bulk commands have one field owner and at most one Template master; mixed/multi-master mutations fail before optimistic state, and shared commits never enter local Undo.
- `DEC-AUTO-014` — Propagated topology is server-authoritative; a deleted dirty row leaves the graph immediately while a bounded session draft remains recoverable.
- `DEC-AUTO-015` — Every insertion entry point declares linked versus copy behavior; empty Templates and legacy tabless targets cannot create ambiguous/invisible links and receive explicit copy fallbacks.
- `DEC-AUTO-016` — Multi-root instances use one deterministic visual owner and one sheet announcer; the Template Editor persistently owns global propagation progress/failure.
- `DEC-AUTO-017` — Detach works from current/updating/failed without replaying a pending edit; archive/restore is discoverable and detach-all permanent delete is one atomic transaction.
- `DEC-AUTO-018` — D1 owns the normalized payload for one pending Template intent; post-submit disconnects resolve by receipt-first intent-ID replay into committed, definitely not applied, or still unknown.
- `DEC-AUTO-019` — Progress and instance failures use one retryable/terminal taxonomy; query failure is separate, and bulk retry can target only server-eligible retryable instances.

## Scope

### Included

- master Template versioning and immutable flat graph snapshots;
- linked instance identity plus stable master-node and master-row mappings;
- new linked insertion, explicit copy insertion, and historical-copy behavior;
- shared mutation impact preview, confirmation, stale fingerprint rejection, receipt-first unknown-outcome resolution, and authoritative results;
- add, rename, move, reorder, update, and delete semantics for nodes and rows;
- zero/one/many confirmation, mixed/bulk ownership, shared Undo exclusion, dirty-row draft recovery, and action-specific stale reconfirmation;
- instance-local quantity/takeoff edits;
- whole-instance detach, retry, delete, duplicate, Template archive, and permanent delete semantics;
- Component Library source precedence inside linked Templates;
- D1 migration, indices, transactional boundaries, job lease/retry/dead taxonomy, existing cron integration, history, and publication revisions;
- Estimate read projection, Template-level propagation status, TanStack Query convergence, React render isolation, accessibility, multi-root ownership, compact behavior, focus/scroll recovery, and virtualization-safe styling;
- performance budgets, failure simulations, traceability, and implementation evidence requirements.

### Excluded

- automatic linkage of previously inserted copies;
- partial row/node detach or relink;
- linked Template subtree insertion;
- nested linked Template composition or graph cycles;
- converting AI package-builder provenance into live linkage;
- a new Cloudflare Queue or any repurposing of upload/Client Portal queues;
- deployment, remote migration apply, hosted proof, or production mutation;
- unrelated Template redesign or broad Estimate Sheet refactoring.

## Canonical Reading Order

1. `README.md` — objective, selected route, scope, and forecast.
2. `00-PLAN.md` — canonical execution sequence, units, gates, and stop condition.
3. `01-ARCHITECTURE-AND-D1.md` — current evidence, alternatives, schema, transactions, jobs, and recovery.
4. `02-PRODUCT-CRUD-UX-AND-PERFORMANCE.md` — ownership, user flows, CRUD behavior, React integration, and performance.
5. `03-IMPLEMENTATION-UNITS-AND-TRACEABILITY.md` — exact file scopes, acceptance criteria, risks, and requirement mapping.
6. `LOOP_LEDGER.md` — append-only planning/review continuity.
7. `plan-pack.json` — machine-checkable package state and traceability.

## Evidence Boundary

The pack is grounded in current source and migrations, including `migrations/0024_estimate_templates.sql`, `migrations/0081_estimate_mutation_receipts.sql`, `migrations/0082_estimate_row_integrity_constraints.sql`, `src/lib/estimates/d1-intents/templates.ts`, `src/lib/component-library/component-mutation-d1.ts`, `src/lib/component-library/template-editor-actions.ts`, `src/lib/estimates/estimate-tree-read-repository.ts`, `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx`, `worker.ts`, and `wrangler.jsonc`.

GitNexus reported low upstream risk for the public Template creation symbol, but several internal lookups were partial. The pack therefore treats direct source tracing—not incomplete graph coverage—as the decisive blast-radius evidence.

Cloudflare platform assumptions were checked against the current official D1 limits, D1 batch, and Queues delivery documentation. Links and dated constraints are recorded in `01-ARCHITECTURE-AND-D1.md`.

## Start And Finish

Implementation completed `UNIT-001` through `UNIT-008`. `GATE-DATA-001`, `GATE-UX-001`, and `GATE-VERIFY-001` pass with the additive migration, linked insertion and propagation paths, lifecycle and recovery UX, focused Vitest coverage, type-check, scoped lint, migration-chain apply, and diff checks. Deployment, remote migration apply, hosted proof, and browser automation remain outside the local implementation ceiling; release status remains `NOT_EVALUATED`.
