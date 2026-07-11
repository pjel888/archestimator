# Activity History Mapping

Status tuple: `package_status=IMPLEMENTATION_READY`, `implementation_status=COMPLETE`, `release_status=READY`, `plan_lifecycle=ARCHIVE_READY`, `terminal_status=ACHIEVED`.

This **high-blast-radius** audit-and-plan pack maps the activity-history code,
data, UI, event, shared-link, and test surfaces, then converts the findings into
a prioritized implementation plan.

Implementation is verified. UNIT-001 through UNIT-006 and UNIT-008 through UNIT-012 have local evidence receipts. Execution follows the `UNIT-*` DAG in `11_IMPLEMENTATION_PLAN.md`.

Canonical execution artifact: [`11_IMPLEMENTATION_PLAN.md`](11_IMPLEMENTATION_PLAN.md)

Machine-readable contract: [`plan-pack.json`](plan-pack.json)

## Mission

Activity history is one of Archestimator's main MVP features. It must record, display, and (where applicable) restore every meaningful change an estimator makes to an estimate — from a single row-item field edit, to area/group creation and deletion, to tab lifecycle events, to template and project-source inserts — and it must also capture and display everything a client does when they open a shared proposal link: viewing, commenting, approving, declining, and requesting revisions.

Evidence answers three questions:

1. **What activity history facilities exist today?** — a complete, file:line-grounded map of every table, repository, write path, read path, UI surface, event type, and shared-link interaction.
2. **What is broken, incomplete, or missing?** — a prioritized gap analysis, including a critical event-type naming split that silently breaks filtering and copy rendering for most events.
3. **What must be done to make activity history MVP-ready?** — a dependency-ordered implementation DAG with exact paths, contracts, tests, and proof gates.

## Authority Order

1. `AGENTS.md` and the current planning-prompt suite (`Frontier-Planning-Kernel.md`, `Frontier-Applicability-Gates.md`, `Plan-Pack-Schema.md`).
2. `plan-pack.json` for IDs, statuses, hashes, and DAG truth.
3. `11_IMPLEMENTATION_PLAN.md` for execution packets and acceptance contracts.
4. Numbered documents for detailed analysis and audit context.

## Critical Finding (Read First)

**There is a systematic event-type naming split between the D1 write layer and the UI read/display layer.** The write layer (`src/lib/estimates/d1-action-client.ts`) emits `estimate_`-prefixed event types (`estimate_node_created`, `estimate_tab_created`, `estimate_row_inserted`...), while the UI filter list, activity composer, copy dictionary, and project-feed bucket map all expect non-prefixed names (`node_created`, `tab_created`, `row_added`...). The read path passes `event_type` through **unrenamed**. As a result:

- **23 of ~31 writable event types render as generic "recorded estimate activity"** (composer fallback) and are **unfilterable** in the activity history modal.
- **15+ UI filter/bucket options can never match any database row** — selecting them returns an empty list.
- **Bulk row deletion is unrestorable** — the UI restore guard keys off `rows_bulk_deleted` but the writer emits `rows_deleted`.

This is documented in full in [`04_EVENT_TAXONOMY_AND_NAMING_AUDIT.md`](04_EVENT_TAXONOMY_AND_NAMING_AUDIT.md) and is the highest-priority fix in the implementation plan.

## Scope

**In scope:**
- Complete audit of all activity-history data paths (tables, repositories, server actions, API routes).
- Complete audit of all activity-history UI surfaces (estimate-sheet modal, project activity page, shared-link feed, dashboard panel).
- Complete audit of the shared-link/client-collaboration interaction surface (comments, approvals, decisions, events).
- Complete event-type taxonomy with write→read cross-reference.
- Complete test-coverage map and gap analysis.
- Prioritized implementation plan for all identified defects and gaps.

**Out of scope (non-goals for this plan):**
- No visual redesign of activity surfaces (existing UX is the baseline).
- No revival of dormant named-version snapshots, compare, or version-restore features (prohibited by `VALIDATION_MATRIX.md:289` without a new approved slice).
- No undo/redo stack (explicitly a non-goal per the V1 expansion roadmap; audit-only here).
- No new paid Cloudflare services.
- No replacement of D1, TanStack Query, Zustand, React, or Next.js.
- No migration back to Supabase.
- No branch or worktree creation.

## Profile

`high-blast-radius` — activity history spans auth, data integrity, shared/public links, client collaboration, and is a launch-gate MVP feature. The audit touches the entire estimate mutation surface, the shared-link publication system, and cross-workspace authorization.

