# Local Persistence and Project Routing Slice

**Date:** 2026-05-16
**Status:** Implemented on `feat/local-persistence-project-routing`

## Purpose

Move Archestimator from a static seed-driven demo to a usable local-first MVP loop:

1. Project dashboard at `/`.
2. Project-specific estimate workspace at `/projects/[projectId]`.
3. Mutable local JSON runtime file initialized from tracked seed data.
4. Server actions for saving estimates, duplicating revisions, and issuing immutable proposal snapshots.

## Implemented files

- `src/app/page.tsx` — project dashboard.
- `src/app/projects/[projectId]/page.tsx` — project detail estimate workspace.
- `src/app/actions.ts` — server actions for local persistence operations.
- `src/lib/local-data/json-file-store.ts` — validated JSON read/write with atomic temp-file rename.
- `src/lib/local-data/mutations.ts` — pure database mutations for estimate save, revision duplication, proposal snapshot issuance.
- `src/lib/money/format.ts` — workspace-currency money formatting.
- `src/components/estimate-workspace.tsx` — wired to project route, workspace currency, save/revision/proposal snapshot actions.

## Behavior

### Mutable data file

Runtime data lives at:

```text
data/local/runtime.json
```

It is created from:

```text
data/local/seed.json
```

The runtime file is intentionally ignored by git so project/client edits are not committed.

Set `ARCHESTIMATOR_DATA_PATH` to test or run against another local JSON file.

### Estimate save

The proposal tab exposes `Save estimate to local JSON`. This calls a server action and replaces the matching estimate in the mutable database.

### Revision duplication

The versions tab supports:

- `Duplicate draft locally` — in-browser only, useful while experimenting.
- `Save as persisted revision` — server action that creates a new estimate revision, copies rows, increments version label, and updates the project pointer.

### Proposal snapshot

The proposal tab exposes `Issue immutable proposal snapshot`. The server action first saves the current client estimate state, then creates a `proposalSnapshot` record with:

- source estimate ID
- project ID
- issued timestamp
- workspace currency
- frozen total
- frozen section totals

It does not mutate the source estimate.

## Codex bot comments addressed

- Money formatting no longer hard-codes PHP in the workspace component. It uses `database.workspace.defaultCurrency`.
- Library insertion now carries `defaultWastePercent` into estimate rows.
- Totals calculation now respects row-level `wastePercent`.
- Persistence is server-only and behind a repository/store boundary.

## Validation coverage

Unit tests added for:

- money formatting
- default waste copying from library to row
- mutation functions
- JSON file store atomic write path

E2E now covers:

- project dashboard
- project-specific estimate workspace route

## Deferred

- UI success/toast state after server actions.
- PDF export.
- Diff/restore UI for historical estimates.
- Multi-project creation form.
- Concurrency locking beyond atomic write rename.
