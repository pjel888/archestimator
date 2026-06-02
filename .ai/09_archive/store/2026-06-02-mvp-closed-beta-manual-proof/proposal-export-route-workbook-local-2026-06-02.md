# Proposal Export Route Workbook Local Proof - 2026-06-02

## Scope

Local Vitest route-handler integration proof for the XLSX export route. The test mocks only `getProjectEstimateTreeByEstimate()` and lets the actual route call `buildProposalExportModel()` plus `createProposalWorkbookBuffer()`.

This does not mutate Vercel, Supabase, Resend, auth providers, production data, backups, rollback state, DNS, legal, or spreadsheet-app state.

## Git Anchor

- Branch: `main`
- Commit under test: `97c7d60`

## Command

```bash
bunx vitest run tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-workbook.test.ts --maxWorkers=1
```

## Result

Pass:

- 3 test files passed.
- 9 tests passed.
- Duration: 2.30s.

## Behavior Proven

- `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` can build a real XLSX response through the route handler when repository data is available.
- The route returns the expected XLSX content type, attachment filename, `Content-Length`, and non-empty workbook bytes.
- ExcelJS can load the returned bytes.
- The returned workbook contains `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown`.
- Formula-backed cells are present in the route-generated workbook.

## Launch Meaning

This closes the local route-handler gap left by the prior route test that mocked `createProposalWorkbookBuffer()`.

It is not hosted readiness. Still missing:

- Vercel preview/staging export route timing and function memory proof.
- Hosted authenticated export smoke through closed-beta routes.
- Spreadsheet-app open/recalc/print proof in Excel plus one secondary spreadsheet app.
- Real demo/customer estimate export timing.
