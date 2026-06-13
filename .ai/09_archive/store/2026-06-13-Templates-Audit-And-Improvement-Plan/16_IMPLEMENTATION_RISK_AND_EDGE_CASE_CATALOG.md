# 16 — Implementation Risk & Edge-Case Catalog

**What this is:** An adversarial correctness review of the implementation specs — [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) (U1/U1b/U4), [13](13_INSERT_PATH_DESIGN_SPEC.md) (U2), [14](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md) (D-A) — treating the **designs as the artifact to break before they become code bugs**. Verified against live code, the `estimate_tabs` foundation migration, and live read-only DB metadata (`ebxxqidacheyapmmzavr`). Items are VERIFIED (confirmed against source/DB) or ASSUMPTION. **The specs 12/13/14 have been corrected per the must-fix items below** — this catalog is the rationale + the test obligations.

> **Most dangerous finding (U2-1, P0):** the original [13](13_INSERT_PATH_DESIGN_SPEC.md) assumed the new RPC's inner copy reads the source RLS-filtered. **It does not** — a non-DEFINER function invoked from a SECURITY DEFINER wrapper inherits the definer's context (runs as `postgres`, RLS-exempt). As originally designed, a target-estimate editor could copy the subtree of **any** same-workspace estimate, including ones they cannot access → cross-estimate confidentiality breach. The fix is an **explicit `can_access_estimate(source_estimate_id)` gate inside the RPC**, never RLS reliance.

---

## U1 — reusable-outline missing-schema fallback

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U1-1 | **P0** | Changing `getDefaultEstimateTab` to *return* a synthetic tab (orig 12) breaks the existing throw-based legacy fallback of `getProjectEstimateTreeByEstimate` (`workspace-repository.ts:1811-1827`): a truthy synthetic `{id:"legacy-main"}` skips the legacy branch (`:1813`) and flows into `getEstimateTabTree(..., "legacy-main")` as a real `tabId`. | `:1811-1827`, `:1862-1869` | **Do NOT change `getDefaultEstimateTab`** — leave it throwing/returning null. Only `getEstimateTabs` + `getEstimateTabTree` get the fallback (they are the reusable-outline path). |
| U1-2 | P1 | Synthetic `"legacy-main"` id is passed as a real `tabId` to `getEstimateTabTree` by `getReusableEstimateOutline` (`reusable-sources/actions.ts:192-194`); only "works" because the inner `estimate_tabs` SELECT throws first. | `:192-194`; `:1760` | Gate the `getEstimateTabs` fallback strictly on `isEstimateTabsSchemaMissing`; in `getEstimateTabTree`, route a `"legacy-main"` id to the legacy loader rather than a literal id lookup (or have the outline call the legacy loader directly). |
| U1-3 | P1 | **Mixed-state masking:** post-D-A, an estimate violating P1 (no default tab) renders the whole-estimate legacy tree instead of erroring (`getDefaultEstimateTab` returns null → caller treats as "use legacy"). The fallback hides a constraint violation that should be loud once the schema is live. | `:1717-1729`, `:1813` | Distinguish "schema absent" (legacy OK) from "schema present but no default tab" (data error → log/raise). Promote the P1 check to a monitored invariant. |
| U1-RO | **P1** | **(from blast-radius lane)** The fallback must be **read-only-safe.** `getEstimateTabs` has **11 callers including 6 tab-CRUD mutation actions** (create/rename/reorder/duplicate/archive/delete) + the node-route page. A fallback that synthesizes a writable "Main" tab must not let those mutations operate on a fake tab. | fresh graph: 11 callers of `getEstimateTabs` | Mutation callers must surface a typed "tabs unavailable" error under schema-missing, not act on a synthetic tab. The synthetic tab is for **reads only**. |
| U1-DUP | P2 | **Edit-the-wrong-file hazard:** a duplicate `getEstimateTabTree` exists at `estimate-repository.ts:186` with **0 callers**. U1 must edit the `workspace-repository.ts:1731` one. | `estimate-repository.ts:186` | Name the exact file in U1; consider deleting the dead duplicate. |
| U1-4 | P2 | `getEstimateTabTree` fallback must forward `options` (maxNodeCount/maxRowItemCount) to `getProjectEstimateTreeByEstimateLegacy`, or export limit enforcement silently changes. | export passes options `proposal.xlsx/route.ts:107-109,156-159` | Fallback calls `getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options)` and synthesizes `tab`. |
| U1-5 | P2 | The **export route also 500s today** (`proposal.xlsx/route.ts:213` calls `getEstimateTabs`, no try/catch) — U1 *changes export from 500→success on live*, it is not a passive "unchanged" regression check. | `:213` | Add export to U1's explicit test matrix (integration test vs schema-missing DB → 200 + correct single-tab workbook). |
| U1-6 | P3 | `searchReusableProjectSources` (`:137-139`) has the same throw; U1 fixes it transitively but the test matrix omits it. | `:137-139` | Add a search-path schema-missing test. |

