# 15 - Implementation Test Spec

## Purpose

This is the test specification for a future implementation of the share page UX/UI plan. It turns the planning pack into red/green gates so implementation does not move slice-to-slice on screenshots alone.

## Global Test Rules

Every implementation slice must:

1. run GitNexus/code-review-graph pre-edit gates from `02`,
2. add or update the smallest focused tests before changing behavior,
3. run the focused Vitest set after changes,
4. run `bun run lint:design-system` for any UI change,
5. capture desktop and mobile browser evidence for any visual change,
6. preserve password/session/comment/decision security behavior.

## Focused Baseline Command

```bash
bunx vitest run \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/share/reconstruct-share-tree.test.ts \
  --maxWorkers=1
```

Run broader `bun run type-check` and `bun run lint:design-system` before any final closeout.

## Slice 1 - Receiver Shell and Layout Rebalance

### Red Tests or Assertions to Add

- Receiver shell exposes a workspace landmark/region around the estimate.
- Non-session links do not render a full-width/right-rail decision composer.
- Session links still render decision and comments.
- Empty selected estimates render an explicit empty state instead of `null`.

### Green Evidence

- Vitest focused baseline passes.
- Desktop screenshot at 1440 x 1000 proves sheet controls by `y <= 360px`.
- Desktop screenshot proves first row/tree content by `y <= 520px`.
- Mobile screenshot at 390 x 844 proves chart is not expanded before row access.

## Slice 2 - Estimate Workspace Extraction

### Red Tests or Assertions to Add

- `SharePageTabs` compatibility wrapper accepts the existing props.
- Active sheet is restored from `sessionStorage` when valid.
- Invalid stored sheet falls back to first selected estimate.
- Tree/Grid mode still switches for the active sheet.
- `getBestShareTree(rows, treeNodes)` path preserves old flat snapshots.

### Green Evidence

- Focused baseline passes.
- New component tests prove toolbar, tree mode, grid mode, and chart wrapper render without session.
- No public route/API files change beyond container wiring.

## Slice 3 - Navigation and Search

### Red Tests or Assertions to Add

- Search filters by row description.
- Search filters by designation/material/discipline when present.
- Clearing search restores all rows.
- Search does not destroy active sheet state.
- Keyboard focus can move from search to Tree/Grid controls.

### Green Evidence

- Large-row fixture remains responsive enough for manual browser smoke.
- Section navigation has one active model only: left rail, drawer, or floating nav.
- No duplicate tree/scrollspy systems are visible at the same viewport.

## Slice 4 - Context Rail and Response UX

### Red Tests or Assertions to Add

- No-session state renders compact cue and hides POST-capable controls.
- Session state renders decision controls with non-legal copy.
- Request Revision requires or strongly prompts for a note according to final product decision.
- Duplicate/already-submitted response shows locked state if API returns 409.
- Comment failure exposes retry/error state without leaking internals.

### Green Evidence

- Session and non-session desktop screenshots show different rail behavior.
- Mobile session screenshot shows useful response affordance without row overlap.
- Existing comment/decision API tests pass unchanged or with intentionally updated copy assertions.

## Slice 5 - Route State Polish

### Red Tests or Assertions to Add

- Invalid token does not reveal project data.
- Expired/revoked token does not reveal current snapshot.
- Password failure and lockout states keep private data hidden.
- Empty/no selected sheet state explains sender action.
- Loading/error route states do not render a blank centered shell.

### Green Evidence

- Security regression checks from `09` pass.
- Browser smoke includes invalid/expired/empty fixtures when available.

## Fixture Requirements

At minimum, future implementation should test or manually smoke:

| Fixture | Required evidence |
| --- | --- |
| DEMO_PROJECT_PLACEHOLDER current fixture | continuity against existing screenshot evidence |
| one selected sheet | sheet toolbar does not overbuild |
| many selected sheets | tabs/select does not overflow |
| long sheet names | labels truncate/wrap correctly |
| no row images | row density remains clean |
| many rows | search/navigation and sticky toolbar hold up |
| no recipient session | compact rail/no dead sticky response |
| recipient session active | decision/comments available |
| password protected | gate still blocks snapshot |
| expired/revoked/invalid token | no private data leak |
| empty/no selected sheets | explicit empty state |

## E2E and Browser Evidence

Full Playwright E2E is currently gated by:

```bash
ARCHESTIMATOR_E2E_SHARED_LINK=1
```

When seeded E2E is unavailable, the minimum browser smoke is:

1. start the local app,
2. open a known valid `/share/[token]` route,
3. capture 1440 x 1000 and 390 x 844 screenshots,
4. measure sheet control and first row y-position,
5. confirm no visible debug badge,
6. confirm no horizontal overflow at 320px if layout changed.

Store evidence under the plan or future implementation evidence folder with viewport and fixture names in the filename.

## Pass/Fail Standard

A slice passes only when:

- tests prove unchanged security/session behavior,
- screenshots prove the selected layout contract,
- measurable gates pass or have a written exception,
- no next slice starts before the current slice has a rollback checkpoint.
