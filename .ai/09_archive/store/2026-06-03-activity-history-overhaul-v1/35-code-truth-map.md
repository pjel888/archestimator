# 35 — Code Truth Map

**Date:** 2026-06-02
**Status:** Fifth pass — final code reconciliation
**Purpose:** Map every planning claim to the actual code. This is the engineering source of truth — when code and docs disagree, this document records what the code actually does.

---

## Estimate Activity Events

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Event type count | `estimate_sheet_events` + `src/lib/estimates/actions.ts` | 14 event types in code (row_added, row_blank_added, row_updated, row_replaced, row_deleted, tree_reordered, template_inserted, sheet_code_updated, sheet_metadata_updated, sheet_version_created, sheet_restored_as_copy, node_created, node_renamed, node_deleted_with_children) | Docs 00 and 29 say "13 event types" | **14 raw types** (12 active in Activity UI filter, 2 dormant: sheet_version_created + sheet_restored_as_copy) |
| Activity filter values | `EstimateSheetContent.tsx` ACTIVITY_FILTER_EVENT_TYPES | Contains `{ value: "row_inserted", label: "Inserted rows" }` — no event matches this | Doc 00 §12.3 and doc 31 identify this bug | **Bug confirmed.** `row_inserted` matches zero events. Must be `row_added` + `row_blank_added` |
| Actor label resolution | `src/lib/estimates/actions.ts:resolveActivityActorLabels()` | Queries profiles table → display_name → email → "Unknown user" / "System/backfill" | Docs correctly describe | ✅ Accurate |
| Dormant version events | `EstimateSheetContent.tsx` filter logic | `sheet_version_created` and `sheet_restored_as_copy` are filtered from activity feed | Doc 00 §6 correctly notes "dormant in UI" | ✅ Accurate |

## SharedLinkActivityFeed — Owner-Only Status

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Owner-only | `SharedLinkActivityFeed.tsx` line 22, 31-43 | `isOwner` prop gates server action path. Public path exists (fetch to /activity) but component is NOT rendered for non-owners in ProjectPublicationHeader | Doc 23 says "SharedLinkActivityFeed is owner-only (D-015)" | ✅ Accurate. Public path exists in code but is never rendered in production. |
| Public activity GET route | `activity/route.ts` GET handler line 59-162 | Uses `assertSameOriginPublicPost()` (POST-only CSRF) — broken for browsers. Selects `event_type` from DB but doesn't include in response. | Doc 31 correctly identifies both bugs | **2 bugs confirmed:** CSRF broken (always 403), event_type not in response |

## Realtime Subscription

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Filter value | `SharedLinkActivityFeed.tsx` lines 70, 75, 80 | All three tables use `filter: \`publication_id=eq.${""}\`` — empty string filter matches ALL publications | Doc 00 §12.1 correctly identifies this | **Bug confirmed.** Realtime fires for ALL publications. |
| publicationId availability | `ProjectPublicationHeader.tsx` line 71 | `summary.publicationId` is available in parent | Doc 31 recommends passing as prop | **Fix feasible.** Add `publicationId` prop to SharedLinkActivityFeed. |
| Tables subscribed | `SharedLinkActivityFeed.tsx` lines 69-82 | Three tables: `shared_link_comments`, `shared_link_responses`, `shared_link_events` — all with empty filters | Docs mention all three | ✅ Accurate. All three need fix. |

## Public Activity GET Route

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| CSRF check | `activity/route.ts` line 60 | Calls `assertSameOriginPublicPost()` — requires Origin + x-archestimator-csrf header + ae_publication_csrf cookie | Doc 31 correctly identifies this as broken | **Bug confirmed.** GET routes don't send custom headers. Always 403 for browsers. |
| event_type in response | `activity/route.ts` lines 127, 140-149 | Query SELECT includes `event_type` but it's NOT destructured (line 140-149 only uses id, created_at, metadata_json) and NOT in PublicActivityItem type | Doc 31 says "add event_type to select" — imprecise (already selected, just not returned) | **Correction:** event_type IS already in the DB query SELECT. It just isn't included in the JSON response. |
| PublicActivityItem type | `activity/route.ts` lines 22-43 | Three types: comment, decision, event. Event type has metadata but no event_type field. | Docs accurately describe | ✅ Accurate |
| Usage | `SharedLinkActivityFeed.tsx` | Public path only used when `isOwner=false`. Currently never reached in production. | Doc 31 notes "never rendered in production" | ✅ Accurate. Latent bug, low priority. |

## Comments CSRF

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Normal POST CSRF | `SharePageComments.tsx` line 136 | Hardcodes `"x-archestimator-csrf": "client-post"` | Doc 31 identifies this | **Bug confirmed.** No cookie set, no random token. |
| Queue flush CSRF | `SharePageComments.tsx` line 84 | Also hardcodes `"x-archestimator-csrf": "client-post"` | Doc 31 mentions "comments CSRF" but doesn't distinguish 2 paths | **Missing coverage.** Doc 31 should explicitly mention both fetch paths. |
| Reference pattern | `ProjectPublicationPasswordForm.tsx` lines 23-29 | Generates `createCsrfToken()`, sets cookie, sends matching header | Doc 31 references this as correct pattern | ✅ Accurate. This is the reference implementation. |

## Decisions CSRF

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| CSRF | `SharePageDecision.tsx` line 67 | Hardcodes `"x-archestimator-csrf": "client-post"` | Doc 31 identifies this | **Bug confirmed.** Same pattern as comments. Single fetch path. |
| Total fetch paths | Code audit | 3 total: Comments normal (line 136) + Comments flush (line 84) + Decision (line 67) | Doc 31 says "Comments/Decision CSRF" | **Correction:** Doc should say "3 fetch paths across 2 components." |

