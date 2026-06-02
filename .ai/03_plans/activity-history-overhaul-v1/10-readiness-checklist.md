# 10 — Readiness Checklist

**Date:** 2026-06-02
**Fourth-pass note:** See `32-final-implementation-readiness-scorecard.md` for the definitive go/no-go assessment.

---

## Planning Readiness

- [x] Research completed — UX principles, copy rules, audit best practices, accessibility
- [x] Current event types inventoried — 14 raw estimate event types (12 active + 2 dormant), 5 shared-link event types, 3 decision types
- [x] Copy dictionary approved (pending final review)
- [x] Data contract approved (pending final review)
- [x] Visibility rules explicit — owner/client/internal with defense-in-depth
- [x] Test cases documented — 100+ specific test cases
- [x] Blast radius mapped — 22 files, 2 critical, 2 high, 10 medium, 12 low-risk items
- [x] Performance risks documented — index analysis needed, payload sizes understood
- [x] Security/privacy risks documented — 2 critical (internal comment leak, raw field leak)
- [x] Migration decision: **No database migration for V1.0 copy-only. V1.1 uses existing `event_type` values + `metadata_json.access_stage` (no migration). Enum/CHECK additions deferred to V2 — these ARE migrations. See D-009, D-010.**
- [x] Fourth-pass reconciliation complete: 15 contradictions resolved, 28 decisions documented, stakeholder review packet ready. See `30-final-technical-reconciliation-audit.md` and `29-final-decision-log-and-approval-matrix.md`.
- [x] Third-pass planning docs complete — 27 documents
- [x] Feature flag decision: **Not required** — phased PRs provide natural rollout control
- [x] Rollout plan: **9 small PRs, each independently revertible**
- [x] PR split documented in `11-pr-sequencing-plan.md` and `27-third-pass-master-implementation-blueprint.md`
- [x] Third-pass verification complete at `d78686f` — `22-third-pass-verification-audit.md`

---

## Implementation Prerequisites

- [ ] All stakeholders have reviewed and approved the copywriting system (`02-activity-copywriting-system.md`)
- [ ] All stakeholders have reviewed and approved the view model (`03-data-contract-and-event-model-plan.md`)
- [ ] Index analysis on Supabase completed (verify `estimate_sheet_events` indexes)
- [ ] Accessibility review of current state completed (baseline for regression testing)
- [ ] Test fixtures created (`tests/vitest/fixtures/activity-events.ts`)

---

## Phase 0: Tests and Fixtures

- [ ] `tests/vitest/fixtures/activity-events.ts` created with all mock events
- [ ] `tests/vitest/activity-composer.test.ts` created (all unit tests passing)
- [ ] `tests/vitest/activity-copy-regression.test.ts` created (all banned-term tests passing)
- [ ] All new tests initially FAIL against current code (expected — they test the new composer)

---

## Phase 1: Activity Composer Module

- [ ] `src/lib/activity/activity-view-model.ts` created
- [ ] `src/lib/activity/activity-copy.ts` created
- [ ] `src/lib/activity/index.ts` created
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] All composer tests pass
- [ ] All copy regression tests pass

---

## Phase 2: Estimate Activity UI Integration

- [ ] All `EstimateSheetContent.tsx` formatting functions replaced with composer calls
- [ ] All existing `estimate-sheet-version-control-ui.test.tsx` tests pass
- [ ] All existing `estimate-sheet-version-control-actions.test.ts` tests pass
- [ ] Manual QA: Activity History modal renders correctly
- [ ] Manual QA: All 14 raw estimate event types (12 active + 2 dormant) produce expected copy
- [ ] Manual QA: Filters, search, day grouping, correlation grouping work
- [ ] Manual QA: Load-more pagination works
- [ ] Manual QA: Scope tree (sheet/row/node) works
- [ ] No visual regressions in activity cards

---

## Phase 3: Shared Link Activity API Integration

- [ ] Public API route returns `ActivityViewModel[]`
- [ ] `SharedLinkActivityFeed.tsx` renders from view models
- [ ] All existing `project-publication-activity.test.tsx` tests pass
- [ ] Public API response shape matches new contract
- [ ] Manual QA: Public shared link page shows human-readable activity
- [ ] Manual QA: Owner view still shows internal comments
- [ ] Manual QA: Realtime subscription still triggers refresh

