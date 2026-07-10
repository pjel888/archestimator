# Activity History Mapping — Comprehensive Audit And Plan Pack

Status tuple: `package_status=NOT_READY`, `implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

This is a **high-blast-radius** audit-and-plan pack for the activity history feature, which is a core MVP surface. It maps every code path, data table, UI component, event type, shared-link interaction, and test that constitutes "activity history" across the entire Archestimator codebase, then converts the audit findings into a prioritized implementation plan.

This pack is planning-only: it edits no application source, tests, migrations, config, or provider state. Implementation follows the `UNIT-*` DAG in `11_IMPLEMENTATION_PLAN.md`.

Canonical execution artifact: [`11_IMPLEMENTATION_PLAN.md`](11_IMPLEMENTATION_PLAN.md)

Machine-readable contract: [`plan-pack.json`](plan-pack.json)

## Mission

Activity history is one of Archestimator's main MVP features. It must record, display, and (where applicable) restore every meaningful change an estimator makes to an estimate — from a single row-item field edit, to area/group creation and deletion, to tab lifecycle events, to template and project-source inserts — and it must also capture and display everything a client does when they open a shared proposal link: viewing, commenting, approving, declining, and requesting revisions.

This pack answers three questions with evidence:

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
- This planning run edits no application source. Implementation follows the exact `UNIT-*` packets in a later session.
- No branch or worktree creation.

## Profile

`high-blast-radius` — activity history spans auth, data integrity, shared/public links, client collaboration, and is a launch-gate MVP feature. The audit touches the entire estimate mutation surface, the shared-link publication system, and cross-workspace authorization.

## Execution Shape

```text
UNIT-001 (event-type naming fix — data + composer + filters)
  -> UNIT-002 (bulk-delete restore fix)
  -> UNIT-003 (shared-link event-type alignment)
  -> UNIT-004 (idempotency and INSERT-shape consistency)
  -> UNIT-005 (gap test coverage — restore paths, error branches)
  -> UNIT-006 (UI hardening — copy, filters, restore gating)
  -> UNIT-007 (shared-link activity improvements — comments/decisions/replies)
  -> UNIT-008 (integration and hosted proof evaluation)
```

`UNIT-001` is the critical-path first unit because it fixes the naming split that makes most activity events invisible to users.

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
| `11_IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan and unit packets |
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

## Concurrent Agent Safety

Multiple AI agents may be working in this repository simultaneously. All agents must read [`12_COORDINATION_AND_MULTI_AGENT.md`](12_COORDINATION_AND_MULTI_AGENT.md) before any implementation work. File-scope ownership, serialized shared contracts, and the shared-worktree lease protocol are mandatory.
