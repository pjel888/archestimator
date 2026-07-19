# Unit Catalog — Commercial Estimate-Truth & Data-Integrity Audit

> Combined unit document. Per the Plan-Pack Execution Policy, units are
> consolidated here rather than split per-finding. Cross-reference units
> (no implementation ownership in this pack) are listed at the bottom.

## DAG overview

The dependency graph is intentionally sparse. The only **hard** dependencies
(mirrored in `plan-pack.json` `depends_on`) are:

```
UNIT-003 (F-04) depends on UNIT-001 (F-01)
UNIT-007 (F-05) depends on UNIT-006 (F-07)
```

All other units (UNIT-001, UNIT-002, UNIT-004, UNIT-005, UNIT-006,
UNIT-008, UNIT-009, UNIT-010, UNIT-011) carry no hard dependency and may be
picked in any order. UNIT-000 is the VERIFIED audit-deliverable unit. The
canonical next unit is **UNIT-001**.

---

## UNIT-000 — Audit deliverable (REQ-001 + REQ-004) — VERIFIED

- **Status:** VERIFIED.
- **Goal:** deliver the audit artifacts themselves: the canonical
  commercial-truth model (`artifacts/commercial-truth-model.md`), the
  independent golden oracle (`artifacts/golden-oracle/oracle.mjs`, 20/20
  pass), the XLSX formula inspection (`artifacts/xlsx-inspection/`), and a
  validator-conformant `plan-pack.json` exposing one canonical next unit.
- **Source requirements:** REQ-001, REQ-004.
- **Dependencies:** none.
- **Owned paths/resources:** every artifact under the pack folder.
- **Non-goals:** product remediation (owned by UNIT-001..UNIT-011 and the
  cross-referenced packs).
- **Acceptance evidence:** EVID-001 (golden matrix 20/20),
  EVID-003 (XLSX inspection), EVID-004 (validator pass on plan-pack.json).
- **Completion signal:** validator passes; this unit is closed by the act of
  producing the pack. It exists in the DAG so REQ-001 and REQ-004 have a
  unit owner per the validator's reciprocity rules.

---

## UNIT-001 — Reconcile canonical oracle parity fixture (F-01)

- **Status:** READY
- **Goal:** make `tests/vitest/calculation-output-parity.test.ts` pass 3/3 on
  current source by removing labor-inclusive expected values from
  `tests/vitest/estimate-unification-oracle.fixtures.ts`.
- **Source finding:** F-01 (HIGH, LOCAL_RUNTIME_CONFIRMED).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `tests/vitest/estimate-unification-oracle.fixtures.ts` (write — TEST_TASK
    required).
  - `tests/vitest/calculation-output-parity.test.ts` (read; likely no edit
    needed).
- **Non-goals:** do NOT alter `src/lib/estimates/estimate-row-total.ts`. The
  canonical math is correct; only the fixture is stale.
- **Implementation boundary:** remove `labor_rate`, `laborMinorUnits`, and
  labor-inclusive totals from `CALCULATION_PARITY_FIXTURE.rows` and
  `CALCULATION_PARITY_FIXTURE.expected`. Reconcile expected totals with
  current `computeEstimateRowCostParts` output (verified by this audit's
  golden oracle).
- **Invariants to preserve:** the test must still cover the same scenarios
  (basic row, decimal quantity, quantity contingency, excluded scope,
  invalid inputs).
- **Acceptance evidence:** `bunx vitest run
  tests/vitest/calculation-output-parity.test.ts --maxWorkers=1` passes 3/3.
- **Test decision:** TEST_TASK (test-source edit; requires explicit user
  authorization for the implementing session).
- **Recovery/fix-forward:** if the test still fails after fixture cleanup,
  the canonical math itself drifted; widen to inspect
  `computeEstimateRowCostParts` against the golden oracle.
- **Completion signal:** parity test green; CI regression gate restored.

## UNIT-002 — Envelope duplicate-estimate graph in an atomic batch (F-09)

- **Status:** READY
- **Goal:** eliminate the partial-write orphan risk in
  `duplicateEstimateRecordGraph` and `createEstimateRecordWithDefaultTab` by
  issuing all steps in a single `database.batch()` with a graph-level
  idempotency receipt, OR by adding a reconciler that detects and quarantines
  orphan estimates.
- **Source finding:** F-09 (HIGH, CURRENT_SOURCE_CONFIRMED).
- **Dependencies:** none (parallel to UNIT-001).
- **Owned paths/resources:**
  - `src/lib/estimates/d1-intents/estimate-records.ts:222, 247` (write).
  - new graph-level receipt statement (write).
- **Non-goals:** do NOT change the per-batch atomicity gates owned by
  Quality Master UNIT-015. Do NOT change the per-row receipt semantics.
