# Decision Log

## D0 — Treat Workspace Resolution Failure As Priority Zero (added 2026-07-06)

Decision: The "Estimate history event workspace could not be resolved" error is the live production blocker and goes ahead of every other plan item.

Reason: The user cannot reorder at all today — flat or nested. Every other plan improvement (UX, refactor, accessibility) is irrelevant if the feature itself throws.

Rejected: Continue with the original Phase 0 characterization tests before fixing the payload. Reason: tests take time; the fix is one line and self-evidently correct against source.

Confidence: high.

## D1 — Keep Shared Tree Primitive

Decision: Use the existing `Tree` primitive for the first fix.

Reason: The current primitive already has DnD, roving focus, virtualization, root drop zones, external drops, and tests. The broken behavior maps to fixable correctness and UX gaps.

Rejected: Replace with a new DnD/tree dependency first. Reason: wider blast radius without proving the current primitive cannot meet requirements. (Note: `react-complex-tree@^2.6.1` is installed in `package.json` but unused by the active `EstimateSheetTree` — the in-repo `Tree` primitive remains the surface.)

Confidence: high.

## D2 — Tests Before Refactor

Decision: Add RED tests for branch reorder and merge correctness before splitting `EstimateSheetTree.tsx`.

Reason: Reorder is coupled to optimistic cache, stale props, and server settle behavior.

Rejected: Refactor first. Reason: risks moving a bug without reproducing it.

Confidence: high.

## D3 — Preserve Stored Sibling Order

Decision: Do not reintroduce kind-based sorting.

Reason: Current code and historical decisions make stored `sort_order` the display order.

Rejected: Groups-before-areas display sorting. Reason: causes visual drop positions to snap after persistence.

Confidence: high.

## D4 — Make Move Dialog A Placement Dialog

Decision: Extend Move dialog to before/inside/after/root placement.

Reason: Pointer DnD has three placements; keyboard UI currently has only inside.

Rejected: Add keyboard shortcuts only. Reason: shortcuts are useful later, but a discoverable dialog is the current keyboard-accessible path.

Confidence: high.

## D5 — Use Handle-Only Drag Activation In EstimateSheetTree

Decision: Add an opt-in `dragActivation="handle"` mode to the shared `Tree` and use it from EstimateSheetTree.

Reason: The estimate tree is a high-consequence reorder surface; row-body drag is too easy to trigger accidentally. Keeping the shared default as row drag protects existing consumers.

Rejected: Make every shared `Tree` handle-only in one change. Reason: unnecessary blast radius.

Confidence: high.

## D6 — Adopt Confirmed Structural Fields

Decision: Confirmed reorder merge must adopt server structural fields used by future planning, especially `sortOrder`.

Reason: Cached stale `sortOrder` can corrupt later sparse payloads.

Rejected: Preserve all cached fields blindly. Reason: row content preservation is required, but structural ordering fields must come from confirmed structure.

Confidence: medium-high pending RED reproduction.

## D7 — Treat D1 Reorder As Active Persistence

Decision: Phase 0 closes the `target_project_id` payload gap; Phase 3 closes the projected-tree validation residual.

Reason: Estimate actions use `createEstimateActionsD1Client`; this is not a historical or test-only adapter. The payload omission is the user-visible error (RC0); the validation omission is a correctness residual (RC5).

Rejected: Leave D1 validation as a later parity cleanup. Reason: branch reorder correctness depends on the active persistence path.

Confidence: high.

## D8 — Verification Mode Source-Audited With Live Subagents

Decision: Label this revision `verification_mode: source-audited-with-live-subagents`.

Reason: The current revision integrated six live read-only subagents plus direct lead verification. Application tests and browser proof still did not run, so the evidence is planning/source evidence, not implementation proof.

Rejected: Claim implementation verification. Reason: no source code was changed and no app tests were run in this planning pass.

Confidence: high.

## D9 — Use State Inventory As Planning Source

Decision: Add `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` and treat it as the canonical list of tree states for implementation planning.

Reason: `EstimateSheetTree` is not only a reorder surface. Context-menu, rename, create, delete, bulk delete, restore, search/filter, lazy-load, active-tab, external-drop, permission, and status states can regress during reorder work.

Rejected: Keep the plan reorder-only. Reason: it would miss real shared-state risks the user explicitly asked to explore.

Confidence: high.

## D10 — Protect Existing Coverage Instead Of Rewriting It

Decision: Mark context-menu CRUD, rename lifecycle, delete/bulk delete success paths, optimistic DnD rollback, search/filter pruning, and lazy hydration as existing coverage to preserve.

Reason: The current worktree already contains meaningful tests. The plan should add precise gaps, not duplicate broad coverage.

Rejected: Add generic "test context menu" or "test delete" work items. Reason: too vague and likely redundant.

Confidence: high.

## D11 — Split Mocked Action Tests From D1 Provider Proof

Decision: Phase 0 needs both mocked action-wrapper payload tests and a real D1 adapter/local-provider proof.

Reason: `estimate-node-reorder-action.test.ts` mocks the D1 client and cannot prove `insertHistoryEvent` wrote a scoped history row.

Rejected: Claim non-null `workspace_id` proof from the mocked action test file. Reason: impossible evidence class.

Confidence: high.

## D12 — Treat Move Dialog Parity As Deliberate Scope Expansion

Decision: Keep current-source truth clear: the Move dialog is inside-only today; before/after/root support is future work.

Reason: Source validates and executes `position: "inside"` only. Calling this a refinement would make the plan overpromise.

Rejected: Describe the dialog as already equivalent to pointer DnD. Reason: false against source and tests.

Confidence: high.
