# 04 — Testing and Browser QA Plan

Goal: prove the drag/drop estimate-tree reorganization is correct, persistent, accessible, and seamless.

The main failure class to prevent is “looks like drag/drop works but the app reloads, flickers, loses route/selection state, or persists an invalid hierarchy.”

## Test pyramid

1. Pure unit tests for tree move planning.
2. Component tests for RCT integration and optimistic state.
3. Server/database tests for atomic persistence and hierarchy validation.
4. Playwright tests for actual browser drag/drop and no-flicker/no-reload behavior.
5. Manual exploratory QA on the target route.

## Baseline already verified during planning

Command:

```bash
bun run type-check && bun run test:dom -- tests/vitest/estimate-tree-modal.test.tsx tests/vitest/live-estimate-node-route.test.ts tests/vitest/supabase-performance-migrations.test.ts
```

Result:

- TypeScript passed.
- 3 Vitest files passed.
- 15 tests passed.

This is a baseline only. It does not validate the future feature.

## Unit tests: tree reorder domain

New file:

- `tests/vitest/estimate-tree-reorder.test.ts`

Target helper:

- `src/lib/estimates/tree-reorder.ts`

### Fixtures

Create a compact fixture that mirrors real hierarchy:

```txt
General Requirements (group/root)
Site Works (group/root)
Lot (lot/root)
  House (structure)
    Ground Floor (level)
      Show Kitchen (area, has rows)
      Living Room (area, has rows)
    Roof + Attic (group)
  Services House (group)
```

Use stable ids that are easy to read in failures.

### Required unit cases

1. Root sibling reorder
   - Move `Site Works` before `General Requirements`.
   - Assert root order changes.
   - Assert both keep `parentId: null`.
   - Assert root sibling sort orders are unique and deterministic.

2. Same-parent sibling reorder
   - Move `Show Kitchen` after/before `Living Room` under `Ground Floor`.
   - Assert only `Ground Floor.children` order changes.
   - Assert row items stay attached to `Show Kitchen`.

3. Reparent group into group
   - Move `Roof + Attic` inside `Services House`.
   - Assert subtree is preserved.
   - Assert old and new siblings are renormalized.

4. Reparent area into group
   - Move `Show Kitchen` under `Site Works`.
   - Assert allowed.
   - Assert `Show Kitchen.items` unchanged.

5. Reject area as parent
   - Try dropping `Living Room` inside `Show Kitchen`.
   - Assert evaluation returns invalid.
   - Assert no next tree or updates are produced.

6. Reject area at root
   - Try moving `Show Kitchen` to root.
   - Assert invalid because `canNestEstimateNodeKind("area", null)` is false.

7. Reject cycle
   - Try moving `House` inside `Ground Floor` or `Show Kitchen`.
   - Assert invalid.

8. Reject self-drop
   - Try dropping `House` inside `House`.
   - Assert invalid.

9. Reject unknown dragged node
   - Use missing id.
   - Assert invalid and no persistence payload.

10. Reject unknown target
   - Use `DraggingPosition.item` target id that is not in tree.
   - Assert invalid.

11. No-op detection
   - Drop node to same parent/same index.
   - Assert invalid/no-op or explicit no-op response.
   - Assert server mutation should not be called.

12. RCT target translation
   - `targetType: "item"` maps to inside target folder.
   - `targetType: "between-items"` maps to parent/index.
   - `targetType: "root"` maps to `parentId: null`.

13. Multi-drag policy
   - Multiple dragged ids should be rejected for MVP.

14. Sort order payload
   - All affected siblings get unique `sortOrder` values.
   - Unaffected branches do not get updates.

15. Object/key stability
   - Node ids are unchanged.
   - Moved node subtree ids are unchanged.

### Unit acceptance

- The pure helper must not import React.
- The pure helper must not call server actions.
- The pure helper must be deterministic for the same input.

## Component tests: RCT integration

New file:

- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

Current component test file to preserve/update:

- `tests/vitest/estimate-tree-modal.test.tsx`

### Mocks

Mock Next router:

```ts
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
```

Mock move action or inject a fake `onMoveNodes` prop.

Use deferred promises to test optimistic behavior before server resolution.

### Required component cases

1. DnD capability props are active
   - Prefer behavior assertion; if string inspection remains, assert positive presence only as secondary.
   - Validate rendered tree contains draggable-capable rows if RCT exposes attributes.

2. Valid drop calls move action once
   - Trigger the extracted drop handler if direct browser DnD is too brittle in JSDOM.
   - Assert action receives normalized updates with `id`, `parentId`, and `sortOrder`.

3. Optimistic order before server resolves
   - Defer server action promise.
   - Trigger valid drop.
   - Assert DOM order changes before promise resolution.
   - Assert a saving status appears without replacing the tree.

4. Successful persistence keeps order
   - Resolve promise with returned tree or move result.
   - Assert DOM remains in moved order.
   - Assert `router.push` and `router.refresh` were not called.

5. Failure rolls back
   - Reject promise.
   - Assert DOM returns to prior order.
   - Assert error status appears.
   - Assert selected/expanded state remains stable.

