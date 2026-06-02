# 22 — Third-Pass Verification Audit

**Date:** 2026-06-02
**Branch:** `main`
**Current HEAD (at third-pass time):** `d78686f` (`Refresh current-head launch validation proof`) — **Fourth-pass note: actual HEAD is now `405d6ac`. No activity code changed.**
**Second-pass claimed HEAD:** `97c7d60` (corrected here)
**Status:** Third-pass audit complete

---

## 1. Environment Verification

| Item | Second-pass | Third-pass verification |
|------|------------|------------------------|
| Branch | `main` | `main` — confirmed |
| Current HEAD | `97c7d60` (short) | `d78686f` (short), full: `d78686f259b07349220aefd9eb64f5a86c752456` |
| Second-pass planning commit | `e6539c6` | Confirmed: `e6539c6 Add activity history human-readable v1 planning phase` |
| Second-pass audit commit | `2e599e8` | Confirmed: `2e599e8 Second-pass audit: Activity History human-readable V1 planning pack` |
| Activity code changed since second pass? | — | **No** — `d78686f` is a proof validation commit. No activity-related files changed. |

---

## 2. Folder Rename

| Item | Status |
|------|--------|
| Old path | `.ai/03_plans/activity-history-human-readable-v1/` |
| New path | `.ai/03_plans/activity-history-overhaul-v1/` |
| Method | `git mv` — file history preserved |
| External references to old path | **0 found** — no code, docs, or config files reference the old folder path outside the folder itself |
| Internal references updated | All 21 existing docs + README updated |

---

## 3. Files Inspected During Third Pass

