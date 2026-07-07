# Performance, Reliability, and Observability

Numeric budgets live in `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` — this document references them, defines the **evaluator contracts** and **measurement architecture**, and does not duplicate the numbers except where a target is needed inline for clarity.

---

## 1. Performance evaluator contracts (PERF-01)

Each row is a complete evaluator: baseline → target → command → fixture → runs/flake → regression threshold → rollback trigger → evidence location. Targets cite `27-*.md`.

| ID | Surface | Baseline (to capture) | Target (Enterprise MVP) | Measurement command | Fixture | Runs / flake | Regression threshold | Rollback trigger | Evidence location |
|---|---|---|---|---|---|---|---|---|---|
| EV-01 | `/` landing LCP | capture | LCP < 2.0s (`27-*.md` L54) | `bun run perf:measure-routes` (No throttle) + Playwright Performance-Timeline; optional Lighthouse local | prod-like landing | 10 runs, drop min/max, median | >15% vs baseline or >2.5s absolute | LCP p95 > 3.0s in prod RUM | `metrics/` + RUM sink |
| EV-02 | `/share/[token]` FMP | capture | FMP < 1.5s (`27-*.md` L51) | `e2e/shared-link-receiver.spec.ts` + `measure-shared-link-perf-budgets.ts`; Slow 3G via CDP | seeded 100-row estimate share | 10 runs median | >20% vs baseline | FMP p95 > 2.5s | `metrics/` |
| EV-03 | Workshop route transition | capture | <100ms target / <200ms beta (`27-*.md` L45) | `bun run test:e2e:perf` (`route-transition-performance.spec.ts`); authenticated via storage state | seeded project | 15 runs median (transitions are noisy) | >25% vs baseline or >200ms | median >300ms | `metrics/` + Playwright attach |
| EV-04 | Estimate row edit perceived latency | capture | <100ms (`27-*.md` L47, L89) | `e2e/estimates-crud-latency.spec.ts` + `performance.now()` marks | 100-row estimate | 20 interactions | >100ms absolute (hard) | >200ms | `metrics/` |
| EV-05 | Tree render 500 nodes | capture | <500ms (`27-*.md` L47) | `tests/vitest/perf/` + React Profiler | 500-node fixture | 5 runs | >30% vs baseline | >1.5s | vitest perf artifact |
| EV-06 | Component library 1,000 items | capture | <1s (`27-*.md` L48) | `perf:library-baseline` (`measure-library-performance-baseline.ts`) | 1,000-item library | 5 runs | >30% | >2s | `metrics/` |
| EV-07 | XLSX export 100/500 rows | capture | <2s / <5s (`27-*.md` L49–50) | `benchmark-proposal-workbook.ts` | 100/500-row estimates | 5 runs | >25% | >10s (500) | `metrics/` |
| EV-08 | Bundle: main chunk / first-load JS per route | capture | main <150KB gzip; per `27-*.md` route table | `ANALYZE=true bun run build` + `scripts/check-performance-budgets.mjs` (`.next/diagnostics/route-bundle-stats.json`) | production build | 1 build | >10KB gzip main (`27-*.md` Rule 9) | any route over `PERF_BUDGET_KB` when strict | CI artifact + `metrics/` |
| EV-09 | Estimate shell streaming (skeleton before content) | capture | skeleton paints before async chrome | `e2e/estimates-shell-streaming.spec.ts` | seeded project | 5 runs | skeleton not first | skeleton never appears | Playwright attach |
| EV-10 | bfcache back/forward restore | `pageshow.persisted` (today false in automation) | restore <1.5s (`route-transition-performance-budgets.json`) | Playwright + manual Chrome DevTools (known gate) | two-route control | manual + automated | n/a | restore fails | `metrics/` + manual evidence |

**Flake policy:** drop min/max for <10-run sets; report median + p95; re-run on >15% variance. Authenticated evaluators name the auth fixture (`PLAYWRIGHT_STORAGE_STATE` or seeded dev auth).

**Implementation note:** authenticated scenarios currently skip in CI (PERF-04). Until fixed, authenticated evaluators run locally/on-demand and are posted as artifacts.

## 2. Measurement architecture

### 2.1 Layers
- **Local/static:** bundle analyzer, `route-bundle-stats.json`, type/lint checks.
- **Local automated:** Vitest perf tests (render baselines, RPC contracts), `perf:*` scripts.
- **Browser/manual:** Playwright route-transition suite (CDP throttle), `estimates-shell-streaming`, `estimates-crud-latency`, manual Chrome DevTools for bfcache/Profiler.
- **Provider-backed:** Cloudflare Workers Observability (logs/traces 5–10% sampling), `cf:verify-hosted-performance`, `cf:d1-runtime-performance-proof`, hosted route probes.
- **Production RUM (GAP):** none today → PERF-02 owner-gated beacon.

### 2.2 What must be true before a perf claim
- The evaluator command was actually run and exited 0 (or documented advisory).
- Baseline captured in `metrics/` with date + commit.
- Regression threshold named and checked.
- For prod claims: RUM or hosted proof, not local-only.

