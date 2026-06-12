# 08 — Test Impact & DOM Attribute Contract

**Date:** 2026-06-13
**Status:** Verified against live source on branch `kimi/library-edits`
**Why this doc exists:** The original plan said "No e2e specs reference library-folder tree selectors" — true for `e2e/`, but **six Vitest files** pin the folder tree's DOM and logic, and several supporting tests pin adjacent contracts that affect cleanup. They are the migration's silent killers. Every phase must keep them green or deliberately re-baseline them in the same PR.

---

## 1. Six-file smoke gate

| Test file | What it pins | Migration impact |
|---|---|---|
| `tests/vitest/library-folder-reorder.test.ts` | Pure-logic tests for `buildLibraryFolderTree`, `evaluateLibraryFolderDrop`, `getLibraryFolderCreateSortOrder`, `getLibraryItemsForFolderNode`, `planLibraryFolderDelete` (6 cases). Imports `DraggingPosition` type from `react-complex-tree` (line 2). | **Keep green until cleanup PR.** In cleanup, the `evaluateLibraryFolderDrop` cases are ported to the new `evaluateLibraryFolderTreeDrop` shape (same expected plans); the type import is removed. All other cases are untouched. |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Bulk-selection cascade; asserts `data-library-component-bulk-selected="true"` (line 231). **Mocks `react-complex-tree`** (lines 38–82). | Mock becomes dead when `FolderTree` lands. Delete the mock in the swap PR; the test then exercises the real canonical `Tree`. Selector must be re-emitted. |
| `tests/vitest/component-library-manager-ui.test.tsx` | `data-library-folder-node-id` (235, 242), `data-library-folder-arrow-id` (248, 404), `data-library-folder-arrow-spacer-id` (405), `data-component-library-tree-panel` (308), `role="treeitem"` queries (214, 354–358), checkbox-in-treeitem (230–231), **`<ol>` markup assertion (350–352)**. | Selectors re-emitted via `renderItem`. The `<ol>` assertion is a `react-complex-tree` structural detail — canonical `Tree` renders `<div role="treeitem">` rows, not `<ol>/<li>`. **Re-baseline this assertion in the swap PR.** |
| `tests/vitest/component-library-manager.test.tsx` | `data-component-library-tree-panel` / sheet-panel (149–150). Minimal `react-complex-tree` mock (36–42). | Panel attributes live in `ComponentLibraryManager.tsx` (unchanged). Delete the mock in the swap PR. |
| `tests/vitest/component-library-ui.test.tsx` | `data-component-library-tree-label` (506) — emitted by `LibraryTree.tsx` (line 169), the estimate-sidebar tree. | **Not affected** (different component), but runs in the same suite; keep green. |
| `tests/vitest/workshop-library-consolidation-ui.test.tsx` | `data-library-folder-node-id` (110), `data-component-sheet-context-strip` (346), catalogue card ids (826). **Mocks `react-complex-tree`** (84–129). | Delete the mock in the swap PR; re-verify folder navigation against the real canonical `Tree`. |

**Phase-0 task:** run all six files on the baseline branch and record the green run before any code changes.

```bash
# repo runner: "test:dom": "vitest run --maxWorkers=1"
bunx vitest run --maxWorkers=1 tests/vitest/library-folder-reorder.test.ts tests/vitest/library-folder-tree-selection.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-manager.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx
# or the full suite: bun run test:dom
```

### 1.1 Supporting tests that must not be missed

