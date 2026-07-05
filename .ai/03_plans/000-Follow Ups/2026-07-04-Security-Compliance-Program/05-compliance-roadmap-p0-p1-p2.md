# 05 — Compliance Roadmap (P0 / P1 / P2)

**Source:** Owner analysis Section 4
**Gating philosophy:** Each phase is gated by a business milestone, not a calendar date.

---

## P0 — before broader public beta

**Theme:** Stop overclaiming. Close the most visible durability gaps. Stand up privacy-ops intake.

| ID | Deliverable | Touchpoints | Owner | Gate | Related |
|---|---|---|---|---|---|
| **P0.1** | **Correct Trust page claims** (remove "RLS on every table" and "Postgres"; keep "no GDPR/DPA/SOC2 yet" stance; align with Vercel-Supabase-Cleanup pack) | `src/app/trust/page.tsx` lines **92, 160, 162** (verified 2026-07-04); also review L142-144 honest-badge language for consistency | Engineering + Philip | `OPEN-DEC-001` sign-off; Trust page diff reviewed line-by-line | `2026-07-04-Vercel-Supabase-Cleanup` |
| **P0.2** | **Global security headers + enforced CSP roadmap** | `src/middleware.ts` (or new middleware helper); CSP nonce infra; remove `unsafe-inline` / `unsafe-eval`; apply globally not just share/workshop/invite. **CSP location pending (ASSUMP-001)** — check `wrangler.jsonc`, `_worker.js`, OpenNext adapter config, `next.config.ts` first. | Engineering | New headers applied to a single pilot route, then expanded; `Content-Security-Policy` (enforced) replaces `Report-Only` after telemetry shows zero false positives | `OPEN-DEC-007` |
| **P0.3** | **Central CSRF / origin guard audit for all cookie-authenticated mutations** | All server actions under `src/lib/*/actions.ts`; all POST routes under `src/app/api/`. Reference model: `src/lib/publication/security.ts:361-409` (assertSameOrigin, assertSameOriginPublicPost, assertSameOriginPublicFormPost) | Engineering | Inventory of mutation surfaces; explicit check / fix per surface | `2026-07-03-Authentication-Audit-And-Improvement` |
| **P0.4** | **Durable upload / auth rate limits** (back in-memory Maps with Cloudflare Rate Limiting / DO / D1) | Upload admission path (file TBD per ASSUMP-001 — likely `src/app/api/component-library/attachments/route.ts` or `src/lib/component-library/`). Honor wrangler.jsonc upload limit vars: `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES=4194304` (4MB), `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000` (30s), `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS=3` | Engineering | Rate limit survives isolate restart (proof: restart Worker, verify bucket persists) | `2026-07-02-API-Rate-Limiting-Security-Consolidation`; ASSUMP-002 (free-tier rate-limit limits) |
| **P0.5** | **Privacy request register** (intake + triage workflow) | New `privacy_requests` table (schema TBD — see ADV-021); admin UI minimal; email intake via Cloudflare Email binding `EMAIL` | Operations + Engineering | In-app intake form exists; email alias routes to register; triage SLA documented | feeds P1.2 RoPA |
| **P0.6** | **Migrate account audit hashing to HMAC pepper** + address RISK-016 (silent error swallowing) | `src/lib/auth/account-audit.ts:3,24-26` (verified 2026-07-04); pepper via Worker secret (`wrangler secret put`). **RISK-016 expansion**: also fix lines 48-51 silent catch — add pepper-presence startup check, opaque `audit_write_failed: true` telemetry, unit test that pepper-absence raises in production. Reference model: `src/lib/publication/security.ts:78-81` (hashPublicationToken using createHmac) | Engineering | New rows use HMAC; test that verifies same IP → different hash under different pepper; pepper-presence check raises in production if absent | `04-data-protection-engineering.md` §4.2 |

**P0 exit criteria:**
- [ ] Trust page live with corrected wording (Philip sign-off recorded)
- [ ] Enforced CSP live globally with 7 days of zero-violation telemetry
- [ ] All mutation surfaces have an explicit CSRF / origin check or are marked "not applicable" with reason
- [ ] Rate-limit durability proven via restart test
- [ ] Privacy request register operational (at least 1 test request processed end-to-end)
- [ ] Account audit events use HMAC; pepper in Worker secret

---

## P1 — before paid launch

**Theme:** Compliance-grade privacy operations. Counsel in the loop.

