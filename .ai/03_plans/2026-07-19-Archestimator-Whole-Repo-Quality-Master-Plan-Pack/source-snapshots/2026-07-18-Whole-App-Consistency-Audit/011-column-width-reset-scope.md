# Unit 011 — `resetEstimateColumnWidths` Wipes The Global Last-Used Key (MEDIUM)

**Finding:** F-11 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

`resetEstimateColumnWidths(estimateId)` deletes both the per-estimate storage key
**and** the workspace-wide `LAST_USED_KEY`. The next estimate opened will fall back
to defaults instead of the user's last-used widths. Resetting one estimate
shouldn't nuke the global preference.

## Evidence

`src/stores/estimate-column-widths-store.ts:96-111`:
```ts
resetEstimateColumnWidths: (estimateId) => {
  if (!estimateId) return;
  removeStorageKey(estimateStorageKey(estimateId));
  removeStorageKey(LAST_USED_KEY); // ← wipes global preference
  set((state) => ({
    widthsByEstimateId: { ...state.widthsByEstimateId, [estimateId]: EMPTY_ESTIMATE_COLUMN_WIDTHS },
    lastUsedWidths: EMPTY_ESTIMATE_COLUMN_WIDTHS, // ← and resets in-memory global
    ...
  }));
},
```

## Fix Direction

Only clear the per-estimate key; leave `LAST_USED_KEY` (and the in-memory
`lastUsedWidths`) alone:

```ts
resetEstimateColumnWidths: (estimateId) => {
  if (!estimateId) return;
  removeStorageKey(estimateStorageKey(estimateId));
  set((state) => ({
    widthsByEstimateId: { ...state.widthsByEstimateId, [estimateId]: EMPTY_ESTIMATE_COLUMN_WIDTHS },
    hydratedEstimateIds: { ...state.hydratedEstimateIds, [estimateId]: true },
  }));
},
```

### Owned paths
- `src/stores/estimate-column-widths-store.ts`

### Prohibited
- Do not change the `setEstimateColumnWidths` write path (it correctly updates
  `lastUsedWidths`).

## Acceptance Evidence

- `AC-001`: resetting estimate A's widths does not change estimate B's
  last-used widths.

## Recovery

None needed.