---

## Phase 4: Comments/Decisions Timeline Integration

- [ ] All decision types render human-readable copy
- [ ] Internal comments visible only to owners with badge
- [ ] Comment body renders safely
- [ ] All existing `project-publication-comments.test.tsx` tests pass
- [ ] All existing `project-publication-decision.test.tsx` tests pass

---

## Phase 5: UI Polish and Accessibility

- [ ] Card anatomy follows new design
- [ ] Badges render for all event types
- [ ] Expandable audit facts work with keyboard
- [ ] Realtime new activity indicator appears
- [ ] Screen reader announces new activity
- [ ] Empty states show guidance copy
- [ ] Loading skeleton renders
- [ ] Mobile responsive verified
- [ ] Accessibility audit passes (axe-core, manual screen reader)

---

## Phase 6: Performance and Reliability

- [ ] Index analysis completed (all activity queries use indexes)
- [ ] Public API route supports cursor pagination
- [ ] Digest emails fire for decisions
- [ ] Realtime debounce prevents excessive refetching
- [ ] 200-event timeline renders without lag
- [ ] No N+1 queries in activity loading paths
- [ ] Payload sizes within acceptable limits
- [ ] Final QA pass on all activity surfaces

---

## Production Readiness

- [ ] All tests pass
- [ ] No breaking changes to public API (contract change is additive)
- [ ] Rollback strategy tested (revert any phase independently)
- [ ] Performance metrics captured (first page load, composer overhead)
- [ ] Security audit passed (no data leakage in any view)
- [ ] Accessibility audit passed
- [ ] Copy approved by stakeholders
- [ ] Monitoring in place (error rate, activity API latency)

---

## Go/No-Go Recommendation

### Go/No-Go: See `32-final-implementation-readiness-scorecard.md` for definitive fourth-pass assessment.
### GO for PRs 1-6 (no privacy dependencies) ✅
### NO-GO for PR 7 (access telemetry) until stakeholder sign-off 🔴

**Blocker:** Access telemetry privacy/product decisions must be approved before PR 7. See `28-fourth-pass-stakeholder-review-packet.md`.

### Blocker: Access telemetry privacy/product decisions must be approved before PR 7

- In-product disclosure of access logging (legal/compliance)
- Bot/crawler event filtering in UI
- Location data granularity policy
- These decisions gate the shared page access telemetry implementation. See `26-privacy-retention-and-client-disclosure-plan.md`.

---

## Blockers

- None currently. Planning is complete.
- If stakeholders request changes to the copy system, update `02-activity-copywriting-system.md` and re-evaluate.

## Second-Pass Verification

- [x] All 15 known issues verified against current code (`12-second-pass-verification-audit.md`)
- [x] Shared-link Realtime status assessed (broken filter — needs fix)
- [x] Decision digest confirmed (already exists)
- [x] `row_inserted` filter bug confirmed
- [x] Public API service-role model documented
- [x] Shared-link pagination flaw documented
- [x] Two event tables mapped distinctly
- [x] `node_deleted_with_children` missing name confirmed
- [x] Actor context gaps documented
- [x] North Star and product principles defined (`13-north-star-and-product-principles.md`)
- [x] UX paths and user journeys mapped (`14-user-journeys-and-ux-paths.md`)
- [x] Surface map created (`15-information-architecture-and-surface-map.md`)
- [x] Event taxonomy canonicalized (`16-event-taxonomy-and-lifecycle-map.md`)
- [x] Observability plan defined (`17-observability-analytics-and-quality-plan.md`)
- [x] Manual QA matrix created (`18-manual-qa-and-acceptance-matrix.md`)
- [x] Migration stance nuanced (`19-migration-and-backfill-decision-matrix.md`)
- [x] Edge cases catalogued (`20-edge-case-and-failure-mode-matrix.md`)
- [x] Composer spec ready (`21-activity-composer-spec.md`)

## Open Questions (for stakeholder review)

1. Should the shared-link Activity tab and the workshop Activity History modal eventually converge on a single timeline component? (Recommendation: Not in V1 — keep separate for now.)
2. Should old estimates with incomplete snapshots get backfilled copy? (Recommendation: Graceful fallback only — no backfill migration in V1.)
3. Should the public API pre-compute titles server-side? (Recommendation: Yes — it's the API's job to provide presentable data.)
