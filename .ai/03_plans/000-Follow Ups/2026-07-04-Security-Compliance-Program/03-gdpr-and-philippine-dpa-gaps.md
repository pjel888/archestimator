# 03 — GDPR and Philippine DPA Gaps

**Source:** Owner analysis Section 2
**Laws referenced:** EU Regulation 2016/679 (GDPR), Republic Act 10173 (Philippine Data Privacy Act of 2012) + IRR
**Codes:** [ROPA], [DSAR], [PROCESSOR], [BREACH], [RETENTION], [PRIVACY-NOTICE]

---

## 3.1 Current state: beta-grade privacy notice

The current privacy notice is **honest and useful for closed beta**:
- Lists data categories (account/workspace/project data, shared-link activity, feedback/support, access logs, security events, error diagnostics, limited analytics)
- Says deletion requests go through support
- Explicitly marked owner-approved but pending counsel review

That is the right **posture**. It is **not** compliance-grade.

## 3.2 What GDPR requires (beyond a privacy page)

GDPR Article 5 principles:
- **Lawfulness, fairness, transparency** — lawful basis for each processing activity; no surprise processing
- **Purpose limitation** — collected for specified, explicit purposes; no silent reuse
- **Data minimization** — limited to what is necessary
- **Accuracy** — kept accurate and up to date
- **Storage limitation** — kept no longer than necessary
- **Integrity and confidentiality** — appropriate security
- **Accountability** — controller must demonstrate compliance

Articles 13/14 (transparency to data subjects) require: identity and contact of controller, DPO/contact where applicable, purposes + legal basis, recipients, third-country transfers + safeguards, retention periods, rights available, right to complain to a supervisory authority.

Article 30 (RoPA — Records of Processing Activities) requires controllers to maintain records with: name/contact of controller, DPO where applicable, purposes of processing, categories of data subjects and personal data, categories of recipients, third-country transfers + safeguards, envisaged erasure timelines, and a general description of technical/organizational security measures.

Reference: [Regulation (EU) 2016/679 (GDPR)](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)

## 3.3 What the Philippine DPA + IRR require

> **Section numbers below corrected 2026-07-04** per direct verification against the primary text at https://privacy.gov.ph/data-privacy-act/. Earlier draft of this doc misnumbered §14 (outsource) as §25 and §34 (extent of liability) as breach notification. Breach notification timing actually comes from **NPC Circular 2016-02** (Security Incident Management), not from the DPA primary text itself. See `08-scorecard-and-improvement-record.md` ADV-001 for the audit finding.

The **Data Privacy Act of 2012 (RA 10173)** and its **Implementing Rules and Regulations** require:

- **Section 11 — General Data Privacy Principles:** transparency, legitimate purpose, proportionality (cited by owner analysis as "transparency/legitimate purpose/proportionality")
- **Section 12 — Criteria for Lawful Processing of Personal Information:** consent, contract, legal obligation, vital interests, national emergency / public order, legitimate interests (the "lawful processing grounds" cited by owner analysis)
- **Section 13 — Sensitive Personal Information and Privileged Information:** stricter rules for sensitive data categories
- **Section 14 — Subcontract of Personal Information (the "outsourcing" rule, NOT §25):** "A personal information controller may subcontract the processing of personal information: Provided, That the personal information controller shall be responsible for ensuring that proper safeguards are in place to ensure the confidentiality of the personal information processed, prevent its use for unauthorized purposes, and generally, comply with the requirements of this Act and other laws for processing of personal information."
- **Section 16 — Rights of the Data Subject:** be informed, access (with 8 sub-rights including contents, sources, recipients, manner of processing, automated decisions, last-accessed date), dispute inaccuracy and correct, suspend/withdraw/block/remove/destroy, indemnification
- **Section 17 — Transmissibility of Rights** (to heirs/assignees)
- **Section 18 — Right to Data Portability** (machine-readable electronic format)
- **Section 20 — Security of Personal Information:** reasonable organizational, physical, technical safeguards
- **Section 21 — Principle of Accountability for Transfer** of personal information
- **Breach notification (NOT in primary DPA text — comes from IRR + NPC Circular):** notification to NPC and affected data subjects within 72 hours where there is a reasonable belief of reportable breach, per **NPC Circular 2016-02** (Security Incident Management) and supporting NPC advisories. The IRR operationalizes this; the DPA primary text defines penalties (§§25-33) for non-compliance but does not itself specify the 72-hour timeline.

> **Note on section-numbering conventions:** the DPA uses §1-45; the IRR uses its own section numbers that mirror the DPA but are a separate document. When citing breach notification, always cite the IRR section AND the NPC Circular that operationalizes the timing.

