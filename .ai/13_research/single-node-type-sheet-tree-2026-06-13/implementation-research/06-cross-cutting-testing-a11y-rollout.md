I have everything needed. The `estimate-tree-edit.test.ts` exercises delete/rename/descendant helpers that are kind-agnostic (they only traverse `children`), so it survives unchanged. Let me compile the final deliverable.

# CROSS-CUTTING facet: Testing, A11y, Telemetry, Rollout, Template-tree parity

## Key structural finding (frames everything below)
DB enforcement for the live tree lives in **`validate_estimate_node_tree`** (latest/live definition: `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:208-295`). It contains exactly **5 checks in order**: (1) missing-parent `:228` [PRESERVE], (2) cross-tab isolation `:236-238` [PRESERVE], (3) two-kind hierarchy `:249-254` [REMOVE], (4) rows-must-be-area `:263-266` [REMOVE], (5) cycle `:269-292` [PRESERVE]. The app layer's single source of truth is `src/lib/estimates/tree-hierarchy.ts` (`canNestEstimateNodeKind`, `getEstimateWrapGroupName`, `getEstimateNodeNestingError`). The kind enum itself (`lot, structure, level, area, group, assembly, general`) survives; only the **two-kind reduction + area/group rules** are removed. The render/data substrate is already kind-agnostic as stated (`branch.tsx:78`, `estimate_sheet_total` `20260524050746:...`, `buildEstimateTree`, `reconstruct-share-tree` derivation).

---

## (1) TESTING

### Suites that BREAK under one unified type, and how

**A. `tests/vitest/estimate-tree-data.test.ts` — the central hierarchy-rules suite; ~half its assertions invert.** It tests `src/lib/estimates/tree-hierarchy.ts` directly. Breaking assertions:
- `:69-76` `"allows root -> group and group -> group|area while blocking area parents"` — asserts `canNestEstimateNodeKind("area", null) === false`, `canNestEstimateNodeKind("group","area") === false`, `canNestEstimateNodeKind("area","area") === false`. Under one type, ANY node may parent ANY node (cycle aside), so these must flip to `true` (or `canNestEstimateNodeKind` is deleted entirely).
- `:82-84` `"keeps estimate row items only on area nodes"` via `validateEstimateTreeHierarchy` — must be deleted or repurposed to assert "rows allowed at any depth."
- `:29-33`, `:35-46`, `:48-67` rely on `group`/`area` distinction and legacy normalization — partly survive (legacy→? mapping still useful for in-flight data) but `isEstimateGroupNodeKind`/`getEstimateNodeDisplayKind` lose meaning.

**B. `tests/vitest/estimate-tree-modal.test.tsx` — Add-flow suite; the "select a group first" contract dies.**
- `:179-208` `"adds root Group Nodes and blocks Area Nodes when no Group Node is selected"` and `:210-222` `"allows a root Group Node from an empty tree and blocks a root Area Node"` both assert `screen.getByText("you must select a group first before adding an area node")`. With a single Add flow this guidance and the block are removed — both tests must be rewritten around one "Add Node" button.
- `:96-131` asserts the toolbar has exactly two buttons `["...","Add Group","Add Node"]` and `:159-177` asserts Add Group then Add Node nests area-under-group. The **single Add flow** collapses these to one button → both rewritten.

**C. `tests/vitest/estimate-template-drop-zones.test.tsx` — the entire wrap-on-drop contract is deleted.** This is the heaviest churn file.
- `:204-216` `"offers plain insert zones for groups only, never for areas"` — asserts no drop zone on area `Kitchen`. Under one type every node accepts a template drop → inverts.
- `:218-247` `"wraps an area-scoped sheet ... in a new group and re-scopes to it"` and `:249-273` `"wraps only the dragged subtree ..."` — these test `getEstimateWrapGroupName` → "Kitchen Group" and the re-scope. **The wrap is a removed rule; both tests are deleted, not fixed.** The drop simply appends the template's nodes/rows into the target.

