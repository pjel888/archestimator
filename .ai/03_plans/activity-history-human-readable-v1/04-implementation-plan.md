# 04 — Implementation Plan

**Date:** 2026-06-02  
**Status:** Proposed (pending approval)

---

## Overview

The implementation will be split into 7 phases (Phases 0–6), each delivered as a separate PR. No phase depends on a later phase for correctness — each phase can be reviewed and shipped independently.

---

## Phase 0 — Tests and Fixtures

### Goal
Establish a test baseline that prevents regression into technical copy. All formatter tests pass before any production code changes.

### Files Likely Touched
- **NEW:** `tests/vitest/activity-composer.test.ts` — unit tests for the Activity Composer
- **NEW:** `tests/vitest/activity-copy-regression.test.ts` — regression tests for banned terms
- **NEW:** `tests/vitest/activity-view-model.test.ts` — view model type tests
- **MODIFIED:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — add copy assertion tests
- **MODIFIED:** `tests/vitest/project-publication-activity.test.tsx` — add copy assertion tests
- **NEW:** `tests/vitest/fixtures/activity-events.ts` — shared test fixtures

### Tests to Add
1. All formatter unit tests (see `08-test-strategy.md`)
2. All copy regression tests (banned terms never appear)
3. All visibility filter tests (internal comments, actor privacy, raw field stripping)
4. All edge case tests (null snapshots, missing actors, deleted targets, unknown event types)

### Risks
- Low risk — tests are additive, no production code changes

