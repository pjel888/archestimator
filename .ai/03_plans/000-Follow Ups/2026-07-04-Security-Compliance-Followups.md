# Security & Compliance Program — Follow-up Tracker

**Origin pack:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Program/`
**Created:** 2026-07-05 (Asia/Manila)
**Updated:** 2026-07-05 (retention cron binding hardening + CSP decision brief added)
**Why this exists:** P0 + most P1 items are implemented (see below). Remaining items are gated on legal counsel / owner decisions / paid add-on enablement that exceed the standing Cloudflare-resource mandate. P2 items are intentionally future enterprise-readiness work.

## P0 — LOCAL STATUS 2026-07-05

| ID | Deliverable | Evidence |
|---|---|---|
| P0.1 | Trust page overclaim correction | `src/app/trust/page.tsx` L92, L160, L162 corrected; `tests/vitest/trust-page-overclaims.test.ts` (4 tests pass) |
| P0.2 | Global security headers + enforced CSP roadmap | **PARTIAL**: `next.config.ts` adds `/:path*` catch-all with X-Content-Type-Options/X-Frame-Options/Referrer-Policy/HSTS; `/share/:path*` has enforced CSP; landing/workshop/invite remain CSP Report-Only. `tests/vitest/landing-security-headers.test.ts` (3 tests pass). Decision brief at `.ai/10_state/compliance/csp-decision-brief.md`; full REQ-002 remains blocked on `OPEN-DEC-007`/`OPEN-DEC-008`, nonce design, and telemetry |
| P0.3 | CSRF / origin coverage inventory | `.ai/10_state/compliance/csrf-coverage.md` — 28 routes + 11 server actions categorized |
| P0.4 | Durable upload rate limits | **Covered by sibling pack `2026-07-02-API-Rate-Limiting-Security-Consolidation`** (do not duplicate) |
| P0.5 | Privacy request register | `migrations/0033_privacy_request_register.sql`; `src/lib/compliance/privacy-request-repository.ts`; `src/app/api/compliance/privacy-requests/route.ts`; `tests/vitest/compliance-privacy-request-repository.test.ts` (3 tests pass); migration applied to local D1 |
| P0.6 | HMAC pepper for account audit hashing + RISK-016 fix | `src/lib/auth/account-audit.ts` migrated from plain SHA-256 to HMAC-SHA-256 keyed by `AUTH_AUDIT_HASH_PEPPER`; silent catch replaced with opaque structured log; `tests/vitest/auth-account-audit-hmac.test.ts` (4 tests pass); `.dev.vars.example` documents new pepper; production Worker secret set 2026-07-05 |

## P1 — PARTIALLY IMPLEMENTED 2026-07-05 (engineering done; counsel/owner gates remain)

| ID | Deliverable | Engineering status | Counsel/Owner gate | Unblock action |
|---|---|---|---|---|
| P1.1 | Full privacy notice (GDPR Art. 13/14) | **DRAFT COMPLETE** at `.ai/10_state/compliance/privacy-notice-draft.md` (13 sections, all required elements) | `OPEN-DEC-002` (controller identity + DPO) | Philip + counsel: fill bracketed placeholders, sign off, then migrate to `src/app/privacy/page.tsx` |
| P1.2 | Internal RoPA (GDPR Art. 30 + IRR §14) | **DRAFT COMPLETE** at `.ai/10_state/compliance/ropa.md` (10 processing activities inventoried from codebase) | `OPEN-DEC-002` + `OPEN-DEC-004` | Counsel: verify each activity, finalize retention periods, sign off |
| P1.3 | DPIA / LIA screening | **DRAFT COMPLETE** at `.ai/10_state/compliance/dpia-screening.md` (per-activity screening + LIA for legitimate-interest activities) | Counsel determination matrix | Counsel: complete matrix; DPIA required for PA-FUT-01 (AI) before activation |
| P1.4 | Processor / sub-processor DPA register | **DRAFT COMPLETE** at `.ai/10_state/compliance/processor-register.md` (3 active processors + 1 future) | `OPEN-DEC-003` (signed DPAs) | Counsel: confirm DPA execution with Cloudflare + Google; publish summary on `/privacy` |
| P1.5 | Breach-response runbook | **DRAFT COMPLETE** at `.ai/11_skills/security/breach-response-runbook.md` (6 response phases, severity matrix, NPC + EU DPA notification templates) | `OPEN-DEC-005` (thresholds) + tabletop exercise | Counsel: confirm thresholds; schedule tabletop; record minutes |
| P1.6 | Vulnerability disclosure policy | **IMPLEMENTED** at `public/.well-known/security.txt` (RFC 9116) + `src/app/security/page.tsx` (policy page) | None (engineering work, done) | None — already live (deploy pending) |
| P1.7 | File scanner wiring | **IMPLEMENTATION-COMPLETE** at code level; EICAR denial test passes | `OPEN-DEC-006` (provider selection = paid) | Philip: choose ClamAV hosting option (Fly.io free tier or equivalent) and set `CLAMD_HOST`/`CLAMD_PORT`. See `.ai/10_state/compliance/file-scanner-status.md` |
| P1.8 | Retention schedules enforced in code | **PARTIAL, LOCAL ENGINE HARDENED**: migration `0034_data_retention_events.sql` + repository `src/lib/compliance/retention-repository.ts` + cron `30 3 * * *` wired in `worker.ts` + draft schedule at `.ai/10_state/compliance/retention-schedule.md`; D1-compatible positional binds and minimized audit metadata covered by `tests/vitest/compliance-retention-repository.test.ts` (5 tests pass) | `OPEN-DEC-004` (final TTLs) + DSAR propagation + 30-day hosted cron observation | Counsel: sign off on per-class TTLs; update `DEFAULT_RETENTION_RULES` to match; then run hosted cron/D1 proof |
| P1.9 (added) | Email confirmation on privacy request intake | NOT IMPLEMENTED | Tied to P1.1 (privacy-notice wording) | After P1.1 lands, wire `EMAIL` binding in `src/app/api/compliance/privacy-requests/route.ts` |
| P1.10 (added) | Per-surface CSRF denial tests | **IMPLEMENTED** at `tests/vitest/csrf-origin-denial.test.ts` (12 tests pass) | None | None |
| P1.11 (added) | HMAC pepper rotation tooling | **IMPLEMENTED** at `scripts/rotate-audit-pepper.mjs` + `.ai/10_state/compliance/audit-pepper-rotation-log.md` | None | None — first rotation done 2026-07-05 |

## P2 — INTENTIONALLY FUTURE (enterprise positioning, not in scope for current launch)

| ID | Deliverable | Why deferred |
|---|---|---|
| P2.1 | ASVS 5.0.0 Level 2 control matrix | Depends on P0+P1 complete |
| P2.2 | OWASP API Top 10 (2023) test matrix | Depends on P0+P1 complete |
| P2.3 | Quarterly access review cadence | Operational cadence — needs ops team size first |
| P2.4 | Backup / restore evidence operationalized | Free-tier restore rehearsal script already exists; quarterly cadence can wait |
| P2.5 | Log-retention policy enforcement | Cloudflare Logpush is a paid add-on; defer until paid tier is approved |
| P2.6 | Vendor-risk register | After processor register (P1.4) lands |
| P2.7 | Security training evidence | Operational — when team grows |
| P2.8 | Release-security checklist | After P0/P1 artifacts are routine |
| P2.9 | Annual penetration test | After first paid launches; budget for external vendor |

## Disposition

- **Original plan pack folder** at `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Program/` (moved per user instruction).
- **P0 + most P1 engineering work** complete with traceable evidence (tests, migrations, repository code, migration application to local D1, production Worker secret set), with two explicit exceptions: P0.2 is only staged CSP/global hardening until strict nonced CSP decisions and telemetry close, and P0.4 is delegated to the sibling rate-limit pack. The P1.8 retention cron path is locally hardened for D1 positional binding and privacy-minimized audit metadata, but it is not policy-complete until TTLs, DSAR propagation, and hosted cron proof are accepted.
- **P1 counsel/owner-gated items** are documented in complete draft form at `.ai/10_state/compliance/*.md` and `.ai/11_skills/security/breach-response-runbook.md`. These drafts contain every required element per the relevant regulation; counsel needs to fill bracketed placeholders, sign off on thresholds, and approve publication wording.
- **P2 items** remain on the roadmap; not in scope for current launch.
- **Archive criteria:** pack can be archived to `.ai/09_archive/` only after all P1 counsel-gated items are explicitly accepted/deferred by Philip. That decision is the owner's, not an engineering call.

## Residual blockers beyond engineering control

Only these items cannot be unblocked without owner/counsel/engineering decision action:

1. **`OPEN-DEC-002`** — Controller legal entity formation + DPO appointment (Philip + counsel)
2. **`OPEN-DEC-003`** — Signed DPAs with Cloudflare + Google (counsel)
3. **`OPEN-DEC-004`** — Final per-class retention TTLs (counsel)
4. **`OPEN-DEC-005`** — Breach notification thresholds (counsel)
5. **`OPEN-DEC-006`** — File scanner provider selection / paid add-on (Philip)
6. **`OPEN-DEC-007`** — CSP enforcement location for strict nonced CSP (Philip + engineering)
7. **`OPEN-DEC-008`** — Third-party script/source allowlist for strict CSP (Philip + engineering)

Everything else in the plan pack is either locally implemented, delegated to the sibling rate-limit pack, or intentionally future P2 work as of 2026-07-05.
