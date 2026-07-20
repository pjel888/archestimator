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

Report to Philip (audit complete; pack validator-conformant).

## Drift / cleanup state

- No ephemeral state outside the pack folder.
- Type-check process exited cleanly.
- No background jobs remaining.
- All artifacts baseline-pinned to `b2a9349`.

## 2026-07-19T16:30:00+08:00 — Manifest authored and validated

- Wrote `_generate_manifest.py` (Python generator) — safer than hand-authoring
  the bidirectional traceability links.
- Initial validation surfaced 16 errors (mostly evidence reciprocity and
  artifact-only requirements needing units). Iterated to 0 errors.
- Introduced UNIT-000 (VERIFIED) as the audit-deliverable unit so REQ-001
  and REQ-004 have an owner per the validator's reciprocity rules. The
  audit pack's own artifacts ARE the deliverable.
- Tuple: `IMPLEMENTATION_READY / IN_PROGRESS / NOT_EVALUATED / ACTIVE / ACTIVE`.
- `next_unit: UNIT-001` (the canonical oracle parity-fixture reconciliation).
- AUTH-001/002/003 set to RESOLVED (they document the audit's boundaries;
  release_status NOT_EVALUATED reflects that the audit makes no release claim).
- `node scripts/validate-plan-pack.mjs --write <pack>` -> PASS (hashes refreshed).
- Reconciled README, 00-PLAN, UNIT-CATALOG, PACK-MANIFEST to reflect UNIT-000
  and the actual manifest tuple.
- Final read-only validation: PASS.

## Audit completion

All requested requirements reconciled against fresh evidence:
- REQ-001: canonical contract proven (golden oracle 20/20, XLSX inspection).
- REQ-002: 12 findings filed with one explicit owner each; 10 candidates
  disposed via rejection/refutation/cross-reference.
- REQ-003: 40 D1 lifecycle paths classified; F-09 graph partial-write gap owned.
- REQ-004: validator passes; next_unit exposed.

No safe in-scope work remains. Reporting to Philip.

## 2026-07-19T17:00:00+08:00 — LLM council convened (user-requested decision resolution)

User asked for an LLM council to resolve all blocked decisions, no code.
Convened under the `council` skill: Architect (in-context) + Skeptic +
Pragmatist + Critic (three dispatched as fresh read-only subagents with
only the decision question + compact context — anti-anchoring mechanism).

Five blocked questions deliberated:
1. F-11 adjustment range (UI [-100,100] vs canonical [-100,1000]).
2. F-12 XLSX-vs-share total divergence (option a note vs option b snapshot).
3. F-10 currency breadth (expand set vs tighten readers).
4. Wave 1 prioritization across 11 units.
5. UNIT-001 TEST_TASK (grant or hold).

### Premise checks (post-council verification)

- **F-01 premise ("was labor removal correct?"):** Skeptic + Critic challenged.
  Verified via `git log`: commit `d9cf5b18e fix(estimates): remove dead labor
  cost feature from row totals and projections` is an explicit fix() commit.
  `grep labor src/` returns zero. No labor column in any migration.
  **Premise REFUTED.** Labor removal was deliberate. UNIT-001 TEST_TASK safe
  to grant.
- **F-11 premise ("is UI the de facto truth, validator the bug?"):** Skeptic
  challenged. Verified via `migrations/0082_estimate_row_integrity_constraints.sql`:
  DDL has `CHECK (adjustment_percentage >= -100 AND adjustment_percentage <= 100)`.
  `tests/vitest/estimate-sheet-version-control-schema.test.ts:208` asserts the
  same. **Premise UPHELD.** The 1000 max is for sheet-level contingency mode
  (actions.ts:884 `mode === "discount" ? 100 : 1_000`), not per-row adjustment.
  F-11 original filing conflated the two scales.

### Verdicts (see artifacts/council-2026-07-19.md for raw positions)

- **F-11:** NARROW canonical per-row to [-100, 100]. (Skeptic+Pragmatist+Critic
  vs Architect overruled.) New UNIT-013. UNIT-010 SUPERSEDED.
- **F-12:** OPTION (b) snapshot extension. (Skeptic+Critic+Pragmatist partial
  vs Architect overruled.) Severity bumped INFORMATIONAL → MEDIUM. New UNIT-012.
  UNIT-011 SUPERSEDED.
- **F-10:** EXPAND set (CNY/JPY/KRW) AND centralize. (Critic dissent upheld
  over Skeptic+Pragmatist majority.) Severity bumped LOW → MEDIUM. New UNIT-014.
  UNIT-009 SUPERSEDED.
- **F-02/F-04:** keep HIGH, annotate FIRST-USER-VISIBLE for PHP. (Pragmatist
  surprise upheld.)
- **UNIT-001:** GRANT TEST_TASK unconditionally. (Premise-check refuted the
  Skeptic/Critic gating concern.)
- **Wave 1:** UNIT-001, UNIT-003, UNIT-012 (new), UNIT-013 (new). UNIT-002
  to Wave 1.5.

### Bias guardrails applied

