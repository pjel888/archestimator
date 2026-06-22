# Readiness Scorecard

## Planning Readiness

| Gate | Status | Evidence |
| --- | --- | --- |
| Scope names the exact surface | Pass | Estimate Sheet right sidebar only. |
| Current state is code-backed | Pass | Anchors in `index.tsx`, `buildLibraryTree.ts`, `project-component-projection.ts`, `EstimateSheetContent.tsx`, `cells.tsx`. |
| Target IA is explicit | Pass | `Library`, `Project`, `Templates`. |
| Data ownership rule is explicit | Pass | Project tab uses strict project projection metadata/contract. |
| File blast radius is bounded | Pass | Main risk files named in `04-blast-radius-and-concurrency-watch.md`. |
| QA matrix exists | Pass | Focused unit/DOM/integration cases in `06-qa-verification-matrix.md`. |
| Rollback path exists | Pass | View-local rollback in `07-rollout-rollback-and-stop-conditions.md`. |
| Visual proof policy is clear | Pass | Skipped for planning; deferred only to implementation browser-only claims. |
| Open decisions isolated | Pass | `08-open-decisions-and-risk-register.md`. |

## Implementation Readiness

Status: ready for a scoped implementation pass.

Conditions before coding:

- Re-read dirty worktree status.
- Re-read touched files immediately before patching.
- Keep changes scoped to the sidebar and tests.
- Start with partition helper tests.
- Preserve Templates behavior.

## Recommended Test Command Shape

Use targeted tests first, for example:

```bash
bun test tests/vitest/project-component-projection.test.ts tests/vitest/component-library-helpers.test.ts tests/vitest/component-library-ui.test.tsx
```

Then add relevant estimate-sheet tests if insertion/invalidation behavior changes:

```bash
bun test tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx
```

Do not rely on full `bun run validate` as the first proof because current state records unrelated baseline reds/hangs.

## Residual Risk

The only meaningful unresolved product decision is source-less manual rows. The code currently labels them `Project Component` in row details, but does not project all of them into the sidebar library. The recommended v1 behavior is to keep the Project tab strict and fail-closed.

