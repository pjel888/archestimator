# 09 — Performance, Reliability, and Observability

## 9.1 Performance contract (PERF evaluator)

CSP enforcement has exactly **one performance-relevant effect**: nonced routes must be
dynamically rendered (nonces cannot be baked into static pages). This affects only the
routes that are currently statically cached.

### Baseline (current)

| Route class | Rendering | Cache | TTFB (target) |
|---|---|---|---|
| `/share/:token` | dynamic (`force-dynamic`) | `no-store` | already dynamic — measure baseline |
| `/workshop/*` | dynamic (auth) | sensitive cache-control | already dynamic |
| `/invite/:token` | dynamic | sensitive cache-control | already dynamic |
| `/login`, `/signup`, `/access-required` | mostly dynamic | sensitive | already dynamic |
| `/auth/callback` | dynamic (redirect) | n/a | already dynamic |
| landing (`/`, `/about`, ...) | **static** | `s-maxage=31536000` (edge-cached) | **measured baseline required** |

### Target

| Route class | Rendering after nonced CSP | Perf impact |
|---|---|---|
| `/share`, `/workshop`, `/invite`, `/auth` | dynamic (unchanged) | **none** |
| landing | dynamic (if DEC-11 Option A) | **TTFB increases** — HTML no longer edge-cached; assets still cached |

### Performance evaluator contract (PERF-01)

| Field | Value |
|---|---|
| Baseline metric | HTML TTFB (p50, p95) per route |
| Target metric | landing TTFB p95 regression < DEC-11 threshold (recommendation: < 50ms over baseline, or owner-acceptable) |
| Measurement command | `bun run launch:verify-hosted-sensitive-routes` + a TTFB probe script (curl `-w %{time_starttransfer}` against preview deploy, 20 runs) |
| Fixture/data size | n/a (HTML responses) |
| Number of runs / flake | 20 requests per route, drop min/max, report p50/p95 |
| Regression threshold | > DEC-11 threshold → keep route Report-Only (Option B) |
| Related functional tests | TEST-03 browser proof (page renders + no CSP violations) |
| Evidence artifact | `09-ttfb-baseline.md` + `09-ttfb-after.md` in plan folder during implementation |

Passing ordinary tests is **not** enough to claim performance readiness — the TTFB
measurement is the declared evaluator.

### Bundle / RSC payload / client JS impact

- **None.** CSP adds headers; it does not change the JS bundle, RSC payload, or asset
  graph. No new client components. The nonce is a string in HTML, not a module.
- The `nonce` prop on `<Script>` does not add bundle weight.

### Query-count / DB impact

- **None.** No DB queries added (the one route handler is a logging endpoint that does
  not query the DB in P1).

## 9.2 Reliability

| Failure mode | Behavior | Detection | Recovery |
|---|---|---|---|
| Proxy throws during nonce gen | Request fails open (no CSP) | error rate in Workers Observability | Fix-forward; nonce gen is `crypto.randomUUID` (cannot throw in Workers) |
| Missing nonce on an inline script (enforced) | Script blocked → JS-dependent UI fails | CSP violation report + browser console | Add nonce (SEC-02); flip back to Report-Only (OPS-01) |
| Third-party script blocked (enforced) | Feature degrades (e.g., Maps, analytics) | CSP report | Add to allowlist or accept degradation |
| Double CSP header | Ambiguous browser behavior | Browser DevTools (two headers) | SEC-09: remove static CSP |
| Report endpoint down | Reports lost (no user impact) | endpoint 5xx rate | Best-effort; browsers retry briefly then drop |
| Report endpoint flooded | 429s; log volume | rate-limit counter | Rate-limit holds; aggregate sampling |
| Marketing page enforced without dynamic | Stale nonce reused → blocked scripts | CSP report (nonce mismatch) | §6.4: enforce only on dynamic routes |

### Graceful degradation

- Report-Only phase (P1, P2): **zero user-visible impact** from any CSP
  misconfiguration (violations logged, not blocked). This is the deliberate safety net.
- Enforced phases (P3–P5): a misconfigured policy breaks the affected route. Rollback
  (OPS-01) flips the route back to Report-Only in one config change.

## 9.3 Observability

| Signal | Source | Where | Threshold / use |
|---|---|---|---|
| CSP violation reports | `/api/csp-report` | structured logs (Workers Observability) | gate: zero unexpected violations over observation window (OPS-02) |
| Proxy CSP-set success/fail | proxy code path | structured logs | error rate > 0 → investigate |
| TTFB regression | hosted probe | `09-ttfb-*.md` artifacts | DEC-11 threshold |
| Report endpoint rate-limit hits | `/api/csp-report` | structured logs | sustained 429 → DoS investigation |
| Report endpoint 4xx (malformed) | same | same | spike → investigate scanner/bug |

**No new dashboard required for first-users.** Violation counts are queryable via
Workers Observability log filters. If durable counts are needed for OPS-02 automation,
that's a future task (Workers Analytics Engine binding) — flagged in `13`.

## 9.4 Alerting

- **During observation window (P1→P3):** alert if a route class shows a **new**
  violation type not seen before (could indicate a missing allowlist entry before
  enforcement).
- **Post-enforcement:** alert on violation **spikes** (could indicate a regression or
  an attack probing CSP).
- Alert channel: existing operational alerting (per
  `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets`).

## 9.5 Cold-start / first-use

- CSP header setting adds **negligible** time (string build + header set).
- `crypto.randomUUID()` is fast (microseconds).
- No new modules in the critical path beyond the small `src/lib/csp/` trio.

## 9.6 Performance summary

The only real performance risk is the **marketing-page dynamic flip** (DEC-11). It is
isolated to P5 (last phase), measured before flip, and reversible. All other routes
are already dynamic, so enforcement is free. The plan **does not** regress the
authenticated/token-bearing hot paths.