**D. `tests/vitest/estimate-tree-reorder.test.ts` — two reject-tests invert.** Tests `src/lib/estimates/estimate-tree-reorder.ts`.
- `:142-153` `"rejects Area Nodes at estimate root"` asserts `code: "invalid-parent"`. Roots-must-be-group is removed → must become a successful plan.
- `:155-166` `"rejects Area Nodes as drop parents"` asserts `code: "invalid-parent"`. Area-is-leaf removed → must succeed.
- Everything else (`self-drop`, `cycle`, `no-op`, `multi-drag-unsupported`, sort-order math, signature, `mergeEstimateTreeStructureWithCachedNodes`) **survives unchanged** — cycle/self-drop are preserved invariants.

**E. `tests/vitest/estimate-tree-context-menu.test.tsx` — partial.** `:342-362` `"opens full CRUD actions for Group Node and Area Node ..."` asserts that an **area right-click hides** `"New Group inside"`/`"New Area Node inside"` (`:355-357`). Under one type every node offers create-child → these `queryBy...not.toBeInTheDocument()` assertions invert to present. All rename/delete/route-repair tests (the bulk of the file) are kind-agnostic and survive.

**F. `tests/vitest/estimate-sheet-tree-dom.test.tsx` — light.** `:258` `"shows a nesting affordance when dragging a node over the middle of a valid Group Node"` drops onto `alternates` (a group) — still valid. The phrase "valid Group Node" loses meaning but the assertion (`bg-surfaceMuted` highlight) holds. Verify no test asserts an area row *rejects* a middle-drop.

**G. `tests/vitest/estimate-sheet-library-insert.test.tsx` — mostly survives; template-target wording.** `:269-306` asserts `"Add to Ground Floor"` and `targetParentNodeId: groupNodeId`. The "Add to {group}" affordance came from the group-kind check; once any node can receive a template the menu may offer "Add to {any selected node}" — update the labels/target expectations. All row-level edit/optimistic/rollback tests survive.

**H. The brittle source-string contract tests — significant, low-value churn:**
- `tests/vitest/live-estimate-node-route.test.ts` — **138 `expect` assertions** reading raw source via `readFileSync`. Direct kind churn: `:26` `toContain("isEstimateGroupNodeKind")`, `:27` `"selectedGroupId"`, `:28` `"you must select a group first before adding an area node"`, `:62` `"FolderSimple"`, `:65` `"StackPlus"`, `:153` `actions.toContain('.eq("kind", "area")')`, `:166-167` `'return "group"'` / `'kind: "group"'`. Every removed source string here fails the build even though behavior is correct. **Flag this as churn: these assertions must be hand-edited string-by-string as the source changes**, and the suite should be slimmed — it is testing implementation tokens, not behavior.
- `tests/vitest/supabase-performance-migrations.test.ts:43-59` — asserts the two-kind contract exists **in historical migration files** (`validate_estimate_node_tree`, `estimate_row_items_enforce_area_node`, `"Estimate row items must belong to area nodes"`, `child.kind in ('group')`). Because migrations are append-only and this reads OLD files by suffix, it will **NOT auto-break** — but it now asserts a contract the product has abandoned. Update or retire it; otherwise it falsely documents the removed rules as current. Note `:6` `ESTIMATE_TREE_NODE_KINDS = ["group","area"]` mirrors `tree-hierarchy.ts` and will drift.

**Tests that survive unchanged (kind-agnostic):** `estimate-tree-edit.test.ts` (delete/rename/descendant helpers traverse `children` only), `estimate-schema-compat.test.ts` (estimate-record normalization, no node kind), `estimate-node-reorder-action.test.ts` (already accepts legacy kinds at `:38`), and all row-value/optimistic suites.

