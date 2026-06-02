# 00 — Current State Audit: Activity History System

**Date:** 2026-06-02 (second pass: 2026-06-02; third pass: 2026-06-02)  
**Branch:** `main`  
**Current HEAD:** `d78686f` (`Refresh current-head launch validation proof`)  
**First-pass commit:** `638f681` (stale — corrected in second pass)  
**Second-pass claimed HEAD:** `97c7d60` (corrected in third pass — no activity code changed between `97c7d60` and `d78686f`)  
**Second-pass verification:** See `12-second-pass-verification-audit.md`  
**Third-pass verification:** See `22-third-pass-verification-audit.md`

---

## 1. Architecture Summary

The activity history system spans two distinct surfaces connected by a shared Supabase database:

### Surface A: Workshop Estimate History (Owner/Admin)

- **Data source:** `estimate_sheet_events` table, populated by PostgreSQL RPCs
- **Server actions:** `fetchEstimateSheetVersionControl()` in `src/lib/estimates/actions.ts`
- **UI:** Activity History modal inside `src/components/workshop/EstimateSheetContent.tsx`
- **Audience:** Workshop users (owners/admins) only

### Surface B: Shared Link Activity Feed (Owner + Client)

- **Data sources:** `shared_link_comments`, `shared_link_responses`, `shared_link_events` tables
- **Owner path:** `loadSharedLinkActivity()` server action in `src/lib/publication/actions.ts`
- **Public path:** `GET /api/share/[token]/activity` in `src/app/api/share/[token]/activity/route.ts`
- **UI:** `SharedLinkActivityFeed` component in `src/components/share/SharedLinkActivityFeed.tsx`
- **Audience:** Owners (full internal view) and clients/recipients (filtered public view)

### Surface C: AI Context (Internal)

- **Data source:** `estimate_sheet_events` via `readAskCurrentEstimateActivityHistory()` in `src/lib/ai/read-context.ts`
- **Purpose:** Provides compact activity summaries for the Ask Flip AI feature
- **Audience:** Internal AI prompt context only

### Surface D: Shared Page Access Tracking (Analytics/Security)

- **Data source:** `project_publication_events` via `recordProjectPublicationEvent()` in `src/lib/publication/public-repository.ts`
- **Owner path:** Not currently surfaced in activity feeds. Events stored in `project_publication_events` for internal analytics.
- **Client path:** `shared_link_events` for owner-visible activity (currently only `open` events with known `recipientId`)

---

## 2. Data Flow: Workshop Estimate History

### DB → Server → Component Pipeline

```
estimate_sheet_events (Supabase)
    ↓ normalized by normalizeHistoryEvent()
    ↓ actor labels resolved via resolveActivityActorLabels()
    ↓ scoped by estimateNodeId via resolveEstimateActivityNodeScope()
    ↓ filtered by eventType/date/search via buildHistoryCursorFilter()
fetchEstimateSheetVersionControl() → EstimateSheetVersionControlData
    ↓
EstimateSheetContent.tsx
    ├── ActivityHistoryModal (full-screen dialog)
    │   ├── ActivityScopeTree (sidebar: sheet/group/area/row)
    │   ├── ActivityFilterDropdown (event type, date range, search)
    │   └── EventList → timeline
    │       ├── ActivityTimelineDayGroup (day headers)
    │       ├── AuditEventGroup (correlation-grouped events)
    │       └── AuditEventCard (individual event with audit details)
    └── RowDetailsModal → Activity tab (per-row event history)
```

### Key Functions (in `src/components/workshop/EstimateSheetContent.tsx`)

| Function | Line | Purpose |
|----------|------|---------|
| `getEventLabel(eventType)` | 583 | Maps event_type → title string e.g. `"Row updated"` |
| `getEventSummary(event)` | 622 | Maps event → one-line summary e.g. `"unit cost, quantity"` |
| `getHistoryChangeLabel(event)` | 2015 | Combines label + summary e.g. `"Row updated · unit cost, quantity"` |
| `getAuditEventDescription(event, details)` | 2049 | Builds full sentence e.g. `"Changed unit cost for Chroma Sink."` |
| `getAuditSupportingSummary(event, summary, desc)` | 2080 | Provides supporting text e.g. `"Affected fields: quantity, unit cost"` |
| `getActorLabel(event)` | 2019 | Resolves actor display name |
| `humanizeAuditField(field)` | 1786 | Maps DB field → UI field label |
| `formatAuditFieldValue(field, value, snapshot)` | 1868 | Formats field values (peso, percentage, etc.) |
| `isBlankEstimateRowAuditEvent(event)` | 613 | Detects blank placeholder row events |
| `groupActivityTimelineByDay(events)` | Local | Day-grouping for timeline |
| `groupActivityEvents(events)` | Local | Correlation-grouping for related events |

