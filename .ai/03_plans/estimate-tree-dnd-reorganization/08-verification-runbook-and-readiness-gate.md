# 08 — Verification Runbook and Readiness Gate

Status: final pre-implementation gate for the estimate-tree drag/drop plan pack.
Last updated: 2026-05-20 19:59 PST.

This runbook defines how to prove the implementation is correct, efficient, seamless, and safe enough for review. The builder should copy this checklist into the implementation PR and mark each item with command output or a clear reason if unavailable.

## Readiness conclusion before implementation

The plan pack is implementation-ready only if the builder accepts these starting truths:

1. Fix `group` visibility and two-kind domain drift first.
2. Add pure reorder helpers before adding RCT DnD props.
3. Add atomic persistence before browser E2E can claim persistence.
4. Add authenticated Playwright setup before browser DnD claims are credible.
5. Prove no reload/no flicker with browser instrumentation, not visual impression.

If any of those are skipped, the feature can appear to work while still being wrong.

## Required command order

### 0. Branch and working tree

```bash
git branch --show-current
git status --short
```

Expected:

- branch is not `main`;
- unrelated changes are identified before coding;
- source code changes are limited to files named by the plan or justified in the PR.

### 1. Project context

```bash
bun --version
bun pm ls react-complex-tree
bun pm ls next react react-dom @tanstack/react-query zustand
```

Expected:

- `react-complex-tree` resolves to 2.6.1 unless the branch deliberately updates the package and re-audits API usage;
- Next/React versions match the current project package baseline or are intentionally changed in a separate dependency PR.

If `bun pm ls` output shape differs, use:

```bash
bun install --frozen-lockfile
node -p "require('./node_modules/react-complex-tree/package.json').version"
```

### 2. GitNexus index and impact analysis

Before editing symbols:

```bash
npx gitnexus status
```

If stale:

```bash
npx gitnexus analyze --index-only --name archestimator
```

Before modifying each major symbol/file, run impact analysis:

```bash
npx gitnexus impact -r archestimator --include-tests isDisplayNodeKind --direction upstream
npx gitnexus impact -r archestimator --include-tests buildEstimateTree --direction upstream
npx gitnexus impact -r archestimator --include-tests canNestEstimateNodeKind --direction upstream
npx gitnexus impact -r archestimator --include-tests EstimateSheetTree --direction upstream
npx gitnexus impact -r archestimator --include-tests createEstimateNode --direction upstream
npx gitnexus impact -r archestimator --include-tests fetchEstimateTree --direction upstream
```

Expected:

- no HIGH/CRITICAL impact is ignored;
- if impact is HIGH/CRITICAL, builder pauses and records the blast radius in the PR before editing;
- graph blind spots for Next server actions are noted instead of treated as zero risk.

Before committing:

```bash
npx gitnexus detect-changes -r archestimator
```

Expected:

- detected changes match planned route/domain/test scope;
- unexpected flows are reviewed or reverted before commit.

## Implementation slice gates

### Gate A — Two-kind domain and read-path fix

Minimum changed files:

- `src/lib/estimates/tree-hierarchy.ts`
- `src/lib/domain/estimate-tree.ts` or related view-model typing file
- `src/components/workshop/estimate-tree-data.ts`
- `src/components/workshop/EstimateSheetTree.tsx` add-node form/type imports
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/supabase/types.ts` if DB enum/function types changed
- Supabase migration file if data normalization/enforcement is added
- relevant tests

Type regeneration after migration changes:

```bash
# local migrated DB
npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts

# remote project, only when intentionally regenerating from linked remote
npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts
```

Targeted checks:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-data.test.ts
bun run test:dom -- tests/vitest/live-estimate-node-route.test.ts
bun run test:dom -- tests/vitest/supabase-performance-migrations.test.ts
```

Expected functional proof:

