# Estimate Tabs Phase 6 XLSX Tab Export Implementation Run

**Date:** 2026-06-13 Asia/Manila  
**Branch/worktree:** `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`  
**Status:** IMPLEMENTED LOCALLY / PROVIDER AND MANUAL SPREADSHEET-APP PROOF OPEN

## Scope implemented

- Added `src/lib/proposal-export/worksheet-name.ts` for Excel worksheet-name sanitization, 31-character truncation, reserved/global-name dedupe, deterministic suffixes, unicode normalization, and quoted formula references.
- Extended the proposal workbook builder so the legacy single-tab model still emits the exact four-sheet shape: `Bid Form`, `Summary`, `Commercial Terms`, `Source Breakdown`.
- Added tabbed workbook support: default multi-tab exports open with global `Summary`, then one bid-form-layout worksheet per active estimate tab, then global `Commercial Terms` and `Source Breakdown`.
- Added the Source Breakdown `TAB` column for tabbed workbooks.
- Updated the XLSX route so `/export/proposal.xlsx` exports all active tabs by default when multiple active tabs exist, while `/export/proposal.xlsx?tab={tabId}` exports a single active tab in the old four-sheet shape and returns 404 for unknown/archived tabs.
- Extended filename generation to accept an optional tab part for active-tab exports.
- Re-enabled active-tab preview for multi-tab estimates and made the preview download link scoped to `?tab={activeTabId}` so preview/download remain aligned.
- Extended the local workbook benchmark harness with tabbed fixtures.

## Fresh verification evidence

- `bun run type-check` — pass.
- `bun .omx/tmp/check-no-excuse-rules.ts src/lib/proposal-export/worksheet-name.ts src/lib/proposal-export/types.ts src/lib/proposal-export/create-proposal-workbook.ts 'src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts' 'src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts' src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProposalExportPreviewDialog.tsx scripts/benchmark-proposal-workbook.ts tests/vitest/proposal-worksheet-name.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook-benchmark.test.ts` — pass, no violations in 13 files.
- `bun x vitest run tests/vitest/proposal-worksheet-name.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1` — pass, 6 files / 29 tests.
- `bun -e 'import { runTabbedBenchmark } from "./scripts/benchmark-proposal-workbook.ts"; const run = await runTabbedBenchmark(5, 500); console.log(JSON.stringify(run, null, 2)); if (run.durationMs > 1500 || run.bufferBytes >= 10 * 1024 * 1024) process.exit(1);'` — pass: 2,500 rows, 5 tabs, 443.59ms, 413,142 bytes / 0.39 MiB.
- `git diff --check` — pass.
- `bun run validate` — pass: typecheck, lint, design-system lint, design lint, unit tests, and Vitest DOM aggregate; 243 Vitest files passed / 1 skipped, 1,767 tests passed / 3 skipped.
- `bun run build` — pass: Next.js 16.2.6 production build compiled, type-checked, collected page data, and generated 35 static pages.
- `POSTGRES_BIN_DIR=/opt/homebrew/bin node scripts/prove-estimate-tabs-postgres.mjs` — pass: estimate-tabs local Postgres proof passed.

## Open proof boundaries

- No linked Supabase apply/typegen was run; Docker remains unavailable locally and linked-provider mutation remains owner-authorization-gated.
- No hosted Vercel route smoke or production deploy was run.
- No manual Excel/Numbers/LibreOffice recalc/print proof was run.