### NEW coverage needed
1. **Mixed-content node** — a single node holding BOTH `children.length > 0` AND `estimateRowItems.length > 0` renders, totals, exports, snapshots, and drops correctly. (Today blocked by `branch.tsx:79 canReceiveRows = node.kind === "area"` and DB guard `insert_estimate_row_item_with_history` `20260524050746:344-352`.)
2. **Rows-at-any-depth → export/totals/snapshot parity** — assert `estimate_sheet_total` and `estimate_sheet_snapshot` include rows attached to a node that also has children; and assert the **share/publication path does not drop them** (see the `reconstruct-share-tree.ts:297` bug under Telemetry/Risks).
3. **Single Add flow** — one "Add Node" creates a node under any selection (or at root) with no kind branching and no "select a group first" block.
4. **Migration data integrity** — a migration test (new) proving: the `estimate_nodes_active_kind_check` + `estimate_template_nodes_active_kind_check` constraints are dropped; existing `group`/`area` rows are untouched (kind preserved as a label, not deleted); rows on former-area nodes survive; cross-tab + cycle still rejected after the new `validate_estimate_node_tree`.
5. **Cycle + cross-tab regression** — explicit tests that the two PRESERVED checks still raise after the hierarchy/area checks are removed (since they share one function body, a careless edit can drop them).

---

## (2) A11Y (target WCAG 2.1 AA per `PRODUCT.md:48-50`)
The unified type makes a11y **strictly simpler**:
- **One icon, no type cues.** `branch.tsx:180 <NodeIcon kind={node.kind}/>` and `TemplateStructureTree.tsx:27-41 NodeKindIcon` currently switch icon by kind (`FolderSimple`/`StackPlus` per `live-estimate-node-route.test.ts:62,65`). One node type → one icon → less "information conveyed by structure type," removing a color/icon-only-distinction risk that `PRODUCT.md:50` calls out ("information never conveyed by color alone").
- **Simpler keyboard model.** Today the toolbar has two Add buttons and a conditional block ("you must select a group first"). Collapsing to one Add button removes a state-dependent disabled/error path that screen-reader users must reason about. Verify the single Add button has a stable `aria-label` and that the removed `role="alert"` "select a group first" message is gone from the live region.
- **No more area-only empty state.** `branch.tsx:269 isGroup && !hasContents ? <EmptyGroupMessage/>` — under one type the empty message logic unifies (any node can be empty). Verify the empty state announces once, not per-kind.

**Verify:** focus order through the single Add flow; `aria-current="page"` selection still set on the unified rows (context-menu suite already asserts this at `:712`); reduced-motion unaffected (no new animation introduced — the wrap re-scope animation, if any, is **removed**); contrast unchanged (no new color tokens). No new a11y risk introduced; net reduction.

---

## (3) TELEMETRY
- **Event substrate is kind-agnostic and survives.** `event_type` is free-form `text` (`20260524033151:17 check (char_length(trim(event_type))>0)`). Emitted types include `node_created` (`20260612094734:732`), `row_added`/`row_blank_added` (`20260524033151:384`), `row_updated` (`:530`), `row_replaced`, `row_deleted`. No event encodes the kind rule, so no telemetry schema change is forced. The `kind` is still carried in the `node_created` payload — keep it as a label.
- **Measurable friction signals from `estimate_sheet_events`:** time-from-`node_created`→first `row_added` on that node ("time-to-first-row"); count of `node_created` with `kind=group` that never receive a child (the dead-group signal the unified model is meant to kill); abandons between the two old Add buttons. After unification, expect time-to-first-row to drop (no forced group→area detour). These are derivable today by joining events on `payload->>'nodeId'`.
- **`beta_feedback_submissions`** (`20260602083000`) + review queue (`20260602084500`) is the qualitative channel — tag a "tree confusion" theme pre/post to A/B the simplification narrative.
- **Vercel analytics redaction CONFIRMED correct and unaffected.** `src/lib/analytics/vercel-web-analytics.ts:6,39-43`: `redactVercelAnalyticsEvent` returns `null` for any `/workshop` path (also `/share`, `/invite`) via `beforeSend`. The estimate tree lives under `/workshop`, so no node-id or estimate path ever reaches Vercel. The unified model changes nothing here — but it means **product telemetry for the tree must come from `estimate_sheet_events`, not Vercel.**

---

