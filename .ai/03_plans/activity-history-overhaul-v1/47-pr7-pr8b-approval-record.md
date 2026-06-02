# 47 — PR 7 / PR 8B Approval Record

**Date:** 2026-06-02
**Current HEAD:** `6cc9f03`
**Status:** APPROVED — PR 7 and PR 8B gates cleared

---

## Approval Summary

This document records the Owner/Product + Internal Privacy approval that moves PR 7 (Access Telemetry) and PR 8B (Access Telemetry Hardening) from **NO-GO** to **GO**.

---

## Approved By

**Owner/Product Approval:**
- **Name:** Philip Echavez Lewis
- **Role:** Owner/Product Lead, Archestimator
- **Date:** 2026-06-02
- **Status:** Approved

**Internal Privacy Approval:**
- **Name:** Philip Echavez Lewis
- **Role:** Owner acting as internal privacy approver for planning purposes
- **Date:** 2026-06-02
- **Status:** Approved under conservative privacy constraints

**External Counsel:**
- **Status:** Not represented in this approval record
- **Note:** External legal counsel review recommended before public launch or wide commercial rollout. Appointment of external counsel for formal Data Privacy Act review is a separate operational task.

---

## Approval Type

```
Approval type: Owner/Product + Internal Privacy Approval
External counsel review: Not obtained / not represented
Approval scope: Planning and implementation authorization under conservative privacy constraints
```

This approval does NOT constitute external legal counsel review. Philip Echavez Lewis, as owner and product lead, is granting product approval and acting as internal privacy approver based on documented Philippine Data Privacy Act / NPC compliance planning (see doc 48).

---

## Decisions Approved

The following decisions, previously gating PR 7, are now **APPROVED**:

| Decision | Topic | Previous Status | New Status | Approver |
|----------|-------|----------------|------------|----------|
| **D-016** | Access telemetry visibility model | Engineering recommended; NEEDS PRODUCT | **APPROVED** — Owner/Product | Philip Echavez Lewis |
| **D-017** | Device/browser in owner UI | NEEDS PRODUCT | **APPROVED** — Owner/Product | Philip Echavez Lewis |
| **D-018** | Location granularity | NEEDS LEGAL | **APPROVED** — Owner/Internal Privacy Approval | Philip Echavez Lewis |
| **D-019** | IP hash privacy language | Engineering recommended; NEEDS LEGAL | **APPROVED** — Owner/Internal Privacy Approval | Philip Echavez Lewis |
| **D-022** | Retention policy | DEFERRED to V2 | **APPROVED FOR V1.1** — 90-day retention target | Philip Echavez Lewis |
| **D-023** | In-product disclosure | NEEDS LEGAL | **APPROVED** — Owner/Internal Privacy Approval | Philip Echavez Lewis |

---

## Decision Outcomes

### D-016 — Access Telemetry Visibility Model

**Final choice:** Three-tier visibility:
1. **Primary owner timeline:** who/what/when only. No device, browser, location, or IP hash in the primary sentence.
2. **Owner audit details (expandable):** Approved safe telemetry details — device type, browser family, OS family, country-level location, timestamp. IP hash NOT shown.
3. **Support/admin view:** Diagnostic details including IP hash and user-agent hash when needed for incident investigation.

**Primary copy example:** "Maria viewed the proposal."
**Audit detail example:** "Device: Mobile · Safari · iOS"

### D-017 — Device/Browser in Owner UI

**Final choice:** Device/browser metadata may appear only in expandable owner audit details — NOT in the primary timeline.

**Approved display fields:**
- Device type: desktop / mobile / tablet / bot / unknown
- Browser family: Chrome / Safari / Firefox / Edge / unknown
- Operating system family: macOS / Windows / iOS / Android / unknown

**NOT approved for display:**
- Full user-agent string
- Exact browser minor/build version
- Full OS version
- Screen size
- Fonts
- Fingerprinting fields

### D-018 — Location Granularity

**Final choice:** Country only for V1.1.

**Approved:** Country code or country label from trusted provider headers (e.g., Vercel `x-vercel-ip-country`, Cloudflare `cf-ipcountry`) when available.

**Not approved for V1.1:** City, region/province, precise GPS, third-party IP geolocation lookup, storing raw IP address.

**Fallback:** "Location unavailable" when no provider header is present.

**Constraint:** If provider headers are absent, do NOT call an external geolocation service.

### D-019 — IP Hash Privacy Language

**Final choice:** IP hash (SHA-256) may be stored for security and audit correlation, treated as pseudonymized/potential personal data.

