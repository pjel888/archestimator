# 16 — Requirements Traceability Matrix — Production RUM And CWV Telemetry

Every requirement traces to source, user outcome, phase, task(s), code areas,
acceptance criteria, test coverage, and rollout check. No requirement untraced.

| Req ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| METRIC-01 (P0) | PROMPT "Define metrics" | CWV measured | P2 | T-2.1–2.4 | `rum-client.ts`, `RumReporter.tsx` | AC-METRIC-01a/b | `rum-client.test.ts` | beacon delivery gate | ready (landing); workshop gated |
| METRIC-02 (P1) | PROMPT "Define metrics" | TTFB/FCP diagnostics | P2 | T-2.3 | `rum-client.ts` | AC-METRIC-02a | `rum-client.test.ts` | dashboard | ready |
| METRIC-03 (P0) | web.dev thresholds | correct rating bands | P2 | T-2.3 | `rum-client.ts` | AC-METRIC-03a | `rum-client.test.ts` | release gate | ready |
| COLLECT-01 (P0) | PROMPT "collection point" | global coverage | P2 | T-2.4/2.5 | `providers.tsx`, `RumReporter.tsx` | AC-COLLECT-01a/b | `RumReporter.test.tsx` | deploy | ready |
| COLLECT-02 (P0) | DEC-01 | transport control | P2 | T-2.1/2.4 | `package.json`, imports | AC-COLLECT-02a/b | import grep, `type-check` | bundle budget | ready |
| COLLECT-03 (P1) | PROMPT "privacy" | safe attribution | P5 | T-5.4 | `rum-client.ts` | AC-COLLECT-03a | `rum-client.test.ts` | review | ready |
| TRANSPORT-01 (P0) | web.dev field guide | reliable delivery | P2 | T-2.3 | `rum-client.ts` | AC-TRANSPORT-01a/b | `rum-client.test.ts` | beacon delivery | ready |
| TRANSPORT-02 (P0) | web.dev field guide | mobile reliability | P2 | T-2.4 | `RumReporter.tsx` | AC-TRANSPORT-02a/b | `RumReporter.test.tsx` | TEST-04 bfcache | ready |
| TRANSPORT-03 (P0) | DEC-03 | same-origin, no 3p | P2/P3 | T-2.3/3.1 | `rum-client.ts`, route | AC-TRANSPORT-03a | `rum-client.test.ts` | CSP review | ready |
| TRANSPORT-04 (P0) | PROMPT "privacy" | small beacons | P2 | T-2.3 | `rum-client.ts` | AC-TRANSPORT-04a | `rum-client.test.ts` | AQ-10 | ready |
| SAMPLE-01 (P0) | PROMPT "sampling" | free-tier safe | P2 | T-2.3 | `rum-client.ts` | AC-SAMPLE-01a/b/c | `rum-client.test.ts` | AE budget | ready |
| SAMPLE-02 (P1) | abuse defense | cap | P3 | T-3.2 | route | AC-SAMPLE-02a | route unit test | AQ-1 | ready |
| SAMPLE-03 (P1) | aggregation math | upweightable | P2 | T-2.3 | `rum-client.ts` | AC-SAMPLE-03a | `rum-client.test.ts` | dashboard | ready |
| PRIV-01 (P0) | PROMPT "privacy" | cookieless | P2 | T-2.4 | `RumReporter.tsx` | AC-PRIV-01a | `RumReporter.test.tsx` | review | ready |
| PRIV-02 (P0) | PROMPT "privacy"/GDPR | no PII | P2/P3 | T-2.3/3.3 | client+server | AC-PRIV-02a | allowlist tests | AQ-2 | ready |
| PRIV-03 (P0) | PROMPT "privacy" | no ids | P5 | T-5.1 | `rum-route-bucket.ts` | AC-PRIV-03a/b | `rum-route-bucket.test.ts` | AQ-6 | ready |
| PRIV-04 (P0) | GDPR | no IP | P3/P4 | T-3.2/4.2 | route/server | AC-PRIV-04a | route unit test | AQ-7 | ready |
| PRIV-05 (P0) | DEC-05 | no geo | P3 | T-3.4 | route | AC-PRIV-05a | grep test | AQ-8 | ready |
| PRIV-06 (P0) | consent | landing consent | P1 | T-1.3 | `LandingAnalyticsLoader` | AC-PRIV-06a | DOM test | deploy | ready |
| PRIV-07 (P0) | DEC-03 | workshop no managed | P5 | T-5.1 | grep | AC-PRIV-07a | grep+DOM | AQ-5 | ready |
| PRIV-08 (P1) | GDPR notice | disclosure | P9 | T-9.3 | privacy page | AC-PRIV-08a | review | owner review | blocked (OPEN-CONSENT-01) |
| PRIV-09 (P0) | owner-gated | workshop decision | P2 | T-2.5 | flag | AC-PRIV-09a | traceability | owner decision | blocked (OPEN-CONSENT-01) |
| SINK-01 (P0) | PROMPT "storage" | AE primary | P4 | T-4.1–4.3 | `wrangler.jsonc`, `rum-server.ts` | AC-SINK-01a | `rum-server.test.ts` | OPEN-EVID-01 | ready |
| SINK-02 (P1) | PROMPT "retention" | long windows | P6 | T-6.1/6.2 | migration, cron | AC-SINK-02a | cron unit test | D1 readback | ready |
| SINK-03 (P0) | PRIV-02 at sink | no PII at sink | P4 | T-4.2 | `rum-server.ts` | AC-SINK-03a | `rum-server.test.ts` | review | ready |
| SINK-04 (P0) | free-tier | budget alarm | P6 | T-6.3 | cron/query | AC-SINK-04a | runbook | daily check | ready |
| DASH-01 (P1) | PROMPT "dashboard" | p75 query | P7 | T-7.1 | runbook | AC-DASH-01a | sample-data proof | runbook | ready |
| DASH-02 (P1) | PROMPT "dashboard" | CF Web Analytics | P1 | T-1.1/1.2 | dashboard | AC-DASH-02a | OPEN-EVID-01 | provider proof | ready |
| DASH-03 (P2) | future | admin view | — | — | deferred | AC-DASH-03a | n/a | n/a | deferred |
| ALERT-01 (P0) | PROMPT "alert thresholds" | release gate | P7 | T-7.2 | query | AC-ALERT-01a | sample-data proof | release gate | ready |
| ALERT-02 (P1) | regression watch | poor-share | P7 | T-7.3 | query | AC-ALERT-02a | runbook | runbook | ready |
| ALERT-03 (P1) | sink health | data-loss | P7 | T-7.3 | query | AC-ALERT-03a | runbook | daily check | ready |
| COST-01 (P0) | PROMPT "no paid" | reject paid | docs | this doc | — | AC-COST-01a | doc review | — | ready |
| REL-CWV-01 (P0) | PROMPT "release decisions" | gate launch | P8 | T-8.1 | launch readiness | AC-REL-CWV-01a | cross-pack review | release gate | ready |
| SEC-01 (P0) | abuse | same-origin | P3 | T-3.1 | route | AC-SEC-01a | route unit test | AQ-4 | ready |
| SEC-02 (P0) | abuse | rate limit | P3 | T-3.2 | route | AC-SEC-02a | route unit test | AQ-1 | ready |
| SEC-03 (P0) | abuse | body/schema | P3 | T-3.3 | route | AC-SEC-03a | route unit test | AQ-2/10 | ready |
| SEC-04 (P0) | anonymity | no auth | P3 | T-3.4 | route | AC-SEC-04a | grep test | review | ready |
| SEC-05 (P0) | log safety | redact | P3/P4 | T-3.4/4.2 | logger | AC-SEC-05a | route unit test | AQ-7 | ready |
| REL-01 (P0) | reliability | non-blocking | P2 | T-2.3 | `rum-client.ts` | AC-REL-01a | unit test | AQ-11 | ready |
| REL-02 (P1) | reliability | swallow 5xx | P2 | T-2.3 | `rum-client.ts` | AC-REL-02a | unit test | AQ-11 | ready |
| REL-03 (P0) | bfcache | preserve bfcache | P2 | T-2.4 | `RumReporter.tsx` | AC-REL-03a | `test:e2e:perf` | AQ-9 | ready |
| TEST-01–04 | testing | coverage | P9 | T-9.1 | tests | ACs | matrix | — | ready |
| DOC-01/02/03 | docs | runbook/notice/diagram | P9 | T-9.2/9.3 | docs | ACs | review | — | DOC-02 blocked (OPEN-CONSENT-01) |

## Performance-sensitive requirements — extra mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| Bundle (COLLECT-02) | current per-route JS | ≤ +3KB | `check-performance-budgets.mjs` | >3KB on any route | dynamic-import or revert |
| bfcache (REL-03) | green | green | `test:e2e:perf` | red | revert unload listener |
| Beacon delivery | n/a | writes arrive | AE SQL + CF Web Analytics | 0 writes w/ traffic>0 | check binding/route/CSP |

## Open decisions referenced

- `OPEN-CONSENT-01` (blocks PRIV-08, PRIV-09, DOC-02, workshop slice).
- `OPEN-EVID-01` (provider proof for SINK-01, DASH-02).
- `OPEN-PRIV-02` (geo enrichment, deferred).
- `ASSUMP-04` (AE retention).
