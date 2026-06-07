# Archives Feature Implementation Plan (Refined)

**Date:** 2026-06-07 (refined 2026-06-07)
**Plan folder:** `.ai/03_plans/2026-06-07-archives-feature/`
**Status:** REFINED — NOT IMPLEMENTED
**Branch:** `plan/archive-feature`

> ⚠️ This is a refined planning package. The archives feature is **NOT** implemented. No source code, migrations, or provider settings have been modified.

## Refined Goal

A multi-entity Archives Feature covering **projects, estimate sheets, cost-library components, and estimate templates**. Each entity archives in-place within its domain route. A future retained-recipient/paid-client access layer is planned architecturally but NOT implemented in V1.

**Before refinement:** Project-only plan, 66/100. **After refinement:** Multi-entity plan, targeting 96+/100.

## Phase Breakdown

| Phase | Entity | Status | What |
|-------|--------|--------|------|
| 1 | Projects | Implementation-ready | `archived_at`/`archived_by` on projects, archive/restore RPCs, tab UI, route guards, homebase/collaboration/publication |
| 2 | Estimate Sheets | Implementation-ready | `archived_at`/`archived_by` on estimates, archive/restore RPCs, status filter UI, editor/charts/export/AI exclusion |
| 3 | Components | Implementation-ready | Archived view + Restore using existing `lifecycle_state = 'archived'`, restore RPCs, library UI |
| 4 | Templates | Implementation-ready | `archived_at`/`archived_by` on estimate_templates, archive/restore RPCs, status filter, insertion filter |
| 5 | Recipient Retention | **Planning only** | Conceptual architecture for paid-client retained access, snapshot/entitlement model |
| (Future) | Global Archive Center | Deferred | Optional `/workshop/archives` unified route |

## Scope

- **MUST (V1):** Projects (Phase 1), Estimate Sheets (Phase 2), Components archived view + restore (Phase 3), Templates (Phase 4)
- **COULD (V1):** Cross-entity archive navigation
- **OUT OF SCOPE (V1):** Paid-client implementation (Phase 5 is planning only), global `/workshop/archives` route

## Explicit Non-Goals

- Do NOT create a global archive center in V1
- Do NOT implement paid-client/subscriber retention now
- Do NOT add duplicate archive columns to components (use existing lifecycle_state)
- Do NOT modify project deletion flow
- Do NOT touch SlateCamp or non-Archestimator Supabase resources
- Do NOT modify production source code during planning

## Architecture Summary

**Strategy:** In-place archives per domain — each entity manages its own archive state within its existing route surface.

| Entity | Archive Mechanism | Auth Gate | UI Surface |
|--------|------------------|-----------|------------|
| Projects | `archived_at` / `archived_by` columns | `can_edit_project` | Third "Archived" tab in `/workshop/projects` |
| Estimate Sheets | `archived_at` / `archived_by` on `estimates` | `can_edit_estimate` | Status filter in `/workshop/projects/[projectId]/estimates` |
| Components | Existing `lifecycle_state = 'archived'` | Workspace editor | Archived view in `/workshop/library` |
| Templates | `archived_at` / `archived_by` on `estimate_templates` | Workspace editor | Status filter in `/workshop/templates` |
| Retention (future) | `recipient_entitlements`, retained snapshots | Separate RLS | Recipient-facing UI |

**Pattern:** All archive/restore operations follow the existing preview→execute RPC pattern from mass deletion.

## Plan Document Map

### Core Documents (14)
| # | Document | Purpose |
|---|----------|---------|
| 00 | INDEX | This file — refined overview and navigation |
| 01 | REQUIREMENTS | Multi-entity requirements with 50+ AC items |
| 02 | CODEBASE_RESEARCH | Live repo evidence for all four entities |
| 03 | ARCHITECTURE | Multi-entity entity strategy matrix |
| 04 | IMPLEMENTATION_SEQUENCE | 7-phase multi-entity execution plan |
| 05 | BLAST_RADIUS | Per-entity blast radius with cross-cutting impacts |
| 06 | TESTING | Multi-entity test matrices |
| 07 | UI_UX | Per-entity IA, wireframes, accessibility, design system |
| 08 | SECURITY | Per-entity security semantics, RLS, performance |
| 09 | DEPLOYMENT | Per-phase migration, rollback per entity |
| 10 | IMPLEMENTATION_PROMPT | Phase-scoped implementation handoff |
| 11 | READINESS | Honest before/after scoring |
| 12 | OPEN_QUESTIONS | 15+ decisions + open questions |
| 13 | TRACEABILITY | 32 project requirements; expansion to ~50+ planned |

