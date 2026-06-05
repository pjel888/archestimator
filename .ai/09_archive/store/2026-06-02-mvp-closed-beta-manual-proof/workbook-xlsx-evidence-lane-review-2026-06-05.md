# Workbook/XLSX Evidence Lane Review - 2026-06-05

Status: documentation-only Task 3 review for the closed-beta launch evidence sprint. This note follows the leader lane override to focus only on workbook/XLSX export evidence. It does not mutate provider state, spend money, print secrets, store raw workbook bytes, or checkpoint/mutate `.omx/ultragoal`.

## Bottom Line

Workbook/XLSX evidence is strong for local generation, hosted authenticated XLSX bytes, ExcelJS ZIP/load validation, formulas, synthetic Google Sheets open/recalc/print-preview, and load-bound regression coverage. It is still not a fully green widened-beta proof because native Microsoft Excel, Apple Numbers, LibreOffice, real production/client workbook app behavior, and deeper hosted route timing/memory proof remain unproven.

This lane can be strengthened beyond synthetic Google Sheets without client-data exposure or paid/provider mutations by using only synthetic/demo workbook inputs, auth material passed through environment variables, sanitized JSON summaries, and manual/native-app observations that do not commit raw workbook bytes or screenshots containing sensitive proposal data.

## Current Evidence Map

