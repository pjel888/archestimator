# 15 — Information Architecture and Surface Map

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Purpose

Map every surface where activity data appears or should appear, with current state, V1 targets, V2 targets, and risks.

---

## Surface Inventory

| # | Surface | Audience | Data source | Current state | V1 target | V2 target | Risks |
|---|---------|----------|-------------|---------------|-----------|-----------|-------|
| 1 | Estimate Activity History modal | Owner/Admin | `estimate_sheet_events` via `fetchEstimateSheetVersionControl()` | Human-readable labels (75% there), audit cards, day grouping, correlation grouping, filters, scope tree | Replace inline copy with composer; consistent primary sentences; improved copy for sheet_metadata, node_deleted, tree_reordered, blank rows | Unified project timeline with shared-link activity merged | Large file regression risk; filter enum bug (`row_inserted`) |
| 2 | Row Item Details → Activity tab | Owner/Admin | `estimate_sheet_events` filtered by `targetRowId` | Same as #1 but scoped to row. Deleted row shows `row_context.material` with "(removed)" | Same improvements as #1, scoped | Per-row comments from shared link shown alongside changes | Deleted row context may be missing |
| 3 | Shared Link Activity tab (owner) | Owner/Admin | `shared_link_comments`, `shared_link_responses`, `shared_link_events` via `loadSharedLinkActivity()` | Raw type labels (`COMMENT ·`, `DECISION ·`, `EVENT ·`), raw decision enums, hardcoded "recipient" actor, flawed pagination, broken Realtime filter | Human-readable copy via composer; resolved recipient names; pagination fix; Realtime fix (or removal) | Combined with estimate changes in unified feed | Realtime broken; pagination flawed; no recipient name resolution |
| 4 | Shared Link Activity tab (client) | Client/Recipient | `GET /api/share/[token]/activity` (public API) | Raw decision values, no pagination, hard limit 100, service-role client (no RLS protection), `hasMore: false` always | Human-readable copy via server-side composer; safe actor labels; no raw metadata; pagination added | Simplified estimate change feed for clients | Service-role means app-level protection only; event_type consumed server-side, never exposed in response |
| 5 | Project Publication modal | Owner/Admin | `SharedLinkActivityFeed` + publication metadata + recipient list | Modal with tabs: Overview, Activity, Recipients | Activity tab shows composed timeline | Notifications inbox | Activity tab separate surface — no copy regression from modal rework |
| 6 | Project Card (sidebar) | Owner/Admin | `hasUnseenSharedLinkActivity` boolean prop | Unseen activity dot badge (simple boolean) | Unseen count or "New" pill | Rich count + preview tooltip | Dot is a boolean — no copy involved |
| 7 | Email digest | Owner | `triggerOwnerDigestIfAllowed()` triggered by comment/decision routes | Plain text + basic HTML: "New comment activity on your shared project link" (comment) and "New decision activity on your shared project link" (decision — both already exist) | Same human-readable copy as in-app; more specific subject lines; improved HTML | Rich activity summary directly in email body | Rate-limited so users may miss rapid-fire activity |
| 8 | Ask Flip / AI context | Internal (AI) | `readAskCurrentEstimateActivityHistory()` in `src/lib/ai/read-context.ts` | Structured activity summaries — not user-facing, prompt context only | No change needed — AI context uses separate formatter. Ensure consistency with human copy where possible | Activity-aware AI responses (natural language summary in AI output) | AI context may benefit from composer reuse rather than separate formatter |
| 9 | Future: Unified Project Activity Center | Owner/Admin | All sources merged: events + comments + responses + shared events | Not implemented | Not in V1 | Single chronological feed with source badges, filters, search across all activity types | Requires additive migrations, viewpoint/RPC, and correlation IDs on shared-link tables |
| 10 | Future: Client-Visible Estimate Change Feed | Client/Recipient | Simplified estimate events (anonymized, curated) | Not implemented | Not in V1 | Simplified, client-safe estimate change timeline on shared page | Complex privacy filtering; risk of leaking cost data |
| 11 | Future: Notifications Inbox | Owner/Admin | Aggregated unseen activity across all projects | Not implemented | Not in V1 | Bell icon with dropdown, per-project unseen counts | Requires real-time notification infrastructure beyond current scope |
| 12 | Project Publication Header (estimate sheet) | Owner/Admin | Publication status, activity dot | Publication button with loading state and dot indicator | No changes needed for activity copy | Activity dot upgrades to unread count | Low risk — no copy changes |

