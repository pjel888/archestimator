# 51 — Access Telemetry Production Enablement Checklist

**Date:** 2026-06-02
**Purpose:** Single checklist that determines whether production access telemetry can be safely enabled.
**Status:** Ready to execute — operational actions pending.

---

## A. Legal / Privacy Preconditions

| # | Item | Status | Evidence | Owner |
|---|------|--------|----------|-------|
| A1 | Owner/Product approval recorded | ✅ Approved (2026-06-02) | Doc 47 | Philip Echavez Lewis |
| A2 | Internal Privacy approval recorded | ✅ Approved (2026-06-02) | Doc 47 | Philip Echavez Lewis |
| A3 | External legal counsel review | ⬜ Recommended before public launch | — | TBD |
| A4 | Privacy notice updated with access telemetry disclosure | ⬜ Pending | Doc 52 provides copy pack | Philip Echavez Lewis |
| A5 | In-product disclosure approved and copy finalized | ✅ Copy approved (D-023) | Doc 47, Doc 52 | Philip Echavez Lewis |
| A6 | In-product disclosure implemented on password gate and shared page | ⬜ Pending (PR 7) | Doc 52 provides copy | Engineering |
| A7 | DPO / privacy officer designated | ⬜ Pending | Doc 53 provides designation template | Philip Echavez Lewis |
| A8 | NPCRS registration triage completed | ⬜ Pending | Doc 53 provides triage worksheet | Philip Echavez Lewis |
| A9 | DPS inventory completed | ⬜ Pending | Doc 53 provides DPS inventory template | Philip Echavez Lewis |
| A10 | Data subject request process documented | ⬜ Pending | Doc 54 provides DSR playbook | Philip Echavez Lewis |
| A11 | Breach notification process documented | ⬜ Pending | Doc 54 provides breach playbook | Philip Echavez Lewis |
| A12 | Vendor/processor list documented | ⬜ Pending | Doc 53 §processors | Philip Echavez Lewis |
| A13 | Privacy impact assessment (PIA) completed | ⬜ Pending | Doc 48 §6 | Philip Echavez Lewis |

---

## B. Technical Preconditions

| # | Item | Status | Evidence | Owner |
|---|------|--------|----------|-------|
| B1 | PR 7 (access telemetry) implemented | ⬜ Pending | Code in `main` | Engineering |
| B2 | PR 8B (retention hardening) implemented OR production-safe retention procedure documented | ⬜ Pending | Doc 55 provides retention runbook | Engineering |
| B3 | Feature flag `ACCESS_TELEMETRY_ENABLED` exists | ⬜ Pending (PR 7) | Doc 56 provides rollout plan | Engineering |
| B4 | Default production state of feature flag confirmed `false` | ⬜ Pending | Doc 56 | Engineering |
| B5 | `recordProjectPublicationAnalyticsEvent()` helper used for all non-proposal-view telemetry | ⬜ Pending (PR 7) | Doc 36 side-effects matrix | Engineering |
| B6 | `recordProjectPublicationEvent("open")` only called for actual proposal views (increments open_count) | ⬜ Pending (PR 7) | Doc 36, Doc 50 §PR 7 constraints | Engineering |
| B7 | No raw IP stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B8 | No raw user-agent stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B9 | No GPS coordinates stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B10 | No city/region stored (country only) | ⬜ Pending | Doc 57 test matrix | Engineering |
| B11 | No browser fingerprinting fields stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B12 | No referrer URL stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B13 | No password values stored | ⬜ Pending | Doc 57 test matrix | Engineering |
| B14 | Country-only location from provider headers (Vercel/Cloudflare) | ⬜ Pending (PR 7) | Doc 47 | Engineering |
| B15 | Bot/email preview opens hidden from normal owner feed | ⬜ Pending (PR 7) | Doc 57 test matrix | Engineering |
| B16 | 90-day retention path implemented or operator-run procedure documented | ⬜ Pending | Doc 55 | Engineering / Philip Echavez Lewis |

---

## C. Test Evidence Required

| # | Item | Status | Evidence | Owner |
|---|------|--------|----------|-------|
| C1 | Unit tests: metadata sanitation (no prohibited fields) | ⬜ Pending | Doc 57 | Engineering |
| C2 | Route tests: access event recording behavior | ⬜ Pending | Doc 57 | Engineering |
| C3 | DB write tests: confirming no raw IP, UA, GPS, city, region, fingerprinting, referrer, password | ⬜ Pending | Doc 57 | Engineering |
| C4 | UI tests: disclosure copy visible on password gate | ⬜ Pending | Doc 57 | Engineering |
| C5 | UI tests: audit details visibility (device/browser/OS/country) | ⬜ Pending | Doc 57 | Engineering |
| C6 | Tests: IP hash and UA hash visible only to support/admin | ⬜ Pending | Doc 57 | Engineering |
| C7 | Tests: clients cannot see other visitors' activity | ⬜ Pending | Doc 57 | Engineering |
| C8 | Tests: bot opens hidden from owner feed | ⬜ Pending | Doc 57 | Engineering |
| C9 | Tests: retention cleanup path works (dry-run or automated) | ⬜ Pending | Doc 55, Doc 57 | Engineering |
| C10 | Manual QA completed (shared page + password gate disclosure, audit details, bot filtering) | ⬜ Pending | Doc 18, Doc 57 | Engineering |

---

## D. Final Enablement Decision

### Production Enablement Status

```
⬜ NOT READY
⬜ READY FOR STAGING ONLY
⬜ READY FOR PRODUCTION
```

### Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | | | ⬜ Pending |
| Privacy | | | ⬜ Pending |
| Engineering | | | ⬜ Pending |

### Evidence Links

- Privacy notice URL: ________________
- Disclosure screenshots: ________________
- DPO designation: ________________
- NPCRS triage outcome: ________________
- DPS inventory: ________________
- Test run report: ________________
- Retention proof: ________________
- Feature flag default state: ________________

---

## Cross-References

- `47-pr7-pr8b-approval-record.md` — PR 7/PR 8B approval record
- `48-philippines-data-privacy-compliance-plan.md` — DPA/NPC compliance plan
- `52-privacy-notice-and-disclosure-copy-pack.md` — Privacy notice and disclosure copy
- `53-dpo-npcrs-and-dps-registration-triage.md` — DPO/NPCRS/DPS triage
- `54-data-subject-request-and-breach-response-playbook.md` — DSR and breach playbook
- `55-access-telemetry-retention-runbook.md` — Retention runbook
- `56-access-telemetry-feature-flag-and-rollout-plan.md` — Feature flag and rollout plan
- `57-access-telemetry-test-evidence-matrix.md` — Test evidence matrix
- `58-production-enablement-final-go-template.md` — Final sign-off template
- `50-final-100-implementation-readiness-certification.md` — Implementation readiness certification
