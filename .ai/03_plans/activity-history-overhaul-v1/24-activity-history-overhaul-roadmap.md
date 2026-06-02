# 24 — Activity History Overhaul Roadmap

**Date:** 2026-06-02
**Status:** Third-pass proposed

---

## Purpose

Replace the narrow V1/V2 vision with a clear, versioned roadmap covering human-readable copy, access telemetry, realtime/pagination, unified timeline, recipient management, client-visible changes, and cross-project analytics.

---

## Version Map

```
V1.0   — Human-readable copy + preflight fixes
V1.1   — Shared page access telemetry
V1.2   — Realtime/pagination hardening
V2.0   — Unified project activity timeline
V2.1   — Recipient management events
V2.2   — Client-visible estimate change feed
V3.0   — Cross-project activity center, analytics, notifications
```

---

## V1.0 — Human-Readable Copy + Preflight Fixes

| Aspect | Detail |
|--------|--------|
| **Goal** | Make activity copy human-readable across estimate history and shared-link activity. Fix known bugs. |
| **Included** | Activity Composer module (`src/lib/activity/`), estimate event copy, shared-link comment/decision/event copy, `row_inserted` filter fix, public API sanitization |
| **Excluded** | Access telemetry, device/browser/location metadata, unified timeline, client-visible estimate changes |
| **Migrations needed?** | No |
| **Risk** | Medium — `EstimateSheetContent.tsx` is ~3000 lines |
| **Success criteria** | All 13 estimate event types + all shared-link types render human-readable copy. No raw event types in primary copy. No regression into technical copy. |

---

## V1.1 — Shared Page Access Telemetry

| Aspect | Detail |
|--------|--------|
| **Goal** | Record page visits, password-gate views, password attempts, proposal views. Add device/browser/location metadata. Fix first-recipient-visit anonymous logging. |
| **Included** | `page_visited`, `password_gate_viewed`, `password_unlocked`, `proposal_viewed`, `recipient_session_started` events. UA parsing (browser/OS/device type). Provider geo headers (country/region/city). Server-side recipient resolution for `?recipient=` param. |
| **Excluded** | New database table. Client-side time-on-page analytics. Rich location (browser GPS). |
| **Migrations needed?** | Non-blocking option: structured `metadata_json` schema (no migration). Optional: new columns deferred to V2. |
| **Risk** | Medium — changes to `page.tsx`, `password/route.ts`, `session/route.ts`. Need to handle duplicate events, bot traffic, privacy. |
| **Success criteria** | Owner sees access events: "Maria viewed the proposal", "Anonymous viewer opened the shared link", "Client reached the password page", "Client entered an incorrect password". Device/browser/location in audit facts. No raw IP, no password values, no raw UA in UI. |

---

## V1.2 — Realtime/Pagination Hardening

| Aspect | Detail |
|--------|--------|
| **Goal** | Fix shared-link owner pagination (query-level cursor). Finalize Realtime strategy. Add public API pagination. |
| **Included** | Per-table cursor at query level (not after merge). Composite `(created_at, id)` cursor. Public API cursor pagination. Realtime filter fix (actual `publicationId`). Debounce for rapid realtime events. |
| **Excluded** | Unified pagination across all event sources. WebSocket/SSE for realtime improvements. |
| **Migrations needed?** | Index verification only — no new tables/columns. |
| **Risk** | Medium — pagination changes affect data fetching. Needs careful edge case testing (cursor ties, deep pagination). |
| **Success criteria** | Deep pagination correctly fetches from all source tables. Realtime fires only for correct publication. Public API supports cursor-based pagination. |

---

## V2.0 — Unified Project Activity Timeline

| Aspect | Detail |
|--------|--------|
| **Goal** | Single chronological feed merging estimate changes, client comments, decisions, shared-link events, and access events. |
| **Included** | `project_activity_view` or `get_project_activity` RPC/SQL view that unions all sources. Source badges for distinguishing event origins. Filters by source type. Unified pagination. |
| **Excluded** | Cross-project activity. Notification center. Activity analytics. |
| **Migrations needed?** | Yes — `correlation_id` on shared-link tables, unified view/RPC, possibly a `project_activity` materialized view for performance. |
| **Risk** | High — new DB objects, performance testing needed with production data volumes, backwards compatibility with existing surfaces. |
| **Success criteria** | Single timeline shows all activity for a project. Each event has a source badge. Pagination works. No regression on existing surfaces. |