## Execution Shape

```text
UNIT-001 (event-type naming fix — data + composer + filters)
  ├──> UNIT-002 (bulk-delete restore fix)
  ├──> UNIT-003 (AI package-builder event-type alignment)
  └──> UNIT-004 (idempotency and INSERT-shape consistency)

UNIT-001 + UNIT-002 ──> UNIT-005 (tests-only gap coverage)
UNIT-001 + UNIT-004 + VERIFIED UNIT-005 ──> UNIT-006 (dead-filter/regression hardening)
UNIT-001 + UNIT-004 ──> UNIT-009 (variant/component propagation facts)
UNIT-006 ──> UNIT-010 (Activity-owned surface accessibility)
UNIT-004 ──> UNIT-011 (0060 indexes; verified)
UNIT-004 ──> UNIT-012 (tenant isolation, lifecycle, durable writes; verified)

UNIT-003 + UNIT-005 + UNIT-006 + UNIT-009 + UNIT-010 + UNIT-011 + UNIT-012
  ──> UNIT-008 (integrated verification; verified)
```

`UNIT-010` is VERIFIED. Activity consumed its current durable allocations for
`migrations/0060_activity_history_indexes.sql` and
`migrations/0065_activity_history_lifecycle.sql`; subsequent Program generation
11 reissued only the remaining owners. UNIT-011 and UNIT-012 have full local
receipts, and UNIT-008 records the integrated verification. `UNIT-007` is
superseded because Publisher owns public comment/decision mutation and UI.
Activity consumes that surface through an append-only event contract and never
deletes audit history.

## Pack Index

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Versioned manifest, hashes, reciprocal traceability, DAG, ready slice, exact next unit |
| `11_IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan and unit packets |
| `README.md` | This entrypoint |
| `01_EXECUTIVE_SUMMARY.md` | Verdict, strengths, critical gaps, recommended priorities |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Feature definition, users, core workflows, scope boundaries |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Complete source inventory with file:line references across all layers |
| `04_EVENT_TAXONOMY_AND_NAMING_AUDIT.md` | The critical naming split, complete writable→readable event-type matrix |
| `05_DATA_LAYER_AND_REPOSITORY_MAP.md` | D1 tables, indexes, repositories, read/write paths, idempotency |
| `06_UI_COMPONENT_SURFACE_MAP.md` | All activity UI surfaces: estimate-sheet modal, project page, shared-link feed, dashboard |
| `07_SHARED_LINK_AND_CLIENT_COLLABORATION.md` | Share link creation, client access, comments, approvals, decisions, activity recording |
| `08_TEST_COVERAGE_AND_GAPS.md` | Test inventory and coverage gap analysis |
| `09_REQUIREMENTS_AND_TRACEABILITY.md` | Requirements derived from audit findings |
| `10_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md` | Resolved decisions, risk register, authorization boundaries |
| `12_COORDINATION_AND_MULTI_AGENT.md` | Shared-worktree rules, file ownership, conflict avoidance |
| `13_VARIANT_AND_COMPONENT_ACTIVITY.md` | Deep audit of variant/component activity recording gaps (memory concern) |
| `14_ACCESSIBILITY_AUDIT.md` | GATE-UX-01 accessibility audit of all activity surfaces |
| `15_PERFORMANCE_AND_QUERY_AUDIT.md` | GATE-PERF-01 index, query, and rendering performance analysis |
| `16_COMPLIANCE_AND_DATA_LIFECYCLE.md` | DPA/NPC compliance, actor lifecycle, isolation, tamper-evidence, export |
| `LOOP_LEDGER.md` | Durable task-local planning loop and evidence log |
| `evidence/2026-07-10-audit-evidence.md` | Audit provenance and source-freshness evidence |

## Validation

The pack is complete only when both commands pass on the frozen final artifact set:

```bash
bun run validate:planning-prompts
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Activity-History-Mapping
```

Planning readiness does not prove implementation or hosted release. Every
applicable unmet criterion and the integrated verification gate remain `FAIL`
until their named tests and evidence receipts pass.

## Concurrent Agent Safety

Multiple AI agents may be working in this repository simultaneously. All agents must read [`12_COORDINATION_AND_MULTI_AGENT.md`](12_COORDINATION_AND_MULTI_AGENT.md) before any implementation work. File-scope ownership, serialized shared contracts, and the shared-worktree lease protocol are mandatory.
