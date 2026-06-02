# 30 — Final Technical Reconciliation Audit (Fourth Pass — Historical)

**Date:** 2026-06-02
**Status:** Fourth pass — **Superseded by docs 34–36 for final reconciliation**

**⚠️ Fifth-pass note (2026-06-02):** This document captured 15 contradictions resolved in the fourth pass. It is retained for audit trail. The fifth-pass (final) reconciliation is in:
- `34-final-preimplementation-audit.md` — 12 additional findings including HEAD staleness, event count error, side effects gap, approval statuses
- `35-code-truth-map.md` — Complete code-to-docs truth mapping for 20+ features
- `36-access-telemetry-side-effects-audit.md` — Definitive side effects analysis and helper strategy

**Current HEAD:** `da35386` (was `405d6ac` at fourth-pass time)
**Branch:** `main`
**Current HEAD:** `405d6ac`
**Purpose:** Resolve contradictions and feasibility issues across all 27 planning documents by verifying claims against actual source code and database schemas.

---

## 1. Methodology

Each reconciliation issue was verified against the live codebase at HEAD `405d6ac` (Next.js 16.2.6, Bun, Supabase PostgreSQL 17, 48 migrations). Source files were read directly. Database schemas were traced from migration files. CSRF guards, cookie handling, component rendering, and event recording paths were all verified against actual implementation.

---

## 2. Contradiction Resolution Table

