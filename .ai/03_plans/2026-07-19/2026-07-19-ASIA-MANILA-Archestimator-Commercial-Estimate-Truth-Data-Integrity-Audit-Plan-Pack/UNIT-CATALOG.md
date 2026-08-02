# Unit Catalog — Commercial Estimate-Truth & Data-Integrity Audit

> Combined unit document. Per the Plan-Pack Execution Policy, units are
> consolidated here rather than split per-finding. Cross-reference units
> (no implementation ownership in this pack) are listed at the bottom.

## DAG overview

```
UNIT-000 (audit deliverable; REQ-001 + REQ-004)              [VERIFIED — the pack is the deliverable]
   |
   v
================= WAVE 1 (council-promoted, all HIGH or binding-proposal) =================
UNIT-001 (F-01 parity fixture)            [READY — restore canonical-math regression gate]
UNIT-003 (F-04 aggregate canonicalization)[READY — first-user-visible PHP centavo drift]
UNIT-012 (F-12-b snapshot extension)      [NEW — binding-proposal trust gap, option (b)]
UNIT-013 (F-11 narrowing)                 [NEW — narrow canonical per-row to [-100,100]]
   |
   v
================= WAVE 1.5 (HIGH persistence gap) =================
UNIT-002 (F-09 graph atomicity)           [READY — silent orphan risk]
   |
   v
================= WAVE 2 (medium/low/hardening) =================
UNIT-004 (F-03 currency propagation)      [READY]
UNIT-005 (F-06 client-portal minor-unit)  [READY]
UNIT-006 (F-07 estimate health magnitude) [READY]
UNIT-007 (F-05 AI package-builder)        [READY but DEFERRED until Copilot release]
UNIT-008 (F-08 XLSX parity test)          [READY]
UNIT-009 (F-10 currency centralization)   [RESCOPED by council — replaced by UNIT-014]
UNIT-010 (F-11 UI clamp)                  [SUPERSEDED by UNIT-013 — council reversed the fix direction]
UNIT-011 (F-12 share-page note)           [SUPERSEDED by UNIT-012 — council chose option (b)]
UNIT-014 (F-10 currency expand+centralize)[NEW — council upheld Critic's expand-set dissent]
```

**Canonical next unit:** **UNIT-001**.

### Council 2026-07-19 — unit changes

- **UNIT-012** (new): F-12 option (b) snapshot extension. Replaces UNIT-011.
- **UNIT-013** (new): F-11 narrow canonical to [-100, 100]. Replaces UNIT-010
  (which had the fix direction backwards — widening UI was wrong).
- **UNIT-014** (new): F-10 expand set (CNY/JPY/KRW) AND centralize the helper.
  Replaces UNIT-009 (which only tightened readers — would reject legitimate
  JPY rebar quotes).
- **UNIT-009, UNIT-010, UNIT-011**: SUPERSEDED by UNIT-014/013/012 respectively.
- **Wave 1** resequenced: UNIT-001, UNIT-003, UNIT-012, UNIT-013. All HIGH or
  binding-proposal. UNIT-002 (orphan atomicity) moved to Wave 1.5.

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
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Quality Master
  UNIT-015). Do NOT change the per-row receipt semantics.
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
- **Dependencies:** none (logically after UNIT-001 to keep parity test
  meaningful, but they touch disjoint files).
- **Owned paths/resources:**
  - `src/lib/share/reconstruct-share-tree.ts:71, 116, 155, 304, 324` (write).
  - `src/lib/share/aggregate-share-chart-buckets.ts:29, 41` (write).
  - `src/lib/client-portal/estimate-browser.ts:117-157` (write).
  - `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:396-424` (write — node totals).
- **Non-goals:** do NOT change the per-row legacy float helper (owned by
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Quality Master
  UNIT-014). Do NOT change the publication snapshot integer sum (already
  canonical).
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
- **Dependencies:** none (logically after UNIT-006 to share the canonical
  routing pattern).