## (4) ROLLOUT / BETA
- **Closed-beta allowlist** is the only gate: `closed_beta_allowed_emails` table (`20260601182522`, status `invited|active|revoked`). There is no general feature-flag system — `readBooleanFeatureFlag` exists **only** for AI (`src/lib/ai/feature-flags.ts`, `src/lib/ai/package-builder/feature-flags.ts`) and is env-var driven, gating AI routes/UI only. So a runtime flag for the unified-tree change is **not feasible with existing infrastructure** and out-of-scope to build.
- **The migration is a one-way DDL change to EXISTING data.** It drops `estimate_nodes_active_kind_check` and `estimate_template_nodes_active_kind_check`, and rewrites `validate_estimate_node_tree`/`validate_estimate_template_tree` to delete checks #3/#4. A feature flag can't gate a `validate_*` trigger function — once the trigger no longer rejects rows-on-groups, old clients that still send the two-kind UI keep working (they're a subset), but you **cannot cleanly roll back** once users create mixed-content nodes (a re-added `kind in ('group','area')` + rows-must-be-area constraint would then fail validation on real data). **This is a forward-only migration; plan it as such.**
- **Safe rollout/backup posture (`AGENTS.md:29`):** Supabase **PITR is intentionally disabled** for cost; the beta relies on **daily physical backups + manual logical dumps**. Therefore: take a **manual logical dump immediately before applying** the migration (this is the rollback artifact), run it on a Supabase branch first (the MCP `create_branch`/`merge_branch` flow is available), and verify the data-integrity test from §1.4 on real beta data before merge. Because the closed-beta cohort is small and allowlisted, a brief maintenance window is acceptable. Note the migration is `not valid`→`validate constraint` pattern used in `20260520222038` works in reverse here (DROP is instant; the risk is forward data, not lock time).

---

## (5) TEMPLATE-TREE PARITY (must unify IN LOCKSTEP)
`estimate_template_nodes` is a **full mirror** with its own enforcement and editor UI. Every live two-kind/area-row rule on the template side, with exact anchors:

**DB (all live in `20260522091621_component_library_templates.sql`):**
- `:27` `constraint estimate_template_nodes_active_kind_check check (kind in ('group','area'))` — **DROP**.
- `:77-153` `validate_estimate_template_tree` — checks #2 hierarchy `:107-110` (`child.kind in ('group')` / `parent.kind in ('group')`) and #3 rows-must-be-area `:115-125` → **REMOVE both**; keep missing-parent `:87-98` and cycle `:127-151`.
- `:155-178` trigger `enforce_estimate_template_node_tree` — keep wiring, it calls the relaxed validator.
- `:180-199` `enforce_estimate_template_row_item_area_node` + its constraint trigger (`:187-194 node.kind = 'area'`) — **DROP the trigger and function** (rows on any template node).
- Template-insert **group-target guards** (two live copies): `insert_estimate_template_into_estimate` requires `kind='group'` at **`20260524050746:902-910`** AND the history-aware `insert_estimate_template_into_estimate_with_history` requires `kind='group'` at **`20260612094734:819-828`** (`raise 'Target Group Node not found'`). **Relax both** to accept any node, or the unified estimate side still can't receive a template onto a row-bearing node.

**App / UI (mirror of the estimate editor):**
- `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` — `:27-41` `NodeKindIcon` (two icons → one), `:140-142` `canDrop` (`parentNode?.kind === "group"`, root-must-be-group), `:176/:195/:202` the **two add-menu items** "add group"/"add area" → collapse to one "Add node". The `onAddNode` signature `:21 (parentId, kind)` loses its `kind` arg.
- `src/components/workshop/library/template-editor/template-editor-model.ts:98-106 findFirstTemplateArea` (kind === "area") — landing-node selection must become structure-derived like the estimate side, not area-keyed.
- `src/components/workshop/library/template-editor/use-template-editor.ts:91-104` passes `kind` into `createEstimateTemplateNode` — unify with the single Add flow.

**Server actions:** the estimate-side actions that hard-filter kind must be relaxed in lockstep: `actions.ts:1395` and `:1971-1972` (`canNestEstimateNodeKind` guards), `:2232 .eq("kind","group")` (template target), `:2409/:2483 .eq("kind","area")` (row/wrap targets), and the entire `wrapEstimateAreaAndInsertTemplate` (`:2389-2470`) plus `getEstimateWrapGroupName` (`tree-hierarchy.ts:41-44`) — **the wrap path is deleted, not relaxed.**