6. Invalid drop blocked
   - Simulate area-as-parent or cycle target.
   - Assert action not called.
   - Assert DOM unchanged.

7. Drop does not activate route navigation
   - Start with selected route node.
   - Drop another node.
   - Assert URL/router push not called.

8. Expansion persistence
   - Collapse/expand a group.
   - Move a sibling.
   - Assert explicit expansion state is not reset.

9. Saving state serializes/blocks second move for MVP
   - While first move pending, attempt second move.
   - Assert second action is not fired or is queued, depending implementation choice.

### Component acceptance

- JSDOM tests can exercise extracted handlers and state; do not rely on them as the only proof of real pointer DnD.
- Playwright must cover real drag/drop behavior.

## Server action tests

New file options:

- `tests/vitest/estimate-node-move-action.test.ts`
- or colocate with existing action tests if a pattern exists.

### Cases

1. Project-scoped estimate ownership
   - Action verifies `projectId` and `estimateId` match an accessible project/estimate.
   - Use the same `estimates!inner` / `.eq("estimates.project_id", project.id)` style found in existing actions/repository.

2. Update payload validation
   - Empty updates rejected.
   - Duplicate ids rejected.
   - Negative/non-integer sort orders rejected.
   - Unknown parent ids rejected.

3. Hierarchy validation
   - Area as parent rejected.
   - Area at root rejected.
   - Descendant/cycle rejected.

4. Atomic RPC call
   - Supabase client `.rpc("reorder_estimate_nodes", ...)` called once.
   - Payload uses `parent_id` and `sort_order` names expected by SQL.
   - No per-row client update loop.

5. Return shape
   - Action returns fresh tree or normalized success result.
   - Action does not call `redirect()`.

6. Revalidation policy
   - If `revalidatePath` is used, action still returns data and client does not need `router.refresh()`.

## Migration/database tests

Existing file:

- `tests/vitest/supabase-performance-migrations.test.ts`

Add/adjust tests:

1. Historical removal migration remains true
   - Keep test that `20260520100459_remove_estimate_node_move_rpc.sql` drops old `move_estimate_nodes`.

2. New migration reintroduces deliberate reorder function
   - Assert the new migration creates `reorder_estimate_nodes` (or chosen name).
   - Assert it validates payload is JSON array.
   - Assert it locks/updates affected nodes atomically.
   - Assert it checks duplicate ids and duplicate sibling sort orders.
   - Assert it rejects cross-estimate parents.
   - Assert it uses/relies on hierarchy validation.
   - Assert grant to authenticated if expected.

3. TypeScript/db hierarchy alignment
   - Keep tests that compare SQL hierarchy logic with `canNestEstimateNodeKind`.
   - Update if the SQL uses a helper function or constraint trigger name.

Optional integration suite:

- `tests/vitest/estimate-node-move-db.test.ts`
- Gate behind `RUN_SUPABASE_INTEGRATION=1`.
- Run against local Supabase/CI test database.
- Use DB reset or cloned seed estimate per test.

Integration cases:

- Valid root reorder persists.
- Valid area reparent persists.
- Invalid area parent is rejected by DB.
- Duplicate sort order rejected.
- Cycle rejected.

## Playwright E2E tests

New file:

- `e2e/estimate-tree-dnd.spec.ts`

Optional helpers:

- `e2e/fixtures/estimate-tree.ts`
- `e2e/utils/perf-instrumentation.ts`

### Auth setup

Current browser navigation to target route redirects to login. Add authenticated project/config.

Use dev auth code already present:

- `src/lib/auth/dev-auth.ts`
- `src/lib/auth/dev-auth-gate.ts`

Candidate env:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
ARCHESTIMATOR_DEV_AUTH_EMAIL=e2e@archestimator.local
```

Do not commit secrets or real keys. If a profile row is needed, create it in Playwright global setup using environment secrets.

Keep `e2e/auth.spec.ts` for signed-out behavior.

### Stable route/data

Target route provided by user:

```txt
/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729
```

Use stable seed ids from `supabase/seed.sql` if available. For mutating tests, avoid corrupting the shared seed:

Preferred:

- Clone seed estimate/tree into a per-test estimate id.
- Or reset local DB before/after suite.
- Or keep a dedicated e2e estimate branch of data.

Do not run mutating DnD tests in parallel against the same estimate unless isolated.

### Browser cases

1. Authenticated route loads
   - Visit target route or cloned test route.
   - Assert no `/login` redirect.
   - Assert tree has expected node titles.

2. Root sibling reorder
   - Drag one root node before another.
   - Assert visual order updates immediately.
   - Assert no document navigation.
   - Reload page.
   - Assert order persists.

3. Same-parent reorder
   - Expand parent if needed.
   - Drag one area before another under same parent.
   - Assert order updates and persists.

4. Reparent group
   - Drag a group node inside another group.
   - Assert indentation/depth changes.
   - Assert subtree remains visible/expandable.
   - Reload and assert persisted nesting.

5. Reparent area
   - Drag an area under a valid group.
   - Open/select the area.
   - Assert row items remain attached.
   - Reload and assert rows still attached.

6. Invalid area-as-parent
   - Try to drag a group/area into an area node.
   - Assert no visual move.
   - Assert no persistence request/action fired.

7. Invalid cycle
   - Try to drag a parent into a descendant.
   - Assert blocked.

8. Failure rollback
   - Use a test-only failure hook or interceptable action endpoint if available.
   - Trigger valid-looking drop that server rejects.
   - Assert rollback and accessible error.

9. Keyboard DnD smoke
   - Use RCT keyboard drag where feasible:
     - focus item
     - `Control+D`
     - arrows
     - `Enter`
   - Assert same no-reload/optimistic behavior.

## No-reload instrumentation

Add this in Playwright before drag:

```ts
const documentRequests: string[] = [];
page.on("request", (request) => {
  if (request.resourceType() === "document") documentRequests.push(request.url());
});