| ID | Deliverable | Touchpoints | Owner | Gate |
|---|---|---|---|---|
| **P1.1** | **Full privacy notice** (controller identity, DPO/contact, legal bases, processors, transfers, retention table, rights process, breach process, analytics/cookie, deletion/export) | `src/app/privacy/page.tsx` content | Operations + Counsel | `OPEN-DEC-002` sign-off; cross-references RoPA, processor register, DSAR, breach runbook |
| **P1.2** | **Internal RoPA** (GDPR Art. 30 + IRR §25) | `.ai/10_state/compliance/ropa.md` | Operations + Counsel | Counsel review; covers every processing activity in `03-gdpr-and-philippine-dpa-gaps.md` §3.4.1 |
| **P1.3** | **DPIA / LIA** where required (high-risk processing: large-scale analytics, biometrics if added, AI inference if enabled) | `.ai/10_state/compliance/dpia-*.md` | Operations + Counsel | Counsel determines applicability |
| **P1.4** | **Processor / sub-processor DPA register** (Cloudflare, Google, email, analytics, future AI) | `.ai/10_state/compliance/processor-register.md`; published list on Privacy page | Operations + Counsel | `OPEN-DEC-003` sign-off; signed DPAs on file |
| **P1.5** | **Breach-response runbook** (72-hour NPC + EU DPA notification paths) | `.ai/11_skills/security/breach-response-runbook.md`; incident templates | Operations + Counsel | `OPEN-DEC-005` sign-off on thresholds; tabletop exercise completed |
| **P1.6** | **Vulnerability disclosure policy** (`/.well-known/security.txt`; intake alias; CVD policy text) | `public/.well-known/security.txt`; `src/app/security/page.tsx` | Engineering + Operations | Public text live; alias routing tested |
| **P1.7** | **File scanner wiring** (real AV provider; DLQ review path; admin override expiry; scan-result audit trail) | Upload pipeline; Queue DLQ handler; admin override UI | Engineering | EICAR test file blocked end-to-end; DLQ review exercised in test | `OPEN-DEC-006` |
| **P1.8** | **Retention schedules enforced in code** (crontab entries; `data_retention_events` audit table; DSAR soft-delete propagation) | New cron jobs in `wrangler.jsonc`; new migration for `data_retention_events` | Engineering + Operations | `OPEN-DEC-004` retention periods codified; cron runs for 30 days without error |

**P1 exit criteria:**
- [ ] Privacy notice live with all Art. 13/14 required elements
- [ ] RoPA complete and counsel-reviewed
- [ ] DPIA decision documented (performed or not-applicable with reason)
- [ ] Processor register complete; signed DPAs on file
- [ ] Breach runbook tested via tabletop exercise
- [ ] Vulnerability disclosure policy live
- [ ] File scanner blocks EICAR end-to-end
- [ ] Retention cron jobs operational for 30 days without error
- [ ] Public Trust / Privacy pages updated to reflect completed artifacts

---

## P2 — before enterprise positioning

**Theme:** Standards mapping + cadence. Build the artifacts that enterprises ask for in vendor review questionnaires.

| ID | Deliverable | Touchpoints | Owner | Gate |
|---|---|---|---|---|
| **P2.1** | **ASVS 5.0.0 Level 2 control matrix** (every V1–V14 chapter mapped to evidence) | `.ai/10_state/compliance/asvs-matrix.md`; cross-references 06-01 audit | Engineering + Security | All Level 1 controls verified; Level 2 verified for auth, publication, uploads |
| **P2.2** | **OWASP API Top 10 (2023) test matrix** | `.ai/10_state/compliance/api-top10-matrix.md` | Engineering + Security | Every category mapped to test evidence (denial test for BOLA on every `/api/[resource]/[id]` route) |
| **P2.3** | **Quarterly access review cadence** | `.ai/11_skills/security/access-review.md` | Operations | First review completed |
| **P2.4** | **Backup / restore evidence** (operationalize `cf:d1-restore-rehearsal`; quarterly rehearsal) | Cron + runbook | Engineering | One successful restore rehearsal logged |
| **P2.5** | **Log-retention policy enforcement** | Cloudflare Logpush config; redaction rules | Engineering + Operations | 30/90-day TTLs enforced; access review completed |
| **P2.6** | **Vendor-risk register** | `.ai/10_state/compliance/vendor-risk-register.md` | Operations | Every processor has a risk entry |
| **P2.7** | **Security training evidence** | `.ai/10_state/compliance/training-records.md` | Operations | Annual training completed + recorded |
| **P2.8** | **Release-security checklist** | `.ai/11_skills/security/release-checklist.md` | Engineering | Used on every release for 90 days |
| **P2.9** | **Annual penetration test** | External report; `.ai/02_audits/` | Engineering + owner | First pen test report on file |

**P2 exit criteria:**
- [ ] ASVS matrix complete
- [ ] API Top 10 matrix complete
- [ ] Quarterly access review cadence established
- [ ] Restore rehearsal operationalized
- [ ] Log-retention enforced
- [ ] Vendor register live
- [ ] Training records current
- [ ] Release-security checklist in active use
- [ ] First pen test scheduled or completed

**Explicit non-goal for P2:** Do NOT pursue SOC 2 / ISO 27001 language or certification until these artifacts are routine (≥ 2 cycles), not one-off.

---

## Cross-phase dependency rules

- **P0.1 (Trust page) ships FIRST** — before any other P0 work. Reason: inaccurate claims are independent of code state; they can be corrected while code work proceeds.
- **P0.5 (Privacy request register) feeds P1.2 (RoPA)** — intake data populates RoPA evidence.
- **P0.6 (HMAC migration) feeds P1.8 (retention)** — retention TTL for old SHA-256 rows only starts ticking once we acknowledge they are pseudonymous personal data.
- **P1.2 (RoPA) blocks P1.1 (Privacy notice)** — Privacy notice can't promise specific retention periods until RoPA defines them.
- **P1.4 (Processor register) blocks P1.1 (Privacy notice)** — Privacy notice must list processors; can't list what isn't on file.
- **P2.1 (ASVS matrix) depends on P0+P1 complete** — ASVS evidence includes privacy / retention / processor artifacts.
