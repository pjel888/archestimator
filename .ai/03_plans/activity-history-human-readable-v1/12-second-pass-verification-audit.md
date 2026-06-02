# 12 — Second-Pass Verification Audit

**Date:** 2026-06-02  
**Branch:** `main`  
**Current HEAD:** `97c7d608b530eca135289c8d8418570a5fffacc7` (`Benchmark proposal workbook export scale`)  
**First-pass claimed commit:** `638f681` (`Refresh local validation at current head`)  
**Status:** Second-pass audit complete, docs updated

---

## 1. Environment Verification

| Item | Value |
|------|-------|
| Branch | `main` |
| Current HEAD | `97c7d60` |
| First-pass claimed HEAD | `638f681` (short hash not matching any commit in current log; likely stale or from another branch rebase) |
| First-pass planning commit | `e6539c6 Add activity history human-readable v1 planning phase` (1 commit behind current HEAD) |
| Current HEAD changes since planning | Only `97c7d60 Benchmark proposal workbook export scale` — no activity-history files modified |

**Action:** All docs updated to reference `97c7d60` as the current inspected commit. The first-pass docs are 1 commit stale — minimal impact since the delta commit is unrelated to activity history.

---

## 2. Files Inspected During Second Pass

| File | Purpose |
|------|---------|
| `src/components/share/SharedLinkActivityFeed.tsx` | Realtime subscription filter, rendering logic |
| `src/app/api/share/[token]/activity/route.ts` | Public API response shape, event type handling, service-role usage |
| `src/app/api/share/[token]/decision/route.ts` | Decision digest trigger, session handling |
| `src/app/api/share/[token]/comment/route.ts` | Comment digest trigger |
| `src/lib/publication/actions.ts` | `loadSharedLinkActivity()`, `maybeTriggerSharedLinkActivityDigest()`, `ActivityItem` type, pagination logic |
| `src/lib/publication/public-repository.ts` | `ProjectPublicationEventType`, `createPublicationServiceClient()` |
| `src/components/workshop/EstimateSheetContent.tsx` | `ACTIVITY_FILTER_EVENT_TYPES`, event label/description functions |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` | `shared_link_events` CHECK constraint, event types |
| `supabase/migrations/20260531010000_project_publication_password_attempt_event.sql` | Password attempt event compatibility |

---

## 3. Claim Verification Table

| # | Claim | First-pass status | Current verification | Action taken |
|---|-------|-------------------|---------------------|--------------|
| 4.1 | Planning docs inspect `main` at `638f681` | Claimed accurate | Inaccurate — current HEAD is `97c7d60`, hash `638f681` doesn't match any current commit short hash | Updated README.md and all docs to reference `97c7d60` |
| 4.2 | Shared-link Realtime is functional | Claimed "Realtime is wired" as strong foundation | **Broken/invalid**: filter uses `publication_id=eq.${""}` (empty string); subscribes to ALL inserts, not filtered by publication. Refetch works but subscription is overly broad, triggering unnecessary loads from other publications | Updated `00-current-state-audit.md`, `05-blast-radius-analysis.md`, `06-performance-analysis-plan.md`, `11-pr-sequencing-plan.md` |
| 4.3 | Shared-link owner pagination is reliable | Claimed "cursor pagination" works | **Flawed**: per-table `limit+1`, merge in memory, cursor filter applied AFTER merge. Deep pagination will miss older events if cursor is beyond initial per-table page | Updated `06-performance-analysis-plan.md`, `00-current-state-audit.md`, `08-test-strategy.md` |
| 4.4 | Public API returns raw event type strings | Claimed public route returns raw event types | **Partially accurate**: route returns `type: "event"` but NOT the specific `event_type` field from `shared_link_events` (the route selects `created_at, metadata_json, id` — not `event_type`). Raw `decision` enum values ARE returned verbatim | Updated `00-current-state-audit.md`, `03-data-contract-and-event-model-plan.md` |
| 4.5 | Public API uses service client (anon RLS) | Claimed "service client (anon RLS)" | **Misleading**: uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS entirely. Real protection is application-level query filtering and route logic | Updated `07-security-privacy-readiness.md`, `00-current-state-audit.md` |
| 4.6 | Decision digest is missing | Claimed "Only comment triggers digest; decisions missing" | **Incorrect**: both `comment/route.ts` and `decision/route.ts` call `maybeTriggerSharedLinkActivityDigest(publicationId, token, "decision"/"comment")`. Decision digest already exists | Updated `00-current-state-audit.md`, `04-implementation-plan.md`, `05-blast-radius-analysis.md`, `06-performance-analysis-plan.md`, `10-readiness-checklist.md`, `11-pr-sequencing-plan.md` |
| 4.7 | Shared-link event taxonomy is `comment_add`, `accept_decision`, etc. | Listed as shared-link event types | **Incomplete**: there are TWO event tables: `shared_link_events` (CHECK: open, comment_add, accept_decision, decline_decision, password_attempt) AND `project_publication_events` (TypeScript type: open, password_success, password_failure, download_attempt_blocked, password_attempt). First-pass conflated them | Updated `00-current-state-audit.md`, `16-event-taxonomy-and-lifecycle-map.md` |
| 4.8 | `ACTIVITY_FILTER_EVENT_TYPES` includes `row_inserted` | Not mentioned in first-pass as a bug | **Confirmed bug**: line 156 has `{ value: "row_inserted", label: "Inserted rows" }` but actual event types are `row_added` and `row_blank_added`. Filtering by `row_inserted` will never match any events | Updated `00-current-state-audit.md`, `04-implementation-plan.md`, `10-readiness-checklist.md` |
| 4.9 | No database migration required | Claimed as definitive | **Overstated**: true for V1 copy-only work. Future features (correlation_id on shared-link tables, richer actor snapshots, unified activity view) need additive migrations. Changed to nuanced stance | Updated `00-current-state-audit.md`, `19-migration-and-backfill-decision-matrix.md` |
| 4.10 | Shared-link decisions have sufficient actor context | Not assessed in first-pass | **Insufficient**: `loadSharedLinkActivity()` hardcodes `author: "recipient"` for decisions — no name/email resolution. Public route returns no actor for decisions at all. Cannot produce "Maria approved the proposal" without joining `shared_link_recipients` | Updated `03-data-contract-and-event-model-plan.md`, `04-implementation-plan.md`, `07-security-privacy-readiness.md` |
| 4.11 | Public client actor/email rules | Inconsistent — security plan says never expose email but comments expose `author_email` | **Confirmed inconsistency**: public route returns `author: c.author_email`. Documented explicit rule: email is acceptable for self-submitted comments, must be recipient's own email, never internal team emails | Updated `07-security-privacy-readiness.md`, `02-activity-copywriting-system.md` |
| 4.12 | No tests prevent regression into technical copy | Claimed as "critical gap" | **Partially overstated**: existing tests do assert some things (no raw `User <uuid>`, no `Server action`, no `Linked Overridden` in certain tests, internal comments filtered in public route). But no centralized, exhaustive copy regression suite | Updated `08-test-strategy.md`, `00-current-state-audit.md` |
| 4.13 | PR 2 "failing tests" is merge-safe | Claimed tests "will FAIL initially" and documented in CI | **Not merge-safe**: merging intentionally failing tests to `main` breaks CI. Updated to use `.todo`/`.skip` pattern or combine PR 2+3 | Updated `11-pr-sequencing-plan.md`, `10-readiness-checklist.md` |
| 4.14 | Accessibility tests pass via composer | Implied pure composer tests make accessibility pass | **Inaccurate**: accessibility tests need UI markup, not just pure string formatters | Updated `08-test-strategy.md`, `04-implementation-plan.md` |
| 4.15 | North Star/UX paths fully defined | Missing | **Missing** — added dedicated documents | Created `13-north-star-and-product-principles.md`, `14-user-journeys-and-ux-paths.md` |

---

## 4. Detailed Verification Per Known Issue

### 4.1 — Planning Docs Stale

**Finding:** Current HEAD is `97c7d60`, not `638f681`. The planning commit (`e6539c6`) is one behind current. The `638f681` short hash doesn't match any commit in the visible log — likely from a different branch or a rebase artifact.

**Impact:** Minimal. The only commit since planning is `97c7d60 Benchmark proposal workbook export scale`, which is unrelated to activity history.

**Action:** Updated all docs to reference `97c7d60`.

### 4.2 — Shared-link Realtime Broken

**Finding:** `SharedLinkActivityFeed.tsx` lines 75-95:
```ts
.on(changeEvent, { event: "INSERT", schema: "public", table: "shared_link_comments",
  filter: `publication_id=eq.${/* resolved in action */ ""}` }, () => load())