### Actor Label Resolution

**File:** `src/lib/estimates/actions.ts`

```ts
function getFallbackActorLabel(actorUserId: string | null) {
  return actorUserId ? "Unknown user" : "System/backfill";
}
```

- `resolveActivityActorLabels()` (line 490): Queries `profiles` table for `display_name` → falls back to email → falls back to `getFallbackActorLabel()`
- Special case: `philipjonlewis@gmail.com` → `"Philip Lewis"`
- Graceful fallback: null actorUserId → `"System/backfill"`, non-null but unresolved → `"Unknown user"`

---

## 3. Data Flow: Shared Link Activity

### DB → API/Action → Component Pipeline

```
shared_link_comments + shared_link_responses + shared_link_events (Supabase)
    ↓
┌─── Owner path ─────────────────────────┐  ┌─── Client path ───────────────────┐
│ loadSharedLinkActivity()               │  │ GET /api/share/[token]/activity   │
│ (src/lib/publication/actions.ts:1144)  │  │ (src/app/api/share/.../route.ts)  │
│                                        │  │                                    │
│ • admin client (service_role)          │  │ • service client (anon RLS)        │
│ • includes is_internal comments        │  │ • filters is_internal=true         │
│ • returns all ActivityItem[]           │  │ • returns PublicActivityItem[]     │
│ • RBAC-gated to project managers       │  │ • rate-limited                      │
│ • cursor pagination                    │  │ • no pagination (limit 100)         │
│ • Realtime subscription on mount       │  │ • no Realtime subscription          │
└────────────────────────────────────────┘  └────────────────────────────────────┘
                    ↓                                   ↓
        SharedLinkActivityFeed (isOwner=true)   SharedLinkActivityFeed (isOwner=false)
        (src/components/share/SharedLinkActivityFeed.tsx)
```

### Current Rendering (SharedLinkActivityFeed.tsx)

```tsx
// Line 114-119
<div className="font-medium text-secondary">
  {a.type.toUpperCase()} · {new Date(a.created_at).toLocaleString()}
</div>
{a.author && <div className="text-tertiary">{a.author}</div>}
{a.body && <div className="mt-0.5 whitespace-pre-wrap text-ink">{a.body}</div>}
{a.decision && <div className="mt-0.5 text-success">Decision: {a.decision}</div>}
{a.is_internal && isOwner && <span className="text-[8px] text-warning">Internal</span>}
```

**Problem:** `a.type.toUpperCase()` renders `"COMMENT"`, `"DECISION"`, `"EVENT"` — raw computer strings. `a.decision` renders `"accepted"`, `"declined"`, `"revision_requested"` — raw enum values in green text.

---

## 4. Event Types Discovered

### `estimate_sheet_events.event_type` (13 known types)

| event_type | Migration | Triggered by |
|---|---|---|
| `row_added` | 20260524033151 | Insert row from library item |
| `row_blank_added` | 20260524033151 | Insert row with no library item (blank slot) |
| `row_updated` | 20260524033151 | Any field changed on existing row |
| `row_replaced` | 20260524033151 | Replace component (source library item swap) |
| `row_deleted` | 20260524033151 | Row removed from estimate |
| `tree_reordered` | 20260524033151 | Drag-reorder tree nodes |
| `template_inserted` | 20260524033151 | Component library template inserted |
| `sheet_code_updated` | 20260524033151 | Sheet code changed |
| `sheet_metadata_updated` | 20260524033151 | Estimate metadata changed (name, budget, etc.) |
| `sheet_version_created` | 20260524033151 | Named version snapshot created (dormant in UI) |
| `sheet_restored_as_copy` | 20260524033151 | Restore from version (dormant in UI) |
| `node_created` | 20260524132800 | User adds area/node to tree |
| `node_renamed` | 20260524132800 | User renames area/node |
| `node_deleted_with_children` | 20260524132800 | User deletes area/node + contents |

