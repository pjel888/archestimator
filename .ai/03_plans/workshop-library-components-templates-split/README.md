# Workshop Library Components/Templates Split Plan

**Date:** 2026-05-23
**Status:** Proposed plan pack. No product implementation has been done in this folder.
**Route scope:** `/workshop/library`, new `/workshop/templates`, `/workshop/components` redirect, workshop main sidebar.

## Goal

Make `/workshop/library` a component-only Library surface, remove the sheet dropdown and its state/filtering behavior, and move Templates into a new first-class `/workshop/templates` route that visually mirrors the current Library workspace.

## User Request Summary

- Remove the center sheet dropdown currently showing values such as selected folder labels, `Estimate Row Items`, `Custom Row Items`, `Uncategorized`, and `Supplier Row Items`.
- Remove the dropdown functionality, not only the UI.
- Rename the right-sidebar `Categories` label to `Components`.
- Rename `Default folders` to `View By: Default`; keep `Suppliers` as the second view-by option.
- Move Templates completely out of `/workshop/library` into `/workshop/templates`.
- Make `/workshop/templates` look like `/workshop/library` for now, but template-focused.
- Analyze blast radius, UX/UI paths, and implementation sequence before coding.

## Plan Pack Contents

- `01-product-brief.md` - outcome, non-goals, principles, and alternatives.
- `02-current-state-inventory.md` - current route/component/test facts.
- `03-blast-radius.md` - impacted files, symbols, risks, and isolation notes.
- `04-ux-ui-paths.md` - route IA, visible copy, states, and smoke paths.
- `05-architecture-plan.md` - recommended component/repository boundaries.
- `06-implementation-sequence.md` - staged execution plan with rollback points.
- `07-test-spec.md` - tests to rewrite/add/remove and validation commands.
- `08-qa-release-checklist.md` - QA, browser smoke, commit hygiene, and closeout gates.
- `09-decisions-open-questions.md` - ADR-style decisions and assumptions.

## Recommended Approach

Use route-scoped managers with a small shared layout shell:

- Keep `/workshop/library` as the component route.
- Add `/workshop/templates` as a sibling route.
- Remove template concerns from `ComponentLibraryManager`.
- Move template browsing into a dedicated `TemplateLibraryManager`.
- Add a mandatory `getCurrentWorkspaceEstimateTemplates()` repository helper for the template route.
- Delete or narrow `ComponentLibrarySheetPanel` so it no longer owns component/template switching.
- Extract only the reusable frame/tree/sheet layout pieces that remove obvious duplication without creating a generic over-abstraction.

This is safer than keeping one mode-heavy `ComponentLibraryManager`, and lighter than designing a fully generic library framework before the UI stabilizes.

## Planning Evidence

- GitNexus index is up to date at commit `f4afe70`.
- GitNexus upstream impacts:
  - `ComponentLibraryManager`: LOW risk, direct caller `LibraryPageClient`, affected route flow `LibraryPage`.
  - `LibraryPageClient`: LOW risk, direct callers include `/workshop/library` and focused UI tests.
  - `TemplateLibrarySheet`: LOW risk, currently routed through `ComponentLibrarySheetPanel` and `ComponentLibraryManager`.
- Current tests that intentionally need updates:
  - `tests/vitest/component-library-manager-ui.test.tsx`
  - `tests/vitest/workshop-library-consolidation-ui.test.tsx`
  - `tests/unit/reset-baseline.test.ts`
- Unrelated dirty worktree files exist for proposal/export work; implementation must stage only this plan's files.

## Implementation Gate

Do not start product implementation until this plan is reviewed and explicitly approved. The first implementation step should be test-first against the UI contract in `07-test-spec.md`.
