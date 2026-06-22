# Phase 4 Evidence: Component Library Sidebar Deferral

Date: 2026-06-22

## Implemented

- Updated `src/components/workshop/EstimateSheetContent.tsx`.
- Removed the static local `EstimateRightSidebar` import from `./component-library`.
- Removed the unused static sidebar re-export from `EstimateSheetContent`; no repo imports were found through that path.
- Added a local `next/dynamic` sidebar boundary:
  - dynamic import from `./component-library`
  - `ssr: false`
  - `ComponentLibrarySidebarFallback` while the sidebar chunk loads
- Kept the existing retryable lazy project-library query fallback.
- Added `tests/vitest/estimate-component-library-lazy-load.test.tsx`.

## Behavior Locked

- `EstimateSheetContent` no longer statically imports or re-exports `EstimateRightSidebar`.
- The right sidebar module is loaded through `dynamic()`.
- The lite library query remains keyed through `workspaceComponentLibraryLiteQueryKey(projectId)`.
- The query remains intent-gated by `renderSidebar || showCommandPalette`.
- Server-provided library props still bypass the lazy fetch.
- `renderSidebar={false}` still avoids loading the project component library.
- Error retry still calls `libraryQuery.refetch()`.

## Verification

```bash
bunx vitest run tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx --maxWorkers=1
```

Result:

```text
Test Files  2 passed (2)
Tests       8 passed (8)
```

Included in the final focused matrix:

```text
Test Files  12 passed (12)
Tests       114 passed (114)
```

## Measurement Boundary

This pass proves source/import/query behavior and DOM fallback/retry behavior. It does not claim bundle-size, parse/eval, or first-open timing wins because no build analyzer or authenticated browser performance profile was captured.

## Rollback

Restore the static `EstimateRightSidebar` import and local render, remove `tests/vitest/estimate-component-library-lazy-load.test.tsx`, and restore the static re-export only if a future external consumer requires it.
