# 15 — Decisions, Assumptions, and Alternatives

## Key decisions

### DEC-01 — Plan profile: `exhaustive`
- **Problem:** what planning depth? **Options:** compact / standard / exhaustive.
- **Reason:** touches auth, public surfaces, data integrity, release readiness — the
  brief explicitly requires exhaustive audit. **Rejected:** standard (insufficient for
  auth/release). **Consequence:** 20 docs; justified by blast radius.

### DEC-02 — Treat June audit as stale, not live
- **Problem:** the June audit is Supabase/RLS-framed; current code is D1/app-authz.
- **Reason:** current source contradicts June framing on every authz surface.
- **Rejected:** porting June findings forward without re-validation (brief forbids).
- **Consequence:** June retained as archaeology; supersession pointer (WP-09).

### DEC-03 — Severity calibration: control present-at-one-layer = defense-in-depth weakness, not a hole
- **Problem:** exploration flagged 6 "P0 missing-authz" findings.
- **Reason:** direct source read proved 5 had the control at another layer; 1
  (`recipient-proposals`) has it at the repo layer.
- **Decision:** downgrade to defense-in-depth weaknesses (LOW/MED) unless the remaining
  layer is also bypassable. **Rejected:** keeping exploration's P0 severity (would
  overstate risk and waste impl effort).

### DEC-04 — No migration introduced by this pack
- **Problem:** findings might imply schema change. **Reason:** all findings are
  code/config/test; the durable limiter reuse is append-only scope. **Consequence:** no
  rollback sequence, no D1 risk.

### DEC-05 — `verification_mode: emulated` ⇒ status `CONDITIONALLY READY`
- **Problem:** no independent verifier available in-session. **Reason:** suite authority
  contract caps emulated at 97 and (high-blast) at CONDITIONALLY READY. **Rejected:**
  claiming IMPLEMENTATION-READY (would be unsupported). **Consequence:** owner or
  independent review needed to elevate.

### DEC-06 — D1 limiter reuse over new mechanism (for WP-02)
- **Problem:** how to make estimate limit global. **Options:** (a) reuse
  `security_rate_limit_events`; (b) edge/WAF rule; (c) new table.
- **Reason:** (a) is the established pattern, append-only, free-tier cheap.
- **Rejected:** (c) (unnecessary schema); (b) useful as complement but owner-gated.

### DEC-07 — Keep Better Auth + D1 app-authz; do not reintroduce RLS
- **Reason:** codebase exited Supabase; D1 is SQLite-based; app-authz is correct.
- **Rejected:** SECURITY DEFINER/RLS (legacy, inapplicable to D1).

## Assumptions (validated unless noted)
- ASSUMP-01..05 — see Doc 02 (all repo-validated except ASSUMP-05 first-user-stage).

## Alternatives considered and rejected
- A separate API gateway / auth microservice — rejected (adds blast radius, no benefit).
- Middleware-only authz — rejected (resource ownership unknown at edge).
- zod adoption as a P0 — rejected as P0 (hand-rolled validation is adequate; P2 decision).
- Force branch/worktree per task — rejected (AGENTS.md shared-worktree policy).

## Open decisions (owner-gated)
- OPEN-01: edge/WAF free-tier rules (SEC-02 / WP-04).
- OPEN-02: CSP nonce pipeline timing (SEC-07 / WP-08).
- OPEN-03: zod vs documented hand-rolled standard (SEC-06 / WP-10).
- OPEN-04: closed-beta vs broad-launch severity bar for SEC-02/07.
- OPEN-05: independent/owner review to elevate from CONDITIONALLY READY.