**Constraints:**
- Raw IP must never be stored
- IP hash must not be shown in normal owner UI
- IP hash may appear only in support/admin diagnostics or audit export if explicitly needed for incident investigation
- Privacy notice must disclose access logging in plain language
- Retention must be defined (see D-022)

### D-022 — Retention Policy

**Final choice:** 90-day retention target for access telemetry.

**Retention targets:**
- Access telemetry: 90 days
- Estimate audit history: unchanged
- Comments/decisions retention: unchanged

**Implementation note:** PR 7 may create telemetry behind a feature flag or disabled production flag if automated retention is not yet ready. PR 8B must define/enforce the retention path before telemetry is enabled by default in production. If automated deletion is not implemented in PR 7/8B, the plan must define an operator-run cleanup procedure and a follow-up ticket.

### D-023 — In-Product Disclosure

**Final choice:** Privacy policy update is required before access telemetry goes live. A small in-product disclosure is required on the shared page and password gate.

**Approved full disclosure:**
> Visits to this shared page are logged. The project owner can see when the link was opened and whether the proposal was viewed. We do not store raw IP addresses, exact GPS location, or password values.

**Approved short footer:**
> Visits are logged for project security and activity history.

**Disclosure placement:**
- Password gate
- Shared proposal page footer or sidebar
- Near comments/decision form if space allows

---

## Approved Privacy Constraints (Summary)

1. ✅ Country-only location (no city/region)
2. ✅ No raw IP storage
3. ✅ No raw user-agent storage
4. ✅ No GPS
5. ✅ No browser fingerprinting
6. ✅ Device/browser in owner audit details only
7. ✅ IP hash support/admin only
8. ✅ Privacy policy update required before production enablement
9. ✅ In-product disclosure required
10. ✅ 90-day access telemetry retention target
11. ✅ Bot/email preview opens hidden from normal owner activity
12. ✅ Access telemetry implemented with analytics-only helper per doc 36

---

## Approved Data Fields for V1.1

| Data | Stored? | Owner Visible? |
|------|---------|---------------|
| Timestamp | ✅ Yes | Primary timeline |
| Access stage | ✅ Yes (metadata_json) | Primary timeline |
| Recipient known/anonymous | ✅ Yes | Primary timeline |
| Password success/failure (boolean) | ✅ Yes | Audit details |
| Device type (parsed) | ✅ Yes | Audit details only |
| Browser family (parsed) | ✅ Yes | Audit details only |
| OS family (parsed) | ✅ Yes | Audit details only |
| Country (provider header) | ✅ Yes | Audit details only |
| IP hash (SHA-256) | ✅ Yes | Support/admin only |
| User-agent hash (SHA-256) | ✅ Yes | Support/admin only |
| Bot flag | ✅ Yes | Support/admin only (hidden from normal feed) |

---

## PR Status After This Approval

| PR | Previous Status | New Status |
|----|----------------|------------|
| PR 7 (Access Telemetry) | 🔴 NO-GO | ✅ GO — under approved conservative privacy constraints |
| PR 8B (Access Telemetry Hardening) | 🔴 NO-GO (gated on PR 7) | ✅ GO after PR 7 implementation |

---

## Production Enablement Conditions

PR 7 implementation is GO, but production enablement requires:
- [ ] Privacy notice updated
- [ ] In-product disclosure added to shared page + password gate
- [ ] DPO / NPCRS registration triage completed (see doc 48 §6)
- [ ] 90-day retention path documented or implemented
- [ ] Tests confirming no raw IP, raw UA, GPS, city, region, password values, or fingerprinting data

---

## Signature Block

**Owner/Product Approval:**
```
Name: Philip Echavez Lewis
Role: Owner/Product Lead
Date: 2026-06-02
Status: Approved
```

**Internal Privacy Approval:**
```
Name: Philip Echavez Lewis
Role: Owner acting as internal privacy approver
Date: 2026-06-02
Status: Approved under conservative constraints
```

**External Counsel:**
```
Status: Not represented in this approval record
```

**Future External Counsel Review:**
```
Recommended before public launch or wide commercial rollout.
```

---

## Cross-References

- `29-final-decision-log-and-approval-matrix.md` — Canonical decision log (updated in ninth pass)
- `48-philippines-data-privacy-compliance-plan.md` — DPA/NPC compliance basis
- `46-final-implementation-readiness-lock.md` — Final lock confirmation (updated)
- `28-fourth-pass-stakeholder-review-packet.md` — Stakeholder review packet (updated)
- `23-shared-page-access-activity-plan.md` — Access telemetry implementation plan
- `26-privacy-retention-and-client-disclosure-plan.md` — Privacy and retention plan
- `36-access-telemetry-side-effects-audit.md` — Side effects audit and compliance helper