References (verified 2026-07-04):
- [Republic Act 10173 — Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/) — primary text, sections 1-45
- [IRR of the Data Privacy Act of 2012](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/) — operationalizes the DPA
- [NPC Advisories & Circulars](https://privacy.gov.ph/pips-and-pics/advisories-circulars/) — including NPC Circular 2016-02 (Security Incident Management) which specifies the 72-hour breach notification rule
- [NPC Data Breach Notification and Management System](https://dbnms.privacy.gov.ph/) — official submission portal

### 3.3.1 NPC circulars applicable to Archestimator

- **NPC Circular 2016-02** — Security Incident Management: defines breach notification rule (72 hours), breach classification (low/medium/high), and reporting template
- **NPC Circular 2022-04** — Registration of Data Processing Systems: requires PICs (Personal Information Controllers) and PIPs (Personal Information Processors) to register processing systems with NPC
- **NPC Advisory 2017-01** — Guidance on data subject rights exercise
- **Five Pillars of Data Privacy Compliance** (NPC): Commit to Comply, Appoint a Data Protection Officer, Conduct Privacy Risk Assessment, Create Privacy Manual, Implement Security Measures

Archestimator is a PIC for workspace owners and a PIP for shared-link recipients. Both capacities trigger NPC registration (when scale thresholds are met).

## 3.4 Missing compliance artifacts

### 3.4.1 [ROPA] Data map / Records of Processing Activities

**Target state:** A living document capturing, for each processing activity:

| Field | Example for Archestimator |
|---|---|
| Activity name | "Cost estimate creation and storage" |
| Purpose | "Provision of estimating service to workspace members" |
| Legal basis (GDPR) | Contract (for authenticated users); legitimate interests (for security/logging) |
| Lawful processing ground (DPA) | Contract / legitimate business purpose |
| Data categories | Account identity, workspace identity, project metadata, estimate tree (cost items, quantities, notes), component library references |
| Data subjects | Authenticated users (architects, estimators, etc.); shared-link recipients (limited) |
| Recipients | Workspace members; Cloudflare (processor); email provider (processor, for transactional email); analytics provider (processor) |
| Third-country transfers | Cloudflare (global edge); Google (Ireland/US for OAuth); email provider (TBD) |
| Retention | Per `04-data-protection-engineering.md` §4.4 retention schedule |
| Security controls | TLS in transit; D1 + R2 at rest (Cloudflare-managed); app-layer authorization; audit logs |
| Erasure path | DSAR-triggered soft-delete; hard-delete after retention TTL |

**Location of artifact:** `.ai/10_state/compliance/ropa.md` (to be created during P1.2)

**Owner:** Operations + engineering
**Approval:** Counsel review (OPEN-DEC-002 / OPEN-DEC-004)

### 3.4.2 [DSAR] Data Subject Access Request workflow

**Target state:** In-app intake + admin-backed workflow supporting:

| Right (GDPR / DPA) | Operation |
|---|---|
| Access | Export all personal data held about the requester (JSON + human-readable summary) |
| Rectification | Edit account / workspace data; correct audit records (with audit trail) |
| Erasure ("right to be forgotten" / blocking / removal / destruction) | Soft-delete account + workspace data; tombstone references; hard-delete after retention TTL; preserve minimal legal/audit records |
| Restriction | Mark account as restricted (read-only / no new processing) |
| Portability | Machine-readable export of user-authored content (estimates, library items) |
| Objection / withdrawal | Stop specific processing (e.g., analytics, marketing) without losing service |
| Complaint | Track complaints; provide NPC / supervisory authority contact info |

**Workflow:**
1. Requester submits via in-app form or `privacy@archestimator.com`
2. Request logged in privacy request register (P0.5)
3. Identity verification (email loop or session)
4. Triage: which data, which right, which deadline (GDPR: 1 month; DPA: reasonable time)
5. Execution (automated where possible; manual review for legal-hold cases)
6. Audit trail: who, what, when, evidence

**Owner:** Operations + engineering

### 3.4.2a [DPIA] DPIA threshold criteria (GDPR Article 35) — added 2026-07-04

A **Data Protection Impact Assessment** is **required** when any of these apply:
- **Systematic and extensive evaluation** of personal aspects based on automated processing (including profiling) on which decisions producing significant effects are based
- **Large-scale** processing of sensitive data (special categories under Art. 9 — health, biometrics, etc.) OR of data relating to criminal convictions
- **Systematic monitoring** of publicly accessible areas on a large scale

The Article 35(3) examples include the Archestimator-relevant case of large-scale processing of personal data.

For Archestimator specifically:
- Closed beta: **DPIA not strictly required** — no automated profiling with significant effects, no large-scale sensitive-data processing, no systematic monitoring of public spaces.
- Public beta + paid launch: **DPIA recommended** if analytics scale crosses NPC/GDPR thresholds (likely covered by the RoPA exercise P1.2).
- If AI features are activated (deferred): **DPIA required** — large-scale automated processing of user content.

A **List Processing Operations Requiring DPIA** may be published by the relevant supervisory authority (NPC for Philippines; lead EU authority if Archestimator markets to EU users). Check NPC + lead-authority lists during P1.3.

### 3.4.3 [PROCESSOR] Processor / sub-processor contracts

**Target state:** A processor register with:

| Processor | Role | Geography | DPA status | Transfer basis |
|---|---|---|---|---|
| Cloudflare (Workers, D1, R2, DO, Queues, Email, Images, Observability) | Infrastructure processor | Global edge (per Cloudflare region selection) | Cloudflare standard DPA | SCCs / adequacy |
| Google (OAuth identity provider) | Identity processor | Ireland / US (per Google workspace config) | Google DPA | SCCs / adequacy |
| [Email provider] | Transactional email processor | TBD | TBD | TBD |
| [Analytics / diagnostics provider] | Analytics processor | TBD | TBD | TBD |
| [Future AI provider] | AI inference processor | TBD | TBD | TBD |

**Publication:** Processor list published on Privacy page once counsel sign-off received (`OPEN-DEC-003`)

**Verified 2026-07-04** (Cloudflare DPA scope, per https://www.cloudflare.com/trust-hub/gdpr/):
- Cloudflare standard DPA covers **Core Application Layer Services** (the FAQ does not list product-by-product exclusions; the DPA covers the product family Archestimator uses). URL: https://www.cloudflare.com/cloudflare-customer-dpa/
- Sub-processor list: https://www.cloudflare.com/gdpr/subprocessors/
- **Cross-border transfer mechanisms** Cloudflare relies on (Archestimator inherits these):
  - EU Standard Contractual Clauses (SCCs) — Commission Implementing Decision (EU) 2021/914 (current SCC version)
  - EU-U.S. Data Privacy Framework (DPF) — Cloudflare is certified
  - Swiss-U.S. DPF + UK Extension to EU-U.S. DPF
- **Future consideration (not P0/P1):** Cloudflare Data Localization Suite (Regional Services + Metadata Boundary + Geo Key Manager) — Archestimator could use this to keep EU user metadata in the EU. Not required for closed-beta; relevant if EU enterprise customers request data residency.

**GDPR Article 28:** Controller must use only processors providing sufficient guarantees, bound by written DPA.
**DPA Section 14 (Subcontract — corrected 2026-07-04):** Controller may subcontract processing but remains responsible for safeguards, confidentiality, and compliance. (Previously mis-cited as "IRR §25" — §25 in the DPA is actually the penalty for Unauthorized Processing.)

**Owner:** Operations + counsel

### 3.4.4 [BREACH] Breach-response runbook

> **Corrected 2026-07-04:** Earlier draft cited "IRR §34 (notification within 72 hours)". The DPA primary text §34 is actually "Extent of Liability"; the 72-hour rule comes from **NPC Circular 2016-02 (Security Incident Management)** and the IRR's operationalization of Sections 20-21 (security + accountability). See ADV-001 in `08-scorecard-and-improvement-record.md`.

**Target state:** A runbook covering:

| Stage | Action |
|---|---|
| Detection | Alert triggered by monitoring, log review, or external report |
| Triage | Severity classification; activate incident team |
| Containment | Stop ongoing leakage (revoke tokens, block IPs, isolate resources) |
| Assessment | Determine scope: what data, how many data subjects, what jurisdictions |
| Notification — internal | Owner (Philip) within 24 hours of triage |
| Notification — Philippine NPC | Within 72 hours where there is reasonable belief a reportable breach occurred (IRR) |
| Notification — EU supervisory authority | Within 72 hours of controller becoming aware, where the breach is likely to result in risk to data subjects (GDPR Art. 33) |
| Notification — affected data subjects | Without undue delay where high risk (GDPR Art. 34); IRR also requires notification within 72 hours for reportable breaches |
| Resolution | Restore from backup; patch root cause; post-incident review |
| Audit trail | All decisions and notifications logged |

**Location of artifact:** `.ai/11_skills/security/breach-response-runbook.md` (to be created during P1.5)
**Owner:** Operations + counsel
**Approval:** Counsel sign-off on notification thresholds (`OPEN-DEC-005`)

### 3.4.5 [RETENTION] Retention schedules

See `04-data-protection-engineering.md` §4.4. The current Privacy page's "subject to review" wording for retention must be replaced with concrete per-class TTLs before P1 launch.

## 3.5 Privacy notice upgrade (P1.1)

**Target state:** A full privacy notice including:

- Controller identity (legal entity — pending `OPEN-DEC-002`)
- DPO / privacy contact
- Legal bases for each processing activity
- Recipients / processors (cross-reference processor register)
- Transfer locations + safeguards
- Retention table (cross-reference retention schedule)
- Data-subject rights process (cross-reference DSAR workflow)
- Breach process summary (cross-reference runbook, but don't expose operational detail)
- Analytics and cookie controls
- Data deletion / export procedure

**Location:** `src/app/privacy/page.tsx` content (with Markdown source under `src/content/privacy/` if a CMS-style pattern is desired).
**Approval:** Counsel sign-off (`OPEN-DEC-002`) before public-visible changes.

## 3.6 What Archestimator must NOT claim until P1 is complete

- "GDPR compliant"
- "Philippine DPA compliant"
- "SOC 2 certified" / "ISO 27001 certified"
- "OWASP certified"
- Any specific processor's name as a "trusted processor" without a signed DPA on file

The public-facing language during P0 is **"closed-beta security baseline with privacy/compliance work in progress."**