### `estimate_sheet_events.event_source`

- `"server_action"` — default for all RPC-triggered events
- `"client"` — available but not currently used
- `"system"` — available but not currently used

### `shared_link_responses.decision` (3 values)

| decision | Meaning |
|---|---|
| `"accepted"` | Client accepted the proposal |
| `"declined"` | Client declined the proposal |
| `"revision_requested"` | Client requested revisions |

### `shared_link_events.event_type` (5 defined, 1 active)

| event_type | Status |
|---|---|
| `"open"` | **Active** — recorded on public-repository.ts:461 |
| `"comment_add"` | Defined in CHECK constraint, not inserted |
| `"accept_decision"` | Defined in CHECK constraint, not inserted |
| `"decline_decision"` | Defined in CHECK constraint, not inserted |
| `"password_attempt"` | Defined in CHECK constraint, inserted in password flow |

---

## 5. Current Copy Behavior

### Workshop Estimate History — Currently Human-Readable Copy

| Event | Title (getEventLabel) | Description (getAuditEventDescription) | Status |
|---|---|---|---|
| `row_updated` | "Row updated" | "Changed {field} for {material}." | ✅ Good |
| `row_added` | "Row added" | "Added {material} to the estimate." | ✅ Good |
| `row_replaced` | "Row replaced" | "Replaced {old} with {new}." | ✅ Good |
| `row_deleted` | "Row deleted" | "Removed {material} from the estimate." | ✅ Good |
| `row_blank_added` | "Blank row added" | "Added Empty row slot to the estimate." | ⚠️ "Empty row slot" could be better |
| `row_blank_added` (blank) | "Blank row added" | "Added Empty row slot to the estimate." | ⚠️ awkward |
| `sheet_code_updated` | "Sheet code updated" | (from summary) "Sheet code changed" | ⚠️ Doesn't show old→new |
| `sheet_metadata_updated` | "Sheet metadata updated" | "Estimate sheet metadata changed" | ⚠️ Vague, no detail |
| `node_created` | "Node created" | (from summary) "Area Kitchen" | ⚠️ Inconsistent |
| `node_renamed` | "Node renamed" | (from summary) "Kitchen → Master Kitchen" | ✅ Good |
| `node_deleted_with_children` | "Area deleted" | "Area and nested rows removed" | ⚠️ Missing node name |
| `tree_reordered` | "Tree reordered" | "Estimate tree order changed" | ⚠️ Not specific enough |
| `template_inserted` | "Template inserted" | "Template rows were inserted..." | ⚠️ Passive voice |

### Shared Link Activity — Currently Technical Copy

| Item type | What user sees | Problem |
|---|---|---|
| Comment | `"COMMENT · date"` + author email | ✅ Mostly fine (raw type label is minor) |
| Decision | `"DECISION · date"` + `"Decision: revision_requested"` | ❌ Raw enum value in green text |
| Event (open) | `"EVENT · date"` + raw metadata JSON | ❌ Completely machine-readable |
| Internal tag | `"Internal"` in amber | ✅ Good |

### AI Activity Context (Ask Flip)

- Builds compact summaries via `readAskCurrentEstimateActivityHistory()` in `src/lib/ai/read-context.ts`
- Returns structured data with eventType, actorLabel, summary, delta, rowTarget
- Used as prompt context only — no user-facing rendering concern

---

## 6. Strong Foundations

