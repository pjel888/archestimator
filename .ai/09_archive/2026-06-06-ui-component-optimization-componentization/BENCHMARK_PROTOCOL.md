# Benchmark Protocol

**Purpose:** Define exactly how to collect measurements before performance-sensitive phases.
**Applies to:** Phases 0, 5, 6, 8, and any memoization/dynamic-import work.

## Preconditions

1. Work from a scoped implementation branch, not `main`.
2. Run `git status --short --branch` and record unrelated dirty files.
3. Confirm `npx gitnexus status` is up to date or run `npx gitnexus analyze`.
4. Confirm the route-transition plan's current canonical doc has been read.
5. Use a realistic local fixture or owner-approved provider-safe data set.

## Commands

Run the smallest relevant set for the phase:

```bash
bun run type-check
bun run lint:design-system
bun test tests/vitest/workshop-tree-row-affordances.test.tsx
bun test tests/vitest/library-folder-tree-selection.test.tsx
bun test tests/vitest/library-folder-reorder.test.ts
bun test tests/vitest/estimate-tree-bulk-selection.test.tsx
bun test tests/vitest/estimate-sheet-tree-dnd.test.tsx
bun test tests/vitest/estimate-tree-modal.test.tsx
bun test tests/vitest/component-library-manager-ui.test.tsx
bun test tests/vitest/route-transition-peak-load-profile.test.tsx
```

Future tests listed in `IMPLEMENTATION_MATRIX.md` must be added by the implementation phase before they can be treated as validation evidence.

## React Profiler Procedure

1. Start the app with `bun run dev`.
2. Open the target route in Chrome with React DevTools installed.
3. Use React DevTools Profiler.
4. Record one clean mount.
5. Record at least these interactions:
   - expand tree node
   - collapse tree node
   - select node
   - search/filter where available
   - edit estimate row value where editable
   - open/close Add Component modal where relevant
6. Export or summarize `actualDuration`, `baseDuration`, commit count, component stack, and interaction notes.
7. Store only sanitized data in this plan pack or a future evidence folder. Do not record secrets, customer payloads, tokens, raw cookies, or provider credentials.

## Bundle/Route Procedure

Use route-transition plan rules when code splitting is involved:

1. Read `.ai/03_plans/route-transition-performance-optimization/14-code-splitting-named-exports.md`.
2. Use named-export dynamic import syntax only where needed.
3. Record before/after route chunk size if bundle tooling is available.
4. Do not claim bundle improvement without before/after numbers.

## Result Format

Add a dated row to `MEASUREMENT_BASELINE.md` with:

- date and branch
- fixture source
- route/screen
- visible rows and total nodes
- profiler actualDuration values
- command output summary
- pass/fail decision for the next phase

## Stop Conditions

Stop and do not implement the next phase if:

- the fixture is too small to support the claim;
- Profiler data is missing for a performance claim;
- existing targeted tests fail before edits;
- code-review graph or GitNexus reports `HIGH`/`CRITICAL` risk without owner acknowledgement;
- route-transition plan deconfliction is unresolved.
