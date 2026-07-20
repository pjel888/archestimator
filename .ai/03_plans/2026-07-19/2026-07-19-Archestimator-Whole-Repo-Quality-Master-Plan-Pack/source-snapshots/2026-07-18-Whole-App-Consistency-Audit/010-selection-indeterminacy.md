# Unit 010 — Selection Indeterminacy Under Selected Parent (REFUTED — dead code)

**Finding:** F-10 · **Original severity:** MEDIUM · **Re-verdict (2026-07-19):** **REFUTED** · **Status:** REJECTED

## Original claim

`getSelectionState` short-circuits to `{checked:true, indeterminate:false}` for a selected node
without inspecting descendants, hiding partial selection.

## Why it's refuted (zero production callers)

`grep` across `src/` shows `getSelectionState` has **zero production callers** — only
`tests/unit/tree-selection.test.ts` imports it. The three UI trees
(`EstimateSheetTree.tsx:30-35`, `component-library/index.tsx`, `LibraryFolderTree.tsx`) import
only `toggleCascadeSelection`, `selectVisibleIds`, `pruneSelection`, `dedupeSelectedRoots`.

The short-circuit logic flaw exists in the function body, but it cannot manifest in any UI flow
because no UI calls the function.

## Disposition

**REJECTED** as a user-facing bug. The function is dead code. Options for the owner:
- Delete `getSelectionState` (and its unit test) if it's not intended for future use, or
- Fix the short-circuit (per original unit) if it will be revived.

Either way, not an active defect. Kept in the register so the claim isn't re-raised.