1. **Database schema is well-structured** — `estimate_sheet_events` has `old_snapshot`, `new_snapshot`, `changed_fields[]`, `total_delta`, `correlation_id`, and `metadata JSONB`
2. **Internal comment filtering works** — public API route correctly excludes `is_internal=true` comments
3. **Rate limiting is in place** — both public API route and comment/decision endpoints
4. **Actor labels are resolved** — display names from profiles, with graceful fallbacks
5. **Pagination exists** — cursor-based for estimate history, basic limit for shared-link activity
6. **Realtime is wired** — Supabase subscription on shared-link activity for owners
7. **Day grouping exists** — estimate history timeline groups by day
8. **Correlation grouping exists** — related events from same action are grouped
9. **Audit fidelity is preserved** — old/new snapshots, changed fields, total delta all stored
10. **Security is layered** — CSRF, rate limiting, cookie verification, RBAC, RLS
11. **AI context is isolated** — no raw IDs or user data leaked to AI prompts
12. **Sheet version events are filtered** — dormant named-version events don't appear in activity feed
13. **Blank rows are handled** — special labels and detection for placeholder rows

---

## 7. Weak Spots

### 7.1 No Central Formatting Layer

Copy logic is scattered across three places with no shared module:
- `EstimateSheetContent.tsx` — 7+ formatting functions
- `SharedLinkActivityFeed.tsx` — raw rendering with `type.toUpperCase()` and raw `decision`
- `ai/read-context.ts` — separate compact formatter

**Impact:** Inconsistent copy, duplicated logic, no single place to enforce human-readable rules.

### 7.2 Shared-Link Activity Is Machine-Readable

| What users see | What they should see |
|---|---|
| `COMMENT ·` | (comment body as primary, type as badge) |
| `DECISION ·` | Action sentence: "Approved the proposal" |
| `Decision: revision_requested` | "Requested revisions" with optional note |
| `EVENT ·` + raw JSON | "Viewed the proposal" or hidden |

### 7.3 estimate_sheet_events Copy Is Semi-Technical

| Current | Improvement |
|---|---|
| "Sheet metadata updated" | "Changed estimate name" or "Changed project budget to ₱" |
| "Sheet code updated" | "Changed sheet code from ES-001 to ES-002" |
| "Tree reordered" | "Reorganized the estimate tree" |
| "Template inserted" | "Added template rows" |
| "Row updated" | Should show what changed in the title, not just description |

### 7.4 No Copy Envelope Between Two Surfaces

Estimate history and shared-link activity share no common rendering, no common view model, no common copy rules. Each is a separate implementation with different conventions.

### 7.5 Technical Terms Leak to Users

