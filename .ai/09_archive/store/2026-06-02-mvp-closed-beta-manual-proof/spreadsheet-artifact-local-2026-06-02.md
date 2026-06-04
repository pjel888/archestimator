# Spreadsheet Artifact Local Evidence - 2026-06-02

Scope: local workbook generation evidence through the production proposal export model/workbook code path.

Commit before evidence capture: `09206e6`.

This is partial spreadsheet evidence, not full cross-app launch proof. No Microsoft Excel, Apple Numbers, or LibreOffice install was found on this machine, so Excel/secondary-app open/recalc/print proof remains blocked.

2026-06-04 security update: the raw generated workbook was removed from the repository because committed proposal workbooks can contain client-identifying estimate data. The sanitized ExcelJS readback summary remains as non-sensitive evidence that the workbook generation path was exercised.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| `proposal-workbook-exceljs-summary-sanitized-2026-06-02.json` | Sanitized ExcelJS readback summary for the generated workbook. |

Withdrawn raw workbook SHA-256, retained only to identify the removed artifact:

```text
1b7625fedbcc1855ace1e07add53aa4d90c2a9dd9ff3a1347f11cb0018ab7b48
```

## Generation Path

The withdrawn workbook was generated with `bun --eval` using:

- `buildProposalExportModel()` from `src/lib/proposal-export/build-proposal-export-model.ts`.
- `createProposalWorkbookBuffer()` from `src/lib/proposal-export/create-proposal-workbook.ts`.
- A local demo payload with general preliminaries, architectural finishes, a project-specific paint allowance, and electrical rough-in rows.

## Checks Run

| Check | Result | Notes |
| --- | --- | --- |
| ExcelJS write + readback | Pass | Loaded sheets: `Bid Form`, `Summary`, `Commercial Terms`, `Source Breakdown`. |
| File type check | Pass before withdrawal | Reported `Microsoft Excel 2007+`. |
| ZIP integrity check | Pass before withdrawal | No compressed-data errors. |
| Blank line-total scan through ExcelJS | Pass | `blankLineTotalRows: []`; summary grand total formula read back as `B27+B28+B29`. Exact cached totals were removed from the retained summary. |
| Focused export tests | Pass | `bun run test:dom tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx` passed 4 files / 15 tests. |
| App availability | Blocked | `command -v libreoffice`, `command -v soffice`, and `/Applications/{Microsoft Excel,Numbers,LibreOffice}.app` checks found no installed spreadsheet app. |

## Current Evidence Status

| P0 row | Status after this capture | Notes |
| --- | --- | --- |
| Spreadsheet compatibility | partial / blocked | Generation/readback evidence proves the workbook builder produced a valid, loadable, formula-backed workbook with no blank line totals before the raw artifact was withdrawn. Full Excel plus secondary spreadsheet open/recalc/print proof remains missing because no spreadsheet app is installed locally. |
| Demo rehearsal | partial / blocked | A sanitized workbook readback summary exists, but the raw fallback workbook is no longer stored in the repository; no live demo rehearsal, screenshots, or target hosted account proof exists. |

## Follow-Up Required

1. Regenerate or download a fresh authorized workbook from the app instead of using a committed repo artifact.
2. Open it in Microsoft Excel.
3. Open it in at least one secondary spreadsheet app, preferably Numbers or LibreOffice.
4. Confirm formula recalculation, no blank line totals, sheet names, landscape fit-to-width print preview, repeated header row, and commercial/signature blocks.
5. Capture sanitized screenshots/notes outside raw client data and link them from the proof matrix before changing the spreadsheet row to pass.
