# UNIT-019 Calculation and Output Parity Evidence v1

## Local implementation

- The parity fixture fixes row parts, working-estimate membership, final-proposal
  charge order, and exact minor-unit totals from hand-authored oracle data.
- It exercises the editor calculation path, project charts, proposal model,
  XLSX workbook, issued publication snapshot, Client Portal financial and
  estimate-browser payloads, print rows, and shared chart buckets.
- The fixture proves that active rows remain visible in working outputs while
  only included rows enter the issued-client total, printable set, and workbook
  Grand Total. Financial and chart section totals reconcile to that same issued
  total.
- Canonical calculation uses integer minor units for the fixed expected totals;
  output surfaces expose the corresponding currency values only after that
  calculation path has completed.

## Fresh validation

```text
bunx eslint tests/vitest/calculation-output-parity.test.ts tests/vitest/estimate-unification-oracle.fixtures.ts src/lib/estimates/estimate-row-total.ts src/lib/project-charts/aggregate-project-charts.ts src/lib/publication/snapshot.ts src/lib/proposal-export/build-proposal-export-model.ts src/lib/proposal-export/create-proposal-workbook.ts src/lib/client-portal/financial-sections.ts src/lib/client-portal/estimate-browser.ts src/lib/share/aggregate-share-chart-buckets.ts
bunx vitest run tests/vitest/calculation-output-parity.test.ts tests/vitest/estimate-row-total.test.ts tests/vitest/project-chart-aggregation.test.ts tests/vitest/project-chart-payload.test.ts tests/vitest/project-charts-d1-repository.test.ts tests/vitest/proposal-workbook.test.ts
```

Result: lint completed with no errors and two pre-existing unused-variable
warnings in `src/lib/publication/snapshot.ts` and
`src/lib/share/aggregate-share-chart-buckets.ts`. The focused suite passed 4
files / 30 tests.

## Release boundary

This local deterministic proof does not claim a production cohort, real
legacy-data parity, or browser/device print proof. Those release-only surfaces
remain owned by UNIT-018, UNIT-020, and UNIT-021.