- every rendered estimate tree node has `kind` `group` or `area`;
- newly created Group Nodes remain visible after repository fetch;
- `isDisplayNodeKind` accepts `group` and `area` only;
- tests fail if `lot`, `general`, `structure`, `level`, or `assembly` remain active technical estimate-node kinds;
- `readEstimateNodeKind` rejects legacy `general` form input;
- canonical nested view-model type is `EstimateTreeNode`;
- hierarchy tests assert root -> `group`, `group` -> `group|area`, `area` -> none.

Do not proceed to RCT drag/drop until Gate A passes.

### Gate B — Pure reorder helper

Minimum changed files:

- `src/lib/estimates/tree-reorder.ts`
- `tests/vitest/estimate-tree-reorder.test.ts`

Type regeneration after migration changes:

```bash
# local migrated DB
npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts

# remote project, only when intentionally regenerating from linked remote
npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts
```

Targeted checks:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-reorder.test.ts
```

Expected proof:

- all valid/invalid cases in `07-implementation-reference.md` pass;
- helper does not import React/Next/Supabase/router/server-action modules;
- helper produces deterministic `updates` payload;
- no-op returns no persistence payload;
- RCT `item`, `between-items`, and `root` targets are translated correctly.

### Gate C — Atomic persistence

Minimum changed files:

- new migration after `20260520100459_remove_estimate_node_move_rpc.sql`
- `src/lib/supabase/types.ts`
- `src/lib/estimates/actions.ts`
- server action/migration tests

Type regeneration after migration changes:

```bash
# local migrated DB
npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts

# remote project, only when intentionally regenerating from linked remote
npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts
```

Targeted checks:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-node-reorder-action.test.ts
bun run test:dom -- tests/vitest/supabase-performance-migrations.test.ts
```

Expected proof:

- new RPC/function name is `reorder_estimate_nodes` unless the PR explains another deliberate new name;
- old `move_estimate_nodes` removal migration remains historically true;
- action calls one RPC for a valid move;
- action does not redirect;
- action returns `{ tree: EstimateTreeNode[] }`, where `tree` is the confirmed fresh nested tree consumed by the client;
- database validates caller authorization, scope, duplicates, hierarchy, cycles, and update count;
- if the RPC uses `SECURITY DEFINER`, direct RPC access by a non-member is rejected by an explicit `auth.uid()` workspace-membership check.

### Gate D — RCT optimistic client integration

Minimum changed files:

- `src/components/workshop/EstimateSheetTree.tsx`
- possibly `src/components/workshop/EstimateWorkspaceClientBoundary.tsx` only if the conditional shared-state path is triggered
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- updated route/source tests that previously asserted DnD was absent

Type regeneration after migration changes:

```bash
# local migrated DB
npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts

# remote project, only when intentionally regenerating from linked remote
npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts
```

