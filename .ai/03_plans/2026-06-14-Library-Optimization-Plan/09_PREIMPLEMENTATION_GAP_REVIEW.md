# 09 — Preimplementation Gap Review

**Purpose:** Close the missing angles before implementation. This document is the added guardrail requested after the first audit pass: it assumes the existing plan is directionally right, then asks how it could still ship bugs.

**Verdict:** ITERATE before implementation. The plan is strong on perceived-performance root cause and DB scaling direction, but it needs the gates below to reach a credible "zero known bugs at handoff" standard.

---

## A. New readiness gates

| Gate | Why it matters | Required evidence before coding |
|---|---|---|
| G1: Baseline and scenario matrix exist | Without baseline numbers, "faster" and "no loading screens" can become subjective | `BASELINE.md` with `06 §A-F` metrics plus `06 §I` adversarial rows |
| G2: P0b architecture and query-key/data-shape decision recorded | Components currently passes a split dataset (`categoryTree`, `suppliers`, `brands`, `libraryFolders`, `libraryItems`) while existing query keys describe full/lite library datasets; route-level `loading.tsx` can still appear before client cache renders | One paragraph in `BASELINE.md` naming route client shell vs client-panel tabs, exact key(s), data shape, invalidation surface, and why stale mixed state cannot occur |
| G3: Folder strategy proven | `library_folders` is not just taxonomy mirror data; users can create/rename/delete folders, component items can reference persisted folder IDs, and order/state survives across sessions | T13 design note classifying taxonomy-backed rows vs customized rows, preserving `library_folders` as the canonical source for item-addressable IDs, with migration/backfill/rollback proof |
| G4: Principal fixtures identified | Viewer-write gaps cannot be proven without real viewer/editor/admin fixtures | Prove-harness setup notes for viewer denied + editor/admin allowed across component items, price options, versions, cost entries, attachments, history, templates, nodes, rows, and folders |
| G5: Cache-removal rollback rehearsed | Removing `router.refresh()` changes consistency behavior; rollback must be precise | Per-task rollback note: restore refresh, invalidate exact keys, or revert the phase commit |
| G6: Browser evidence path exists | The complaint is browser-visible. Unit tests alone cannot prove it gone | Playwright or browser transcript for standard session, overlay/skeleton count, and mutation settle behavior |
| G7: Dirty-worktree boundary recorded | The branch currently has unrelated plan/archive/tool-adapter changes | `git status --short --branch` before/after and a list of unrelated paths left untouched |

---

## B. Missing perspectives added to the plan

### 1. Cache coherence, not just cache speed

The original P0 correctly targets TanStack Query `initialData`, but the bug risk is mixed-freshness. `ComponentLibraryManager` currently reconciles only `libraryItems` from props (`src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1091-1109`) while folders, suppliers, brands, and category tree are separate props. If T3 caches only items, a mutation could update the cards while the tree/filter/sidebar state remains stale.

There is also an architecture contradiction: `LibraryComponentsRoute` awaits the server dataset before mounting the client (`src/components/workshop/library/LibraryComponentsRoute.tsx:9-20`), so `initialData` cannot by itself prevent route-level `loading.tsx` on a warm revisit.

**Plan amendment:** T3 now requires a whole-dataset cache or explicitly paired query keys, and T4 must invalidate/update every paired key. P0b now requires an immediate client shell route or client-panel tabs with URL sync before "no warm-revisit skeleton" can pass.

### 2. Folder optimization can lose user customization

The first plan treated pure virtual taxonomy folders as the default option. Current code shows per-workspace folder state is mutable: users create/rename/delete folders in `ComponentLibraryManager.tsx:1343-1395`; `ensureWorkspaceLibraryFolders` writes taxonomy-derived rows with `source_category_node_id` (`src/lib/repositories/component-library-repository.ts:330-378`); existing migrations harden reorder/editor access. Pure virtualization is only safe for unchanged taxonomy rows.

**Plan amendment:** Q3 and T13 now default to a hybrid proof-first design, not pure virtual folders. `library_folders` remains the canonical persisted source of truth for every item-addressable folder ID and customized folder row; virtual taxonomy nodes are view-layer only for unchanged taxonomy entries.

### 3. Removing refresh changes consistency semantics

`router.refresh()` appears in component and template mutation tails (`ComponentLibraryManager.tsx:1175,1203,1334,1409`; `TemplatesBrowseManager.tsx:603,617,651,673,710,747`; `use-template-editor.ts:76`). Dropping it fixes perceived reloads, but it also removes the blunt server reconcile. The implementation must prove rollback and stale-cache recovery, not just assert `router.refresh` was not called.

**Plan amendment:** T4 now includes failed-mutation rollback tests and cross-route cache-convergence browser proof.

### 4. AuthZ needs template editor actions too

The original T17 referenced template/component mutations broadly but named `actions.ts` as the mirror. Template editor node/row mutations live in `src/lib/component-library/template-editor-actions.ts` and must be included or viewers may still mutate template internals through editor actions.

The first F19 wording was also partly stale and partly incomplete: component item RLS is already editor-write split in `20260526142913_project_sheet_collaboration_access.sql`, but component child tables still have confirmed member-write exposure (`cost_library_item_versions`, `cost_library_item_variant_cost_entries`, `cost_library_item_variant_attachments`). Template RLS is still member-wide in `20260522091621_component_library_templates.sql`.

**Plan amendment:** T17 now starts with a current-policy inventory, preserves the already-split component item policy, adds app-layer guards, hardens confirmed component child-table write gaps, and adds the missing template RLS write split.

### 5. Browser and adversarial QA need first-class rows

The original measurement doc included a standard session, but not hostile/stale/failure cases. A green happy-path Playwright run can miss failed rollback, stale cache, misleading success output, dirty worktree interference, or permission-boundary regressions.

**Plan amendment:** `06 §I` now adds the required adversarial matrix.

---

## C. Implementation stop conditions

Stop and return to planning if any of these occur:

- Query shapes cannot be made coherent without a larger route/client-state refactor.
- P0b cannot avoid route-level `loading.tsx` on warm Components/Templates revisits.
- Folder customization semantics, persisted `library_folder_id` references, or item-folder assignments cannot be preserved while removing read-path provisioning.
- Viewer/editor fixtures cannot be created or simulated in the prove-harness.
- P0 measurement shows the delayed overlay still fires on normal Library tab switches after warm cache.
- Any RLS rewrite changes row visibility for the same principal in before/after proof.
- Playwright/browser evidence contradicts unit-test success.

---

## D. Revised success statement

Do not claim "100% bug free." Claim this only if true:

> The Library Optimization implementation has zero known bugs at handoff: every planned behavior has a failing-first test or baseline, measured after evidence, browser or DB surface proof where applicable, adversarial scenarios recorded, no unresolved review blockers, rollback notes, and unrelated worktree changes preserved.
