# Proposal Workbook Benchmark Regression Coverage - 2026-06-02

Status: local regression proof added; launch remains NO-GO until hosted/spreadsheet proof exists.

## Scope

This artifact records a focused test slice for `scripts/benchmark-proposal-workbook.ts`, the local synthetic benchmark used to support synchronous XLSX generation for closed-beta scale.

The slice makes the benchmark fixture import-safe for tests, without changing the large-fixture benchmark result already recorded in `proposal-workbook-large-fixture-benchmark-2026-06-02.md`.

## Files

- `scripts/benchmark-proposal-workbook.ts`
- `tests/vitest/proposal-workbook-benchmark.test.ts`

## Verified Behavior

- `parseRowCounts()` accepts only positive row counts and fails closed when none are valid.
- `makeProposalRow()` builds deterministic BOQ rows with source row/node metadata, source area paths, cost amounts, and scope metadata.
- `makeBenchmarkModel()` keeps proposal row counts, source breakdown row counts, section summary row counts, and grand totals internally consistent.
- `runBenchmark(3)` exercises the real `createProposalWorkbookBuffer()` path on a tiny fixture so helper changes cannot silently break workbook generation.

## Commands

```bash
bunx vitest run tests/vitest/proposal-workbook-benchmark.test.ts tests/vitest/proposal-workbook.test.ts --maxWorkers=1
bun run type-check
```

Results:

- Vitest passed 2 files / 8 tests.
- TypeScript passed with `tsc --noEmit`.

## Launch Meaning

This closes a local regression-coverage gap for the benchmark fixture code that supports the export performance evidence. It does not prove Vercel route timing/memory, Excel or secondary spreadsheet open/recalc/print behavior, or hosted authenticated export smoke.
