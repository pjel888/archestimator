# Unit 003 — Sheet Adjustment 0% Cached (REFUTED)

**Finding:** F-03 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **REFUTED** · **Status:** REJECTED

## Original claim

`withSheetAdjustmentSettings` returns unchanged when `percentage === 0`, so switching from a
5% discount back to 0% can export with the old 5% still applied if prior settings cached the rate.

## Why it's refuted (the cache doesn't exist)

The entire premise — "a cached prior value" — is fabricated. `sheetAdjustmentRate` is **never
cached anywhere**:

- `parseExportSettings` (`route.ts:47-55`) parses only `contingencyRate`/`vatRate` from the URL;
  `sheetAdjustmentRate` is not in its allowlist.
- `withSheetAdjustmentSettings` (`route.ts:177-187`) reads `result.sheetAdjustment`, which comes
  **fresh from the DB** via `getEstimateTabTree` / `getEstimateTreesForTabs` /
  `getProjectEstimateTreeByEstimate` on every request (`workspace-repository.ts:3516`).
- When `percentage === 0`, the field is omitted and falls through to
  `defaultProposalExportSettings.sheetAdjustmentRate = 0` (`settings.ts:16`) — which is correct.

There is no client, store, or stale layer holding a prior rate. The 0% short-circuit produces the
correct value (0) through the default. No bug.

## Disposition

**REJECTED.** No code change. The `percentage === 0` short-circuit is harmless because the value
is always re-resolved from the DB and the default is 0.
