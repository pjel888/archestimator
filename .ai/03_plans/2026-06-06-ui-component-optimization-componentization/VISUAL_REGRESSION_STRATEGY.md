# Visual Regression Strategy

**Scope:** Manual/browser visual verification guidance for future implementation.
**No screenshots were captured during this docs-only refinement.**

## Surfaces To Inspect

| Surface | Route/screen | Inspect |
| --- | --- | --- |
| Estimate tree | `/workshop/projects/[projectId]/estimates/[nodeId]` | row spacing, indentation, disclosure controls, selected/focused state, drag affordances, context menu trigger |
| Estimate sheet rows | same | cell sizing, focus rings, inline edits, row details modal trigger, command palette interaction |
| Library folder tree | `/workshop/library` | folder row density, selected folder, reorder state, empty folders |
| Add Component modal | `/workshop/library` and estimate sidebar flow | form alignment, folder picker, search, footer actions |
| Share tree panel/view | `/share/[token]` | read-only indentation, selected row, totals, no workshop-only controls |
| Template tree | `/workshop/templates` | shared `WorkshopTree` row usage |

## Baseline Capture Procedure

1. Start the app with `bun run dev`.
2. Use stable local data with known expanded/collapsed states.
3. Capture desktop and mobile screenshots before edits.
4. Capture the same states after each phase.
5. Store screenshots in a future approved evidence location; do not store private customer data, tokens, cookies, or share URLs.

## Visual Acceptance

- Text fits inside its controls.
- No nested card shells are introduced.
- SF Pro, compact app sizing, neutral palette, and xs radius remain consistent with `DESIGN.md`.
- Phosphor icon style is preserved where icons exist.
- Keyboard focus is visible and does not shift layout.
- Tree indentation and connector affordances are stable across expanded/collapsed states.
- Share surfaces do not expose editable workshop controls.
