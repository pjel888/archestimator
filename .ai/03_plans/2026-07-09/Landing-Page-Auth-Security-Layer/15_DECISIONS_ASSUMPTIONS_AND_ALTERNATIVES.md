# 15 — Decisions, Assumptions, and Alternatives

## Major decisions

### DEC-1 — Keep Better Auth (Google OAuth + magic link) as the sole auth stack

- **Problem:** Confirm the auth architecture satisfies "only Google + magic link."
- **Options:** (a) Keep BA as-is; (b) add password login; (c) add 2FA/admin plugins.
- **Recommendation:** (a) — matches owner intent exactly. Password login is
  explicitly disabled by design (no `emailAndPassword` plugin).
- **Reason:** Owner stated the only entry paths should be Google OAuth and magic
  link. The current config delivers exactly that.
- **Consequences:** No password-reset flow needed (magic link is the credential).
  Closed-beta curation via D1 allowlist.
- **Conditions to change:** Owner wants password login or 2FA → add the plugins.

### DEC-2 — Hash magic-link tokens via `storeToken:"hashed"` (not a custom hasher)

- **Problem:** SEC-1 — tokens are plaintext at rest.
- **Options:** (a) `storeToken:"hashed"` (Better Auth's built-in `defaultKeyHasher`);
  (b) custom pre-hash before calling the plugin; (c) encrypt the column at rest.
- **Recommendation:** (a) — it's a one-line config, uses Better Auth's vetted
  hasher, and the verify path is automatic (per Task 1.1 confirmation).
- **Rejected:** (b) adds custom crypto (risk) and may double-hash; (c) overkill
  (hashing is sufficient since the token is single-use and short-lived).
- **Consequences:** Tokens are unrecoverable from the DB (good). In-flight
  tolerance handled by deploy-window guidance (DEC-3).

### DEC-3 — Deploy-window tolerance (not dual-path verify) for in-flight magic links

- **Problem:** SEC-1 deploy may break magic links issued in the 5-min window.
- **Options:** (a) deploy-window guidance (documented); (b) dual-path verify (try hash then plaintext).
- **Recommendation:** (a) — simplest, no downgrade path to maintain, closed-beta
  traffic is low, affected users just re-request a link.
- **Rejected:** (b) adds complexity, a hard-to-remove downgrade path, and touches
  Better Auth internals.

### DEC-4 — Defense-in-depth via repository authz probes OR typed context (per repo)

- **Problem:** SEC-3 — 8 repos lack internal authz.
- **Options:** (a) add `canAccess*` probe per repo; (b) typed `AuthenticatedRequestContext` param.
- **Recommendation:** Per-repo: (a) where resource ID is in the call and probe is
  cheap; (b) where the caller is already authoritative (avoids double-read).
- **Reason:** Balances safety vs. D1 read cost on hot paths.

### DEC-5 — Schema contract (not committed DDL) for BA core tables

- **Problem:** SEC-7 — BA tables not in migration pipeline.
- **Options:** (a) commit DDL as `0041_*.sql`; (b) documented contract + readiness gate.
- **Recommendation:** (b) — BA owns its schema (regenerates via `getMigrations`);
  committing DDL risks drift/conflict. The existing
  `check-cloudflare-d1-auth-realtime-readiness.ts` gate verifies columns match.

## Assumptions (from 02)

| ID | Assumption | Status | Validation path |
|---|---|---|---|
| ASSUMP-1 | BA 1.6.23 `storeToken:"hashed"` uses `defaultKeyHasher`, verify auto-compares | Unverified → Task 1.1 | Read `node_modules` source |
| ASSUMP-2 | BA core tables exist on remote D1 | Likely true (runtime-applied) | Phase 1.5 readback |
| ASSUMP-3 | Hashing won't break in-flight tokens (handled by DEC-3) | Decided | Deploy-window guidance |
| ASSUMP-4 | Closed-beta allowlist is owner-intentional | Unverified (non-blocking) | Owner confirmation |
| ASSUMP-5 | CSP Report-Only has no blocking violations | Unverified → Task 4.1 | Log review |
| **RFU-1** | BA supports session-token hashing via config (for SEC-11) | **Unverified → Task 0.5.1** | Read `internal-adapter.mjs` + BA session docs |
| **RFU-2** | BA default `accountLinking` behavior is safe (for SEC-14) | **Unverified → Task 0.5.2** | Read BA account-linking impl + docs |
| **RFU-3** | BA rate-limit backing is durable on Workers (for SEC-5) | **Unverified → Task 0.5.3** | Read BA rate-limit impl + Cloudflare docs |
| **RFU-4** | Cloudflare Workers Logs redacts `?token=` query params (for SEC-12) | **Unverified → Task 0.5.4** | Cloudflare logs docs / `wrangler tail` test |

### DEC-6 — SEC-11 session-token-at-rest approach (gated on RFU-1)

- **Problem:** `session.token` is raw in D1 (`internal-adapter.mjs:182,202`). Verifier-compromise risk.
- **Options:** (a) BA session-hash config if it exists; (b) compensating controls (tight D1 access + short TTL + IP/UA binding + accepted risk); (c) custom session override.
- **Recommendation:** Depends on RFU-1. Prefer (a); if unavailable, (b) with owner sign-off; (c) only if both fail.
- **Reason:** BA's session model uses `token` as a lookup key — hashing may not be a simple config. This is why SEC-11 is P1 not P0 (less clean than SEC-1).
- **Decision owner:** Lead + Owner (operational controls are owner-owned).

### DEC-7 — SEC-14 accountLinking policy (gated on RFU-2)

- **Problem:** Magic-link + Google on same email — merge behavior unverified (ATO/lockout risk).
- **Options:** (a) confirm BA default is safe → document; (b) set `accountLinking:{enabled:false}`; (c) keep closed-beta curation as defense + document.
- **Recommendation:** Depends on RFU-2. Prefer (a)/(b); closed-beta curation remains the primary defense regardless.
- **Decision owner:** Lead + Owner.

### DEC-8 — SEC-13 secret separation

- **Problem:** `BETTER_AUTH_SECRET` overloaded (3 uses).
- **Options:** (a) distinct required env secrets (`ARCHESTIMATOR_TERMS_GATE_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`), remove fallback; (b) rotation runbook.
- **Recommendation:** (a) — cleaner separation; staged deploy with new envs first (RISK-15).
- **Rejected:** (b) keeps the coupling risk.

### DEC-9 — SEC-12 log-leak mitigation (gated on RFU-4)

- **Problem:** Magic-link token in verify URL may persist in Workers Logs.
- **Options:** (a) confirm Cloudflare redacts → document safe; (b) app-level URL redaction; (c) accept risk (5-min TTL).
- **Recommendation:** Depends on RFU-4. Prefer (a); (c) acceptable given short TTL if (a)/(b) infeasible.

## Assumptions register (v2 — with research follow-ups)

| Alternative | Why rejected |
|---|---|
| Add password login | Owner explicitly wants Google + magic link only |
| Replace Better Auth | Current stack is sound; replacement is high-blast-radius with no benefit |
| Encrypt verification column at rest | Overkill vs. hashing (single-use, short-lived tokens) |
| Dual-path magic-link verify | Complexity + downgrade path; deploy-window suffices for closed beta |
| Commit BA DDL as migration | Drift/conflict risk; BA owns its schema |
| Rely on Cloudflare WAF rate-limit alone (no BA rate-limit) | WAF is coarse (IP-based); BA per-identifier limit is finer — but BA limiter must be D1/KV-backed on Workers (RISK-4) |