- **Owned paths/resources:**
  - `src/lib/ai/package-builder/{draft,schemas,apply,read-tools}.ts` (write).
- **Non-goals:** do NOT change AI feature-flag posture or quota behavior
  (owned by `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec
  SEC-AI-001/002).
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

## UNIT-009 — Centralize currency code validation breadth (F-10) — SUPERSEDED

> **SUPERSEDED by UNIT-014** (council 2026-07-19). The original scope ("tighten
> readers") would reject a legitimate JPY rebar quote at import time. The
> Critic's dissent upheld: PH construction routinely sources CNY/JPY/KRW rebar
> and equipment. New unit expands the set AND centralizes.

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

## UNIT-010 — Align UI adjustment percentage clamp with canonical range (F-11) — SUPERSEDED

> **SUPERSEDED by UNIT-013** (council 2026-07-19). The original scope proposed
> widening UI to [-100, 1000]. Council reversed this: narrow the canonical
> per-row range DOWN to [-100, 100] to match the UI, the server-side sheet
> adjustment for discount, and the D1 CHECK constraint
> (`migrations/0082_estimate_row_integrity_constraints.sql`). The 1000 maximum
> correctly remains only for sheet-level contingency mode, not per-row
> `adjustment_percentage`.

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

## UNIT-011 — Document XLSX-vs-share-page total divergence on the share page (F-12) — SUPERSEDED

> **SUPERSEDED by UNIT-012** (council 2026-07-19). Council chose option (b)
> (snapshot extension) over option (a) (note). The Skeptic's framing — "a note
> is shipping confusion with an apology stapled to it" — plus the Critic's
> willfulness exposure on a binding proposal convinced the Architect to
> reverse. Severity bumped INFORMATIONAL → MEDIUM.

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

## UNIT-012 — Extend publication snapshot with `finalProposal` basis (F-12, option b) — NEW

- **Status:** READY (council-promoted to Wave 1).
- **Goal:** eliminate the ~23% trust gap between the share page Proposal total
  (direct-cost only) and the XLSX Grand Total (direct + contingency + VAT +
  sheet adjustment) by extending the publication snapshot to carry a
  `finalProposal` basis alongside the existing direct basis. The share page
  renders the Grand Total matching the XLSX.
- **Source finding:** F-12 (severity bumped INFORMATIONAL → MEDIUM by council
  2026-07-19; binding-proposal trust gap).
- **Dependencies:** none (logically after UNIT-001 to keep parity test green).
- **Owned paths/resources:**
  - `src/lib/publication/snapshot.ts:594` `buildProjectPublicationSnapshot`
    (write — add `finalProposal` block; bump schemaVersion to 1.7).
  - `src/lib/proposal-export/settings.ts:39-51` `resolveProjectCharges`
    (read — reuse the same charge resolution).
  - `src/components/share/ShareFinancialOverview.tsx` (write — render the new
    basis).
  - `src/components/share/SharePageSummaryCard.tsx` (write).
- **Non-goals:** do NOT change the XLSX Summary block layout. Do NOT remove
  the direct basis (keep both; the direct basis is still useful for
  per-section display). Do NOT touch the publication token/rotation machinery
  (owned by `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec
  scope).
- **Implementation boundary:**
  1. Extend `buildProjectPublicationSnapshot` to compute and attach a
     `finalProposal: { directMinorUnits, sheetAdjustmentMinorUnits,
     proposalContingencyMinorUnits, vatMinorUnits, totalMinorUnits, total }`
     block per estimate and at the top level, using the same
     `resolveProjectCharges` settings (default contingencyRate=10, vatRate=12
     unless project overrides).
  2. Bump snapshot schemaVersion to 1.7; old readers ignore the new block.
  3. Update `ShareFinancialOverview` and `SharePageSummaryCard` to display
     `finalProposal.total` as the headline number, with the direct cost as a
     secondary line.