```

The filter template literal evaluates to `publication_id=eq.` with an empty string. Supabase Realtime filter parsing likely interprets this as no filter or invalid filter, meaning the subscription fires on ALL inserts to the table regardless of publication.

**Effect:** The `load()` function still fetches only the current publication's activity, so the UI works. But unnecessary refetches occur from activity on OTHER publications, wasting bandwidth and DB queries.

**Recommendation:**
1. **Short-term fix:** Pass `publicationId` as a prop to `SharedLinkActivityFeed` and use it in the filter.
2. **Alternative:** Remove Realtime from V1 and use polling with 30s interval.
3. **Or:** Mark Realtime as "unverified" in V1, prioritize manual refresh.

### 4.3 — Shared-link Owner Pagination Flawed

**Finding:** `loadSharedLinkActivity()` in `actions.ts`:
1. Queries `limit + 1` from each of 3 tables independently (comments, responses, events)
2. Merges all results into one array
3. Sorts by created_at DESC
4. Applies cursor filter: `filtered = filtered.filter((a) => new Date(a.created_at) < cursor)`
5. Returns `filtered.slice(0, limit)`

**Problem:** If the newest 51 items are all comments, the initial page returns only comments (no responses/events). When the cursor points to the 51st comment's timestamp, the next query fetches comments 52-102 — but responses and events with timestamps between items 1-51 were never fetched because the per-table limit already excluded them.

**Correct approach:**
- Apply cursor filter at the database query level: `WHERE created_at < cursor` before `LIMIT`
- Use composite cursor `(created_at, id)` to handle ties
- Each table independently fetches `limit + 1` with cursor filter
- Merge and take top `limit` from combined results

**Or:** Create a SQL view/RPC that unions the three tables with consistent columns and applies cursor pagination at the query level.

### 4.4 — Public API Event Type Handling

**Finding:** The public route:
- Returns `type: "event"` for shared_link_events items (hardcoded string, not the `event_type` column)
- Does NOT select or return `event_type` from `shared_link_events`
- Returns raw `decision` values: `r.decision` (which is `"accepted"`, `"declined"`, or `"revision_requested"`)
- Returns raw `metadata` JSON as-is

**First-pass claim:** "returns `decision: "revision_requested"` and `type: "event"` verbatim" — partially accurate but imprecise about what's actually returned.

**Action:** Updated docs to specify the exact current response shape. The public route does return raw decision enum values and raw event metadata. The event type from `shared_link_events.event_type` is NOT included in the public response.

### 4.5 — Service-Role Client

**Finding:** `createPublicationServiceClient()` creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY`. This bypasses RLS entirely.