**U1 verdict: corrected** — `getDefaultEstimateTab` change dropped; read-only-safe + mixed-state guard + dup-file note added to [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md).

---

## U1b — user-safe outline error surface

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U1b-1 | **P1** | Orig U1b targeted the wrong file. The live `{code…,details:Null,hint…,message…}` leak is in the **in-estimate panel**: rendered at `component-library/index.tsx:1110` from raw `error.message` stored at `:1776` (parallel leaks `:808`, `:982`, `:1747`) — not `TemplatesBrowseManager`. | `index.tsx:1110,:1776,:808,:982,:1747` | Pin U1b to `component-library/index.tsx` (stop storing raw `error.message`; store a fixed string via `toUserSourceError`). |
| U1b-2 | **P1** | U1b's named target `TemplatesBrowseManager.tsx:534,544` **collides with U3**, which deletes that whole project-source block. | U3 deletes `:534-548` | Drop the `TemplatesBrowseManager` target from U1b; U3 handles it. |
| U1b-3 | P3 | `role="alert"` is genuinely absent today (plain divs) — net-new, no conflict. | `:1109` | Add `role="alert"`. |

**U1b verdict: corrected** — retargeted to `component-library/index.tsx`; `TemplatesBrowseManager` target removed in [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md).

---

## U4 — require `can_edit_estimate` + app assertion

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U4-1 | **P0 (test)** | The cited tests will **FAIL**, not "stay green": `estimate-node-reorder-action.test.ts:830-913` mocks `rpc` generically and asserts `toHaveBeenCalledTimes(1)` (`:873`). Adding `assertCanEditEstimate` (which calls `rpc("can_edit_estimate")`, `actions.ts:345-349`) makes it 2 calls, and the generic mock returns the insert object for `can_edit_estimate` → `data!==true` → throws. | `:830-913` | Spec must mandate **updating** these tests (mock `can_edit_estimate→{data:true}`, expect 2 ordered rpc calls). Re-label from "regression check" to "tests requiring update." |
| U4-2 | P1 | In `wrapEstimateAreaAndInsertTemplate` (`actions.ts:2389`), mutations (`create_estimate_node_with_history:2416`, `reorder_estimate_nodes_with_history:2436`) run **before** the template insert. If `assertCanEditEstimate` is added only "before the RPC," a viewer creates the wrapper group + reorder before being denied → orphaned mutations. | `:2389,:2416,:2436,:2454` | Place `assertCanEditEstimate` at the **very top** of `wrapEstimateAreaAndInsertTemplate`. Test: viewer wrap → assert NO `create_estimate_node_with_history` rpc fired. |
| U4-3 | P1 | Package-builder `fill_current_estimate` **IS affected** (orig 12 claimed "unaffected"): `apply.ts:1313` uses the RLS user client (`auth.role()='authenticated'`), so `estimate_sheet_can_bypass_auth()` is FALSE → the hardened RPC runs `can_edit_estimate` as the real user. Filling a *pre-existing restricted* estimate now correctly denies (today's bare gate allows). | `apply.ts:1313,:1328`; `20260601153000:10` | Acknowledge in spec; add an **RLS-harness** regression (fill restricted → denied; fill owned → allowed). The mock-success test `ai-package-builder-apply.test.ts:1459-1493` will NOT catch this. |
| U4-4 | **P1** | The standalone U4 migration must **not** copy the foundation RPC body verbatim: the live RPC gates on `resolve_estimate_workspace` and writes events **without** `estimate_tab_id`; the foundation body (`:981-1055`) reads/writes `estimate_tab_id` (`:1010,:1026`) — columns absent on live → migration fails to apply. | live `pg_get_functiondef`; `:981-1055` | Define only `assert_can_edit_estimate_for_history` (`:180-206`, no tab dependency) and `create or replace` the **live** RPC swapping exactly the gate line (`resolve_estimate_workspace`→`assert_can_edit_estimate_for_history`), keeping the live no-tab events insert + the live inner untouched. |
| U4-5 | P2 | App helper + RPC both evaluate `can_edit_estimate` (double-query) — acceptable defense-in-depth, note only. | `20260526142913:388` | None. |

**U4 verdict: corrected** — test-update obligation, top-of-wrap placement, package-builder reality, and the migration-body hazard added to [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md).

---

## U2 — insert-path subtree RPC + action + UI

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U2-1 | **P0** | **The source read is NOT RLS-filtered.** A non-DEFINER inner called from the SECURITY DEFINER wrapper runs as `postgres` (RLS-exempt) — confirmed: template wrapper `prosecdef=true` owned by `postgres`, inner `prosecdef=false`. As designed, a target-editor could copy **any** same-workspace estimate's subtree, incl. sheet-restricted ones. The template RPC is safe only via the explicit `source_workspace_id=target_workspace_id` equality (`migration:815-817`), NOT RLS. | live `pg_proc`; `migration:815-817` | The source-readability check MUST be an **explicit `if not can_access_estimate(source_estimate_id) then raise`** inside the RPC, plus verify source rows belong to `source_estimate_id`/`source_tab_id`. **Never rely on RLS inside the DEFINER chain.** Denial #5 must assert the RPC itself raises. |
| U2-2 | P1 | Bulk insert idempotency: `estimate_sheet_event_result` dedups on `(estimate_id, correlation_id)` (`20260524033151:256-258`). One shared `correlation_id` → 2nd+ units silently no-op (data loss); fresh-per-retry → double-insert. | `:256-258`; cf. `apply.ts:1060` | Mint one **stable per-source-unit** `correlation_id` (content/unit-derived) so retries are idempotent and units don't collide. Test: replay bulk of 3 → exactly 3 inserts. |
| U2-3 | P1 | Whole-tab insert sort/lock: must mirror the template RPC's `for update` lock on target-tab nodes (`migration:840-844`) + deferred per-tab unique-sort constraints (`:846`) + max-sibling-sort recompute **inside the lock**, or concurrent inserts race the sort base under `estimate_nodes_tab_unique_sort`. | `migration:840-846,142-145` | Replicate `migration:840-846` exactly. Test: two concurrent whole-tab inserts → disjoint sort orders, validate passes. |
| U2-5 | P1 | Area-target wrap-group must assert `can_edit` at the top (same as U4-2) before creating the wrapper group, or a viewer leaves an orphan group. | mirrors `:2389` | Gate first. |
| U2-6 | P2 | `target_parent_tab_id` resolution must reject area parents and cross-estimate parents (`node.kind='group' AND node.estimate_id=target_estimate_id`, `migration:819-828`), else a forged parent id attaches the copy to the wrong tab/estimate. | `migration:819-828` | Copy `:819-828` verbatim. Test: forged parent → "Target Group Node not found." |
| U2-4 | P2 | Self-insert (source==target) is cycle-safe (new ids) and not self-deadlocking (source read is a plain SELECT, no FOR UPDATE); post-copy whole-estimate validate doubles the walked set — perf note only. | `migration:208-295` | None; confirm re-read uses the same id for provenance. |
| U2-7 | P3 | Provenance `sourceKind:'project'` is net-new metadata, not validated by `validate_estimate_node_tree` — safe; ensure the UI provenance reader tolerates both `sourceTemplateId` and `sourceProjectId` shapes. | — | UI note. |

**U2 verdict: corrected** — the explicit `can_access_estimate` gate (U2-1), stable correlation_id (U2-2), lock/defer/recompute (U2-3), top-of-wrap gate (U2-5), and parent guard (U2-6) added to [13](13_INSERT_PATH_DESIGN_SPEC.md).

---

## U3 — remove project sources from library route

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U3-1 | P1 | `template-gallery.test.tsx:169-170` also passes the removed `projectSources` prop and will fail; orig specs only named `template-browse-project-sources.test.tsx`. | `template-gallery.test.tsx:4,169-170` | Add `template-gallery.test.tsx` to U3's test-update list (drop the `projectSources` arg). |
| U3-2 | P3 | `project-source-browse-tree.tsx` deletion is clean — single importer (`TemplatesBrowseManager`), all 11 exports referenced only there; in-estimate panel has its own copies. | grep + fresh graph | Confirm grep at implementation time; no dead export survives. |
| U3-3 | P3 | `getReusableEstimateOutline`/`listReusableProjectSources` stay used by the in-estimate panel — U3 removes only the library-route wiring, not the actions. | `index.tsx:803,1769` | Spec is correct. |

**U3 verdict: corrected** — `template-gallery.test.tsx` added to the U3 test list in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md)/[11](11_REQUIREMENTS_TRACEABILITY_AND_SEQUENCING.md).

