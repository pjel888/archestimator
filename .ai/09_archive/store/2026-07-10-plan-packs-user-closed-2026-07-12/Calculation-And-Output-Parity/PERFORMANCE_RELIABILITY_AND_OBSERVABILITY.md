# Performance, Reliability, And Observability

## Scope

This is the evaluator and operating-signal contract for `PERF-001`, `OPS-001`,
`AC-013`, `AC-015`, `TEST-007`, `GATE-004`, and the reliability portions of
UNIT-003/005/007. It records no measured result until an implementation receipt
exists.

## Measured Budgets

| Surface | Fixture | Target | Regression/stop trigger | Evaluator |
|---|---|---|---|---|
| Pure calculation | 5,000 rows, every branch, 20 warm samples | p95 <35 ms; linear growth | p95 >50 ms or unexplained superlinear growth | `scripts/benchmark-calculation-output-parity.ts` plus benchmark test |
| Project Data adapter | 5,000 rows, 100 buckets | No per-row query; bounded statements/payload; named-index plan; <=15% slower than current golden | Query/plan violation or >15% regression without measured benefit | query-budget test and current benchmark |
| Proposal model | 5,000 rows, 50 sections | p95 <150 ms | p95 >225 ms | model benchmark |
| XLSX generation | 10,000 rows, formulas on, 20 warm samples | <8 s; peak RSS <768 MB; artifact <25 MB | Any target exceeded | workbook benchmark/test |
| Print package | 2,000 rows, 20 estimates | Mount only for print; one copy; responsive browser | Persistent tree, duplicate, crash/hang | targeted browser probe |
| 50k request | Pure facts/export preflight | Bounded calculation or deterministic refusal before unsafe workbook allocation | Unbounded allocation or partial artifact | evaluator plus static refusal test |

Every performance receipt includes hardware, OS, Node/Bun/runtime versions,
fixture and diff hashes, warmup/sample count, p50/p95/max, delta and peak RSS,
query count/plan, payload/artifact bytes, failure count, timestamp, and artifact
digest. Local measurements are not hosted-production proof.

## Reliability Contract

- Calculation and model functions are deterministic for frozen input/version.
- Export captures one revision and is idempotent at the request/model boundary;
  retry does not merge old/new rows or duplicate charges.
- Allocation preflight occurs before large workbook structures are built.
- Failure returns no successful headers, download, public snapshot, or partial
  artifact.
- Compatibility adapters are independently revertible; immutable published
  snapshots are fixed forward with a new version, never rewritten.
- Temporary workbooks, XML extracts, local D1 fixtures, ports, servers, and browser
  contexts are resource-ledgered and deleted/stopped after digest capture.

## Structured Signals

Calculation normalization records stable error code and safe field name without
raw value. Export may record request ID, opaque project/estimate fingerprint, row
count, basis, currency, calculation version, formulas mode, duration bucket,
artifact bytes, and failure class. Public/share logging excludes credential,
token, snapshot payload, source URL, rate, customer text, and raw internal ID.

Existing structured logger/error helpers are mandatory; raw `console.error`,
empty catch, and swallowed generation failure are prohibited on touched paths.
`bun run validate:error-handling` is the static proof gate. This pack adds no
production alert/dashboard claim; a hosted signal would require separate hosted
evidence.

## Triage And Handback

Budget failure reopens the earliest owner that introduced the regression, not
automatically UNIT-007. The receipt identifies whether time, query count/plan,
payload, RSS, artifact size, responsiveness, or cleanup failed. Optimization
must preserve the golden oracle, public allowlist, and compatibility contract;
no budget is waived through a prose exception.

