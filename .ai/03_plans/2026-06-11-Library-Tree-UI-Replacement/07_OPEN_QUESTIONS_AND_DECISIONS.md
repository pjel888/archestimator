# 07 — Decisions (was: Open Questions)

**Date:** 2026-06-13
**Status:** RESOLVED — decisions adopted for the pre-release MVP context. Philip can veto any line; absent a veto, implementation proceeds on these.
**Context for all decisions:** The product is pre-release. There are no external users, no migration windows, no need for runtime kill switches. The goal is simply to make the library route use the same reusable tree as the estimate sheet, with parity, quickly and safely. Decisions optimize for that.

---

## D1 — Phase strategy: incremental build-beside-then-swap, compressed to 3 PRs

The original 5-phase rollout is collapsed into 3 PRs (mapping in `05_IMPLEMENTATION_APPROACH.md`). Build the new `FolderTree` next to the old one, swap the Folders view in the same PR, then migrate the picker, then delete the old code. Every PR leaves the app working; rollback is `git revert`. A 5-phase rollout with per-phase deploys is process overhead a pre-release product doesn't need; a big-bang single PR is still rejected (too much to review/debug at once).

## D2 — Component rows stay inside the folder tree

Keep current behavior. Drag-to-move between folders depends on them, tests pin their selectors, and removing them is a product change, not a migration.

## D3 — Bulk delete keeps the current simple confirmation

No impact-preview dialog. Parity first; a preview is a candidate post-MVP enhancement.

## D4 — DnD planner: new thin evaluator over the existing neutral planner

The "Option A vs Option B" framing in `03_TARGET_STATE…` is superseded. `buildLibraryFolderReorderPlan` is **already** decoupled from `react-complex-tree` and fully unit-tested; only the ~35-line `evaluateLibraryFolderDrop` translator is coupled. We add `evaluateLibraryFolderTreeDrop` for canonical `(draggedId, targetId, position)` events per the exact contract in **doc 09**, leave the planner core untouched, and delete the old translator + type imports in the cleanup PR. Near-zero churn to tested logic.

## D5 — Suppliers/Brands view modes: leave as-is

They already use the canonical `Tree` via `LibraryTree`. No wrapper unification in this work.

## D6 — No feature flag (runtime or compile-time)

Pre-release: the swap is a reviewable commit inside PR 1; reverting it restores the old tree because the old implementation isn't deleted until PR 3. A flag would add a second code path to test for zero users.

## D7 — Expand-on-search: keep current folder-tree semantics

Expansion is controlled state, initialized to all-expanded (`LibraryFolderTree.tsx:409`, Surface `:990`), and **search does not auto-expand** — pass the existing expanded ids straight into the canonical `Tree`'s `expandedIds`. The estimate tree's auto-expand-on-search (`EstimateSheetTree.tsx:436–444`) is a possible follow-up UX improvement, explicitly out of scope for the parity migration.

## D8 — No template/external drops on the folder tree

The current folder tree accepts no external drag payloads, so `externalDrop` is omitted. The estimate tree's template-drop wiring is irrelevant here. No parity gap exists.

## D9 — Reorder status: keep the `aria-live` status strip

The strip lives in `LibraryFolderTreeSurface` (`LibraryFolderTree.tsx:1204–1215`), outside the migrated component, and `FolderTree` keeps emitting `onReorderStatus`. Zero work, exact parity. Do not adopt the estimate tree's toast pattern here.

## D10 — Performance: right-sized manual check, no profiling harness

Both trees are unvirtualized flat renders; the risk profile doesn't change. Before the cleanup PR: seed a worst-case realistic library (~100 folders / ~1,000 components), compare old vs new for initial render feel, drag-over feedback, and search keystroke latency side by side. Acceptance: no perceptible regression. If large libraries ever lag, virtualization is a separate post-MVP decision on the shared primitive (benefits the estimate tree too). Formal `performance.mark` budgets are not warranted pre-release.

## D11 — Feature-flag mechanism: none (follows D6)

## D12 — Fix the latent top-level-reorder bug (deliberate parity deviation)

Discovered during this review: the current evaluator maps drops between top-level folders to `targetParentId: "all-components"`, which fails the `unknown-target-parent` guard — so **dragging to reorder top-level folders silently does nothing today** (the hover is rejected via `canDropAt`). The new evaluator maps the synthetic root to `parent: null` (doc 09 §4.1), making top-level reorder work. This is the single intentional behavior change; it is covered by a new unit test and called out in the QA script (doc 11 §4, step 5).

## D13 — Keep `TreeBulkActionBar` and `TreeSelectionCheckbox`

Not the estimate tree's `BulkActionToolbar`, and not the canonical Tree's built-in checkbox span — the existing affordances preserve the visual contract and the `role="checkbox"` test queries (doc 08 §4).

## D14 — `ComponentViewControls` extraction target

Extract to `src/components/workshop/component-library-manager/ComponentViewControls.tsx` (it is library-manager-specific, not a generic ui primitive). `component-library/index.tsx` updates its import; a temporary re-export from `LibraryFolderTree.tsx` is acceptable until PR 3 removes it. While in Phase 0, also move `ALL_COMPONENTS_FOLDER_ID` / `isAllComponentsFolderId` into `library-folder-reorder.ts` so the new evaluator can use them without an import cycle (doc 09 §4); `library-folder-tree-shared.ts` re-exports them.

## D15 — No `useFolderTree` hook by default

Start with a single `FolderTree.tsx` file plus local pure helpers. Extract a hook only if the implementation becomes less reviewable than the current component. The MVP goal is to swap the tree implementation, not create a new abstraction layer.

## D16 — Do not change the canonical `Tree` primitive in PR 1

`src/components/ui/tree.tsx` is the shared estimate/workshop primitive and already has the capabilities this migration needs. If implementation discovers a real primitive gap, stop and reassess against the estimate workspace before editing it. PR 1 should adapt the library tree to the primitive, not mutate the primitive to fit the old wrapper.

## D17 — Bundle evidence uses the existing analyzer switch

There is no `bun run analyze` script in `package.json` on the current branch. If bundle evidence is needed in PR 3, use the existing `next.config.ts` switch: `ANALYZE=true bun run build`. At minimum, record the package/lockfile dependency delta when `react-complex-tree` is removed.

## D18 — Active shared files must be serialized

PR 1 and PR 2 touch surfaces near `ComponentLibraryManager.tsx`, `LibraryFolderTreeSurface`, and `AddComponentModal.tsx`. Do not interleave this migration with sibling branches that rewrite those boundaries. Land/rebase the sibling branch first, or park this migration until the surface settles.

---

## Assumptions — validation status

1. ~~"No e2e tests depend on tree selectors"~~ → **Superseded.** Six Vitest files do; full inventory and per-PR gates in **doc 08**.
2. Canonical `Tree` performance acceptable → validated per **D10** before cleanup PR.
3. `WorkshopTreeRow` + `tree-row-affordances` are the visual target → **Confirmed**; the current `renderItem` body (`LibraryFolderTree.tsx:694–837`) is the visual spec (doc 10 §2).
4. `ComponentViewControls` extraction → resolved by **D14**.
5. Hook extraction → resolved by **D15**.
6. Canonical primitive changes → blocked by **D16** unless a separate blast-radius review approves them.
