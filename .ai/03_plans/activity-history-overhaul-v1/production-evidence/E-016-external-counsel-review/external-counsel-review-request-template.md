# E-016 — External Counsel Review Request Template

**Evidence ID:** E-016
**Status:** Recommended / optional
**Owner:** External legal counsel (Philippine data privacy lawyer or equivalent)
**Blocks production?:** ⚠️ Recommended — not strictly blocking if owner accepts risk in writing

---

## Purpose

External legal counsel review of the access telemetry implementation for compliance with:
- Philippine Data Privacy Act (RA 10173)
- NPC circulars and issuances
- Applicable data privacy regulations

---

## Review Scope

Counsel is requested to review the following areas:

### 1. Disclosure Adequacy

- [ ] Privacy notice at `/privacy` (E-001) — does it meet Philippine DPA transparency requirements?
- [ ] In-product disclosure on shared page footer (E-002) — is it conspicuous and timely?
- [ ] In-product disclosure on password gate (E-003) — does it precede data collection?

### 2. DPO / NPCRS Status

- [ ] DPO designation (E-004) — is the designation adequate under NPC Advisory No. 2017-01?
- [ ] NPCRS registration triage (E-005) — is the registration determination correct under NPC Circular No. 2022-04?

### 3. Data Minimization

- [ ] Data collected: IP hash, UA hash, country, device type, browser family, OS family, timestamp, access stage
- [ ] Data NOT collected: raw IP, raw UA, GPS, city, region, password values, referrer URLs, browser fingerprinting
- [ ] Does the collection scope meet the data minimization principle under Philippine DPA?

### 4. Retention Policy

- [ ] 90-day retention for access telemetry data (E-010)
- [ ] Does the retention period comply with Philippine DPA requirements?

### 5. Vendor/Processor Compliance

- [ ] Supabase DPA review (E-009) — adequate for Philippine data subjects?
- [ ] Vercel DPA review (E-009) — adequate for edge processing of request headers?
- [ ] Cross-border data transfer compliance (data stored in Singapore, processed through global edge network)

---

## Documents to Provide to Counsel

1. Privacy notice copy (doc 52 §1-2, E-001 draft)
2. In-product disclosure copy (doc 52 §3-4)
3. DPO designation (E-004 template)
4. NPCRS triage worksheet (E-005 template)
5. DPS inventory (E-006 draft)
6. Access telemetry data flow diagram (E-009)
7. Retention runbook (doc 55)
8. Philippine DPA compliance plan (doc 48)
9. Vendor DPA worksheet (E-009)
10. Feature flag and rollout plan (doc 56)

---

## Counsel Review Memo (to be completed by external counsel)

```
EXTERNAL COUNSEL REVIEW — Access Telemetry Production Enablement

Date: ______________________________
Counsel: ______________________________
Firm: ______________________________

Review scope:
  [ ] Disclosure adequacy (privacy notice + in-product disclosures)
  [ ] DPO/NPCRS status
  [ ] Data minimization
  [ ] Retention policy
  [ ] Vendor/processor compliance

Findings:
________________________________________
________________________________________
________________________________________

Recommendations:
________________________________________
________________________________________
________________________________________

Conclusion:
⬜ Access telemetry implementation is compliant with Philippine DPA and applicable regulations.
⬜ Access telemetry implementation is compliant with the following conditions: _______________
⬜ Access telemetry implementation has compliance gaps that should be resolved before production.
   Gaps: ________________________________________

Signed: ______________________________
Date: ______________________________
```

---

## Owner Risk Acceptance (if bypassing external counsel review)

```
RISK ACCEPTANCE — External Counsel Review Waiver

I, [Owner Name], acknowledge that external legal counsel has not reviewed the access telemetry implementation. I accept the risk of proceeding without external legal review, based on:

- Internal privacy review conducted (doc 47)
- DPO designation (E-004)
- NPCRS triage (E-005)
- Internal compliance assessment (doc 48)

I understand that external legal review is recommended by the planning pack and that proceeding without it means Archestimator has not obtained independent legal verification of compliance with the Philippine Data Privacy Act (RA 10173) and applicable regulations.

Signed: ______________________________
Date: ______________________________
```

---

## Completion Criteria

1. Memo or letter is on counsel's letterhead or sent from counsel's verified email.
2. Review addresses: disclosure adequacy, DPO/NPCRS status, retention policy, data minimization.
3. Memo is dated on or before the production enablement date.
4. Memo states a conclusion or recommendations.

---

**Source doc:** `64-access-telemetry-production-evidence-ledger.md` §E-016
**Gate:** G-16 (Recommended)
**Blocks production?:** ⚠️ Recommended, not strictly blocking if owner formally accepts risk.

**Next:** After review is complete or owner accepts risk, update `64-access-telemetry-production-evidence-ledger.md` to mark E-016 as Complete or Not applicable.