---

## RISKS surfaced
1. **Share/publication silently drops rows on mixed nodes (real bug).** `src/lib/share/reconstruct-share-tree.ts:161-167` reclassifies any node with children as `"group"`, then `:297 const directRows = node.kind === "area" ? rowsByNodeId.get(node.id) : []` — so a unified node that has BOTH children AND rows loses its rows in every shared/published estimate (and the canonical total rollup `:300`). **Must fix `:297` to attach rows regardless of derived kind.** This is the single highest-risk correctness gap for the unified model.
2. **Two preserved invariants share a function body with the removed ones** (`validate_estimate_node_tree` `20260612094734:218-292`, `validate_estimate_template_tree` `20260522091621:87-151`). A sloppy edit that deletes the wrong `if exists` block silently drops cross-tab isolation or cycle prevention. Add explicit regression tests (§1.5) before editing.
3. **Brittle string-contract churn is large but mechanical:** `live-estimate-node-route.test.ts` (138 asserts, ~7 kind strings) and `supabase-performance-migrations.test.ts` (~5 kind asserts on historical files). These fail on token changes, not behavior; budget for hand-editing and consider slimming `live-estimate-node-route.test.ts`.
4. **Forward-only migration with PITR disabled** — the pre-migration manual logical dump is the *only* rollback path; mixed-content data created post-migration cannot be re-constrained.

## Consolidated verification checklist
- [ ] DDL: dropped `estimate_nodes_active_kind_check` + `estimate_template_nodes_active_kind_check`; dropped `enforce_estimate_(template_)row_item_area_node` triggers/functions.
- [ ] `validate_estimate_node_tree` (`20260612094734:208`) keeps missing-parent + cross-tab + cycle, removes hierarchy + rows-must-be-area; same for `validate_estimate_template_tree` (`20260522091621:77`).
- [ ] Relaxed kind guards: `insert_estimate_row_item_with_history` (`20260524050746:344-352`); both template-insert group-target guards (`20260524050746:902-910`, `20260612094734:819-828`); `wrapEstimate*` path deleted.
- [ ] App: `tree-hierarchy.ts` `canNest`/wrap/nesting-error removed or no-op'd; `branch.tsx:79 canReceiveRows` and `:269` empty-state unified; `reconstruct-share-tree.ts:297` row-attach fixed; template editor `TemplateStructureTree.tsx`/`use-template-editor.ts`/`template-editor-model.ts` single Add + structure-derived landing.
- [ ] Tests rewritten/deleted: `estimate-tree-data` (invert nesting), `estimate-tree-modal` (one Add, no block), `estimate-template-drop-zones` (delete wrap tests), `estimate-tree-reorder` (`:142`,`:155` now succeed), `context-menu` (`:355-357` invert), `library-insert` (template-target labels), `live-estimate-node-route` + `supabase-performance-migrations` strings updated.
- [ ] NEW: mixed-content node test; rows-at-any-depth export/total/snapshot/share parity; single-Add flow; migration data-integrity; cycle + cross-tab regression.
- [ ] A11y: single Add `aria-label`, one icon, `aria-current` preserved, removed "select a group first" live-region message, empty-state announced once.
- [ ] Telemetry: time-to-first-row query from `estimate_sheet_events`; confirm `/workshop` Vercel redaction (no change needed — `vercel-web-analytics.ts:6,39`).
- [ ] Rollout: manual logical dump taken pre-migration (PITR off per `AGENTS.md:29`); validated on a Supabase branch; no runtime flag (none exists for non-AI); forward-only acknowledged.
- [ ] Run `bun run validate` / targeted vitest + `e2e/estimate-tree-dnd.spec.ts`, `e2e/workshop-template-insert-smoke.spec.ts`.

**Out-of-scope DB coupling noted (not planned):** AI package-builder applies into the tree via `create_estimate_node_with_history` / `insert_estimate_template_into_estimate_with_history` and reads kind in `src/app/api/ai/package-builder/handler.ts` — it inherits the relaxed RPC contracts automatically; no AI app changes planned here.