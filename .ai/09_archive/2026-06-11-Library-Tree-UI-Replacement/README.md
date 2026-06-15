# Library Tree UI Replacement — Orientation

**Read this first if you are the implementing agent.**

## What we are doing

Replace the `react-complex-tree`-based folder tree in `/workshop/library/components` with the same `Tree` primitive that the estimate workspace already uses (`src/components/ui/tree.tsx`). The goal is one tree implementation across the workshop, not two. We are pre-release MVP: no feature flags, no staged rollout — build the new `FolderTree` beside the old one, swap, clean up. Three PRs (doc 05).

## Why it matters

- **Design-system consistency:** The product register (`reference/product.md`) and `DESIGN.md` require a single reusable component vocabulary. The library route currently violates that by using a different tree library for one view mode.
- **Maintenance cost:** `LibraryFolderTree.tsx` is 1,371 LOC and the only consumer of `react-complex-tree` in the workshop.
- **User-experience parity:** Selection, drag handles, focus rings, and keyboard behavior differ subtly between the two trees. Unifying them removes those inconsistencies.

## The three things that make this safe

1. **A working reference implementation exists.** `src/components/workshop/EstimateSheetTree.tsx` (1,465 LOC) already does canonical-Tree + domain drop planner + optimistic state + bulk selection. Doc 10 maps it line-by-line onto every `FolderTree` concern. Read that file end-to-end first.
2. **The drop planner is already decoupled.** `buildLibraryFolderReorderPlan` in `library-folder-reorder.ts` is react-complex-tree-free and unit-tested; only a ~35-line translator needs replacing. Doc 09 is the exact contract.
3. **The test suite is the safety net.** Six Vitest files pin the tree's DOM and logic (three of them mock `react-complex-tree` and must have those mocks deleted at swap time). Doc 08 is the contract; doc 12 adds the real DOM DnD, keyboard/ARIA, modal-save, performance, and adversarial QA gates.

## The hard part

The folder tree is not a simple list. It mixes:
- Folder rows (draggable for reorder, selectable in bulk, context-menu CRUD)
- Component rows (draggable to move between folders, clickable to select the folder)
- An "All Components" synthetic root with its own guard rails (doc 11 §2)
- Search that reveals components under matching folders
- View-mode switching between Folders, Suppliers, and Brands (Suppliers/Brands already canonical — untouched)

## Start here

1. Read `src/components/workshop/EstimateSheetTree.tsx` end-to-end, then `LibraryFolderTree.tsx` (the spec being replaced).
2. Read `12_IMPLEMENTATION_READINESS_RUNBOOK.md`, then `09_DROP_EVENT_TRANSLATION_CONTRACT.md`, `08_TEST_IMPACT_AND_DOM_CONTRACT.md`, `10_REFERENCE_IMPLEMENTATION_ESTIMATE_TREE.md`, `11_CRUD_AND_INTERACTION_PARITY_MATRIX.md`.
3. Skim `02_CURRENT_STATE_ANALYSIS.md` for the file map and `04_BLAST_RADIUS_AND_RISK_ANALYSIS.md` for risks.
4. Decisions are already made in `07_OPEN_QUESTIONS_AND_DECISIONS.md` (D1–D18) — do not reopen them without Philip.
5. Execute `05_IMPLEMENTATION_APPROACH.md` starting at Step 0 (test baseline).

## Do not do these things

- Do not delete `react-complex-tree` from `package.json` until PR 3 (after the folder tree, the `AddComponentModal` picker, and all re-exports are migrated).
- Do not change the estimate workspace tree as part of this work.
- Do not change `src/components/ui/tree.tsx` in PR 1; if the primitive appears insufficient, stop and review the blast radius.
- Do not add new features while migrating — preserve parity first. (Single sanctioned exception: D12 fixes the latent top-level-reorder bug.)
- Do not replace dead `react-complex-tree` mocks with a canonical `Tree` mock. The swap PR must test the real tree.
- Do not drop or rename any `data-*` attribute marked **Must preserve** in doc 08 §3.
- Do not change the `folder:`/`component:` node-id schemes — expansion state, selectors, and id round-tripping depend on them.
- Do not skip the doc 11 §4 QA walkthrough on the Folders view.
- Do not run `bun run analyze`; that script does not exist on the current branch. Use `ANALYZE=true bun run build` for bundle-analyzer evidence if needed.
