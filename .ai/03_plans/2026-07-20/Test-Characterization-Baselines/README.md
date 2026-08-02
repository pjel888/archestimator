# Test Characterization Baselines

**Historical provenance only.** This pack is non-runnable and was superseded
without implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`. Current
source contains the relevant characterization coverage; successor `UNIT-028`
owns revalidation.

## Historical unit disposition

| Unit | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| UNIT-001 | EstimateSheetContent characterization harness | P1 | L | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-002 | d1-intents/rows.ts intent/SQL suite | P1 | M | — | SUPERSEDED → landed current source; successor UNIT-028 revalidation |

Current status: both units `SUPERSEDED`; no implementation is claimed here.

## Historical disposition

- Both units are recorded as landed current source and revalidated by successor
  `UNIT-028`.
- The former Pack D prerequisite relationship is historical and creates no
  runnable dependency.

## Findings considered and rejected

- **PERF-01 (split the serial vitest run)** — out of scope. The new tests must
  tolerate serial execution; restructuring the perf suite is a separate DX
  effort.
- **TESTS-03 (rewrite the brittle e2e spec)** — out of scope. That is an e2e
  fix; this pack adds vitest characterization coverage.
- **Adding tests for `workspace-repository.ts`** — that file's behavior is
  covered indirectly through the actions layer; a direct characterization suite
  is lower-leverage than the two units here.

## Quality bar — check before finishing each unit

- Could a model that has never seen this repo execute the unit from `00-PLAN.md`
  + the unit file alone?
- Does the test pin **behavior**, not implementation detail? (A refactor that
  preserves behavior should stay green.)
- Is the fixture minimal but representative?
- Does the test run in <30s (ideally <10s) under `bunx vitest run --maxWorkers=1`?
- No production source files modified (`git status` shows only new test files).
