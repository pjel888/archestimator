# 28 — Fourth-Pass Stakeholder Review Packet

**Date:** 2026-06-02
**Status:** Fourth-pass final — pending stakeholder review
**Audience:** Product, Legal/Privacy, Engineering stakeholders
**Purpose:** Concise, non-technical review packet for stakeholder sign-off before implementation begins.

---

## 1. North Star

> Every meaningful project, estimate, and client action should be understandable in three seconds, traceable in thirty seconds, and safe to show to the right audience.

Today, Archestimator's activity history shows technical labels like "row_inserted" and "Decision: accepted." The overhaul makes activity human-readable: "Philip added Chroma Sink to Living Area" and "Maria approved the proposal."

---

## 2. What We're Building

### V1.0 — Human-Readable Activity (NOW)

Fix existing bugs and make all activity copy readable:

- **Workshop estimate history**: 13 event types get full sentences with actor names, field changes, before/after values.
- **Shared-link owner activity**: Comments, decisions, and proposal views get human-readable copy.
- **Email digests**: Same readable copy in email notifications.

**No new data collection. No privacy impact. Just better copy.**

### V1.1 — Access Telemetry (PENDING APPROVAL)

Let project owners know who opened their shared links:

- Record when a client opens the link, reaches the password gate, submits a password, or views the proposal.
- Show approximate location (country only by default) and device type (desktop/mobile) in expandable audit details.
- Distinguish known recipients from anonymous viewers.

**This requires new data collection and needs stakeholder approval before implementation.**

### V2 — Unified Timeline (FUTURE)

Single timeline merging estimate changes, client activity, and access events. Deferred.

---

## 3. What Each Audience Sees

### Project Owners (Workshop users)

| Surface | What they see |
|---------|--------------|
| Activity History modal | Full sentences: "Philip changed unit cost for Chroma Sink from ₱2,500 to ₱3,000." |
| Shared-link Activity tab | "Maria approved the proposal." "Client viewed the proposal." |
| Audit details (expandable) | Exact timestamps, before/after values, field-level changes. |
| Access telemetry (V1.1) | "Viewed from Manila, PH on Chrome (Desktop)" — only in audit details, NOT in primary timeline. |

### Clients/Recipients (Shared link viewers)

| Surface | What they see |
|---------|--------------|
| Shared link page | Comments and decisions they can interact with. |
| Their own activity | "You approved the proposal." "You viewed the proposal." |
| Other visitors | **Nothing.** No device info, no location, no other visitors' activity. |

### Support/Admin (Internal only)

| Surface | What they see |
|---------|--------------|
| Full audit view | IP hash, user-agent hash, browser/OS details, full timestamps, bot flags, all events including anonymous and bot traffic. |

---

## 4. What Data We Collect

| Data | When | Why | Visible to owner? |
|------|------|-----|-------------------|
| Hashed IP address (SHA-256, one-way) | Every page visit | Security, audit correlation | Yes, in audit details |
| Hashed user-agent (SHA-256, one-way) | Every page visit | Security, audit correlation | Yes, in audit details |
| Parsed device type (desktop/mobile/tablet) | Every page visit | Owner visibility | Yes, in audit details (if approved) |
| Parsed browser name | Every page visit | Owner visibility | Yes, in audit details (if approved) |
| Approximate country from network provider | Every page visit | Owner visibility | Yes, in audit details (if approved) |
| Event type and timestamp | Every action | Activity history | Yes |
| Password success/failure (boolean only) | Password attempts | Security | Yes |

## 5. What We NEVER Collect

- **Raw IP addresses** — hashed before storage, never stored plaintext
- **Raw user-agent strings** — hashed before storage, only parsed fields stored
- **Password values** — never stored, never logged, never hashed
- **Precise GPS location** — never requested, never stored
- **Browser fingerprinting data** — screen size, fonts, color depth — never collected
- **Referrer URLs** — never stored
- **Cookies from other domains** — never accessed

---

## 6. Decisions That Need YOUR Approval

### Product Decisions

| # | Decision | Recommendation | Why |
|---|----------|---------------|-----|
| P1 | Should device/browser appear in owner UI? | Yes — in audit details only, not primary timeline. | Owners want to know if client viewed on mobile vs desktop. But primary timeline should stay clean. |
| P2 | Should anonymous visits appear in owner activity? | Yes — "Anonymous viewer opened the shared link." | Provides signal that the link was opened without PII exposure. |
| P3 | Should client-facing activity feed exist in V1? | No — defer to V2. | Current effort is owner-focused. Adding client feed increases scope and risk. |
| P4 | Should bot/email preview opens be hidden? | Yes — hide by default. | Prevents false "client opened" signals from email preview bots. |
| P5 | Should "You viewed the proposal" appear to clients? | Yes — simple confirmation message. | Builds trust. Not a full activity feed. |

### Legal/Privacy Decisions