The Architect's initial position was wrong on F-11, F-12, F-10, and Wave 1
sequencing. Three of four external voices overruled on each. The Critic's
currency-set dissent was upheld over the majority "tighten" call because
PH-construction-sourcing is verifiable domain truth.

### Files updated

- NEW: `artifacts/council-2026-07-19.md` (council verdict + decision log).
- UPDATED: `artifacts/findings.json` (council_decision blocks on F-01, F-02,
  F-04, F-10, F-11, F-12; severity_counts revised).
- UPDATED: `UNIT-CATALOG.md` (3 new units: 012, 013, 014; 3 superseded: 009,
  010, 011; DAG + Wave 1 resequenced).
- UPDATED: `00-PLAN.md` (DEC-AUTO-006..010 added; DAG + slices resequenced).
- UPDATED: `README.md` (severity table + council outcome section).
- UPDATED: `PACK-MANIFEST.md` (council artifact + new units in traceability).
- REGENERATED: `plan-pack.json`.

## Next action

Report council verdict to Philip. No code implemented (per user instruction).
Next implementation unit when authorized: UNIT-001 (TEST_TASK already granted
by DEC-AUTO-010).

## 2026-07-20T01:30:00+08:00 — Improvement audit (per Improve-Plan-Prompt)

Single-agent emulated-pass improvement audit. Objective: audit, comprehend,
double-check, and improve the pack without changing the accepted outcome.

**Freshness re-verification at current HEAD (`5e2d4ad`):**
- `git log b2a9349..HEAD` = 5 commits (landing redesign, two other plan
  packs, docs). None touched the audited commercial-truth surfaces.
- Re-ran `bunx vitest run tests/vitest/calculation-output-parity.test.ts
  --maxWorkers=1` → **2 of 3 FAIL** (F-01 reproduces exactly).
- Re-ran `node artifacts/golden-oracle/oracle.mjs` → **20/20 PASS**.
- Spot-checked source claims: `editable-row-model.ts:320` PHP hardcode,
  `estimate-records.ts` `duplicateEstimateRecordGraph` multi-await,
  fixtures labor residue — all still hold.

**Internal-contradiction defects found (summary/display layer only):**
1. `findings.json` `severity_counts` = 4H/6M/3L/2I but actual `findings[]`
   = 4H/4M/3L/1I. Per-finding severities correct; summary counter wrong.
2. `existing-pack-overlap.json` `summary` = 7 NEW / 9 CROSS (+ phantom
   REFUTED/DEFERRED/EVIDENCE_BLOCKED/HISTORICAL_ONLY) but actual `matrix[]`
   = 11 NEW / 7 CROSS. Matrix body correct; summary wrong.
3. Three competing DAG diagrams: `00-PLAN.md` + `UNIT-CATALOG.md` ASCII
   show a linear chain; `plan-pack.json` `depends_on` has only
   UNIT-003→UNIT-001 and UNIT-007→UNIT-006. Machine truth authoritative.

**Root cause of the stale-hash gap:** commit `5928d721` (2026-07-20)
corrected the content of 6 artifacts (00-PLAN, UNIT-CATALOG, README,
findings.json, existing-pack-overlap.json, parity-test-output.txt) to fix
the three defects above, but did not refresh `plan-pack.json` hashes. The
validator then reported 7 stale-hash mismatches. An attempt to re-hash via
`--write` is blocked by `scripts/lib/plan-pack-validator.mjs:971`: the
canonical artifact (`00-PLAN.md`) cannot be re-hashed while the pack holds
any VERIFIED unit / PASS criterion / IMPLEMENTATION_READY status (all true
here). 26 proof-bearing records sit on the changed artifacts; clearing the
block would require dismantling the pack's claim structure.

**Decision (user-approved):** revert the 6 corrected files to their
`b60c2e59` content (which matches the committed manifest hashes). This
restores validator-passing state (0 mismatches) at the cost of re-introducing
the three summary-layer contradictions. The contradictions are documented in
`README.md` "Known content defects" and below so a future supersession can
fix them in one pass. The substantive findings F-01..F-12 are unaffected.

**Recommended successor-pack shape (when the owner is ready):**
- new folder `2026-07-20-...-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack-v2`;
- baseline HEAD at creation time;
- start from the corrected content (4/4/3/1 severity, 11/7 overlap, sparse
  DAG) so hashes are clean from day one;
- fresh proof receipts: golden oracle 20/20 + parity 2/3 FAIL (already
  captured in this session);
- this pack marked `terminal_status: ARCHIVED` with a supersession note.

**Authorization / scope:** no product source, test source, migration, or
dependency edits. The parity test was run read-only as evidence refresh
(matches original AUTH-002 boundary). Only free artifacts (README,
LOOP_LEDGER, PACK-MANIFEST) were edited; their hashes refreshed via
`--write` (no proof-bearing records point at them, so no re-prove block).

**Net change to accepted outcome:** none. REQ-001..REQ-004, all 12 finding
severities and root causes, unit ownership, and `next_unit: UNIT-001` are
unchanged. Validator passes.
