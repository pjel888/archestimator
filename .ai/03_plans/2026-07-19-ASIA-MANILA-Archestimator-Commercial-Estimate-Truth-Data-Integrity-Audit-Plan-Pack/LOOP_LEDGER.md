# LOOP_LEDGER — Append-Only Audit Trail

## 2026-07-19T15:25:00+08:00 — Session start

- `bun run supermemory:ensure` -> ready.
- Baseline captured: `b2a934919ce499c0404e5b9f9a5644f22757c78a`, branch `main`,
  clean tree.
- Read AGENTS.md, PLAN_PACK_EXECUTION_POLICY, VALIDATION_MATRIX, FAST PATH,
  Frontier-Planning-Kernel, Frontier-Applicability-Gates, Creating-Plan-Prompt,
  Plan-Pack-Schema, Multi-Agent-Execution-Directive.
- Inspected `scripts/lib/plan-pack-validator.mjs` (full vocabulary extracted:
  enums, record states, supported suite versions `2026-07-10/11/12`,
  TRACE_ID_PATTERN, terminal semantics).

## 2026-07-19T15:30:00+08:00 — Lane fan-out (read-only)

- Dispatched 4 parallel read-only subagents (Explore type):
  1. Truth-math lane — money/quantity/row-total/variant formulas.
  2. Persistence/lifecycle lane — D1 schema, transactions, recovery,
     templates, variants.
  3. Output surfaces lane — XLSX, publication, charts, proposal preview,
     import.
  4. Reconciliation lane — existing pack ownership extraction.
- All 4 lanes returned exhaustive findings with file:line citations.

## 2026-07-19T15:35:00+08:00 — Source verification

- Read `src/lib/estimates/estimate-row-total.ts:1-260` verbatim. Confirmed
  canonical formula, no labor field, scale=2, supported currency set.
- Read `src/lib/estimates/d1-intents/estimate-records.ts:200-320`. Confirmed
  4 sequential awaits in `duplicateEstimateRecordGraph`.
- Read `tests/vitest/calculation-output-parity.test.ts` (211 lines) and
  `tests/vitest/estimate-unification-oracle.fixtures.ts:1-150`. Confirmed
  fixture still references `labor_rate`/`laborMinorUnits`.

## 2026-07-19T15:28:39+08:00 — EVID-AUD-001 collected

- Command: `bunx vitest run
  tests/vitest/calculation-output-parity.test.ts --maxWorkers=1`.
- Result: **2 of 3 FAIL.**
  - Test 1: expected `totalMinorUnits: 17000`, got `14250` (labor removed
    from canonical).
  - Test 3: expected `projectChartSeries.total` 448, got 420.5.
- Saved: `evidence/parity-test-output.txt`.
- Filed: **F-01 (HIGH, LOCAL_RUNTIME_CONFIRMED).**

## 2026-07-19T15:38:00+08:00 — Pack folder created

- `.ai/03_plans/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/`
  with `artifacts/golden-oracle/`, `artifacts/xlsx-inspection/`, `evidence/`.

## 2026-07-19T15:42:00+08:00 — EVID-AUD-002 collected (golden oracle)

- Wrote `artifacts/golden-cases.json` (20 cases covering all invariant
  families).
- Wrote independent oracle `artifacts/golden-oracle/oracle.mjs` mirroring the
  documented contract (no product-source import).
- Initial run: 19/20 pass. Two hand-computation errors in G20 fixture
  detected by the oracle (meta-finding: hand-computed expected values are
  unreliable; the oracle is authoritative).
- Corrected G20 expected values to match oracle output.
- Final run: **20/20 pass.**
- G19 float-vs-oracle drift confirmed: -2 centavos raw / -1 centavo display.
- Filed: **F-02 (HIGH)**, **F-04 (HIGH)** with runtime drift evidence.

## 2026-07-19T15:50:00+08:00 — EVID-AUD-003 collected (XLSX inspection)

- Wrote `artifacts/xlsx-inspection/inspect.mjs` ( Bun-driven, dynamic import
  of proposal-export product code).
- Generated `audit-fixture.xlsx` (18205 bytes).
- Inspected XML: Bid Form LINE TOTAL formula `ROUND(qty*material,2)+adj+misc`
  caches to `142.5` matching canonical. `fullCalcOnLoad="1"` set.
- Filed: **F-08 (LOW, LOCAL_RUNTIME_CONFIRMED)** — parity holds via
  coincidence; latent risk.

## 2026-07-19T15:29:00+08:00 — EVID-AUD-004 started (type-check)

- Started `bun run type-check` in background (large project).

## 2026-07-19T16:05:00+08:00 — Type-check completed

- Result: **PASS** (exit 0, no errors). Logged in `artifacts/commands-run.log`.

## 2026-07-19T16:00:00+08:00 — Truth model + matrices authored

- `artifacts/commercial-truth-model.md` — canonical contract from source.
- `artifacts/source-to-output-truth-graph.md` — producer/consumer map.
- `artifacts/calculation-consumer-matrix.csv` — 32 consumer rows.
- `artifacts/data-invariant-matrix.csv` — 16 invariants.
- `artifacts/d1-lifecycle-matrix.csv` — 40 write paths.
- `artifacts/template-variant-lineage.md`.
- `artifacts/publication-version-truth.md`.

## 2026-07-19T16:08:00+08:00 — Findings register authored

- `artifacts/findings.json` — 12 filed findings (4 HIGH, 6 MEDIUM, 3 LOW
  counting overlap; 2 INFORMATIONAL).
- `artifacts/rejected-refuted-findings.json` — 10 candidates disposed
  (4 REFUTED, 1 HISTORICAL_ONLY, 1 EVIDENCE_BLOCKED, 1 DEFERRED, 3
  CROSS_REFERENCE).
- `artifacts/existing-pack-overlap.json` — 18-row disposition matrix.
- `artifacts/adversarial-challenge.md` — second-pass challenge on every HIGH
  finding. All 4 sustained; 0 refuted; 0 narrowed.

## 2026-07-19T16:15:00+08:00 — Unit catalog + plan documents authored

- `UNIT-CATALOG.md` — 11 units with DAG.
- `README.md`, `00-PLAN.md`, `PACK-MANIFEST.md`.

## 2026-07-19T16:20:00+08:00 — Authorization use

- TEST_TASK exercised only for: existing parity test (read-only run),
  type-check, audit-only golden oracle and XLSX inspection scripts inside
  the pack folder.
- No product source / test source / migration / dependency edits performed.
- No production D1 writes / restores / schema changes.
- No real customer data touched.
- No browser automation / screenshots / Storybook / visual QA.
- Test-source edits deferred to UNIT-001 / UNIT-008 implementing sessions
  (require separate TEST_TASK).

## Next action

Author `plan-pack.json` (validator-conformant), run
`node scripts/validate-plan-pack.mjs --write <pack>` to refresh hashes,
repair any errors, and report to Philip.

## Drift / cleanup state

- No ephemeral state outside the pack folder.
- Type-check process exited cleanly.
- No background jobs remaining.
- All artifacts baseline-pinned to `b2a9349`.