### Specialist Documents (13)
| # | Document | Purpose |
|---|----------|---------|
| 14 | ENTITY_SCOPE_STRATEGY | Entity-level scope definition and phase ordering |
| 15 | DATABASE_SCHEMA_RLS_RPC | Schema per entity, RPCs, RLS, indexes |
| 16 | PROJECT_ARCHIVE_UI | Project list IA, tabs, card/toolbar/modal UX |
| 17 | ESTIMATE_SHEET_ARCHIVE | Estimate table filter, row/bulk actions, cross-cutting effects |
| 18 | COMPONENT_ARCHIVE_RESTORE | Existing archive + new restore flow |
| 19 | TEMPLATE_ARCHIVE | Template archive model and UI |
| 20 | QUERY_ROUTE_CACHE | Repository filters, route guards, cache impact |
| 21 | COLLABORATION_PUBLICATION_AI | Per-entity effects on collaboration, publication, export, AI |
| 22 | RECIPIENT_RETENTION | Future paid-client retention model |
| 23 | TEST_FIXTURES_MIGRATION | Fixtures, migration proof, RLS proof per entity |
| 24 | GITNEXUS_IMPACT | Graph tools used, impacted symbols, risk levels |
| 25 | RELEASE_CHECKLIST | Owner review gates, per-phase release checks |
| 26 | AGENT_HANDOFF | Pre-implementation checklist for future agents |

## Start Here (Future Implementation Agent)

1. Read this `00_INDEX.md` for scope and phase strategy
2. Read `14_ENTITY_ARCHIVE_SCOPE_AND_PHASE_STRATEGY.md` for entity-level decisions
3. Read `03_ARCHITECTURE_AND_DESIGN_PLAN.md` for the entity strategy matrix
4. Read `04_IMPLEMENTATION_SEQUENCE.md` for per-phase execution
5. Read `15_DATABASE_SCHEMA_RLS_AND_RPC_PLAN.md` for schema specifics
6. Read `10_IMPLEMENTATION_PROMPT_DRAFT.md` for phase-scoped prompts
7. Read `26_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md` before touching code
8. Read `AGENTS.md` and `DESIGN.md` for project rules and UI constraints
9. Verify GitNexus/code-review-graph availability before source edits
10. Read local Next.js docs under `node_modules/next/dist/docs/`

## Required Verification Commands

```bash
bun run validate          # type-check + lint + design-system + unit + dom tests
bun run build             # Next.js production build
bun run lint:design-system # app/workshop UI compliance (BLOCKING)
bun run test:e2e           # Playwright E2E
git diff --check           # whitespace validation
```

## Risk Summary

| Phase | Entity | Highest Risk | Mitigation |
|-------|--------|-------------|------------|
| 1 | Projects | Query regression hiding active projects | Partial indexes, comprehensive tests |
| 2 | Estimate Sheets | Charts/export/AI exclusion regression | Per-effect tests, TanStack Query invalidation |
| 3 | Components | Restore sets wrong lifecycle state | RPC validation, contract tests |
| 4 | Templates | Insertion filter blocks valid templates | Test with realistic template data |
| 5 | Retention | Architecture commits to wrong model | Planning only; owner/legal review gates |

## Bug/Blocker References

- `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md` — broad `db push` blocked; use exact-file linked apply
- `.ai/15_Bugs/2026-06-06-notification-system-rls-proof-blocker.md` — resolved; pattern exists for RLS proof without Docker

## Readiness Score

- **Before refinement (project-only):** 66/100
- **After refinement (multi-entity, 27 docs):** ~96/100
- **Gap preventing 100%:** Phase 5 retained-recipient is planning-only (not implemented); cross-entity performance proof with realistic data volumes requires implementation

## Current Status

- **Planning:** REFINED (27 documents)
- **Implementation:** NOT STARTED
- **This is a planning artifact only.** No source code, migrations, dependencies, runtime configuration, or provider settings have been modified.
