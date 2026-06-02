# 27 — Third-Pass Master Implementation Blueprint

**Date:** 2026-06-02
**Status:** Third-pass (superseded by fourth-pass scorecard)
**Supersedes:** `04-implementation-plan.md` (for sequencing), `10-readiness-checklist.md` (for go/no-go), `11-pr-sequencing-plan.md` (for PR count)

> ⚠️ **Fourth-pass note (2026-06-02):** This document was the third-pass blueprint. The fourth pass found 15 contradictions (see `30-final-technical-reconciliation-audit.md`). The claim "All 27 documents are internally consistent" (§9) was incorrect. For the definitive go/no-go, see `32-final-implementation-readiness-scorecard.md`. For the decision source of truth, see `29-final-decision-log-and-approval-matrix.md`. This document remains useful for PR sequence and scope reference but is NOT the authoritative implementation guide.

---

## Purpose

Consolidate the implementation plan after third-pass changes. This document is the single best next-step guide — supersedes confusion across `04`, `10`, and `11`.

---

## 1. Folder Rename — Complete

- **Old:** `.ai/03_plans/activity-history-human-readable-v1/`
- **New:** `.ai/03_plans/activity-history-overhaul-v1/`
- **Method:** `git mv`
- **External references:** 0 found (no stale links outside the folder)

---

## 2. North Star

"Every meaningful project, estimate, and client action should be understandable in three seconds, traceable in thirty seconds, and safe to show to the right audience."

Additions for third pass:
- Access events are meaningful client activity.
- A shared link being opened is a project signal.
- The owner should know whether the client reached the proposal or only the password gate.
- Tracking should build trust, not surveillance creep.
- Privacy-safe telemetry is part of the product promise.

---

## 3. Final Event Model Direction

### Copy Composer

- Build `src/lib/activity/` module with centralized composer
- Use across estimate activity, shared-link activity, email digest, and AI context
- Public API returns sanitized `ActivityViewModel[]`

### Access Telemetry

- Use `metadata_json` schema (no migration for V1.1)
- Create `enrichAccessEventMetadata(request)` helper
- Record access stages: `page_visit`, `password_gate_viewed`, `password_attempted`, `password_unlocked`, `proposal_viewed`, `recipient_session_started`
- Use provider geo headers for approximate location
- Hash IP and user-agent (already implemented)
- Parse user-agent into safe friendly fields
- Never store password values, raw IP, or raw UA

### Decision: `metadata_json` for V1.1, structured columns deferred to V2

---

## 4. Final PR Sequence (9 PRs)

```
PR 1 — Third-pass planning docs (this PR)
    │  Docs only: folder rename + 6 new docs + 21 doc updates
    │  No production code changes
    ▼
PR 2 — Preflight correctness cleanup
    │  Fix row_inserted filter, Realtime filter/decision, public API event_type
    │  LOW risk, small changes
    ▼
PR 3 — Activity Composer module + tests
    │  src/lib/activity/ + ~100 tests
    │  LOW risk, new module only
    ▼
PR 4 — Estimate Activity UI integration
    │  Replace inline copy in EstimateSheetContent.tsx with composer
    │  MEDIUM risk, ~3000-line file
    ▼
PR 5 — Shared-link Activity API integration
    │  Public API returns ActivityViewModel[], SharedLinkActivityFeed renders composed
    │  MEDIUM risk, API contract change
    ▼
PR 6 — Recipient actor resolution + comments/decisions copy
    │  Batched recipient lookup, replace "recipient" hardcode
    │  LOW risk, additive
    ▼
PR 7 — Shared page access telemetry ← NEW
    │  Page visits, password-gate, proposal views, device/browser/location
    │  enrichAccessEventMetadata(), server-side recipient resolution
    │  MEDIUM risk, touches page.tsx, password/route.ts, session/route.ts
    ▼
PR 8 — Realtime/pagination hardening
    │  Query-level cursor, composite (created_at, id), public API pagination
    │  MEDIUM risk, data fetching changes
    ▼
PR 9 — UI polish, accessibility, manual QA
    │  Card layout, ARIA, keyboard nav, access event cards, skeleton loading
    │  LOW risk, visual changes only
```

PRs 4 and 5 can be worked on in parallel (different surfaces, same composer).
PR 6 depends on PR 5.
PR 7 depends on PR 5 (shared-link composer) and PR 6 (recipient resolution).
PR 8 depends on PR 5.
PR 9 depends on all previous PRs.

---

## 5. Readiness Gates

### Gate A: Preflight

- [ ] `row_inserted` filter fixed
- [ ] Realtime decision made (fix or remove)
- [ ] Public API selects `event_type`
- [ ] All existing tests pass

### Gate B: Composer

- [ ] ~100 composer tests pass
- [ ] All copy regression tests pass
- [ ] No existing tests broken
- [ ] No UI/component changes yet

### Gate C: Estimate UI

- [ ] All 13 event types render human-readable copy
- [ ] All existing estimate tests pass
- [ ] Manual QA: Activity History modal

### Gate D: Shared-link UI

