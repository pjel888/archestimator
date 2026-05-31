# 10 - Agent Handoff and Execution Sequence

## Scope Reminder

This plan pack is not an implementation. A future agent should not begin coding from this document until the desired slice is selected.

## Recommended Implementation Sequence

Implementation must follow the selected strategy in `12-selected-ui-strategy-and-wireframe-contract.md`. Do not treat the earlier option lists as permission to choose a different layout without updating the decision record first.

### Slice 0 - Confirm Current Evidence

1. Re-open the target route.
2. Capture desktop and mobile screenshots.
3. Confirm current layout measurements.
4. Rerun code-review graph impact for exact files.
5. Retry GitNexus or document why it remains unavailable.

Required impact procedure:

1. Follow the GitNexus/code-review-graph gate in `02`.
2. If GitNexus works, run symbol-level `gitnexus_impact` before each edited function/class/component.
3. If GitNexus fails with the known CLI error, record the waiver and use code-review-graph `get_impact_radius`, `get_affected_flows`, and `detect_changes` as fallback evidence.
4. HIGH or CRITICAL impact stops implementation until the leader records risk and targeted tests.

Exit criteria: current visual problem is reproduced, source impact is known, and the first slice has red tests/assertions from `15-implementation-test-spec.md`.

### Slice 1 - Shell and Column Rebalance

Goal: make the receiver page use desktop width better without changing API or feature behavior.

Likely files:

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- possibly a new receiver shell component

Rules:

- Keep `SharePageDecision` and `SharePageComments` internals unchanged.
- Keep password/session behavior unchanged.
- Add tests only if roles/classes/landmarks materially change.
- Preserve public receiver route semantics and no-store behavior.
- Capture 1440px and 390px screenshots before and after.

### Slice 2 - Extract Estimate Workspace

Goal: split `SharePageTabs` before adding more features.

Likely files:

- `src/components/share/SharePageTabs.tsx`
- new `src/components/share/ShareEstimateWorkspace.tsx`
- new `src/components/share/ShareEstimateToolbar.tsx`
- new `src/components/share/ShareEstimateGridMode.tsx`
- new `src/components/share/ShareCostBreakdownPanel.tsx`

Rules:

- Preserve sessionStorage key `share-tab:${token}` unless intentionally migrated.
- Preserve sheet keyboard navigation.
- Preserve Tree/Grid per-sheet view mode behavior.
- Switch to `getBestShareTree` only with tests that prove old flat snapshots still work.
- Keep `SharePageTabs` as a compatibility wrapper until the new workspace is proven.

### Slice 3 - Chart and Mobile Reorder

Goal: make chart contextual and mobile-friendly.

Likely files:

- `ShareEstimateWorkspace`
- `ShareCostBreakdownPanel`
- `CostDonutChart` only if needed

Rules:

- Remove visible debug badge.
- Avoid regressing workshop chart usage.
- Validate mobile screenshots.
- On mobile, chart detail must be collapsed or placed after row access by default.

### Slice 4 - Search and Navigation

Goal: improve large estimate findability.

Likely files:

- `ShareEstimateToolbar`
- `ShareEstimateGridMode`
- `ShareEstimateTreePanel`
- `ShareEstimateTreeView`
- `src/lib/share/reconstruct-share-tree.ts` only if using `getBestShareTree`

Rules:

- Use `SearchInput`.
- Choose one desktop tree/scrollspy model.
- Preserve XSS-safe row rendering.

### Slice 5 - Response Rail Polish

Goal: make comments/decision fit the new layout without harming security.

Likely files:

- `page.tsx` or `ShareReceiverContextRail`
- `SharePageDecision.tsx`
- `SharePageComments.tsx`

Rules:

- Avoid API behavior changes unless explicitly scoped.
- Keep hidden/non-session states clear.
- Mobile sticky response must not overlap estimate rows.

## Suggested Agent Split for a Future Multi-Agent Run

| Agent | Responsibility | Write scope |
| --- | --- | --- |
| Explore | Refresh source and graph impact | Read-only |
| Designer | Update layout spec and screenshot acceptance | `.ai` docs only |
| Executor A | Shell/column rebalance | `page.tsx`, shell component |
| Executor B | Estimate workspace extraction | `src/components/share/Share*Estimate*` |
| Executor C | Chart/mobile refinement | chart wrapper and mobile layout |
| Verifier | Tests, screenshots, design lint | Read-only or test-only |

Do not parallelize agents across the same component file unless the leader owns integration.

## File Ownership and Merge Order

Use one integration owner for shared receiver files. Suggested ownership:

| Slice | Integration owner | Locked/shared files | Merge order |
| --- | --- | --- | --- |
| Slice 1 | Executor A | `src/app/share/[token]/page.tsx`, shell component, `SharePageSessionBanner.tsx` | merge before any `SharePageTabs` extraction |
| Slice 2 | Executor B | `SharePageTabs.tsx`, `ShareEstimateWorkspace.tsx`, toolbar/grid/tree extracted files | merge after Slice 1 screenshots pass |
| Slice 3 | Executor C under B/A review | `ShareCostBreakdownPanel.tsx`, chart wrapper, mobile layout classes | merge after workspace wrapper tests pass |
| Slice 4 | Executor A or dedicated response owner | `ShareReceiverContextRail`, `SharePageDecision.tsx`, `SharePageComments.tsx` | merge only after no-session/session tests exist |
| Slice 5 | Verifier or executor | route `loading.tsx`, `error.tsx`, empty state components | merge after security regression tests pass |

If two agents need the same file, pause one lane and let the integration owner make the shared-file patch. Do not merge parallel edits to `SharePageTabs.tsx`, `page.tsx`, or `ShareReceiverContextRail` without one owner reconciling behavior.

## Implementation Guardrails

- No new dependencies.
- No new schema in the first layout slice.
- No service-role access in public receiver route.
- No new public API route without security review.
- No landing-page typography or rounded styles.
- No cards inside cards.
- No decorative blobs/gradients/orbs.
- No hard-coded demo text in receiver UI.

## Explicit Anti-Patterns

Do not ship:

- chart before sheet tabs on mobile,
- empty 320px right rail for no-session links,
- duplicate left rail plus floating scrollspy for the same navigation job,
- nested cards or dashboard-card sprawl,
- hero/cover image pushing estimate rows out of the first viewport,
- dead sticky response bar when no recipient session exists,
- visible debug badges or development labels,
- feature-local generic buttons/inputs/tabs that duplicate shared primitives,
- legal approval wording for Accept/Decline/Revision responses,
- any layout that still reads as a centered document preview at 1440px+.

## Stop Conditions

Stop and re-plan if:

- graph impact reports critical risk,
- design-system constraints conflict with proposed layout,
- a route/security test fails due to changed public behavior,
- recipient session behavior becomes unclear,
- the layout fix requires schema/API changes.
