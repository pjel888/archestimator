# Plan Pack: Security & Compliance Program (OWASP / GDPR / Philippine DPA Readiness)

**Date:** 2026-07-04 (Asia/Manila); improvement audit 2026-07-04
**Plan profile:** Standard (cross-cutting compliance program; not narrow implementation)
**Readiness status:** `CONDITIONALLY READY`
**Verification mode at authorship:** `same-agent` → **upgraded to `emulated`** 2026-07-04 (separate passes by the same lead author; no native independent reviewer was available — both `explore` (bg_f49746a5) and `librarian` (bg_270ab87d) background lanes timed out without producing output, falling back to direct `Read` and direct `webfetch` for verification).
**Status cap:** Per the Multi-Agent Execution Directive, `emulated` caps overall readiness at 97 and caps high-blast-radius package status at `CONDITIONALLY READY` unless a real independent reviewer or explicit owner acceptance reviews the final package. Conditional readiness reflects that P0 fixes are scoped and implementable now, all P0 correctness bugs identified in the audit are fixed, but execution requires legal counsel sign-off on privacy/processor artifacts and owner approval for any public Trust/Privacy page edits.

**Audit artifacts:** See `08-scorecard-and-improvement-record.md` for the full improvement audit (per-doc scores, verified claims matrix, adversarial findings, validation gap disclosure).

---

## What this pack is

A **compliance program plan** that converts the existing secure closed-beta baseline into evidence-backed OWASP / GDPR / Philippine DPA readiness, without overclaiming. The codebase is not weak technically; the gap is **compliance evidence, privacy operations, and public-claim discipline**. This pack captures that gap and the remediation roadmap.

This is **not** a re-do of the technical security audit. The 2026-06-01 audit (see Related Packs) already inventories the code-level security posture. This pack sits **above** that audit: it covers public-claim correction, standards mapping (ASVS, API Top 10), privacy operations (RoPA, DSAR, processors, breach), retention schedules, and the public-beta / paid-launch / enterprise gating roadmap.

## Canonical claim this pack enforces

> **"Closed-beta security baseline with privacy/compliance work in progress."**

Until P0 + P1 are complete, Archestimator must **not** publicly claim GDPR, Philippine DPA, SOC 2, ISO 27001, or OWASP compliance. Inaccurate security claims are worse than no claims.

## Master goal

Convert Archestimator's secure closed-beta baseline into a defensible, evidence-backed OWASP / GDPR / Philippine DPA posture, sequenced as P0 (before broader public beta) → P1 (before paid launch) → P2 (before enterprise positioning), with the fastest credibility path being: **correct public claims → build DSAR/retention/process documentation → map existing controls to ASVS + DPA/GDPR evidence.**

## Scope

In scope:
- Public trust/privacy page claim correction
- Global security-header middleware + enforced CSP plan
- Durable upload/auth rate limiting
- Central CSRF / origin guard coverage audit
- Privacy operations: data map / RoPA, DSAR workflow, processor register, breach-response runbook
- Retention schedules across all data classes
- Telemetry hashing consistency (HMAC vs. plain SHA-256)
- Observability privacy governance
- OWASP ASVS 5.0.0 Level 1 (now) → Level 2 (paid launch) control matrix
- OWASP API Security Top 10 (2023) test matrix
- File-scanning evidence + DLQ + admin override + audit trail
- Vulnerability disclosure policy

Out of scope (explicitly):
- New product features
- SOC 2 / ISO 27001 pursuit (deferred to P2+ after artifacts are routine)
- Paid Cloudflare add-ons (D1 paid plan, R2 paid tier, Smart Placement, Analytics paid, dedicated egress) — requires owner approval
- Provider exit / migration work — covered by `2026-07-04-Vercel-Supabase-Cleanup`
- Authentication code improvements — covered by `2026-07-03-Authentication-Audit-And-Improvement`
- API rate-limit implementation — covered by `2026-07-02-API-Rate-Limiting-Security-Consolidation`
- Auditing the entire codebase for OWASP Top 10 — covered by `2026-06-01-security-owasp-compliance-audit`