- [ ] Public API returns `ActivityViewModel[]`
- [ ] No raw UUIDs, raw event types, or internal comments in public API
- [ ] Owner view shows internal comments with badge
- [ ] All existing shared-link tests pass

### Gate E: Access Telemetry

- [ ] `page_visited` recorded before password gate
- [ ] `password_gate_viewed` recorded
- [ ] `password_attempted` success/failure/locked (already implemented)
- [ ] `password_unlocked` recorded
- [ ] `proposal_viewed` recorded with recipient context
- [ ] `recipient_session_started` recorded
- [ ] Server-side recipient resolution for `?recipient=` param
- [ ] Device/browser/location in `metadata_json`
- [ ] No raw IP, no password values, no raw UA in UI
- [ ] Bot/crawler flagged
- [ ] All access telemetry tests pass

### Gate F: Final QA

- [ ] Accessibility audit passes (axe-core + manual screen reader)
- [ ] Manual QA scripts executed
- [ ] Performance: 200 events render without lag
- [ ] Realtime/pagination verified
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun run validate` passes
- [ ] `bun run build` passes

---

## 6. Required Tests

### Composer Tests (~100 tests)
See `08-test-strategy.md` and `21-activity-composer-spec.md`.

### Access Telemetry Tests (~25 tests)
See `23-shared-page-access-activity-plan.md` Section 8.

### Copy Regression Tests (~15 tests)
See `08-test-strategy.md` Section 2.

### Security/Privacy Tests (~12 tests)
See `07-security-privacy-readiness.md` and `08-test-strategy.md` Section 7.

### UI Component Tests (existing + new)
See `08-test-strategy.md` Sections 3-4.

### Accessibility Tests
See `08-test-strategy.md` Section 6.

---

## 7. Manual QA Gates

See `18-manual-qa-and-acceptance-matrix.md` for full scripts. Key additions for third pass:
- Access events appear in owner activity feed
- Device/browser/location in audit facts
- Millisecond timestamp in audit details
- No raw IP, no password, no raw UA in standard UI
- Bot traffic filtered from owner view
- First recipient visit correctly identifies recipient

---

## 8. Open Decisions

| # | Decision | Status | Recommendation |
|---|----------|--------|---------------|
| 1 | In-product disclosure of access logging | **Open** | Add to privacy notice. In-product disclosure optional for V1.1. |
| 2 | Bot/crawler event filtering in UI | **Open** | Filter by default in owner feed. Show in support view. |
| 3 | Retention policy | **Open** | No automated deletion in V1.1. Define before V2. |
| 4 | Location data granularity | **Open** | City-level from provider headers. Omit if unavailable. |
| 5 | Server-side vs client-side recipient resolution | **Decision made** | Resolve server-side in `page.tsx`. Set cookie server-side. Remove client-side redirect. |
| 6 | New table vs metadata_json for access telemetry | **Decision made** | metadata_json for V1.1. Structured columns/new table deferred to V2. |
| 7 | `/events` route usage | **Decision made** | Use for client-side password-gate beacon only. All other events server-side. |
| 8 | Should estimate history and shared-link activity converge? | **Decision made** | Not in V1. Separate surfaces. V2 unified timeline. |
| 9 | Should old estimates get backfilled copy? | **Decision made** | Graceful fallback only. No backfill. |

---

## 9. Go/No-Go Recommendation

### GO for third-pass documentation merge ✅

The planning pack is comprehensive, accurate, and implementation-ready. All 27 documents are internally consistent. Scope is clearly defined across V1.0–V1.2 with a clear roadmap to V3.0.

### GO for PR 2 (preflight cleanup) after docs approval ✅

Preflight fixes are small, low-risk, and unblock the composer work.

### NO-GO for full implementation (PRs 3–9) until:

- [ ] Access telemetry privacy stance is approved by stakeholders
- [ ] In-product disclosure decision is made (legal/compliance)
- [ ] Bot filtering approach is agreed
- [ ] Location data policy is approved

These are product/legal decisions, not engineering ones. The implementation plan is ready — the decisions need sign-off.

---

## 10. Recommended Next Action

1. **Stakeholder review** of `26-privacy-retention-and-client-disclosure-plan.md` — approve or revise privacy boundaries.
2. **Legal/Compliance review** of access telemetry approach (if required for PH jurisdiction).
3. **Once approved:** Merge third-pass planning docs (PR 1).
4. **Begin PR 2:** Preflight correctness cleanup (bug fixes, filter fix, Realtime decision).
5. **Continue through PR sequence** as gates are cleared.

---

## Cross-References

- See `04-implementation-plan.md` for phase-level detail (superseded by this doc for sequencing)
- See `11-pr-sequencing-plan.md` for per-PR file lists (superseded by this doc for PR count)
- See `10-readiness-checklist.md` for detailed checklist (superseded by this doc for go/no-go)
- See `23-shared-page-access-activity-plan.md` for access telemetry implementation
- See `24-activity-history-overhaul-roadmap.md` for V1–V3 roadmap
- See `25-access-event-data-model-and-migration-plan.md` for schema decisions
- See `26-privacy-retention-and-client-disclosure-plan.md` for privacy boundaries
