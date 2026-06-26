---
title: MOP-6 Continuation Slice 4 Sources Drawer Evidence
type: evidence
date: 2026-06-25
status: source-jsdom-complete-browser-proof-open
---

# MOP-6 Continuation Slice 4 Sources Drawer Evidence

## Claim

The estimate sheet now has product-specific compact access to the right
`Sources` sidebar below desktop width. The drawer uses the existing
`Sheet`/`Dialog` primitive and the same source-sidebar body as the desktop
right rail; the generic shared compact side-panel drawer is disabled for this
surface.

## Files

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/ResizableSidePanel.tsx`
- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/overlays/sheet-drawer.tsx`
- `tests/vitest/resizable-side-panel-a11y.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`
- `tests/vitest/estimate-component-library-lazy-load.test.tsx`
- `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`
- `e2e/estimate-sources-drawer.spec.ts`

## Validation

- `bun x vitest run tests/vitest/resizable-side-panel-a11y.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1`
  passed: 5 files / 117 tests.
- `bun run type-check` passed.
- `git diff --check` passed.
- `bun x playwright test --list e2e/estimate-sources-drawer.spec.ts` passed
  and listed 1 Chromium test. This validates the harness loads; it is not
  browser execution proof.

## Unproved Browser Claims

Real-browser viewport sizing, focus trap, scroll lock, return focus, and
overflow behavior are not claimed. `e2e/estimate-sources-drawer.spec.ts` is the
gated route-level harness for those claims, but the current shell has no visible
`ARCHESTIMATOR_*`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_*`, `PLAYWRIGHT_*`, or
`ESTIMATE_SHEET_*` environment for the provider-backed Playwright estimate
route specs, so a route-level browser proof would skip rather than prove the
drawer.