- **Implementation boundary:** either (a) collect all 4 (or 2) steps'
  statements into a single `runPreparedD1Batch` call with a graph-level
  receipt, or (b) add a reconciler scan that detects estimates with
  `estimate_tabs` but zero `estimate_row_items` and quarantines them with a
  history event.
- **Invariants to preserve:** idempotency, row_revision guard,
  workspace scoping, history events.
- **Acceptance evidence:** injected failure at step 3 leaves no partial
  estimate; OR reconciler detects and flags synthetic orphan in a local
  preview D1.
- **Test decision:** TEST_PROPOSAL — risk: partial-write recovery is hard to
  prove without an injected failure test. Proposed command: a vitest that
  monkey-patches the rows-step to throw and asserts no estimate row remains.
- **Recovery/fix-forward:** if envelope is infeasible (D1 batch size limits
  on huge estimates), fall back to the reconciler cron.
- **Completion signal:** partial-write path closed or reconciler deployed.

## UNIT-003 — Canonicalize aggregate sums across share tree, client portal, sheet node totals (F-04)

- **Status:** READY
- **Goal:** eliminate aggregate centavo drift by summing `totalMinorUnits`
  (integer) and dividing once, instead of summing float `rowTotal` /
  `totalItemCosts`.
- **Source finding:** F-04 (HIGH, LOCAL_RUNTIME_CONFIRMED).
- **Dependencies:** UNIT-001 (hard — UNIT-003 extends the parity gate that
  UNIT-001 first repairs; the two touch disjoint files but the dependency
  keeps the G19 extension meaningful).
- **Owned paths/resources:**
  - `src/lib/share/reconstruct-share-tree.ts:71, 116, 155, 304, 324` (write).
  - `src/lib/share/aggregate-share-chart-buckets.ts:29, 41` (write).
  - `src/lib/client-portal/estimate-browser.ts:117-157` (write).
  - `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:396-424` (write — node totals).
- **Non-goals:** do NOT change the per-row legacy float helper (owned by
  Quality Master UNIT-014). Do NOT change the publication snapshot integer
  sum (already canonical).
- **Implementation boundary:** where `rowTotalMinorUnits` is available
  (snapshot, client portal), aggregate it and divide once at the boundary;
  where only the float is available (editable model), expose minor units from
  `computeEstimateRowCostParts` and aggregate those.
- **Invariants to preserve:** display values; tree structure; share page UX.
- **Acceptance evidence:** extended G19 golden case asserts every aggregate
  surface matches `oracle_sum_minor` within 0 centavos.
- **Test decision:** TEST_PROPOSAL — a vitest extending the golden oracle to
  the share/client-portal aggregation functions.
- **Recovery/fix-forward:** per-surface rollback if any one site breaks.
- **Completion signal:** share tree, client portal browser, and sheet node
  totals match the publication snapshot's `totalCostMinorUnits` for the same
  fixture.

## UNIT-004 — Thread project currency_code through editable model and project charts (F-03)

- **Status:** READY
- **Goal:** remove the hardcoded `currency_code: "PHP"` from
  `editable-row-model.ts:320` and `aggregate-project-charts.ts:148`.