## Password Route

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| CSRF | `password/route.ts` line 34 | Uses `assertSameOriginPublicPost()` — correct for POST | Docs are accurate | ✅ Correct |
| Event recording | `password/route.ts` lines 47-76 | Always records `password_attempt` (success/failure in metadata). Supports P10 lockout. | Docs accurately describe | ✅ Accurate |
| Lockout | `password/route.ts` + `security.ts` P10 | In-memory lockout (Map) + durable rate limiting (DB). Progressive delay. Hard lock after 5 attempts. | Docs accurately describe | ✅ Accurate |

## Events Route

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Allowed events | `events/route.ts` line 10-15 | `open`, `password_success`, `password_failure`, `download_attempt_blocked` | Docs accurately describe | ✅ Accurate |
| Usage | Code audit | NOT called by any share page component. `page.tsx` uses direct server-side `recordProjectPublicationEvent()`. Password form uses `/password` route. | Docs say "unused", "reserved for interactive actions" | ✅ Accurate. Legacy/unused route. |
| PR 2 scope | — | — | Docs say exclude from PR 2 | ✅ Correct. No PR 2 work on /events. |

## Share Page Open Tracking

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Open event timing | `share/[token]/page.tsx` lines 198-204 | `recordProjectPublicationEvent("open")` called AFTER password gate check. Password-gate visits NOT recorded. | Docs correctly identify this gap | ✅ Accurate |
| Side effects triggered | `public-repository.ts` lines 442-471 | `eventType === "open"` triggers: (1) open_count increment, (2) recipient delivery_status update, (3) shared_link_events insert | Docs in 23, 25 mention side effects but don't fully document all three | **Gap.** See doc 36 for full audit. |
| First visit anonymity | `share/[token]/page.tsx` + `SharePageRecipientSessionInitializer.tsx` | Server-side open event fires BEFORE client-side session init on first recipient-token visit. Reload required to link recipient. | Docs correctly identify this | ✅ Accurate |

## recordProjectPublicationEvent — Side Effects

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Always writes | `public-repository.ts` lines 433-439 | Always inserts into `project_publication_events` with ip_hash, user_agent_hash, metadata_json | Docs accurate | ✅ Accurate |
| open_count increment | `public-repository.ts` lines 442-446 | IF eventType === "open": calls RPC `increment_project_publication_open` | Docs mention but don't fully reconcile with access telemetry plan | **Critical.** See doc 36 for per-stage matrix. |
| Recipient update | `public-repository.ts` lines 448-459 | IF eventType === "open" AND recipientId: UPDATE shared_link_recipients (delivery_status="opened", last_opened_at) | Docs mention but don't fully reconcile | **Critical.** See doc 36. |
| shared_link_events insert | `public-repository.ts` lines 461-469 | IF eventType === "open" AND recipientId: INSERT shared_link_events (owner-visible) | Docs mention but don't fully reconcile | **Critical.** See doc 36. |
| Event type enum | `public-repository.ts` line 8 | `"open" \| "password_success" \| "password_failure" \| "download_attempt_blocked" \| "password_attempt"` (5 types) | Docs accurately describe | ✅ Accurate |

## Shared Link Events Table

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| Event types | DB CHECK constraint | `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt` (5 defined, 1 active: open) | Doc 00 §4 accurately describes | ✅ Accurate |
| Owner visibility | `shared_link_events` | Inserted only when recipientId present. Owner can see via `loadSharedLinkActivity()` | Docs accurate | ✅ Accurate |

---

## CSRF Architecture

| Feature | Source of truth | Current behavior | Planning doc claim | Reconciled truth |
|---------|----------------|-----------------|-------------------|-----------------|
| `assertSameOriginPublicPost()` | `security.ts` lines 228-242 | Requires Origin + x-archestimator-csrf header + ae_publication_csrf cookie. For POST only. | Docs describe correctly | ✅ Accurate |
| `assertSameOrigin()` | `session/route.ts` lines 21-31 | Inline function: allows absent Origin, rejects mismatched Origin. GET-safe. Used by session route. NOT exported from security.ts. | Docs assume it needs to be created. | **Correction:** Already exists inline. Should be extracted to security.ts. |
| Cookie name | `security.ts` line 9 | `ae_publication_csrf` | Docs accurately reference | ✅ Accurate |

---

## Key Reconciliation Summary

| Claim | Verdict | Action |
|-------|---------|--------|
| "13 estimate event types" | ❌ Wrong — 14 types | Update all docs to 14 (12 active + 2 dormant) |
| "event_type not in public API select" | ⚠️ Imprecise — selected but not returned | Clarify: select exists, fix is to include in response |
| "2 CSRF bugs" | ⚠️ Understated — 3 fetch paths affected | Document all 3 paths; recommend shared utility |
| "assertSameOrigin() needs creation" | ⚠️ Already exists inline in session route | Recommend extraction to security.ts |
| "GET /activity always 403" | ✅ Confirmed | Fix in PR 2 |
| "Realtime filter empty" | ✅ Confirmed — all 3 tables | Fix in PR 2 with publicationId prop |
| "row_inserted filter broken" | ✅ Confirmed | Fix in PR 2 |
| "Comments/Decisions CSRF hardcoded" | ✅ Confirmed — 3 fetch paths | Fix in PR 2 with shared utility |
| "No client-facing activity feed" | ✅ Confirmed | Accurate — deferred to V2 |
| "open event side effects" | ⚠️ Under-documented | See doc 36 for full audit |
