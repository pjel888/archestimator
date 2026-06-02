# 33 — Stakeholder Review Script

**Date:** 2026-06-02
**Status:** Fourth-pass final
**Purpose:** Facilitate stakeholder review meetings for the Activity History Overhaul. Use this script to guide 30-minute and 60-minute review sessions with product, legal/privacy, and engineering stakeholders.

---

## 1. 30-Minute Review Agenda

| Time | Section | Content |
|------|---------|---------|
| 0:00-2:00 | **North Star** | "Every meaningful action should be understandable in 3 seconds, traceable in 30 seconds, and safe to show to the right audience." Today: technical labels. Target: human-readable sentences. Owners know who viewed their shared links and from where. |
| 2:00-5:00 | **What We're Building** | V1.0 (NOW): human-readable activity copy — estimate changes, comments, decisions. Zero new data collection. V1.1 (PENDING): access telemetry — who viewed, when, from where (country only). V2 (FUTURE): unified timeline, client-facing feed, analytics. |
| 5:00-12:00 | **Privacy Walkthrough** | Walk through data collected vs NEVER collected. Collected: IP hash (SHA-256, one-way), UA hash (SHA-256, one-way), parsed device type (desktop/mobile), browser name, country from network provider, event timestamp. NEVER: raw IP, raw UA, passwords, GPS, fingerprinting data, referrer URLs. Visibility: what owners see (primary timeline + audit details), what clients see (their own actions only), what support sees (full diagnostics). |
| 12:00-18:00 | **Key Decisions** | Present the 5 most critical decisions needing sign-off: (1) Location granularity — country-only or city? (Recommend: country-only default). (2) Device metadata in UI — audit details or primary timeline? (Recommend: audit details only). (3) In-product disclosure — required or privacy policy only? (Recommend: policy minimum). (4) Bot filtering — hide from owners? (Recommend: yes). (5) Client-facing activity feed in V1? (Recommend: no — defer to V2). |
| 18:00-25:00 | **Discussion** | Open floor. Surface concerns. Answer questions. Note objections. |
| 25:00-30:00 | **Next Steps** | What gets approved today. What needs follow-up. Timeline for decision. When PR 2 can start (immediately — no privacy dependencies). When PR 7 can start (after sign-off). |

---

## 2. 60-Minute Review Agenda

| Time | Section | Content |
|------|---------|---------|
| 0:00-5:00 | **North Star + Overview** | Same as 30-min. |
| 5:00-15:00 | **Privacy Walkthrough** | Same as 30-min but with deeper dive: exact SQL queries, metadata JSON structure, IP hashing algorithm, bot detection strategy. |
| 15:00-25:00 | **Deep Dive: Access Telemetry** | Walk through every access event: (1) Page visit — recorded server-side before password gate. (2) Password gate viewed — recorded when gate renders. (3) Password attempt — success/failure/locked. (4) Password unlocked — after success. (5) Proposal viewed — with recipient identity. (6) Recipient session started — internal only. Show code paths in page.tsx. Show what owner sees in audit details. |
| 25:00-35:00 | **Deep Dive: Retention & Compliance** | Data retention policy (indefinite for now, define 90-day before V2). GDPR considerations (pseudonymized data, right to deletion, data minimization). Privacy notice language (proposed text). Deletion workflows (cascade on project deletion). |
| 35:00-45:00 | **Deep Dive: PR Sequence & Risk** | 9-PR sequence walkthrough. Which PRs are safe now (PRs 1-6 — copy-only, zero new data). Which PRs need decisions first (PR 7 — access telemetry, gated). Rollback strategy (each PR independently revertible). Risk assessment (LOW for PRs 1-6, MEDIUM for PR 7). |
| 45:00-55:00 | **Extended Discussion** | Detailed Q&A. Live decision-making on remaining open items. Stakeholder concerns addressed. |
| 55:00-60:00 | **Sign-off & Next Steps** | Document decisions made. Assign follow-ups with deadlines. Set next review date. Confirm PR 2 start. |

