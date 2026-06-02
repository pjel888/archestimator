# 11 — PR Sequencing Plan (Revised — Third Pass)

**Date:** 2026-06-02 (second pass: 2026-06-02; third pass: 2026-06-02)
**Principle:** Small PRs, each independently revertible, each merge-safe (no failing CI).
**Note:** See `27-third-pass-master-implementation-blueprint.md` for the definitive 9-PR sequence including access telemetry.

---

## Revised PR Sequence

```
PR 1 (planning docs — this PR)
  ↓
PR 2 (preflight cleanup) ← NEW — fixes known bugs before composer
  ↓
PR 3 (composer module + tests) ← combined from old PR 2 + PR 3
  ↓
PR 4 (estimate UI integration) ← was old PR 4
  ↓
PR 5 (shared-link API integration) ← was old PR 5
  ↓
PR 6 (recipient actor resolution + decisions copy) ← expanded from old PR 6
  ↓
PR 7 (realtime/pagination hardening) ← split from old PR 7
  ↓
PR 8 (UI polish + accessibility + manual QA) ← was old PR 7
```

PR 4 and PR 5 can be worked on in parallel (different surfaces, same composer).
PR 6 depends on PR 5 (shared-link composer in place).
PR 7 depends on PR 5 (shared-link activity loading in place).
PR 8 depends on all previous PRs.

---

## PR 1 — Second-Pass Planning Docs

**Purpose:** Add/update all planning documents in the `.ai/` directory. No production code changes.

**Files:** All 21 files in `.ai/03_plans/activity-history-human-readable-v1/`

**Tests:** None required (documentation only)

**Rollback:** Revert the PR (delete the planning folder)

**Acceptance Criteria:**
- [ ] All 21 files exist
- [ ] README.md correctly indexes all files
- [ ] Second-pass verification audit complete
- [ ] All known issues addressed
- [ ] No production files modified

---

## PR 2 — Preflight Correctness Cleanup

**Purpose:** Fix known bugs identified in second-pass audit before composer work begins. Small, targeted fixes.

**Files:**
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx` — Fix `row_inserted` → `row_added` + `row_blank_added` in `ACTIVITY_FILTER_EVENT_TYPES`
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — Fix Realtime filter (pass `publicationId` prop) OR remove Realtime from component
- **MODIFIED:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — Fix `eventType: "row_inserted"` in test mock
- **POTENTIALLY:** `src/app/api/share/[token]/activity/route.ts` — Add `event_type` to shared_link_events select
- **POTENTIALLY:** `src/lib/publication/actions.ts` — Fix shared-link owner pagination (apply cursor at query level, per-table)

**Tests:** Existing tests pass. Add regression tests for filter fix.

**Risks:** LOW — small fixes, no behavior changes other than correct filter matching and Realtime scope.

**Rollback:** Revert individual file changes.

**Acceptance Criteria:**
- [ ] `row_inserted` filter replaced with `row_added` and `row_blank_added`
- [ ] Realtime filter uses actual `publicationId` OR Realtime removed from V1 claims with flag
- [ ] All existing tests pass
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes

---

## PR 3 — Activity Composer Module + Tests (Combined)

**Purpose:** Create the `src/lib/activity/` module with all composer functions AND all tests. Combined PR ensures tests pass on `main` with no red CI.

**Files:**
- **NEW:** `tests/vitest/fixtures/activity-events.ts`
- **NEW:** `tests/vitest/activity-composer.test.ts`
- **NEW:** `tests/vitest/activity-copy-regression.test.ts`
- **NEW:** `tests/vitest/activity-security.test.ts`
- **NEW:** `src/lib/activity/types.ts`
- **NEW:** `src/lib/activity/activity-composer.ts`
- **NEW:** `src/lib/activity/activity-formatters.ts`
- **NEW:** `src/lib/activity/activity-visibility.ts`
- **NEW:** `src/lib/activity/activity-copy-dictionary.ts`
- **NEW:** `src/lib/activity/activity-fallback.ts`
- **NEW:** `src/lib/activity/index.ts`

**Spec reference:** See `21-activity-composer-spec.md` for exact types, functions, and contracts.

**Tests:** ~100+ test cases, all passing. Covers all event types, edge cases, visibility filtering, and banned-term regression.

**Risks:** LOW — new module, no existing code modified.

**Rollback:** Delete `src/lib/activity/` and new test files.

**Acceptance Criteria:**
- [ ] All composer tests pass
- [ ] All copy regression tests pass
- [ ] All visibility filter tests pass
- [ ] All security tests pass
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] No existing tests broken
- [ ] No UI/component changes

---

## PR 4 — Estimate Activity UI Integration

**Purpose:** Replace local copy logic in `EstimateSheetContent.tsx` with the central composer. Preserve all existing behavior and UI structure.

**Files:**
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx`
  - Replace `getEventLabel()` → `activity.title`
  - Replace `getEventSummary()` → `activity.summary` or `activity.changes`
  - Replace `getAuditEventDescription()` → `activity.title`
  - Replace `getActorLabel()` → `activity.actor.displayName`
  - Replace `humanizeAuditField()` → `formatActivityFieldLabel()`
  - Replace `formatAuditFieldValue()` → `formatActivityValue()`
  - Keep grouping, filtering, scope tree, pagination logic