| Evidence area | Current status | Concrete evidence |
| --- | --- | --- |
| Export route contract | Local code is bounded and returns a private XLSX attachment. | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:9-13` sets Node runtime plus node/row limits; `route.ts:32-41` builds the XLSX response with workbook MIME type, attachment disposition, content length, and `private, no-store`; `route.ts:44-86` checks limits before building the model/workbook and returns HTTP 413 on overflow. |
| Workbook builder contract | Local workbook generation has multi-sheet, formula-backed, print-aware structure. | `src/lib/proposal-export/create-proposal-workbook.ts:167-251` builds the Bid Form sheet with frozen headers, formulas, totals, and print layout; `create-proposal-workbook.ts:254-303` builds Summary formulas/totals; `create-proposal-workbook.ts:305-369` builds Commercial Terms and Source Breakdown; `create-proposal-workbook.ts:372-395` writes the ExcelJS workbook buffer. |
| Model caveat | Export is truthful about material/labor split limits. | `src/lib/proposal-export/build-proposal-export-model.ts:337-369` adds the `cost_split_compatibility_mode` issue: item cost exports as material, labor exports as 0, misc cost stays separate. |
| Hosted authenticated XLSX proof | Hosted download proof is closed for authenticated owner session and sanitized validation. | `.ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md:454-484` records owner browser export from production, signed-out redirect control, `file`/ZIP validation, ExcelJS workbook metadata, expected sheets, and no raw workbook bytes committed. |
| Synthetic Google Sheets proof | Secondary Google Sheets import/open/recalc/print-preview is proven only for a synthetic workbook. | `.ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md:185-215` records synthetic 25-row generation, ExcelJS readback, private Google Sheets import, visible tabs/totals, print settings, and the boundary that native Excel/Numbers/LibreOffice plus real production/client workbook app proof remain unproven. |
| Launch gate status | Workbook gate is partial-go, not fully green. | `.ai/03_plans/mvp-launch-readiness-2026-06-01/12-final-mvp-launch-gate.md:77` requires Excel plus secondary app open proof and hosted route timing; `.ai/03_plans/mvp-launch-readiness-2026-06-01/43-closed-beta-readiness-scorecard.md:25` scores Excel export 94 and names native/real workbook and Vercel route timing as unproven. |
| Current-state caveat | Canonical state agrees that synthetic Sheets is captured but native/real workbook proof remains open. | `.ai/10_state/current-state.md:173-176` names synthetic Google Sheets proof and project-specific/native workbook caveats; `.ai/10_state/current-state.md:297-300` keeps native/real production workbook app proof unproven beyond owner-only beta. |
| Raw artifact hygiene | Raw workbooks/screenshots must stay out of git. | `.ai/03_plans/mvp-launch-readiness-2026-06-01/14-evidence-index.md:208-211` and `14-evidence-index.md:477-479` record no raw workbook bytes committed. Keep any future proof to sanitized JSON/text summaries unless the owner explicitly approves a redacted artifact. |
| Workbook-related security | The chart/XLSX exhaustion finding is locally/hosted remediated, but residual history-risk is owner-accepted only for the single-owner beta. | `.ai/10_state/current-state.md:285-300` records Codex Security dashboard at `1-2 of 2`, chart/XLSX no longer the blocker, and residual history-exposure findings not fixed/fully green. |

## Missing Proof / Risk Register

1. Native Microsoft Excel, Apple Numbers, LibreOffice, or equivalent native spreadsheet app open/recalc/print-preview remains unproven.
2. Real production/client workbook opened in a spreadsheet app remains unproven. Use synthetic or owner-approved demo data only; do not commit client workbooks.
3. Hosted route timing/memory proof remains unproven at the route helper level. The existing hosted proof validates bytes/ZIP/workbook metadata but does not yet assert formula cells, sheet print settings, summary totals, or generation-time bounds from the downloaded bytes.
4. The workbook model still runs in material-cost compatibility mode because current estimate rows do not separate material and labor unit cost fields.
5. Codex Security history-exposure findings are owner-accepted only for the single-owner beta; do not call security fully green or widened-beta-ready without a later rescan/closure/history decision.

## Safe Next Actions

1. Extend `scripts/verify-hosted-export-route.ts` so, after the hosted XLSX byte checks, it optionally ExcelJS-loads the returned buffer and records sanitized sheet names, formula presence, Summary grand-total cell, print setup, byte length, and duration. Keep auth cookies/headers env-only and never write them to output.
2. Run `bun run launch:verify-hosted-export` only with owner-provided `HOSTED_EXPORT_*` environment inputs and `OUTPUT_FILE` pointing to a sanitized JSON artifact under this packet. Do not echo env values.
3. Generate a synthetic or owner-approved demo workbook with the same app builder and open it in already-installed native/secondary spreadsheet apps. If Excel is not installed, do not purchase it; record `not_available` and use Apple Numbers/LibreOffice only if already available or owner-approved.
4. For any real production workbook proof, validate in-memory or from a temporary download and then delete the file; commit only a sanitized JSON summary with file size/hash/sheet/formula/print assertions and no proposal/client line-item data.
5. If widened beta requires fully green security language, resolve the residual Codex Security history-risk path separately: owner acceptance is enough only for the current single-owner beta scope, not public/widened beta.

## Fresh Verification Run - Worker 3

- PASS: `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/hosted-export-route-smoke-script.test.ts --maxWorkers=1` -> 4 files / 14 tests passed.
- PASS: `bun run type-check` -> `tsc --noEmit` exited 0.
- PASS: `bun run lint -- src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts src/lib/proposal-export/build-proposal-export-model.ts src/lib/proposal-export/create-proposal-workbook.ts scripts/verify-hosted-export-route.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/hosted-export-route-smoke-script.test.ts` -> ESLint exited 0.
- NOT RUN: fresh hosted `launch:verify-hosted-export` because it requires owner auth cookie/header inputs; running it without those inputs would only prove the expected missing-secret failure and could risk exposing auth material if mishandled.

## Delegation / Integration Notes

- Subagents spawned: 3 review probes before further serial repo search, per Task 3 delegation contract.
- Completed workbook-relevant probes integrated: `019e952a-dfab-7952-9537-4d4f4c11c039` and `019e952a-e8ed-74c2-a149-2a3d45680e39`.
- Non-workbook sidecar closed after the leader lane override: `019e952a-e4e5-7912-a781-0cf1f691d35b`.
- Findings integrated: current gate is partial-go; hosted bytes and synthetic Google Sheets are proven; native/real workbook app proof plus hosted timing/deeper workbook assertions remain the safe next proof targets.
