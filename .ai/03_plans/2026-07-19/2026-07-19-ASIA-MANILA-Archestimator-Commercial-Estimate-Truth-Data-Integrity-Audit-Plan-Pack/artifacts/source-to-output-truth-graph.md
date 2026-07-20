# Source-to-Output Truth Graph

> Maps every commercial-truth producer/consumer from user input to client-facing
> output, with the formula variant each uses and the divergence points. Every
> node cites `file:line`. Variant tags: **[A] canonical minor-unit oracle**,
> **[B] legacy float**, **[C] UI read projection (float)**,
> **[D] optimistic editable model (canonical, PHP-hardcoded)**,
> **[E–K]** AI/proposal/health variants (see `commercial-truth-model.md` §2).

## High-level data flow

```
                          USER INPUT
                              |
                   editable-row-store.ts (Zustand)
                              |
                   editable-row-model.ts:getEditableRowAmounts  [D]
                              |
                              v
                   updateEstimateRowItem (server action)
                              |
                   assertValidEstimateRowCalculationInput -> validateEstimateCalculationInput  [A]
                              |
                   patchEstimateRowItem (D1 intent)             \
                              |                                    | same atomic batch
                   estimate_mutation_receipts INSERT              |
                   estimate_sheet_events INSERT (history)        /
                   activity_event_outbox INSERT                  /
                   projects.publication_source_revision += 1    /
                              |
                              v
                   D1: estimate_row_items (REAL storage)
                              |
          +-------------------+-------------------+-------------------+-------------------+
          |                   |                   |                   |                   |
          v                   v                   v                   v                   v
   estimate-tree-       project-estimate-   project-charts     proposal-export     publication/snapshot.ts
   read-repository      sheets-repository   aggregate-         build-proposal-     buildProjectPublication
   toUiRow [C]          computeEstimateRow  project-charts     export-model         Snapshot [A]
          |             LineTotal [B]       calculateProject   normalizeSourceRow
          |                                  ChartRowCostParts  [A]
          v                  |               [E]                       |
   EstimateRowItem           v                         v
          |            workspace-repo,                                    |
          |            dashboard,                                   create-proposal-
          |            estimate list                                workbook
          |            totalProjectCost                              |
          v                  |                                  XLSX Bid Form
   Sheet UI                     |                               formula: ROUND(qty*mat,2)+adj+misc
   computeNodeTotal             |                               cached value = canonical model
   [FLOAT sum]                  |
          |                     |
          v                     v
   ProjectTotalHeader     ProjectEstimatesTable
   "Ongoing project       "Total project cost"
   cost" [FLOAT]          [FLOAT, Variant B]
                              |
                              v
                       (DIVERGES from canonical by 0..N centavos on centavo-boundary rows)
```

## Producer nodes (canonical truth sources)

| Node | file:line | Formula variant | Output |
|---|---|---|---|
| `validateEstimateCalculationInput` | `estimate-row-total.ts:158-196` | [A] | validated `{quantity, materialRate, miscCost, adjustmentPercentage, currencyCode}` |
| `computeEstimateRowCostParts` | `estimate-row-total.ts:199-229` | [A] | `{materialMinorUnits, adjustmentMinorUnits, miscMinorUnits, totalMinorUnits, total}` |
| `applySheetAdjustment` | `estimate-row-total.ts:231-243` | [A] | `{adjustmentMinorUnits, totalMinorUnits}` (test/validation only) |
| `applyProposalCharges` | `estimate-row-total.ts:245-264` | [A] | `{proposalContingencyMinorUnits, vatMinorUnits, totalMinorUnits}` (test only) |
| `computeEstimateTotals` | `estimate-row-total.ts:266-306` | [A] | aggregate EstimateTotals (test only — NOT wired into production reads) |
| `buildProjectPublicationSnapshot` | `publication/snapshot.ts:594` | [A] per row + integer sum | snapshot JSON with `rowTotalMinorUnits` and `totalCostMinorUnits` |
| `buildProposalExportModel` | `build-proposal-export-model.ts:442` | [A] per row | proposal rows + totals + section subtotals |

## Consumer nodes (each surface that recomputes or displays a total)