- **Source finding:** F-03 (MEDIUM, CURRENT_SOURCE_CONFIRMED).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:320` (write).
  - `src/lib/project-charts/aggregate-project-charts.ts:148` (write).
- **Non-goals:** do NOT introduce per-currency scale (every supported
  currency remains scale 2).
- **Implementation boundary:** read the project's (or estimate's)
  `currency_code` from the existing context and pass it into
  `computeEstimateRowCostParts`.
- **Invariants to preserve:** PHP estimates produce identical output (no
  regression).
- **Acceptance evidence:** G11 golden case executed through editable model
  with USD returns `currencyCode: 'USD'`.
- **Test decision:** TEST_PROPOSAL — a vitest that runs the editable model
  for a USD estimate.
- **Recovery/fix-forward:** trivial revert.
- **Completion signal:** UI and charts honor project currency.

## UNIT-005 — Migrate client_portal_issues.total_cost to minor-unit INTEGER (F-06)

- **Status:** READY
- **Goal:** align `client_portal_issues` money representation with the
  publication snapshot's `totalCostMinorUnits` INTEGER convention.
- **Source finding:** F-06 (MEDIUM, STATIC_PATTERN_ONLY).
- **Dependencies:** none.
- **Owned paths/resources:**
  - new migration `migrations/00XX_client_portal_issues_minor_units.sql` (write).
  - `src/lib/client-portal/*` issue writers/readers (write).
- **Non-goals:** do NOT change `client_portal_issues.total_cost` semantics
  for legacy rows without a backfill.
- **Implementation boundary:** add `total_cost_minor_units INTEGER` column;
  dual-write; read-prefer-minor; backfill from existing snapshots where
  available.
- **Invariants to preserve:** existing client portal issues keep rendering.
- **Acceptance evidence:** client portal issue total matches publication
  snapshot `totalCostMinorUnits` exactly for new issues.
- **Test decision:** TEST_PROPOSAL — a migration-contract test.
- **Recovery/fix-forward:** if backfill is incomplete for legacy issues,
  retain the REAL column as a display fallback.
- **Completion signal:** new client portal issues carry canonical minor
  units.

## UNIT-006 — Route estimate health amount through canonical oracle (F-07)

- **Status:** READY
- **Goal:** make `EstimateHealthRowFact.amount` equal the canonical row total
  magnitude (currently drops contingency and adjustment).
- **Source finding:** F-07 (MEDIUM, CURRENT_SOURCE_CONFIRMED).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/lib/repositories/estimate-health-repository.ts:135` (write).
  - `src/lib/estimate-health/{evaluate-estimate-health,cost-drivers}.ts` (read — verify thresholds still sensible).
- **Non-goals:** do NOT change budget threshold values; only the amount
  magnitude.
- **Implementation boundary:** replace `quantity * unitCost + misc_cost` with
  a call to `computeEstimateRowCostParts({...}).value.totalMinorUnits / 100`
  (or expose minor units directly to keep integer-safe aggregation).
- **Invariants to preserve:** existing threshold semantics (budget-over,
  budget-near) — but note their verdicts may change for rows with
  contingency, which is the intended fix.
- **Acceptance evidence:** health amount matches canonical row total for the
  same input on a fixture with 10% contingency.
- **Test decision:** TEST_PROPOSAL — a vitest asserting health amount equals
  canonical total.
- **Recovery/fix-forward:** if thresholds now fire too aggressively,
  recalibrate threshold values (product decision).
- **Completion signal:** health badges and cost-driver shares reflect true
  totals.

## UNIT-007 — Converge AI package-builder formulas on the canonical oracle (F-05)

- **Status:** READY (but DEFERRED until AI Copilot release — the surface is
  feature-flagged and pre-release).
- **Goal:** eliminate the four divergent row-total copies in the AI
  package-builder by routing through `computeEstimateRowCostParts`.
- **Source finding:** F-05 (MEDIUM, CURRENT_SOURCE_CONFIRMED).
- **Dependencies:** UNIT-006 (hard — UNIT-007 reuses the canonical-routing
  pattern established by UNIT-006 for the AI package-builder).
- **Owned paths/resources:**
  - `src/lib/ai/package-builder/{draft,schemas,apply,read-tools}.ts` (write).
- **Non-goals:** do NOT change AI feature-flag posture or quota behavior
  (Infosec owns SEC-AI-001/002).
- **Implementation boundary:** replace each local row-total copy with a call
  to `computeEstimateRowCostParts`; reconcile the four fallback rules.
- **Invariants to preserve:** AI draft shape; proposal-row count.
- **Acceptance evidence:** AI draft preview, budget summary, and apply
  history `totalDelta` match the canonical oracle for the same input.
- **Test decision:** TEST_PROPOSAL — a vitest asserting AI formula parity.
- **Recovery/fix-forward:** per-file rollback.
- **Completion signal:** AI Copilot produces canonical totals.

## UNIT-008 — Add XLSX formula-vs-canonical parity assertion test (F-08)

- **Status:** READY
- **Goal:** lock the latent parity assumption
  `round(x*100) === ROUND(x,2)*100` with a sweep test before any change to
  the canonical math breaks it silently.
- **Source finding:** F-08 (LOW, LOCAL_RUNTIME_CONFIRMED — parity holds
  today).
- **Dependencies:** none.
- **Owned paths/resources:**
  - new `tests/vitest/xlsx-formula-canonical-parity.test.ts` (write — TEST_TASK).
  - `src/lib/proposal-export/create-proposal-workbook.ts:340-345` (read; possibly extend the comment documenting the identity).
- **Non-goals:** do NOT change the XLSX formula or the canonical math.
- **Implementation boundary:** a parameterized vitest that generates a
  workbook for a numeric sweep (including 0.001, 0.005, 0.01, 33.335, 99.999,
  ...), reads the cached LINE TOTAL value, and asserts equality with
  `computeEstimateRowCostParts`.
- **Invariants to preserve:** the XLSX writer's behavior unchanged.
- **Acceptance evidence:** sweep test passes across the documented numeric
  domain.
- **Test decision:** TEST_TASK (new test file requires explicit user
  authorization).
- **Recovery/fix-forward:** if the sweep finds a divergence, either pin the
  cell to the cached value (drop the live formula) or align the canonical
  formula.
- **Completion signal:** latent parity assumption is contract-enforced.

## UNIT-009 — Centralize currency code validation breadth (F-10)

- **Status:** READY
- **Goal:** make every read layer (workbook, snapshot, source-snapshot price
  options) call `normalizeCurrency` so unsupported codes are rejected
  consistently.
- **Source finding:** F-10 (LOW, STATIC_PATTERN_ONLY).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/lib/proposal-export/create-proposal-workbook.ts:54-57` (write).
  - `src/lib/publication/snapshot.ts:367` (write).
  - `src/lib/component-library/source-snapshot-price-options.ts:187` (write).
- **Non-goals:** do NOT expand the supported currency set (product decision).
- **Implementation boundary:** replace ad-hoc `^[A-Z]{3}$` acceptance with a
  call to `normalizeCurrency` (or a shared `assertSupportedCurrency` helper).
- **Invariants to preserve:** the 9 supported codes pass everywhere.
- **Acceptance evidence:** JPY row either accepted everywhere or rejected
  everywhere consistently.
- **Test decision:** TEST_PROPOSAL — a vitest asserting consistent
  acceptance/rejection.
- **Recovery/fix-forward:** trivial revert.
- **Completion signal:** no currency code reaches a layer that cannot handle
  it.

## UNIT-010 — Align UI adjustment percentage clamp with canonical range (F-11)

- **Status:** READY
- **Goal:** resolve the silent UI clamp from `[-100, 100]` to match the
  canonical `[-100, 1000]` (or align canonical to UI — product decision).
- **Source finding:** F-11 (LOW, CURRENT_SOURCE_CONFIRMED).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:146-154` (write).
- **Non-goals:** do NOT change the server-side range without coordinating
  with the proposal-export logic.
- **Implementation boundary:** either widen the UI clamp to `[-100, 1000]`
  or narrow the canonical range to `[-100, 100]` — pick the product-correct
  one.
- **Invariants to preserve:** existing estimates with values in the
  intersection `[-100, 100]` render identically.
- **Acceptance evidence:** UI and server agree on the accepted range; a 150%
  contingency is either editable everywhere or rejected everywhere.
- **Test decision:** TEST_PROPOSAL.
- **Recovery/fix-forward:** trivial.
- **Completion signal:** no silent UI clamp divergence.

## UNIT-011 — Document XLSX-vs-share-page total divergence on the share page (F-12)

- **Status:** READY (product/UX decision).
- **Goal:** the XLSX Grand Total includes contingency+VAT+sheet adjustment;
  the share page Proposal total is direct-cost only. Either surface a note
  on the share page or extend the snapshot to carry a `finalProposal` basis.
- **Source finding:** F-12 (INFORMATIONAL, CURRENT_SOURCE_CONFIRMED — by
  design).
- **Dependencies:** possibly coordinated with MVP UNIT-010 (contractor
  profile + branded export).
- **Owned paths/resources:**
  - `src/components/share/ShareFinancialOverview.tsx` (write) for option (a).
  - `src/lib/publication/snapshot.ts` (write) for option (b).
- **Non-goals:** do NOT change the XLSX Summary block layout.
- **Implementation boundary:** option (a) is minimal — add a one-line note
  under the share page total. Option (b) is broader — snapshot a
  `finalProposal` block alongside the direct block.
- **Invariants to preserve:** share page performance; snapshot schema
  backward compatibility.
- **Acceptance evidence:** a recipient comparing XLSX and share page can
  understand the difference without filing a support ticket.
- **Test decision:** NOT_REQUIRED (UX change; no test gate).
- **Recovery/fix-forward:** revert the note.
- **Completion signal:** share page either matches XLSX or explains the
  difference.

---

## Cross-reference units (NO implementation ownership in this pack)

These findings are filed here for traceability but the fix is owned by
another active pack. Do not implement here.

| Finding | Owner | Owner unit |
|---|---|---|
| F-02 — legacy float row total in estimate list/dashboard/charts | Quality Master | UNIT-014 (READY, HIGH) |
| Library CSV/XLSX import gap | MVP | UNIT-005 |
| Variant accommodation in BOQ export | MVP | UNIT-006 |
| Contractor profile + branded export | MVP | UNIT-010 |
| Variant-reference repair on linked template rows | Quality Master | UNIT-001 |
| Proposal preview identity (contingency) | Quality Master | UNIT-004 |
| D1 batch atomicity gate | Quality Master | UNIT-015 (CRITICAL) |
| Restore-replay row reads | Quality Master | UNIT-025 |
| Activity outbox set-wise reconcile | Quality Master | UNIT-029 |
| XLSX body-copy / compression perf | Quality Master | UNIT-034 / UNIT-067 |
| Sign-out state cleanup | Quality Master | UNIT-005 |
| Cross-tenant commercial-data authorization | Infosec | UNIT-001..UNIT-013 |