---

## Activity Data Flow (Unified View)

```
                          ┌─────────────────────────┐
                          │   estimate_sheet_events  │
                          │   (14 raw estimate event types: 12 active + 2 dormant)       │
                          └─────────┬───────────────┘
                                    │
                          ┌─────────▼───────────────┐
                          │ fetchEstimateSheetVersion│
                          │ Control()               │
                          │ → EstimateSheetHistory  │
                          │   Event[]               │
                          └─────────┬───────────────┘
                                    │
                          ┌─────────▼───────────────┐
                          │ Activity Composer        │
                          │ composeEstimateActivity()│
                          │ → ActivityViewModel     │
                          └─────────┬───────────────┘
                                    │
                          ┌─────────▼───────────────┐
                          │ EstimateSheetContent.tsx │
                          │ (Activity History modal) │
                          │ Audience: Owner          │
                          └─────────────────────────┘


    ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
    │ shared_link_comments │   │ shared_link_responses │   │ shared_link_events   │
    └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
               │                          │                          │
               │    ┌─────────────────────┼──────────────────────────┘
               │    │                     │
    ┌──────────▼────▼─────────────────────▼───────────┐
    │             Owner path (server action)           │
    │ loadSharedLinkActivity()                        │
    │ → ActivityItem[] (raw)                          │
    └──────────────────────┬──────────────────────────┘
                           │
    ┌──────────────────────▼──────────────────────────┐
    │             Activity Composer                    │
    │ composeSharedLinkActivity()                     │
    │ → ActivityViewModel (owner visibility)          │
    └──────────────────────┬──────────────────────────┘
                           │
    ┌──────────────────────▼──────────────────────────┐
    │ SharedLinkActivityFeed (isOwner=true)            │
    │ Audience: Owner                                  │
    └─────────────────────────────────────────────────┘


    ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
    │ shared_link_comments │   │ shared_link_responses │   │ shared_link_events   │
    └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
               │                          │                          │
               │    ┌─────────────────────┼──────────────────────────┘
               │    │                     │
    ┌──────────▼────▼─────────────────────▼───────────┐
    │           Public path (API route)                │
    │ GET /api/share/[token]/activity                 │
    │ → PublicActivityItem[] (filtered, but raw copy) │
    └──────────────────────┬──────────────────────────┘
                           │
    ┌──────────────────────▼──────────────────────────┐
    │            Activity Composer (V1 change)        │
    │ composeSharedLinkActivity() on server          │
    │ → ActivityViewModel (client visibility)        │
    │ (strips raw, anonymizes actor, no internal)     │
    └──────────────────────┬──────────────────────────┘
                           │
    ┌──────────────────────▼──────────────────────────┐
    │ SharedLinkActivityFeed (isOwner=false)           │
    │ Audience: Client                                 │
    └─────────────────────────────────────────────────┘
```

---

## V1 Surface Changes Summary

| Surface | What changes | What stays the same |
|---------|-------------|-------------------|
| Estimate Activity History modal | Primary copy → complete sentences from composer. Audit facts → `activity.facts[]`. Badges → `activity.badges[]`. Delta → `activity.delta` | Modal structure, scope tree, day grouping, correlation grouping, filters, pagination, search |
| Row Activity tab | Same as above, scoped to row | Row scoping logic, empty state |
| Shared Link Activity tab (owner) | Copy → human-readable from composer. Decision → composed sentence, not raw enum. Event → composed sentence, not raw type. Recipient actor → resolved name. Pagination → query-level cursor. Realtime → fixed filter | Section header, refresh button, loading/error states, internal comment visibility |
| Shared Link Activity tab (client) | API response → `ActivityViewModel[]` with pre-composed titles. No raw field. Safe actor labels. Pagination added | Rate limiting, CSRF, session verification, is_internal filtering |
| Email digest | Improved copy, both comment+decision triggers (already both exist) | Rate limiting, email delivery infrastructure |
| AI context | No V1 changes | Separate formatter preserved |

---

## Cross-References

- See `14-user-journeys-and-ux-paths.md` for detailed journey maps per surface
- See `09-ui-ux-plan.md` for visual design of each surface
- See `16-event-taxonomy-and-lifecycle-map.md` for which events appear on which surfaces
