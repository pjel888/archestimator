# Plan: All Routes/Feature Coverage + Glide Hardening

**Date:** 2026-05-17
**Status:** Implemented, pending PR CI

## Goal

Answer the coverage question directly: verify every current app route and major MVP feature before continuing deeper production migration.

## Route inventory from `next build`

- `/` — project dashboard and create-project form
- `/projects/[projectId]` — editable estimate workspace
- `/proposals/[proposalId]` — issued proposal snapshot/print page
- `/spikes/estimate-grid` — Glide/dnd-kit estimate grid spike
- `/_not-found` — framework not-found route

## Coverage added

- Home dashboard loads and exposes project creation form.
- Project workspace loads with estimate sheet, cost library, proposal mapping selectors, and selected working section.
- Workspace feature flow covers:
  - selecting another working section
  - adding a blank row
  - confirming section-aware proposal mapping
  - adding a cost-library row
  - editing quantity
  - verifying live total recalculation
- Proposal feature flow covers:
  - opening proposal tab
  - editing proposal subject
  - verifying proposal section summaries
  - issuing immutable proposal snapshot
  - verifying `/proposals/[proposalId]`
- Revision feature flow covers local duplicate revision controls.
- Spike route covers:
  - spreadsheet shell
  - space tree
  - library tray
  - fallback click insertion
- Unknown project route verifies 404 behavior.

## Production fixes made during coverage work

- Section-aware proposal mapping was hardened for blank row and library insertion paths.
- E2E tests now reset `data/local/runtime.json` from seed before each test to prevent cross-test pollution.
- Glide spike drop-row tracking now records visible row offset via `onVisibleRegionChanged`, so future drag/drop behavior has a path toward scroll-aware insertion.

## Acceptance criteria

- Full validation passes: type-check, lint, unit, DOM tests.
- Production build passes and route inventory is known.
- E2E covers all routes and main MVP features.
- Independent review confirms no blocking coverage or product-regression issue.
