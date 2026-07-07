# 09 — Performance, Reliability, and Observability

## Performance evaluator contract (PERF-2)

The executor must define thresholds from measurement, not guess. The contract:

| Field | Value |
|---|---|
| Baseline metric | (a) Inline XLSX export p95 duration + peak memory at fixture sizes 500/1000/2500 rows (existing `proposal-workbook-benchmark.test.ts` harness). (b) Snapshot publish duration. (c) `/share` read p95 (existing `cf:verify-hosted-performance`). |
| Target metric | Inline export p95 < 50% of `maxDuration` (i.e. < 30s) at the largest fixture; memory < ~80% of Worker envelope; async path engaged before p95 crosses ~70% of ceiling. Recipient staleness compute adds < 20ms p95 to `/share` read. |
| Measurement command | `scripts/benchmark-proposal-workbook` (exists) + a new streaming-memory probe; hosted: `cf:verify-hosted-performance`. |
| Fixture size | 500 / 1000 / 2500 rows (existing) + a threshold-crossing fixture (~1200 nodes / 3000 rows) + multi-tab (50). |
| Runs / flake | min 5 runs per fixture; report p50/p95; discard 1 outlier. |
| Regression threshold | > 15% p95 regression vs baseline fails the gate. |
| Related functional tests | checksum, immutability, streaming, redaction byte-scan. |
| Evidence artifact | benchmark JSON output committed to run log; hosted perf report. |

**Thresholds (DISCOVERY-REQUIRED):** the exact row/byte cutoff for inline-vs-stream-vs-async is set
from the evaluator at implementation start. The plan provides the *mechanism* (three bands), not
guaranteed numbers.

## Reliability

### Failure modes

| Failure | Detection | Behavior |
|---|---|---|
| Inline export timeout risk (> ceiling) | pre-check size vs threshold | route streams or enqueues job (202) |
| Job failure (worker exception) | queue DLQ + job state | job → `failed`, no package row issued, user retries |
| Checksum compute failure | exception before insert | no package row; error response |
| R2 write succeeds, D1 insert fails | insert returns error | orphan object flagged for reconcile (DISCOVERY); user retries (idempotent `correlation_id`) |
| Republish concurrent | D1 batch atomicity + `snapshot_version` | second sees bumped version |
| Recipient accept on stale version | existing version lock | 409 |
| Stale read of package (race) | append-only = no stale-write risk | readers always see consistent immutable rows |

### Retries / circuit breaking / graceful degradation

- Async job: Queue retry policy (existing DLQ); idempotent `correlation_id`.
- Rate limit (existing circuit-breaker pattern in `security.ts`).
- Degraded mode: if async path flagged off, inline path serves up to caps; above caps → 413
  (existing).

### Recovery

- Package table is additive — rollback = stop writing/consuming; data intact.
- Orphan R2 objects: reconcile job (DISCOVERY) or lifecycle rule.
- Corrupt package (failed insert mid-batch): D1 batch atomicity prevents partial; if non-batched,
  compensating delete on the package row.

## Observability

| Signal | Source | Schema (redacted) |
|---|---|---|
| Generation log | `logProposalExport` extended | `{estimateId, packageId, hashPrefix, kind, sizeBytes, audience, durationMs, outcome}` — no tokens/PII |
| Download audit | new D1 row | `{packageId, actorUserId or recipientId-hash, ip_hash, ua_hash, at}` |
| Publish/republish | existing `recordPublisherAuditEvent` → `account_security_events` | unchanged + `packageId`, `hashPrefix` |
| Job lifecycle | queue + job state | `{jobId, state, correlationId, packageId?, error?}` |
| Recipient open/accept | existing `project_publication_events` / `shared_link_events` | + `contentSha256` |

- **Metrics:** export count, p95 duration, job failure rate, 413 rate, async-vs-inline ratio,
  checksum-mismatch count (should be 0).
- **Dashboards:** Cloudflare Workers Observability (existing) + manual D1 queries for audit.
- **Alerts:** job failure rate > threshold; checksum-mismatch > 0 (integrity incident); 413 spike.
- **Tracing:** structured logs correlate via `packageId`/`correlationId`.

## Performance budgets

- Inline export: target p95 < 30s at max fixture; memory bounded by streaming where engaged.
- `/share` read: staleness compute adds < 20ms p95; otherwise unchanged.
- Client bundle: **no new client JS** for the core trust ledger (server-only); UI panel reuses
  existing primitives (minimal bytes).
- RSC payload: snapshot staleness is a few fields (negligible).
- D1 queries: +2 per export, +0 net per publish (batched), +1 cheap MAX per recipient read
  (existing).

## Performance regression risks

- Byte-scan redaction test over large buffers could be slow in CI → scan only at fixture size,
  not full 3000-row in every test (sample + full on a dedicated slow test).
- Async path adds operational complexity → flag-gated, rolled out staged.
