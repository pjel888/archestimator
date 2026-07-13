# 12 — Test and Validation Strategy

> The "system under test" for this pack is the **test harness itself**. The
> validation matrix below proves each requirement using the harness's own
> outputs. Evidence classes follow the Multi-Agent Execution Directive:
> Local-static / Local-automated / Browser / Provider / Hosted / Inferred.
> This pack needs only Local-static and Local-automated evidence.

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-1 | `scripts/flakewatch.mjs` (inventory mode) | smoke | new | repo test files | `find tests/vitest -name '*.test.*' \| wc -l` | count ≈634 | none | test-owner |
| FR-2 | `scripts/flakewatch.mjs` | integration | new | full vitest glob | `bun run flakewatch --runs 10` | `flakewatch-report.json` parses | none | test-owner |
| FR-3 (cleanup) | `tests/vitest/setup.ts` | behavior | existing-modified | global mocks | `bun run test:dom` green over N=10 | fail-rate ≤ baseline | none | test-owner |
| FR-3 (timers) | `tests/vitest/estimate-cursor-identity.test.ts`, `tests/vitest/recipient-proposals-page.test.tsx` | unit | existing-modified | per-test | `bunx vitest run <file> --maxWorkers=1` × 10 | stable, no real timers | none | test-owner |
| FR-4 | `vitest.config.ts` parity | integration | new | perf subset | `bunx vitest run tests/vitest/perf --maxWorkers=1` before/after | render-count assertions unchanged | none | test-owner |
| FR-5 | `scripts/validate-quarantine-ledger.mjs` | unit | new | sample ledger | `bun run scripts/validate-quarantine-ledger.mjs` | rejects bad entries (exit 1) | none | test-owner |
| FR-6 | `scripts/flakewatch-report.mjs` | unit | new | two sample JSONs | `bun run flakewatch:report --before a --after b` | correct diff | none | test-owner |
| PERF-1 | flakewatch N-run | integration | new | full glob | `bun run flakewatch --runs 10` | fail-rate ≤ budget | none | Philip |
| PERF-2 | flakewatch wall-clock | integration | new | full glob | same | wall-clock p95 + delta | none | test-owner |
| REL-3 | coverage count | static | new | before/after | count assertions+files | count ≥ baseline | none | test-owner |
| OPS-1 | (docs) `13` table | static | new | — | review | table complete | none | Philip |

## Commands (verified from `package.json` source)

| Purpose | Command | Evidence class |
|---|---|---|
| Full DOM suite | `bun run test:dom` | Local-automated |
| Bun unit suite | `bun run test` | Local-automated |
| Full gate | `bun run validate` | Local-automated |
| E2E inventory | `bun run test:e2e --list` | Local-static |
| Type check | `bun run type-check` | Local-automated |
| Lint | `bun run lint` | Local-automated |
| Focused vitest | `bunx vitest run <file> --maxWorkers=1` | Local-automated |
| **New:** flake scan | `bun run flakewatch --runs 10` | Local-automated |
| **New:** report diff | `bun run flakewatch:report --before <a> --after <b>` | Local-automated |
| **New:** ledger validate | `bun run validate-quarantine-ledger` | Local-automated |

> No broad `validate`/build loop is required for routine harness changes; it is
> reserved for shared-config changes (vitest.config.ts, package.json test
> scripts) per AGENTS.md verification policy.

## Validation discipline

- **Phase 0:** no assertions change; only measurement. The "test" is that
  flakewatch emits a parseable report.
- **Phase 1/3:** every change has a flakewatch before/after row in `19` (TEST-1).
- **Coverage invariant (REL-3):** before/after assertion + file count; any
  removal has a ledger `replacement`.
- **Perf parity (FR-4 exit gate):** rerun the perf subset; the `=== 0`/`=== 1`
  render-count assertions must match the Phase 0 baseline exactly.

## Known pre-existing reds / gaps

- None blocking this pack. (The repo has no known-red test commands cited in
  `.ai`; the `--maxWorkers=1` convention is the standing stability practice.)

## Adversarial note (docs-only planning)

Dynamic adversarial QA is **not applicable** to this *planning* task (it
produces docs/plans, no runtime behavior). The adversarial matrix for the
future *implementation* is the shadow-path tables in `04` + the
mid-scan-edit/contamination/coverage-loss failure modes in `09`/`14`.
