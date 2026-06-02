# Proposal Workbook Large-Fixture Benchmark - 2026-06-02

## Scope

Local synthetic workbook-generation benchmark for the proposal XLSX builder. This proof exercises `createProposalWorkbookBuffer()` and the in-memory ExcelJS `writeBuffer()` path used by the export route.

This does not mutate Vercel, Supabase, Resend, auth providers, production data, backups, rollback state, DNS, or legal/manual QA artifacts.

## Git Anchor

- Branch: `main`
- Commit under test: `e6539c6`
- Evidence time: `2026-06-02T02:56:03Z`

## Command

```bash
OUTPUT_FILE=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/proposal-workbook-large-fixture-benchmark-2026-06-02.json \
PROPOSAL_WORKBOOK_BENCHMARK_ROWS=500,1000,2500 \
bun run scripts/benchmark-proposal-workbook.ts
```

## Result

| Rows | Source breakdown rows | Summary rows | Duration | Buffer bytes | Buffer MiB | RSS MiB | Heap used MiB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 500 | 10 | 148.12ms | 93,073 | 0.09 | 151.72 | 20.75 |
| 1,000 | 1,000 | 10 | 165.56ms | 170,029 | 0.16 | 200.52 | 39.98 |
| 2,500 | 2,500 | 10 | 362.06ms | 402,284 | 0.38 | 270.56 | 76.65 |

JSON artifact: `proposal-workbook-large-fixture-benchmark-2026-06-02.json`.

## Launch Meaning

The local synchronous workbook builder is below the current local large-fixture threshold from `23-performance-caching-redis-scalability-plan.md` (`< 15s`) for 500, 1,000, and 2,500 generated rows.

This reduces local evidence risk for the Excel export implementation and supports the current decision to defer Redis/job queues for export until hosted/runtime evidence shows a need.

It is not launch approval. Required proof still missing:

- Vercel preview/staging export route timing, server logs, and function memory/runtime evidence.
- Excel plus one secondary spreadsheet app open/recalc/print proof.
- Real customer/demo estimate export timing.
- Hosted/manual E2E export smoke through authenticated closed-beta routes.