Targeted checks:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-sheet-tree-dnd.test.tsx
bun run test:dom -- tests/vitest/estimate-tree-modal.test.tsx
bun run test:dom -- tests/vitest/live-estimate-node-route.test.ts
```

Expected proof:

- valid drop changes DOM order before server promise resolves;
- failure rolls back;
- invalid drop does not call server action;
- selected/focused/expanded state is stable by id;
- stale route props do not overwrite the action-returned confirmed tree after `moveState` returns to idle;
- `estimateQueryKeys.areaTree(estimateId)` cache mirrors optimistic, success, and rollback state;
- named component regression exists for `canInvokePrimaryActionOnItemContainer`: dropping must not call `router.push`/`router.refresh` on valid, invalid/no-op, success, or rollback paths;
- `router.push` and `router.refresh` are not called by drop, including with `canInvokePrimaryActionOnItemContainer` enabled;
- `role="status"` communicates saving/error state;
- RCT DnD props are configured in controlled mode.

### Gate E — Authenticated browser/E2E proof

Minimum changed files:

- `playwright.config.ts` or separate Playwright setup file
- `e2e/estimate-tree-dnd.spec.ts`
- optional seed/test data helper

Targeted checks:

```bash
bun run test:e2e -- e2e/auth.spec.ts
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_EMAIL=e2e@archestimator.local \
bun run test:e2e -- e2e/estimate-tree-dnd.spec.ts
```

Expected proof:

- signed-out auth behavior still passes;
- authenticated DnD route does not redirect to `/login`;
- mutating tests use isolated/cloned/reset estimate data, not the shared manual-QA target estimate;
- valid moves update visually immediately;
- reload proves persistence;
- invalid moves do not persist;
- browser instrumentation records no full document navigation during drop;
- browser instrumentation records zero blank tree frames during drag/drop window;
- URL and selected route remain unchanged during the drop action window unless a separate post-drop click/keyboard primary action is performed;
- DnD spec is first proven locally with retries disabled; any retry-only pass remains an open risk, not final proof. See `04-testing-browser-qa-plan.md` and `11-final-assessment-hardening-notes.md` for the flake/retry policy.

## Full final validation

Run before final review:

```bash
bun run type-check
bun run lint
bun run lint:font-size
bun run test
bun run test:dom
bun run test:e2e
npx gitnexus detect-changes -r archestimator
git status --short
git diff --stat
```

Expected:

- all commands pass;
- if any command is unavailable due to local environment, PR explicitly says why and provides the nearest targeted substitute;
- `git status --short` contains only intentional implementation/docs/test files;
- GitNexus detected scope is expected;
- no secrets or environment files are staged.

## Quantified success metrics

### Functional metrics

All must be true:

1. 100% of active tree nodes render after Gate A; no Group Nodes disappear due to `isDisplayNodeKind`.
2. 100% of active technical node kinds in TypeScript/source fixtures are `group | area`.
3. 100% of valid unit move cases produce deterministic `nextNodes` and `updates`.
4. 100% of invalid unit move cases return `ok: false` and produce no persistence payload.
5. 100% of valid browser moves tested persist after reload.
6. 0 known paths call old `moveEstimateNode` or `move_estimate_nodes` from the new DnD implementation.
7. 0 row items move to non-area nodes.
8. 0 cycles can be produced by client helper, server action, or DB function.

### UX/seamlessness metrics

All must be true on the target or isolated seeded route:

1. Visual order/depth changes within 100 ms after drop in Playwright measurement.
2. 0 document requests during the drag/drop action window, excluding initial page load and explicit reload assertions.
3. 0 main-frame navigations during drop.
4. 0 frames where the tree container is missing during drag/drop sampling.
5. 0 frames where rendered tree node count is 0 during drag/drop sampling after initial load.
6. 0 `/login` flashes during authenticated DnD tests.
7. CLS during the drop sampling window <= 0.02 on seeded tree.
8. No global page spinner or blocking overlay appears for a simple reorder.

### Engineering metrics

All must be true:

1. `tree-reorder.ts` stays pure and unit-tested.
2. The server action performs exactly one atomic RPC for a valid move.
3. The RPC/function updates all rows in one transaction/function call.
4. Component tests cover success, rollback, invalid drop, no-op drop, and no router refresh.
5. Playwright covers at least one root reorder, one same-parent reorder, one group reparent, one area reparent, one invalid area-parent drop, and one invalid cycle/self scenario.
6. Full final validation commands pass or have documented environment-specific substitutes.

## Browser instrumentation snippets

### No document navigation

```ts
const initialUrl = page.url();
const documentRequests: string[] = [];
const mainFrameNavigations: string[] = [];

page.on("request", (request) => {
  if (request.resourceType() === "document") documentRequests.push(request.url());
});

page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) mainFrameNavigations.push(frame.url());
});

// perform drag/drop

