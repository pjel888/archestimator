# 06 — Requirements and Acceptance Criteria

**Format:** Each requirement gets a stable `REQ-*` ID. Each maps to: source, behavior, acceptance criterion, test/proof method, and (for runtime behavior) adversarial scenarios.

**Evidence classes:** `local-static` (file inspection, `git diff --check`), `local-automated` (typecheck/lint/tests), `provider-backed` (Cloudflare readback), `manual` (human QA), `counsel` (legal sign-off — required for some artifacts).

---

## P0 requirements

### REQ-001 — Correct public Trust page claims
- **Source:** Owner analysis §1 (TRUST-CLAIM); `02-owasp-and-security-gaps.md` §2.4.4
- **Behavior:** Trust page no longer claims "RLS on every table" or "Postgres" rate limiting. Wording accurately describes app-layer authorization on D1.
- **Acceptance criterion:** Trust page text matches the corrected wording approved under `OPEN-DEC-001`.
- **Test/proof:** `local-static` — diff of `src/app/trust/page.tsx` (or equivalent); `manual` — visual review of the rendered page.
- **Adversarial scenarios:**
  - SEARCH-1: search the entire repo for "RLS on every table" and "Postgres" — must return zero hits in app/ and content/ source
  - SHARE-1: when an existing shared-link recipient reloads the page, no behavior regression

### REQ-002 — Enforced CSP globally with nonces
- **Source:** Owner analysis §1 (CSP); `02-owasp-and-security-gaps.md` §2.4.1
- **Behavior:** All HTML responses include `Content-Security-Policy` (enforced, not `Report-Only`); `'unsafe-inline'` and `'unsafe-eval'` removed; inline scripts use per-request nonces.
- **Acceptance criterion:** 7 consecutive days of zero CSP violation reports after enforcement, plus no regression in route correctness.
- **Test/proof:** `manual` — browser DevTools → Network → Response Headers on every route type (landing, workshop, share, invite, auth callback). `local-automated` — Playwright test that asserts CSP header value matches the expected shape.
- **Adversarial scenarios:**
  - HTML-INJECT-1: server-render a page with a probe inline script → browser must block execution
  - EVAL-1: any client component using `eval` / `new Function` → CSP violation logged, route still renders (graceful)
  - THIRD-PARTY-1: analytics provider (when added) fails to load if not in allowlist → graceful degradation

### REQ-003 — Durable upload rate limiting
- **Source:** Owner analysis §1 (UPLOAD-RL); `02-owasp-and-security-gaps.md` §2.4.2
- **Behavior:** Upload admission rate limits persist across Cloudflare isolate restarts.
- **Acceptance criterion:** After a Worker restart, an attacker who was at the rate-limit threshold is still at the threshold (cannot bypass by triggering restart).
- **Test/proof:** `provider-backed` — deploy to preview; trigger 2 upload requests; restart Worker; trigger 3rd upload; verify it is admitted only if the durable bucket has capacity.
- **Adversarial scenarios:**
  - RESTART-1: trigger upload 1/N, restart Worker, trigger upload (N+1)/N → must be rejected
  - SCRAPE-1: parallel uploads from 10 cookies of the same user → user-level bucket blocks after N
  - BYPASS-1: malformed workspace_id in upload request → rejected, does not corrupt bucket

