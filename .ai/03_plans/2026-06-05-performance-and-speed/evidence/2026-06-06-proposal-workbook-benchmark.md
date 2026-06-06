# Proposal Workbook Benchmark Baseline

Date: 2026-06-06 (session local date; JSON timestamp is UTC)
Worktree: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`
Branch: `feat/performance-and-speed-pr-0b-cache-safety`

## Scope

This evidence advances Workstream 6.3 for proposal export performance. It is a **local synthetic workbook-generation benchmark** for `createProposalWorkbookBuffer()`, not hosted route latency proof, not Vercel function memory proof, and not spreadsheet-app open/recalc/print proof.

## Command

```bash
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-proposal-workbook-benchmark.json \
bun run scripts/benchmark-proposal-workbook.ts
```

Result: passed.

## Metrics

Artifact: `2026-06-06-proposal-workbook-benchmark.json`.

| Proposal rows | Duration | Buffer bytes | Buffer MiB | RSS MiB | Heap used MiB |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 170.17ms | 94423 | 0.09 MiB | 156.3 MiB | 19.19 MiB |
| 1000 | 172.6ms | 172678 | 0.16 MiB | 204.36 MiB | 39.74 MiB |
| 2500 | 393.39ms | 408693 | 0.39 MiB | 261.78 MiB | 69 MiB |

## Decision

Status language: **LOCAL PROPOSAL WORKBOOK BENCHMARK CAPTURED / HOSTED EXPORT ROUTE PROOF OPEN**.

Do not use this benchmark alone to justify streaming, queueing, worker offload, or route/runtime changes. Workstream 6.3 still needs hosted export route timing/memory proof with representative and near-limit fixtures before selecting an optimization.
