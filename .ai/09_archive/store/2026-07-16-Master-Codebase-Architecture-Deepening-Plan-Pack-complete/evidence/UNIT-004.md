# UNIT-004 Verification Receipt

- Recorded: `2026-07-16T18:54:45+08:00`
- Baseline HEAD: `0a2667db998607917932ad7832e9a6a5bd7e066a`
- Scoped file-set SHA-256: `59576c140093d8a49929e3ec90dd0866c4dd66cfc5f6ac80f6671d4614ffe4d2`
- Result: `VERIFIED`

## Implemented boundary

The generic per-item promise queue was replaced by one framework-free `createComponentFolderMoveCoordinator()` that serializes persistence per component while allowing different components to proceed independently. It owns burst seeding, monotonic generation, latest-generation classification, confirmed folder state, pending count, rejection containment, and state deletion after a burst drains.

Both real adapters own one coordinator instance and consume the same four discriminated outcomes. Stale success and stale failure keep the newer optimistic target and produce no toast, selection, saved/error status, or refresh. Latest success converges the authoritative cache. Latest failure rolls back to the most recent confirmed target only while the current optimistic target still matches the failed attempt. The manager uses one current-target guard before both local rollback and warm-cache convergence, so neither surface can overwrite a newer move. `LibraryFolderTree` selects/reports saved only for latest success, reports the contained latest failure, ignores stale outcomes, and preserves legacy `void` callback success behavior.

## Evidence

- GitNexus pre-edit impact was `LOW`: `handleLibraryItemMove` had no dependents, `moveComponentToFolder` had no dependents, `handleComponentDrop` had one dependent, and `enqueuePerItemMutation` had three. No HIGH or CRITICAL U4 warning was present.
- Focused `TEST-004`: `bunx vitest run tests/vitest/per-item-mutation-queue.test.ts` — PASS, 1 file and 8 tests.
- The focused suite proves same-component serialization, cross-component independence, stale-success confirmed-state advancement, stale-failure suppression and successor continuation, newest-failure rollback, later-seed isolation across two failures, fresh reseeding after burst cleanup, and the latest-only adapter/outer feedback contract.
- TypeScript: `bun run type-check` — PASS.
- Scoped ESLint: zero errors and three unchanged warnings in `ComponentLibraryManager.tsx`.
- Scoped `git diff --check`, the untracked-file whitespace check, and exact old queue/ref residue scans — PASS.
- `per-item-mutation-queue.ts` is absent. No `enqueuePerItemMutation`, `PerItemMutationQueue`, adapter queue ref, adapter generation ref, or adapter confirmed-folder ref remains under `src` or `tests`.
- GitNexus change detection reported the expected sidebar flow among the aggregate dirty-worktree results; the U4-specific affected flow was `UseEstimateRightSidebarContent -> IsEstimateLibraryTab`.
- The first adversarial review found one warm-cache rollback race and two proof gaps. The race was repaired with the shared current-target guard, and the focused suite was expanded from five to eight tests. The same strict reviewer then returned PASS; a second independent reviewer also returned CLEAN.

## File hashes

- `src/components/workshop/component-library/component-folder-move-coordinator.ts`: `e4320427bced238decb15d3468db26fdef02259cebb5703240822a44519e5120`
- `src/components/workshop/component-library/index.tsx`: `767b4982d3c73078f26df354b8d1afbec94797e1823304f693100b663116dc95`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`: `da250ce06d77817a4df2556a51ec60522ede593ea973628a73a131b11e4e11ee`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`: `37ea9f97a43a6096e53843a20c69c0b3bd790743ddadccc242ddefa9d3b40a91`
- `tests/vitest/per-item-mutation-queue.test.ts`: `3a83ec711c9e0996dd5d0d80e3e1c1a152c1e10e0547172268f97cc6b7df8619`
- `src/components/workshop/component-library/per-item-mutation-queue.ts`: absent
