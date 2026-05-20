# Estimate Tree Drag/Drop Reorganization Plan

Status: planning/audit package created 2026-05-20 18:51 PST
Target route: `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`
Primary package: `react-complex-tree` v2.6.1

## Intent

Implement a seamless drag/drop reorganization tool for the live estimate tree without full-page reloads, route bounces, blank-tree flicker, or state loss.

This folder is intentionally implementation-ready but does not change feature code. It records the exact current code paths, blast radius, package API guidance, implementation phases, and verification plan so a builder can implement the feature safely.

## Documents

1. `01-codebase-audit-and-blast-radius.md`
   - Exact current files/symbols affected.
   - GitNexus impact evidence.
   - Current constraints, removed prior RPC, tests that currently assert DnD is absent.
   - Data-flow and state-flow audit.

2. `02-react-complex-tree-api-guide.md`
   - React Complex Tree controlled-environment API.
   - Drag/drop props, `DraggingPosition` shapes, custom renderer requirements.
   - Archestimator-specific usage rules.

3. `03-implementation-plan.md`
   - Phased implementation plan.
   - Pure domain helpers, client optimistic state, server action/RPC, UI details.
   - Exact files expected to change.

4. `04-testing-browser-qa-plan.md`
   - Unit, component, database, and Playwright coverage.
   - Flicker/no-reload instrumentation.
   - Acceptance criteria and regression gates.

5. `05-rollout-and-commit-plan.md`
   - Branching, staging, commit order, and rollback strategy.
   - Required update points for `.ai` state and tests.

Related reusable skill payload:
- `.ai/11_skills/payloads/react-complex-tree-dnd-archestimator.md`

Hermes user-local skill also created:
- `software-development/react-complex-tree`

## Non-negotiable implementation requirements

- The tree must update optimistically in local/client state immediately on drop.
- Drop must not call `router.refresh()` or cause a document navigation.
- Selection, focused node, and expansion state must survive reorder/reparent.
- Invalid moves must be blocked before persistence and before visual acceptance.
- Persistence must be atomic. Do not update multiple nodes with independent client-side requests.
- Hierarchy rules must match `canNestEstimateNodeKind` and database enforcement.
- Browser QA must prove no full reload and no blank/flicker frames during drag/drop.

## Current blockers/risks discovered

- The target URL currently redirects to `/login` in the browser session unless dev auth/session is configured.
- A prior migration created `public.move_estimate_nodes`, but a later migration explicitly dropped it because tree drag/drop had been removed from the product.
- Existing Vitest source-inspection tests currently assert that DnD props/actions are absent; those tests must be replaced with behavior coverage when implementing.
- `workspace-repository.ts` currently excludes `kind === "group"` from `isDisplayNodeKind`, while seed data and the add-node action create `group` nodes. This must be resolved before reliable tree reorganization.