await page.waitForTimeout(500);
expect(page.url()).toBe(initialUrl);
expect(documentRequests).toHaveLength(0);
expect(mainFrameNavigations.filter((url) => url !== initialUrl)).toHaveLength(0);
```

### Blank/flicker frame sampler

```ts
await page.evaluate(() => {
  window.__estimateTreeFrames = [];
  let running = true;
  const frames: Array<{ t: number; treeExists: boolean; nodeCount: number; loginVisible: boolean }> = [];

  function sample() {
    if (!running) return;
    const tree = document.querySelector('[data-estimate-tree-root="true"]');
    const nodeCount = document.querySelectorAll('[data-estimate-tree-node-id]').length;
    const loginVisible = document.body.textContent?.includes("Sign in to workshop") ?? false;
    frames.push({ t: performance.now(), treeExists: Boolean(tree), nodeCount, loginVisible });
    requestAnimationFrame(sample);
  }

  requestAnimationFrame(sample);
  window.__stopEstimateTreeSampling = () => {
    running = false;
    window.__estimateTreeFrames = frames;
  };
});

// perform drag/drop

await page.waitForTimeout(800);
await page.evaluate(() => window.__stopEstimateTreeSampling?.());
const frames = await page.evaluate(() => window.__estimateTreeFrames);
expect(frames.length).toBeGreaterThan(0);
expect(frames.every((frame) => frame.treeExists)).toBe(true);
expect(frames.every((frame) => frame.nodeCount > 0)).toBe(true);
expect(frames.every((frame) => !frame.loginVisible)).toBe(true);
```

### Optimistic latency marker

```ts
const dropStart = await page.evaluate(() => performance.now());
// perform drop
await expect(firstMovedNode).toHaveAttribute("data-estimate-tree-node-id", expectedNodeId);
const dropEnd = await page.evaluate(() => performance.now());
expect(dropEnd - dropStart).toBeLessThanOrEqual(100);
```

If Playwright drag timing is noisy, use this metric as a diagnostic, not the sole pass/fail criterion. The hard pass/fail is immediate visible update before server success/reload.

## Manual QA script

After automated tests pass:

1. Start app with the authenticated local environment.
2. Open the target route.
3. Expand all tree nodes.
4. Drag a root Group Node before another root Group Node.
5. Confirm no page flash and no route change.
6. Reload and confirm order persists.
7. Drag an Area Node under a different Group Node.
8. Select that Area Node and confirm row items remain visible.
9. Attempt to drag a Group Node into an Area Node; confirm no move occurs.
10. Attempt to drag a parent into one of its descendants; confirm no move occurs.
11. Click around the sheet and tree after several moves; confirm selection/expansion/focus feel stable.
12. Check browser console for unhandled errors/warnings.

## PR evidence template

Use this exact structure in the implementation PR:

```txt
What changed
- ...

Why
- ...

Blast radius
- GitNexus impact commands run:
- High/critical findings and response:

Validation
- bun run type-check: pass/fail
- bun run lint: pass/fail
- bun run lint:font-size: pass/fail
- bun run test: pass/fail
- bun run test:dom: pass/fail
- bun run test:e2e: pass/fail
- targeted DnD tests: pass/fail
- browser no-reload proof: pass/fail
- browser no-flicker proof: pass/fail

Changed files
- ...

Risks / unresolved
- ...

Rollback
- ...
```

## Final readiness gate

Do not call the implementation complete unless every answer below is yes:

- Did the codebase collapse to the two active technical kinds before enabling DnD?
- Are existing labels preserved as names/metadata instead of kinds?
- Does the repository read path display `group` nodes?
- Does the pure helper reject invalid moves before visual acceptance?
- Does the server action repeat critical validation?
- Does the database function enforce atomicity and hierarchy?
- Does RCT controlled state update optimistically with no refresh?
- Are invalid drops blocked by `canDropAt` and checked again in `onDrop`?
- Does browser QA prove no reload/no blank tree frames?
- Do selected/focused/expanded states survive by stable node ids?
- Are row items still attached only to Area Nodes?
- Did GitNexus detect only expected affected flows?
- Did the final validation commands pass?

If any answer is no, the feature is not done.
