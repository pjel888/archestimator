# 09 — Performance, Reliability, and Observability

## Performance impact assessment

This plan is **low performance-risk** — it's auth config hardening, not a hot-path
optimization. But two items warrant attention:

### 1. Cookie-cache disabled (existing — not introduced by this plan)

- **Current:** `cookieCache.enabled:false` + `disableCookieCache:true` always.
- **Effect:** Every authenticated request does a D1 `getSession` read.
- **Trade-off:** Security (always validate live session) over latency.
- **This plan's stance:** Keep disabled (security decision). Monitor D1 read load;
  if it becomes a measured bottleneck at scale, revisit with a short cookie-cache
  TTL — but that's a separate owner decision (RISK-10), not in scope here.

### 2. SEC-3 repository authz probes (phase 2)

- **Effect:** +1 D1 read (`SELECT 1 ... WHERE EXISTS`) per repository call on
  affected repos, including hot paths (estimate sheet).
- **Mitigation:** Where the caller is already authoritative (has run `canAccess*`),
  prefer Option B (typed `AuthenticatedRequestContext` param) to avoid the double-read.
  Where the probe is pure defense-in-depth, accept the +1 read (safety > 1 read).
- **Evaluator:** If estimate-sheet latency is a concern, measure query count
  before/after with a D1 query-count probe. The `2026-07-08/Project-Estimate-Sheet-Performance-Optimization`
  pack is the relevant context for estimate-sheet perf.

### Performance budgets (auth layer)

| Metric | Target | Source |
|---|---|---|
| `/login` TTFB | < existing baseline (no change) | Cloudflare Analytics |
| Magic-link request latency | < existing baseline | API duration |
| `getSession` D1 read | existing (cookie-cache disabled) | D1 metrics |
| SEC-3 probe overhead | +1 read/repo-call (accept) | D1 query count |

No separate perf harness required. If phase 2 surfaces a regression, use the
repo's existing D1 query-count tooling.

## Reliability

### Failure modes

| Failure | Behavior | Recovery |
|---|---|---|
| D1 unavailable during `getSession` | Auth fails closed → user redirected to login (no session) | D1 recovery; user re-auths |
| Cloudflare Email down (magic-link send) | `sendCloudflareEmail` returns `{ok:false}` → magic-link action throws → user sees error | Email service recovery; user retries |
| Google OAuth down | Social sign-in fails → user sees error | Google recovery |
| `BETTER_AUTH_SECRET` unset/short | Provider returns 503 (fail-closed, `runtime.ts:13`) | Set the env |
| Rate-limit backing store unavailable | Depends on SEC-5 adapter choice (RISK-4) | Fall back to WAF or fail-open/closed per adapter |

### Degraded modes

- Auth provider disabled (`ARCHESTIMATOR_AUTH_PROVIDER` unset): middleware falls
  to cookie-presence check only; protected routes redirect to login if no cookie
  (`request-proxy.ts:214–225`). This is the degraded fallback — **must confirm
  hosted env has the provider enabled** (RISK-9).

## Observability

| Signal | Source | Owner |
|---|---|---|
| Auth failures (sign-in/verify) | Cloudflare Workers Logs / `wrangler tail` | Impl/Ops |
| Local dev auth errors | `logs/dev.ndjson` via `bun run logs:debug` | Dev |
| Rate-limit denials (post-SEC-5) | Workers Logs | Impl/Ops |
| Account security events | `account_security_events` D1 table | Audit |
| CSP violations (post-SEC-6) | CSP report endpoint / Workers Logs | Impl |
| Session-establishment success rate | Workers Logs (post-phase-1 deploy) | Impl |

**Note (per repo policy):** local logs are NOT hosted proof. Hosted auth diagnosis
uses Cloudflare Workers Logs/Real-time logs/`wrangler tail`.

## Operations runbook (auth-related)

| Scenario | Action |
|---|---|
| Sign-in broken after phase 1 deploy | Revert the 1-line config; investigate verify path |
| Users rate-limited legitimately (phase 3) | Raise threshold in config |
| CSP breaks workshop (phase 4) | Revert to Report-Only |
| Suspected session minting (pre-phase-1) | Check `verification` table for plaintext tokens; expedite SEC-1 |
| `ARCHESTIMATOR_AUTH_PROVIDER` unset | Set env to `better-auth`; redeploy |

## Monitoring commands (existing repo tooling)

```bash
bun run ops:agent-debug-snapshot      # readiness picture
bun run ops:check-observability       # observability gates
bun run logs:debug                    # local dev errors
wrangler tail                         # hosted runtime
```

## Rollback performance gates

Per `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`:
- Phase 1: 1-hour sign-in success-rate watch post-deploy; rollback if spike in failures.
- Phase 3: 24-hour rate-limit-denial review.
- Phase 4: 1-week workshop watch (if pursued).

No hosted/provider performance baseline comparison needed (changes are config-level,
not architecture-level). If a performance regression is suspected, compare
Cloudflare Analytics before/after the deploy window.
