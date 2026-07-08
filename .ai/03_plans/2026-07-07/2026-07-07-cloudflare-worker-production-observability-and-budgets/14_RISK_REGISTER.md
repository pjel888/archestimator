# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | ALS context lost across OpenNext boundary | OpenNext re-enters isolate | Low | Med | Med | request id propagation | unit/integration test; `getRequestContext()` null | belt-and-suspenders header propagation | fall back to header read | generate fresh id (degraded correlation) | impl | low correlation gaps | open |
| RISK-02 | Header injection via inbound `x-request-id` | attacker sends CRLF/script | Med | Low | Low | response headers | unit test AQ-1/2/3 | strict regex validation | reject + fresh id | n/a | impl | none | open |
| RISK-03 | PII leak via AE dimensions | code emits raw value | Med | High | High | metrics store | unit test AQ-4 | allowlist + rejection | swallow error | disable AE binding | impl | none if tested | open |
| RISK-04 | PII leak via ad-hoc `console.*` | dev logs user data | Med | Med | Med | Workers Logs | console.* audit (T-9.1) | route through logger | redaction | grep CI check | impl | audit residual | open |
| RISK-05 | Retention backlog saturates D1 rows-written quota | large historical tables | Low | Med | Med | D1 budget | GraphQL D1 analytics | `maxRowsDeletedPerTick` guard | lower batch | raise guard / paid | impl | controlled | open |
| RISK-06 | DO fan-out amplification | room with many live sockets | Med | Med | Med | DO CPU | `getWebSockets().length` + log | `MAX_BROADCAST_TARGETS` cap | truncate + log | shard room | impl | bounded | open |
| RISK-07 | `exceededCpu` on proposal export | large workbook | Med | Med | Med | export route | Workers Logs `outcome` | (watch) document | stream/paginate | move to Queue | impl | export may fail under load | open (deferred mitigation) |
| RISK-08 | Workers Logs quota exhaustion | high traffic + 1.0 sampling | Low (pre-launch) | Med | Med | logs | dashboard | sampling walk-down schedule | lower sampling | paid tier | impl | manageable | open |
| RISK-09 | AE quota exhaustion | high request volume | Low | Low | Low | metrics | AE analytics | ≤1 pt/req + 250 cap | sample KPIs | paid tier | impl | manageable | open |
| RISK-10 | Worker `console.error` in catch duplicates route error log | both instrumentation and route-error log | Med | Low | Low | logs | grep / log review | dedupe by event | accept double-log | n/a | impl | minor noise | open |
| RISK-11 | `Server-Timing` cache pollution | header on cacheable response | Low | Med | Med | cache | unit test AQ-5 | gate + suppress on `public`/`no-store` | keep default off | disable flag | impl | none if gated | open |
| RISK-12 | Concurrent-agent edit collision on `worker.ts` | parallel impl lanes | Med | Med | Med | worker | ledger + re-read | file-ownership lease | serialize `worker.ts` edits | revert + redo | impl | managed by ledger | open |
| RISK-13 | AE binding name choice (DEC-07) blocks Phase 7/8 | owner undecided | Low | Low | Low | config | decision needed | recommend `ARCH_METRICS` | proceed with recommended | rename later | owner | trivial rename | open |
| RISK-14 | Traces disabled slows cross-service debugging | incident during beta | Low | Med | Med | tracing | n/a | keep `traceparent` ready | re-enable at 0.01 | paid tier | owner | acceptable pre-launch | open |
| RISK-15 | Native alerting weak on Free → undetected breach | quiet failure | Med | Med | Med | ops | self-poll cron | document gap | add GraphQL self-poll | external tooling | owner | residual until self-poll built | open |
| RISK-16 | AsyncLocalStorage nodejs_compat behavior change | Cloudflare runtime change | Low | Med | Med | request id | type-check + test | header fallback | header read | generate fresh id | impl | low | open |
| RISK-17 | Retention DELETE contention with user writes | backlog during peak | Low | Med | Med | D1 | D1 latency metrics | run at 03:00 (low traffic) | reschedule cron | lower batch | impl | low (off-peak cron) | open |

**No critical (P0-severity) risk is unmitigated.** RISK-03 (PII in AE) is the
highest severity and is mitigated by an enforced allowlist + adversarial test.
RISK-07 (export CPU) accepts residual risk with a documented fix-forward path
(Queue + email) deferred until it trips.
