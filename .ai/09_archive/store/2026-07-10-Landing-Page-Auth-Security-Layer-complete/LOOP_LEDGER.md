# LOOP_LEDGER.md — Landing-Page-Auth-Security-Layer

Append-only coordination log for this plan pack. Each lane logs STARTED, conflicts,
and a final COMPLETE marker. Never edit another lane's entry.

---

## 2026-07-09 — Audit + Plan Pack Creation

### Lead coordinator (orchestrator)
- **STARTED** — Read planning conventions (`Creating-Plan-Prompt.md`,
  `Multi-Agent-Execution-Directive.md`, `archestimator-plan-pack` skill),
  current-state fast path. Classified as `exhaustive` (auth/security/data-integrity).
- Dispatched 4 parallel read-only exploration lanes (A: route gates, B: BA config,
  C: actions/API handlers, D: DB schema/tokens).
- **FINDINGS (synthesized):** 1 P0 (SEC-1 plaintext magic-link tokens), 2 P1
  (SEC-3 unscoped repos, SEC-5 no explicit rate limits), 4 P2 (SEC-4, SEC-6,
  SEC-7, minor cache nit). No current auth **bypass**.
- **COMPLETE** — All 19 plan documents written. Package `IMPLEMENTATION-READY`
  (emulated verification; recommend independent human review of phase 1 P0).

### Lane A — Route gates (native subagent)
- **STARTED** — Middleware + route tree + public/protected classification.
- **COMPLETE** — 4-layer gate model confirmed; matcher correct; API routes
  self-gate; no protected page without session check. 2 minor cache nits (Gap A).
  No conflicts.

### Lane B — Better Auth config (native subagent)
- **STARTED** — Server config, session, Google OAuth, magic link, plugins, env.
- **COMPLETE** — Google+magic-link only, no password; no BA client; cookieCache
  disabled; magic-link under-configured vs proof fixture. Cross-confirms Lane D's
  plaintext-token finding. No conflicts.

### Lane C — Actions & API handlers (native subagent)
- **STARTED** — Every Server Action + every Route Handler auth check.
- **COMPLETE** — No P0 bypass; 1 ⚠️ action-layer nit (loadRecipientProposals,
  mitigated by fail-closed repo); all API routes checked or intentionally-bounded
  public; service-role always preceded by RBAC. No conflicts.

