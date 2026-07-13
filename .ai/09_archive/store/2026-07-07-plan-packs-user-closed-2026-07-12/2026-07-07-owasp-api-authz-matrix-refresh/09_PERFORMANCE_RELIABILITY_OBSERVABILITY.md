# 09 — Performance, Reliability, Observability

This pack is authz-focused; the performance surface below is limited to **rate-limit /
DoS posture** (the auth-relevant perf dimension) plus observability of security events.

## Rate-limit / DoS posture (the core perf-for-security dimension)

### Current evaluators (implicit)
The rate limiters are validated by behavioral tests (e.g. `password-lockout-route`,
`compliance-privacy-request-route`, `comments.test.tsx`). There is **no dedicated
performance/load harness** for limiter throughput.

### Performance-goal contract (for the future implementation, if SEC-02/03 addressed)
| Metric | Baseline | Target | Measurement | Regression |
|---|---|---|---|---|
| Publication password lockout correctness | 5 fails → 429 | preserved | `password-lockout-route.test.ts` | any change breaks the count |
| Privacy intake atomic reserve+rollback | email+IP caps enforced | preserved under concurrency | `compliance-privacy-request-route.test.ts` (conditional reservation test) | parallel IP-only exceeds cap |
| Estimate action limiter global cap (post-SEC-03) | per-isolate (no global cap) | global cap across isolates | new cross-isolate test | two-isolate sim exceeds combined limit |
| D1 probe latency on hot path | unmeasured | p95 < 50ms typical | D1 `EXPLAIN` + Workers Observability | regression vs baseline |

### DoS vectors (residual)
| Vector | Severity | Control |
|---|---|---|
| Parallel attack on public surfaces consuming D1 quota | MED-HIGH (broad launch) | app-level D1 limits; no edge (SEC-02) |
| Estimate mutation flood | MED | in-memory limiter only (SEC-03) |
| CollaborationRoom socket flood | MED | per-message authz; no upgrade limit (SEC-04) |
| Oversized JSON body parse | LOW | post-parse clamps (SEC-06) |
| Client-error logging flood | LOW | in-memory 10/min/IP |

## Reliability / failure modes

| Failure | Behavior | Verified |
|---|---|---|
| D1 error during authz probe | fail-closed (deny) | `runAllowedProbe`; `d1-access-role-boundaries.test.ts:181` |
| Missing auth env (`BETTER_AUTH_SECRET`) | auth disabled (proxy redirects to login) | `cloudflare-better-auth-runtime.ts` |
| Missing publication secret | dev falls back to weak constant; prod throws | `security.ts` |
| Publication password lockout row expiry | correct password allowed after window | `password-lockout-route.test.ts:192` |
| Share session cookie tampering | HMAC verify fails → deny | `verifySharedLinkSessionCookieValue` |
| OAuth state mismatch | `Clear-Site-Data` reset + redirect | `worker.ts` `routeAuthCallbackStateMismatchRetry` |
| Magic-link replay | blocked (single-use hashed) | proof router `replayBlockedReady` |

## Observability

### What exists
- `account_security_events` D1 table: auth audit (`auth_email_link_requested`,
  `auth_google_started`, etc.) with keyed-HMAC `ip_hash`/`user_agent_hash`.
- `project_publication_events` + `shared_link_events`: publication telemetry (open,
  password_attempt/success/failure, comment, decision, download_attempt_blocked).
- `collaboration_audit_events`, `closed_beta_allowlist_audit_events`.
- Rate-limit rows in `security_rate_limit_events` (with `expires_at` for GC).

### Gaps (release-relevant, not authz-blocking)
- **No structured alerting** on: lockout threshold hits, rate-limit saturation,
  auth-failure spikes, DO socket exhaustion. (June audit F-LOG-02 carried forward.)
- **No dashboard** for security-event rates.
- These are **operational** gaps; they do not affect the authorization verdict.

## Cloudflare resource cost posture
- Free-tier / bundled limits (per AGENTS.md). No paid add-ons enabled.
- D1 read/write quota is the binding constraint for rate-limit-heavy paths — SEC-02/03
  mitigations must stay free-tier compatible (D1 limiter is cheap; WAF free rules are
  limited but available).
- Daily D1 backups + `cf:d1-restore-rehearsal` for recovery.

## Caching (auth-relevant)
- `getCurrentUserContext` is React `cache`-wrapped (per-request memoization only).
- Better Auth `session.cookieCache.enabled: false` — every session check hits D1 (good
  for security; costs one D1 read per request).
- Share/publication access rows memoized per-request via `React.cache`
  (`getCachedPublicationAccessRowByToken`).
- Publication routes `force-dynamic` + `Cache-Control: no-store` — no caching of private
  share data. Marketing pages `s-maxage=31536000` (public, cacheable).

## Performance evaluator summary
For this planning task, no performance evaluator is run (planning-only). The future
implementation of SEC-02/03/04 should add the cross-isolate limiter test and D1 probe
latency evidence named above. Passing ordinary tests is not sufficient to claim DoS
readiness; the cross-isolate test is the declared evaluator for SEC-03.
