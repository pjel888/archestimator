# UI Component Library Storybook Plan Refinement Run

**Date:** 2026-06-06
**Branch:** `docs/ui-component-plan-refinement-2026-06-06`
**Mode:** Docs-only planning refinement.

## Goal

Expand the existing UI component optimization/componentization plan into a
complete Storybook-first ArchEstimator UI Component Library planning pack while
preserving the old tree-performance work as a domain sub-plan.

## Hard Boundaries

- No source implementation.
- No Storybook install.
- No dependency or lockfile changes.
- No runtime/config/provider changes.
- No Supabase migration or generated type changes.
- No production app migration.
- No secrets or live provider data recorded.

## Evidence Gathered

- Repo state and branch/worktree status.
- `.ai` operating docs, current state, decisions, roadmap, and design specs.
- `DESIGN.md`, `package.json`, `README.md`, `components.json`.
- Current `src/components/ui` inventory and representative workshop/share/domain UI files.
- Design-system lint posture in `scripts/enforce-app-design-system.mjs`.
- code-review graph overview, communities, impact radius, and affected-flow checks.
- GitNexus index refresh, query, and impact checks for representative UI/tree symbols.
- Official Storybook, shadcn/ui, Flowbite, Aceternity, and Tailwind v4 docs.

## Docs Updated

- Rewrote plan entrypoints: `00_INDEX.md`, `README.md`,
  `CURRENT_CANONICAL_PLAN.md`.
- Added canonical docs `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` through
  `31_DOC_REPAIR_LOG.md`.
- Updated `.ai/10_state/current-state.md`.
- Updated `.ai/10_state/decisions.md`.
- Updated `.ai/01_roadmap/README.md`.

## Key Decisions Recorded

- Storybook-first library MVP before app migration.
- Production app migration is explicitly out of MVP scope.
- shadcn/ui, Flowbite, and Aceternity are reference sources, not visual authorities.
- `DESIGN.md` and ArchEstimator app/workshop density win over external defaults.
- Storybook package install and any new dependency remain owner-gated.
- Static provider-free fixtures are required for stories.

## Readiness

| Scope | Status |
|---|---|
| Docs package | `99/100 READY_FOR_IMPLEMENTATION_HANDOFF` |
| Storybook setup planning | `98/100 READY_AFTER_PACKAGE_APPROVAL` |
| Primitive planning | `98/100 READY_FOR_STORYBOOK_MVP` |
| Full inventory | `99/100 READY_FOR_PHASED_BUILD` |
| Domain components | `97/100 READY_WITH_GRAPH_GATES` |
| Production app migration | `20/100 DEFERRED_BY_DESIGN` |

## Validation To Close

- `git diff --check`
- `.ai`-only diff review
- code-review graph change detection
- GitNexus change detection or documented fallback
- commit and push after validation
