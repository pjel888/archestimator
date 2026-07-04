# 00 — Executive Summary

**Authorship date:** 2026-07-04 (Asia/Manila)
**Source authority:** Owner-provided security/compliance analysis (4 sections), verified against repo paths by explore agent
**Verification mode:** `same-agent` at authorship; readiness cap applied (see README)

---

## Thesis

Archestimator is **not weak technically**. The repo has serious foundations: protected workshop routing, terms gating, app-layer D1 authorization, prepared D1 access checks, private uploads, MIME/magic validation, no-store/nosniff responses, signed share-link cookies, CSRF on public share mutations, durable public rate limits, CodeQL, pinned GitHub Actions, and Dependabot.

The gap is that the repo is still closer to a **secure closed-beta product** than a product that can safely claim **OWASP / GDPR / Philippine DPA** readiness. The biggest issue is **not more features** — it is:

1. **Compliance evidence** (ASVS control matrix, API Top 10 test matrix, RoPA, retention schedules)
2. **Privacy operations** (DSAR workflow, breach response, processor register)
3. **Public-claim discipline** (Trust page currently overclaims RLS / Postgres / OWASP posture)

## The canonical claim this pack enforces

> **"Closed-beta security baseline with privacy/compliance work in progress."**

Do **not** publicly claim GDPR, Philippine DPA, SOC 2, ISO 27001, or OWASP compliance until the relevant P0/P1/P2 milestones are evidence-backed.

Inaccurate security claims are worse than no claims. The fastest credibility path is:
**(a) correct public claims → (b) build DSAR/retention/process documentation → (c) map existing controls to ASVS + DPA/GDPR evidence.**

## Four-section summary (from owner analysis)

### Section 1 — OWASP/security: good baseline, not yet standards-mapped

Existing controls are strong. What's missing is the **OWASP ASVS control matrix**. ASVS provides a basis for testing application security controls and secure-development requirements, not just a "secure enough" checklist. Archestimator should map to **ASVS 5.0.0 Level 1 now**, then **Level 2 before paid launch**. APIs should be mapped against **OWASP API Security Top 10 (2023)** — especially object-level authorization, broken auth, resource consumption, function-level authorization, misconfiguration, and API inventory.

**Immediate OWASP gaps:**
- **CSP is not mature enough** — still `Report-Only` with `'unsafe-inline'` and `'unsafe-eval'`; nonce-based tightening is deferred in the repo
- **Upload rate limiting is not durable** — in-memory `Map`s for request buckets and active upload quotas do not survive Cloudflare isolate restarts/scaling
- **File scanning is only partially evidenced** — code has scan states + a gate that blocks pending/infected/unsupported/failed attachments, but no concrete antivirus/provider implementation is wired
- **Public Trust claims need correction** — Trust page claims "Row-level security enforced on every table" and "Postgres" rate limiting, but the README says D1 has no Postgres RLS and relies on app-layer authorization

### Section 2 — GDPR / Philippine DPA: privacy page is beta-grade, not compliance-grade

The current privacy notice is honest and useful for beta. It lists data categories, says deletion requests go through support, and is explicitly marked owner-approved but pending counsel review. That is the right **posture**.

But GDPR requires more than a privacy page. It requires lawful, fair, transparent processing; purpose limitation; data minimization; storage limitation; security; and accountability. It also expects clear data-subject rights workflows and controller information. The Philippine Data Privacy Act (RA 10173) and its IRR require transparency, legitimate purpose, proportionality, lawful processing grounds, data-subject rights, reasonable organizational/physical/technical safeguards, breach handling, and accountability for third-party processors.

**Missing compliance artifacts:**
- **Data map / RoPA** — GDPR Article 30; Philippine IRR records of processing systems, data flows, retention/disposal, safeguards, DPO/contact
- **DSAR workflow** — access, rectification, erasure, restriction, portability, objection; Philippine rights to be informed, access, correction, blocking/removal/destruction, damages, portability
- **Processor / sub-processor contracts** — Cloudflare, Google OAuth, email, analytics/diagnostics, future AI providers; DPA register, transfer basis, geographic processing disclosure
- **Breach response runbook** — GDPR 72-hour supervisory authority rule; Philippine IRR notification to NPC + affected data subjects within 72 hours for reportable breaches

### Section 3 — Data protection engineering: strongest missing area is lifecycle control

Estimate/project data, uploads, shared links, comments, decisions, analytics, account events, and audit logs make **retention and deletion as important as encryption**.

**Two concrete repo issues:**
- **Telemetry hashing is inconsistent** — Publication telemetry correctly uses HMAC with a server-side pepper (and documents why bare SHA-256 of IP/user-agent is reversible). But **account audit events still hash IP/user-agent with plain SHA-256**. Migrate account audit hashing to the same keyed HMAC model; treat existing hashes as pseudonymous personal data.
- **Logging / observability needs privacy governance** — Cloudflare observability logs and traces are enabled with persistence. Operationally useful; compliance-wise requires retention periods, redaction rules, access controls, incident review, and deletion/anonymization boundaries.

**Retention schedules are undefined** for: account data, workspace data, project/estimate records, shared links, upload assets, comments/decisions, legal acceptance records, security events, analytics, backups, queues, logs, and deleted-user remnants. The current privacy page's "subject to review" wording is too vague for GDPR/DPA readiness.

### Section 4 — Recommended compliance roadmap

- **P0 — before broader public beta:** Correct Trust page; add global security headers; enforced CSP plan; central CSRF/origin guard; durable upload/auth rate limits; privacy request register.
- **P1 — before paid launch:** Full privacy notice (controller, DPO/contact, legal bases, processors, transfers, retention, rights, breach, analytics/cookie, deletion/export); internal RoPA; DPIA/LIA; processor DPAs; breach runbook; vulnerability disclosure policy.
- **P2 — before enterprise positioning:** ASVS 5.0.0 Level 2 control matrix; API Top 10 test matrix; quarterly access review; backup/restore evidence; log-retention policy; vendor-risk register; security training evidence; release-security checklist; annual pen test. Do **not** pursue SOC 2 / ISO language until these are routine.

## Non-goals

- Discovering new security vulnerabilities (the 2026-06-01 audit covers code-level findings)
- Implementing the roadmap (this is a planning pack, not an execution pack)
- Legal interpretation of GDPR / DPA thresholds (counsel owns OPEN-DEC-002 through OPEN-DEC-005)

## Status

`CONDITIONALLY READY` — P0 items are scoped and implementable; execution is gated on owner approval for Trust page edits and counsel review for privacy/processor artifacts. Readiness is capped at 94 by `same-agent` verification mode at authorship.