**First-pass claim:** "service client (anon RLS)" — misleading because service role bypasses RLS.

**Reality:** The protection for public activity reads is:
1. Application-level query filtering (`is_internal = false` for comments)
2. Publication token hash verification + status check
3. Rate limiting
4. Response shape construction (the route builds `PublicActivityItem[]` manually)

**Action:** Updated security plan to be explicit: protection is application-level, not RLS-based.

### 4.6 — Decision Digest Already Exists

**Finding:** Both comment and decision routes call the digest:

- `comment/route.ts` line 206: `maybeTriggerSharedLinkActivityDigest(publicationId, token, "comment")`
- `decision/route.ts` line 135: `maybeTriggerSharedLinkActivityDigest(publicationId, token, "decision")`

The first-pass docs claiming "decisions missing from digest" is **incorrect**.

**Action:** Updated plan from "add decision digest" to "improve existing decision digest copy and verify behavior."

### 4.7 — Two Event Tables

**Finding:** There are TWO separate event tables with different taxonomies:

| Table | Event types | Purpose |
|-------|-----------|---------|
| `project_publication_events` | `open`, `password_success`, `password_failure`, `download_attempt_blocked`, `password_attempt` | Internal analytics/security events. Written by `recordProjectPublicationEvent()` |
| `shared_link_events` | `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt` | Owner/recipient-visible activity events. Written during `recordProjectPublicationEvent()` for `open` events and password flows |

**First-pass claim:** Listed `comment_add`, `accept_decision`, `decline_decision` as "defined in CHECK constraint, not inserted" — accurate for `shared_link_events`. But first-pass also listed `password_attempt` as "defined in CHECK constraint, inserted in password flow" — partially accurate but doesn't distinguish the two tables.

**Action:** Created `16-event-taxonomy-and-lifecycle-map.md` with clear distinction between the two event tables.

### 4.8 — `row_inserted` Filter Bug

