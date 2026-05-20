# 09 — Independent Review and Hygiene Memo

Status: post-review corrections applied.
Review date: 2026-05-20.
Scope: `.ai/03_plans/estimate-tree-dnd-reorganization` plan pack and the Archestimator React Complex Tree skill payload.

## Review method

Two read-only reviewer agents checked the revised plan pack:

1. Codebase factual accuracy and implementation readiness.
2. React Complex Tree v2.6.1 API correctness, state management, no-reload/no-flicker UX, and browser test adequacy.

A final read-only approval reviewer then checked the staged plan diff after corrections. That reviewer found one remaining keyboard-shortcut mismatch, which is recorded and corrected below.

A local hygiene pass also scanned for:

- unbalanced markdown code fences;
- stale names from the removed implementation path;
- incorrect React Complex Tree root ids;
- stale item-data label accessor snippets;
- stale undefined RPC return typing;
- unresolved placeholder markers.

## Blocking findings from independent review

### Finding 1 — Synthetic root id mismatch

Reviewer finding:

- `07-implementation-reference.md` used the wrong synthetic-root constant value, namely the generic root string instead of the existing estimate-tree root id.
- Current `EstimateSheetTree.tsx` uses `ROOT_ITEM_ID = "estimate-tree-root"`.
- `02-react-complex-tree-api-guide.md` also documented `"estimate-tree-root"`.

Why this mattered:

RCT `between-items` drops at root report `target.parentItem` equal to the tree's `rootItem`. If the helper compared against `"root"`, a root drop would be translated as `parentId: "estimate-tree-root"` instead of `parentId: null`.

Correction applied:

- `07-implementation-reference.md` now sets `ESTIMATE_TREE_ROOT_ID = "estimate-tree-root"`.
- It explicitly requires the component and helper to share the same root id.

### Finding 2 — RPC authorization could be bypassed if implemented as a broad SECURITY DEFINER function

Reviewer finding:

- The plan originally recommended a `SECURITY DEFINER` RPC granted to `authenticated` without requiring a DB-level workspace-membership check.
- The server action had project/estimate checks, but authenticated clients can call granted Supabase RPCs directly.

Why this mattered:

A privileged definer function can bypass RLS unless it performs its own authorization check. For this feature, direct RPC calls must not allow a user to reorder nodes for a known estimate UUID outside their workspace.

Correction applied:

- `07-implementation-reference.md` now recommends `SECURITY INVOKER` by default so RLS remains active.
- If a definer function is required, the document now mandates an explicit `auth.uid()` workspace-membership check through `estimates -> projects -> workspace_members` before any update.
- `03-implementation-plan.md`, `05-rollout-and-commit-plan.md`, and `08-verification-runbook-and-readiness-gate.md` now require this DB-boundary authorization proof.

### Finding 3 — Client snippet referenced a nonexistent label field on item data

Reviewer finding:

- `07-implementation-reference.md` used a `getItemTitle` callback that read a nonexistent label field from `item.data`.
- Current and planned `EstimateTreeItemData` shape is `{ node: EstimateAreaNode | null }`.

Why this mattered:

The reference document is the implementation contract. Copying that snippet would fail type-check.

Correction applied:

- `07-implementation-reference.md` now uses:

```tsx
getItemTitle={(item) => item.data.node?.name ?? projectName}
```

This matches `EstimateSheetTree.tsx` and `02-react-complex-tree-api-guide.md`.

### Finding 4 — Optimistic success could snap back to stale route props

Reviewer finding:

- The original reconciliation snippet synced `setOptimisticNodes(nodes)` whenever `moveState !== "saving"`.
- On action success, the code set `setOptimisticNodes(result.tree)` and then `setMoveState("idle")`.
- If route props were still stale, the effect could immediately overwrite the confirmed tree with old props.

Why this mattered:

This is exactly the type of flicker/stale-tree behavior the feature must prevent.

Correction applied:

- `02-react-complex-tree-api-guide.md`, `03-implementation-plan.md`, and `07-implementation-reference.md` now require a local confirmed tree signature/version guard.
- On success, implementation must store the signature of the action-returned tree before clearing saving state.
- The reconciliation effect must ignore stale incoming `nodes` props until they match the confirmed tree or no local confirmed mutation is waiting to converge.
- `04-testing-browser-qa-plan.md` and `08-verification-runbook-and-readiness-gate.md` now require tests that stale props do not snap the DOM back after success.

### Finding 5 — Keyboard DnD shortcut used the wrong React Complex Tree default

Final approval reviewer finding:

- `02-react-complex-tree-api-guide.md` described programmatic keyboard DnD as starting with the two-key Control-D shortcut.
- Installed `react-complex-tree` v2.6.1 default bindings use `control+shift+d` for `startProgrammaticDnd`, `enter` for completion, and `escape` for abort.

Why this mattered:

Keyboard DnD tests or accessibility instructions based on the wrong shortcut would fail in browser QA unless the implementation explicitly overrides `keyboardBindings`.

Correction applied:

- `02-react-complex-tree-api-guide.md` now cites the installed default binding source in `node_modules/react-complex-tree/lib/*/hotkeys/defaultKeyboardBindings.js`.
- The guide now documents `Ctrl + Shift + D` as the default user shortcut and allows a different shortcut only if implementation deliberately overrides `keyboardBindings`.

## Additional hygiene corrections

- Standardized the new server action name to `reorderEstimateTreeNodes`.
- Standardized the new RPC name to `public.reorder_estimate_nodes`.
- Standardized the new action test file name to `tests/vitest/estimate-node-reorder-action.test.ts`.
- Standardized the optional DB integration test file name to `tests/vitest/estimate-node-reorder-db.test.ts`.
- Renamed helper contract types from `Move` terminology to `Reorder` terminology in the implementation reference.
- Kept historical mentions of `move_estimate_nodes` only where the documents discuss the old removed migration/path.
- Preserved the distinction between user-facing drag/drop moves and implementation names using `reorder` for persistence contracts.

## Final hygiene scan result

The local scan found:

- 0 unbalanced markdown code fences.
- 0 stale item-data label accessor snippets.
- 0 wrong synthetic-root constant snippets.
- 0 stale undefined RPC return snippets.
- 0 stale old move-handler callback snippets.
- 0 stale old move-action or move-db test file references.
- 0 unresolved placeholder markers in the plan pack.

Remaining `move` terminology is intentional when it describes:

- drag/drop movement as user behavior;
- historical removed `move_estimate_nodes` migration/function;
- current tests that assert the old DnD path is absent;
- RCT `canMove` type properties.

## Readiness verdict

PASS after corrections.

The plan pack now resolves the independent review blockers and is suitable for the first implementation slice, provided implementation follows Gate A in `08-verification-runbook-and-readiness-gate.md` before enabling React Complex Tree drag/drop.

The first implementation slice must not start with UI drag/drop. It must start with the two-kind domain/read-path correction because current `isDisplayNodeKind` still filters out `group` nodes while the creation path writes `group`.
