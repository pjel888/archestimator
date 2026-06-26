# MOP-6 Continuation Slice 1

Date: 2026-06-25

Scope:

- Right sidebar `Task 2.4`: persist shared side-panel collapse state under the
  existing panel storage-key contract.
- Center proposal/export hardening: proposal workbook downloads now fetch with
  explicit same-origin credentials.

Files changed:

- `src/components/workshop/ResizableSidePanel.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/resizable-side-panel-a11y.test.tsx`
- `tests/vitest/estimate-sheet-center-atomic-contracts.test.ts`

Evidence:

- `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/estimate-sheet-center-atomic-contracts.test.ts --maxWorkers=1`
  - Passed: 2 files / 6 tests.
- `git diff --check`
  - Passed.
- `bun run type-check`
  - Passed.

Notes:

- This is not a full MOP-6 completion claim. Account-synced preferences,
  right-sidebar thumbnails, reducer extraction, mobile drawer proof, center
  decomposition, tree undo/lazy/realtime work, hosted Supabase migration proof,
  durable telemetry/ops proof, and browser-only interaction proof remain open.
- No provider writes, database mutations, production deploys, browser
  automation, PITR, paid add-ons, or external mutations were used.