const navigations: string[] = [];
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) navigations.push(frame.url());
});
```

After drag:

```ts
expect(documentRequests).toHaveLength(0);
expect(navigations.filter((url) => !url.includes(initialUrl))).toHaveLength(0);
expect(page.url()).toBe(initialUrl);
```

Use a short grace period after drop to catch delayed refreshes:

```ts
await page.waitForTimeout(500);
```

Avoid long blind sleeps except for instrumentation windows. Prefer waiting on visible/status conditions.

## Flicker/blank instrumentation

Inject a MutationObserver/frame sampler around the tree container.

Candidate helper:

```ts
await page.addInitScript(() => {
  window.__estimateTreeFrames = [];
});

await page.evaluate(() => {
  const container = document.querySelector('[data-estimate-tree-root="true"]') || document.querySelector('[aria-label*="estimate areas"]');
  const frames = [];
  let running = true;
  function sample() {
    if (!running) return;
    const tree = document.querySelector('[data-estimate-tree-root="true"]') || document.querySelector('[aria-label*="estimate areas"]');
    const nodeCount = document.querySelectorAll('[data-estimate-tree-node-id]').length;
    const loginVisible = document.body.textContent?.includes('Sign in to workshop') ?? false;
    frames.push({
      t: performance.now(),
      treeExists: Boolean(tree),
      nodeCount,
      loginVisible,
    });
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
  window.__stopEstimateTreeSampling = () => { running = false; window.__estimateTreeFrames = frames; };
});
```

After drop window:

```ts
await page.waitForTimeout(800);
await page.evaluate(() => window.__stopEstimateTreeSampling?.());
const frames = await page.evaluate(() => window.__estimateTreeFrames);
expect(frames.every((frame) => frame.treeExists)).toBe(true);
expect(frames.every((frame) => frame.nodeCount > 0)).toBe(true);
expect(frames.every((frame) => !frame.loginVisible)).toBe(true);
```

Add a stable tree root selector in implementation if needed:

```tsx
<div data-estimate-tree-root="true">...</div>
```

## Layout shift/performance instrumentation

Optional but recommended for “seamless”:

```ts
await page.evaluate(() => {
  window.__estimateTreeLayoutShifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__estimateTreeLayoutShifts.push(entry.value);
    }
  }).observe({ type: "layout-shift", buffered: true });
});
```

Acceptance:

- No document navigation.
- Zero blank tree frames.
- CLS during drop window <= 0.02 on seed tree.
- Optimistic visual update within 100 ms of drop.
- No long task > 50 ms on seed tree if `longtask` observer is available.

## Selectors to preserve/add

Already exists:

- `data-estimate-tree-node-id`
- `data-estimate-tree-active-node`

Add if needed:

- `data-estimate-tree-root="true"`
- `data-estimate-tree-drop-line="true"`
- `data-estimate-tree-dragging-over="true"`
- `data-estimate-tree-moving="true"`
- `role="status"` with text like `Saving tree order...`, `Tree order saved`, `Could not move node`.

Selectors should not be visually noisy.

## Validation commands

Targeted during development:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-reorder.test.ts
bun run test:dom -- tests/vitest/estimate-sheet-tree-dnd.test.tsx
bun run test:dom -- tests/vitest/estimate-node-move-action.test.ts
bun run test:dom -- tests/vitest/supabase-performance-migrations.test.ts
bun run test:e2e -- e2e/estimate-tree-dnd.spec.ts
```

Full before final:

```bash
bun run type-check
bun run lint
bun run lint:font-size
bun run test
bun run test:dom
bun run test:e2e
```

## Pass/fail criteria

### Functional pass

- Valid moves update the UI immediately.
- Valid moves persist and survive reload.
- Invalid moves are visibly rejected or simply not accepted.
- Row items remain attached to their area nodes.
- Hierarchy rules match server and DB.

### UX pass

- No full-page reload.
- No blank/flicker frames.
- No `/login` flash.
- No route change from drop.
- Selection/focus/expansion remain stable.
- Saving/failure state is visible and non-blocking.

### Engineering pass

- Pure helper tests cover target translation and validation.
- Server action validates ownership and does one atomic persistence call.
- Migration adds deliberate new persistence function after prior removal.
- Existing tests updated intentionally; no brittle absence assertions remain as primary coverage.
- Full validation gates pass.