- **MODIFIED:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — update DOM assertions

**Risks:** MEDIUM — `EstimateSheetContent.tsx` is ~3000 lines. Incremental replacement recommended.

**Rollback:** Revert `EstimateSheetContent.tsx` to previous version.

**Acceptance Criteria:**
- [ ] All 13 event types render human-readable copy
- [ ] Activity cards show complete sentences with actor names
- [ ] No raw event types in primary card display
- [ ] Audit facts still expandable with full detail
- [ ] Filters, search, day grouping, correlation grouping unchanged
- [ ] Load-more pagination unchanged
- [ ] Scope tree selection unchanged
- [ ] Row Activity tab shows human-readable copy
- [ ] All existing tests pass
- [ ] `bun run type-check` passes

---

## PR 5 — Shared Link Activity API Integration

**Purpose:** Replace raw shared-link activity copy with composer-based view model. Public API route returns composed items.

**Files:**
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts`
  - Select `event_type` from `shared_link_events` (currently not selected)
  - Return `ActivityViewModel[]` instead of `PublicActivityItem[]`
  - Compose all items server-side with `visibility: "client"`
  - Strip `raw` field from all client-visible items
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx`
  - Accept `ActivityViewModel[]` and render from it
  - Replace `a.type.toUpperCase()` → badge rendering
  - Replace `Decision: {a.decision}` → `activity.title`
  - Replace raw event rendering → human-readable title
- **MODIFIED:** `tests/vitest/project-publication-activity.test.tsx` — update response shape assertions

**Risks:** MEDIUM — changing public API response shape. Only consumed by `SharedLinkActivityFeed`.

**Rollback:** Revert API route and `SharedLinkActivityFeed.tsx`.

**Acceptance Criteria:**
- [ ] Public API returns `ActivityViewModel[]` with `title` field
- [ ] Public API response has NO `raw` field for client visibility
- [ ] Public API response has NO raw UUIDs
- [ ] Public API response has NO raw event types
- [ ] Public API response has NO internal comments
- [ ] `SharedLinkActivityFeed` renders human-readable copy
- [ ] Owner view still shows internal comments with badge
- [ ] All existing tests pass

---

## PR 6 — Recipient Actor Resolution + Comments/Decisions Copy

**Purpose:** Resolve recipient names for decision/comment/event actors. Make decision and comment copy fully human-readable.