---

## 3. Questions for Product Stakeholders

**What to ask and why:**

1. **Should client-visible activity feed exist in V1?**
   - Context: Currently no client-facing activity feed. SharedLinkActivityFeed is owner-only.
   - Recommendation: No — defer to V2. Current effort is owner-focused. Adding client feed increases scope and privacy surface.
   - What to show: Current owner modal activity tab. Explain what client feed would look like.

2. **Should anonymous visits appear in owner activity?**
   - Context: When someone opens a shared link without being a known recipient (no session cookie, no ?recipient= token).
   - Recommendation: Yes — "Anonymous viewer opened the shared link." Provides signal without PII.
   - What to discuss: Does this create noise? Does it create false urgency?

3. **Should access events appear as normal timeline cards or in a separate "Access" tab?**
   - Context: High-volume access events could clutter the main timeline with multiple "viewed" entries.
   - Recommendation: Separate "Access" tab or sub-section. Main timeline stays focused on meaningful actions.

4. **Should "You viewed the proposal" appear to clients?**
   - Context: Simple acknowledgment that their visit was recorded.
   - Recommendation: Yes — single-line confirmation, not full feed. Builds trust.
   - What to discuss: Is this necessary? Does it create anxiety?

5. **Should bot/email preview opens be hidden from normal activity?**
   - Context: Apple Mail, Gmail, and other email clients prefetch/preview links, creating false "opened" signals.
   - Recommendation: Yes — hide by default. Prevent false "client opened" signals from bots.
   - What to discuss: Does hiding bots reduce perceived engagement?

6. **Should high-volume access events be summarized?**
   - Context: A client refreshing the page could generate many "viewed" events.
   - Recommendation: Yes — "Viewed 3 times in the last hour" with expandable detail.
   - What to discuss: What's the right dedupe window? 5 minutes? 15 minutes?

---

## 4. Questions for Legal/Privacy Stakeholders

**What to ask and why:**

1. **Is in-product disclosure required for access logging?**
   - Context: We log when shared links are opened, from what country, and on what device type.
   - Recommendation: Privacy policy update minimum. In-product notice on shared page is a product decision.
   - What to discuss: PH data privacy regulations. GDPR applicability. Industry standard (most SaaS log access).

2. **Is privacy policy update required before access telemetry ships?**
   - Context: Current privacy policy may not cover activity/access logging.
   - Recommendation: Yes — update before any access data collection begins.
   - What to discuss: Exact language. Timeline for policy update. Who drafts it?

3. **Is city-level location acceptable?**
   - Context: Provider headers (Vercel/Cloudflare) can provide city-level approximate location.
   - Recommendation: Country only by default. City-level increases identifiability risk.
   - What to discuss: Is country-level sufficient? Is city-level a meaningful privacy concern in PH jurisdiction?

4. **Are hashed IP/user-agent acceptable to retain indefinitely?**
   - Context: SHA-256 one-way hash of IP and UA. Cannot be reversed but same IP always produces same hash.
   - Recommendation: Classify as pseudonymized personal data. Define retention policy before V2 (suggested: 90 days for access logs).
   - What to discuss: Is hashed data considered personal data? Does correlation risk matter?

5. **What retention period is appropriate for access telemetry?**
   - Context: Access logs are light (~500 bytes per event). Currently no automated deletion.
   - Recommendation: Define 90-day retention before V2. Keep indefinitely for now.
   - What to discuss: Industry standard. Data minimization obligations. Right to deletion.

6. **Should location/device data be opt-out or always collected?**
   - Context: Owners need to know if their links were opened. Location/device are auxiliary.
   - Recommendation: Always collected for owner visibility. Disclosed in privacy notice. Opt-out could be considered in V2.
   - What to discuss: Is "always on" acceptable? Should there be a workspace-level privacy setting?

---

## 5. Questions for Engineering Stakeholders

**What to confirm:**

