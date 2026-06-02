# 11 — PR Sequencing Plan

**Date:** 2026-06-02  
**Principle:** Small PRs, each independently revertible, each with clear acceptance criteria.

---

## PR 1 — Planning Docs

**Purpose:** Add all planning documents to the `.ai/` directory. No production code changes.

**Files:**
- `.ai/03_plans/activity-history-human-readable-v1/README.md`
- `.ai/03_plans/activity-history-human-readable-v1/00-current-state-audit.md`
- `.ai/03_plans/activity-history-human-readable-v1/01-research-basis.md`
- `.ai/03_plans/activity-history-human-readable-v1/02-activity-copywriting-system.md`
- `.ai/03_plans/activity-history-human-readable-v1/03-data-contract-and-event-model-plan.md`
- `.ai/03_plans/activity-history-human-readable-v1/04-implementation-plan.md`
- `.ai/03_plans/activity-history-human-readable-v1/05-blast-radius-analysis.md`
- `.ai/03_plans/activity-history-human-readable-v1/06-performance-analysis-plan.md`
- `.ai/03_plans/activity-history-human-readable-v1/07-security-privacy-readiness.md`
- `.ai/03_plans/activity-history-human-readable-v1/08-test-strategy.md`
- `.ai/03_plans/activity-history-human-readable-v1/09-ui-ux-plan.md`
- `.ai/03_plans/activity-history-human-readable-v1/10-readiness-checklist.md`
- `.ai/03_plans/activity-history-human-readable-v1/11-pr-sequencing-plan.md`

**Tests:** None required (documentation only)

**Rollback:** Revert the PR (delete the planning folder)

**Acceptance Criteria:**
- All 13 planning files exist in `.ai/03_plans/activity-history-human-readable-v1/`
- README.md correctly indexes all files
- No production files modified

---

## PR 2 — Activity Composer Tests and Fixtures

