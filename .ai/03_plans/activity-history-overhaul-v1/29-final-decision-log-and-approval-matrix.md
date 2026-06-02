# 29 — Final Decision Log and Approval Matrix

**Date:** 2026-06-02
**Status:** Fifth pass — corrected approval statuses
**Purpose:** Source of truth for all decisions across the Activity History Overhaul. This document gates implementation — no implementation work should proceed for any decision still marked "Proposed" or "Needs X" unless explicitly approved.

**⚠️ Fifth-pass correction:** Several decisions previously marked "APPROVED" were engineering team recommendations, NOT actual stakeholder sign-offs. Statuses updated to distinguish Engineering recommendations from Product/Legal approvals. See doc 34 Finding 9 and doc 39 for authority hierarchy.

---

## Decision Table

| ID | Decision | Status | Final choice | Rationale | Approver | Date | Blocks |
|----|----------|--------|-------------|-----------|----------|------|--------|
| D-001 | Copy composer architecture | **APPROVED** | Centralized `src/lib/activity/` module | Single module for activity composition. All event producers call into this module. Ensures consistent `ActivityViewModel[]` shape regardless of source. No scatter-gather across route handlers. | Engineering | 2026-06-02 | PRs 1-4 |
| D-002 | Public API response contract | **APPROVED** | `ActivityViewModel[]` with `title` field | Every activity entry carries a human-readable `title`. Consumers render `title` directly; no client-side event-type-to-text mapping. | Engineering | 2026-06-02 | PRs 1-2 |
| D-003 | Estimate event type count | **APPROVED** | 14 estimate event types (12 active, 2 dormant) | Covering: node_created, node_renamed, node_deleted_with_children, tree_reordered, row_added, row_blank_added, row_updated, row_replaced, row_deleted, sheet_code_updated, sheet_metadata_updated, sheet_version_created, sheet_restored_as_copy, template_inserted. **Fifth-pass correction:** Count corrected from 13 → 14. 12 are active in Activity UI filter; `sheet_version_created` and `sheet_restored_as_copy` are dormant named-version events filtered from the feed. | Engineering | 2026-06-02 | PR 3 |
| D-004 | `row_inserted` filter fix | **APPROVED** | Replace with `row_added` + `row_blank_added` | Current filter value `"row_inserted"` matches zero events. Actual event types are `"row_added"` and `"row_blank_added"`. | Engineering | 2026-06-02 | PR 2 |
| D-005 | Realtime strategy | **APPROVED** | Fix filter to use `publicationId` OR remove from V1 claims | Current Realtime subscription filter uses empty string — receives ALL publication events. Fix: pass and filter by `publicationId`. If Supabase Realtime cannot be fixed within V1 timeline, remove from V1 claims. | Engineering | 2026-06-02 | PR 2 |
| D-006 | Public API `event_type` select | **APPROVED** | Select `event_type` internally in query; do NOT expose in public JSON response until composer integration (PR 5). | Current query already selects `event_type` from DB. Composer (PR 3) needs it internally. But raw `event_type` in public response leaks technical details before the composer can sanitize. **Fifth-pass correction:** D-006 description was inaccurate — event_type is already in the SELECT clause. The fix is to NOT include it in the public JSON response until PR 5 transforms it via the composer. | Engineering | 2026-06-02 | PR 2 (select) / PR 5 (expose) |
| D-007 | Public activity GET route CSRF | **APPROVED** | Fix: replace `assertSameOriginPublicPost` with `assertSameOrigin` (Origin-only check). Current code is broken — GET with POST-only CSRF. | The activity GET route calls `assertSameOriginPublicPost()` which requires `Origin` + custom `x-archestimator-csrf` header + `ae_publication_csrf` cookie. Browsers don't send custom headers on same-origin GET. Route always returns 403 for browser clients. Fix: use `assertSameOrigin` (Origin-only, like session route). | Engineering | 2026-06-02 | PR 2 |
| D-008 | No migration for V1 copy-only | **APPROVED** | Copy composer needs zero DB changes | Composer reads existing columns. No new tables, columns, enums, or CHECK values. Zero-downtime deploy. | Engineering | 2026-06-02 | PRs 1-4 |
| D-009 | `metadata_json` for V1.1 access telemetry | **APPROVED** | Use existing `event_type` values + `metadata_json.access_stage`. No enum/CHECK changes in V1.1. | Access stages stored in existing `metadata_json` JSONB column. `event_type` stays as `open` or `password_attempt`. No migration needed. Validate schema at application level. Defer enum/CHECK additions to V2 (D-010). | Engineering | 2026-06-02 | PR 7 |
| D-010 | Enum/CHECK changes for new event types | **DEFERRED to V2** | Deferred | Adding enum values to `project_publication_event_type` or CHECK values to `shared_link_events.event_type` IS a migration. Both are additive and safe but require migration files. Defer to V2 when event taxonomy is stable and migration is explicitly approved. | Engineering | 2026-06-02 | V2 |
| D-011 | New access events table | **DEFERRED to V2** | Deferred | `shared_link_access_events` table would provide clean separation. But V1.1 can use existing tables + `metadata_json`. New table adds complexity without V1.1 benefit. | Engineering | 2026-06-02 | V2 |
| D-012 | Server-side session cookie in page.tsx | **REJECTED** | Keep current client-side session init flow via `/api/share/[token]/session` | Current flow: first visit records anonymous page_visit (client-side session POST + reload). Reload records named proposal_viewed. This is the idiomatic pattern. Dedupe in UI. Moving session init server-side is feasible but adds complexity without clear benefit. | Engineering | 2026-06-02 | — |
| D-013 | Password gate view recording | **APPROVED** | Record server-side in page.tsx before gate render | When page detects password gate condition (!hasPasswordAccess && passwordRequired), call `recordProjectPublicationEvent("open", { access_stage: "password_gate_viewed" })` before returning the gate component. No client beacon needed. No CSRF complexity. | Engineering | 2026-06-02 | PR 7 |
| D-014 | `/events` route usage for access telemetry | **REJECTED** | Reserve `/events` for interactive actions with existing CSRF setup. Access events recorded server-side. | `/events` route requires full double-submit cookie CSRF which access tracking components don't have. Server-side recording is more reliable and avoids CSRF. `/events` stays for password form, comments, decisions. | Engineering | 2026-06-02 | PR 7 |
| D-015 | Client-facing activity feed | **DEFERRED to V2** | Deferred | No client-facing activity feed exists today. SharedLinkActivityFeed is owner-only. Building client feed requires UI design, permission model, and privacy review. | Product | 2026-06-02 | V2 |
| D-016 | Access telemetry visibility model | **Engineering recommended; NEEDS PRODUCT** | Three-tier: (1) Primary owner timeline — who/what/when. (2) Audit details (expandable) — browser, OS, device, location, exact timestamp, IP hash. (3) Support/admin — full diagnostics including bot traffic. | Tiered visibility balances owner transparency with clean UI. Primary timeline stays readable. Drill-down available. Full diagnostics reserved for support. **Fifth-pass correction:** Changed from "APPROVED" to "Engineering recommended; NEEDS PRODUCT" — Product sign-off is still pending per approval checklist. | Product | — | PR 7 |
| D-017 | Device/browser metadata in owner UI | **NEEDS PRODUCT** | Show in audit details only, not primary timeline. Stakeholder must approve. | Device/browser adds value for owners but may feel intrusive. Audit details only (expandable). Requires product sign-off on which fields appear and labels. | Product | — | PR 7 |
| D-018 | Location data granularity | **NEEDS LEGAL** | Default: country only from provider headers OR omit entirely. City-level requires explicit stakeholder/legal approval. | Country-level provides context without privacy risk. City-level increases identifiability. Default: country only. Omit entirely if legal objects. | Legal/Privacy | — | PR 7 |
| D-019 | IP hash privacy language | **Engineering recommended; NEEDS LEGAL** | "Lower risk than raw IP; may still be classified as personal data in some jurisdictions." Requires privacy/legal review. | SHA-256 hashed IP is pseudonymous, not anonymous. Same IP always produces same hash — enables correlation. Language in docs and UI must be accurate. Legal review required before disclosure. **Fifth-pass correction:** Changed from "APPROVED Legal/Privacy" to "Engineering recommended; NEEDS LEGAL" — no evidence of actual Legal/Privacy sign-off exists. | Legal/Privacy | — | PR 7 |
| D-020 | Bot/crawler detection | **APPROVED** | Parse UA for bot detection. Check `Sec-Purpose: prefetch` (skip recording). Flag bots in metadata. Hide from owner activity by default. Show in support/admin only. Record for security audit. | Bots generate noise. UA parsing + prefetch detection catches most. Bot events recorded but hidden from owner. Prevents false "client opened" signals. | Engineering | 2026-06-02 | PR 7 |
| D-021 | Event dedupe policy | **APPROVED** | Always record (audit trail). Collapse in UI: `publication_id + COALESCE(recipient_id, ip_hash) + access_stage + 5min_bucket`. Show count badge. | Never drop events at ingest — preserve audit trail. UI deduplication uses composite key with 5-minute time bucket. Collapsed events show count: "Viewed 3 times." | Engineering | 2026-06-02 | PR 7 |
| D-022 | Retention policy | **DEFERRED to V2** | No automated deletion in V1.1. Define before V2. | Retention requires legal input on data minimization, right-to-deletion, and backup implications. V1.1 stores indefinitely; define policy before V2. | Legal/Privacy | — | V2 |
| D-023 | In-product disclosure | **NEEDS LEGAL** | Privacy notice update minimum. In-product disclosure requires legal/compliance sign-off. | Privacy policy must be updated to disclose access logging. In-product notice on shared page is a product decision requiring legal review of exact language. | Legal/Privacy | — | PR 7 |
| D-024 | PR sequence (9 PRs) | **APPROVED** | PRs 1-6 proceed without privacy approval. PR 7 (access telemetry) gated on stakeholder sign-off for D-017, D-018, D-023. | PRs 1-6 are copy-only or bug fixes — no privacy impact. PR 7 collects new data — gated. PRs 8-9 follow PR 7. | Engineering | 2026-06-02 | All PRs |
| D-025 | Comments/Decisions CSRF fix | **APPROVED** | Fix in PR 2. Generate random token, set cookie, send matching header — same pattern as ProjectPublicationPasswordForm. | Current code hardcodes `"client-post"` as CSRF header without setting cookie. Double-submit check always fails (or is a no-op if cookie absent). Fix: follow password form pattern. | Engineering | 2026-06-02 | PR 2 |
| D-026 | Estimate history convergence | **DEFERRED to V2** | Deferred | Unifying estimate history with shared-link activity requires migration and backward-compatible API changes. Too large for V1. | Engineering | 2026-06-02 | V2 |
| D-027 | Old estimate backfill | **REJECTED** | Graceful fallback only | Backfilling historical events is high-risk (data integrity, performance). New activity shows "History available in estimate details" link for pre-cutover estimates. No data migration. | Engineering | 2026-06-02 | PR 3 |
| D-028 | Client "You viewed" message | **APPROVED** | Simple confirmation message, not full feed | When recipient views proposal, display minimal acknowledgment: "You viewed this proposal on June 2, 2026." Single line, visible only to the viewer. NOT a client-facing activity timeline. | Product | 2026-06-02 | PR 8 |

