# UNIT-004 Execution Addendum

This addendum is the current execution source for `UNIT-004`, `AC-004`, and `TEST-004`. It closes one callback-boundary omission found during current-source preflight. Where this addendum conflicts with the UNIT-004 owned-path or adapter wording in `IMPLEMENTATION_PLAN.md`, this addendum controls; other unit contracts and frozen receipts remain unchanged.

## Scope correction

`ComponentLibraryManager.moveComponentToFolder()` is awaited by `LibraryFolderTree.handleComponentDrop()`, which currently selects the attempted target and reports saved/error state solely from promise resolution. A stale outcome handled only inside the manager therefore still leaks stale selection/status through the outer caller.

Add one narrowly owned path:

- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (callback outcome typing and stale-outcome consumption only)

The complete owned path set is the replacement coordinator, both existing adapters, this outer callback consumer, and `tests/vitest/per-item-mutation-queue.test.ts`.

## Exact coordinator contract

Create a framework-free `createComponentFolderMoveCoordinator()` whose `move()` accepts `componentId`, `currentConfirmedFolderId`, `targetFolderId`, and an async `persist` callback. It resolves—not rejects—with one discriminated outcome:

- `latest-success`: advance confirmed state; keep the optimistic target.
- `stale-success`: advance confirmed state; keep the newer optimistic target and suppress stale UI feedback.
- `stale-failure`: leave confirmed state unchanged; keep the newer optimistic target and suppress stale UI feedback while retaining the error in the outcome.
- `latest-failure`: leave confirmed state unchanged; request rollback to the authoritative confirmed target and retain the error.

Every outcome includes attempted target, authoritative confirmed target, and `optimisticAction: "keep" | "rollback"`.

Per component, the coordinator owns the serialized tail, monotonic generation, latest generation, confirmed folder, and pending count. Seed confirmed state only for the first move in an active burst, ignore later caller seeds until the burst drains, swallow an earlier persistence rejection only in the queue tail so successors still execute, and delete state when pending reaches zero.

## Adapter and outer-caller behavior

1. The sidebar and manager each own one coordinator instance per mounted adapter. Remove their local queue/generation/confirmed refs and stale-result branches.
2. Both retain permission checks and optimistic cache/local writes. Only `latest-failure` rolls back, guarded so it cannot overwrite a different newer optimistic target.
3. Stale outcomes produce no toast, selection, saved/error status, or redundant refresh. A latest outcome converges/invalidate authoritative data so an older success followed by newest failure still refreshes correctly.
4. The manager returns the outcome to `LibraryFolderTree`.
5. `LibraryFolderTree.handleComponentDrop()` selects/reports saved only for `latest-success`, reports the contained error only for `latest-failure`, and ignores both stale outcomes. Preserve behavior for unrelated callback uses that still return `void` if the prop remains shared.
6. Keep cache shapes, permission behavior, selection semantics for latest success, toast wording, and the server action unchanged.

## AC-004

Pass only when both real adapters and the outer manager tree callback consume the same coordinator outcome contract; stale success/failure cannot overwrite optimistic state or surface stale feedback, and newest failure rolls back to the latest authoritative successful target.

## TEST-004

Retarget `tests/vitest/per-item-mutation-queue.test.ts` to the coordinator and run:

```sh
bunx vitest run tests/vitest/per-item-mutation-queue.test.ts
```

The focused test must prove same-component serialization, cross-component independence, stale-success confirmed-state advancement without rollback, stale-failure suppression without blocking its successor, and newest-failure rollback to the last successful target. No browser/render suite is added.

## Residue and completion evidence

- No `enqueuePerItemMutation`, `PerItemMutationQueue`, `per-item-mutation-queue`, adapter queue ref, adapter generation ref, or adapter confirmed-folder ref remains.
- The old queue source no longer exists.
- The coordinator imports no React, toast, cache, folder-tree, or server-action surface.
- Scoped TypeScript, ESLint, `git diff --check`, focused test, and GitNexus change detection pass.
