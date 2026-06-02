# 04 — Implementation Plan (Revised — Second Pass)

**Date:** 2026-06-02 (second pass: 2026-06-02; third pass: 2026-06-02)
**Status:** Fourth-pass reconciled — see `32-final-implementation-readiness-scorecard.md` for go/no-go

---

## Overview

The implementation is split into 9 phases (Phases 0–8), each delivered as a separate PR.

**Second pass addition:** Phase 0 added for preflight bug fixes.
**Third pass addition:** Phase 6 added for shared page access telemetry.
**Fourth pass note:** PR 2 scope expanded to include CSRF fixes (GET /activity route, comments/decisions CSRF). See `31-pr2-preflight-implementation-brief.md` for exact scope. PR 7 (access telemetry) gated on stakeholder sign-off — see `28-fourth-pass-stakeholder-review-packet.md`.

---

## Phase 0 — Preflight Correctness Cleanup (PR 2)

### Goal
Fix known bugs identified in second-pass audit before composer work begins. Ensure the foundation is solid.

### Known Bugs to Fix
1. **`row_inserted` filter mismatch** — Replace with `row_added` and `row_blank_added` in `ACTIVITY_FILTER_EVENT_TYPES`
2. **Realtime subscription filter** — Pass `publicationId` to `SharedLinkActivityFeed`, use in filter, or remove Realtime from V1 claims
3. **Public API missing `event_type`** — Add `event_type` to `shared_link_events` select in route

### Files Likely Touched
- `src/components/workshop/EstimateSheetContent.tsx` — Filter values fix
- `src/components/share/SharedLinkActivityFeed.tsx` — Realtime filter fix or removal
- `src/app/api/share/[token]/activity/route.ts` — Add `event_type` to select
- `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — Fix `eventType: "row_inserted"` in mock

### Exit Criteria
- [ ] `row_inserted` filter replaced with correct values
- [ ] Realtime decision made and implemented
- [ ] All existing tests pass
- [ ] `bun run type-check` passes

---

## Phase 1 — Activity Composer Module + Tests (PR 3)

### Goal
Create the central activity composition module AND all tests together. Both ship in one merge-safe PR — no red CI on `main`.

### Files Created
- `src/lib/activity/types.ts`
- `src/lib/activity/activity-composer.ts`
- `src/lib/activity/activity-formatters.ts`
- `src/lib/activity/activity-visibility.ts`
- `src/lib/activity/activity-copy-dictionary.ts`
- `src/lib/activity/activity-fallback.ts`
- `src/lib/activity/index.ts`
- `tests/vitest/fixtures/activity-events.ts`
- `tests/vitest/activity-composer.test.ts`
- `tests/vitest/activity-copy-regression.test.ts`
- `tests/vitest/activity-security.test.ts`

### Spec Reference
See `21-activity-composer-spec.md` for exact types, functions, and contracts.

### Exit Criteria
- [ ] All ~100+ composer tests pass
- [ ] All copy regression tests pass
- [ ] `bun run type-check` passes
- [ ] No existing tests broken
- [ ] No UI/component changes

---

## Phase 2 — Estimate Activity UI Integration (PR 4)

### Goal
Replace local copy logic in `EstimateSheetContent.tsx` with the central composer. Preserve all existing behavior.

### Files Likely Touched
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx`
  - Replace `getEventLabel()` → `activity.title`
  - Replace `getEventSummary()` → `activity.summary`
  - Replace `getAuditEventDescription()` → `activity.title`
  - Replace `getActorLabel()` → `activity.actor.displayName`
  - Replace `humanizeAuditField()` → `formatActivityFieldLabel()`
  - Replace `formatAuditFieldValue()` → `formatActivityValue()`
  - Keep grouping, filtering, scope tree, pagination logic

### Risks
- Medium risk — `EstimateSheetContent.tsx` is ~3000 lines

### Exit Criteria
- [ ] All 13 event types render human-readable copy
- [ ] No raw event types in primary card display
- [ ] All existing tests pass

---

## Phase 3 — Shared Link Activity API Integration (PR 5)

### Goal
Replace raw shared-link activity copy with composer-based view model.

### Files Likely Touched
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts` — Return `ActivityViewModel[]`, strip raw, compose server-side
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx` — Render from view model
- **MODIFIED:** `src/lib/publication/actions.ts` — Optionally enrich with composed output

### Public API Contract Change
- Response changes from `PublicActivityItem[]` to `ActivityViewModel[]`
- `raw` field stripped for client visibility
- `event_type` included in select (fix from Phase 0)

### Exit Criteria
- [ ] Public API returns `ActivityViewModel[]` with `title` field
- [ ] Public API response has no raw UUIDs, raw event types, or internal comments
- [ ] Owner view still shows internal comments with badge

---

## Phase 4 — Recipient Actor Resolution + Comments/Decisions Copy (PR 6)

### Goal
Resolve recipient names for decisions/comments. Replace "recipient" hardcode with actual names.

### Key Changes
- **MODIFIED:** `src/lib/publication/actions.ts` — Batched recipient lookup in `loadSharedLinkActivity()`
- **MODIFIED:** `src/lib/activity/activity-composer.ts` — Accept `recipientDisplayName` option
- **MODIFIED:** `src/lib/publication/actions.ts` — Improve digest email copy for decisions (already exists — improve copy)

### Decision Digest Note
Decision digest already exists (verified in second pass). This phase improves the copy, does not add it.

### Exit Criteria
- [ ] "Maria approved the proposal." not "Decision: accepted"
- [ ] Recipient names resolved from `shared_link_recipients` table
- [ ] Client view shows "Client" or own name

---

## Phase 5 — Realtime/Pagination Hardening (PR 7)

### Goal
Fix shared-link owner pagination (query-level cursor) and finalize Realtime strategy.

### Key Changes
- `src/lib/publication/actions.ts` — Apply cursor per-table before limit+1; use composite cursor
- `src/app/api/share/[token]/activity/route.ts` — Add cursor pagination for public API
- Realtime fix finalized if not done in Phase 0

### Exit Criteria
- [ ] Deep pagination correctly fetches older events from all source tables
- [ ] Public API supports cursor pagination
- [ ] Realtime subscription scoped to correct publication

---

## Phase 6 — UI Polish, Accessibility, Manual QA (PR 8)

### Goal
Final UI refinements, accessibility, empty/loading/error states, manual QA pass.

### Key Changes
- Card layout refinements
- Badges for all event types
- Expand/collapse keyboard navigation
- `aria-live` for new activity announcements
- `role="feed"`, `role="article"` on activity elements
- Empty/loading/error states
- Skeleton loading cards
- "New activity" banner (not auto-scroll)

### Exit Criteria
- [ ] Accessibility audit passes (axe-core + manual screen reader)
- [ ] Manual QA scripts executed per `18-manual-qa-and-acceptance-matrix.md`
- [ ] Performance: 200 events render without lag

---

## Rollback Strategy

Each phase is independently revertible. V1.0: no database migrations. V1.1: uses existing `event_type` values + `metadata_json.access_stage` (no migration). Enum/CHECK additions ARE migrations — deferred to V2 (D-010). No data loss risk.

---

## Cross-References

- See `11-pr-sequencing-plan.md` and `27-third-pass-master-implementation-blueprint.md` for the authoritative PR sequence
- See `12-second-pass-verification-audit.md` and `22-third-pass-verification-audit.md` for corrections
- See `21-activity-composer-spec.md` for implementation-ready spec
- See `23-shared-page-access-activity-plan.md` for access telemetry phase
