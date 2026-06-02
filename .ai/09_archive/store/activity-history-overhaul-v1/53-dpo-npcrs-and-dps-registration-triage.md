# 53 — DPO, NPCRS, and DPS Registration Triage

**Date:** 2026-06-02
**Purpose:** Operational triage worksheet for Data Protection Officer (DPO) designation, National Privacy Commission Registration System (NPCRS) registration, and Data Processing Systems (DPS) inventory.
**Status:** Ready to execute — operational actions pending. Planning recommendation, subject to owner/legal confirmation.

---

## 1. Entity Identity Worksheet

| Question | Answer | Status |
|----------|--------|--------|
| Legal entity name | ⬜ To be completed | ⬜ |
| Legal entity type | ⬜ Sole proprietor / Corporation / Partnership / Other | ⬜ |
| Philippine SEC/DTI registration number | ⬜ To be completed | ⬜ |
| Primary business address (Philippines) | ⬜ To be completed | ⬜ |
| Number of employees | ⬜ To be confirmed | ⬜ |
| Website / app URL | archestimator.com (or current domain) | ⬜ Confirm domain |
| Contact email for privacy matters | ⬜ e.g., privacy@archestimator.com | ⬜ |

---

## 2. DPO / Privacy Officer Designation

### Designation Form

```
Name of DPO / Privacy Officer: ______________________________
Title / Role: ______________________________
Contact email: ______________________________
Contact phone: ______________________________
Date of designation: ______________________________
Designation document: ______________________________ (attach)
```

### Guidance

- Under NPC Advisory No. 2017-01, PICs and PIPs are encouraged to designate a Data Protection Officer.
- For sole proprietorships or small entities, the owner may serve as the DPO / privacy officer.
- The DPO is responsible for compliance with the Data Privacy Act, its IRR, and NPC issuances.
- The DPO should have knowledge of data privacy and information security (or be willing to acquire it).

### Status

```
⬜ Not designated
⬜ Designated — owner acting as DPO for planning purposes
⬜ Formally designated with documented scope
```

---

## 3. PIC / PIP Role Analysis

### Data Flow Analysis

Under DPA, Archestimator may act as a Personal Information Controller (PIC) and/or Personal Information Processor (PIP) for different data flows.

| Data Flow | Role | Personal Information? | Basis |
|-----------|------|----------------------|-------|
| User account data (profiles, auth) | PIC | Yes — email, name | Archestimator determines purposes and means |
| Estimate/project data | PIC | Yes — business data tied to user | Archestimator determines purposes and means |
| Shared-link publication data | PIC | Yes — project owner content | Archestimator determines purposes and means |
| Access telemetry data | PIC | Potentially — hashed IP, device metadata | Archestimator determines purposes and means |
| Email delivery (via Resend) | PIP (Resend) | Yes — recipient emails | Resend processes on Archestimator's instructions |
| Database hosting (via Supabase) | PIP (Supabase) | Yes — all stored data | Supabase processes on Archestimator's instructions |
| Hosting/edge (via Vercel) | PIP (Vercel) | Yes — request headers, logs | Vercel processes on Archestimator's instructions |

### Status

```
⬜ PIC/PIP analysis not started
⬜ Drafted (this document)
⬜ Reviewed by DPO / privacy officer
⬜ Confirmed by external counsel
```

---

## 4. NPCRS Registration Triage

### Mandatory Registration Criteria (per NPC Circular No. 2022-04)

Under NPC Circular No. 2022-04, NPCRS registration is **mandatory** for PICs/PIPs when **any** of:

| # | Criterion | Applies? | Evidence / Notes |
|---|-----------|----------|------------------|
| 1 | Employs **250 or more persons** | ⬜ TBD | Archestimator is a sole proprietorship / small team. Confirm employee count. |
| 2 | Processes **sensitive personal information of 1,000+ individuals** | ⬜ TBD | Access telemetry does NOT collect sensitive personal information (health, religion, political affiliation, etc.). Confirm whether any other data flows collect SPI. |
| 3 | Processing **likely to pose a risk to rights and freedoms** | ⚠️ Possible | NPC may consider pseudonymized identifiers (IP hash) and access tracking as "processing likely to pose risk." Conservative assumption: YES, registration may apply. |
| 4 | Processes personal information for a **government agency** | ❌ No | Archestimator is a private SaaS platform. |

### Registration Decision Tree

```
1. Do any mandatory criteria apply?
   ├── YES → Complete NPCRS registration
   └── NO or UNCERTAIN → Continue to step 2

2. Is voluntary registration desired?
   ├── YES → Complete voluntary NPCRS registration
   └── NO → Continue to step 3

3. Is a sworn declaration/undertaking of exemption required?
   ├── YES → Prepare declaration
   └── NO → Document triage rationale; re-evaluate periodically
```

