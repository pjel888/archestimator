# Loop Ledger — Project Data Page

| Round | Phase | Status | Notes |
|---|---|---|---|
| R1 | research (6-agent workflow + judge) | ✅ done | Winner: Direction C insight-led; research.md + research-raw-wf1.json |
| R1 | plan | ✅ done | plan.md (Panels A/B/D zero-payload; C/drill in R2) |
| R1 | implement | ✅ done | concentration sentence, Panel A header, ranked ledger (Panel B), wire client, Panel D variance + always-visible table |
| R1 | verify | ✅ done | focused vitest suite, typecheck, desktop/mobile screenshots for category/supplier/space |
| R2 | composition (Panel C) | ✅ done | pre-aggregated `composition` totals (`baseTotal`, `miscTotal`, `adjustmentTotal`, `grandTotal`), reconciliation/payload tests, compact composition strip |
| R2 | Space drill + deeper row analysis | ↪ deferred | still intentionally out of payload until a separate SEC-1-safe row-preview/drill contract is designed |

## Verification evidence — 2026-06-20

- `bun run type-check` — pass.
- `bun run test:dom -- tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-charts-payload-contract.test.ts tests/vitest/project-data-insight-header-ui.test.tsx tests/vitest/project-data-concentration-sentence.test.ts tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/cost-donut-chart-ui.test.tsx tests/vitest/share/cost-donut-chart-hydration.test.tsx` — 10 files / 46 tests passed.
- `git diff --check` — pass.
- Screenshot harness final run:
  - `/tmp/archestimator-data/data-desktop.png` — HTTP 200.
  - `/tmp/archestimator-data/data-supplier-desktop.png` — HTTP 200.
  - `/tmp/archestimator-data/data-space-desktop.png` — HTTP 200.
  - `/tmp/archestimator-data/data-mobile.png` — HTTP 200.
  - `/tmp/archestimator-data/data-supplier-mobile.png` — HTTP 200.
  - `/tmp/archestimator-data/data-space-mobile.png` — HTTP 200.
  - Visual sample checked: desktop shows the secondary ring and composition panel; mobile shows the ranked numeric ledger without compressed bars or a stray donut.

## Screenshot harness
`scripts/.tmp-shot-data.mjs` — boots throwaway `next dev` + dev-auth bypass, captures
`/workshop/projects/<id>/data` (category/supplier/space) at desktop+mobile.
Run: `BYPASS_SECRET=<32+ chars> OUT_DIR=/tmp/archestimator-data node scripts/.tmp-shot-data.mjs`
(final run on 2026-06-20 captured all six views at HTTP 200.)