| File | Inspection result |
|------|-------------------|
| `src/app/share/[token]/page.tsx` | **Read fully.** Confirmed: `recordProjectPublicationEvent("open")` called AFTER password gate check. First-recipient visit records anonymous open because session init is client-side. |
| `src/app/api/share/[token]/password/route.ts` | **Read fully.** Confirmed: Records `password_attempt` for success/failure/locked via `project_publication_events`. Does NOT record "password gate viewed" event. |
| `src/app/api/share/[token]/events/route.ts` | **Read fully.** Confirmed: Exists, accepts `open`, `password_success`, `password_failure`, `download_attempt_blocked`. CSRF-protected, rate-limited. NOT called from `page.tsx`. Calls `recordProjectPublicationEvent()`. |
| `src/app/api/share/[token]/session/route.ts` | **Read fully.** Confirmed: POST creates HttpOnly session cookie. DELETE destroys it. Creates non-HttpOnly companion cookie for client-side session detection. Does NOT record session start as an event. |
| `src/components/share/SharePageRecipientSessionInitializer.tsx` | **Read fully.** Confirmed: Client-side `useEffect` posts to session route, then `window.location.replace()` to reload. This runs AFTER server render, confirming the anonymous-first-visit gap. |
| `src/lib/publication/public-repository.ts` (lines 406-480) | **Read fully.** Confirmed: `recordProjectPublicationEvent()` stores `ip_hash` (SHA-256 of x-forwarded-for), `user_agent_hash` (SHA-256 of user-agent), `metadata_json`. For `open` with `recipientId`: updates `shared_link_recipients.delivery_status` to `"opened"` and inserts into `shared_link_events`. Also calls `increment_project_publication_open` RPC. |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` | **Read partially.** Confirmed: `shared_link_events` table with CHECK constraint on event_type, `metadata_json` JSONB, `ip_hash`, `user_agent_hash` columns. |
| `supabase/migrations/20260531010000_project_publication_password_attempt_event.sql` | **Read fully.** Confirmed: Adds `password_attempt` to `project_publication_event_type` enum. |

---

## 4. Claim Verification Table

| Area | Second-pass status | Third-pass verification | Action taken |
|------|-------------------|------------------------|--------------|
| Folder rename | `activity-history-human-readable-v1` | **Renamed** to `activity-history-overhaul-v1` via `git mv` | Rename completed; all cross-references updated |
| Share page open tracking | "Open event recorded via `recordProjectPublicationEvent()`" — true but incomplete | **CONFIRMED GAP**: Open recorded only after password check passes. Password-gate visits NOT recorded. First recipient-token visit records anonymous open (session init is client-side, after server render). | Documented in `23-shared-page-access-activity-plan.md` |
| Password gate visit tracking | Not assessed in second pass | **GAP**: `ProjectPublicationPasswordGate` component renders but no event is recorded. User must submit password before any event gets written. Password-gate view is invisible to analytics. | Documented in `23-shared-page-access-activity-plan.md` |
| Recipient first-visit tracking | Not assessed in second pass | **GAP**: First click with `?recipient=` logs anonymous `open` because `SharePageRecipientSessionInitializer` runs client-side after server render. Subsequent loads resolve recipient from cookie server-side. | Documented in `23-shared-page-access-activity-plan.md` |
| Device/browser/location metadata | Not assessed in second pass | **GAP**: Only `ip_hash` and `user_agent_hash` stored. No parsed browser/OS/device type. No approximate location from provider headers. | Documented in `23-shared-page-access-activity-plan.md` and `25-access-event-data-model-and-migration-plan.md` |
| Millisecond timestamp requirement | Not assessed in second pass | **SUFFICIENT**: `created_at` is `timestamptz` — Postgres stores microsecond precision. Display formatting needed in UI only. | Confirmed in `23-shared-page-access-activity-plan.md` |
| Current event tables | `shared_link_events` + `project_publication_events` mapped | **VERIFIED**: Two tables confirmed. `project_publication_events` has `ip_hash`, `user_agent_hash`, `metadata_json`. `shared_link_events` has same columns plus `recipient_id`. | Updated `16-event-taxonomy-and-lifecycle-map.md` |
| `/api/share/[token]/events` route | Not assessed in second pass | **FOUND**: Route exists, accepts 4 event types, NOT called from `page.tsx`. Currently unused in share page open flow. | Evaluated in `23-shared-page-access-activity-plan.md` — should be used for client-side access telemetry |
| Password route behavior | Not assessed in second pass | **VERIFIED**: Records `password_attempt` with `success: true/false` or `reason: "locked"` in metadata. Does NOT record "gate viewed." | Documented in `23-shared-page-access-activity-plan.md` |
| `recordProjectPublicationEvent()` exact behavior | Assessed partially | **VERIFIED FULLY**: Stores `ip_hash`, `user_agent_hash`, `metadata_json`. For `open` with `recipientId`: updates recipient status to `"opened"`, inserts `shared_link_events`. Calls `increment_project_publication_open` RPC. | Documented in `23-shared-page-access-activity-plan.md` |
| Privacy constraints | "IP hashes instead of raw IPs" — confirmed | **VERIFIED**: Uses SHA-256 hash via `createHash("sha256").update(value).digest("base64url")`. No raw IP stored. No raw user-agent stored. | Confirmed in `26-privacy-retention-and-client-disclosure-plan.md` |
| Activity code changed since second pass? | — | **VERIFIED**: No activity-related files changed between `97c7d60` and `d78686f`. Commit `d78686f` is a proof validation refresh. `git log` confirms no activity file changes. | Documented above |

---

## 5. Second-Pass Claims Corrected

| Second-pass claim | Correction |
|-------------------|------------|
| "Current HEAD: `97c7d60`" | Updated to `d78686f` in all docs. No code impact — no activity changes between the two. |
| "No recipient name resolution for decisions" | Still accurate. Third pass confirms this as a gap for PR 6. |
| "`row_inserted` filter is a bug" | Still accurate. Preflight fix still needed. |
| "Shared-link Realtime is broken" | Still accurate. Filter uses empty string. |
| "Shared-link owner pagination is flawed" | Still accurate. Cursor applied after in-memory merge. |
| "Decision digest already exists" | Still accurate. Both comment and decision trigger it. |
| "Two event tables mapped" | Still accurate. Now expanded with access telemetry taxonomy. |

---

## 6. Remaining Known Gaps (Third Pass)

| Gap | Severity | Action |
|-----|----------|--------|
| Password-gate page visit not recorded | High | Plan in `23-shared-page-access-activity-plan.md` |
| First recipient-token visit records anonymous open | Medium | Plan in `23-shared-page-access-activity-plan.md` |
| No device/browser parsed metadata | Medium | Plan in `25-access-event-data-model-and-migration-plan.md` |
| No approximate location from provider headers | Medium | Plan in `25-access-event-data-model-and-migration-plan.md` |
| `/events` route unused in share page flow | Low | Evaluate in `23-shared-page-access-activity-plan.md` |
| No session-start event recorded | Low | Plan in `23-shared-page-access-activity-plan.md` |
| `project_publication_events` not surfaced in any activity feed | Low | Acceptable — internal analytics table |
| `comment_add`, `accept_decision`, `decline_decision` CHECK values unused | Low | Documented; cleanup decision deferred to V2 |

---

## 7. New Requirements Added

1. **Shared page access/visit tracking** — Comprehensive plan in `23-shared-page-access-activity-plan.md`
2. **Privacy-safe telemetry** — Plan in `26-privacy-retention-and-client-disclosure-plan.md`
3. **Device/browser/location metadata** — Plan in `25-access-event-data-model-and-migration-plan.md`
4. **Access event taxonomy** — Expanded in `16-event-taxonomy-and-lifecycle-map.md`
5. **Roadmap for V1–V3** — New `24-activity-history-overhaul-roadmap.md`
6. **Master implementation blueprint** — New `27-third-pass-master-implementation-blueprint.md`

---

## 8. Planning Pack Completeness

The planning pack now covers the full Activity History feature:

- ✅ Estimate history events (14 raw estimate event types: 12 active + 2 dormant, human-readable copy)
- ✅ Shared-link comment/decision/event activity
- ✅ Human-readable copy system (composer spec)
- ✅ **NEW** Shared page access/visit tracking
- ✅ **NEW** Password-gate visit events
- ✅ **NEW** Password attempt success/failure/locked events
- ✅ **NEW** Proposal view events
- ✅ **NEW** Recipient vs anonymous visitor tracking
- ✅ **NEW** Device/browser/location metadata (privacy-safe)
- ✅ **NEW** Millisecond timestamp display
- ✅ Recipient actor resolution
- ✅ Realtime/pagination hardening
- ✅ UI/UX across all surfaces
- ✅ Test strategy
- ✅ Privacy/retention/client disclosure
- ✅ Migration and data model decisions
- ✅ Roadmap V1–V3
- ✅ Implementation blueprint

---

## Cross-References

- See `23-shared-page-access-activity-plan.md` for access telemetry detailed plan
- See `24-activity-history-overhaul-roadmap.md` for versioned roadmap
- See `25-access-event-data-model-and-migration-plan.md` for schema decisions
- See `26-privacy-retention-and-client-disclosure-plan.md` for privacy boundaries
- See `27-third-pass-master-implementation-blueprint.md` for consolidated plan