---

## U14 / D-A — migration apply & rollback runbook

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| U14-1 | P1 | Rollback "restore the old `unique(estimate_id, parent_id, sort_order)` constraint" can be **unsatisfiable**: post-apply, sort_order is computed per-tab, so two nodes in different tabs can share `(estimate_id, parent_id, sort_order)`. Re-adding the estimate-scoped constraint then fails with a unique violation. | `migration:142-149,877,889` | Rollback must first **re-sequence sort_order per estimate** to resolve cross-tab collisions, OR document that estimate-scoped uniqueness is irrecoverable once multi-tab data exists (only safe revert = logical-dump restore). Mark step 1 conditional on "no multi-tab data written since apply." |
| U14-2 | P1 | Rollback order is unsafe: re-adding old constraints while the new tab-scoped constraints/FK still exist means the table briefly carries both; step 1 can abort before the column drop. | `migration:66-70,142-149` | Reorder: drop tab-scoped constraints + composite FK **first**, then drop NOT NULL, then (after U14-1 fix) re-add old constraints, then drop column/table. |
| U14-3 | P2 | "Restore prior `validate_estimate_node_tree`/insert RPC/reorder" is under-specified — prior bodies live across multiple migrations (the foundation also replaced reorder `:322` with cross-tab logic `:393`). | `20260519192045:42+`; `migration:322,393` | Pin exact source migrations/bodies, or prefer forward-fix (the runbook already recommends it). |
| U14-6 | P2 | Type regen lands a real multi-table diff; the `asEstimateTabsReadClient` casts (`workspace-repository.ts:1573-1577`) must be removed atomically with regen or they mask a now-real type mismatch. | `:1573-1577` | Commit regenerated `types.ts` + cast removal in one change. |
| U14-4/-5 | P3 | NOT NULL flip rollback is data-safe; explicit `begin;/commit;` in the pushed migration is an established pattern (7 shipped migrations). | — | None. |

