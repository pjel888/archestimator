# 13 — Rollout, Rollback, and Operations

## Rollout sequencing

1. **Phase 0** (measurement) — land flakewatch tooling; no behavior change.
2. **Phase 1** (timeout tiers) — land tiered `testTimeout`; verify no new
   timeouts. Parallelism change is owner-gated and may land separately.
3. **Phase 2** (quarantine ledger + validator) — land empty ledger + validator;
   no test skipped yet.
4. **Phase 3** (remediation) — land per-file fixes incrementally; each lands
   with its own before/after flakewatch evidence.
5. **Phase 4** (CI) — owner-gated re-enablement with timing budget.
6. **Phase 5** (reporting + cadence) — wire convenience scripts; set review.

Each phase is independently landable; none requires a big-bang merge.

## CI timing-budget table (OPS-1)

Prescriptive budgets for when CI is re-enabled (owner-gated, OPS-2). Current
parked `ci.yml` runs sequentially; the table assumes a split-group strategy.

| Job group | Steps | Target wall-clock | Owner | Notes |
|---|---|---|---|---|
| `lint-typecheck` | type-check + lint + lint:design-system + lint:design | ≤ 90s | test-owner | fast feedback first |
| `unit` | `bun run test` (6 files) | ≤ 15s | test-owner | trivial |
| `vitest` | `bun run test:dom` (parallelized non-perf + serial perf) | ≤ 420s (baseline 525s − Phase 3 delta) | test-owner | the big one; split perf into its own job if needed |
| `build` | `bun run build` | ≤ 180s | infra | Next 16 build |
| `bundle-budget` | `check-performance-budgets.mjs` | ≤ 30s | perf-gate pack | advisory unless `PERF_BUDGET_STRICT=1` |
| `e2e-smoke` | `test:e2e` (chromium, env-gated subset) | ≤ 300s | e2e-fixture pack | most specs skip without auth |
| `e2e-perf` | `test:e2e:perf` | ≤ 420s | perf-gate pack | route-transition |
| **Total (parallel groups)** | — | **≤ ~600s wall** (critical path ≈ vitest ∥ build ∥ e2e) | Philip | vs current sequential pipeline |

Split-group rationale: run `lint-typecheck` + `unit` first (fast fail), then
`vitest` ∥ `build` ∥ `e2e-*` in parallel. The vitest job is the critical path;
Phase 3's job is to shrink it.

These are **prescriptive targets for re-enablement**, not asserted current
performance (CI is disabled; no hosted evidence). Measured on first re-enable.

## Owner thresholds table (OPS-3)

| Threshold | Current | Recommended default | Decision owner | Gating |
|---|---|---|---|---|
| File-level flake rate (10 runs) | unknown | ≤ 2% | Philip | Phase 0 measures; Phase 3 drives to it |
| `validate` wall-clock regression | unknown | +10% triggers investigation | test-owner | flakewatch |
| Per-file p95 slow flag | unknown | top-20 ranked | test-owner | flakewatch |
| Quarantine `retest_by` overdue | 0 | 0 | test-owner | ledger validator + cadence |
| Playwright `retries` | 0 | 0 (flake visibility) | Philip | Phase 2 |
| CI auto-rerun-to-green | n/a | **disabled** | Philip | Phase 4 |
| Auto-quarantine | off | off (manual default) | Philip | Phase 2 opt-in |

## Rollback

| Change | Rollback |
|---|---|
| Timeout tiers | revert `vitest.config.ts` `testTimeout` to 30_000 |
| Parallelism | revert to `fileParallelism:false` + `--maxWorkers=1` (perf parity gate catches meaning shift) |
| Global `afterEach` | remove the hook (or narrow scope) |
| Real-timer replacements | revert the two files to `setTimeout` (only if the replacement itself is wrong) |
| Quarantine ledger | remove entries (coverage is restored since tests were skipped-with-replacement, not deleted) |
| CI re-enablement | move `.github/workflows/ci.yml` back to `-disabled/` |

Every rollback is a config/script revert; no data migration, no provider action.

## Rollback triggers

- Phase 1: any perf-suite render-count assertion changes meaning → revert
  parallelism immediately.
- Phase 3: net coverage decreases (REL-3 violated) → revert the offending file.
- Phase 4: CI job exceeds timing budget by >25% or auto-rerun-to-green observed →
  re-disable + investigate.

## Operations / runbook

- **Weekly (pre-launch):** run `bun run flakewatch --runs 10`; audit quarantine
  ledger for overdue `retest_by`; confirm flake rate ≤ budget.
- **Per-release:** record flakewatch before/after in the release evidence; confirm
  coverage count ≥ baseline.
- **On flake report from a dev:** rerun the file with `bunx vitest run <file>
  --maxWorkers=1` × 5; if confirmed flaky, open a ledger entry with a replacement.

## Observability

- Flakewatch JSON is the durable evidence artifact (kept in `.ai`/`.omx` logs).
- Quarantine ledger is the durable policy artifact (committed to git).
- No production telemetry added (out of scope; RUM/CWV is a sibling pack).

## Hosted/production proof

Not required for this pack (dev tooling only). The only hosted-adjacent step is
Phase 4 CI timing, which is measured on first re-enablement and recorded as
evidence at that time.
