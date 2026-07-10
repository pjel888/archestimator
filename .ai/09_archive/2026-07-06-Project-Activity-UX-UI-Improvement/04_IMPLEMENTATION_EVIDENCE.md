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

## Stable Row Refinement

A follow-up visual pass used ImageGen to re-imagine the activity feed as a
structured ledger with explicit columns. The implemented refinement keeps every
visible row on the same anatomy:

- A fixed `Time & Source` slot where source chips always sit below the time.
- Reserved `Actor`, `Event`, `Details`, and `Status` columns on desktop.
- Two detail rows and two status rows are rendered for every item, using a muted
  dash when a value is absent so rows do not collapse or shift.
- A desktop column guide clarifies the information hierarchy before the date
  groups and activity rows.
- The loading skeleton mirrors the same row grid and column guide.

Design reference saved at:
`.omx/artifacts/project-activity-ux-plan/03-stable-ledger-reference.png`.

## Actor Identity Follow-up

The activity rows originally showed `Unknown user` even though the raw events
belonged to the signed-in project owner. The root cause was not the row UI:
`estimate_sheet_events.actor_user_id` and `collaboration_audit_events.actor_user_id`
contained the active Better Auth user id, but
`project-activity-feed-repository.ts` still treated actor ids as UUID-only
legacy `profiles.id` values. The local D1 evidence showed:

- `profiles` had `0` rows.
- Better Auth `user` had the active user id with name `Philip Lewis`.
- The activity event actor ids matched that Better Auth user id.

The repository now accepts bounded non-UUID actor ids for activity actor
filters, resolves labels from the Better Auth `user` table first, and falls
back to legacy `profiles` only for unresolved ids.

## Changed Source

- `src/components/workshop/project-activity/ProjectActivityClient.tsx`
- `src/app/workshop/projects/[projectId]/activity/loading.tsx`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-fallback.ts`
- `src/lib/repositories/project-activity-feed-repository.ts`
- `tests/vitest/project-activity-page/client.test.tsx`
- `tests/vitest/project-activity-page/repository-behavior.test.ts`
- `tests/vitest/activity-composer.test.ts`
- `tests/vitest/activity-security.test.ts`

## Verification Evidence

- `bunx vitest run tests/vitest/project-activity-page/client.test.tsx tests/vitest/project-activity-page/url-state.test.ts tests/vitest/project-activity-page/action-classes.test.ts tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/activity-security.test.ts --maxWorkers=1`
  - Result: 6 files passed, 130 tests passed.
- `bunx vitest run tests/vitest/project-activity-page/repository-behavior.test.ts tests/vitest/project-activity-page/client.test.tsx tests/vitest/project-activity-page/url-state.test.ts tests/vitest/project-activity-page/action-classes.test.ts tests/vitest/project-activity-page/route-contract.test.ts tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/activity-security.test.ts --maxWorkers=1`
  - Result: 8 files passed, 142 tests passed.
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
- First visible rows use a 92px row height.
- The complaint case (`11:26 PM` with `System`) places the source chip below
  the time and left-aligned with the time text.
- First visible rows each rendered 2 detail slots and 2 status slots.
- No horizontal overflow in the current browser viewport.
- The follow-up hierarchy check confirmed the desktop column guide was present,
  with 11 activity rows, 22 detail slots, and 22 status slots on the live page.
- The actor identity follow-up reloaded the live page and confirmed the visible
  rows now render `Philip Lewis` in the actor line and event title where they
  previously rendered `Unknown user`.

The in-app browser control connection timed out once during a reload-based
follow-up check, then recovered for a smaller DOM measurement. This evidence
does not claim full browser interaction proof. The filter overlay behavior is
instead locked by the focused component test, which verifies action chips stay
out of the main header until the overlaid `Activity filters` region is opened.

## Residual Risks

- Mobile visual proof was not captured in-browser during this pass because the
  in-app browser connection timed out before viewport override checks.
- The first pass keeps rows non-expandable; richer per-event drill-down remains
  future work.
- Activity copy is safer for unknown events, but truly source-specific copy for
  every future event type still depends on expanding the composer dictionary as
  new events appear.