- **Invariants to preserve:**
  - Snapshot immutability post-publish (unchanged).
  - Source-revision optimistic concurrency (unchanged).
  - Backward compatibility: snapshots issued before this change keep rendering
    (direct basis falls back).
  - `proposalPreviewSignature` blocks download on unsaved edits (unchanged).
- **Acceptance evidence:** a recipient comparing the XLSX Grand Total and the
  share page headline sees the same number, within 0 centavos, for the same
  fixture.
- **Test decision:** TEST_PROPOSAL — extend the parity test to assert
  `snapshot.finalProposal.total === workbook.summary.grandTotalWithTaxes`.
- **Recovery/fix-forward:** if snapshot size grows past D1 JSON limits,
  compress the block or move charges to a computed read path.
- **Completion signal:** share page headline matches XLSX Grand Total.

## UNIT-013 — Narrow canonical per-row adjustment range to [-100, 100] (F-11) — NEW

- **Status:** READY (council-promoted to Wave 1).
- **Goal:** align the canonical per-row `adjustment_percentage` range to
  `[-100, 100]`, matching the UI clamp, the server-side sheet-discount
  validator, and the D1 CHECK constraint. The 1000 ceiling correctly remains
  only for sheet-level contingency mode (a different code path).
- **Source finding:** F-11 (LOW; council reversed the fix direction).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/lib/estimates/estimate-row-total.ts:13-14` (write — keep
    `MIN_ADJUSTMENT_PERCENTAGE = -100`; change `MAX_ADJUSTMENT_PERCENTAGE`
    to `100` for the per-row path only; introduce a separate
    `MAX_SHEET_CONTINGENCY_PERCENTAGE = 1_000` for the sheet path).
  - `src/lib/estimates/estimate-row-total.ts:236` `applySheetAdjustment`
    (write — use the new sheet constant, not the per-row one).
  - `src/lib/estimates/actions.ts:884` (verify — already uses 100 for
    discount; the 1000 there is for contingency mode and stays).
- **Non-goals:** do NOT change sheet-level contingency mode (1000 ceiling
  stays for that path). Do NOT add a UI confirmation dialog above some
  threshold (the Critic suggested this; out of scope for the narrowing).
- **Implementation boundary:**
  1. Introduce `MAX_SHEET_CONTINGENCY_PERCENTAGE = 1_000` as a separate
     constant.
  2. Change `MAX_ADJUSTMENT_PERCENTAGE` to `100` (per-row only).
  3. Update `applySheetAdjustment` to use the sheet constant.
  4. Re-run the canonical golden oracle (this audit's
     `artifacts/golden-oracle/oracle.mjs`) to confirm no regression.
- **Invariants to preserve:**
  - Existing rows with adjustment in `[-100, 100]` validate identically.
  - Sheet-level contingency in `(100, 1000]` continues to validate.
- **Acceptance evidence:** a row with `adjustment_percentage: 150` is rejected
  by both UI and server; a sheet contingency of 500 still validates.
- **Test decision:** TEST_PROPOSAL — extend the parity test's invalid-input
  matrix to assert 150 is rejected per-row.
- **Recovery/fix-forward:** if a real estimator workflow needs >100% per-row
  adjustment (e.g. excavation risk markup), revisit as a product decision
  with an explicit override + reason + author capture (per the Critic's
  suggestion). For now narrow.
- **Completion signal:** UI, server, and D1 all enforce `[-100, 100]` per-row.

## UNIT-014 — Expand currency set (CNY/JPY/KRW) AND centralize validation (F-10) — NEW

- **Status:** READY (replaces UNIT-009).
- **Goal:** add CNY, JPY, and KRW to the supported currency set (PH
  construction routinely sources CNY/JPY/KRW rebar and equipment imports),
  then refactor every read layer to call a single shared `normalizeCurrency`
  helper so the supported set cannot drift again.
- **Source finding:** F-10 (severity bumped LOW → MEDIUM by council
  2026-07-19; the breadth gap blocks a real PH import workflow).
- **Dependencies:** none.
- **Owned paths/resources:**
  - `src/lib/estimates/estimate-row-total.ts:17` (write — expand
    `supportedCurrencies` to add CNY, JPY, KRW; **note**: JPY/KRW are
    scale-0 currencies in the real world but the canonical formula uses
    scale 2 uniformly — keep scale 2 for now; document the limitation in
    a comment).
  - `src/lib/proposal-export/create-proposal-workbook.ts:54-57` (write —
    replace ad-hoc `^[A-Z]{3}$` with `normalizeCurrency`).
  - `src/lib/publication/snapshot.ts:367` (write — same).
  - `src/lib/component-library/source-snapshot-price-options.ts:187`
    (write — same).
  - Consider extracting a shared `src/lib/currency/supported-currencies.ts`
    with `normalizeCurrency`, `assertSupportedCurrency`, and the canonical
    set; every layer imports from there.
- **Non-goals:** do NOT introduce per-currency scale (every supported
  currency remains scale 2 for now). Do NOT add currency conversion.
- **Implementation boundary:**
  1. Extract `src/lib/currency/supported-currencies.ts` with the expanded set
     (12 codes: AUD CAD EUR GBP HKD NZD PHP SGD USD + CNY JPY KRW).
  2. Re-export `normalizeCurrency` from `estimate-row-total.ts` for backward
     compatibility.
  3. Update the three read layers to call the shared helper.
  4. Document the scale-2-for-all limitation for JPY/KRW in the helper.
- **Invariants to preserve:**
  - Existing 9-code rows validate identically.
  - Money math is currency-agnostic; no formula change.
- **Acceptance evidence:** a JPY row is accepted consistently by the
  workbook, snapshot, source-snapshot, and canonical paths; a ZWL row is
  rejected consistently.
- **Test decision:** TEST_PROPOSAL — extend the parity test's invalid-input
  matrix and add a JPY acceptance case.
- **Recovery/fix-forward:** if scale-0 precision becomes a real requirement
  for JPY/KRW, introduce `currencyScale` per currency in a follow-up.
- **Completion signal:** every layer accepts or rejects the same currency
  codes; the canonical set lives in exactly one place.

---

## Cross-reference units (NO implementation ownership in this pack)

These findings are filed here for traceability but the fix is owned by
another current pack. Current code-improvement ownership is
`.ai/03_plans/2026-07-31/Code-Improvement/`; Quality Master and Infosec unit IDs
below are explicitly historical predecessor pointers. Do not implement here.

| Finding | Owner | Owner unit |
|---|---|---|
| F-02 — legacy float row total in estimate list/dashboard/charts | Code Improvement successor (historical Quality Master) | Historical UNIT-014 (then READY, HIGH) |
| Library CSV/XLSX import gap | MVP | UNIT-005 |
| Variant accommodation in BOQ export | MVP | UNIT-006 |
| Contractor profile + branded export | MVP | UNIT-010 |
| Variant-reference repair on linked template rows | Code Improvement successor (historical Quality Master) | Historical UNIT-001 |
| Proposal preview identity (contingency) | Code Improvement successor (historical Quality Master) | Historical UNIT-004 |
| D1 batch atomicity gate | Code Improvement successor (historical Quality Master) | Historical UNIT-015 (then CRITICAL) |
| Restore-replay row reads | Code Improvement successor (historical Quality Master) | Historical UNIT-025 |
| Activity outbox set-wise reconcile | Code Improvement successor (historical Quality Master) | Historical UNIT-029 |
| XLSX body-copy / compression perf | Code Improvement successor (historical Quality Master) | Historical UNIT-034 / UNIT-067 |
| Sign-out state cleanup | Code Improvement successor (historical Quality Master) | Historical UNIT-005 |
| Cross-tenant commercial-data authorization | Code Improvement successor (historical Infosec) | Historical UNIT-001..UNIT-013 |
