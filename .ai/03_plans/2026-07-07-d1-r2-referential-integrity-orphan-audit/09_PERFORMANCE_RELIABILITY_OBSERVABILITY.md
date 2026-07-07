# 09 — Performance, Reliability, and Observability

## Performance evaluator contract

The audit is a batch job, not a request-path operation. Performance is about **bounded detection cost** and **non-disruptive scheduling**, not p95 latency.

### Evaluator: detection dry-run

| Field | Value |
|---|---|
| Baseline metric | detection wall-clock on a seeded 10x fixture (≈10k rows per major table) |
| Target metric | ≤ 60s end-to-end dry-run on preview D1+R2 at current volume |
| Measurement command | `bun run cf:orphan-audit --dry-run --target preview` (timed) |
| Fixture size | seeded 10x: ~10 workspaces × 100 projects × 100 estimates × 10 rows; ~1000 upload_assets; ~500 R2 objects |
| Runs / flake policy | 3 consecutive runs; report median; flag if variance > 25% |
| Regression threshold | > 2x the baseline median = fail |
| Related functional tests | TEST-001 (detection correctness), PERF-001 (query plan) |
| Evidence artifact | `tests/vitest/perf/orphan-audit-baseline.ts` output + captured `EXPLAIN QUERY PLAN` per query |

### Evaluator: R2 reconciliation cost

| Field | Value |
|---|---|
| Baseline metric | `R2.list()` call count + estimated Class B cost on the seeded R2 set |
| Target metric | ≤ $0.01 estimated Class B cost per preview dry-run; ≤ owner-set cap for prod |
| Measurement | reconciliation module emits `list_calls` + `estimated_cost_usd` in the report |
| Regression threshold | > 2x baseline list_calls at same key count = fail |
| Evidence | report `r2_reconciliation` block |

## Performance budgets

| Surface | Budget |
|---|---|
| Detection (D1-only, Class A) | ≤ 30s on preview at current volume |
| R2 reconciliation (Class B/C) | ≤ 30s + bounded by cost cap |
| Repair (per class) | ≤ 10s per class batch |
| D1 query p95 (any single detection query) | ≤ 200ms at 10x fixture volume |
| R2 `list()` pages per run | capped; abort if `estimated_cost_usd > cap` |

If a budget is breached, the run reports `partial` with the breached dimension; it does not silently continue.

## Query-count / index expectations

- Each Class A edge → 1 paginated `LEFT JOIN`/`NOT EXISTS` query. ~25 edges → ~25 queries (some combined).
- `PRAGMA foreign_key_check` → 1 call.
- `PRAGMA foreign_keys` readback → 1 call.
- R2: 3 prefix-bounded `list()` traversals, paginated.

Index coverage assumption: most ref columns are indexed via `0031_performance_indexes_additive.sql` and composite FK indexes declared in 0007/0008/0015. PERF-001 requires capturing `EXPLAIN QUERY PLAN` and flagging any query that does a full scan on a table expected to exceed 100k rows at 100x.

## Cardinality assumptions

| Table | Current | 10x | 100x | 1000x |
|---|---|---|---|---|
| `upload_assets` | ~hundreds | ~10k | ~100k | ~1M |
| `estimate_sheet_events` | ~thousands | ~100k | ~1M | ~10M |
| `shared_link_events` | ~hundreds | ~10k | ~100k | ~1M |
| R2 objects | ~hundreds | ~10k | ~100k | ~1M |

At 100x+, the R2 reconciliation must sample or shard by workspace prefix to stay in budget. The cost cap is the safety valve.

## Reliability

- **Failure modes:**
  - (a) D1 read error → partial report, gap logged.
  - (b) R2 list error → partial reconciliation, gap logged.
  - (c) cost cap hit → abort reconciliation, report partial.
  - (d) migration parse failure (manifest) → hard error (cannot audit without the manifest).
  - (e) **`node:sqlite` ↔ hosted-D1 behavioral divergence** (P1-2, load-bearing for the local-first design): a detection query behaves differently in `node:sqlite` than in hosted Cloudflare D1 (e.g., a SQLite function nuance, a type affinity quirk, or a pragma default). Tests pass locally and miss/over-report in prod. **Mitigation:** a divergence-detection harness runs the same seeded fixture + detection queries against both `node:sqlite` and hosted preview D1, diffs the findings, and fails if they disagree. The first preview dry-run (Ring 1 in `13`) is the first real divergence check. If divergence is found, the affected query is tagged and either rewritten to a portable form or marked `hosted-only`.
  - (f) **R2 `list()` eventual-consistency lag** (P1-2): `list()` can briefly lag a just-deleted or just-put object, producing **false orphans** (Class B false positives) right after a delete, or missing a just-put object (false negative). **Mitigation:** detection reports are timestamped and marked "point-in-time"; **repair re-verifies every R2-object candidate with `R2.head(key)` immediately before delete** (the `06` allowlist `head()`-before-delete rule) — if `head()` says the object is gone, no delete is needed; if `head()` says it exists, the report's "orphan" finding is re-confirmed. A quiescence window (e.g., repair runs ≥15 min after detection) is recommended for prod.
- **Retry:** detection is read-only and safely retriable. Repair retries per-action idempotently; `head()` pre-check makes R2 deletes safe to retry.
- **Graceful degradation:** partial reports are first-class (the `gaps[]` field); never a silent empty report.
- **Recovery:** a failed dry-run leaves no state; a failed repair leaves an audit row + idempotent re-run.

## Observability

- **Structured output:** the JSON report is the primary observability artifact.
- **Metrics:** per-run `orphan_count_by_class`, `list_calls`, `estimated_cost_usd`, `fk_enforcement`, `duration_ms`. Emitted in the report.
- **Logs:** stdout summary is line-oriented for headless/CI parsing.
- **Dashboards:** none required; the report file is the dashboard. (Optional future: feed metrics into Workers Analytics — out of scope.)
- **Alerts:** P0>0 in a production dry-run → non-zero exit → CI/operator escalation.

## Rollout performance gates (also referenced in `13`)

| Gate | Metric | Source | Pass/fail | Rollback trigger |
|---|---|---|---|---|
| Preview dry-run completes | wall-clock ≤ 60s | timed run | ≤ 60s | n/a (read-only) |
| Preview R2 cost | estimated_cost_usd | report | ≤ cap | abort scan |
| No read-only violation | write-call count | TEST-002 harness | 0 | hard stop |
| Repair idempotency | re-run diff | repair test | empty | investigate |

## Cold-start

- Local `node:sqlite` harness cold-start: applying 38 migrations in-memory is expected < 2s (small schema). Measured by DATA-001 smoke test.
- Hosted D1: no cold-start concern (binding is warm).

## Memory / CPU

- Detection holds at most one page of rows in memory. The R2 reconciliation **streams** (does not materialize both key sets — resolved in `06` "Reconciliation algorithm"), so memory is bounded at O(page size) regardless of key count. At >100k keys, the scan shards by workspace prefix.

## Cache

- No cache. Detection must reflect current D1/R2 state.

## Residual performance risk

- R2 `list()` cost in production if object count grows faster than expected → cost cap + owner approval per run (OPEN cost approval in `20`).
- A detection query without index coverage at 100x → PERF-001 EXPLAIN gate catches it before prod.
