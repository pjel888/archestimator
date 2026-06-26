# Final Readiness Review

## Planning Readiness

This plan is ready for implementation with the entry checks below treated as implementation verification tasks, not unresolved product decisions:

- Same-branch reorder remains in scope.
- Row relocation is separate from component movement.
- Left tree row drop is event-forwarding only.
- The server action and RPC will be built before enabling the visible handle.
- Transformed views are disabled for MVP movement.
- The Move row dialog is the keyboard/touch fallback.
- The compact rail is fine-pointer only unless implementation widens the select column.
- The RPC uses the hardened security envelope, derives actor from `auth.uid()`, and enforces mutation ID idempotency.
- Browser proof is required for pointer drag/drop geometry before release.

## Implementation Entry Criteria

- Implementation follows the single-row MVP behavior.
- Movement is disabled while multiple rows are selected.
- The first UI patch proves the handle and checkbox do not overlap or leak events, or widens the select column and updates column-model tests.
- The migration uses the next timestamped Supabase migration and includes privilege-envelope/idempotency tests.
- Generated Supabase types are regenerated if the implemented RPC changes the typed client surface used by TypeScript.
- Real DB RPC proof is available before persistence is considered verified.

## Verification Plan Summary

Implementation should prove:

- Pure helper final order.
- Same-branch reorder persistence.
- Cross-branch middle-sheet movement.
- Left-tree append drop event and handler.
- Authorization and stale revision rejection.
- Checkbox and component drag non-regression.
- Typecheck or targeted TypeScript/LSP evidence covers changed files, with unrelated pre-existing typecheck reds documented if full typecheck remains blocked.
- Targeted vitest suites pass.
- Real DB RPC proof covers locks, grants, idempotency, deferrable uniqueness, and rollback.
- Browser proof covers actual pointer drag/drop geometry.

## Known Limitations In First Release

- Single-row movement only.
- Same estimate and same active tab only.
- Movement disabled in transformed views.
- Left tree target appends only; exact positional reorder is done in the middle sheet or keyboard dialog.

## Final Judgment

The plan is implementation-ready for a single-row MVP that disables movement while multiple rows are selected. The earlier open questions about select-column fit, keyboard/touch fallback, helper tree shape, sort-order policy, active-tab validation, RPC security posture, actor attribution, idempotency, browser geometry proof, and rollback evidence are now explicit implementation requirements and tests.

The package is not release-ready because no implementation exists yet. See `19_PLAN_AUDIT_SCORECARD.md` for the audit scorecard and reasons this package is not scored as 100.