---

## V2.1 — Recipient Management Events

| Aspect | Detail |
|--------|--------|
| **Goal** | Create activity events for recipient invite/resend/remove/unsubscribe actions. |
| **Included** | Events: `recipient_invited`, `recipient_removed`, `invitation_resent`, `recipient_unsubscribed`. Actor resolution for owner. Primary copy templates. |
| **Excluded** | Recipient grouping, invite analytics, bulk operations. |
| **Migrations needed?** | Yes — insert into `shared_link_events` or new `shared_link_recipient_events` table. |
| **Risk** | Low — additive, no existing behavior changed. |
| **Success criteria** | "Philip invited maria@example.com to view the proposal." "Philip removed maria@example.com from the shared link." Events appear in unified timeline. |

---

## V2.2 — Client-Visible Estimate Change Feed

| Aspect | Detail |
|--------|--------|
| **Goal** | On the shared page, clients see a simplified, anonymized timeline of estimate changes alongside their own activity. |
| **Included** | Anonymized estimate change events (no cost data, no internal actor names). "Updated the estimate." "Added 3 items." "Reorganized the estimate." Filtered to relevant scope. |
| **Excluded** | Full cost details, internal actor names, raw snapshots. |
| **Migrations needed?** | Yes — visibility classification, possibly `client_visible` flag on events. |
| **Risk** | High — must never leak cost data, actor names, or internal metadata to clients. Requires careful filtering. |
| **Success criteria** | Client sees simplified estimate changes alongside their own comments/decisions. No cost data. No internal actor names. No raw snapshots. |

---

## V3.0 — Cross-Project Activity Center, Analytics, Notifications

| Aspect | Detail |
|--------|--------|
| **Goal** | Activity hub across all projects. In-app notification center. Activity analytics. |
| **Included** | "All Activity" feed across projects. Bell icon with unseen count. Per-project unseen indicators. Activity analytics (most active collaborators, average response time, change frequency). Rich notification preferences. |
| **Excluded** | Push notifications, Slack/email integrations (unless product requires them). |
| **Migrations needed?** | Yes — activity warehouse, notification tables, analytics views. |
| **Risk** | High — cross-project data merging, notification infrastructure, real-time notification delivery. |
| **Success criteria** | Users see all activity across projects. Notification bell shows unseen count. Analytics dashboard shows meaningful metrics. |

---

## Cross-Version Dependencies

```
V1.0 (copy) ←── foundation for all versions
    │
    ├── V1.1 (access telemetry) ←── independent, can run parallel
    │
    ├── V1.2 (realtime/pagination) ←── depends on V1.0 API changes
    │
    └── V2.0 (unified timeline) ←── depends on V1.0 + V1.1 + V1.2
           │
           ├── V2.1 (recipient events) ←── depends on V2.0 unified view
           │
           ├── V2.2 (client estimate feed) ←── depends on V2.0 + strict privacy gates
           │
           └── V3.0 (activity center) ←── depends on V2.0–V2.2
```

---

## De-Risking Strategy

| Risk | Mitigation |
|------|-----------|
| Access telemetry volume (high-traffic shared links) | Rate-limit access events. Group duplicate visits within time window. Filter bot/crawler traffic. |
| Privacy concerns (location, device tracking) | Plan documented in `26-privacy-retention-and-client-disclosure-plan.md`. Approximate location only. No browser GPS. Disclosure in privacy notice. |
| Unified timeline performance | Test with production-scale data before deployment. Consider materialized view. |
| Client estimate feed data leakage | Multiple visibility gates. Test edge cases thoroughly. Audit before release. |

---

## Cross-References

- See `27-third-pass-master-implementation-blueprint.md` for consolidated implementation plan
- See `19-migration-and-backfill-decision-matrix.md` for per-version migration needs
- See `13-north-star-and-product-principles.md` for product direction
