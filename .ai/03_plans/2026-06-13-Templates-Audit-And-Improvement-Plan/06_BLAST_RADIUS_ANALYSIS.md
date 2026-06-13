# 06 — Blast-Radius / Impact Analysis

**Lens:** What depends on the Templates/reusable-source surfaces, what they couple to, and "what breaks if we change X" — so the improvement plan can move safely. Built from the `code-review-graph` MCP (impact radius, affected flows, caller maps) plus `grep`/`Read` where the graph lacked coverage.

**Method caveat (1st pass — now resolved):** the original analysis ran on a **stale** `code-review-graph` index (`src/lib/reusable-sources/` = 0 nodes, `getEstimateTabTree` absent), so caller maps were grep-derived. The 3rd pass **re-indexed** the graph (full rebuild, 1054→1168 files; see [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)) and re-ran impact analysis — the authoritative results are in the refresh below, which supersedes the matrix where they differ.

---

## ⟳ 3rd-pass refresh (graph re-indexed — AUTHORITATIVE)

Re-run on the fresh graph (`reusable-sources/` now fully indexed). Caller counts below are graph-VERIFIED at confidence 1.0; `get_affected_flows`/`get_impact_radius` remain unreliable for these repository/action files even fresh (0 flows; skill-tooling pollution), so the authoritative signal is the targeted `callers_of`/`importers_of` queries.

**Corrected caller counts (supersede the matrix below):**
- **`getEstimateTabTree` — 8 callers, not 5.** The stale doc missed **`resolveEstimateTabRouteContext`** (node-route resolver, `workspace-repository.ts:1855`). Others: export ×2, `fetchEstimateTabTree`, `getProjectEstimateTreeByEstimate`, `getProjectEstimateTreeByNode`, both reusable functions.
- **`getEstimateTabs` — 11 callers** (stale doc enumerated none): export GET, node-route page `ProjectEstimateNodePage`, `fetchEstimateTabs`, **6 tab-CRUD actions** (create/rename/reorder/duplicate/archive/delete), + both reusable functions.
- **Duplicate hazard:** a **second `getEstimateTabTree` exists at `estimate-repository.ts:186` with 0 callers** (dead) — U1 must edit the `workspace-repository.ts:1731` one.

