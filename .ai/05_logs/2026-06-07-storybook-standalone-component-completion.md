# Storybook Standalone Component Completion

**Date:** 2026-06-07 local / 2026-06-07Z
**Branch:** `fix/storybook-standalone-ui-components`
**Scope:** Repair the Storybook-first UI library so actual standalone
component entries exist and are verifiable.

## Result

Completed the Storybook-only standalone component repair without production app
migration, provider changes, public hosting, Supabase changes, Vercel changes,
new runtime dependencies, or main/staging merge.

## Implemented

- Added standalone Storybook entries across actions, forms, menus, overlays,
  feedback, cards, data display, navigation, layout, trees, and domain
  workshop/share/notification components.
- Added placeholder/backlog Storybook-only sections for media, charts, and
  blocks so the sidebar taxonomy is explicit without implying production
  implementation.
- Added `scripts/check-storybook-component-coverage.mjs` and
  `tests/vitest/storybook-component-coverage.test.ts` so actual story files and
  exports, not plan rows, prove standalone coverage.
- Added `storybook:check-components` to `package.json`.
- Updated Storybook sort order for real component-library sidebar groups.
- Updated `Governance/StoryCoverageDashboard` to distinguish the 809/703
  planning matrices from actual implemented stories.

## Validation Evidence

- `bun run storybook:check-components` passed: 56 story files, 56 titled
  stories, 230 story exports, 49 component-level stories, 7 overview/governance
  stories, 35 required standalone titles checked.
- `bun run type-check` passed.
- `bun run storybook:check-boundary` passed: 68 files scanned, 809 inventory
  rows, 703 story rows.
- Focused Storybook tests passed:
  `bunx vitest run tests/vitest/storybook-component-coverage.test.ts tests/vitest/storybook-provider-boundary.test.ts tests/vitest/storybook-plan-matrix.test.ts --maxWorkers=1`
  reported 3 files and 4 tests passed.
- `git diff --check` passed.
- `STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir /tmp/archestimator-storybook-static-standalone`
  passed with only Vite large-chunk warnings for docs/axe/dashboard assets.
- `bun run lint:design-system` passed.
- Local static Playwright smoke passed across 17 representative Storybook
  iframe stories from `http://127.0.0.1:6210`; screenshots:
  `/tmp/archestimator-storybook-smoke/*.png`.
- `bun run validate` passed with existing ESLint warnings only, 9 Bun unit tests
  passed, 206 Vitest DOM files passed, 1 skipped, 1515 tests passed, and 3
  skipped.
- `bun run build` passed on Next.js 16.2.6.

## Known Non-Issues

- `bun run lint` still reports existing warnings in the pitch deck artifact,
  `src/components/performance-monitor.tsx`, and the React Compiler/TanStack
  Table warning in `ProjectEstimatesTable.tsx`; no lint errors were emitted.
- Static Storybook build emits existing Vite large-chunk warnings for
  docs/axe/dashboard chunks; build exits successfully.

## Remaining Gates

- Philip review is still required before any Storybook approval is treated as
  product approval.
- Production route migration remains blocked until a separate route-by-route
  migration prompt is approved.
- No hosted Storybook, provider-backed review, or production deploy evidence
  was created in this run.