| Surface | file:line | Variant | Input source | Risk |
|---|---|---|---|---|
| Optimistic editable row | `editable-row-model.ts:289-342` | [D] canonical, `currency_code:"PHP"` hardcoded | draft patch + authoritative row | currency validation inconsistency |
| Read-repo UI projection | `estimate-tree-read-repository.ts:472-525` | [C] float | D1 row | drift from canonical on centavo boundary |
| Component library projection | `component-library/project-component-projection.ts:314-362` | [C] float | D1 row | same as above |
| Sheet UI node total | `editable-row-model.ts:396-424` | FLOAT sum | editable rows | aggregate drift |
| Read-repo node total | `estimate-tree-read-repository.ts:629-635` | FLOAT sum | EstimateRowItems | aggregate drift |
| Project total header | `ProjectTotalHeader.tsx` via `editable-row-store.ts:98-104` | FLOAT sum | node totals | aggregate drift |
| Estimate list `totalProjectCost` | `workspace-repository.ts:3193-3201`, `project-estimate-sheets-repository.ts:219-222` | [B] float per row | D1 rows | per-row + aggregate drift |
| Workshop dashboard | `workspace-repository.ts:3200` | [B] | D1 rows | same |
| Project charts cost fact | `project-charts-repository.ts:132-140` | [B] | D1 rows | same |
| Project charts aggregator | `aggregate-project-charts.ts:134-161` | [E] canonical per row, float aggregate, `currency_code:"PHP"` hardcoded | chart row facts | per-row canonical, aggregate float drift |
| Duplicate estimate total | `d1-intents/estimate-records.ts:332` (`sumEstimateRowLineTotals`) | [B] | D1 rows | per-row + aggregate drift |
| D1 history row projection | `d1-intents/rows.ts:324-356` | [H] float, different adjustment fallback | D1 row | different fallback rule vs canonical |
| Publication snapshot row | `publication/snapshot.ts:271-308` | [A] | D1 row → canonical | canonical truth |
| Publication snapshot total | `publication/snapshot.ts:234-241, 579, 633` | integer minor sum | snapshot rows | canonical truth |
| Proposal export row | `build-proposal-export-model.ts:96-122` | [A] | D1 row → canonical | canonical truth |
| Proposal export section/total | `build-proposal-export-model.ts:311-336` | FLOAT sum with `roundMoney` | proposal rows | third rounding behavior |
| XLSX Bid Form cell | `create-proposal-workbook.ts:345` | live formula `ROUND(qty*mat,2)+adj+misc` | proposal row | parity holds via round-coincidence |
| XLSX Summary totals block | `create-proposal-workbook.ts:419-514` | live formulas | cross-sheet refs | canonical chained |
| Client Portal summary | `client-portal/financial-sections.ts:51-69` | integer minor (with float fallback) | snapshot rows | canonical when minor present, float-reconstructed otherwise |
| **Client Portal browser branch** | `client-portal/estimate-browser.ts:117-157` | **FLOAT sum of `rowTotal`** | snapshot rows | aggregate drift on share/portal tree |
| **Share tree branch** | `share/reconstruct-share-tree.ts:71,116,155,304,324` | **FLOAT sum of `rowTotal`** | snapshot rows | aggregate drift |
| **Share donut** | `share/aggregate-share-chart-buckets.ts:29,41` | **FLOAT sum** | snapshot rows | aggregate drift |
| AI read context | `ai/read-context.ts:777-787` | [I] float | D1 row | per-row drift |
| AI package-builder read | `ai/package-builder/read-tools.ts:361-380` | [I′] float | D1 row | per-row drift |
| AI package-builder draft | `ai/package-builder/draft.ts:1846-1854` | [J] float, divergent fallbacks | draft | per-row drift + wrong fallback |
| AI package-builder schema | `ai/package-builder/schemas.ts:1413-1421` | [J′] float, contingency-only | draft | ignores adjustment entirely |
| AI package-builder apply | `ai/package-builder/apply.ts:1298, 2209-2210, 2243-2244` | [K] float, three different copies | draft + D1 | history `totalDelta` omits contingency |
| **Estimate health "amount"** | `estimate-health-repository.ts:135` | **[L] float, omits contingency AND adjustment** | D1 row | strictly smaller amount; budget thresholds wrong magnitude |

## Divergence points (the load-bearing edges)

Each divergence is an edge where two consumer nodes that "should" produce the
same total produce different values for the same input row. Detail in
`data-invariant-matrix.csv` and `findings.json` (F-02 through F-07).

| ID | Edge | Left | Right | Symptom |
|---|---|---|---|---|
| D-1 | canonical vs float per-row | `computeEstimateRowCostParts` [A] | `computeEstimateRowLineTotal` [B] + read-repo [C] | 0..1 centavo per row on half-cent boundaries |
| D-2 | adjustment fallback rule | canonical (qty_base guard) | d1-intents history [H], AI apply/draft [J/K] | wrong % applied when both fields set |
| D-3 | currency code propagation | canonical/proposal/snapshot | editable model [D], project charts [E] | PHP hardcoded in UI/charts |
| D-4 | adjustment clamping | canonical `[-100,1000]` | UI `[-100,100]` | UI silently clamps contingency >100 |
| D-5 | empty-string numeric handling | canonical hard-fail | legacy `Number("" ?? 0) = 0` | silent zero vs rejection |
| D-6 | aggregation rounding | canonical integer sum | UI/read-repo float sum | 0..N centavo aggregate drift |
| D-7 | client-portal/share tree totals | snapshot `totalCostMinorUnits` | share tree float sum of `rowTotal` | centavo drift on issued totals |
| D-8 | estimate health amount | canonical total | `qty*rate + misc` | health thresholds on wrong magnitude |
| D-9 | AI apply history delta | canonical row impact | `qty*rate + misc` (no adjustment) | audit/history underreports |
| D-10 | XLSX formula vs pinned | live `ROUND(qty*mat,2)` formula | canonical `round(qty*mat*100)` | parity holds via coincidence; latent |
| D-11 | currency formatting precision | XLSX `[$₱-3409]* #,##0.00` | UI `maximumFractionDigits:0/2` mixed | same value renders differently |
| D-12 | snapshot minor-unit fallback | canonical minor | `Math.round(rowTotal*100)` reconstructed | drift when rowTotal is float sum |
| D-13 | AI contingency/adjustment conflict | AI schema rejects both | canonical silently prefers adjustment | AI stricter than canonical |
| D-14 | currency code validation breadth | canonical 9-code set | workbook/snapshot `^[A-Z]{3}$` | JPY etc passes snapshot, fails export |