| # | Decision | Recommendation | Why |
|---|----------|---------------|-----|
| L1 | In-product disclosure for access logging? | Privacy policy update minimum. In-product notice optional. | Most SaaS products log access. Privacy policy update ensures compliance. |
| L2 | City-level location or country only? | Country only by default. City requires explicit approval. | Country-level is sufficient for owner context. City-level increases privacy risk. |
| L3 | Hashed IP — acceptable to retain? | Yes, but classify as pseudonymized personal data. | One-way hash cannot be reversed, but same IP → same hash enables correlation. |
| L4 | Retention period for access telemetry? | Keep indefinitely for now. Define 90-day policy before V2. | Access logs are light. Deletion policy can be defined later. |
| L5 | Privacy policy update required before shipping? | Yes — update before any access data collection begins. | Legal compliance. |

### Engineering Decisions (for awareness)

| # | Decision | Status |
|---|----------|--------|
| E1 | Use existing database columns for access metadata (no migration) | Approved |
| E2 | Server-side event recording (not client beacons) | Approved |
| E3 | 9-PR implementation sequence | Approved |
| E4 | Fix broken CSRF on public activity GET route | Approved (PR 2 preflight) |
| E5 | Dedupe strategy: always record, collapse in UI | Approved |

---

## 7. Approval Checklist

| Decision | Options | Recommendation | Owner | Status |
|----------|---------|---------------|-------|--------|
| P1 — Device/browser in owner UI | Yes (audit) / No / Yes (primary) | Audit details only | Product | ☐ Pending |
| P2 — Anonymous visits visible | Yes / No | Yes | Product | ☐ Pending |
| P3 — Client-facing activity feed V1 | Yes / No / V2 | Defer to V2 | Product | ☐ Pending |
| P4 — Bot opens hidden | Yes / No | Yes | Product | ☐ Pending |
| P5 — "You viewed" to clients | Yes / No | Yes | Product | ☐ Pending |
| L1 — In-product disclosure | Required / Not required / Policy only | Policy minimum | Legal | ☐ Pending |
| L2 — Location granularity | None / Country / Region / City | Country only (default) | Legal | ☐ Pending |
| L3 — IP hash retention | Indefinite / Limited / Delete | Indefinite (pseudonymized) | Legal | ☐ Pending |
| L4 — Access log retention | Indefinite / 90-day / Other | Define before V2 | Legal | ☐ Pending |
| L5 — Privacy policy update | Required / Not required | Required before V1.1 | Legal | ☐ Pending |
| E1 — No migration for V1.1 | metadata_json / Add enum / New table | metadata_json | Engineering | ✅ Approved |
| E2 — Server-side event recording | Server-side / Client beacon / Hybrid | Server-side | Engineering | ✅ Approved |
| E3 — PR sequence | 9 PRs | As documented | Engineering | ✅ Approved |
| E4 — CSRF fix on activity route | Fix / Defer | Fix in PR 2 | Engineering | ✅ Approved |
| E5 — Dedupe strategy | UI collapse / Suppress / Both | Record all, collapse in UI | Engineering | ✅ Approved |

---

## 8. What Happens Next

1. **Review this packet** — Product and Legal/Privacy stakeholders review the decisions above.
2. **Schedule a review meeting** — Use `33-stakeholder-review-script.md` for meeting agenda.
3. **Sign off on decisions** — Update `29-final-decision-log-and-approval-matrix.md` with approvals.
4. **Merge planning docs** — PR 1 (docs only, no code changes).
5. **Begin PR 2** — Preflight bug fixes (safe, no privacy dependencies).
6. **Begin PRs 3-6** — Composer + UI integration (no access telemetry yet).
7. **Gate PR 7** — Access telemetry only after stakeholder sign-off on P1-P5, L1-L5.

---

## 9. Where to Learn More

| Topic | Document |
|-------|----------|
| Full technical audit and contradictions resolved | `30-final-technical-reconciliation-audit.md` |
| All decisions with status and rationale | `29-final-decision-log-and-approval-matrix.md` |
| Implementation readiness by category | `32-final-implementation-readiness-scorecard.md` |
| PR 2 execution plan | `31-pr2-preflight-implementation-brief.md` |
| Meeting agenda for stakeholder review | `33-stakeholder-review-script.md` |
| Privacy boundaries in detail | `26-privacy-retention-and-client-disclosure-plan.md` |
| Access telemetry plan | `23-shared-page-access-activity-plan.md` |
| Full roadmap V1-V3 | `24-activity-history-overhaul-roadmap.md` |

---

## Cross-References

- See `29-final-decision-log-and-approval-matrix.md` for all decision statuses
- See `30-final-technical-reconciliation-audit.md` for code-verified findings
- See `32-final-implementation-readiness-scorecard.md` for go/no-go assessment
- See `33-stakeholder-review-script.md` for meeting facilitation guide
