# Rollout Rollback And Observability

## Rollout

This is pre-first-user and can ship behind normal local verification without a feature flag unless implementation changes server persistence semantics.

**Recommended rollout order (updated 2026-07-06):**

1. **Phase 0 hotfix** — ship alone, ahead of every other phase. The fix is one line (`target_project_id: project.id`); the regression test is small. This unblocks the user immediately.
2. Phase 1 — merge characterization/RED tests, including state-inventory preservation gaps.
3. Phase 2 — merge correctness fix.
4. Phase 3 — merge projected-tree validation and D1 provider proof gaps.
5. Phase 4 — merge dialog parity and visible feedback.
6. Phase 5 — merge pointer UX and handle-only activation after shared-tree compatibility tests pass.
7. Phase 6 — merge refactor only after behavior stabilizes.

## Rollback

Rollback is code-level:

- **Phase 0 rollback:** revert the one-line payload addition. Effect: reorder breaks again with the same workspace error. This is acceptable because Phase 0 only fixes; it does not change semantics.
- Revert UI affordance changes if they regress shared `Tree` consumers.
- Revert Move dialog placement changes independently if pointer DnD correctness is fixed but keyboard UX needs redesign.
- Revert D1 adapter projected-tree validation (Phase 3) only with action-wrapper and D1 adapter/provider tests proving the old behavior is intentional.

## Observability

### Local user-facing signals (existing)

- Reorder status output (`EstimateSheetTree.tsx:1972-1981` — `aria-live` polite).
- Toast on error.
- History event from reorder action.

### Added/Required signals (2026-07-06)

- **Reorder failure counter by failure code** — capture the wrapped error message and tally:
  - `"Estimate history event workspace could not be resolved."` → workspace resolution failure (post-Phase-0 should be 0).
  - `"Estimate tree node sort order must be a non-negative number."` → client payload validation.
  - `"Estimate tree nodes cannot be moved across tabs."` → cross-tab rejection.
  - Any uncovered code → escalate.
- **Sampled hover-rejection counter** — count invalid drop hovers by reason (cycle, cross-tab, optimistic id). Sample to avoid noise; useful for tuning UX.
- **Action failure counter** — count `reorder_estimate_nodes_with_history` RPC failures by RPC error code.

Do not add a new observability dependency for this fix. The existing toast/live-region infrastructure is enough.

## Production-Fire Recovery Play (added 2026-07-06)

If a user reports "Could not reorder estimate tree" after Phase 0 ships:

1. Capture the **full** error message (not just the prefix). The prefix wraps `${rpcError.message}`.
2. If the inner message is `"Estimate history event workspace could not be resolved."`:
   - Verify the project still has a `workspace_id` (it always should — composite FK enforces this).
   - Verify no other action call site has regressed (grep `dataStore.call(` and check payload).
3. If the inner message is anything else, escalate to the implementing engineer; the bug is in the D1 adapter, not the payload.
4. Run a static payload audit of `dataStore.call(...)` sites and the D1 adapter proof. Do not rely on `workspace_id IS NULL` audit SQL; the schema forbids null rows and that query cannot prove payload correctness.

## Manual QA Script

Use after focused tests pass:

1. Create a tree with three root branches and nested children.
2. Drag a non-empty branch before another root branch. **Must succeed** (previously threw workspace error).
3. Drag it inside another branch. **Must succeed** (the user's original reported case).
4. Move it back to root bottom using keyboard Move dialog.
5. Search and confirm reorder is disabled with a reason.
6. Start rename and confirm reorder is disabled with a reason.
7. Force action failure in test/dev path and confirm rollback plus focus stability.
8. Right-click a row, verify Add area, Save as template, Rename, Move, and Delete still appear with correct disabled reasons.
9. Add Area, confirm optimistic "New Area" is selected and rename opens; attempt a drop touching that optimistic id and verify it is blocked with a reason.
10. Delete one node, click Undo, and verify route/selection restore. Separately test restore failure if provider support remains unimplemented.
11. Bulk select parent plus child, delete, Undo, and verify dedupe/selection behavior.
12. Search for a string with no matches and verify copy is distinct from true empty-tree copy.
13. Expand a lazy branch and verify loading/failure text remains stable around reorder attempts.
14. Drop a template/project source/row item into a branch and verify the existing inside-only domain event still fires.
15. If viewer/read-only UI is implemented, verify tree mutating controls are disabled or hidden for a viewer.
