# 07 — Risk Register and Decisions

**Codes:** `RISK-*` (risk), `DEC-*` (decision), `ASSUMP-*` (assumption), `OPEN-DEC-*` (open decision requiring owner or counsel)

---

## Risk Register

| ID | Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|---|
| **RISK-001** | Public Trust page overclaims (RLS, Postgres, OWASP) and a customer or regulator treats it as deceptive | High (currently true) | High (legal + reputational) | Engineering + Philip | **P0.1** corrects wording; `OPEN-DEC-001` sign-off; aligns with Vercel-Supabase-Cleanup pack |
| **RISK-002** | In-memory upload rate limits reset on isolate restart, allowing quota bypass under load | High (currently true) | Medium (abuse window) | Engineering | **P0.4** backs buckets with Cloudflare Rate Limiting / DO / D1 |
| **RISK-003** | Account audit IP/UA hashes are reversible (plain SHA-256), enabling deanonymization on DB leak | Medium | High (privacy + compliance) | Engineering | **P0.6** migrates to HMAC pepper; treat existing hashes as pseudonymous personal data |
| **RISK-004** | File scanner is a state machine without a real AV provider; infected uploads could be admitted and shared | Medium | High (trust + safety) | Engineering | **P1.7** wires real scanner; DLQ review; admin override TTL; audit trail; EICAR test |
| **RISK-005** | No DSAR workflow; a data subject request goes unanswered → GDPR/DPA complaint risk | Medium | High (regulatory) | Operations | **P0.5** stands up intake; **P1.x** expands to full DSAR workflow |
| **RISK-006** | No breach runbook; a real breach triggers panicked ad-hoc response, missing 72-hour notification window | Low likelihood, high impact | Critical (regulatory + reputational) | Operations + Counsel | **P1.5** authors runbook; tabletop exercise; `OPEN-DEC-005` thresholds |
| **RISK-007** | Retention periods undefined; data kept indefinitely, exposing Archestimator to larger breach blast radius and "subject to review" ambiguity | High (currently true) | Medium → High (compounds with time) | Operations + Counsel | **P1.8** codifies schedules in code; `OPEN-DEC-004` counsel review |
| **RISK-008** | Processor DPAs not on file; relying on standard Cloudflare DPA without per-processor review | Medium | Medium (compliance gap) | Operations + Counsel | **P1.4** completes register |
| **RISK-009** | CSP `Report-Only` with `unsafe-inline`/`unsafe-eval` provides no actual XSS mitigation | High (currently true) | Medium → High (XSS exposure) | Engineering | **P0.2** enforces CSP with nonces; removes unsafe directives |
| **RISK-010** | Premature SOC 2 / ISO / OWASP-compliance marketing claims before artifacts exist | Medium (temptation as launch approaches) | High (regulatory + reputational) | Philip + Marketing | This pack enforces "closed-beta security baseline with privacy/compliance work in progress" claim discipline |
| **RISK-011** | Cloudflare observability logs retain raw IP/UA without redaction or TTL | Medium | Medium (privacy) | Engineering + Operations | **P0.6+** hashing migration; **P2.5** log-retention policy |
| **RISK-012** | Legacy Supabase callback at `src/app/auth/callback/` still in routes — confusion or future misuse | Low | Low (already historical) | Engineering | Verify clearly marked as migration archaeology; remove or document in P0.3 inventory |
| **RISK-013** | Cookie-authenticated mutation surfaces outside the share/publication flow may lack CSRF / origin checks | Medium | Medium (CSRF) | Engineering | **P0.3** audit produces explicit coverage matrix |
| **RISK-014** | Pepper rotation strategy undefined; rotation breaks historical linkage (which is fine for audit but must be documented) | Low | Low (operational) | Engineering | **P0.6** documents rotation strategy in skill file |
| **RISK-015** | Plan pack goes stale if owner/counsel decisions (`OPEN-DEC-001` through `OPEN-DEC-008`) are not tracked | Medium | Medium (planning rot) | Lead author | Stale-plan revalidation checklist in README; update on each OPEN-DEC resolution |
| **RISK-016** (added 2026-07-04) | `recordAccountSecurityEvent` (`src/lib/auth/account-audit.ts:48-51`) silently swallows ALL errors — P0.6 HMAC migration would silently fail if pepper is not set or D1 write fails | High (currently true) | High (security audit visibility gap) | Engineering | **P0.6 scope expanded**: add explicit pepper-presence check at startup; emit a separate telemetry signal for audit-write failures (don't change the "must not leak provider details" behavior — add a `audit_write_failed: true` opaque flag); unit test that verifies pepper-absence raises a startup error in production |
| **RISK-017** (added 2026-07-04) | 12 repo paths remain `[pending — ASSUMP-001]` for execution phase (CSP config, upload admission, scan-state gate, observability config details, rate-limit middleware, CSRF content, scan schema migration, HMAC test, eval usage) | Medium | Low (execution-phase discovery risk) | Engineering | Each path is documented in `01-current-state-baseline.md` and will be re-verified at the start of its corresponding P0/P1 phase per the stale-plan revalidation checklist |

---

## Decisions

### DEC-001 — Use OWASP ASVS 5.0.0 Level 1 as P1 verification target; Level 2 as P2 target
- **Rationale:** Level 1 is appropriate for opportunistic / closed-beta baseline; Level 2 is appropriate before enterprise positioning. ASVS is the de facto application security control standard.
- **Rejected alternatives:**
  - "Skip ASVS, just do pen test" — pen test is point-in-time; ASVS provides repeatable verification
  - "Go straight to Level 3" — Level 3 is for high-assurance systems (medical, financial core); not proportionate for Archestimator's current stage
- **Source authority:** [OWASP ASVS project](https://owasp.org/www-project-application-security-verification-standard/)

### DEC-002 — Privacy posture during P0 is "closed-beta baseline with privacy/compliance work in progress"
- **Rationale:** Inaccurate claims are worse than no claims. The current baseline is real but not standards-mapped. Honesty is the fastest credibility path.
- **Rejected alternatives:**
  - "Remove all security claims from Trust page" — would underclaim; Trust page is a customer signal
  - "Keep current claims and add disclaimer" — disclaimers don't cure misclaims

### DEC-003 — HMAC pepper stored in Cloudflare Worker Secret (not env, not config)
- **Rationale:** Worker Secrets are encrypted at rest, not visible in `wrangler.jsonc`, not exposed to client. Env vars and config files may end up in source control or bundle.
- **Rejected alternatives:**
  - Store pepper in D1 — same exposure risk as hashes; defeats the purpose
  - Hardcode in source — fails RISK-003 immediately
  - Use Cloudflare Workers KV — KV is eventually consistent; not appropriate for high-frequency read of a secret

### DEC-004 — Plan pack uses kebab-case lowercase filenames (Pattern A) not exhaustive UPPER_SNAKE (Pattern B)
- **Rationale:** This is a strategic compliance program plan, not a multi-phase implementation. Compact shape fits. `LOOP_LEDGER.md` retained per `archestimator-plan-pack` skill.
- **Rejected alternatives:**
  - Full exhaustive 22-doc suite (Pattern B) — ceremony without proportional benefit at planning stage; P2.1 ASVS matrix will be the time for that depth

### DEC-005 — Position this pack as compliance-program layer, NOT a re-do of code-level audit
- **Rationale:** `2026-06-01-security-owasp-compliance-audit` already covers code-level findings. Duplicating would waste effort and risk divergence.
- **Rejected alternatives:**
  - Merge into 2026-06-01 audit — that pack is a point-in-time audit; this pack is a forward roadmap with phases. Different shapes.

---

## Assumptions

| ID | Assumption | Validation | Risk if wrong |
|---|---|---|---|
| **ASSUMP-001** | The repo paths cited by the explore agent (Trust page, CSP config, upload Maps, audit hashing) are accurate as of plan authorship | Stale-plan revalidation checklist (README); re-read before executing any phase | Touchpoints in `02-04` docs may be wrong; re-verify before edit |
| **ASSUMP-002** | Cloudflare Rate Limiting (free-tier) suffices for upload / auth rate-limit durability needs | Check `2026-07-02-API-Rate-Limiting-Security-Consolidation` for prior work; verify free-tier limits before architecture decision | May need DO-based counter (more code, but free-tier safe) |
| **ASSUMP-003** | The `account_security_events` table currently uses plain SHA-256 (not HMAC) | Confirmed via explore agent file-map output (see `01-current-state-baseline.md`) | If already HMAC, P0.6 is unnecessary (drop with evidence) |
| **ASSUMP-004** | Counsel review timeline for OPEN-DEC-002 through OPEN-DEC-005 is on the order of weeks, not months | Confirm with Philip before P1 start | P1 schedule slips; P0 still ships |
| **ASSUMP-005** | Cloudflare's standard DPA covers Archestimator's use of Workers / D1 / R2 / DO / Queues / Email / Images | Confirm during P1.4 register completion | May need separate DPAs per product; cost implications |
| **ASSUMP-006** | No new paid Cloudflare add-ons will be enabled without explicit owner approval | Standing authorization in `AGENTS.md` prohibits paid add-ons during pre-launch | If violated, this plan pack's cost posture is invalid |

---

## Open decisions (require owner or counsel sign-off)

| ID | Decision | Owner | Blocker for |
|---|---|---|---|
| **OPEN-DEC-001** | Final Trust page wording after claim correction | Philip | P0.1 ship |
| **OPEN-DEC-002** | Privacy notice controller identity + DPO/contact | Philip + counsel | P1.1 ship |
| **OPEN-DEC-003** | Processor / sub-processor list publication | Philip + counsel | P1.4 ship |
| **OPEN-DEC-004** | Retention period policy per data class | Philip + counsel | P1.8 ship |
| **OPEN-DEC-005** | Breach notification thresholds (NPC + EU DPA) | Counsel | P1.5 ship |
| **OPEN-DEC-006** | File scanner provider selection | Philip | P1.7 ship |
| **OPEN-DEC-007** | CSP enforcement location: edge (Cloudflare) vs. Next.js middleware | Philip + engineering | P0.2 implementation |
| **OPEN-DEC-008** | Third-party scripts allowlist for CSP (analytics, error reporting) | Philip + engineering | P0.2 implementation |