**Purpose:** Add test fixtures and all unit tests for the Activity Composer. Tests will FAIL initially (they test code that doesn't exist yet) — this is expected and documented in CI.

**Files:**
- **NEW:** `tests/vitest/fixtures/activity-events.ts` — all mock events
- **NEW:** `tests/vitest/activity-composer.test.ts` — unit tests for composer
- **NEW:** `tests/vitest/activity-copy-regression.test.ts` — banned-term regression tests
- **NEW:** `tests/vitest/activity-view-model.test.ts` — type safety tests
- **NEW:** `tests/vitest/activity-accessibility.test.tsx` — accessibility tests (may fail if no markup)
- **NEW:** `tests/vitest/activity-security.test.ts` — security/privacy tests

**Tests:** ~120 new test cases (see `08-test-strategy.md` for full list)

**Rollback:** Delete the new test files

**Acceptance Criteria:**
- Test files exist with all mandatory test cases
- Tests initially fail against current code (expected — documented with `.skip` or test failures in CI)
- Fixtures cover all 13 estimate event types, 3 decision types, comments, and shared-link events
- No production files modified

---

## PR 3 — Central Activity Composer

**Purpose:** Create the `src/lib/activity/` module with all composer and formatter functions. All tests from PR 2 now pass.

**Files:**
- **NEW:** `src/lib/activity/activity-view-model.ts` — types and composers
- **NEW:** `src/lib/activity/activity-copy.ts` — formatters
- **NEW:** `src/lib/activity/index.ts` — barrel export

**Tests:** All tests from PR 2 now pass

**Rollback:** Delete the `src/lib/activity/` directory; delete test files from PR 2

**Acceptance Criteria:**
- All composer unit tests pass
- All copy regression tests pass
- All visibility filter tests pass
- All accessibility tests pass (for pure functions)
- All security tests pass (for pure functions)
- `bun run type-check` passes
- `bun run lint` passes
- No existing tests broken
- No UI/component changes

---

## PR 4 — Estimate Activity UI Integration

**Purpose:** Replace local copy logic in `EstimateSheetContent.tsx` with the composer. Preserve all existing behavior and UI structure.

**Files:**
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx`
  - Replace `getEventLabel()` → `activity.title`
  - Replace `getEventSummary()` → `activity.summary` or `activity.changes`
  - Replace `getAuditEventDescription()` → `activity.title`
  - Replace `getActorLabel()` → `activity.actorLabel`
  - Replace `humanizeAuditField()` → `formatActivityFieldLabel()`
  - Replace `formatAuditFieldValue()` → `formatActivityValue()`
  - Replace `getHistoryChangeLabel()` → composed from title + summary
- **MODIFIED:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — update DOM assertions for new copy, add copy-specific assertions

**Tests:**
- All existing `estimate-sheet-version-control-ui.test.tsx` tests pass
- All existing `estimate-sheet-version-control-actions.test.ts` tests pass (no action changes)
- New copy assertions in UI test file

**Rollback:** Revert `EstimateSheetContent.tsx` to previous version

**Acceptance Criteria:**
- Activity History modal renders human-readable copy for all 13 event types
- Activity cards show complete sentences with actor names
- No raw event types in primary card display
- Audit facts still expandable with full detail
- Filters, search, day grouping, correlation grouping unchanged
- Load-more pagination unchanged
- Scope tree selection unchanged
- Row Activity tab shows human-readable copy
- Node Activity scope shows human-readable copy
- `bun run type-check` passes
- `bun run lint` passes

---

## PR 5 — Shared Link Activity Integration

**Purpose:** Replace raw shared-link activity copy with composer-based view model. Public API route returns composed items.

**Files:**
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts`
  - Return `ActivityViewModel[]` instead of `PublicActivityItem[]`
  - Compose all items with `visibility: "client"` before sending
  - Strip `raw` field from all items
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx`
  - Accept `ActivityViewModel[]` and render from it
  - Replace `a.type.toUpperCase()` → badge rendering
  - Replace `Decision: {a.decision}` → `activity.title`
  - Replace raw event rendering → human-readable title
  - Keep Realtime subscription logic unchanged
- **MODIFIED:** `tests/vitest/project-publication-activity.test.tsx` — update response shape assertions, add copy assertions

**Tests:**
- All existing `project-publication-activity.test.tsx` tests pass
- All existing `project-publication-header.test.tsx` tests pass
- New copy assertions in activity test file

**Rollback:** Revert API route and `SharedLinkActivityFeed.tsx` to previous versions

**Acceptance Criteria:**
- Public API returns `ActivityViewModel[]` with `title` field
- Public API response has NO `raw` field
- Public API response has NO raw UUIDs
- Public API response has NO raw event types
- Public API response has NO internal comments
- `SharedLinkActivityFeed` renders human-readable copy
- Owner view still shows internal comments with badge
- Realtime subscription still triggers refresh
- Public shared link page shows human-readable activity
- `bun run type-check` passes

---

## PR 6 — Comments/Decisions Timeline Integration

**Purpose:** Ensure comments, approvals, declines, and revision requests all render with human-readable copy. Add decision digest to owner email notifications.

**Files:**
- **MODIFIED:** `src/lib/activity/activity-view-model.ts` — ensure comment/decision composers handle all edge cases (body text, missing notes, decision states)
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — render comment body as secondary text, render decision body as secondary text
- **MODIFIED:** `src/lib/publication/actions.ts` — extend `triggerOwnerDigestIfAllowed` to handle `kind: "decision"`
- **MODIFIED:** `src/app/api/share/[token]/decision/route.ts` — trigger digest after decision submission
- **MODIFIED:** `tests/vitest/project-publication-comments.test.tsx` — add copy assertions
- **MODIFIED:** `tests/vitest/project-publication-decision.test.tsx` — add copy assertions
- **MODIFIED:** `tests/vitest/project-publication-activity.test.tsx` — add decision digest test

**Tests:**
- All existing comment and decision tests pass
- New copy assertions for each decision type
- New digest trigger test for decisions

**Rollback:** Revert changes to individual files

**Acceptance Criteria:**
- "Accepted" → "Maria approved the proposal." with green badge
- "Declined" → "Maria declined the proposal." with red badge, note if present
- "Revision requested" → "Maria requested revisions." with amber badge, note if present
- Internal comments show "Internal" badge (owner only)
- Internal comments never visible to client
- Comment body renders with `whitespace-pre-wrap`
- Decision digest email fires for decisions (rate-limited to 15 min)
- `bun run type-check` passes

---

## PR 7 — UI Polish, Accessibility, Performance

**Purpose:** Final UI refinements, accessibility improvements, realtime indicator, and performance verification.

**Files:**
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx` — card layout refinements, expand/collapse keyboard support, aria attributes
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — card layout, badges, empty state, loading skeleton, new activity banner, aria attributes
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts` — add cursor pagination
- **MODIFIED:** Supabase migrations (optional) — add missing indexes if needed

**Tests:**
- Accessibility tests pass (axe-core or manual)
- Performance smoke tests pass
- Cursor pagination test for public API

**Rollback:** Revert individual component changes

**Acceptance Criteria:**
- Cards follow new anatomy (primary → context → badges → body → audit)
- Badges render for all event types
- Expand/collapse audit facts keyboard-operable (Enter/Space)
- Realtime "New activity" banner (not auto-scroll)
- Screen reader announces new activity via `aria-live`
- Empty states show guidance copy
- Loading skeleton renders during load
- Public API supports cursor pagination
- Mobile responsive verified
- Accessibility audit passes
- Performance: 200 events render without lag
- No N+1 queries
- Index analysis completed (indexes exist or deemed unnecessary)
- `bun run type-check` passes
- `bun run lint` passes
- Final QA pass on all activity surfaces

---

## Dependency Graph

```
PR 1 (planning docs)
  ↓
PR 2 (tests + fixtures) ────────┐
  ↓                              │
PR 3 (composer module) ──────────┤
  ↓                              │
PR 4 (estimate UI) ──┐           │
  ↓                  ├─ independent
PR 5 (shared link) ──┘           │
  ↓                              │
PR 6 (comments/decisions) ───────┘ (depends on PR 5)
  ↓
PR 7 (UI polish + perf)
```

PR 4 and PR 5 can be worked on in parallel (different surfaces, same composer).
PR 6 depends on PR 5 (shared link composer in place).
PR 7 depends on all previous PRs.

---

## Review Strategy

Each PR should be:
1. Self-contained (can be reviewed without reading other PRs)
2. Independently testable (all tests pass for that PR)
3. Revertible (revert PR without affecting others)
4. Small (<500 lines changed per PR, except PR 4 which touches a large existing file)

Each PR description should include:
- What was changed and why
- Screenshots (for UI changes)
- Link to the relevant planning doc
- Rollback instructions
- Manual QA checklist