## Phase order (execution dependency graph)

```
P0 (before broader public beta)
 ├── P0.1  Correct Trust page claims (RLS, Postgres, OWASP compliance language)      ← owner approval required
 ├── P0.2  Global security headers + enforced CSP roadmap (nonces, remove unsafe-*)  ← implementation after P0.1
 ├── P0.3  Central CSRF / origin guard audit for cookie-authenticated mutations       ← can run parallel to P0.2
 ├── P0.4  Durable upload rate limiting (back in-memory Maps with D1/DO/CF rate limit) ← can run parallel to P0.2/P0.3
 ├── P0.5  Privacy request register (intake + triage workflow)                        ← can run parallel
 └── P0.6  Migrate account audit IP/UA hashing to HMAC pepper                         ← can run parallel

P1 (before paid launch)
 ├── P1.1  Full privacy notice (controller, DPO/contact, legal bases, processors,
 │          transfer locations, retention table, rights process, breach process,
 │          analytics/cookie controls, deletion/export)                               ← legal counsel review
 ├── P1.2  Internal RoPA (GDPR Art. 30 + IRR §25)                                     ← depends on P0.5
 ├── P1.3  DPIA / LIA where needed                                                    ← depends on P1.2
 ├── P1.4  Processor / sub-processor DPA register (Cloudflare, Google, email, etc.)   ← legal counsel review
 ├── P1.5  Breach-response runbook (72-hour NPC + supervisory authority rule)         ← owner + counsel
 ├── P1.6  Vulnerability disclosure policy (security.txt + intake)                    ← can run parallel
 ├── P1.7  File scanner wiring (real AV/provider, DLQ review, admin override expiry,
 │          scan-result audit trail)                                                  ← can run parallel
 └── P1.8  Retention schedules enforced in code (crons, tombstoning, anonymization)   ← depends on P1.2

P2 (before enterprise positioning)
 ├── P2.1  OWASP ASVS 5.0.0 Level 2 control matrix                                    ← depends on P0+P1
 ├── P2.2  OWASP API Top 10 (2023) test matrix                                        ← depends on P0+P1
 ├── P2.3  Quarterly access review cadence
 ├── P2.4  Backup / restore evidence (cf:d1-restore-rehearsal operationalized)
 ├── P2.5  Log-retention policy enforcement
 ├── P2.6  Vendor-risk register
 ├── P2.7  Security training evidence
 ├── P2.8  Release-security checklist
 └── P2.9  Annual pen test
```

## Blocked decisions (require owner or legal counsel)

| ID | Decision | Owner | Why blocked |
|---|---|---|---|
| OPEN-DEC-001 | Final Trust page wording after claim correction | Philip | Public-facing; owner approval required |
| OPEN-DEC-002 | Privacy notice controller identity + DPO/contact | Philip + counsel | Legal entity formation status |
| OPEN-DEC-003 | Processor / sub-processor list publication | Philip + counsel | Contract negotiation in progress |
| OPEN-DEC-004 | Retention period policy per data class | Philip + counsel | Requires legal review of statutory minimums |
| OPEN-DEC-005 | Breach notification thresholds (Philippine NPC + EU DPA) | Counsel | Jurisdiction-specific legal interpretation |
| OPEN-DEC-006 | File scanner provider selection (Cloudflare AV partner vs. dedicated) | Philip | Cost / coverage tradeoff |
| OPEN-DEC-007 | Whether to enforce CSP at edge (Cloudflare) or in Next.js middleware | Philip + engineering | Architecture decision |
| OPEN-DEC-008 | Third-party scripts allowlist for CSP (analytics, error reporting) | Philip + engineering | Depends on which providers ship |

## Files explicitly off-limits during P0

