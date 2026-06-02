# 48 — Philippine Data Privacy Act / NPC Compliance Plan

**Date:** 2026-06-02
**Status:** Planning recommendation, subject to final owner/legal review
**Purpose:** Document Data Privacy Act (Republic Act No. 10173) and National Privacy Commission (NPC) compliance basis for PR 7 access telemetry. This is a planning document — it does not constitute legal advice or external counsel review.

---

## 1. Compliance Basis

### Applicable Law

The **Data Privacy Act of 2012 (Republic Act No. 10173)** and its Implementing Rules and Regulations (IRR) apply to the processing of personal information by natural and juridical persons involved in personal information processing. Archestimator, operating as a SaaS platform potentially processing data of Philippine citizens and residents, should plan for DPA compliance.

**Key principles (DPA §11):**
- **Transparency:** Data subjects must be informed about the nature, purpose, and extent of processing.
- **Legitimate purpose:** Processing must be compatible with declared, specified, and legitimate purposes.
- **Proportionality:** Processing must be adequate, relevant, and not excessive in relation to the purposes.

### NPC Guidance Referenced

- [National Privacy Commission — Republic Act No. 10173](https://privacy.gov.ph/data-privacy-act/)
- [NPC Implementing Rules and Regulations](https://privacy.gov.ph/implementing-rules-and-regulations/)
- [NPC PIC/PIP Compliance FAQs](https://privacy.gov.ph/pips-and-pics/faqs/)
- NPC Circular No. 16-01 (Registration)
- NPC Circular No. 17-01 (Data Sharing Agreements)
- NPC Advisory No. 2017-01 (Designation of Data Protection Officer)
- NPC Circular No. 2022-01 (Security of Personal Data — updated guidelines)

### Scope of DPA Applicability

The DPA applies to processing of personal information when:
- The personal information controller (PIC) or processor (PIP) is located in the Philippines
- The PIC/PIP uses equipment located in the Philippines
- The data subject is a Philippine citizen or resident (extraterritorial scope per DPA §6)

Archestimator may fall under DPA scope if it processes personal information of Philippine-based users. The conservative approach — adopted in this plan — is to assume DPA applicability and implement privacy-safe defaults.

---

## 2. Personal Data Inventory for Access Telemetry

| Data Element | Stored? | Purpose | Owner Visibility | Retention | Notes |
|-------------|---------|---------|-----------------|-----------|-------|
| Raw IP address | ❌ No | Not stored | N/A | N/A | Never persist raw IP. Hash only in memory. |
| IP hash (SHA-256) | ✅ Yes | Security audit, fraud prevention, abuse detection | Support/admin only (never in normal owner UI) | 90 days | Pseudonymized. Treated as potential personal data. |
| Raw user-agent string | ❌ No | Not stored | N/A | N/A | Parse and discard raw string. |
| User-agent hash (SHA-256) | ✅ Yes | Debug correlation, bot detection audit | Support/admin only | 90 days | Pseudonymized. |
| Parsed device type | ✅ Yes | Owner activity context | **Owner audit details only** | 90 days | desktop / mobile / tablet / bot / unknown |
| Parsed browser family | ✅ Yes | Owner activity context | **Owner audit details only** | 90 days | Chrome / Safari / Firefox / Edge / unknown |
| Parsed OS family | ✅ Yes | Owner activity context | **Owner audit details only** | 90 days | macOS / Windows / iOS / Android / unknown |
| Country (provider header) | ✅ Yes | Owner activity context | **Owner audit details only** | 90 days | From Vercel/Cloudflare. Fallback: "Location unavailable." |
| Region / city | ❌ No | Not stored in V1.1 | N/A | N/A | Deferred. Requires separate legal review. |
| GPS coordinates | ❌ No | Never collected | N/A | N/A | Never requested or stored. |
| Exact browser version | ❌ No | Not stored | N/A | N/A | Not parsed from UA. |
| Exact OS version | ❌ No | Not stored | N/A | N/A | Not parsed from UA. |
| Screen size | ❌ No | Not collected | N/A | N/A | — |
| Fonts list | ❌ No | Not collected | N/A | N/A | — |
| Fingerprinting data | ❌ No | Not collected | N/A | N/A | — |
| Referrer URL | ❌ No | Not collected | N/A | N/A | — |
| Password value | ❌ No | Never stored | N/A | N/A | Password verified via bcrypt hash; raw value never persisted. |
| Password success/failure | ✅ Yes | Security audit, abuse detection | **Owner audit details** (boolean only) | 90 days | Boolean status only. Not the password itself. |
| Timestamp | ✅ Yes | Activity timeline ordering | Primary timeline | 90 days | Standard access log data. |
| Access stage | ✅ Yes | Activity categorization | Primary timeline | 90 days | e.g. page_visited, password_gate_viewed, proposal_viewed. |
| Recipient known / anonymous | ✅ Yes | Owner activity context | Primary timeline | 90 days | Based on session cookie, not PII derivation. |
| Bot flag | ✅ Yes | Noise filtering | Support/admin only (hidden from normal feed) | 90 days | UA parsing + Sec-Purpose header check. |

---

## 3. Lawful Basis for Processing

### Recommended Basis

**Legitimate interest** (DPA §12(f)) and/or **contract-related necessity** for:

1. **Project collaboration:** Owners need to know whether shared proposals have been viewed, when, and by whom (recipient-identified or anonymous). This is a core feature of the shared-link product.

2. **Security and audit trail:** Access logging enables fraud detection (e.g., unauthorized access attempts), abuse prevention (e.g., brute-force password attacks), and incident investigation.

3. **Service improvement:** Aggregate, anonymized access patterns inform product decisions without exposing individual visitor data.

4. **Shared proposal activity visibility:** The primary product purpose — enabling project owners to see client engagement — is a legitimate interest inherent in the shared-link feature.

**Caveat:** If an external legal counsel review recommends explicit consent/notice instead of legitimate interest, the in-product disclosure (see §4) and privacy policy must be updated before production enablement. The current plan uses legitimate interest as the planning basis with conservative privacy safeguards as a compensating control.

### Proportionality Analysis

| Question | Answer |
|----------|--------|
| Is the processing adequate? | ✅ Yes — minimal data for stated purpose |
| Is the processing relevant? | ✅ Yes — directly supports owner activity visibility and security |
| Is the processing excessive? | ❌ No — raw IP, GPS, fingerprinting, and full UA explicitly excluded |
| Could a less intrusive method achieve the same purpose? | ✅ The current V1.1 plan already minimizes data: no raw IP, no city, no GPS, no fingerprinting, hashed identifiers, support-only access to sensitive fields |

---

## 4. Privacy Notice / Disclosure

### Privacy Policy Language

The following language should be added to the Archestimator privacy policy before access telemetry goes live:

> When a shared project link is opened, Archestimator records limited access activity such as the time the link was opened, whether the proposal was viewed, whether a password attempt succeeded or failed, device type/browser family, and country-level location when available from trusted network headers. This helps project owners understand client activity and protects shared links from abuse. Archestimator does not store raw IP addresses, raw user-agent strings, exact GPS location, password values, browser fingerprinting data, or referrer URLs. Access telemetry data is retained for 90 days.

### In-Product Disclosure

The following disclosure must be displayed on the shared page and password gate before access telemetry is enabled in production:

**Full disclosure (shared page and password gate):**
> Visits to this shared page are logged. The project owner can see when the link was opened and whether the proposal was viewed. We do not store raw IP addresses, exact GPS location, or password values.

**Short footer (if space-constrained):**
> Visits are logged for project security and activity history.

**Disclosure placement:**
- Password gate (visible before gate interaction)
- Shared proposal page footer or sidebar
- Near comments/decision form if space allows

### Data Subject Rights

Under DPA §16, data subjects have rights to:
- **Be informed** — satisfied by in-product disclosure and privacy policy
- **Object to processing** — satisfied by legitimate interest with opt-out mechanism (link owner can disable publication)
- **Access** — data subjects may request their access telemetry records
- **Correction** — data subjects may request correction of inaccurate data
- **Erasure or blocking** — data subjects may request deletion per retention policy
- **Damages** — data subjects may claim damages for unlawful processing

**Implementation note:** A data subject request (DSR) process should be documented before production launch. At minimum: an email contact (privacy@archestimator.com or equivalent), a response SLA (30 days), and an internal procedure for locating and deleting a subject's access telemetry records.

---

## 5. Security Measures

### Organizational Measures
- Access telemetry data visible only to authenticated project owners (via RLS or app-level authorization)
- IP hash and user-agent hash restricted to support/admin views only
- Bot events hidden from normal owner feed
- Staff access to production telemetry data logged and audited

### Physical Measures
- Supabase/PostgreSQL hosted infrastructure with SOC 2 compliance
- Vercel platform security (DDoS protection, WAF, edge network)

### Technical Measures
- **No raw IP:** IP address hashed (SHA-256) in memory; raw value never persisted
- **No raw UA:** User-agent parsed in memory; raw string discarded; hash stored separately
- **No GPS:** Never requested from browser or derived from IP
- **Country only:** Derived from trusted provider headers (Vercel, Cloudflare) only — no third-party geolocation API calls
- **No fingerprinting:** No screen size, fonts, WebGL, canvas, or other fingerprinting techniques
- **Pseudonymized identifiers:** SHA-256 hashing of IP and UA for audit correlation
- **Access controls:** RLS on telemetry tables; owner-only visibility for normal activity data; support-role gating for hashed identifiers
- **No client-visible visitor data:** Clients/recipients cannot see other visitors' activity
- **Bot filtering:** UA parsing + `Sec-Purpose: prefetch` detection; bot events recorded but hidden from owner
- **Retention enforcement:** 90-day automated or operator-run cleanup
- **Write failure logging:** Telemetry write failures logged for observability but do not expose data

---

## 6. NPC / NPCRS Registration Triage

### NPC Registration Requirement

Under NPC Circular No. 2022-04 (amending registration requirements), NPCRS registration is mandatory for PICs/PIPs when **any** of the following apply:

1. Employing **250 or more persons**
2. Processing **sensitive personal information of 1,000 or more individuals**
3. Processing **likely to pose a risk to the rights and freedoms of data subjects**
4. Processing personal information for a **government agency or instrumentality**

### Archestimator Triage

| Criterion | Status | Notes |
|-----------|--------|-------|
| 250+ employees | ❓ Unknown | Archestimator is a sole proprietorship/small team. Employee count should be confirmed. |
| SPI of 1,000+ individuals | ❓ To evaluate | Access telemetry does NOT collect sensitive personal information (no health, religion, political affiliation, etc.). Confirm whether any other Archestimator data flows collect SPI. |
| Processing likely to pose risk | ⚠️ Possible | Access telemetry involves pseudonymized identifiers (IP hash). NPC may consider this "processing likely to pose risk." Conservative assumption: YES. |
| Government agency/instrumentality | ❌ No | Archestimator is a private SaaS platform. |

### Registration Decision

**Planning recommendation, subject to final owner/legal review:**

> Archestimator should complete a formal NPCRS / DPO registration triage before public launch of access telemetry. The conservative assumption is that registration may apply under criterion 3 (processing likely to pose risk). If registration is not mandatory and voluntary registration is not elected, a sworn declaration/undertaking of exemption may be required depending on NPC rules.

### NPCRS / DPO Readiness Checklist

- [ ] Identify legal entity type: sole proprietor / corporation / partnership / other
- [ ] Designate a Data Protection Officer (DPO) or interim privacy officer
- [ ] Determine whether Archestimator is PIC, PIP, or both for each data flow:
  - [ ] Archestimator app (project data, estimate data, user profiles)
  - [ ] Shared-link system (publication snapshots, recipient data)
  - [ ] Activity history (estimate events, shared-link events)
  - [ ] Comments/decisions
  - [ ] Access telemetry (PR 7)
- [ ] Inventory all Data Processing Systems (DPS):
  - [ ] Supabase/PostgreSQL (primary database)
  - [ ] Vercel (hosting, edge functions, headers)
  - [ ] Resend (transactional email)
  - [ ] Supabase Auth (user authentication)
- [ ] Determine whether mandatory NPCRS registration applies
- [ ] If mandatory: prepare NPCRS registration submission
- [ ] If not mandatory and not voluntarily registering: prepare sworn declaration/undertaking if required by NPC
- [ ] Prepare or update privacy notice (see §4)
- [ ] Document data subject request (DSR) process
- [ ] Document breach notification protocol
- [ ] Prepare processor/vendor list with data processing agreements:
  - [ ] Supabase (database, auth)
  - [ ] Vercel (hosting, edge)
  - [ ] Resend (email)
- [ ] Document retention plan and deletion procedures
- [ ] Conduct privacy impact assessment (PIA) for access telemetry

---

## 7. Data Processor / Vendor Compliance

| Processor | Service | Data Processed | DPA/SCC Status |
|-----------|---------|---------------|----------------|
| Supabase | PostgreSQL database, Auth | All user data, access telemetry records, hashed IP/UA | Supabase SOC 2; DPA available |
| Vercel | Hosting, edge functions | HTTP headers (country, IP), server-side telemetry recording | Vercel SOC 2; DPA available |
| Resend | Transactional email | Recipient email addresses, invite tokens | Resend SOC 2; DPA available |

**Note:** No third-party analytics, tracking pixels, or external IP geolocation services are used for access telemetry.

---

## 8. Breach Notification Protocol

Under DPA §20 and NPC Circular No. 16-03, personal data breaches must be notified to the NPC and affected data subjects within 72 hours.

### Archestimator Breach Protocol (Planning)

1. **Detection:** Automated monitoring for unusual access patterns, unauthorized data exports, or database anomalies.
2. **Containment:** Isolate affected systems; revoke compromised credentials; suspend affected publication links.
3. **Assessment:** Determine scope of breach — what data was exposed, how many data subjects affected.
4. **Notification:**
   - Notify NPC within 72 hours of discovery (if DPA applies)
   - Notify affected data subjects without undue delay
   - Notify affected project owners if their shared-link access data was exposed
5. **Remediation:** Address root cause; update security measures; document lessons learned.

**Implementation note:** A detailed breach response playbook should be documented before production launch.

---

## 9. Retention and Deletion

### Access Telemetry Retention

**Target:** 90 days from event creation.

### Deletion Mechanism (Planning)

- **Automated (preferred):** Scheduled job (pg_cron or external cron) that deletes `project_publication_events` and `shared_link_events` rows where `event_type` indicates access telemetry AND `created_at < NOW() - INTERVAL '90 days'`.
- **Operator-run (fallback):** SQL cleanup script documented in runbook with verification steps.
- **Supabase backup consideration:** Point-in-time recovery (PITR) backups may retain data beyond 90 days. Document this in the privacy notice.

### Estimate Audit History Retention

**Unchanged.** Estimate audit history (`estimate_sheet_events`) is retained for the life of the project/estimate for operational purposes. This is distinct from access telemetry.

---

## 10. Launch Gate for Access Telemetry (PR 7)

Access telemetry implementation (PR 7) is **GO for implementation** under approved conservative privacy constraints, but **production enablement requires**:

- [ ] Privacy notice updated per §4
- [ ] In-product disclosure added to shared page and password gate per §4
- [ ] DPO / NPCRS registration triage completed per §6
- [ ] 90-day retention path documented or implemented per §9
- [ ] Data subject request (DSR) process documented
- [ ] Breach notification protocol documented per §8
- [ ] Processor/vendor DPAs reviewed
- [ ] Tests confirming no raw IP, raw UA, GPS, city, region, password values, or fingerprinting data in telemetry records
- [ ] Owner approval recorded in doc 47
- [ ] No external counsel representation — future counsel review recommended before wide commercial rollout

---

## 11. Summary

| Domain | Status |
|--------|--------|
| Lawful basis | Legitimate interest + contract necessity (planning recommendation) |
| Proportionality | ✅ Adequate, relevant, not excessive |
| Transparency | ✅ In-product disclosure + privacy policy update required before production |
| Security | ✅ No raw IP/UA/GPS/fingerprinting; hashed identifiers; access controls |
| Data subject rights | ✅ DSR process to be documented |
| Retention | ✅ 90-day target |
| Processor compliance | ✅ Supabase, Vercel, Resend SOC 2 |
| NPCRS registration | ❓ Triage required before production launch |
| DPO designation | ❓ Designation required before production launch |
| Breach notification | ✅ Protocol to be documented |
| External counsel | ❌ Not yet represented |

---

## Cross-References

- `29-final-decision-log-and-approval-matrix.md` — Canonical decision log (D-016–D-023)
- `47-pr7-pr8b-approval-record.md` — Approval record with signature blocks
- `26-privacy-retention-and-client-disclosure-plan.md` — Privacy, retention, and client disclosure
- `23-shared-page-access-activity-plan.md` — Access telemetry implementation plan
- `07-security-privacy-readiness.md` — Security and privacy readiness assessment
- `36-access-telemetry-side-effects-audit.md` — Side effects audit and analytics helper
