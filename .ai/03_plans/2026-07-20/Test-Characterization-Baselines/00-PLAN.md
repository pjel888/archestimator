# Test Characterization Baselines — Historical Predecessor Plan

> **Historical provenance only — do not execute.** This predecessor was
> superseded without implementation by
> `.ai/03_plans/2026-07-31/Code-Improvement/`, the sole current execution
> authority. Its original characterization designs remain below as source
> evidence.

## Status tuple

`NOT_READY / NOT_STARTED / NOT_EVALUATED / N/A / CANCELLED`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `standard` (two characterization harnesses that pin behavior before refactor)
- **Action ceiling:** `IMPLEMENT_LOCAL` (historical boundary only; this pack has no runnable unit)
- **Exact next unit:** none; continue only in `.ai/03_plans/2026-07-31/Code-Improvement/`

## 1. Outcome and intent

Before any plan splits the 3803-line `EstimateSheetContent.tsx` (Pack D's God
component) or refactors the 3361-line `d1-intents/rows.ts` (Pack D's integrity
unification), we need a regression net for the *integration* behavior those
files own. Today the estimate-sheet tests are behavioral slices — they cover
inputs but not the interactions between the ~20 effects, the column-width
persistence refs, the realtime-cursor loop, and the reducer. And `rows.ts` has
thin direct coverage: the pure cost math is tested, but the SQL/intent
generation layer is not.

This pack adds two characterization harnesses:

1. A whole-component integration test for `EstimateSheetContent` that drives the
   documented user flows and pins the committed DOM/a11y tree shape + the
   sequence of server-action calls. Refactors that preserve behavior stay green;
   refactors that change behavior fail loudly.
2. A direct unit suite for `d1-intents/rows.ts` that asserts the generated
   `{sql, values}` for each exported intent builder across edge fixtures, plus
   golden assertions on `totalDeltaMinorUnits` for insert/duplicate/restore.

Historically both units were prerequisites. Current source has landed their
characterization coverage; successor `UNIT-028` owns revalidation. Neither
predecessor unit is runnable.

## 2. Task Contract

- **Objective:** land two characterization test suites. They do NOT change
  production code; they only add tests.
- **Scope:** new test files under `tests/vitest/`. No production source edits.
- **Exclusions:** any production refactor (that is Pack D). Perf-suite
  restructuring (PERF-01 in the audit) is out of scope.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, and
  `.ai/03_plans/2026-07-31/Code-Improvement/`; this pack is historical only.
- **Owner:** none; no unit in this predecessor is runnable.
- **Test authorization:** these units ARE tests, so the User Test Authorization
  Gate is `TEST_TASK` for this pack specifically — the user's request to plan
  these baselines authorizes writing and running them. Outside this pack, the
  gate remains `NOT_REQUIRED`.
- **Stop condition:** both units VERIFIED; both new test files run green under
  `bun run test:dom`; the validator passes.

## 3. Repo conventions executors must match

- **Test runner:** Vitest 4 with jsdom. Config at `vitest.config.ts`.
  `fileParallelism: false` is load-bearing — the perf suite needs serial
  execution. The new tests MUST tolerate serial execution (no parallel-only
  patterns).
- **Test command:** `bun run test:dom` (runs `vitest run --maxWorkers=1`).
  Individual file: `bunx vitest run tests/vitest/<file> --maxWorkers=1`.
- **Timeout:** 30s per test (the heavy jsdom suites can exceed 15s late in a
  ~525s full run under GC pressure). The new characterization test should
  target <10s per case; if it approaches 30s, split fixtures.
- **Existing exemplar — estimate-sheet slice test:**
  `tests/vitest/estimate-sheet-cost-inputs.test.tsx`. Read it for the import
  pattern, the `renderWithEstimateSheet` helper (if present), and the mock
  server-action pattern.
- **Existing exemplar — d1-intents test:** `tests/vitest/estimate-record-d1-intents.test.ts`
  (437 lines). Read it for the D1-stub pattern used to assert generated SQL.
- **Fixtures:** `tests/vitest/fixtures/` and `tests/fixtures/` exist. Reuse
  fixtures rather than inventing new ones where possible.
- **Snapshot discipline:** Vitest snapshots (`toMatchSnapshot()`) pin exact
  strings; use `toMatchInlineSnapshot()` for small SQL shapes so the assertion
  is readable in the test file. For DOM trees, snapshot the structure (not
  styling) — use a serializing helper that omits volatile attributes.
- **No production edits:** if a test reveals a production bug, STOP and surface
  it — do not fix the production code in this pack.

## 4. Requirements → units → evidence map

| REQ | Title | Units | Evidence |
|-----|-------|-------|----------|
| UX-001 | EstimateSheetContent integration behavior is pinned | UNIT-001 | EVID-001 |
| DATA-001 | d1-intents/rows.ts intent/SQL generation is pinned | UNIT-002 | EVID-002 |

## 5. Dependency order

UNIT-001 and UNIT-002 are independent. Suggested order: UNIT-002 first (smaller,
faster, pure-function SQL assertions), then UNIT-001 (heavier, needs the jsdom
harness). Both must be VERIFIED before Pack D starts.

## 6. Risks

- **RISK-001** (UNIT-001): characterization tests can over-constrain trivial
  details (exact class names, transient state), making future refactors fail
  spuriously. Mitigation: pin behavior (action-call sequences, committed DOM
  structure), not styling or implementation detail.
- **RISK-002** (UNIT-001): the 30s timeout may be tight for a whole-component
  render with a large fixture tree. Mitigation: start with a minimal fixture
  (one tab, three rows) and scale up only if coverage gaps appear.
- **RISK-003** (UNIT-002): the SQL shapes in `rows.ts` are large; inline
  snapshots become unreadable past ~50 lines. Mitigation: assert on structural
  properties (table name, SET columns, WHERE columns, bind-value count) rather
  than the full SQL string for the big builders.

## 7. Anti-scope (do NOT do)

- Do not edit production source in `src/`. If a test fails because of a real
  bug, STOP and report — the fix belongs in Pack A or a new unit.
- Do not restructure the perf suite or flip `fileParallelism`.
- Do not add these tests to the e2e suite — they are vitest/jsdom.
- Do not delete or modify existing tests; these are additive.