**U14 verdict: corrected** — rollback reordering + collision-resolution + body-pinning added to [14](14_MIGRATION_APPLY_AND_ROLLBACK_RUNBOOK.md).

---

## Ranked must-fix-before-implementation

1. **U2-1 (P0)** — RPC source read is not RLS-filtered (DEFINER chain runs as `postgres`); add explicit `can_access_estimate(source_estimate_id)`. *Cross-estimate confidentiality breach as originally designed.*
2. **U4-1 (P0-test)** — `estimate-node-reorder-action.test.ts:830-913` will fail; mandate the test updates.
3. **U4-4 (P1)** — U4 migration swaps only the gate line on the **live (no-tab)** RPC body; do not copy the foundation body.
4. **U1-1 (P1)** — do not change `getDefaultEstimateTab`; it breaks the existing legacy fallback.
5. **U14-1 (P1)** — structural rollback's estimate-scoped constraint re-add is unsatisfiable once multi-tab data exists.
6. **U2-2 (P1)** — stable per-unit `correlation_id` for bulk inserts.
7. **U4-3 (P1)** — package-builder `fill_current_estimate` *is* affected; add an RLS-harness regression.
8. **U14-2 (P1)** — rollback constraint-drop order is unsafe; drop tab-scoped constraints/FK first.
9. **U1b-1/-2 (P1)** — retarget U1b to `component-library/index.tsx`; drop the `TemplatesBrowseManager` target (U3 deletes it).
10. **U3-1 (P1)** — add `template-gallery.test.tsx` to U3's test-update list.
11. **U4-2 / U2-5 (P1)** — `assertCanEditEstimate` at the **top** of `wrapEstimateAreaAndInsertTemplate` (before the pre-insert mutations).
12. **U1-2/-3 + U1-RO (P1)** — mixed-state guard + read-only-safe fallback (the 6 tab-CRUD callers).

Lower priority: U1-4/-5/U2-3/-6/U14-3/-6 (P2); U1-6/U1-DUP/U2-4/-7/U3-2/-3/U14-4/-5 (P3).

## Evidence used
`workspace-repository.ts:1573-1945`, `reusable-sources/actions.ts:137-225`, `estimates/actions.ts:345-349,2157-2470`, `ai/package-builder/apply.ts:1313,1056-1077,1297-1364`, `ai/read-context.ts:1257`, `proposal.xlsx/route.ts:105-216`, `component-library/index.tsx:1095-1115,1760-1788`, `estimate-repository.ts:186`, `20260612094734_estimate_tabs_foundation.sql:8-1055`, the live RPC body + live DB metadata (project `ebxxqidacheyapmmzavr`).

## Truth & integrity
- **VERIFIED:** all P0/P1 items above against source/migration/live `pg_proc`. U2-1 is confirmed by `prosecdef` flags + ownership; U4-1 by reading the test mocks; U4-4 by the live RPC body lacking tab columns.
- **ASSUMPTION:** U2-3 implementation-level race (constraint behavior verified; the impl doesn't exist yet), and package-builder fill-target reachability (depends on runtime config not executed here).