- `migrations/*.sql` — no schema changes during P0 claim correction phase
- `wrangler.jsonc` — no binding changes (paid add-on moratorium)
- `package.json` — no new dependencies without owner approval
- Production deploy (`bun run cf:deploy`) — not authorized by this plan pack
- Any file under `./supabase/` — historical migration archaeology only

## Files intentionally unaffected

- `src/app/api/auth/[...all]/` — covered by `2026-07-03-Authentication-Audit-And-Improvement`
- API rate limit implementation files — covered by `2026-07-02-API-Rate-Limiting-Security-Consolidation`
- All landing-page UI components except where claims language must be corrected

## Related packs (do not duplicate)

| Pack | Relationship |
|---|---|
| [`2026-06-01-security-owasp-compliance-audit`](../2026-06-01-security-owasp-compliance-audit/) | Technical code-level OWASP audit. Source of evidence for this pack's P2.1 ASVS matrix. |
| [`2026-07-02-API-Rate-Limiting-Security-Consolidation`](../2026-07-02-API-Rate-Limiting-Security-Consolidation/) | Implements durable API rate limiting. P0.4 references its output. |
| [`2026-07-03-Authentication-Audit-And-Improvement`](../000-Follow%20Ups/2026-07-03-Authentication-Audit-And-Improvement/) | Implements auth hardening; P0/P1 references its threat model. |
| [`2026-07-04-Vercel-Supabase-Cleanup`](../../09_archive/store/2026-07-05-Vercel-Supabase-Cleanup-complete/) | Provider-exit cleanup; trust page corrections must align with its claims. |

## Documents in this pack

| # | Document | Purpose |
|---|---|---|
| — | `README.md` (this file) | Entrypoint, status, phase order, blocked decisions |
| 00 | `00-executive-summary.md` | Thesis, takeaway, 4-section summary |
| 01 | `01-current-state-baseline.md` | What's already solid; file map of relevant code |
| 02 | `02-owasp-and-security-gaps.md` | Section 1: ASVS/API Top 10 mapping gap + immediate OWASP gaps |
| 03 | `03-gdpr-and-philippine-dpa-gaps.md` | Section 2: RoPA, DSAR, processors, breach response |
| 04 | `04-data-protection-engineering.md` | Section 3: hashing consistency, observability, retention |
| 05 | `05-compliance-roadmap-p0-p1-p2.md` | Section 4: deliverables, owners, gates per phase |
| 06 | `06-requirements-acceptance-criteria.md` | REQ-* IDs with adversarial proof scenarios + traceability matrix |
| 07 | `07-risk-register-and-decisions.md` | RISK-* / DEC-* / ASSUMP-* combined |
| **08** | **`08-scorecard-and-improvement-record.md`** | **Added 2026-07-04**: per-doc scorecard, verified claims matrix, adversarial review findings, validation gap disclosure |
| — | `LOOP_LEDGER.md` | Append-only coordination log |

## Commands to run before first edit (when execution is authorized)

```bash
git status --short --branch
bun run type-check
bun run lint
bun run validate
```

## Stale-plan revalidation checklist

Before executing any phase, revalidate:
- [ ] `.ai/10_state/current-state.md` FAST PATH still describes the current stack (Cloudflare-first, no Supabase runtime)
- [ ] Trust page text in repo still matches what this pack assumes (re-read it)
- [ ] Privacy page text still matches what this pack assumes (re-read it)
- [ ] wrangler.jsonc bindings still match (D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`)
- [ ] No new paid Cloudflare add-ons enabled since authorship
- [ ] Related packs (06-01 audit, 07-02 rate limit, 07-03 auth) still in their stated readiness status
- [ ] Counsel review status for OPEN-DEC-002 through OPEN-DEC-005 has not advanced (if advanced, update this pack)

## External proof still required before production rollout

- Real Cloudflare provider proof for any new rate-limit / scanner binding (not local-only simulation)
- Counsel sign-off on the published privacy notice text
- Counsel sign-off on the published processor list
- Owner sign-off on the corrected Trust page wording
- Evidence that the file scanner provider actually blocks a EICAR test file (not just that the code path exists)
