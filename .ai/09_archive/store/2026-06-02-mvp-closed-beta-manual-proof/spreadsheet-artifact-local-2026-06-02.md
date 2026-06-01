# Spreadsheet Artifact Local Evidence - 2026-06-02

Scope: local workbook artifact generated through the production proposal export model/workbook code path.

Commit before evidence capture: `09206e6`.

This is partial spreadsheet evidence, not full cross-app launch proof. No Microsoft Excel, Apple Numbers, or LibreOffice install was found on this machine, so Excel/secondary-app open/recalc/print proof remains blocked.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| `lewis-residence-demo-proposal-2026-06-02.xlsx` | Generated fallback/demo proposal workbook artifact. |
| `lewis-residence-demo-proposal-2026-06-02.exceljs-summary.json` | ExcelJS readback summary for the generated workbook. |

Workbook SHA-256:

```text
1b7625fedbcc1855ace1e07add53aa4d90c2a9dd9ff3a1347f11cb0018ab7b48
```

## Generation Path

The workbook was generated with `bun --eval` using:

- `buildProposalExportModel()` from `src/lib/proposal-export/build-proposal-export-model.ts`.
- `createProposalWorkbookBuffer()` from `src/lib/proposal-export/create-proposal-workbook.ts`.
- A local Lewis Residence demo payload with general preliminaries, architectural finishes, a project-specific paint allowance, and electrical rough-in rows.

## Checks Run

| Check | Result | Notes |
| --- | --- | --- |
| ExcelJS write + readback | Pass | Loaded sheets: `Bid Form`, `Summary`, `Commercial Terms`, `Source Breakdown`. |
| `file lewis-residence-demo-proposal-2026-06-02.xlsx` | Pass | Reported `Microsoft Excel 2007+`. |
| `unzip -t lewis-residence-demo-proposal-2026-06-02.xlsx` | Pass | No compressed-data errors. |
| Blank line-total scan through ExcelJS | Pass | `blankLineTotalRows: []`; summary grand total formula read back as `B27+B28+B29`, result `55230`. |
| Focused export tests | Pass | `bun run test:dom tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx` passed 4 files / 15 tests. |
| App availability | Blocked | `command -v libreoffice`, `command -v soffice`, and `/Applications/{Microsoft Excel,Numbers,LibreOffice}.app` checks found no installed spreadsheet app. |

## Current Evidence Status

| P0 row | Status after this capture | Notes |
| --- | --- | --- |
| Spreadsheet compatibility | partial / blocked | Generated workbook artifact is valid, loadable, formula-backed, and has no blank line totals. Full Excel plus secondary spreadsheet open/recalc/print proof remains missing because no spreadsheet app is installed locally. |
| Demo rehearsal | partial / blocked | A fallback workbook artifact now exists, but no live demo rehearsal, screenshots, or target hosted account proof exists. |

## Follow-Up Required

1. Open `lewis-residence-demo-proposal-2026-06-02.xlsx` in Microsoft Excel.
2. Open it in at least one secondary spreadsheet app, preferably Numbers or LibreOffice.
3. Confirm formula recalculation, no blank line totals, sheet names, landscape fit-to-width print preview, repeated header row, and commercial/signature blocks.
4. Capture screenshots/notes and link them from the proof matrix before changing the spreadsheet row to pass.