**Safety verdicts for the plan's units:**
- **U3 removal — PROVABLY SAFE (VERIFIED).** `project-source-browse-tree.tsx` has **exactly one importer** (`TemplatesBrowseManager.tsx:45`); all 11 of its exports are referenced only there. `listReusableProjectSources`/`listReusableProjectEstimateSources`/`getReusableEstimateOutline` are consumed **only** by the library route (`templates/page.tsx`, `TemplatesBrowseManager`) and the **in-estimate panel** (`index.tsx:803,1735,1769`) — no export/AI/publication path. The in-estimate panel imports `TemplatesTree` from its own `./tree/TemplatesTree` (`index.tsx:67`), never the browse-tree file, so U3 cannot regress it. (Test note: `template-gallery.test.tsx:169-170` also passes the removed `projectSources` prop — add it to U3's test-update list — [16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U3-1.)
- **U4 hardening — SAFE (VERIFIED).** The AI package-builder calls the RPC (`apply.ts:1061`) with a **user-scoped RLS client** and the real `acting_user_id`, so hardening denies only genuine non-editors — behavior-consistent with the manual path. (Caveat now tracked: `fill_current_estimate` against a restricted estimate is correctly denied — a behavior change to test, [16] U4-3.)
- **U1 fallback — must be READ-ONLY-SAFE (VERIFIED).** Because `getEstimateTabs` has **6 tab-CRUD mutation callers**, the synthetic-"Main" fallback must serve **reads only**; mutation callers must surface a typed "tabs unavailable" error ([16] U1-RO). Folded into [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) U1.

---

## Blast-radius matrix

| Symbol | Direct callers | Affected flows / surfaces | Tests? | RISK |
|---|---|---|---|---|
| `getProjectEstimateTreeByEstimate` (`workspace-repository.ts:1806`) | 9 — export route; `estimates/actions.ts` (fetch, reorder, delete, deleteBulk, insertTemplate, insertTemplateNode, wrapArea); `getProjectEstimateTreeByNode` | **the universal post-mutation refresh** + non-tab export | yes | **CRITICAL** — hub node; whole-estimate (not tab-scoped) shape consumed everywhere |
| `getEstimateTabTree` (`workspace-repository.ts:1731`) | 5 — export route `:107,156`; `reusable-sources/actions.ts:139,194`; `estimates/actions.ts:1139`; `getProjectEstimateTreeByNode` | export, reusable browse, workshop tab load, node-route | yes (export, domain, reusable) | **HIGH** — central tab loader; **absent from graph**; `{project,estimate,tab,tree,loadLimitState}` contract is a de-facto public API |
| `insert_estimate_template_into_estimate_with_history` (RPC) | 3 TS sites — `estimates/actions.ts:2168,2454`; `ai/package-builder/apply.ts:1061` | manual insert **and AI package-builder apply** | yes | **HIGH** — signature change breaks both manual and AI paths |
| `searchReusableProjectSources` (`reusable-sources/actions.ts:94`) | 1 — `index.tsx:977` | dock search only | yes | **HIGH (perf)** — unbounded N×M×K fan-out (see [03](03_PERFORMANCE_AUDIT.md) PERF-1) |
| `getReusableEstimateOutline` (`:190`) | 2 — `TemplatesBrowseManager.tsx:688`, `index.tsx:1769` | outline UI | yes (mocked) | **MED** — currently 500s live ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md)); bounded per-estimate but uncached |
| `listReusableProjectEstimateSources` (`:70`) / `listReusableProjectSources` (`:56`) | 2 each — browse + panel + SSR | source lists | yes | **LOW** |
| `getProjectEstimateTreeByNode` (`workspace-repository.ts:1904`) | node-route loaders | resolves node→tab; **has the legacy fallback** the reusable path lacks | partial | **MED** |
| `TemplatesTree` (`tree/TemplatesTree.tsx`, 994 LoC) | 1 render — `index.tsx:1965` + helpers | in-estimate panel only | yes | **MED** — large, single consumer |
| `TemplatesBrowseManager` (`templates-browse/`) | 1 — dynamic import (`TemplatesBrowsePageClient.tsx:10/54`) | standalone page | yes | **LOW (post-D-C)** — its project-source tree (`project-source-browse-tree.tsx`) is **deleted** by D-C/U3, removing the drift-vs-`index.tsx` concern; only custom-template browse remains |

---

## Coupled surfaces (regression risk)

- **XLSX export** (`export/proposal.xlsx/route.ts`, `proposal-export/`) — *tightly coupled, well-guarded.* Tab-aware: `getEstimateTabTree` per tab (`:107,155`), worksheet names via `worksheet-name.ts`. **MED** — any change to `getEstimateTabTree`'s `loadLimitState`/return shape breaks export limits. Heavily tested.
- **AI / Ask Flip / package-builder** (`ai/read-context.ts`, `ai/package-builder/`) — *deep tab coupling.* Read-context groups by tab with a `"legacy-main"` fallback (`read-context.ts:1257`); package-builder shares the insert RPC (`apply.ts:1061`). **HIGH** — Ask answers and AI apply both depend on correct node→tab attribution; the legacy fallback is fragile if backfill is incomplete. (Note: with `estimate_tabs` unapplied, the `"legacy-main"` fallback is the *active* path in prod.)
- **Publication / shared-link snapshots** (`publication/snapshot.ts`, `/share/[token]`) — *deep tab coupling.* Snapshots embed per-tab structure (`buildSnapshotEstimateTab`, `buildNodeTabMap`, `:165-232`), routing nodes to `estimateTabId` else default. **HIGH** — old snapshots without tabs must still render; ~20 publication flows affected.
- **Versioning / audit** (`estimate_sheet_events.estimate_tab_id`, activity composer) — *schema-coupled.* FK `ON DELETE SET NULL`; partial index; null-tab legacy events tolerated. **MED**.
- **Mass-deletion** (`mass-deletion/bulk-action.ts`) — *label-only diff* (sheet→ESTIMATE). `estimate_nodes.estimate_tab_id` carries `ON DELETE CASCADE` to `estimate_tabs`, so estimate/project deletion cleans tabs transitively. **LOW** — smoke-test the cascade.
- **Collaboration** (`collaboration/actions.ts`) — small diff; the "access tabs" UI is unrelated to estimate_tabs. **LOW**.

---

## What breaks if we change X (top improvement targets)