### Exit Criteria
- [ ] All new tests pass (they will fail initially against current code — that's expected and documented)
- [ ] Tests cover all 13 estimate event types, 3 decision types, comments, and shared-link events
- [ ] Copy regression tests assert banned terms are absent from primary copy strings

---

## Phase 1 — Activity Composer Module

### Goal
Create the central activity formatting/composition module under `src/lib/activity/`. No UI changes yet.

### Files Likely Touched
- **NEW:** `src/lib/activity/activity-view-model.ts` — types and composer functions
- **NEW:** `src/lib/activity/activity-copy.ts` — field/value/actor formatters, copy dictionary
- **NEW:** `src/lib/activity/index.ts` — barrel export

### Key Functions to Implement
1. `composeEstimateActivity(event, opts)` — `EstimateSheetHistoryEvent` → `ActivityViewModel`
2. `composeSharedLinkActivity(item, opts)` — `ActivityItem` → `ActivityViewModel`
3. `formatActivityFieldLabel(field)` — DB field → human label
4. `formatActivityValue(field, value, context)` — raw value → formatted string
5. `formatActivityActor(actorUserId, actorLabel, visibility)` — actor display
6. `filterActivityForVisibility(events, visibility)` — strip non-visible items
7. `mergeActivityFeeds(estimate, share)` — combined timeline

### Dependencies
- Imports `EstimateSheetHistoryEvent` from `src/lib/estimates/actions.ts`
- Imports `ActivityItem` from `src/lib/publication/actions.ts`
- No UI dependencies

### Risks
- Low risk — new module, no existing code modified

### Tests
- All tests from Phase 0 should now pass against the real composer

### Exit Criteria
- [ ] All composer tests pass
- [ ] All copy regression tests pass
- [ ] Module exports cleanly, no circular dependencies
- [ ] `bun run type-check` passes

---

## Phase 2 — Estimate Activity UI Integration

### Goal
Replace local copy logic in `EstimateSheetContent.tsx` with the central composer. Preserve all existing behavior.

### Files Likely Touched
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx`
  - Replace `getEventLabel()` → use `activity.title`
  - Replace `getEventSummary()` → use `activity.summary` or `activity.changes`
  - Replace `getAuditEventDescription()` → use `activity.title`
  - Replace `getActorLabel()` → use `activity.actorLabel`
  - Replace `humanizeAuditField()` → use `formatActivityFieldLabel()`
  - Replace `formatAuditFieldValue()` → use `formatActivityValue()`
  - Keep `getAuditChangeDetails()` for expandable audit facts (maps to `activity.facts`)
  - Keep `isBlankEstimateRowAuditEvent()` — still needed for blank row detection
  - Keep `groupActivityTimelineByDay()` — still needed for UI grouping
  - Keep `groupActivityEvents()` — still needed for correlation grouping

### Migration Approach
- Compose events in the same spot where they're currently formatted
- Wrap each event in `composeEstimateActivity(event, { visibility: "owner" })` 
- Use `activity.title` instead of `getEventLabel() + getEventSummary()`
- Use `activity.changes` for individual field diffs
- Use `activity.facts` for expandable audit cards
- Use `activity.meta` for the timestamp/context line
- Use `activity.delta` for the cost badge

### Risks
- Medium risk — `EstimateSheetContent.tsx` is a large file (~3000 lines) with complex state management
- Mitigation: Incremental replacement — replace one function at a time, verify tests after each

### Tests
- All existing `estimate-sheet-version-control-ui.test.tsx` tests must continue to pass
- Add assertions that `activity.title` matches expected human-readable copy for each event type
- Add assertions that `activity.title` does not contain banned technical terms

### Exit Criteria
- [ ] All existing estimate sheet version control tests pass
- [ ] All new copy assertion tests pass
- [ ] Manual QA: Activity History modal renders human-readable copy for all event types
- [ ] Manual QA: Filters, search, day grouping, correlation grouping still work
- [ ] Manual QA: Load-more pagination still works
- [ ] Manual QA: Scope tree (sheet/row/node) still works

---

## Phase 3 — Shared Link Activity API Integration

### Goal
Replace raw shared-link activity copy in the API route and the `SharedLinkActivityFeed` component with the composer.

### Files Likely Touched
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts`
  - Return `ActivityViewModel[]` instead of `PublicActivityItem[]`
  - Apply `composeSharedLinkActivity(item, { visibility: "client" })` to all items
  - Strip `raw` field from all items
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx`
  - Render `activity.title` instead of `a.type.toUpperCase()`
  - Render `activity.body` for comment/decision notes
  - Render `activity.badges` for type badges
  - Render `activity.meta` for timestamp/actor
  - Remove `Decision: {a.decision}` raw rendering
- **MODIFIED:** `src/lib/publication/actions.ts` (optional)
  - Optionally return composed items alongside raw `ActivityItem[]`

### Migration Approach
- Public API route: Compose all items server-side, return the view model
- Owner server action: Continue returning `ActivityItem[]`, let the client component compose (consistent with estimate history pattern)
- `SharedLinkActivityFeed`: Accept `ActivityViewModel[]` or compose internally

### Risks
- Medium risk — changing the public API response shape could break existing consumers
- Mitigation: The public API is consumed only by `SharedLinkActivityFeed` — verify it still renders correctly

### Tests
- All existing `project-publication-activity.test.tsx` tests must continue to pass
- Add copy assertions for shared-link activity items
- Add assertions that public API response does not contain raw IDs or technical terms

### Exit Criteria
- [ ] Public API returns `ActivityViewModel[]` with human-readable copy
- [ ] Public API never returns internal comments
- [ ] Public API never returns raw UUIDs or event types
- [ ] `SharedLinkActivityFeed` renders human-readable copy
- [ ] Owner view still shows internal comments
- [ ] Realtime subscription still triggers refresh

---

## Phase 4 — Comments/Decisions Timeline Integration

### Goal
Add proper human-readable copy for comments, approvals, declines, and revision requests. Ensure visibility filtering is correct.

### Files Likely Touched
- **MODIFIED:** `src/lib/activity/activity-view-model.ts` — ensure comment/decision composers handle all cases
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — badge rendering, internal marker
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts` — decision copy (already done in Phase 3)
- Potentially: `src/app/api/share/[token]/comment/route.ts` — no changes needed (insert only)
- Potentially: `src/app/api/share/[token]/decision/route.ts` — no changes needed (insert only)

### Key Behaviors
- Decision `"accepted"` → title: `"{name} approved the proposal."`, badge: "Approved"
- Decision `"declined"` → title: `"{name} declined the proposal."`, badge: "Declined"
- Decision `"revision_requested"` → title: `"{name} requested revisions."`
- Comment → title: `"{name} commented on {location}."`, body: comment text
- Internal comment → title: `"{name} added an internal note on {location}."`, badge: "Internal"
- Shared link event `"open"` → title: `"Client viewed the proposal."`

### Risks
- Low risk — building on Phase 3 infrastructure

### Tests
- All existing `project-publication-comments.test.tsx` and `project-publication-decision.test.tsx` tests must pass
- Add copy assertions for each decision type
- Add visibility assertions (internal comment not in public feed)

### Exit Criteria
- [ ] All decision types render human-readable copy
- [ ] Internal comments visible only to owners
- [ ] Internal comments have "Internal" badge
- [ ] Comment body renders safely (HTML stripped, truncated)
- [ ] Decision note renders as secondary text

---

## Phase 5 — UI Polish and Accessibility

### Goal
Refine the activity timeline UI: card layout, badges, empty states, expandable audit facts, realtime messaging, accessibility.

### Files Likely Touched
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx` — AuditEventCard, EventList, AuditEventGroup
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — card layout, badges, empty state
- Possibly: new components for shared timeline primitives (if the two feeds converge)

### Key Changes
1. **Card anatomy**: Primary sentence → context line → badge/chip → comment body → expandable audit
2. **Badges**: "Changed", "Added", "Removed", "Approved", "Declined", "Comment", "Internal"
3. **Expand/collapse**: Chevron button on audit cards, `aria-expanded`
4. **Empty states**: Updated copy (see `02-activity-copywriting-system.md`)
5. **Loading states**: Skeleton cards (2–3 placeholder cards during load)
6. **Realtime indicator**: "New activity" banner instead of auto-scroll
7. **Accessibility**: `role="feed"`, `aria-live="polite"`, `aria-label` on cards, keyboard navigation
8. **Screen reader announcements**: `aria-live` region announces new activity count

### Risks
- Medium risk — UI changes affect user experience; need visual QA
- Mitigation: Incremental PRs, feature flag behind `?activityV2=true` query param (if needed)

### Tests
- Accessibility tests (axe-core or manual with screen reader)
- New UI component tests for card layout
- Update existing UI tests for new DOM structure

### Exit Criteria
- [ ] Timeline cards follow new anatomy
- [ ] Badges render correctly for all event types
- [ ] Expandable audit facts work with keyboard
- [ ] Realtime "New activity" indicator appears
- [ ] Screen reader announces new activity
- [ ] Empty states show guidance copy
- [ ] Loading skeleton renders
- [ ] Mobile responsive

---

## Phase 6 — Performance, Reliability, and Rollout

### Goal
Verify performance, ensure backward compatibility, and prepare for production.

### Files Likely Touched
- `src/lib/estimates/actions.ts` — query review (if needed)
- `src/lib/publication/actions.ts` — digest trigger for decisions
- `src/app/api/share/[token]/activity/route.ts` — pagination addition
- Supabase migrations — if indexing or RPC optimization needed

### Key Changes
1. **Query review**: Verify index usage on `created_at`, `event_type`, `estimate_id`, `publication_id`
2. **Pagination**: Add cursor pagination to public activity API route (currently limit 100, no cursor)
3. **Payload size**: Audit that composed view models are reasonably sized (<10KB per page)
4. **Realtime**: Reduce refetch frequency (debounce 2s for comment/decision inserts)
5. **Email digest**: Extend digest to cover decision events, not just comments
6. **Backward compatibility**: Phase 0–5 introduces no breaking changes to stored data

### Risks
- Low risk — performance improvements are additive

### Tests
- Performance smoke tests (render 200 events in Activity History modal)
- Cursor pagination test for public API route
- Digest trigger test for decision events

### Exit Criteria
- [ ] Public API route supports cursor pagination
- [ ] Digest emails fire for decisions
- [ ] Realtime debounce prevents excessive refetching
- [ ] 200-event timeline renders without noticeable lag
- [ ] No N+1 queries in activity loading paths
- [ ] Final QA pass on all activity surfaces
- [ ] Production monitoring checklist completed

---

## Rollback Strategy

Each phase is independently revertible:
- Phase 0 (tests): No production code changes — no rollback needed
- Phase 1 (composer): New module — revert by deleting the module
- Phase 2 (estimate UI): Revert by restoring original `EstimateSheetContent.tsx` — no data changes
- Phase 3 (shared link API): Revert by restoring original API route and `SharedLinkActivityFeed.tsx` — no data changes
- Phase 4 (comments/decisions): Revert by restoring earlier versions — no data changes
- Phase 5 (UI polish): Revert by restoring earlier component versions — no data changes
- Phase 6 (performance): Revert by rolling back optimization changes — no data changes

No database migrations are required. No data loss risk.

---

## Timeline Dependency Map

```
Phase 0 (tests) ──────────────────────────────────────────────────────────┐
    ↓                                                                       │
Phase 1 (composer module) ─────────────────────────────────────────────────┤
    ↓                                                                       │
Phase 2 (estimate UI) ──┐                                                   │
    ↓                    │                                                  │
Phase 3 (shared link API)┤   (Phases 2 and 3 are independent of each other) │
    ↓                    │                                                  │
Phase 4 (comments/decisions) ───── depends on Phase 3                       │
    ↓                                                                       │
Phase 5 (UI polish) ── depends on Phases 2, 3, 4                            │
    ↓                                                                       │
Phase 6 (performance) ── depends on all previous phases                      │
```
