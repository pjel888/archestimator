# MOP-6 Continuation Slice 10: Sources Drawer Browser Proof

Date: 2026-06-25

Mode: focused implementation fix, browser-proof recovery, and documentation
reconciliation.

## Result

The below-1024 right `Sources` drawer browser-only claim is now proven locally
in Chromium at both target widths:

- 1023 x 768 tablet-boundary viewport.
- 390 x 844 phone-width viewport.

The spec proves the drawer opens from the estimate sheet route, exposes dialog
semantics, traps initial focus to the close button, inert-locks the background,
locks page scroll, avoids horizontal overflow, clears search on the first
Escape, hides search on the second Escape, closes the drawer on the third
Escape, restores focus to the opener, and releases scroll lock.

## Fixes

- Fixed the real-browser Escape behavior in `TreePanelHeader`: an Escape key
  press in the search input now clears a non-empty query and stops propagation;
  a second Escape hides search without closing the drawer.
- Focused the `Open Sources drawer` trigger before opening so the shared
  dialog return-focus helper has the correct opener in Chromium.
- Hardened `e2e/estimate-sources-drawer.spec.ts` so it can install the
  dev-auth bypass cookie when configured, prefers `ESTIMATE_SHEET_E2E_NODE_ID`
  for the `[nodeId]` route, can discover an estimate link when no explicit
  node override is provided, and runs tablet/phone proofs as independent cases.
- Updated the stale shared-tabs source-contract test to the current `panelId`
  implementation shape.

## Verification

Commands and checks:

- `PLAYWRIGHT_PORT=3000 ESTIMATE_SHEET_E2E_PROJECT_ID=0139e1e5-951d-4f2f-9081-6c953d288d8a ESTIMATE_SHEET_E2E_NODE_ID=8080f04c-fe18-4314-a1d8-9222e62d1eed bunx playwright test e2e/estimate-sources-drawer.spec.ts --project=chromium`
  passed: 2 Chromium tests.
- `bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1`
  passed: 2 files / 103 tests.
- `bun run type-check` passed.
- `git diff --check` passed.

## Remaining Scope

This closes the right-drawer browser-proof gap only. The source folders are
still not fully implemented because the remaining rows are separate proof,
refactor, or architecture scopes:

- Right-sidebar F-13 still lacks React DevTools active-tab rerender profiler
  proof.
- Broad post-success center/tree undo still needs a restore contract/RPC/UI
  flow; failure rollback alone is not undo.
- Center M-21 through M-24 still need characterization locks before extracting
  template insertion, activity history, proposal preview, and event-bridge
  flows.
- Lazy subtree loading needs a subtree fetch/merge/loading-state contract.
- Realtime-v2 needs a concrete protocol separate from current cursor/presence
  realtime.
