# MVP Interactive Estimate Workspace Slice

**Date:** 2026-05-16
**Status:** Implemented on `feat/nextjs-local-mvp-setup`

## Purpose

Turn the static Archestimator scaffold into a working local-first MVP surface where a contractor can:

- edit estimate rows
- change quantities and rates
- insert reusable library items
- see totals update immediately
- view basic version/revision state
- preview a proposal package from the live estimate

## Implemented behavior

### Estimate workspace

- `src/app/page.tsx` now server-loads local JSON through `createLocalRepository()`.
- `src/components/estimate-workspace.tsx` owns the interactive client workspace.
- `/` is marked dynamic with `export const dynamic = "force-dynamic"` so local JSON is not treated as a build-time static snapshot.

### Editable estimate sheet

Rows support editing:

- item name
- description
- quantity
- unit
- material unit cost
- labor unit cost
- scope status

The sheet recalculates immediately through shared estimate total utilities.

Excluded/by-others/not-applicable rows are displayed but omitted from the current grand total policy.

### Cost library insertion

The right panel includes searchable local cost library cards.

Clicking `Add to estimate` creates a copied editable estimate row with:

- `sourceLibraryItemId`
- copied name/unit/rates/pricing date
- `linkState: linked-clean`
- quantity defaulted to `1`

Editing pricing/library-derived fields changes the row link state to `linked-overridden`. Editing quantity keeps `linked-clean` because quantity is project-specific.

### Version panel

The `Versions` tab includes:

- current local draft version list
- `Duplicate as revision` action
- generated revision labels such as `Rev 02`

This is local in-memory behavior only. It demonstrates the UX contract without overbuilding storage before the data model stabilizes.

### Proposal panel

The `Proposal` tab renders a client-facing draft preview with:

- project and location text
- total proposed amount
- section summary
- commercial placeholder terms
- explicit warning that the preview is not an issued immutable snapshot

This is not PDF export yet.

## Architecture notes

- Repository stays server-only via `server-only` import.
- UI still does not connect to Supabase.
- Local JSON remains the seed source; interactive edits are in browser memory for now.
- Persistence is intentionally deferred until the local mutation model is designed.

## Tests added

Unit:

- `tests/unit/library-insert.test.ts`
- `tests/unit/estimate-totals.test.ts`

Component:

- `tests/vitest/estimate-workspace.test.tsx`

E2E:

- `e2e/home.spec.ts` updated for the interactive workspace.

## Known limitations

- In-browser edits do not persist across refresh yet.
- No undo/redo.
- No import/export.
- No PDF generation.
- Version duplication is in-memory only.
- Proposal preview is not an issued immutable snapshot yet.
- No multi-project dashboard yet.

## Next recommended implementation slice

Implement local persistence and project workspace routing:

1. Create runtime mutable local JSON path separate from tracked `seed.json`.
2. Add repository write APIs with atomic writes.
3. Add server actions for saving estimates/revisions.
4. Add project dashboard and project detail routes.
5. Add explicit `Issue proposal snapshot` flow that freezes proposal data.