1. **Apply the `estimate_tabs` migration / fix the outline fallback (U1).** Applying the migration flips the active path from the `"legacy-main"` fallback to real tabs across AI read-context, publication snapshots, node-route loaders, and export — a broad surface. *Lower-risk first step:* add the `isEstimateTabsSchemaMissing` fallback to `getEstimateTabs`/`getEstimateTabTree` so the reusable path degrades safely **without** the apply (contained to `workspace-repository.ts`). Then schedule the apply with the full coupled-surface regression set.
2. **Build the project-source insert path (U2).** New RPC + action + UI wiring. Blast radius is *additive* (new symbols) but the RPC must mirror the template RPC's checks and the DB trigger `validate_estimate_node_tree` (rejects cross-tab parents), and AI package-builder must not be disturbed (it shares the template RPC, not this one). Re-read-at-insert per [04](04_DATA_FETCHING_AND_STATE_AUDIT.md) DATA-4.
3. **Server-side reusable search / cache outlines (PERF-1/3).** *Highest-value, lowest-coupling.* Only UI callers; no server flow depends on freshness. Invalidate on estimate mutation (the insert/delete/reorder paths already refresh trees → add `revalidateTag`). Key on `estimate_tabs.updated_at`.
4. **Harden the insert RPC (SEC-1).** 3 TS call sites + DB function + `types.ts:3206` + 2 tests in `estimate-node-reorder-action.test.ts`. The DB trigger forces inserted subtrees to inherit the parent's tab; an added `target_tab_id` param must respect that.
5. **Two project-source tree implementations → now one (resolved by D-C).** The library route's `project-source-browse-tree.tsx` is **deleted** by D-C/U3, so the in-estimate `TemplatesTree` becomes the single project-source tree — the drift concern is eliminated; no unification work needed.
6. **Tab-scoped post-mutation refresh.** `getProjectEstimateTreeByEstimate` is the hub (CRITICAL). Do **not** change its shape; add a parallel tab-scoped refresh and migrate callers behind tests.

---

## Highest-risk change zones (ranked)

1. `getProjectEstimateTreeByEstimate` (CRITICAL) — never change its return shape; add new functions alongside; re-run reorder + export suites.
2. `getEstimateTabTree` (HIGH + stale in graph) — re-index first; treat its contract as public; add a contract test.
3. `searchReusableProjectSources` perf (HIGH) — the prime caching/pagination target; guard with a perf test.
4. Insert RPC shared with AI package-builder (HIGH) — re-verify the AI apply flow on any RPC change.
5. Publication snapshot + AI read-context tab grouping (HIGH) — keep the null-tab/`"legacy-main"` fallbacks; test a tab-less legacy snapshot fixture.
6. `TemplatesTree` vs `project-source-browse-tree.tsx` drift — **resolved by D-C** (the library-route tree is deleted in U3); `TemplatesTree` becomes the sole project-source tree.

---

## Evidence used

`code-review-graph` MCP (`get_impact_radius`, `get_affected_flows`, `query_graph` callers_of, `get_minimal_context`); grep/Read for reusable-source/tab symbols. Files: `workspace-repository.ts`, `reusable-sources/actions.ts`, `estimates/actions.ts`, `export/proposal.xlsx/route.ts`, `ai/read-context.ts`, `ai/package-builder/apply.ts`, `publication/snapshot.ts`, `mass-deletion/bulk-action.ts`, `tree/TemplatesTree.tsx`, `templates-browse/*`, `20260612094734_estimate_tabs_foundation.sql`.

## Truth & integrity

- **VERIFIED (code/migration):** caller maps (grep); insert RPC's 3 call sites; tab-aware export branching; AI/publication tab grouping; schema facts (NOT NULL `estimate_tab_id`, composite CASCADE FK, per-tab unique sort, `validate_estimate_node_tree` cross-tab rejection, `estimate_sheet_events.estimate_tab_id` SET NULL); mass-deletion label-only diff.
- **VERIFIED stale graph:** `reusable-sources/actions.ts` = 0 nodes; `getEstimateTabTree` not found; line numbers off ~260 lines — re-index recommended.
- **ASSUMPTION:** flow-criticality scores come from the graph's pre-feature snapshot (directional); the insert RPC's destination-tab behaviour is inferred from `target_parent_node_id` + the enforce-tree trigger (RPC body lives in DB, not re-read here).
