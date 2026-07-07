# 12 — Test And Validation Strategy — Production RUM And CWV Telemetry

Choose the lightest proof that proves the claim (AGENTS.md). RUM is mostly
pure logic + a thin route; most claims are unit/DOM-provable. Browser proof is
reserved for TEST-03 (real beacon) and TEST-04 (bfcache).

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| METRIC-01/02/03 | `tests/vitest/rum-client.test.ts` | unit | new | seeded metric objects | `bun run test:dom` | payload has name/value/rating/id/delta/navigationType; rating passed through | none | impl |
| COLLECT-01/02 | `tests/vitest/RumReporter.test.tsx` | DOM | new | render `AppProviders` | `bun run test:dom` | `RumReporter` rendered once in providers; imports `web-vitals` | none | impl |
| COLLECT-03 | `tests/vitest/rum-client.test.ts` | unit | new | attribution selector | `bun run test:dom` | no element text in payload | none | impl |
| TRANSPORT-01 | `tests/vitest/rum-client.test.ts` | unit | new | mock sendBeacon/fetch | `bun run test:dom` | sendBeacon first, fetch keepalive fallback; no unload | none | impl |
| TRANSPORT-02 | `tests/vitest/RumReporter.test.tsx` | DOM | new | fire visibilitychange | `bun run test:dom` | flush listener registered + cleaned up | none | impl |
| TRANSPORT-04 | `tests/vitest/rum-client.test.ts` | unit | new | oversized payload | `bun run test:dom` | dropped, not sent | none | impl |
| SAMPLE-01/03 | `tests/vitest/rum-client.test.ts` | unit | new | seeded RNG | `bun run test:dom` | rate 0→never; rate 1→always; sampleRate in payload | none | impl |
| PRIV-01 | `tests/vitest/RumReporter.test.tsx` | DOM | new | beacon during render | `bun run test:dom` | no cookie/localStorage write | none | impl |
| PRIV-02 | `tests/vitest/rum-server.test.ts` + `rum-client.test.ts` | unit | new | extra keys | `bun run test:dom`/`bun test` | unknown keys dropped (allowlist) | none | impl |
| PRIV-03 | `tests/vitest/rum-route-bucket.test.ts` | unit | new | real route table + `?token=`/uuid/numeric | `bun run test:dom` | ids stripped; `unknown` fallback | none | impl |
| PRIV-04 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | request with IP header | `bun test` | no IP in sink payload or logs | none | impl |
| PRIV-05 | grep test (script or `tests/vitest/rum-no-cf-metadata.test.ts`) | static | new | source grep | `bun test` | no `request.cf` read in route/server | none | impl |
| PRIV-06 | `tests/vitest/landing-analytics-consent.test.tsx` | DOM | new | consent states | `bun run test:dom` | beacon only when `hasLandingAnalyticsConsent` | none | impl |
| PRIV-07 | grep + `tests/vitest/workshop-no-managed-analytics.test.ts` | static | new | grep | `bun test` | no managed-analytics import under workshop | none | impl |
| SINK-01/03 | `tests/vitest/rum-server.test.ts` | unit | new | mocked `env.RUM` | `bun test` | `writeDataPoint` called with allowlisted shape; no IP | none | impl |
| SAMPLE-02 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | flood requests | `bun test` | over cap → 204 + no write | none | impl |
| SEC-01 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | cross-origin/bad sec-fetch | `bun test` | rejected | none | impl |
| SEC-02 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | over rate limit | `bun test` | 204 + no write | none | impl |
| SEC-03 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | oversized/malformed | `bun test` | dropped | none | impl |
| SEC-04 | grep test | static | new | grep | `bun test` | no auth/session import in route | none | impl |
| SEC-05 | `tests/vitest/api-internal-rum-route.test.ts` | unit | new | logger spy | `bun test` | no raw body/IP logged | none | impl |
| SINK-02 | `tests/vitest/rum-rollup-cron.test.ts` | unit | new | mocked AE+D1 | `bun test` | upsert + retention delete | none | impl |
| REL-01/02 | `tests/vitest/rum-client.test.ts` | unit | new | throwing sendBeacon/500 | `bun run test:dom` | silent | none | impl |
| REL-03 | `e2e/route-transition-performance.spec.ts` (existing) | E2E | existing | existing | `bun run test:e2e:perf` | bfcache assertion green | none | impl |
| TEST-03 (end-to-end beacon) | `e2e/rum-beacon.spec.ts` (new) | E2E | new | public page | `bun run test:e2e -- e2e/rum-beacon.spec.ts` | intercept `/api/internal/rum`, well-formed payload | none | impl |
| TEST-04 (bfcache) | existing perf spec | E2E | existing | existing | `bun run test:e2e:perf` | green | none | impl |
| Bundle budget | `scripts/check-performance-budgets.mjs` (existing) | static | existing | build output | `bun run build` then run script | no route >budget by >3KB | none | impl |
| DASH/ALERT | (doc/runbook) | review | new | sample data | manual query | sane p75 | n/a | owner |

## Adversarial scenario matrix (UltraQA style — see also `19_…`)

| ID | User/attacker model | Scenario | Setup | Harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| AQ-1 | Attacker | flood `/api/internal/rum` | script POST loop | route unit test | rate-limit + cap → 204 no-write | planned |
| AQ-2 | Attacker | forge beacon with `?token=` in a URL field | crafted payload | route unit test | schema allowlist drops it | planned |
| AQ-3 | Attacker | forge huge value (LCP=999999) | crafted payload | route unit test | value-range sanity drops | planned |
| AQ-4 | Attacker | cross-origin POST | bad Origin/sec-fetch | route unit test | 403/204 reject | planned |
| AQ-5 | Bug | managed beacon loads on workshop | grep | static | no import found | planned |
| AQ-6 | Bug | route-bucket leaks uuid | uuid path | unit table | stripped to `:id` | planned |
| AQ-7 | Bug | IP logged | request with IP | unit + log spy | absent | planned |
| AQ-8 | Bug | `request.cf` read | grep | static | absent | planned |
| AQ-9 | Bug | unload listener breaks bfcache | existing perf spec | E2E | bfcache green | planned |
| AQ-10 | Bug | oversized beacon sent | 20KB payload | unit | dropped at 8KB | planned |
| AQ-11 | Network | sendBeacon throws | mock throw | unit | silent | planned |
| AQ-12 | Provider | AE over-quota | mocked reject | unit | log + 204 | planned |

## Performance evaluator (recap — see `09_…`)

Baseline: current per-route first-load JS + perf spec budgets. Target: ≤3KB JS
increase, no perf-budget red. Command: `perf:measure-routes` + `test:e2e:perf`.
Runs: 3, median. Rollback: dynamic-import or revert.

## Manual QA (only where required)

- Phase 1 provider proof: Cloudflare Web Analytics dashboard shows data (`OPEN-EVID-01`).
- Phase 4 provider proof: AE SQL API returns rows after a real beacon.
- Phase 9 privacy notice: owner review (`OPEN-CONSENT-01`).

## Known pre-existing reds / flake

None specific to this pack. The existing `e2e/route-transition-performance.spec.ts`
must remain green; if it is currently flaky, the implementation must not regress it.