**Finding:** Line 156 of `EstimateSheetContent.tsx`:
```ts
{ value: "row_inserted", label: "Inserted rows" },
```

Actual event types are `row_added` and `row_blank_added`. `row_inserted` is not a valid event type anywhere in the codebase. Selecting this filter will match zero events.

**Test file impact:** `estimate-sheet-version-control-ui.test.tsx` line 1054 also uses `eventType: "row_inserted"` in a mock — which tests the filter rendering but doesn't catch the mismatch.

**Action:** Added to preflight cleanup plan (Phase 0). Should be fixed before composer work.

### 4.9 — Migration Stance Too Strong

**Finding:** The first-pass repeats "No database migration required" across multiple documents. This is:
- **True** for V1 copy-only work (the composer is a projection layer)
- **Potentially false** for:
  - Adding `correlation_id` to `shared_link_comments`, `shared_link_responses`, `shared_link_events`
  - Adding actor/recipient snapshot columns
  - Adding target-label snapshot columns
  - Creating a unified activity RPC/view for pagination
  - Adding visibility classification to DB rows

**Action:** Updated stance to "V1 requires no migration; V2/V3 likely require additive migrations." Created `19-migration-and-backfill-decision-matrix.md`.

### 4.10 — Insufficient Decision Actor Context

**Finding:** `loadSharedLinkActivity()` in `actions.ts`:
```ts
(responsesRes.data ?? []).forEach((r) =>
  raw.push({
    id: r.id,
    type: "decision",
    author: "recipient",  // Hardcoded string, not resolved
    decision: r.decision,
    body: r.note || undefined,
  })
);
```

The query selects `recipient_id` but never joins `shared_link_recipients` to resolve the name/email. The public route returns no actor field for decisions at all.

**Impact:** Cannot produce "Maria approved the proposal" without recipient name resolution.

**Action:** Added recipient actor resolution to implementation plan as a separate PR (PR 7 in revised sequence).

### 4.11 — Inconsistent Email Rules

**Finding:** Public activity route returns `author: c.author_email` for comments. This means the client sees their own email. This is intentional (they submitted it) but inconsistent with the general "never expose emails" rule.

**Resolution documented:** Email is acceptable for the submitting user's own comments only. Never expose:
- Other recipients' emails
- Internal team emails
- Recipient emails in decision context (unless owned by viewer)
- Raw actor UUIDs

### 4.12 — Tests Partially Exist

**Finding:** Existing tests do protect against some technical copy leakage:
- `estimate-sheet-version-control-ui.test.tsx` asserts on human-readable labels
- `project-publication-activity.test.tsx` tests that internal comments are filtered from public route
- `project-publication-comments.test.tsx` tests CSRF and sanitization
- `project-publication-security.test.ts` tests token hashing

But there is no centralized banned-term regression suite and no systematic copy verification across all event types.

**Action:** Updated test strategy to acknowledge existing partial protection while still recommending a centralized copy regression suite.

### 4.13 — PR 2 Red-Green Strategy Unsafe

**Finding:** First-pass says PR 2 adds tests that "will FAIL initially" and this is "documented in CI." This would break CI on `main`.

**Action:** Updated PR sequencing to either:
- Use `.skip`/`.todo` with fixtures (merge-safe)
- Combine PR 2 and PR 3 into one mergeable PR
- Or mark PR 2 as "local-only red step, not a merge target"

### 4.14 — Accessibility Tests Need UI

**Finding:** Composer tests produce strings — they can't verify `aria-live`, keyboard navigation, or semantic HTML. These need UI component tests with actual DOM.

**Action:** Updated test strategy to clearly separate:
- Composer tests: unit tests for strings
- UI component tests: accessibility assertions on DOM
- Manual QA: screen reader testing

### 4.15 — North Star Missing

**Finding:** First-pass has UX/UI documents but no North Star, no user journey maps, no surface map.

**Action:** Created dedicated documents: `13-north-star-and-product-principles.md`, `14-user-journeys-and-ux-paths.md`, `15-information-architecture-and-surface-map.md`.

---

## 5. Additional Findings Not in Known Issues List

### 5.1 — `node_deleted_with_children` Missing Name - Confirmed

The `payload` for `node_deleted_with_children` stores `deletedRowCount` and `deletedNodeCount` but may not include the node name. The current code falls back to "Area deleted" / "Area and nested rows removed" without the node name. This is correctly identified in first-pass as a gap.

