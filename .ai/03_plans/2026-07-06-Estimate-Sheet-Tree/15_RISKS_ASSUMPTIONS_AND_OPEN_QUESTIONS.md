# Risks Assumptions And Open Questions

## Risks

### RISK-RC0 — User cannot use the feature (CRITICAL, added 2026-07-06)

- Every reorder attempt throws "Estimate history event workspace could not be resolved."
- User has already reported this. Any further delay on Phase 0 erodes trust.
- Mitigation: ship Phase 0 hotfix immediately, ahead of all other phases.
- Owner: lead implementer.

### RISK-1 — Shared `Tree` changes can affect other consumers

- Component library folder trees and any other consumer of `Tree` may regress when `dragActivation` is added or drop-band behavior is tweaked.
- Mitigation: keep `dragActivation` default `"row"`; only EstimateSheetTree opts in. Add a shared-Tree compatibility test.
- Owner: UI lane.

### RISK-2 — EstimateSheetTree handle-only dragging may surprise existing users

- Mitigation: it reduces accidental movement and preserves shared `Tree` row-drag compatibility by making handle activation opt-in.
- Owner: UI lane.

### RISK-3 — Move dialog placement can make the dialog denser

- Mitigation: keep it compact and predictable. Use focusable `aria-disabled` rows so reasons are reachable.
- Owner: UI lane.

### RISK-4 — D1 action-client parity could duplicate validation

- The action and the D1 adapter could both run projected-tree validation.
- Mitigation: pick one (preferably the action layer, before the adapter call) and document the choice. Test the rejection at whichever layer enforces it.
- Owner: backend lane.

### RISK-5 — Refactoring after behavior fixes can create new stale-closure or query-revision bugs

- Mitigation: refactor only after Phase 1 RED tests are GREEN. Keep the reorder hook's dependencies explicit.
- Owner: refactor lane.

### RISK-6 — Optimistic concurrency is last-write-wins (added 2026-07-06)

- Two users reordering concurrently both succeed; the second overwrites the first.
- Mitigation: acceptable pre-first-user. Track as a follow-up once collaboration is live. Durable Object broadcast already exists for cursor/presence and could carry reorder intent events.
- Owner: n/a for this plan.

### RISK-7 — Restore Undo is UI/action-tested but provider-unproven (added 2026-07-06)

- Delete and bulk delete Undo exist in the UI and action wrapper, but the active D1 adapter currently throws for node/row restore calls.
- Mitigation: add D1 restore provider proof before claiming Undo works against D1, or explicitly defer/remove provider Undo in the release decision.
- Owner: backend lane.

### RISK-8 — Left tree mutating controls may appear for read-only users (added 2026-07-06)

- `EstimateSheetTree` has no local `canEditEstimate` prop, while parent center-sheet UI gates editing.
- Mitigation: add a permission prop and UI tests, or explicitly accept server-only enforcement for first users.
- Owner: product/backend lane.

### RISK-9 — Disabled reasons are present but not reliably accessible (added 2026-07-06)

- Context-menu disabled reasons are mostly title-only, and Move dialog disabled options use native disabled radios.
- Mitigation: use visible/described-by text and focusable `aria-disabled` option rows.
- Owner: UI lane.

## Assumptions

- The user-reported "branch reordering broken" includes non-empty branches and repeated moves, not only leaf moves. RC0 confirms the symptom is broader than nesting.
- Current single-node nesting model remains correct.
- Stored `sort_order` remains the canonical sibling order.
- Browser proof is not mandatory unless the implementation changes geometry beyond DOM-verifiable class/structure behavior.
- The `getCurrentWorkspaceProject` repo function returns `{ project }` where `project.id` is the project UUID. The Phase 0 fix passes only `target_project_id: project.id`; if `project.workspace_id` is also exposed, an optional micro-optimization can pass it to skip a `readProjectContext` roundtrip.
- Six live read-only subagents returned evidence for the 2026-07-06 state-matrix revision, but no application tests or browser proof ran in this planning pass.

## Open Questions

Q1. Should root top drop zone be visible in the estimate tree, or should root top be available only through Move dialog?

Q2. Should other shared `Tree` consumers opt into handle-only dragging later? This plan only changes EstimateSheetTree.

Q3. Should invalid drop reasons appear immediately, after hover dwell, or only in a status/help region?

Q4. Should reorder undo/time-limited rollback be included in this work or handled as a follow-up to UX-012? Delete and bulk delete already have Undo UI, with D1 provider proof still open.

Q5. Should projected-tree validation live in `reorderEstimateTreeNodes` before the D1 adapter call, or inside `d1-action-client.ts`? Either is acceptable only if active D1 tests prove rejection before write.

Q6. (added 2026-07-06) Does `getCurrentWorkspaceProject` already return `project.workspace_id` directly? If yes, Phase 0 can pass `target_workspace_id` as well to skip a D1 roundtrip. If no, the one-line fix still works via `readProjectContext`.

Q7. (added 2026-07-06) Are there OTHER action call sites that silently omit `target_project_id`? The 2026-07-06 grep showed 30+ sites that pass it correctly and one (reorder) that does not. A wider audit could surface others before users hit them.

Q8. (added 2026-07-06) Should active D1 restore support be implemented now, or should Undo be visually constrained until D1 restore history snapshots are available?

Q9. (added 2026-07-06) Should EstimateSheetTree receive the parent's `canEditEstimate` permission state before first users, or is server-only enforcement acceptable for this release?

Q10. (added 2026-07-06) Should external template/project/row drops remain inside-only after Move dialog gains before/after/root placement? Current source suggests yes.
