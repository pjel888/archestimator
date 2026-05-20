# Estimate Tree Drag/Drop Reorganization Plan

Status: implemented on branch `feat/estimate-tree-dnd-gate-b`; this plan pack is now the closeout/audit source for follow-up verification.
Target route: `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`
Primary package: `react-complex-tree` v2.6.1
Implementation status: code implemented. Gate E mutating browser proof is implemented as an env-gated Playwright matrix and remains unexecuted in shells without `SUPABASE_SERVICE_ROLE_KEY` plus dev-auth env.

## Intent

Implement a seamless drag/drop reorganization tool for the live estimate tree without full-page reloads, route bounces, blank-tree flicker, state loss, or invalid hierarchy persistence.

This folder records the original plan, binding decisions, implementation references, and verification runbook. The live implementation now uses React Complex Tree with app-side hierarchy guards, optimistic local/query-cache updates, rollback, and the canonical `public.reorder_estimate_nodes` RPC.

## Closeout status — 2026-05-21 PHT

Implemented:

- Two-kind active tree model: `group | area`.
- Canonical nested view model: `EstimateTreeNode`; stale `EstimateAreaNode` compatibility alias removed from feature code.
- React Complex Tree rendering, expansion, selection, add-node hierarchy creation, drag/drop props, root immovability, and package CSS import.
- Drop validation through `evaluateEstimateTreeDrop` / `buildEstimateNodeReorderPlan`.
- Optimistic local tree update plus TanStack Query cache mirror.
- Failure rollback without `router.refresh()` after drop.
- Atomic server persistence through `reorderEstimateTreeNodes` -> `public.reorder_estimate_nodes`.
- Supabase function type entry for `reorder_estimate_nodes`.
- Removed runtime fallback to the historical `move_estimate_nodes` RPC.
- Regression for the real Supabase `rpc()` receiver crash that produced `Cannot read properties of undefined (reading 'rest')`.
- Regression for stale route props not overwriting the confirmed post-drop tree.
- Component coverage for Group Node reparenting through the RCT `onDrop` path.
- Playwright matrix for root group reorder, same-parent area reorder, group reparent, area reparent with row attachment, invalid area-parent, invalid cycle/self drops, no document navigation, no blank tree frames, and persistence after reload.
- Mutating Playwright data isolation: each test clones the seeded estimate tree into a disposable estimate, normalizes the known baseline node positions inside that clone, and deletes the clone after the test.

Still gated:

