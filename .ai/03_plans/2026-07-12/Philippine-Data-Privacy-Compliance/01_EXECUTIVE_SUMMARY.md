# Executive Summary

## Core Finding

Archestimator already contains stronger privacy engineering than a typical early-stage SaaS
product: a privacy-request register (`privacy_requests`), HMAC-hashed security metadata,
retention engine with legal-hold awareness, AES-256-GCM/HMAC publication tokens, default-denied
analytics consent, and an admin audit trail (see `04_REPOSITORY_AND_CURRENT_STATE_AUDIT.md`
for exact source evidence). However, technical features alone do not establish compliance.

The critical remaining work is to connect those controls to an approved legal basis, complete
the processing inventory to cover all **85 personal-data stores** (81 D1 tables + 4 Better Auth
runtime tables inventoried in `25_D1_DATA_SYSTEM_INVENTORY.md`), document governance, publish
accurate notices, sign processor contracts, make registration decisions, build the missing
data-subject-rights orchestrator, and produce evidence.

## Primary Compliance Risks

### 1. Unresolved controller and processor roles

Archestimator is a Personal Information Controller for account, authentication, security, support, operational, analytics, and business administration data. It will usually act as a Personal Information Processor for customer-controlled project and client data.

The platform may become an independent or joint controller when it determines new purposes for customer data, including platform-wide analytics, AI training, benchmarking, fraud intelligence, or long-term retention.

### 2. Missing data-subject-rights orchestrator (largest functional gap)

The repository has a privacy-request register and per-system export/erase helpers for support,
activity, and activation data (`src/lib/compliance/privacy-request-repository.ts:224-285`), but
**none are called by any route or admin action**. There is no triage endpoint, no orchestrator,
and no admin UI. Coverage is missing for Better Auth core tables, `profiles`, share/portal
recipients, corporate accounts, AI records, and audit tables. See
`09_DATA_SUBJECT_RIGHTS_OPERATIONS.md`.

### 3. Unapproved and partially-unenforced retention schedule

Retention periods exist in code, but the schedule is a counsel DRAFT (OPEN-DEC-004) and the
engine enforces only 10 of 17 documented classes. Five D1 classes are declared but have no
enforcement rule: `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`,
`operational_incidents`, `operational_incident_events`. See
`10_RETENTION_DELETION_AND_LEGAL_HOLDS.md`.

### 4. Incomplete operational accountability

No codebase can prove DPO appointment, NPC registration assessment, processor agreements, privacy training, incident exercises, or annual compliance review. These require formal records.

### 5. High-risk public and collaborative surfaces

Public share links, password-protected links, client comments, approvals, activity history, invitations, uploads, exports, and admin access all increase disclosure, identity, retention, and access-control risk.

## Release Recommendation

Archestimator should not represent itself as fully compliant until all P0 controls are implemented and evidenced.

### P0 before external beta

- formally identify the PIC legal entity and appoint the DPO;
- complete an NPC registration applicability assessment;
- complete the ROPA and platform PIA;
- close known authentication-token risks;
- publish accurate account, share, invitation, and support privacy notices;
- implement end-to-end data-subject request orchestration;
- approve and execute the retention schedule;
- establish vendor DPAs and transfer records;
- implement and rehearse the breach workflow;
- verify public, share, invitation, upload, export, and admin authorization boundaries.

### P1 before broad commercial release

- self-service privacy center;
- customer DPA and subprocessor list;
- workspace retention configuration;
- deletion propagation and processor confirmation;
- cookie preference controls;
- periodic access review;
- annual privacy review and incident exercise.

### P2 enterprise readiness

- organization privacy administrators;
- audit exports;
- tenant-specific retention and legal holds;
- enterprise security and privacy pack;
- independent penetration testing;
- ISO 27001 or SOC 2 readiness where commercially justified.