| # | Issue | Current docs say | Code reality | Final correction | Docs updated |
|---|-------|-----------------|-------------|-----------------|-------------|
| 1 | **No migration vs new event types** | Doc 25 §5 "V1.1 Implementation Without Migration" recommends adding `page_visit`, `password_gate_viewed`, `password_unlocked` to `project_publication_event_type` enum AND `proposal_viewed` to `shared_link_events` CHECK constraint — all under a "no migration" heading. | `project_publication_event_type` is a PostgreSQL enum. Adding values requires `ALTER TYPE ... ADD VALUE IF NOT EXISTS`. `shared_link_events.event_type` is a TEXT column with a CHECK constraint — adding values requires `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT`. Both operations ARE migration files. They are additive and safe (no table rewrite, no data loss), but they are still migrations. | **Adding enum values or CHECK values IS a migration.** The correct framing: V1.1 can use `metadata_json.access_stage` only (existing event types, truly no migration) OR can add new enum/CHECK values (safe, additive migration). The docs must not say "no migration" while also recommending enum/CHECK additions. Final recommendation: use existing event types (`open`, `password_attempt`) with `metadata_json.access_stage` for V1.1. Defer enum/CHECK additions to V2 when a structured migration is explicitly approved. | 25, 19, 10, README |
| 2 | **Server-side session cookie feasibility** | Doc 23 §7 and doc 27 §8 recommend resolving `?recipient=` server-side in `page.tsx` and setting the session cookie directly, removing `SharePageRecipientSessionInitializer`. | `page.tsx` (lines 153, 174) already imports `cookies` from `next/headers` and reads cookies via `await cookies()`. It NEVER calls `cookies().set()`. Next.js 16.2.6 RSC DOES support `cookies().set()` in Server Components. `getSharedLinkSessionCookieParts()` from `security.ts` returns `{ name, value, cookieOptions }` ready for `cookies().set()`. However, setting cookies in RSC can fail if the response has already started streaming. The page declares `force-dynamic` (line 41), which mitigates this. | Server-side cookie setting IS feasible. But the current architecture (client-side POST to `/api/share/[token]/session`, then redirect) is the idiomatic pattern for mutation + cookie setting. Direct page.tsx cookie setting would eliminate the client roundtrip but needs careful streaming handling. **Recommendation:** keep the current client-side session init flow for V1.0/V1.1. Record `page_visit` as anonymous on first load, then `proposal_viewed` as named on reload. Use dedupe to collapse duplicate events in UI. Document this as the intended behavior, not a bug. | 23, 27 |
| 3 | **Password gate view — server-side vs client beacon** | Doc 23 §7 recommends a client-side beacon (`fetch` to `/events`) from `ProjectPublicationPasswordGate` for `password_gate_viewed`. | `page.tsx` can call `recordProjectPublicationEvent()` BEFORE the gate render in the `!hasPasswordAccess && passwordRequired` branch (lines ~153-168). The gate is a server component that renders when no access cookie exists. A `recordProjectPublicationEvent()` call placed before the gate return would record server-side, with full access to request headers (IP hash, UA hash, geo headers). This avoids CSRF complexity entirely. | **Prefer server-side recording.** Add a `recordProjectPublicationEvent("open", { access_stage: "password_gate_viewed" })` call in `page.tsx` before the `<ProjectPublicationPasswordGate>` return. No CSRF token needed. No client JS dependency. More reliable. The /events route should be used only for interactive client actions where CSRF is already set up (e.g., password form submission). | 23 |
| 4 | **`/events` route CSRF for client beacons** | Doc 23 recommends using `/events` as a beacon for `password_gate_viewed`. | `/events` route uses `assertSameOriginPublicPost()` which requires: Origin header, `x-archestimator-csrf` custom header, and `ae_publication_csrf` cookie — with header value matching cookie value. The password gate component is a server component — it cannot set cookies or custom headers without client-side JS. A `fetch` beacon from a client component would need to set both the cookie AND the header, which only `ProjectPublicationPasswordForm` currently does correctly. | `/events` is NOT suitable as a general access-tracking beacon. It requires CSRF token setup that most components don't have. **Recommendation:** use server-side recording for all access events. Reserve `/events` for interactive actions that already have CSRF setup (password form). If client-side beacons are needed later, add a safe, rate-limited GET/POST telemetry endpoint with Origin-only validation. | 23 |
| 5 | **`GET /api/share/[token]/activity` CSRF mismatch** | Doc 07 §1.3 notes the route uses service-role, not anon RLS. No doc explicitly flagged the CSRF mismatch. | The activity route (`route.ts` line 60) is a GET endpoint but calls `assertSameOriginPublicPost()`. This function requires: `Origin` header (browsers don't send on same-origin GET), `x-archestimator-csrf` custom header (browsers don't send on simple GET), and `ae_publication_csrf` cookie (sent, but can't match without the custom header). **This route is effectively broken for browser-based clients.** The `SharedLinkActivityFeed` component's public path (`isOwner={false}`) fetches this route — and would receive 403. The component is only rendered with `isOwner={true}` in production, so the bug is latent. | **CRITICAL BUG — must be fixed before any client-facing activity feed ships.** Fix options: (a) replace `assertSameOriginPublicPost` with a GET-safe check that only validates Origin, (b) use a CSRF token from query params, (c) rely on `SameSite=Strict` cookie and publication token validation without CSRF. Recommendation: use a simpler `assertSameOrigin()` (Origin-only) for the GET route, like the session route does. The publication token in the URL already provides a form of protection (unpredictable, single-use path). | 07, 05, 08, 11, 27, 31 |
| 6 | **Client-facing shared-link activity feed** | Doc 23 §6.1 says "Client-visible: Only 'You viewed the proposal' if recipient-identified." Doc 24 roadmap includes V2.2 "Client-Visible Estimate Change Feed." Doc 09 discusses timeline anatomy for clients. Some docs imply a client activity feed exists or is planned. | `SharedLinkActivityFeed` is rendered ONLY in `ProjectPublicationHeader.tsx` (line 419) with `isOwner={true}` — inside the owner's workshop publication modal. The public `/share/[token]` page renders `SharePageTabs`, `SharePageDecision`, `SharePageComments` — ZERO reference to `SharedLinkActivityFeed`. The component supports `isOwner={false}` mode (fetches from public API) but no production code uses it. There is NO client-facing activity feed today. | Clarify all docs: the shared-link activity feed is OWNER-ONLY in V1. The public page shows comments and decisions as interactive UI (not a read-only timeline). Client-visible activity feed is a V2 feature. If clients should see "You viewed the proposal," that should be a simple confirmation message in the existing page, not a full activity feed component. | 23, 24, 15, 09, README |
| 7 | **Access telemetry visibility over-promise** | Doc 23 §6.1 says owners see city, browser, OS, device type, exact timestamp, IP hash. Doc 26 §3 says owners see approximate location, device/browser, exact timestamp, IP hash. | The docs do not distinguish between primary owner timeline and audit/support details. Showing city-level location, browser version, OS version, and device type in the normal activity feed is excessive and could raise privacy concerns. | **Create a three-tier visibility model:** (1) Primary owner timeline: who, what, when — "Maria viewed the proposal, Jun 2 at 3:45 PM." Maybe "Viewed from Makati, PH" only if approved. (2) Owner audit details (expandable): browser, OS, device type, approximate location, exact timestamp, IP hash. (3) Support/admin view: full diagnostic metadata. Update docs 23, 26, 09, 03 to reflect this tiered model. | 23, 26, 09, 03 |
| 8 | **IP hash and location risk language too casual** | Doc 23 §6 says IP hash risk is "Low — one-way hash, not reversible." Doc 26 §1 says "Low — one-way, not reversible" for IP hash, "Low — coarse, provider-derived" for location. | Hashed IP can still be considered personal data in some jurisdictions (GDPR — pseudonymized data is still personal data). Dictionary attacks on SHA-256 hashes are impractical but correlation risks exist (same IP → same hash across events). City-level location can be sensitive in contexts like domestic violence or stalking. The docs should not dismiss these risks as "Low." | **More conservative language:** "Lower risk than raw IP — but may still be classified as personal data in some jurisdictions. Retained only for security/audit correlation." For location: "Approximate, provider-derived location. Potential privacy concern — only show if explicitly approved by stakeholders. Default to country/region only or omit entirely if not approved." Force privacy/legal review sign-off. | 26, 23 |
| 9 | **Bot/crawler detection strategy undermplemented** | Doc 26 §6 says "Flag device.is_bot: true." Doc 23 §7 says "Bot/crawler flagged." | No implementation details exist. Bot detection needs: user-agent parsing, known bot patterns, email preview bots (Apple Mail, Gmail proxy), browser prefetch detection (`Sec-Purpose: prefetch`), security scanners. Without explicit strategy, false positives will create "client opened" signals for bot traffic. | **Add explicit bot strategy:** (1) Parse UA into device type with bot detection. (2) Check `Sec-Purpose: prefetch` header — SKIP recording (not suppress, skip entirely). (3) Check `X-Purpose: preview` for email preview bots — record but flag as bot. (4) Known bot UA patterns — record but flag. (5) Bots: stored in `project_publication_events`, NOT shown in owner activity feed by default, NOT incrementing "opened" counts, visible in support/admin view only. (6) Add tests for each bot scenario. | 23, 26 |
| 10 | **Event dedupe policy undefined** | Docs 23, 25, 20 mention duplicate events (first-recipient-visit double open, page reloads) but no final dedupe policy. | Without dedupe, access telemetry will record multiple "proposal_viewed" events for: browser reload, recipient session redirect, password success redirect, browser back/forward, email preview bots, owner opening their own link. | **Define dedupe policy:** (1) Always record events server-side (no suppression at recording time — audit trail). (2) Collapse in UI using dedupe key: `publication_id + COALESCE(recipient_id, ip_hash) + access_stage + 5_minute_time_bucket`. (3) Show most recent event in each dedupe group with count badge: "Viewed 3 times." (4) Expand to show individual timestamps on click. (5) Bot events excluded from dedupe groups (hidden separately). | 23, 20 |
| 11 | **Analytics vs activity taxonomy** | Doc 16 lists `project_publication_events` as "Internal analytics/security events" and `shared_link_events` as "Activity events." But doc 23 then proposes surfacing `project_publication_events` access events in owner activity feeds. | There is a tension: `project_publication_events` is an internal analytics/security table read via service-role. `shared_link_events` is the owner/client-visible activity table. The third pass proposes making analytics events visible as activity. | **Separate the taxonomies clearly:** `project_publication_events` = internal analytics/security. `shared_link_events` = owner-visible activity. `shared_link_comments` = comment activity source. `shared_link_responses` = decision activity source. Default: `page_visit`, `password_gate_viewed`, failed password attempts → internal/audit only (not client-visible, optionally visible to owner in audit details). `proposal_viewed` → owner-visible shared-link activity. `recipient_session_started` → internal/support only. Bot events → internal/support only. | 16, 23 |
| 12 | **PR sequence contradictions** | Doc 11 has 8 PRs (old sequence). Doc 27 has 9 PRs (new sequence with access telemetry). Doc 04 has Phases 0-6 but references "9 phases." Doc 10 references "9 PRs" but also lists old phase numbering. | PR count varies: 8 in doc 11, 9 in doc 27, implied 9 in doc 04, 9 in doc 10. Doc 11 explicitly says "See doc 27 for definitive sequence" but still shows the 8-PR sequence. Doc 27 claims all docs are consistent (false). | **Standardize on the 9-PR sequence from doc 27.** But add gates: PRs 3-6 can proceed without privacy approval (copy-only). PR 7 (access telemetry) requires privacy/legal sign-off. Update all docs to reference the same 9-PR count with the same phase-to-PR mapping. |
| 13 | **SharePageComments/Decision CSRF broken** | Not mentioned in any planning doc. | Both `SharePageComments.tsx` (lines 84, 136) and `SharePageDecision.tsx` (line 67) hardcode `x-archestimator-csrf: "client-post"` but NEVER set the `ae_publication_csrf` cookie. The double-submit check (`csrfHeader !== csrfCookie`) will always fail unless the user previously submitted the password form (which sets a random cookie, not "client-post"). Only `ProjectPublicationPasswordForm.tsx` correctly generates a random token, sets the cookie, and sends the matching header. | **This is a latent bug in the existing codebase — comments and decisions may fail CSRF in production.** Tests mock `assertSameOriginPublicPost` so the bug is not caught by CI. Fix: comments and decisions should follow the same pattern as password form — generate random CSRF token, set cookie, send header. Or the CSRF guard should be relaxed for these routes if Origin + SameSite cookie is sufficient. | 31, 05 |
| 14 | **Stale HEAD references** | README, 00, 10, 22, 27 all reference HEAD `d78686f`. Actual HEAD is `405d6ac`. | No activity-related code changed between `d78686f` and `405d6ac`, but referencing the wrong HEAD in documentation is inaccurate. | Update all HEAD references to `405d6ac`. Note that no activity code changed. | README, 00, 10, 22, 27 |
| 15 | **Doc 27 false claim** | Doc 27 §9 says "All 27 documents are internally consistent." | Multiple contradictions found (see issues 1, 5, 6, 12 above). This claim is false. | Update doc 27 to acknowledge fourth-pass found contradictions and reference doc 30 for details. | 27 |

---

## 3. Code-Verified Key Facts

### 3.1 Server-side cookie setting IS feasible

- **File:** `src/app/share/[token]/page.tsx` lines 153, 174
- **Evidence:** Already imports `cookies` from `next/headers`. Already reads cookies. `cookies().set(name, value, options)` is supported in Next.js 16.2.6 RSC.
- **Caveat:** Response streaming can interfere if headers already sent. Page uses `force-dynamic`, mitigating this.

### 3.2 Activity route CSRF is BROKEN

- **File:** `src/app/api/share/[token]/activity/route.ts` line 60
- **Evidence:** `GET` calls `assertSameOriginPublicPost()` which requires `Origin` + `x-archestimator-csrf` header + `ae_publication_csrf` cookie. Browsers don't send custom headers on same-origin GET.
- **Impact:** The `SharedLinkActivityFeed` public mode (`isOwner={false}`) would receive 403. Currently unused in production.
- **Fix:** Replace with `assertSameOrigin()` (Origin-only, like session route) or validate via query param CSRF token.

### 3.3 No client-facing activity feed

- **Files:** `src/components/share/SharedLinkActivityFeed.tsx` (dual-mode component), `src/components/workshop/ProjectPublicationHeader.tsx` line 419 (only renders with `isOwner={true}`)
- **Evidence:** Public `/share/[token]` page imports `SharePageTabs`, `SharePageDecision`, `SharePageComments` — NO `SharedLinkActivityFeed`. Zero production usage with `isOwner={false}`.
- **Impact:** Docs claiming a client activity feed exists or is "partially implemented" are incorrect.

### 3.4 Adding enum/CHECK values IS a migration

- **Files:** `supabase/migrations/20260527120000_project_client_publication.sql` (enum creation), `supabase/migrations/20260531010000_project_publication_password_attempt_event.sql` (enum extension via `ALTER TYPE`), `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` (CHECK constraint)
- **Evidence:** `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is a migration statement. `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` is a migration statement. Both are additive and safe, but require migration files.

### 3.5 Comments/Decisions CSRF potentially broken

- **Files:** `src/components/share/SharePageComments.tsx` lines 84, 136; `src/components/share/SharePageDecision.tsx` line 67
- **Evidence:** Both hardcode `x-archestimator-csrf: "client-post"` but never set the `ae_publication_csrf` cookie. `assertSameOriginPublicPost()` compares header to cookie — mismatch → 403.
- **Impact:** If comments/decisions work in production, it's likely because the CSRF check is not actually running (perhaps `assertSameOriginPublicPost` is mocked in some context, or the Origin check passes and the cookie check is lenient for some reason). This needs investigation.

---

## 4. What Metadata Can Be Stored Without Migration

Using existing `metadata_json` columns (already present on all event tables):

| Data | Store in | No migration? | Notes |
|------|----------|--------------|-------|
| `access_stage` | `metadata_json` | ✅ Yes | String: `page_visit`, `password_gate_viewed`, `proposal_viewed`, etc. |
| `access_result` | `metadata_json` | ✅ Yes | String: `success`, `failure`, `not_required` |
| `password_protected` | `metadata_json` | ✅ Yes | Boolean |
| `recipient_known` | `metadata_json` | ✅ Yes | Boolean |
| `device.browser` | `metadata_json` | ✅ Yes | Parsed from UA |
| `device.os` | `metadata_json` | ✅ Yes | Parsed from UA |
| `device.device_type` | `metadata_json` | ✅ Yes | Parsed from UA |
| `device.is_bot` | `metadata_json` | ✅ Yes | Boolean |
| `location.country` | `metadata_json` | ✅ Yes | From provider headers |
| `location.region` | `metadata_json` | ✅ Yes | From provider headers |
| `location.city` | `metadata_json` | ✅ Yes | From provider headers |
| `ip_hash` | Dedicated column | ✅ Yes | Already exists |
| `user_agent_hash` | Dedicated column | ✅ Yes | Already exists |

---

## 5. Final Recommended Event Taxonomy (V1.1, metadata_json approach)

| Event concept | Existing `event_type` used | `metadata_json.access_stage` | Owner-visible? | Client-visible? | Stored in |
|--------------|--------------------------|------------------------------|----------------|-----------------|----------|
| Page visited | `open` | `page_visit` | Yes (if approved) | No | `project_publication_events` |
| Password gate viewed | `open` | `password_gate_viewed` | Yes (if approved) | No | `project_publication_events` |
| Password attempted | `password_attempt` | — | Yes (success/failure) | No | `project_publication_events` |
| Password unlocked | `open` | `password_unlocked` | Yes | No | `project_publication_events` |
| Proposal viewed (named) | `open` | `proposal_viewed` | Yes | Own only | `project_publication_events` + `shared_link_events` |
| Proposal viewed (anon) | `open` | `proposal_viewed` | Yes | No | `project_publication_events` |
| Recipient session started | `open` | `recipient_session_started` | Internal only | No | `project_publication_events` |
| Bot/crawler access | `open` | (any stage) | No (support only) | No | `project_publication_events` |

---

## 6. Cross-References

- See `28-fourth-pass-stakeholder-review-packet.md` for stakeholder-facing summary
- See `29-final-decision-log-and-approval-matrix.md` for all decision statuses
- See `31-pr2-preflight-implementation-brief.md` for PR 2 execution plan
- See `32-final-implementation-readiness-scorecard.md` for go/no-go assessment
- See `33-stakeholder-review-script.md` for meeting agenda
