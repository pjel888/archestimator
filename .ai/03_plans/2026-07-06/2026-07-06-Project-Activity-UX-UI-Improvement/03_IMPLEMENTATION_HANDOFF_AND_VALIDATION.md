# Implementation Handoff And Validation

## Recommended Sequence

### Phase 0 - Lock Existing Behavior

Purpose: preserve current routing, privacy, and filtering behavior before UI
work.

Tasks:

- Review existing tests under `tests/vitest/project-activity-page/`.
- Add or update characterization tests for current URL filters, no recipient
  email exposure, partial-source rendering, load-more cursor behavior, and
  empty/no-match states if gaps remain.
- Add a static fixture for unknown/fallback event rendering if the copy work is
  included.

Exit criteria:

- The future UI refactor can move markup without weakening auth, privacy,
  cursor, or filter behavior.

### Phase 1 - Component Decomposition

Purpose: make the page easier to redesign without a giant client component.

Expected source surface:

- `src/components/workshop/project-activity/ProjectActivityClient.tsx`
- New local components under `src/components/workshop/project-activity/`, for
  example:
  - `ProjectActivityToolbar.tsx`
  - `ProjectActivityFilterSummary.tsx`
  - `ProjectActivityFilterPanel.tsx`
  - `ProjectActivityLedger.tsx`
  - `ProjectActivityDayGroup.tsx`
  - `ProjectActivityRow.tsx`
  - `ProjectActivityState.tsx`

Keep this decomposition local to project activity unless another page already
has an exact matching primitive.

Exit criteria:

- Existing behavior still passes.
- No visual redesign claims yet unless Phase 2 is also complete.

### Phase 2 - Ledger Layout And Stable States

Purpose: implement the compact audit cockpit.

Tasks:

- Replace full-width activity cards with ledger/timeline rows.
- Group rows by day.
- Implement stable toolbar and filter summary.
- Move secondary filters into popover/drawer/panel.
- Add reserved partial-source and load-more areas.
- Update `src/app/workshop/projects/[projectId]/activity/loading.tsx` so the
  skeleton matches the settled top chrome and row heights.

Exit criteria:

- Desktop, tablet, and mobile first-row positions remain stable across loading,
  settled, filter open/close, partial banner, and load-more pending states.

### Phase 3 - Activity Semantics And Copy

Purpose: make row content explain the activity family and impact.

Expected source surface:

- `src/lib/activity/activity-copy-dictionary.ts`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-formatters.ts`
- `src/lib/activity/activity-fallback.ts`
- `tests/vitest/activity-composer.test.ts`
- `tests/vitest/activity-copy-regression.test.ts`
- `tests/vitest/activity-view-model.test.ts`

Tasks:

- Map common estimate event types to distinct titles where currently falling
  back.
- Add safe fallback copy for unknown/system events.
- Preserve recipient privacy and avoid emails.
- Preserve source/action bucket behavior.

Exit criteria:

- Live rows no longer collapse common events into repeated "Activity recorded."
  titles.

### Phase 4 - Accessibility And Interaction QA

Purpose: finish the usability contract.

Tasks:

- Add explicit selected/pressed state to action filters.
- Add status region for result count and partial/error/load states.
- Verify keyboard order through toolbar, filter panel, feed rows, and load more.
- Confirm pointer targets meet the target-size plan.
- Confirm row expansion semantics if expansion is included.

Exit criteria:

- Focus, labels, selected states, and dynamic statuses are inspectable in DOM
  tests or browser proof.

## Expected Validation

Run the narrowest checks that prove the changed behavior, then broaden only if
the implementation touches shared logic.

Recommended focused tests:

```bash
bunx vitest run tests/vitest/project-activity-page/client.test.tsx tests/vitest/project-activity-page/url-state.test.ts tests/vitest/project-activity-page/action-classes.test.ts --maxWorkers=1
```

If copy/composer behavior changes:

```bash
bunx vitest run tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/activity-view-model.test.ts --maxWorkers=1
```

Static/type checks:

```bash
git diff --check
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

Browser proof is justified for implementation because the core claim is visual
layout stability. Capture metrics at desktop, tablet, and mobile:

- loading skeleton top chrome height
- settled top chrome height
- first activity row y-position
- horizontal overflow
- filter open/close first-row y-position
- partial warning first-row y-position
- load-more pending footer reservation

Use the user's chosen in-app browser for visual checks unless the user requests
a different browser surface.

## Acceptance Criteria

Functional:

- URL-backed filters still work for scope, action, actor, and client.
- Refresh preserves the selected filters.
- Load more appends older events and keeps cursor transient.
- Editor-only users cannot view feed data.
- Recipient emails are not exposed.
- Partial-source and load-more errors are still visible.

UX/UI:

- The first event appears materially earlier than the current mobile/tablet
  state after the page settles.
- Desktop rows use available horizontal space for scanable columns instead of
  empty card width.
- The page answers when/who/what/where/source/impact at row level.
- Action filters no longer dominate the first viewport.
- Unknown/system events are distinguishable without unsafe raw metadata.

Layout stability:

- Loading to settled UI does not visibly shift the feed start.
- Opening/closing filters does not push feed rows down.
- Partial-source and load-more states use reserved space.
- Row hover/focus/selected states do not change row height.
- Breakpoint changes are intentional, not caused by uncontrolled wrapping.

Accessibility:

- Filter controls expose selected states.
- Dynamic result/status updates are announced.
- Touch targets meet or exceed the target-size plan.
- Feed rows have useful names and do not create keyboard traps.

## Risks

- Component decomposition could accidentally alter URL/filter behavior. Mitigate
  with Phase 0 characterization tests.
- Better fallback copy could expose raw metadata if implemented carelessly.
  Mitigate by whitelisting safe fields and keeping recipient-email leak tests.
- A desktop ledger can become too table-like on mobile. Mitigate with a separate
  mobile row anatomy rather than squeezing columns.
- Browser visual checks can be slower than source tests. They are warranted only
  for the layout-stability claims.

## Current Validation For This Planning Pack

Planning evidence collected:

- Current route/component/repository/test source inspected.
- Current desktop screenshot captured.
- Desktop/tablet/mobile layout metrics measured in the in-app browser.
- External UX/accessibility/layout-stability sources reviewed.
- A separate design-review lane reported the same core direction: compact audit
  ledger, stable layout before visual polish, filter simplification, explicit
  activity semantics, responsive state handling, and no-layout-shift gates.

Validation not run because this is planning-only:

- No application source was edited.
- No Vitest, typecheck, or build command proves app behavior.
- No after-screenshot exists because no redesigned UI was implemented.