### REQ-004 — CSRF / origin guard on all cookie-authenticated mutations
- **Source:** Owner analysis §1; `02-owasp-and-security-gaps.md` §2.4 (P0.3)
- **Behavior:** Every server action and POST route that mutates state and authenticates via cookie either (a) validates an CSRF token / origin header, or (b) is documented as not-applicable with reason.
- **Acceptance criterion:** Inventory of mutation surfaces complete; each entry has an explicit decision.
- **Test/proof:** `local-static` — inventory document under `.ai/10_state/compliance/csrf-coverage.md`. `local-automated` — Vitest test that POSTs from a forged origin return 403.
- **Adversarial scenarios:**
  - FORGED-ORIGIN-1: POST to `/api/projects/[id]/estimates` with `Origin: https://evil.example` → 403
  - NO-ORIGIN-1: same POST with no Origin header → 403
  - OPTIONS-1: preflight OPTIONS allowed through (don't accidentally block CORS preflight)

### REQ-005 — Privacy request register
- **Source:** Owner analysis §2 (DSAR); `03-gdpr-and-philippine-dpa-gaps.md` §3.4.2
- **Behavior:** In-app form + email alias routes to a register; triage SLA documented.
- **Acceptance criterion:** Test request submitted, triaged, resolved, and audit trail queryable.
- **Test/proof:** `manual` — submit a test request; verify it appears in register; verify audit trail.
- **Adversarial scenarios:**
  - ANON-1: anonymous submission accepted (DSAR may come from non-logged-in users)
  - VERIFY-1: identity verification step blocks impersonation
  - SLA-1: request that exceeds SLA triggers escalation alert

### REQ-006 — HMAC pepper for account audit hashing
- **Source:** Owner analysis §3 (HASH-HMAC); `04-data-protection-engineering.md` §4.2
- **Behavior:** New rows in `account_security_events` use HMAC-SHA-256 with a Worker-secret pepper.
- **Acceptance criterion:** Unit test verifies same IP produces different hashes under different peppers; DB inspection shows new rows match HMAC pattern.
- **Test/proof:** `local-automated` — Vitest unit test on hash function. `provider-backed` — D1 readback after a test login event.
- **Adversarial scenarios:**
  - ROTATION-1: pepper rotation produces different hash for same IP (proves pepper is in use)
  - LEAK-1: if DB leaks, attacker cannot reverse HMAC without pepper (documented threat model)

---

## P1 requirements (selection — see `05-compliance-roadmap-p0-p1-p2.md` for full list)

### REQ-101 — Full privacy notice with all Article 13/14 elements
- **Source:** GDPR Art. 13/14; `03-gdpr-and-philippine-dpa-gaps.md` §3.5
- **Behavior:** Privacy page contains: controller identity, DPO/contact, purposes + legal bases, recipients, transfer locations + safeguards, retention periods, rights available, right to complain, automated decision-making (none), cookie/analytics controls.
- **Acceptance criterion:** Counsel sign-off (`OPEN-DEC-002`); published text matches reviewed text.
- **Test/proof:** `counsel` — review letter on file. `manual` — page rendered in browser, all sections visible.

### REQ-102 — Internal RoPA
- **Source:** GDPR Art. 30; IRR §25
- **Behavior:** `.ai/10_state/compliance/ropa.md` exists; covers every processing activity; cross-references retention schedules and processor register.
- **Acceptance criterion:** Counsel review complete.
- **Test/proof:** `counsel` — review letter on file. `local-static` — file exists and is non-stub.

### REQ-103 — Processor / sub-processor DPA register
- **Source:** GDPR Art. 28; IRR §25
- **Behavior:** Each processor (Cloudflare, Google, email, analytics, AI) has an entry with role, geography, DPA status, transfer basis.
- **Acceptance criterion:** Signed DPAs on file; published list matches internal register.
- **Test/proof:** `counsel` — contract review. `local-static` — register file present.

### REQ-104 — Breach-response runbook
- **Source:** GDPR Art. 33-34; **NPC Circular 2016-02** (corrected 2026-07-04 — DPA primary text does not specify the 72-hour rule; NPC Circular 2016-02 + IRR operationalize it from Sections 20-21)
- **Behavior:** `.ai/11_skills/security/breach-response-runbook.md` exists; covers detection, triage, containment, assessment, NPC notification, EU DPA notification, data subject notification, resolution, audit trail.
- **Acceptance criterion:** Tabletop exercise completed; thresholds approved.
- **Test/proof:** `counsel` — threshold sign-off (`OPEN-DEC-005`). `manual` — tabletop exercise minutes on file.

### REQ-105 — Vulnerability disclosure policy
- **Source:** Industry standard (CVD)
- **Behavior:** `public/.well-known/security.txt` exists and points to intake alias; `src/app/security/page.tsx` (or similar) publishes the policy.
- **Acceptance criterion:** Text live; alias routing tested.
- **Test/proof:** `local-static` — file present. `manual` — send a test email to the alias, verify it lands in the register.

### REQ-106 — Real file scanner wired
- **Source:** Owner analysis §1 (SCAN); `02-owasp-and-security-gaps.md` §2.4.3
- **Behavior:** Upload pipeline calls a real scanner; DLQ review path; admin override with TTL; scan-result audit trail.
- **Acceptance criterion:** EICAR test file blocked end-to-end.
- **Test/proof:** `provider-backed` — upload EICAR through the real pipeline; verify rejection. `local-automated` — Vitest on scan-state transitions.
- **Adversarial scenarios:**
  - EICAR-1: upload EICAR → blocked, scan state = `infected`, audit row written
  - DLQ-1: scanner outage → upload goes to DLQ; admin can review
  - OVERRIDE-1: admin override applied → expires after TTL; re-override requires re-auth

### REQ-107 — Retention schedules enforced in code
- **Source:** Owner analysis §3 (RETENTION); `04-data-protection-engineering.md` §4.4
- **Behavior:** Cron jobs enforce per-class TTLs; DSAR soft-delete propagates; `data_retention_events` audit table populated.
- **Acceptance criterion:** 30 days of cron runs without error; test DSAR completes full soft-delete.
- **Test/proof:** `provider-backed` — D1 query showing rows past TTL are gone. `local-automated` — Vitest on cron logic.
- **Adversarial scenarios:**
  - LEGAL-HOLD-1: row under legal hold is not deleted by cron (skip flag respected)
  - SOFT-DELETE-1: DSAR soft-delete marks row, hard-delete cron purges after TTL

---

## P2 requirements (selection)

### REQ-201 — ASVS 5.0.0 Level 2 control matrix
- **Behavior:** Every ASVS V1-V14 requirement mapped to either (a) evidence of compliance, or (b) documented compensating control, or (c) accepted risk with owner sign-off.
- **Test/proof:** `local-static` — matrix file present. `manual` — sample of 10 entries audited against repo evidence.

### REQ-202 — OWASP API Top 10 (2023) test matrix
- **Behavior:** For each API1-API10 category, every relevant route in `src/app/api/**` has a denial test.
- **Test/proof:** `local-automated` — Playwright or Vitest supertest exercising each route. `manual` — sample of 5 denial tests observed live.

(Full P2 list in `05-compliance-roadmap-p0-p1-p2.md`.)

---

## Cross-cutting acceptance criteria

These apply to every P0/P1/P2 deliverable:

| Criterion | Method |
|---|---|
| Plan pack files accurately reflect shipped state | `git diff --check` clean; `.ai/03_plans/2026-07-04-Security-Compliance-Program/README.md` status field updated |
| No new `as any` / `@ts-ignore` introduced | `bun run type-check` + `bun run lint` clean |
| No secrets introduced | Pre-commit secret scan (if configured); manual grep for known patterns |
| Public Trust / Privacy pages match internal artifacts | Diff review between `src/app/{trust,privacy}/page.tsx` and `.ai/10_state/compliance/*.md` |
| No paid Cloudflare add-ons enabled without owner approval | `wrangler.jsonc` diff review |

---

## Requirement traceability matrix (added 2026-07-04)

Per Improve-Plan-Prompt §"Requirements and Traceability" — every requirement traces to source, file, AC, test, and risk.

`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`

| REQ | Source evidence | Source strength | Plan section | Work item (file) | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | Owner analysis §1 (TRUST-CLAIM); `02-owasp-and-security-gaps.md` §2.4.4 | repo evidence (verified L92,160,162) | 02 §2.4.4 / 05 P0.1 | `src/app/trust/page.tsx` (lines 92, 160, 162) | Trust text matches OPEN-DEC-001 wording | local-static (diff); manual (visual) | RISK-001 | pending | OPEN-DEC-001 sign-off |
| REQ-002 | Owner analysis §1 (CSP); `02-owasp-and-security-gaps.md` §2.4.1 | repo evidence (CSP location pending — ASSUMP-001) | 02 §2.4.1 / 05 P0.2 | CSP config (location TBD per ASSUMP-001) + middleware | 7 days zero-violation + Playwright CSP header assertion | manual (browser DevTools); local-automated (Playwright) | RISK-009 | pending | OPEN-DEC-007 + OPEN-DEC-008 |
| REQ-003 | Owner analysis §1 (UPLOAD-RL); `02-owasp-and-security-gaps.md` §2.4.2 | repo evidence (path pending — ASSUMP-001) | 02 §2.4.2 / 05 P0.4 | Upload admission path (file TBD) | Worker restart preserves bucket | provider-backed (preview deploy) | RISK-002 | pending | ASSUMP-002 free-tier limits |
| REQ-004 | Owner analysis §1; `02-owasp-and-security-gaps.md` §2.4 | repo evidence (mutation inventory pending) | 02 §2.4 / 05 P0.3 | All server actions under `src/lib/*/actions.ts`; POST routes under `src/app/api/` | Mutation inventory complete; explicit decision per surface | local-static (inventory doc); local-automated (Vitest 403 on forged origin) | RISK-013 | pending | — |
| REQ-005 | Owner analysis §2 (DSAR); `03-gdpr-and-philippine-dpa-gaps.md` §3.4.2 | brief (NPC guidance pending) | 03 §3.4.2 / 05 P0.5 | New `privacy_requests` table; admin UI | Test request end-to-end | manual (test request) | RISK-005 | pending | DSAR identity verification model undefined (ADV-009) |
| REQ-006 | Owner analysis §3 (HASH-HMAC); `04-data-protection-engineering.md` §4.2 | repo evidence (verified L3,24-26 + L48-51 silent swallowing) | 04 §4.2 / 05 P0.6 | `src/lib/auth/account-audit.ts`; pepper via Worker secret | Same IP → different hash under different pepper | local-automated (Vitest); provider-backed (D1 readback) | RISK-003 + **RISK-016** (silent swallowing) | pending | RISK-016 expands scope (pepper-presence check + opaque failure telemetry) |
| REQ-101 | GDPR Art. 13/14; `03-gdpr-and-philippine-dpa-gaps.md` §3.5 | official docs (EUR-Lex pending direct verify) | 03 §3.5 / 05 P1.1 | `src/app/privacy/page.tsx` content | All Art. 13/14 elements present | counsel review + manual render | RISK-007 (partial) | pending | OPEN-DEC-002 counsel |
| REQ-102 | GDPR Art. 30; DPA §14 (corrected) | official docs | 03 §3.4.1 / 05 P1.2 | `.ai/10_state/compliance/ropa.md` | Counsel-reviewed RoPA file | counsel review + local-static | — | pending | OPEN-DEC-002/004 |
| REQ-103 | GDPR Art. 28; DPA §14 | official docs + repo evidence (Cloudflare DPA URL verified 2026-07-04) | 03 §3.4.3 / 05 P1.4 | `.ai/10_state/compliance/processor-register.md`; Privacy page list | Signed DPAs on file; published list matches register | counsel review + local-static | RISK-008 | pending | OPEN-DEC-003 |
| REQ-104 | GDPR Art. 33-34; **NPC Circular 2016-02** (corrected) | official docs (DPA section number verified 2026-07-04) | 03 §3.4.4 / 05 P1.5 | `.ai/11_skills/security/breach-response-runbook.md` | Tabletop exercise completed | counsel sign-off (thresholds) + manual (tabletop minutes) | RISK-006 | pending | OPEN-DEC-005 thresholds |
| REQ-105 | RFC 9116 (verified current 2026-07-04) | official docs (IETF) | 03 §3.6 / 05 P1.6 | `public/.well-known/security.txt`; `src/app/security/page.tsx` | File present; alias tested | local-static + manual | — | pending | — |
| REQ-106 | Owner analysis §1 (SCAN); `02-owasp-and-security-gaps.md` §2.4.3 | repo evidence (scan-state gate pending — ASSUMP-001) | 02 §2.4.3 / 05 P1.7 | Upload pipeline; Queue DLQ handler | EICAR blocked end-to-end | provider-backed (real pipeline) | RISK-004 | pending | OPEN-DEC-006 provider |
| REQ-107 | Owner analysis §3 (RETENTION); `04-data-protection-engineering.md` §4.4 | brief (TTLs pending OPEN-DEC-004) | 04 §4.4 / 05 P1.8 | Cron jobs in `wrangler.jsonc`; new `data_retention_events` migration | 30 days cron runs without error | provider-backed (D1 query) + local-automated (Vitest cron) | RISK-007 | pending | OPEN-DEC-004 TTLs |

---

## Adversarial QA scenarios summary

The full adversarial matrix will be authored in P0.3 (CSRF audit) and P1.7 (scanner). Categories to cover:

- Malformed input (oversized, weird Unicode, missing fields)
- Unauthorized / cross-workspace access
- Concurrent writes (DSAR soft-delete while estimate being edited)
- Retry after partial success (scanner outage mid-upload)
- Stale cache or stale client state (Trust page corrected but CDN serves old)
- Hung commands with bounded timeout
- Misleading success output (DSAR returns "deleted" but row retained due to legal hold)