- The mutating Playwright matrix requires `ARCHESTIMATOR_E2E_MUTATING_DND=1`, `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Without those, Playwright lists the full matrix but skips execution.
- Live manual browser verification also requires authenticated/dev-auth access to the protected route.

## Active product/domain decision

The estimate tree has exactly two active technical node kinds:

- `group` — organizing nodes; may contain Group Nodes and Area Nodes; must not own estimate row items.
- `area` — row-owning leaf nodes; may contain `EstimateRowItem` records; must not contain child nodes.

Domain organization labels such as Lot, General Requirements, House, Floor, Phase, or Trade are user/UX content on `group` nodes, not technical node kinds.

The plan preserves the current root invariant: the synthetic root accepts Group Nodes only. If Philip later wants top-level Area Nodes, that must be a separate hierarchy decision with TypeScript, SQL, and test updates.

## Required read order for implementers

1. `00-two-node-domain-decision.md`
2. `06-current-state-validation-memo.md`
3. `07-implementation-reference.md`
4. `03-implementation-plan.md`
5. `04-testing-browser-qa-plan.md`
6. `08-verification-runbook-and-readiness-gate.md`
7. `09-independent-review-hygiene-memo.md`
8. `10-assessment-response-decision-closure.md`
9. `11-final-assessment-hardening-notes.md`
10. `05-rollout-and-commit-plan.md`

Do not start by adding RCT drag/drop props. Start with the two-kind/read-path correction.

## Documents

0. `00-two-node-domain-decision.md`
   - Canonical two-node model decision.
   - Exact current codebase mismatches.
   - Required TypeScript/database/test simplification before DnD.

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
   - Two-kind domain simplification, pure domain helpers, client optimistic state, server action/RPC, UI details.
   - Exact files expected to change.

4. `04-testing-browser-qa-plan.md`
   - Unit, component, database, and Playwright coverage.
   - Flicker/no-reload instrumentation.
   - Acceptance criteria and regression gates.

5. `05-rollout-and-commit-plan.md`
   - Branching, staging, commit order, and rollback strategy.
   - Required update points for `.ai` state and tests.

6. `06-current-state-validation-memo.md`
   - Current repo/dependency/GitNexus validation.
   - Exact blocker evidence for `isDisplayNodeKind` excluding `group`.
   - Current sample tree, database, route/auth, and test mismatches.

7. `07-implementation-reference.md`
   - Single source for names, helper contracts, code snippets, RPC/action payloads, and test cases.
   - Consolidates the plan details needed by the builder.

8. `08-verification-runbook-and-readiness-gate.md`
   - Ordered command runbook.
   - Quantified success metrics.
   - Final implementation done/not-done gate.

9. `09-independent-review-hygiene-memo.md`
   - Independent-review findings.
   - Corrections applied after review.
   - Final markdown/name hygiene verdict.

10. `10-assessment-response-decision-closure.md`
   - Response to two assessment reports.
   - Binding choices for store usage, cache sync, type rename, DB migration strategy, RCT root movement, and E2E data isolation.

11. `11-final-assessment-hardening-notes.md`
   - Response to the final 10/10 and A- reports.
   - Closes minor implementation-friction edges: verified `cn()` import, desktop/keyboard MVP scope, explicit navigation-conflict gate, and Playwright DnD flake/retry policy.

Related reusable skill payload:
- `.ai/11_skills/payloads/react-complex-tree-dnd-archestimator.md`

Hermes user-local skill:
- `software-development/react-complex-tree`

## Non-negotiable implementation requirements

- The technical estimate node kind union must be `"group" | "area"` before drag/drop is enabled.
- Gate A must introduce canonical `EstimateTreeNode`; new feature code must not use stale `EstimateAreaNode` naming.
- `workspace-repository.ts` must display `group` nodes; the current `isDisplayNodeKind` asymmetry is the first blocker.
- The tree must update optimistically in local/client state immediately on drop.
- Drop must not call `router.refresh()` or cause a document navigation.
- Selection, focused node, and expansion state must survive reorder/reparent.
- Invalid moves must be blocked before persistence and before visual acceptance.
- Persistence must be atomic. Do not update multiple nodes with independent client-side requests.
- Hierarchy rules must match `canNestEstimateNodeKind` and database enforcement.
- Browser QA must prove no full reload and no blank/flicker frames during drag/drop.
- Mutating Playwright DnD tests must use isolated/cloned estimate data, not the shared manual-QA target estimate.
- Tests that currently assert DnD absence must be replaced with behavior coverage.

## Historical blockers/risks discovered

- The target URL redirects to `/login` in browser sessions unless dev auth/session is configured.
- A prior migration created `public.move_estimate_nodes`, but a later migration explicitly dropped it because tree drag/drop had been removed from the product.
- Older Vitest source-inspection tests asserted DnD props/actions were absent; these have been replaced with behavior coverage.
- Earlier code contained legacy estimate node kinds in active TypeScript/read-path/sample data; active feature code now uses the two-kind `group | area` contract.
- Earlier `workspace-repository.ts` excluded `kind === "group"` from display nodes; the active read path now exposes `group | area`.
- Earlier `sampleEstimateTree` used `lot`, `general`, `structure`, and `level` as technical kinds; active sample tree nodes now use `group` while preserving visible labels.
- Playwright browser proof is not complete until the env-gated mutating matrix is run with service-role/dev-auth credentials.
- `useEstimateUiStore` and `useMoveEstimateRowItem` are currently dead code; the plan now explicitly avoids basing DnD on them.

## Readiness status

The implementation slices are complete from Gate A through the app/unit/component/browser-spec surface. The only remaining plan gate is executing the mutating browser matrix in an environment with the required credentials.

Next best implementation action:

```txt
Run Gate E — mutating Playwright DnD matrix with service-role/dev-auth env.
```
