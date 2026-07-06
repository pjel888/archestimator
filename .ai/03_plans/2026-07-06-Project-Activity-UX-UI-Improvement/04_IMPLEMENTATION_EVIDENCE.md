# Project Activity UX/UI Implementation Evidence

Date: 2026-07-06

## Implemented Slice

The project activity page now uses the compact ledger direction from this pack:

- Stable header with project name, count, refresh, primary scope, filter summary,
  and a reserved status row.
- Actor/client/action filters moved into an overlaid `Activity filters` region
  so opening filters does not take vertical space from the ledger.
- Activity rows grouped by UTC day with compact, fixed-minimum-height ledger
  rows, source labels, actor/action columns, target text, compact facts, and
  visibility metadata.
- Loading skeleton updated to match the new header, feed, row, and footer
  dimensions.
- Unknown/fallback activity copy improved so unmapped events preserve the audit
  record without repeating generic "Activity recorded." rows.

## Changed Source

- `src/components/workshop/project-activity/ProjectActivityClient.tsx`
- `src/app/workshop/projects/[projectId]/activity/loading.tsx`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-fallback.ts`
- `tests/vitest/project-activity-page/client.test.tsx`
- `tests/vitest/activity-composer.test.ts`
- `tests/vitest/activity-security.test.ts`

## Verification Evidence

- `bunx vitest run tests/vitest/project-activity-page/client.test.tsx tests/vitest/project-activity-page/url-state.test.ts tests/vitest/project-activity-page/action-classes.test.ts tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/activity-security.test.ts --maxWorkers=1`
  - Result: 6 files passed, 129 tests passed.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check`
  - Result: passed.
- `bun run lint:design -- src/components/workshop/project-activity/ProjectActivityClient.tsx`
  - Result: passed.
- `git diff --check`
  - Result: passed.

## Browser Evidence

The in-app browser loaded
`http://localhost:3000/workshop/projects/79aa8609-9545-4163-ab6f-2ecbcbd04cd2/activity`
after the implementation. The live measurement confirmed:

- New ledger rendered with `role="feed"` and visible date grouping.
- Header height: 129px.
- First row height: 76px.
- No horizontal overflow in the current browser viewport.

The in-app browser control connection timed out while attempting deeper filter
interaction and screenshot checks, so this evidence does not claim full browser
interaction proof. The filter overlay behavior is instead locked by the focused
component test, which verifies action chips stay out of the main header until
the overlaid `Activity filters` region is opened.

## Residual Risks

- Mobile visual proof was not captured in-browser during this pass because the
  in-app browser connection timed out before viewport override checks.
- The first pass keeps rows non-expandable; richer per-event drill-down remains
  future work.
- Activity copy is safer for unknown events, but truly source-specific copy for
  every future event type still depends on expanding the composer dictionary as
  new events appear.