| Test file | Why it matters | Migration impact |
|---|---|---|
| `tests/vitest/live-estimate-node-route.test.ts` | String-asserts the estimate tree does **not** use `react-complex-tree` and currently asserts `src/app/workshop/layout.tsx` **does** import `react-complex-tree/lib/style-modern.css`. | PR 3 must re-baseline the workshop-layout assertion when the CSS import is removed. This file is why the cleanup grep must include `tests/`, `package.json`, and `bun.lock`, not only `src/`. |
| `tests/vitest/workshop-tree-row-affordances.test.tsx` | Pins `WorkshopTreeRow`, `TreeSelectionCheckbox`, `TreeDragHandle`, and `TreeBulkActionBar` behavior. | Keep green. `FolderTree` should reuse these affordances, not switch to the canonical Tree's built-in checkbox span. |
| `tests/vitest/component-library-folder-actions.test.ts` | Pins server-side folder CRUD/move permission and mutation behavior. | Should remain unchanged. If UI migration requires action-contract edits, stop; that is out of scope for this tree swap. |
| `tests/vitest/ui-tree.test.tsx` | Provides working jsdom drag-event helpers for the canonical `Tree`. | Use its helper pattern when rewriting old `react-complex-tree` harness DnD tests into real DOM drag tests. |
| `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Shows the expected ARIA, roving-tabindex, keyboard, and drag DOM coverage for a canonical-Tree consumer. | Use as the model for the new Folders-tree DOM/accessibility test. |

Adjacent but unaffected: `component-library-versioning-schema.test.ts` (greps source for `data-component-catalogue-card-id`), `e2e/workshop-library-demo-smoke.spec.ts` (catalogue cards only), `component-library-helpers.test.ts`.

---

## 2. The `react-complex-tree` mock problem

Three test files mock `react-complex-tree` wholesale. The moment the Folders view swaps to `FolderTree`, those mocks stop intercepting anything and the tests render the **real** canonical `Tree`. This is good (higher-fidelity tests) but means the swap PR must:

1. Delete the mocks in `library-folder-tree-selection.test.tsx`, `workshop-library-consolidation-ui.test.tsx`, `component-library-manager.test.tsx`.
2. Re-run and fix any assertions that depended on mock-specific markup (notably the `<ol>` structure and any `class="space-y-0"` checks).
3. Keep all behavioral assertions (selection cascade, folder navigation, panel layout) passing against the real tree.

Do **not** write new mocks for the canonical `Tree` — it renders fine under Vitest/jsdom (the estimate-tree tests already exercise it).

The two DnD cases in `workshop-library-consolidation-ui.test.tsx` that currently call the mocked `react-complex-tree` environment directly must be rewritten in the swap PR as real DOM drag/drop assertions against canonical rows. At minimum cover folder reorder and component move; doc 12 adds invalid root/component drops and rollback/status as adversarial coverage.

---

## 3. DOM attribute contract

These attributes are emitted by `LibraryFolderTree.tsx` today and must be re-emitted by the new `FolderTree`'s `renderItem`. Values must keep the same id scheme (`folder:<folderId>`, `component:<folderId>:<itemId>`) so test helpers and expansion state survive unchanged.

| Attribute | Emitted at (today) | Element | Queried by tests? | Contract |
|---|---|---|---|---|
| `data-library-folder-node-id` | `LibraryFolderTree.tsx:795` | folder row (`WorkshopTreeRow`) | **Yes** (manager-ui 235/242; consolidation-ui 110) | Value = node id (`folder:<folderId>`). **Must preserve.** |
| `data-library-folder-arrow-id` | `:683` | expand caret span | **Yes** (manager-ui 248/404) | Value = `folder:<folderId>`. Only on folders **with children**. **Must preserve.** |
| `data-library-folder-arrow-spacer-id` | `:674` | spacer span | **Yes** (manager-ui 405) | Value = node id. Only on folders **without children**. **Must preserve.** |
| `data-library-component-bulk-selected` | `:724` | component row | **Yes** (selection 231) | `"true"` when selected, absent otherwise. **Must preserve.** |
| `data-library-folder-bulk-selected` | `:796` | folder row | No (indirect) | `"true"` when checked. Preserve (cheap). |
| `data-library-component-item-id` | `:723` | component row | No | Value = component item id. Preserve (cheap). |
| `data-library-component-tree-row` | `:713` | component row wrapper | No | `"true"`. Preserve (cheap). |
| `data-library-folder-tree-row` | `:783` | folder row wrapper | No | `"true"`. Preserve (cheap). |
| `data-component-library-tree-panel` | `ComponentLibraryManager.tsx:711` | left panel | **Yes** | Outside the migrated component — unchanged. |
| `data-component-library-tree-label` | `LibraryTree.tsx:169` | sidebar tree label | **Yes** | Different component — unchanged. |

---

## 4. ARIA / role contract

Tests query `role="treeitem"` (with `aria-expanded`, name matching) and `role="checkbox"` inside rows. The canonical `Tree`'s row props provide `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-selected`, `aria-current`, and roving `tabIndex` (`tree.tsx:1037–1043`). The new `renderItem` must **spread the provided `rowProps`** onto the row element so these survive, then add the `data-*` attributes from §3 on top.

Checkbox semantics: `TreeSelectionCheckbox` (`tree-row-affordances.tsx`) renders a native checkbox with indeterminate support — keep using it in `renderItem` so `role="checkbox"` queries keep working. Do not switch to the canonical Tree's built-in checkbox span (`role="checkbox"` on a `<span>`) unless tests are re-baselined for it.

Structural change to accept and re-baseline: canonical `Tree` renders `<div>` rows, **not** `<ol>/<li>`. The only test that pins `<ol>` is `component-library-manager-ui.test.tsx:350–352`.

---

## 5. Per-PR test gate

| PR | Gate |
|---|---|
| PR 1 (extract + build `FolderTree` + swap Folders view) | All six files pass with mocks deleted and the `<ol>` assertion re-baselined. Old direct-harness DnD assertions are real DOM drag/drop tests. The doc 09 §5 evaluator cases are added now, not deferred. Keyboard/ARIA and adversarial root/disabled/bulk-drift checks from doc 12 are present. No selector from §3 marked **Must preserve** may be dropped. |
| PR 2 (AddComponentModal picker) | Full suite green; picker select-and-save plus in-modal folder CRUD verified. |
| PR 3 (cleanup: remove `react-complex-tree`) | `library-folder-reorder.test.ts` ported to the new evaluator shape; `live-estimate-node-route.test.ts` re-baselined for CSS removal; `grep -R "react-complex-tree" src tests package.json bun.lock` returns no matches; full suite + build green. |
