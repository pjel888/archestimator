# Estimate Tree Drag/Drop Reorganization Plan

Status: planning/audit package created 2026-05-20 18:51 PST; upgraded after two-node tree decision, current-state validation, independent review/hygiene, assessment decision-closure, and final minor hardening on 2026-05-20.
Target route: `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`
Primary package: `react-complex-tree` v2.6.1
Implementation status: not implemented; this folder is the implementation-ready plan pack.

## Intent

Implement a seamless drag/drop reorganization tool for the live estimate tree without full-page reloads, route bounces, blank-tree flicker, state loss, or invalid hierarchy persistence.

This folder does not change feature code. It records the exact current code paths, blast radius, React Complex Tree API guidance, implementation phases, helper contracts, and verification runbook so a builder can implement the feature safely and efficiently.

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

## Current blockers/risks discovered

- The target URL currently redirects to `/login` in the browser session unless dev auth/session is configured.
- A prior migration created `public.move_estimate_nodes`, but a later migration explicitly dropped it because tree drag/drop had been removed from the product.
- Existing Vitest source-inspection tests currently assert that DnD props/actions are absent; those tests must be replaced with behavior coverage when implementing.
- The current repo still contains legacy estimate node kinds in TypeScript unions, generated Supabase types, SQL hierarchy checks, sample tree data, and tests. This conflicts with Philip's two-node decision.
- `workspace-repository.ts` currently excludes `kind === "group"` from `isDisplayNodeKind`, while seed data and the add-node action create `group` nodes. Under the two-node model, this must become an explicit `group | area` guard.
- `sampleEstimateTree` currently uses `lot`, `general`, `structure`, and `level` as technical kinds. These must become `group` while preserving the visible labels.
- Playwright browser proof is not credible until authenticated route setup exists and mutable test data is isolated/reset.
- `useEstimateUiStore` and `useMoveEstimateRowItem` are currently dead code; the plan now explicitly avoids basing DnD on them.

## Readiness status

After the added current-state memo, implementation reference, verification runbook, and assessment decision-closure addendum, the plan pack is ready for the first implementation slice with one condition: the slice must begin with Gate A from `08-verification-runbook-and-readiness-gate.md` and apply the binding decisions in `10-assessment-response-decision-closure.md`.

Next best implementation action:

```txt
Implement Gate A — two-kind domain and read-path fix.
```

Do not begin with UI drag/drop. That would build on a known incorrect tree read path.