1. **PR 2 (preflight fixes) ready to go?**
   - Status: 5 fix items identified. Small, low-risk. No privacy dependencies. See `31-pr2-preflight-implementation-brief.md`.
   - Recommendation: Start immediately after docs merge.

2. **`metadata_json` for V1.1 confirmed?**
   - Status: No migration needed. Use existing `event_type` values with `metadata_json.access_stage`.
   - Recommendation: Proceed. Defer enum/CHECK changes to V2.

3. **Server-side vs client-side event recording?**
   - Status: Server-side for all access events (page.tsx). Client-side only for interactive actions (password form, comments, decisions).
   - Recommendation: Proceed.

4. **`/events` route usage confirmed?**
   - Status: Reserved for interactive actions. Not for passive access tracking.
   - Recommendation: Proceed.

5. **Dedupe strategy acceptable?**
   - Status: Always record (audit trail). Collapse in UI with 5-min window.
   - Recommendation: Proceed.

6. **CSRF fixes confirmed for PR 2?**
   - Status: Two issues found — GET /activity route uses POST-only CSRF, comments/decisions hardcode CSRF without cookie.
   - Recommendation: Fix in PR 2. See `31-pr2-preflight-implementation-brief.md` items 4 and 5.

---

## 6. Live Decision Checklist

Check off in meeting:

### Product decisions
- [ ] D-017: Device/browser in owner UI — audit details only ☐ / primary timeline ☐ / omit ☐
- [ ] P2: Anonymous visits visible to owners — yes ☐ / no ☐
- [ ] P3: Client-facing activity feed V1 — defer to V2 ☐ / include ☐
- [ ] P4: Bot/email preview hidden — yes ☐ / no ☐
- [ ] P5: "You viewed" message to clients — yes ☐ / no ☐

### Legal/Privacy decisions
- [ ] D-018: Location granularity — none ☐ / country ☐ / region ☐ / city ☐
- [ ] D-023: In-product disclosure — required ☐ / policy only ☐ / not required ☐
- [ ] D-019: IP hash — accept as pseudonymized ☐ / requires deletion ☐ / other ☐
- [ ] D-022: Retention period — indefinite (now) ☐ / 90-day ☐ / other ☐

### Engineering decisions
- [ ] D-001–D-009, D-013, D-020, D-021, D-024, D-025: All approved — ready to proceed ☐

---

## 7. Demo/Story Examples

Show these during the meeting:

### Before (current)
> "row_inserted" · "2 items" · "System/backfill" — in Activity History modal

### After (V1.0)
> "Philip added Chroma Sink to Living Area." — in Activity History modal
> "Maria approved the proposal." — in shared-link Activity tab

### After (V1.1 — owner audit details)
> Viewed from: Manila, PH
> Device: Chrome on macOS (Desktop)
> Time: June 2, 2026 at 3:45:12 PM PHT

### After (V1.1 — client)
> "You viewed this proposal on June 2, 2026 at 3:45 PM."

---

## 8. Final Sign-off Checklist

| Item | Signatory | Signed? |
|------|-----------|---------|
| Product decisions P1-P5 approved | Product lead | ☐ |
| Legal/privacy decisions L1-L5 approved | Legal counsel | ☐ |
| Engineering decisions E1-E5 approved | Engineering lead | ☐ |
| Planning pack approved for PR 1 merge | All stakeholders | ☐ |
| PR 2 authorized to begin immediately | Engineering lead | ☐ |
| PR 7 gated until product/legal sign-off acknowledged | All stakeholders | ☐ |
| Timeline for remaining decisions committed | Product + Legal | ☐ |

---

## Cross-References

- See `28-fourth-pass-stakeholder-review-packet.md` for stakeholder-friendly summary
- See `29-final-decision-log-and-approval-matrix.md` for all decision statuses
- See `30-final-technical-reconciliation-audit.md` for contradiction audit
- See `32-final-implementation-readiness-scorecard.md` for go/no-go assessment
