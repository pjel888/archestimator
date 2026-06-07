# Archives Feature Implementation Plan

**Date:** 2026-06-07
**Plan folder:** `.ai/03_plans/2026-06-07-archives-feature/`
**Status:** PLANNING_COMPLETE — READY_FOR_IMPLEMENTATION
**Branch:** `plan/archive-feature` (this is a planning branch; implementation should use a scoped `feat/*` or `codex/*` branch)

> ⚠️ This is planning only. The archives feature is **NOT** implemented.

## Task Goal

Create a reversible archive/restore flow for workspace projects in Archestimator. Archived projects are removed from primary active surfaces but remain recoverable through an explicit Archived view. Archive is distinct from delete: archive is reversible and non-destructive; delete remains destructive and dependency-checked.

## Default V1 Scope

- **V1:** Workspace projects only (archive + restore)
- **V2+:** Estimate sheets, templates, component-library item archives (evaluated but deferred)
- **V1 includes:** Database migration, RPCs, server actions, project list tabs (preserves existing "Your Projects"/"Projects shared to you" + adds "Archived" tab), archive/restore actions, homebase/favorites/route semantics, collaboration/publication behavior, tests
- **Existing precedent:** Component-library already has `lifecycle_state` archiving; this plan treats that as architectural precedent, not reusable code

## Explicit Non-Goals

- Do NOT modify project deletion flow (hard delete remains unchanged)
- Do NOT archive/restore estimate sheets, templates, or library items in V1
- Do NOT touch SlateCamp or non-Archestimator Supabase resources
- Do NOT modify production source code, migrations, generated types, or provider settings during planning
- Do NOT commit secrets or claim linked Supabase state from local-only evidence

## Product Decision Summary

| Decision | Default | Rationale |
|----------|---------|-----------|
| What can be archived? | Workspace projects only | Lowest blast radius; library items already have lifecycle_state |
| Who can archive? | Anyone with `can_edit_project` (workspace members, project editors, admins, owners) | Mirrors existing project mutation authorization; same gate as project deletion |
| Who can restore? | Same as archive (`can_edit_project`) | Same authorization gate |
| Direct URL access to archived projects? | Redirect to projects list with notice | Prevents data access confusion; consistent with removed-project pattern |
| Archived projects: read-only or fully blocked? | Fully blocked (redirect + notice) | Simplest security posture; archived = not active |
| Active shared links after archive? | Paused (link returns "project archived" state) | Publication currently resolves from `project_publications` table; an explicit project archive-state check must be added to the resolution flow |
| Collaborators see archived projects? | No; archived projects hidden from shared lists | Matches "archived = removed from active surfaces" |
| Pending invites when archived? | Preserved but inactive; restored projects re-enable | Avoids invite data loss |
| Favorites for archived projects? | Hidden from favorites; re-appear on restore | Prevents broken favorite links |
| Homebase/recent projects with archived? | Excluded | Archives are not recent/active work |
| Search behavior | Scoped per-tab ("Your Projects", "Projects shared to you", and "Archived" separately) | Matches existing tab-scoped search pattern |
| Count badges | Show per-tab count; totals exclude archived unless in Archived view | Clear user feedback |
| Archive vs delete distinction | Archive = reversible, non-destructive, returns `archivedIds`. Delete = destructive, requires typed confirmation, returns `deletedIds` | Clear product semantics |

## Plan Document Map

| # | Document | Purpose |
|---|----------|---------|
| 00 | INDEX | This file — plan overview and navigation |
| 01 | REQUIREMENTS_AND_ACCEPTANCE_CRITERIA | Functional/non-functional requirements with pass/fail checks |
| 02 | CODEBASE_RESEARCH | Files inspected, patterns found, existing precedents |
| 03 | ARCHITECTURE_AND_DESIGN_PLAN | Proposed architecture, data model, file plan |
| 04 | IMPLEMENTATION_SEQUENCE | Step-by-step implementation order with validation gates |
| 05 | BLAST_RADIUS_AND_RISK_ANALYSIS | Affected flows, modules, routes, tests; risk matrix |
| 06 | TESTING_AND_VERIFICATION_PLAN | Test strategy, verification commands, archive-specific test cases |
| 07 | UI_UX_AND_ACCESSIBILITY_PLAN | User journeys, IA, keyboard/focus, design-system compliance |
| 08 | SECURITY_PERFORMANCE_AND_DATA_PLAN | Auth/RLS, performance, caching, data model concerns |
| 09 | DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN | Migration strategy, feature flags, rollback process |
| 10 | IMPLEMENTATION_PROMPT_DRAFT | Future handoff prompt for implementation agent |
| 11 | READINESS_SCORECARD | Per-document and overall readiness scoring |
| 12 | OPEN_QUESTIONS_AND_DECISIONS | Unresolved questions, decisions made, items requiring Philip |
| 13 | TRACEABILITY_MATRIX | Requirement → AC → files → step → test → risk mapping |

## Start Here (Future Implementation Agent)

1. Read this `00_INDEX.md` for scope and decisions
2. Read `02_CODEBASE_RESEARCH.md` for codebase evidence
3. Read `03_ARCHITECTURE_AND_DESIGN_PLAN.md` for proposed changes
4. Read `04_IMPLEMENTATION_SEQUENCE.md` for step-by-step execution
5. Read `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` before editing any file
6. Read AGENTS.md and verify GitNexus/code-review-graph availability
7. Read local Next.js docs under `node_modules/next/dist/docs/` before route/framework changes

## Recommended Implementation Sequence

1. **Phase 1 — Baseline & Tests:** Graph impact analysis, failing tests for archive/restore
2. **Phase 2 — Database:** Migration for `archived_at`/`archived_by` on `projects`, archive/restore RPCs, RLS updates
3. **Phase 3 — Server Actions:** Archive/restore preview/execute actions, repository filter updates
4. **Phase 4 — UI:** Project list Archived tab (alongside existing tabs), archive/restore actions, empty states
5. **Phase 5 — Route/Homebase/Collaboration:** Route guards, homebase exclusion, favorite/pending-invite semantics
6. **Phase 6 — Publication:** Shared-link behavior for archived projects
7. **Phase 7 — Verification:** Full test suite, design-system lint, build, E2E

## Required Verification Commands

```bash
bun run validate          # type-check + lint + design-system + unit + dom tests
bun run build             # Next.js production build
bun run lint:design-system # app/workshop UI compliance
bun run test:e2e           # Playwright E2E
git diff --check           # whitespace validation
```

## Risk Summary

- **Highest risk:** Database migration on linked Supabase project `ebxxqidacheyapmmzavr` — additive column + RPCs, no breaking changes
- **Medium risk:** Route behavior changes for archived projects — needs careful redirect/404 handling
- **Medium risk:** Existing project list/homebase/collaboration queries — must filter out archived projects without breaking owned/shared tab logic
- **Low risk:** UI changes — incremental addition of tab + actions to existing component structure

## Bug/Blocker References

- `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md` — broad `db push` blocked; archive migration must use exact-file apply
- `.ai/15_Bugs/2026-06-06-notification-system-rls-proof-blocker.md` — resolved; pattern for RLS proof exists

## Readiness Score Table

See `11_READINESS_SCORECARD.md` for detailed scoring. Target: 98%+ overall.

## Current Status

- **Planning:** DONE
- **Implementation:** NOT STARTED
- **This is a planning artifact only.** No source code, migrations, dependencies, runtime configuration, or provider settings have been modified.