---

## Status Summary

| Status | Count | Decisions |
|--------|-------|-----------|
| **APPROVED** | 16 | D-001–D-005, D-006, D-007–D-009, D-013, D-014, D-020, D-021, D-024, D-025, D-028 |
| **Engineering recommended; NEEDS PRODUCT** | 2 | D-016, D-017 |
| **NEEDS LEGAL** | 3 | D-018, D-019, D-023 |
| **DEFERRED to V2** | 5 | D-010, D-011, D-015, D-022, D-026 |
| **REJECTED** | 2 | D-012, D-027 |

---

## Implementation Gates

| Gate | Condition | Status |
|------|-----------|--------|
| PRs 1-6 | All engineering decisions approved (D-001–D-009, D-025) | **UNLOCKED** ✅ |
| PR 7 (access telemetry) | D-017 + D-018 + D-023 approved by Product/Legal | **LOCKED** 🔴 |
| PR 8 (client message) | D-028 approved | **UNLOCKED** ✅ |
| PR 9 (polish) | PRs 1-8 merged, no regressions | **LOCKED** 🔴 |
| V2 scope | Deferred decisions re-evaluated | **FUTURE** |

---

## Approval Checklist

| Approver role | Decisions to review | Status |
|--------------|-------------------|--------|
| Product | D-017 (device in UI), D-016 (visibility model), D-015 (client feed) | ☐ Pending |
| Legal/Privacy | D-018 (location), D-019 (IP hash), D-023 (disclosure), D-022 (retention) | ☐ Pending |
| Engineering | D-001–D-009, D-013, D-014, D-020, D-021, D-024, D-025 | ✅ Recommended |

---

## Cross-References

- See `28-fourth-pass-stakeholder-review-packet.md` for stakeholder-friendly summary
- See `30-final-technical-reconciliation-audit.md` for contradiction audit
- See `32-final-implementation-readiness-scorecard.md` for go/no-go assessment
- See `33-stakeholder-review-script.md` for meeting facilitation guide