### 5.2 — `correlation_id` Missing on Shared-Link Tables

`shared_link_comments`, `shared_link_responses`, and `shared_link_events` have no `correlation_id` column. This prevents grouping related events (e.g., a decision + follow-up comment by the same recipient in the same session).

### 5.3 — No `shared_link_events` Are Inserted for Comments/Decisions

The CHECK constraint allows `comment_add`, `accept_decision`, `decline_decision` in `shared_link_events`, but no code inserts these. Only `open` and `password_attempt` are inserted. This is correctly flagged in first-pass but needs stronger action in the plan.

### 5.4 — Public Route Missing Pagination

The public activity route hardcodes `limit(100)` with no cursor and `hasMore: false` always. For publications with heavy activity, this could return incomplete results or load excessive data. First-pass correctly identifies this gap.

---

## 6. Code Paths Needing Deeper Implementation Audit

| Path | Why | When |
|------|-----|------|
| `fetchEstimateSheetVersionControl()` query structure | Verify cursor pagination works at DB level | Phase 0 preflight |
| `buildHistoryCursorFilter()` implementation | Confirm cursor is applied at query level, not in-memory | Phase 0 preflight |
| `recordProjectPublicationEvent()` recipient resolution | Verify when `recipientId` is passed and when it's null | Phase 0 preflight |
| `resolveActivityActorLabels()` batch query | Verify it handles null/empty gracefully | Phase 1 composer |
| `getAuditChangeDetails()` expand/collapse | Understand current audit facts rendering for composer mapping | Phase 2 UI integration |
| `readAskCurrentEstimateActivityHistory()` AI context | Verify AI context doesn't need composer changes | Phase 1 composer |
| `project_publication_events` RLS policies | Verify service-role is the only writer | Phase 6 security |

---

## 7. Recommended Doc Corrections Applied

| Document | Corrections applied |
|----------|-------------------|
| README.md | Updated commit to `97c7d60`, updated implementation sequence, added new docs, added "What changed in second pass" |
| 00-current-state-audit.md | Corrected shared-link Realtime status, decision digest, public route response shape, service-role explanation, event taxonomy, tests status, row_inserted bug; added corrections section |
| 01-research-basis.md | Added stronger guidance on sources, marked assumptions more clearly |
| 02-activity-copywriting-system.md | Added decision/comment body copy, expanded edge cases, added role-based copy rules, improved blank row copy, added "customized from library" improvement |
| 03-data-contract-and-event-model-plan.md | Added recipient actor model, corrected event type handling for public route, added ActivityAudience/ActivityVisibility types, updated migration stance |
| 04-implementation-plan.md | Added Phase 0 preflight, revised PR sequence, added decision digest improvement (not add), added recipient actor resolution phase |
| 05-blast-radius-analysis.md | Added Realtime risk, pagination risk, service-role risk, event filter mismatch, decision digest existing |
| 06-performance-analysis-plan.md | Added shared-link pagination fix plan, composite cursor recommendation, recipient lookup batching |
| 07-security-privacy-readiness.md | Corrected service-role explanation, added defense-in-depth details, email rules clarified |
| 08-test-strategy.md | Acknowledged existing partial protection, separated unit/component/accessibility tests, merge-safe PR strategy |
| 09-ui-ux-plan.md | Added cross-links to North Star and UX paths docs |
| 10-readiness-checklist.md | Updated go/no-go to "GO for Phase 0 preflight only", added second-pass verification checklist |
| 11-pr-sequencing-plan.md | Revised to merge-safe sequence, added preflight PR, fixed PR 2 strategy |

---

## 8. Uncertain Claims Requiring Further Verification

| Claim | Uncertainty | Recommended verification |
|-------|------------|------------------------|
| Realtime subscription fires on all inserts | The empty filter string behavior depends on Supabase Realtime's filter parsing — may work differently in different versions | Test with two publications, insert in one, verify `load()` only fires once |
| `estimate_sheet_events` indexes are optimal | Index analysis was not performed in this pass | Run `EXPLAIN ANALYZE` on all activity queries |
| `correlation_id` grouping works for multi-row edits | Verified grouping logic exists, but actual RPC behavior was not tested | Test with batch row insert RPC |
| `row_context` JSONB always has `material` field | Code assumes it, but pre-migration events may have different structure | Query for events with null/empty `row_context->>'material'` |
| Public route response `hasMore: false` is always true today | Depends on publication activity volume | Test with publication that has >100 activities |
