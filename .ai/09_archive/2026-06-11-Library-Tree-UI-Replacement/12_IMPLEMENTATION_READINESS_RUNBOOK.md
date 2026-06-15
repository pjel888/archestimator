# 12 - Implementation Readiness Runbook

**Date:** 2026-06-13
**Status:** Execution packet for the MVP migration
**Purpose:** Give the implementing agent a short, unambiguous path from plan to code, with stop gates and evidence requirements that prevent a half-successful tree swap.

---

## 1. Target result

`/workshop/library/components` uses the same canonical `Tree` primitive as the estimate workspace for the Folders view, through a new library-specific `FolderTree` wrapper.

Success means:

- Folder rows, component rows, bulk selection, context-menu CRUD, search, expansion, and drag/drop behave as documented in doc 11.
- The Add Component modal picker uses the same `FolderTree`.
- `react-complex-tree` is removed only after both route and modal picker are migrated.
- The estimate workspace, Suppliers view, Brands view, route shell, database schema, and canonical `Tree` primitive are not changed unless a stop gate below is deliberately resolved.

---

## 2. MVP strategy lock

This is a component swap, not a product redesign.

- No feature flag. Revert the swap commit or PR if needed.
- No canonical `Tree` changes in PR 1. If the primitive is missing a capability, stop and reassess the blast radius against the estimate tree before editing it.
- No `useFolderTree` extraction in PR 1 unless the `FolderTree` body becomes harder to review than the current component. Start with local helpers in `FolderTree.tsx`.
- No new dependencies.
- No new library features except D12: top-level folder reorder should start working.
- No virtualization or performance architecture in this migration. If the side-by-side large-tree check fails, stop before PR 3 cleanup and create a separate primitive-level performance plan.

---

## 3. Critical path

1. Record baseline evidence: six-file Vitest gate, type-check, lint, build, old-tree doc 11 walkthrough.
2. Extract behavior-neutral pieces: `ComponentViewControls`, `ALL_COMPONENTS_FOLDER_ID`, `isAllComponentsFolderId`.
3. Add the canonical evaluator and resolver in `library-folder-reorder.ts`; keep the old evaluator until cleanup.
4. Build `FolderTree.tsx` beside `LibraryFolderTree.tsx`; do not wire it into the route until evaluator tests are green.
5. Swap only the Folders view; delete the dead `react-complex-tree` test mocks in the same PR and rewrite DnD assertions as real DOM drag tests.
6. Migrate the Add Component modal picker.
7. Remove old code, CSS import, package dependency, lockfile entry, and all remaining test/source references to `react-complex-tree`.

---

## 4. Stop gates

Stop and update the plan or PR description before continuing if any of these happen:

- `src/components/ui/tree.tsx` appears to need a behavior change.
- The implementation would touch database schema, Supabase policies, server action contracts, or provider state.
- Suppliers or Brands view behavior changes.
- The route shell or panel layout has to be rewritten to fit `FolderTree`.
- A canonical-Tree DOM test requires mocking the `Tree` primitive.
- Folder/component drag behavior cannot be proven with real DOM events after the mocks are removed.
- Large-library manual QA shows obvious input lag, drag-over lag, or search lag compared with the old tree.
- The implementation cannot reproduce the current baseline test pass on the base branch.
- Cleanup would remove `react-complex-tree` before the modal picker migration is verified.

---

## 5. PR evidence checklist

### PR 1 - route Folders view

Record:

- Six-file Vitest gate from doc 08 green before and after.
- `bun run type-check`, `bun run lint`, `bun run build` green.
- New evaluator unit cases from doc 09 §5 green in PR 1, not postponed to cleanup.
- `workshop-library-consolidation-ui.test.tsx` DnD assertions rewritten away from direct `react-complex-tree` harness calls and toward real DOM drag events, using the helper pattern from `tests/vitest/ui-tree.test.tsx`.
- A focused DOM/accessibility test for the migrated Folders tree: `role="tree"`, `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-current`, roving `tabIndex`, Arrow navigation, Enter/Space activation.
- Adversarial root/disabled assertions: "All Components" has no drag handle, has disabled or unavailable bulk checkbox behavior per doc 11, omits Rename/Delete, rejects before/after root drops, and `treeMutationPending` disables mutating actions.
- Bulk-selection drift assertion: select folders, search or switch Folders/Suppliers/Brands/Folders, then verify unavailable ids are pruned and the bulk toolbar count is not stale.
- Doc 11 §4 manual walkthrough evidence for steps 1-9 and 11-12.

### PR 2 - Add Component modal picker

Record:

- Full suite green.
- Existing modal expand/rename/delete tests still green.
- A save-flow assertion or manual proof that selecting a folder in the picker and saving a component persists/stages that folder.
- Doc 11 §4 step 10 evidence.

### PR 3 - cleanup

Record:

- `grep -R "react-complex-tree" src tests package.json bun.lock` returns no matches.
- `tests/vitest/live-estimate-node-route.test.ts` is re-baselined so it no longer expects the workshop layout CSS import.
- `ANALYZE=true bun run build` output or package/lockfile dependency delta noted in the PR description. There is no `bun run analyze` script on the current branch.
- Large-library performance evidence from §6 recorded before the old implementation is no longer easy to compare.
- Full suite, type-check, lint, and build green.

---

## 6. Manual QA evidence template

Use this template in the PR description or an `.ai/10_state/` implementation note.

```
Branch / commit:
Base branch and old-tree baseline date:
Browser(s): Chrome ___ / Safari ___ / Firefox ___
Dataset size: ___ folders / ___ components

Old tree baseline:
- Route Folders walkthrough:
- Modal picker walkthrough:
- Initial render feel:
- Search keystroke feel:
- Drag-over feel:

New tree:
- Route Folders walkthrough:
- Modal picker walkthrough:
- Keyboard-only walkthrough:
- Screen-reader smoke:
- Safari drag smoke:
- Initial render timing / note:
- Search keystroke timing / note:
- Drag-over responsiveness note:

Artifacts:
- Screenshot/video for drag:
- Screenshot/video for search:
- Screenshot/video for keyboard/focus:

Deviations:
- D12 top-level reorder fix confirmed:
- Other deviations:
```

Acceptance for the manual performance check remains MVP-light: no obvious regression in initial render, search keystrokes, or drag-over feedback on roughly 100 folders / 1,000 components. If there is an obvious regression, do not remove `react-complex-tree`; write a separate performance plan.

---

## 7. Adversarial QA scenarios

Cover these in tests where cheap, otherwise in the manual evidence:

- Drag a folder into itself or a descendant: rejected and no server action.
- Drag before/after the synthetic root: rejected and no server action.
- Drag inside the synthetic root: top-level append works.
- Drag a component onto the synthetic root or a top-level between-row gap that resolves to no folder: rejected with the existing folder-only message.
- Drag a component onto its current folder: no server action and saved-tone "already in that folder" status.
- Reorder action rejects: optimistic folder order rolls back and status strip reports the error.
- Move-component action rejects: folder selection does not lie about the move succeeding.
- Delete selected folder while search hides part of the selection: selection is pruned or cleared according to `tree-selection.ts`.
- Toggle Suppliers/Brands while folders are selected: no stale Folders bulk toolbar leaks into category views.
- Try mutating while `treeMutationPending` is true: create, rename, delete, reorder, and move are disabled.
- Collapse a folder, search, clear search: expansion state stays controlled by the existing ids, not estimate-tree auto-expand behavior.
- Keyboard-only user can move through rows, expand/collapse, select a folder, and reach context-menu actions.
