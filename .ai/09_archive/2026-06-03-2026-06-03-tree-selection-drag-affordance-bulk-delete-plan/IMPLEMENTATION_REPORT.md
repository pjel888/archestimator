# Tree Selection, Drag Affordance, and Bulk Delete Implementation Report

**Date:** 2026-06-03
**Branch:** `feat/tree-drag-and-select`
**Archive path:** `.ai/09_archive/2026-06-03-2026-06-03-tree-selection-drag-affordance-bulk-delete-plan/`
**Status:** Local implementation complete; hosted/manual beta evidence remains separate.

## What shipped

- Shared drag-handle, selection-checkbox, and bulk-action toolbar primitives for workshop tree rows.
- Shared tree-selection utility coverage for visible selection, cascade toggle, pruning, indeterminate state, and root de-duplication.
- Estimate tree selection, visible drag handles, typed confirmation, optimistic bulk node deletion, and rollback handling.
- Server-side bulk estimate-node deletion plus bulk/single estimate-sheet deletion actions.
- Library folder tree selection and visible drag handles, with server-side bulk folder deletion.
- Component catalogue selection with archive-first bulk action; hard delete remains intentionally gated behind admin/zero-reference proof.
- Project estimate table select-visible checkbox, typed confirmation, single-sheet delete, and bulk sheet delete.
- Project card selection overlay and safe bulk project deletion for editable owned projects only.

## Validation evidence

- `bunx vitest run tests/vitest/estimate-tree-modal.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1` — passed 2 files / 16 tests after adapting DOM tests to the new checkbox/treeitem row semantics.
- Focused feature regression suite — passed 11 files / 113 tests.
- `bun run type-check --pretty false` — passed.
- `bun run lint:design-system` — passed.
- `bun run lint` — passed with the existing 14 warnings / 0 errors.
- `bun run build` — passed after final staging under Next.js 16.2.6 / Turbopack.
- `bun run validate` — passed: type-check, lint, design-system lint, unit tests (9 passed), and DOM tests (164 files / 1299 passed / 2 skipped).

## Graph / impact evidence

Impact checks were run before product symbol edits. Notable blast radius findings:

- `WorkshopTreeRow` — HIGH risk; changes were limited to existing row slot semantics and div/button prop hygiene.
- `EstimateSheetTree` — MEDIUM risk; changes were localized to tree selection, delete confirmation, and existing action/query flows.
- `LibraryFolderRow` and `LibraryItemRow` — HIGH risk; changes were limited to visible drag-handle slot insertion.
- `LibraryFolderTree`, `ProjectEstimatesTable`, `ProjectsPageClient`, `LiveProjectCard`, delete actions, and shared primitives — LOW to MEDIUM risk with targeted tests added or refreshed.

Final code-review-graph staged detection: 48 changed files, 119 changed functions/classes, 0 affected flows, 63 structural test gaps, overall risk score 0.40. Final GitNexus staged detect-changes: 37 files, 141 symbols, 15 affected processes, HIGH risk. The HIGH risk is expected because this feature touches broad workshop UX/server-action surfaces; it is mitigated by focused regression coverage, full `bun run validate`, final `bun run build`, and conservative archive/roadmap status language.

## Known risks and follow-ups

- Bulk estimate-node deletion loops the existing history-preserving RPC server-side. It avoids client loops, but it is not a single custom database transaction across all selected roots; a future SQL RPC can consolidate this if beta usage requires stronger all-or-nothing semantics.
- Component hard delete is intentionally not exposed in product UI. Bulk component action archives selected components; hard delete requires admin access and zero-reference proof.
- This archive is local implementation evidence only. It does not close hosted beta proof for provider-backed auth, Supabase linked RLS/storage, Resend delivery, Vercel deployment, or manual browser acceptance.