The following appear in user-visible UI:
- `"Affected fields:"` (technical term in estimate audit)
- `"Decision: {raw_enum}"` (shared link)
- `a.type.toUpperCase()` renders `"COMMENT"`, `"DECISION"`, `"EVENT"`
- `"metadata"` as a field label (though filtered from primary display, it's still in code)
- `"linkState"` rendered as `"Using library values"` / `"Customized from library"` (acceptable but borderline)

### 7.6 No Tests Prevent Regression into Technical Copy

No test asserts that user-visible strings do not contain:
- `row_updated`, `row_replaced`, etc.
- `revision_requested`, `accepted`, `declined`
- Raw UUIDs
- `server_action`, `metadata_json`

### 7.7 Shared-Link Events Barely Rendered

`shared_link_events` rows are returned via the API route with `type: "event"` and `metadata` JSON. The component renders `"EVENT · date"` and the raw metadata object. Only the `open` event is actively inserted — but even that shows as `{metadata: {}}` with no human meaning.

### 7.8 Estimate Node Deletion Missing Name

`node_deleted_with_children` stores `payload.deletedRowCount` and `payload.deletedNodeCount` but not the deleted node's name in a user-accessible field. The title becomes "Area deleted" and the description "Area and nested rows removed" — no node name.

### 7.9 No Localization/Formatting Strategy

Currency, number, and unit formatting is hardcoded:
- `formatPeso()` for PHP amounts
- `formatAuditNumber()` for quantities
- Unit labels from snapshots
No extensible formatter for future locales.

---

## 8. Current Tests — Coverage and Gaps

### Files Tested (10 test files)

| Test File | Scenarios | Lines |
|---|---|---|
| `estimate-sheet-version-control-ui.test.tsx` | Activity dialog, audit cards, filters, day grouping, load-more, scope tree, correlation grouping | 1220 |
| `estimate-sheet-version-control-actions.test.ts` | Cursor pagination, row/node scopes, actor labels, retention metrics, search safety | 916 |
| `estimate-sheet-version-control-schema.test.ts` | Table/column presence, RLS, RPC grants, migrations | 172 |
| `estimate-sheet-version-control-db.test.ts` | Always skipped (needs `RUN_SUPABASE_INTEGRATION=1`) | 52 |
| `project-publication-activity.test.tsx` | Public route filtering, rate limiting, owner full access, shared link feed rendering, digest | 411 |
| `project-publication-header.test.tsx` | Activity dot visibility, localStorage persistence | ~100 |
| `project-publication-comments.test.tsx` | CSRF, rate limiting, sanitization, optimistic UI | 334 |
| `project-publication-decision.test.tsx` | CSRF, 409 duplicate, decision flows, confirmation modal | 258 |
| `project-publication-security.test.ts` | Token hashing, password hashing, CSRF, CSP | 174 |
| `ai-ask-read-context.test.ts` | Activity history summaries for AI, intent detection, safe serialization | ~200 |

### Key Gaps

1. **No copy regression tests** — No tests verify user-facing strings are human-readable
2. **No shared-link activity copy tests** — Decisions rendering `"Decision: revision_requested"` is untested
3. **Realtime subscription untested** — Explicitly deferred as "non-blocking"
4. **No live DB integration** — All version-control tests mock Supabase
5. **No accessibility tests** — No screen-reader announcements verified
6. **No performance/stress tests** — Large activity feeds untested

---

## 9. Gaps Before Full Client Comments/Approvals/Declines Integration

1. **Shared-link decision copy is raw** — Decisions show as `"Decision: {raw_enum}"` instead of action sentences
2. **No combined timeline** — Estimate history and shared-link activity are separate surfaces; no unified project activity view
3. **No decision event recording** — `accept_decision` and `decline_decision` event types are in the schema but never inserted
4. **No comment→estimate linkage** — Comments can reference `estimate_id` and `row_id` but no UI surfaces exist for per-row client comments
5. **No email digest for decisions** — Only `"comment"` triggers owner digest; decisions missing
6. **No client-visible estimate change feed** — Clients see comments/decisions/events but not actual estimate changes on the shared page

---

## 10. Answer to Core Audit Questions

1. **Where is activity copy currently generated?**  
   `EstimateSheetContent.tsx` (estimate audit cards), `SharedLinkActivityFeed.tsx` (shared link feed), `ai/read-context.ts` (AI context).

2. **Which copy is already human-readable?**  
   Estimate history event labels and descriptions are largely human-readable (75% there). Actor labels, field labels, and value formatting are good.

3. **Which copy is still too technical?**  
   Shared-link decisions (`"Decision: revision_requested"`), shared-link type labels (`"COMMENT"`, `"DECISION"`, `"EVENT"`), shared-link events (raw JSON metadata), `"Sheet metadata updated"`, `"Affected fields:"`, `"Tree reordered"`.

4. **Which copy risks leaking internal implementation details?**  
   The public API route returns raw decision enum values and shared-link event metadata verbatim. `is_internal` comments are properly filtered.

5. **Which event types are supported today?**  
   13 `estimate_sheet_events` types, 3 response decisions, comments, and 5 shared_link_events types (1 active).

6. **Which event types are missing?**  
   Decision events (`accept_decision`, `decline_decision`) are defined but not inserted. `comment_add` event is defined but not inserted. Combined timeline for estimate changes + client activity doesn't exist.

7. **Is the current data model enough?**  
   Yes — `old_snapshot`, `new_snapshot`, `changed_fields`, `payload`, and `metadata` columns provide enough data for rich copy. Shared-link events need more metadata (actor, decision context).

8. **Are old/new snapshots reliable?**  
   Snapshots exist but are nullable. Code handles null gracefully. Backfill may be needed for pre-migration events.

9. **Do shared-link activity events contain enough actor/recipient context?**  
   Partially. Comments have `author_email`, decisions have `recipient_id` (but resolved email/name requires a join). Events have `recipient_id` but the public route doesn't resolve it.

10. **Should comments and decisions live in the same activity feed as estimate events?**  
    For the shared-link surface (client view) — yes. For the workshop surface — estimate history should remain separate but could link to client activity.

11. **Should owner/admin and client views use the same view model with visibility filters?**  
    Yes — this is the recommended pattern. Same `ActivityViewModel` with `visibility` field.

12. **Which raw fields must never be client-visible?**  
    `actor_user_id` (UUID), `is_internal=true` comments, `event_source=server_action`, `correlation_id`, raw `event_type` strings, `metadata_json`, `oldSnapshot`/`newSnapshot` full JSON.

13. **Exact copy for every known event type?**  
    See `02-activity-copywriting-system.md`.

14. **What happens when an event is unknown?**  
    Current: `event_type.replace(/_/g, " ")` + generic fallback. Proposed: graceful "Activity recorded" with expandable audit detail.

15. **What happens when target has been deleted?**  
    Current: `target_row_id` is null (ON DELETE SET NULL). Row context remains in `row_context` JSON. Code handles this via `rowContext.material`.

16. **What happens when actor is missing?**  
    Current: `"System/backfill"` or `"Unknown user"`. Acceptable.

17. **What happens when old/new values are missing?**  
    Current: `formatAuditFieldValue()` returns `"—"`. Acceptable.

18. **What tests prevent regression into technical copy?**  
    **Partial.** Existing tests assert some things (no raw `User <uuid>`, no `Server action`, no `Linked Overridden` in certain tests, internal comments filtered in public route). But no centralized, exhaustive copy regression suite exists. This is a gap for V1.

19. **What is the safest implementation order?**  
    See `04-implementation-plan.md` and `11-pr-sequencing-plan.md`.

20. **What can be shipped independently?**  
    Central Activity Composer module (PR 3) can ship without UI changes. Shared-link activity copy improvements (PR 5) can ship independently. UI polish (PR 7) can ship independently.

---

## 11. Third-Pass Additions: Shared Page Access / Page Visit Activity Current State

### 11.0.1 Share Page Open Tracking — Incomplete

**File:** `src/app/share/[token]/page.tsx`

`recordProjectPublicationEvent({ eventType: "open" })` is called **after** the password gate check. If a publication requires a password and no valid access cookie exists, the password gate is rendered BEFORE the open event is recorded. Password-gate visits are invisible.

**Gap documented in:** `23-shared-page-access-activity-plan.md`

### 11.0.2 First Recipient-Token Visit — Anonymous Open

When `?recipient=` param is present, `SharePageRecipientSessionInitializer` runs client-side (after server render). The server-side `recordProjectPublicationEvent("open")` fires before the session cookie exists, so the first visit records an anonymous open event even though the URL had a recipient token. Subsequent reloads resolve recipient from cookie.

**Gap documented in:** `23-shared-page-access-activity-plan.md`

### 11.0.3 Password Route — Attempts, Not Gate Views

`POST /api/share/[token]/password` records `password_attempt` for success/failure/locked via `project_publication_events`. It does NOT record that the password gate page was viewed before form submission.

**Gap documented in:** `23-shared-page-access-activity-plan.md`

### 11.0.4 `/events` Route — Exists, Limited Usage

`POST /api/share/[token]/events` accepts `open`, `password_success`, `password_failure`, `download_attempt_blocked`. It is NOT called from `page.tsx` (which uses direct server-side `recordProjectPublicationEvent()`). Currently unused in the share page open flow. Should be evaluated for client-side password-gate beacon.

**Gap documented in:** `23-shared-page-access-activity-plan.md`

### 11.0.5 `recordProjectPublicationEvent()` — What's Stored vs Missing

**Currently stored:** `ip_hash` (SHA-256), `user_agent_hash` (SHA-256), `metadata_json`, `event_type`.
**Currently missing:** Parsed device/browser/OS metadata, approximate location from provider headers, access stage/password_protected flag.

**Gap documented in:** `25-access-event-data-model-and-migration-plan.md`

---

## 12. Corrections from Second Pass

The second pass at HEAD `97c7d60` verified all first-pass claims against current code. The following corrections were applied:

### 11.1 Shared-Link Realtime — NOT a Strong Foundation

**First-pass claim:** "Realtime is wired" — treats it as a strong foundation.  
**Verified reality:** The filter uses `publication_id=eq.${""}` (empty string), meaning subscriptions fire on ALL inserts across ALL publications. The `load()` function refetches only the current publication's activity, so it works functionally — but with unnecessary overhead.  
**Correction:** Realtime is marked as "wired but likely ineffective — filter needs fix." Updated blast-radius analysis, performance plan, and PR sequencing.

### 11.2 Decision Digest — Already Exists

**First-pass claim:** "Only comment triggers digest; decisions missing."  
**Verified reality:** Both `comment/route.ts` and `decision/route.ts` call `maybeTriggerSharedLinkActivityDigest(publicationId, token, "decision")`. Decision digest already exists.  
**Correction:** Updated plan from "add decision digest" to "verify and improve existing decision digest."

### 11.3 `row_inserted` Filter — Bug Confirmed

**First-pass status:** Not mentioned.  
**Verified reality:** Line 156 of `EstimateSheetContent.tsx` includes `{ value: "row_inserted", label: "Inserted rows" }`. Actual event types are `row_added` and `row_blank_added`. Selecting this filter matches zero events.  
**Correction:** Added to Phase 0 preflight cleanup. Must fix before composer work.

### 11.4 Public API Uses Service-Role, Not RLS

**First-pass claim:** "service client (anon RLS)."  
**Verified reality:** `createPublicationServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS entirely. Protection is application-level: query filtering + response shaping.  
**Correction:** Updated security plan to be explicit. RLS is NOT the main protection for public activity reads.

### 11.5 Shared-Link Owner Pagination Flawed

**First-pass claim:** "cursor pagination" works.  
**Verified reality:** Per-table limit+1, in-memory merge, cursor filter AFTER merge. Deep pagination may miss older events from tables that had fewer items in the initial page.  
**Correction:** Updated performance plan with proposed fix (query-level cursor filter, composite cursor).

### 11.6 Two Event Tables Distinguished

**First-pass claim:** Listed shared-link event types without distinguishing tables.  
**Verified reality:** `shared_link_events` (recipient-visible: open, comment_add, accept_decision, decline_decision, password_attempt) vs `project_publication_events` (analytics: open, password_success, password_failure, download_attempt_blocked, password_attempt).  
**Correction:** Created `16-event-taxonomy-and-lifecycle-map.md` with clear distinction.

### 11.7 Shared-link Events Response Shape

**First-pass claim:** Public API returns raw event_type strings.  
**Verified reality:** The public route returns `type: "event"` (hardcoded string) and does NOT include `event_type` from `shared_link_events`. Raw decision values ARE returned. Raw metadata JSON IS returned.  
**Correction:** Updated docs to precisely describe current response shape.

### 11.8 Migration Stance Nuanced

**First-pass claim:** "No database migration required" (repeated across multiple docs).  
**Verified reality:** True for V1 copy-only work. False for V2 features (correlation_id, recipient snapshots, unified view).  
**Correction:** Updated docs to "V1 requires no migration; V2/V3 likely require additive migrations." Created `19-migration-and-backfill-decision-matrix.md`.

### 11.9 `node_deleted_with_children` Missing Name — Confirmed

**Verified reality:** The payload stores `deletedRowCount` and `deletedNodeCount` but may not include node name. The current copy "Area deleted" / "Area and nested rows removed" lacks the actual area name.

### 11.10 `correlation_id` Missing on Shared-Link Tables — Confirmed

**Verified reality:** `shared_link_comments`, `shared_link_responses`, `shared_link_events` have no `correlation_id` column. This prevents grouping related events.

### 11.11 Tests Partially Exist — Corrected

**First-pass claim:** "No tests prevent regression into technical copy."  
**Verified reality:** Existing tests DO protect against some technical copy leakage (no raw `User <uuid>`, no `Server action`, no `Linked Overridden`, internal comments filtered). The gap is a centralized, exhaustive regression suite.  
**Correction:** Updated answer #18 to "Partial" and documented existing protections.

### 11.12 Public Activity Route Missing `event_type` in Response

**Verified reality:** The route selects `created_at, metadata_json, id` from `shared_link_events` but NOT `event_type`. The composer needs `event_type` to produce correct copy. The route must be updated to include `event_type` in the query OR the composer must work from what's available.

---

## Cross-References

See `12-second-pass-verification-audit.md` for the full claim-by-claim verification table.