### Triage Outcome

```
⬜ Not started
⬜ In progress
⬜ Complete — registration required (mandatory under criterion ___)
⬜ Complete — registration not required (rationale: ________________)
⬜ Complete — voluntary registration chosen
```

---

## 5. Data Processing Systems (DPS) Inventory

| # | System | Provider | Purpose | Data Categories | Location | DPA/SOC2 |
|---|--------|----------|---------|----------------|----------|----------|
| 1 | PostgreSQL Database | Supabase | Primary data store | User accounts, projects, estimates, publications, activity events, access telemetry | Supabase region | SOC 2; DPA available |
| 2 | Authentication | Supabase Auth | User authentication | Email, OAuth tokens, session data | Supabase | SOC 2 |
| 3 | Hosting / Edge | Vercel | Application hosting, edge functions | Request headers (IP, country, UA), server-side telemetry | Vercel edge network | SOC 2; DPA available |
| 4 | Transactional Email | Resend | Email delivery (invites, notifications) | Recipient email addresses, invite tokens | Resend | SOC 2; DPA available |
| 5 | File Storage | Supabase Storage | Component images, attachments | Uploaded files | Supabase | SOC 2 |

### Additional Systems (if applicable)

| # | System | Provider | Purpose | Status |
|---|--------|----------|---------|--------|
| 6 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | ⬜ | ⬜ | ⬜ | ⬜ |

---

## 6. Processor / Vendor Due Diligence

| Processor | DPA Reviewed? | Data Processing Agreement (DPA)? | Cross-Border Transfer? | SCCs in Place? |
|-----------|--------------|-------------------------------|----------------------|----------------|
| Supabase | ⬜ | ⬜ | ⬜ Confirm region | ⬜ |
| Vercel | ⬜ | ⬜ | ⬜ Edge network | ⬜ |
| Resend | ⬜ | ⬜ | ⬜ Confirm region | ⬜ |

**Note:** All three vendors (Supabase, Vercel, Resend) publicly offer DPAs and have SOC 2 compliance. Formal review of each DPA is recommended before production enablement.

---

## 7. Privacy Impact Assessment (PIA)

A PIA is recommended per NPC guidance for processing that may pose risk to data subjects. Key topics:

| PIA Section | Status |
|-------------|--------|
| Description of processing (access telemetry) | ✅ Available in docs 23, 47, 48 |
| Purpose and lawful basis | ✅ Doc 48 §3 |
| Data minimization assessment | ✅ Doc 48 §3 (proportionality analysis) |
| Risk assessment | ⬜ Pending |
| Mitigation measures | ✅ Doc 48 §5 (security measures) |
| Stakeholder consultation | ✅ Owner/Product + Internal Privacy (doc 47) |
| Approval and sign-off | ⬜ Pending (awaiting DPO/external counsel if applicable) |

---

## 8. Final Status

### DPO / NPCRS / DPS Readiness

```
DPO designation:          ⬜ Not started / ⬜ In progress / ⬜ Complete
NPCRS registration triage: ⬜ Not started / ⬜ In progress / ⬜ Complete — registration required / ⬜ Complete — registration not required / ⬜ Complete — voluntary
DPS inventory:             ⬜ Not started / ⬜ In progress / ⬜ Complete
Vendor DPA review:         ⬜ Not started / ⬜ In progress / ⬜ Complete
PIA:                       ⬜ Not started / ⬜ In progress / ⬜ Complete
```

---

## Cross-References

- `48-philippines-data-privacy-compliance-plan.md` — Full DPA/NPC compliance plan
- `51-access-telemetry-production-enablement-checklist.md` — Items A7–A9, A12–A13
- `47-pr7-pr8b-approval-record.md` — PR 7 approval record
- `63-vendor-processor-dpa-evidence-worksheet.md` — Vendor/processor DPA evidence worksheet (twelfth pass)
- `64-access-telemetry-production-evidence-ledger.md` — Evidence ledger (E-004, E-005, E-006)
- `65-production-enablement-execution-runbook.md` — Execution runbook (Phase 2: DPO/NPC/DPS)
- `66-production-readiness-final-gate-matrix.md` — Gate matrix (G-04, G-05, G-06)
- `67-final-access-telemetry-production-readiness-scorecard.md` — Final scorecard (Domain B: DPO/NPCRS/DPS triage package 100%)
- `54-data-subject-request-and-breach-response-playbook.md` — DSR and breach playbook
