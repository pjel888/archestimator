# Unit 003 — Sheet Adjustment Rate Dropped When `percentage === 0` (HIGH)

**Finding:** F-03 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-003` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

`withSheetAdjustmentSettings` returns the settings unchanged whenever
`sheetAdjustment.percentage === 0`. Because the **mode** is also dropped in that
branch, a previously-applied adjustment can persist into a later export. Switching
from a 5% discount back to 0% in the UI can export with the old 5% still applied if
prior settings cached `sheetAdjustmentRate`.

## Evidence

`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:177-187`

```ts
function withSheetAdjustmentSettings(
  settings: Partial<ProposalExportSettings>,
  sheetAdjustment: EstimateSheetAdjustment | null | undefined,
): Partial<ProposalExportSettings> {
  if (!sheetAdjustment || sheetAdjustment.percentage === 0) return settings; // drops mode + rate
  return {
    ...settings,
    sheetAdjustmentMode: sheetAdjustment.mode,
    sheetAdjustmentRate: sheetAdjustment.percentage,
  };
}
```

`percentage === 0` is a legitimate, meaningful value (a 0% contingency/discount is
a real configuration), and clearing a previous non-zero adjustment back to 0 must
zero the exported rate too.

## Fix Direction

Always pass through the resolved mode and rate when a `sheetAdjustment` exists,
even at 0%:

```ts
function withSheetAdjustmentSettings(settings, sheetAdjustment) {
  if (!sheetAdjustment) return settings; // only short-circuit on absence
  return {
    ...settings,
    sheetAdjustmentMode: sheetAdjustment.mode,
    sheetAdjustmentRate: sheetAdjustment.percentage, // 0 is a valid, meaningful value
  };
}
```

The only short-circuit that should remain is `!sheetAdjustment` (no adjustment
configured at all).

### Owned paths
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`

### Prohibited
- Do not default `sheetAdjustmentMode` to a guess when absent; only set it when the
  adjustment object is present.

## Acceptance Evidence

- `AC-001`: diff shows `percentage === 0` no longer short-circuits.
- `AC-002`: an estimate switched from 5% discount → 0% exports with
  `sheetAdjustmentRate = 0` and the current mode (static proof via the function
  body).

## Recovery

None needed; the change is a strict widening of the passthrough condition.