### Lane D — DB schema & tokens (native subagent)
- **STARTED** — Auth D1 tables, token storage, credential hashing, app-authz.
- **COMPLETE** — **P0: magic-link tokens plaintext** (storeToken:"plain" default,
  production doesn't override); BA core tables not in migration pipeline; 8 repos
  lack internal authz; no SQL injection; all other credentials hashed. Confirms
  Lane B's under-configured finding. No conflicts.

### Direct verification (lead)
- Re-read `src/lib/auth/request-proxy.ts` (full) — confirmed matcher + 4-layer gate.
- Re-read `src/lib/auth/better-auth-cloudflare.ts:205–250` (magic-link config) +
  `src/lib/cloudflare/better-auth-proof-router.ts:220–245` (proof config) side-by-side —
  **confirmed P0**: production passes only `sendMagicLink`, no `storeToken`.

---

## 2026-07-09 — V2 critique & improvement cycle (Improve-Plan directive)

### Adversarial lane (emulated) — critical re-audit against industry standards
- **STARTED** — Read Improve-Plan-Prompt directive; ran OWASP ASVS / NIST 800-63B /
  CWE / OWASP API Top 10 lens against v1 pack.
- **FINDINGS (v2 gaps):**
  - 🔴 **C2:** v1 missed SEC-11 — `session.token` (`internal-adapter.mjs:182,202`)
    is raw at rest, same verifier-compromise class as SEC-1. Verified via source.
  - C1: no industry-standard mapping.
  - C3: no full credential taxonomy (directive-mandated).
  - C4/C5: open-redirect + email-enumeration controls undocumented.
  - C6/C7/C8: secret-overload, accountLinking, token-in-logs not analyzed.
  - C10: Better Auth assumptions labeled as fact (RFU register needed).
- **COMPLETE** — Added 4 docs (`20`–`23`); upgraded 11 docs; re-scored honestly
  (IMPLEMENTATION-READY 95 → CONDITIONALLY READY 92). No code changed.

### V2 direct verification (lead)
- `rg "session.token|generateId" node_modules/better-auth/dist/db/internal-adapter.mjs`
  → confirmed `token: generateId(32)` raw at rest (SEC-11).
- `sed origin-check.mjs` → confirmed BA `originCheck` validates callbackURL against
  `trustedOrigins` (open-redirect control — was undocumented).
- `sed actions.ts:95-165` → confirmed `sanitizeNextPath` + `resolvePostAuthDestination`
  app-side open-redirect defense.
- `rg "accountLinking" src/lib/auth/` → confirmed NOT configured (SEC-14).
- `rg BETTER_AUTH_SECRET` → confirmed overloaded in `terms-gate-cookie.ts:14` (SEC-13).

---

## Open items (v2 — for implementation phase)

| Item | Owner | Status |
|---|---|---|
| Phase 0.5 (RFU-1/2/3/4 research) | impl agent | Not started (DISCOVERY-REQUIRED, unblocks 1.5 + 3) |
| Phase 1 (SEC-1) implementation | impl agent | Ready (not started) |
| Phase 1.5 (SEC-11) implementation | impl agent | Gated on Phase 0.5/RFU-1 |
| Phase 2 (SEC-3/4) implementation | impl agent | Ready, parallel-safe (not started) |
| Owner confirm closed-beta posture (ASSUMP-4) | Owner | Not blocking |
| Phase 4 CSP timing decision | Owner | Not blocking (defer ok) |
| Independent review of phases 1+1.5 | Owner/ reviewer | Recommended before prod rollout |

---

## 2026-07-10 — Full plan-pack implementation (lead implementer)

### Lead coordinator (implementer)
- **STARTED** — Autonomous IMPLEMENT_LOCAL execution of Landing-Page-Auth-Security-Layer.
  Supermemory ensure blocked by sandbox EPERM on `~/.supermemory` (recorded; continued with `.ai` authority).
  `plan-pack.json` absent (pre-schema pack); executed from `11_IMPLEMENTATION_PLAN.md` + requirements.

### Phase 0.5 RFU resolutions (DEC-AUTO)
- **RFU-1 / DEC-6 → (b) compensating controls:** Better Auth 1.6.23 has no session-token hash config;
  `internal-adapter.mjs` stores `token: generateId(32)` raw. Implemented: `cookieCache.enabled:false`,
  explicit `session.expiresIn: 7d`, least-privilege D1 bindings (standing), residual risk accepted.
- **RFU-2 / DEC-7 → disableImplicitLinking:** BA default can implicitly link trusted providers when
  local email is verified. Set `account.accountLinking.disableImplicitLinking: true`,
  `trustedProviders: ["google"]`, `requireLocalEmailVerified: true`, `allowDifferentEmails: false`.
- **RFU-3 / SEC-5:** BA rate-limit defaults to memory unless `storage:"database"` (or secondaryStorage).
  Set `rateLimit: { enabled:true, window:60, max:60, storage:"database" }` + migration
  `0041_better_auth_rate_limit.sql` + proof schema update. IP header: `cf-connecting-ip` only.
- **RFU-4 / DEC-9:** Cloudflare Tail/Workers Logs heuristically redacts URL hex/base64 ID substrings
  (token-like). Documented as mitigated by platform redaction + 5-min TTL; no app URL logging of verify links.
- **DEC-3 / FR-1:** Deploy-window guidance (not dual-path verify) for in-flight plaintext magic links.
- **DEC-8 / SEC-13:** Removed `BETTER_AUTH_SECRET` / publication fallbacks from terms-gate cookie;
  require `ARCHESTIMATOR_TERMS_GATE_SECRET` ≥32 chars.
- **ASSUMP-4:** Closed-beta allowlist treated as intentional (non-blocking).
- **Phase 4 / SEC-6:** DEFERRED — keep Report-Only CSP through launch; residual XSS risk recorded.
- **SEC-8 / SEC-9:** Remain P3 deferred per pack.

### Implementation COMPLETE markers
- Phase 1 (SEC-1): `storeToken:"hashed"` production + proof; expiresIn 300; magic-link rateLimit 10/60.
- Phase 1.5 (SEC-11): DEC-6b compensating controls documented in config.
- Phase 2 (SEC-3/4): `loadRecipientProposals` action auth; estimate-sheets repo `canAccessProjectInD1`;
  charts/activity/location/data already via `getCurrentWorkspaceProject` / `listProjectEstimates` (audited);
  recipient-proposals repo already fail-closed; estimate-repository is in-memory adapter; estimate-schema-compat is pure normalize helpers (Option B / N/A).
- Phase 3 (SEC-5/7/12/13/14): rate limits + accountLinking + terms secret + schema contract (DEC-5b + 0041 rateLimit only) + log redaction decision.
- Phase 4 (SEC-6): deferred with residual risk.
- Phase 5 (SEC-2/10/ARCH-1): contract harness in `tests/vitest/landing-auth-security-layer-contracts.test.ts`;
  sign-out path confirmed to call BA `/api/auth/sign-out` which deletes D1 session rows.

### Security review
- Independent `ce-security-reviewer` lane: high finding (rateLimit table missing) → FIXED via 0041 + proof schema.
- Medium (spoofable IP headers) → FIXED (cf-connecting-ip only).
- Low (test lock for disableImplicitLinking) → FIXED.
- AgentShield scan on `src/lib/auth`: Grade A, 0 findings (config-oriented scanner; no secrets in diffs).

### Hosted proof (Phase 1.5 / 5.5)
- **BLOCKED-EXTERNAL / residual:** Hosted D1 hashed-token readback + live magic-link e2e +
  `cf:release-gates` production flags require deploy/env. Local contracts + type-check + focused Vitest prove code posture.
  Recorded as residual operational gate, not an open owner decision.

### COMPLETE — ready to archive after verification evidence recorded.
