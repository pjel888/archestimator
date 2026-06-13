# 13 — Insert-Path Design Spec (U2)

**What this is:** The implementation-grade design for the missing capability — inserting a project-derived source (tab / group / area) into a target estimate. **Gated on D-B = "build".** Modeled directly on the existing, working template-insert RPC (`insert_estimate_template_into_estimate[_with_history]`, `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:771-1055`), which this spec read line-by-line. Code shapes are directional guidance, not final code.

**Dependency:** ships **after** U4 (the hardened `can_edit` gate) and benefits from D-A (real tabs); on the fallback schema it inserts into the single "Main" tab.

---

## 1. The new RPC — `insert_estimate_subtree_into_estimate_with_history`

A SECURITY DEFINER wrapper + a non-definer inner copy function, exactly mirroring the template pair, but **sourcing from a live estimate subtree** (`estimate_nodes` + `estimate_row_items`) instead of `estimate_template_*`.

**Inner `insert_estimate_subtree_into_estimate` (NOT security definer).**

> **⚠ Security invariant (corrected — [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-1, P0):** an earlier draft of this spec claimed the inner's source `select` would be "RLS-filtered because it runs as the caller." **That is FALSE.** A non-DEFINER function invoked from the SECURITY DEFINER wrapper inherits the definer's context — it runs as `postgres`, **RLS-exempt** (verified via `pg_proc`: wrapper `prosecdef=true` owned by `postgres`, inner `prosecdef=false`). **Do NOT rely on RLS for source authorization anywhere in this chain.** The template RPC is safe only via its explicit `source_workspace_id = target_workspace_id` equality — and that equality is **not sufficient here**, because same-workspace estimates can still be sheet-restricted from the caller. The source read MUST be guarded by an explicit `can_access_estimate(source_estimate_id)` call (check #3). Without it, a target-estimate editor could copy the subtree of any same-workspace estimate, including ones they cannot access → cross-estimate confidentiality breach.

Parameters: `target_project_id`, `target_estimate_id`, `target_parent_node_id`, `source_estimate_id`, `source_root_node_id` (the tab's root or a specific group/area; null ⇒ whole tab), `source_tab_id`.

**Check ordering (the security contract — must be exactly this order):**
1. Args present → else raise.
2. **Target** estimate ∈ target project → resolve `target_workspace_id` (mirror template RPC `:795-804`); else "Estimate not found in the current project."
3. **Source readability — EXPLICIT gate (do NOT rely on RLS):** `if not public.can_access_estimate(source_estimate_id) then raise exception 'Source estimate access denied.'`. Then resolve `source_workspace_id` and assert the source rows exist and belong to `source_estimate_id`/`source_tab_id`. (The template RPC has no analogue because templates are workspace-wide assets with no per-sheet ACL; project sources DO have per-sheet ACL, so this gate is **mandatory**.)
4. **Same workspace** — `source_workspace_id = target_workspace_id` else "Source does not belong to the target estimate workspace." (mirror `:815-817`).
5. **Target parent is a group IN the target estimate** — filter `node.kind='group' AND node.estimate_id=target_estimate_id` → capture `target_parent_tab_id`; else "Target Group Node not found." (mirror `:819-828` verbatim — rejects forged cross-estimate/area parents, [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-6).
6. Copy (below), then **post-copy** `validate_estimate_node_tree(target_estimate_id)` (mirror `:970`).

**Copy mechanics (mirror `:840-963`):**
- `for update` lock on the target tab's nodes **(mirror `:840-844`)**, then `set constraints … deferred` for the per-tab unique-sort constraints **(`:846`)**, then compute `max_sibling_sort_order` **inside the lock** so concurrent inserts don't race the sort base ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-3).
- Build a temp `source→target` id map over the selected source subtree (filter `estimate_nodes` by `source_estimate_id` + `source_tab_id` + the subtree rooted at `source_root_node_id`).
- Insert nodes into `estimate_nodes` with `estimate_tab_id = target_parent_tab_id` (so the inserted subtree inherits the parent's tab — required by the `validate_estimate_node_tree` cross-tab rule `:231-239` and the trigger).
- Insert rows into `estimate_row_items`.
- **Provenance metadata** (analogous to the template's `sourceTemplateId/Name/NodeId`): stamp each node/row with `sourceProjectId`, `sourceEstimateId`, `sourceTabId`, `sourceNodeId`/`sourceRowId`, and `sourceKind: 'project'`. This makes inserted content traceable and is the signal the UI's "Live source" provenance uses.
- Count-check (`:961-963`) and return `inserted_root_node_ids` + counts + `estimate_tab_id`.

**SECURITY DEFINER wrapper `insert_estimate_subtree_into_estimate_with_history` (mirror `:981-1055`):**
- `resolved_workspace_id := assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)` — **target edit check** (this is the U4 gate; do not regress to bare `resolve_estimate_workspace`).
- `for update` on the target estimate; idempotency via `correlation_id` + `estimate_sheet_event_result` (mirror `:1003-1008`). **The action must mint a STABLE per-source-unit `correlation_id`** (derived from a source-unit key): a shared id silently no-ops the 2nd+ units of a bulk insert (dedup is on `(estimate_id, correlation_id)`), while a fresh-per-retry id double-inserts ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-2).
- Call the inner copy.
- Emit an `estimate_sheet_events` row with `event_type = 'project_source_inserted'`, `estimate_tab_id = target_parent_tab_id`, and payload `{sourceProjectId, sourceEstimateId, sourceTabId, sourceRootNodeId, targetParentNodeId}` (mirror the `template_inserted` event `:1023-1047`).
- `set search_path = public`.

**Why a dedicated RPC (not reuse the template RPC):** the source tables differ (`estimate_*` vs `estimate_template_*`), and conflating them would force the template path to branch — increasing the blast radius on the AI-package-builder-shared template RPC ([06](06_BLAST_RADIUS_ANALYSIS.md)). A parallel RPC keeps the template path untouched.

---

## 2. The server action — `insertProjectSourceIntoEstimate`

**File:** `src/lib/reusable-sources/actions.ts` (new export).

**Contract:** input `{ targetProjectId, targetEstimateId, targetParentNodeId, source: { projectId, estimateId, tabId, nodeId | null } }`.
- `requireCurrentUserContext()`; UUID-guard all ids (fail closed).
- **Re-read-at-insert (DATA-4):** do **not** trust the cached `ReusableEstimateSource` preview. Re-resolve the source subtree server-side by id immediately before the RPC (a fresh RLS-scoped read); if it no longer exists → typed `SourceNoLongerAvailableError` (denial 7).
- Call the RPC on the **RLS-scoped user client** (never admin — matches the established reusable-source discipline, [05](05_DATABASE_RLS_SECURITY_AUDIT.md)).
- Return the refreshed target tree (reuse `getProjectEstimateTreeByEstimate`/`getEstimateTabTree` as the template insert does) so the client re-renders canonically.

---

## 3. UI wiring (turn the dead seams live)

- **Supply `onInsertProjectSource`** from `EstimateSheetContent` into `component-library/index.tsx` (today it's consumed at `:1368` but never passed → the disabled "not wired" state). Wire it to `insertProjectSourceIntoEstimate` + the existing target-resolution used by the template picker.
- **Drop handler:** add a consumer for `readProjectSourceDragPayload` (today orphaned) in the estimate tree drop handlers (`EstimateSheetTree.tsx` / `drop-zones.tsx`), mirroring `readEstimateTemplateDragPayload`'s 4 consumers. On drop into a group, call the action; on drop into an area, trigger the **wrap-group** flow (mirror `wrapEstimateAreaAndInsertTemplate`).
- **Bulk:** `getCheckedProjectSourceTargets` (`TemplatesTree.tsx:394`) already resolves checked targets; route it through the action with **per-unit partial-failure reporting**.
- **Library route (D-C):** project sources are **removed** from the library route (U3), so this insert action is wired **only** in the in-estimate panel — there is no route-browse project-source insert.

---

## 4. Decisions (resolve at design time, not implementation)

- **Whole-tab insert** = insert all root groups of the source tab, order preserved (the `source_root_node_id = null` case).
- **Area target** → wrap-group (an area can't parent a group/area; mirror the template wrap-group flow). The wrap path does pre-insert mutations (create group + reorder) — assert `can_edit` at the **very top** of the flow, before any mutation, or a denied viewer leaves an orphan group ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-5 / U4-2).
- **Source granularity** = tab (whole), group, or area subtree. A single row is not independently insertable (rows live under areas).
- **Self-insert** (source estimate == target estimate) is **allowed** (a user may reuse a group elsewhere in the same estimate) but must be flagged in the UI to avoid confusion (the live audit saw the current estimate listed as a source of itself).

---

## 5. Denial-scenario test matrix (the security proof for U2)

| # | Scenario | Expected | Where proven |
|---|---|---|---|
| 4 | viewer-on-target forges an insert | RPC raises "Estimate edit access denied."; nothing written; no event | RLS harness + action test |
| 5 | editor supplies an unreadable (sheet-restricted) `source_estimate_id` | **RPC's explicit `can_access_estimate` gate raises** "Source estimate access denied."; nothing written; no event (NOT RLS — [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U2-1) | RLS harness (RPC-level) + action test |
| 6 | cross-workspace source | inner raises "Source does not belong to the target estimate workspace." | harness |
| 7 | source deleted between browse and insert | re-read-at-insert finds nothing → `SourceNoLongerAvailableError` | action test |
| — | whole-tab insert | all root groups copied, order preserved, provenance stamped | RPC test |
| — | area target | wrap-group then insert | DOM/action test |
| — | bulk mixed selection, one fails | per-unit success/failure reported; partial commit semantics defined | action test |
| — | inserted subtree inherits target parent's tab | `validate_estimate_node_tree` passes; no cross-tab violation | RPC test |

**New test files:** `tests/vitest/project-source-insert-action.test.ts`, extend `scripts/prove-estimate-tabs-postgres.mjs` with the subtree-RPC denial cases, and add the e2e "drag project source into a tab" scenario (U16).

## Truth & integrity

- **VERIFIED:** the design mirrors the actual template RPC read at `20260612094734:771-1055`, the `validate_estimate_node_tree` rules (`:208-295`), and the hardened gate (`:180-206`); the dead seams (`onInsertProjectSource`, `readProjectSourceDragPayload`) are confirmed in [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md)/[15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md).
- **CORRECTED (3rd pass, [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md)):** the original draft's claim that the inner source read is RLS-filtered was a **P0 error** (the DEFINER chain runs RLS-exempt as `postgres`). Check #3 is now an explicit `can_access_estimate` gate; idempotency (U2-2), lock/defer/recompute (U2-3), top-of-wrap gating (U2-5), and the parent guard (U2-6) are now explicit.
- **DECISION-GATED / DIRECTIONAL:** this entire unit is gated on D-B; the RPC/action shapes are design guidance, and the RPC's apply is owner-gated (provider action) per [14](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md).