### 2.3 "How to measure a new feature" procedure (to live in the protocol/skill)
1. Identify which EV-* evaluator(s) the feature touches.
2. Capture baseline at the current commit into `metrics/<feature>-baseline.<md|json>`.
3. Implement.
4. Re-run the evaluator; compare; record `metrics/<feature>-after.<md|json>`.
5. If regression > threshold, stop and fix or document `ACCEPTED RISK` with owner approval (`27-*.md` Regression Policy).
6. For bundle impact: run `ANALYZE=true bun run build` + budget script.

## 3. Production RUM / Core Web Vitals design (PERF-02, owner-gated — refined 2026-07-07)

**Gap:** `WebVitalsProbe` is dev-only (`NEXT_PUBLIC_PERF_TRACE`), `console.log` only. No prod CWV signal.

**Default recommendation (refined after deeper Cloudflare research — see `23_CLOUDFLARE_COST_AND_RESOURCE_BUDGET.md`):**

- **Tier 1 (default, recommended): Cloudflare Web Analytics built-in beacon.** Free, cookie-free, no consent, already reports **LCP/INP/CLS**, unsampled ingestion, 6-month dashboard. Adds only the `beacon.min.js` snippet (auto-injected on proxied sites). Satisfies PERF-02 with **zero Worker code, zero log quota, zero DB, zero paid add-on**.
- **Tier 2 (only if custom dimensions needed): flag-free Worker emitting one structured JSON `console.log` per beacon into Workers Logs** (free sink, 200,000 events/day, 3-day retention; `head_sampling_rate` tunable). JSON auto-indexed + Query Builder. Keep `nodejs_compat` OFF; mirror `/api/internal/client-error` safety (same-origin + Fetch-Metadata, `MAX_BODY_BYTES`, whitelist+clamp, query/fragment strip, `no-store`, anonymous 204) AND use a **durable** rate limiter (`security_rate_limit_events`), not the per-isolate `Map` (SEC-09).
- **Tier 3 (rejected under free-tier posture): paid APM** (Sentry/OTel/Datadog) — only if owner explicitly approves a paid add-on.

**Redaction (Tier 2):** payload = `{ metric, value, id, rating, routePath, deviceType }`. **No** user id, email, project id, estimate cost, token, query string (strip query + fragment). CSP `connect-src` allows same-origin beacon only. Idle-deferred via `sendBeacon` on `pagehide`. Sampling: 100% INP; ~10% LCP/CLS/TTFB to stay under Workers Logs 200k/day free cap.

**Why this changed from the original pack:** original proposed a custom Worker beacon to "Workers Observability custom metric." Research confirmed (a) Cloudflare Web Analytics already provides free CWV with no Worker code, and (b) Workers Logs (not a "custom metric" emitter) is the free queryable-structured-log sink with a 200k/day cap. Tier 1 is strictly cheaper/lower-risk; Tier 2 is the custom-dimension fallback.

**Implementation readiness:** design is implementation-ready; **owner confirms Tier 1 vs Tier 2 (OPEN-PERF-01)**. Tier 1 unblocks with minimal risk.

### 3.1 Free-tier caps that bound the RUM decision (cite `23_...md`)
- Workers requests/day: 100,000 (Free).
- Workers Logs events/day: 200,000 (Free), 3-day retention; `head_sampling_rate` is the lever.
- D1 rows written/day: 100,000 → **wrong store for CWV** (reject).
- Queues ops/day: 10,000 (~3.3k beacons), 24h retention → **wrong store** (reject).
- Web Analytics: free, unsampled ingestion, 10-site soft cap → **right default**.

## 4. Reliability

- **Failure modes:** DB slow → skeleton then content or error boundary; API 5xx → error UI; network drop → perpetual-skeleton escape (REL-02); mutation conflict → rollback + toast; bfcache restore → `BfcacheHandler`.
- **Timeouts/retries:** TanStack `retry:1`; mutations `retry:0` (intentional); Server Actions define their own; XLSX/PDF background job if long (`27-*.md`).
- **Graceful degradation:** loading skeleton + error boundary everywhere needed (UX-01/02).
- **Recovery:** error.tsx "Try again" (`unstable_retry`); global-error last resort.

## 5. Observability (current + planned)

| Signal | Today | Planned |
|---|---|---|
| Client errors | `postClientErrorReport` (`/api/internal/client-error`) | keep; PII scrub (`27-*.md` Rule 8) |
| CWV (RUM) | none | PERF-02 beacon (owner-gated) |
| Route transition timing | Playwright in-test only | + RUM transition duration |
| Bundle size | CI advisory gate | PERF-03 strict (owner-gated) |
| Worker logs/traces | Cloudflare 5–10% sampling | keep; add CWV custom metric |
| D1 query perf | `perf:dashboard-query-count`, `cf:d1-runtime-performance-proof` | keep |

**Alert thresholds (planned, post-RUM):** LCP p95 > 3.0s; INP p75 > 200ms; CLS p75 > 0.1; error rate > 1%. Owners + dashboards named at implementation.

## 6. Rollout performance gates (cross-ref `13_ROLLOUT...md`)

- Merge gate (proposed): type-check + lint + design lint + unit + vitest + bundle advisory + e2e smoke + `test:e2e:perf` (current CI).
- Closed-beta gate (proposed): + EV-01/02/03/08 baselines captured; RUM beacon live; PII scrub verified.
- Production gate (proposed): + strict bundle budget; authenticated CI perf coverage; RUM p95/p75 within thresholds for 7 days.
- Rollback triggers per EV-* table.
