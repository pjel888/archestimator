# 13 — Rollout, Rollback, and Operations

## Release gate (go/no-go for first external user)

| Gate | Owner | Status |
|---|---|---|
| REQ-CSRF-01 (invite origin) fixed OR owner-deferred with documented dependency | impl/owner | pending (WP-01) |
| REQ-RATE-02 (estimate durable limit) | impl | pending (WP-02) |
| REQ-DO-01 (WS upgrade limit) | impl | pending (WP-03) |
| REQ-TENANT-01 (isolation) verified | — | ✅ met |
| REQ-RATE-01 (public durable limits) verified | — | ✅ met |
| REQ-SECRET-01 (no raw creds) verified | — | ✅ met |
| REQ-NEG-01 (denial tests) for all P0 surfaces | — | ✅ met for estimates/library/publication/collaboration |
| Hosted GitHub controls (branch protection, CodeQL, Dependabot, secret scanning) | owner | ❌ external gap — currently 403/404 disabled per `current-state.md`; CI workflows temporarily disabled under `.github/workflows-disabled/`. Must be re-enabled + green before broad launch. Cannot be locally proven. |
| Edge/WAF decision (SEC-02) | owner | ❌ owner decision (closed-beta acceptable; broad-launch should) |
| Monitoring/alerting on security events (lockouts, rate saturation) | owner | ❌ ops gap (Doc 09) |

**Closed-beta readiness:** P0 code findings (WP-01/02/03) should land before first
external user. Hosted GitHub controls and edge/WAF are closed-beta-acceptable-but-track.

## Rollout strategy
- No feature flag required (findings are hardening, additive).
- Land WP-01/02/03 as small, independently revertable commits on the shared branch.
- Coordinate with concurrent agents via file-scope ownership (AGENTS.md).
- Each task lands with its focused test green before the next.

## Rollback
- WP-01/02/03/05/07/09: single-file or small-scope revert; no migration ⇒ no data rollback.
- WP-02 (durable estimate limit) uses append-only scope `estimate_action` ⇒ reverting
  the code stops enforcing; existing rows expire via `expires_at` GC. No cleanup needed.
- SEC-02 (if WAF approved): disable the rule in `wrangler.jsonc`/dashboard.

## Monitoring (post-release)
- Add structured alerts (gap, Doc 09): publication password lockout threshold hits,
  rate-limit saturation on public surfaces, auth-failure spikes, DO socket exhaustion.
- Add a dashboard query over `security_rate_limit_events` and `account_security_events`.
- These are operational, not authz-blocking.

## Post-release verification
- Re-run focused denial tests after deploy.
- Watch `account_security_events` for unexpected auth-failure patterns in the first
  48 hours of closed-beta.

## Stale-plan revalidation checklist (before executing this pack later)
- [ ] `git log --oneline -20` — confirm no authz-layer rewrite since 2026-07-07.
- [ ] Re-grep `src/app/api/**/route.ts` count vs Doc 03 (33 files).
- [ ] Re-grep `"use server"` modules vs Doc 03 Section D.
- [ ] Re-read `src/lib/authz/d1-access.ts` probes unchanged.
- [ ] Re-confirm `wrangler.jsonc` still has no `waf`/`rate_limit` binding (else SEC-02 stale).
- [ ] Re-confirm June audit README still has its guardrail.