**Files:**
- **MODIFIED:** `src/lib/publication/actions.ts` — Add batched recipient lookup in `loadSharedLinkActivity()`. Replace hardcoded `author: "recipient"` with resolved names.
- **MODIFIED:** `src/lib/activity/activity-composer.ts` — Accept `recipientDisplayName` option for `composeSharedLinkActivity()`
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — Render resolved names in owner view
- **MODIFIED:** `src/lib/publication/actions.ts` — Improve digest email copy for decisions
- **MODIFIED:** `tests/vitest/project-publication-comments.test.tsx` — add copy assertions
- **MODIFIED:** `tests/vitest/project-publication-decision.test.tsx` — add copy assertions

**Risks:** LOW — additive; adds a query for recipient names but uses batched lookup.

**Rollback:** Revert changes to individual files.

**Acceptance Criteria:**
- [ ] "Maria approved the proposal." not "Decision: accepted"
- [ ] "Maria declined the proposal." not "Decision: declined"
- [ ] "Maria requested revisions." not "Decision: revision_requested"
- [ ] "Maria commented on Living Area." with resolved name
- [ ] Internal comments show owner name with "Internal" badge
- [ ] Client view shows "Client" or recipient's own name
- [ ] Decision digest email copy improved
- [ ] All existing tests pass

---

## PR 7 — Realtime/Pagination Hardening

**Purpose:** Fix shared-link owner pagination (query-level cursor) and finalize Realtime strategy.

**Files:**
- **MODIFIED:** `src/lib/publication/actions.ts` — Apply cursor per-table before limit+1. Use composite `(created_at, id)` cursor.
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — Realtime fix finalization (if not completed in PR 2)
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts` — Add cursor pagination for public API
- **MODIFIED:** `tests/vitest/project-publication-activity.test.tsx` — Deep pagination test

**Risks:** MEDIUM — pagination changes affect data fetching. Needs careful edge case testing.

**Rollback:** Revert per-file changes.

**Acceptance Criteria:**
- [ ] Deep pagination correctly fetches older events from all source tables
- [ ] Cursor is composite `(created_at, id)`
- [ ] hasMore correctly computed
- [ ] Public API supports cursor pagination
- [ ] Realtime subscription fires only for correct publication
- [ ] All existing tests pass

---

## PR 8 — UI Polish, Accessibility, Manual QA

**Purpose:** Final UI refinements, accessibility improvements, empty/loading/error states, and manual QA pass.

**Files:**
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx` — Card layout, aria attributes, keyboard nav
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — Card layout, badges, empty state, aria-live
- **POTENTIALLY:** Supabase migrations — additive indexes if needed

**Accessibility checklist:**
- [ ] `role="feed"` on activity list
- [ ] `role="article"` on activity cards with `aria-label`
- [ ] `aria-live="polite"` for new activity announcements
- [ ] Keyboard navigation: Tab through cards, Enter/Space to expand audit
- [ ] Day groups with `aria-label`
- [ ] Screen reader smoke test passed

**Acceptance Criteria:**
- [ ] Cards follow new anatomy (primary → context → badges → body → audit)
- [ ] Badges render for all event types
- [ ] Expand/collapse keyboard-operable
- [ ] Realtime "New activity" banner (not auto-scroll) if Realtime enabled
- [ ] Empty states show guidance copy
- [ ] Loading skeleton renders
- [ ] Mobile responsive verified
- [ ] Accessibility audit passes (axe-core + manual screen reader)
- [ ] Manual QA scripts executed and passing
- [ ] Performance: 200 events render without lag
- [ ] `bun run type-check` passes

---

## Review Strategy

Each PR should:
1. Be self-contained
2. Be independently testable (all tests pass)
3. Be revertible
4. Be small (<500 lines changed per PR)

Each PR description should include:
- What was changed and why
- Screenshots (for UI changes)
- Link to relevant planning doc
- Rollback instructions
- Manual QA checklist

---

## Cross-References

- See `04-implementation-plan.md` for full phase details
- See `05-blast-radius-analysis.md` for per-file risk assessment
- See `12-second-pass-verification-audit.md` for corrections applied
