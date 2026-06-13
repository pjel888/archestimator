# P2 — Database / RPC / scaling-cliff migrations (READY, NOT APPLIED)

**Status: authored as ready artifacts; NOT applied to hosted.** Per `08 Q4` the P2 program
is gated: *"proceed to plan/prove P2 in parallel (write migrations) but do not apply to
hosted until P0 ships and the owner approves the RLS rewrite specifically."* The implementation
session shipped P0/P1/P3-app to the branch; this folder holds the P2 migrations ready for the
owner-gated apply, which must run on the PG17 prove-harness first (`06 §G`, `D6`).

Every migration here is **additive / relax-only → zero data loss** (new index, new functions,
new columns + backfill, behavior-neutral RLS body rewrites, added WITH CHECK). None drop data.

**Why these live in the plan dir, not `supabase/migrations/`:** keeping them out of the repo
migration pipeline ensures a concurrent agent's `supabase db push` cannot auto-apply them before
the owner approval + prove-harness gate. Move them into `supabase/migrations/` (timestamped) at
apply time.

## Apply order + gating

| # | Task | File / spec | Risk | Gate |
|---|------|-------------|------|------|
| T9 | `(workspace_id, updated_at)` index (F12) | `T9_*.sql` ✅ authored | low (additive) | EXPLAIN before/after |
| T10 | `get_library_overview` RPC (F13/F14) | spec below | med | golden-master parity vs current `getLibraryOverview()` |
| T11 | `get_component_library_graph` RPC (F8) | spec below | med | round-trip count + parity |
| T12 | explicit columns, drop over-fetch (F9) | **repo code, no migration** | low | DTO snapshot unchanged; RSC payload shrink |
| T13 | cache taxonomy + seed folders out-of-band (F10/F11) | spec below | med-high | folder-state-survival proof (hybrid; G3) |
| T14 | paginate/virtualize components list (F16) | **mostly repo code** + cursor | med | synthetic large dataset on prove-harness |
| T15 | RLS initplan caching (F15) | `T15_*.sql` ✅ authored | **highest** | access-decision proof + advisor drop |
| T16 | denormalize `workspace_id` on template nodes/rows (F28) | spec below | med | EXPLAIN: correlated EXISTS gone |
| T17-RLS | editor-write split + child-table hardening (F19) | spec below | high | viewer-denied/editor-allowed prove-harness |

App-layer guards for T17 already shipped on the branch (`assertCanManageLibrary` +
`requireWorkspaceTemplate` editor gate); the RLS split below is the enforcement layer.

---

## T10 — `get_library_overview(target_workspace_id uuid)` RPC (F13/F14)

Replace the 11-parallel-query `getLibraryOverview()` JS body with one `security definer set
search_path = public` RPC that re-checks `is_workspace_member(target_workspace_id)` and returns
the full `LibraryOverview` contract as one JSON row:
`{ componentCount, categoryCount, supplierCount, brandCount, templateCount, templateGroupCount,
templateCategories[], recentComponents[], recentTemplates[] (with summarized group/area/row/total),
health: { discontinuedInUseCount, ... } }`.

- Wrap in the repository (`getLibraryOverview` → single `rpc()` call) behind a **fail-open probe**
  (try RPC; on `42883 undefined_function` fall back to the current JS path) so a partial-drift
  deploy never 500s — same discipline as the add-tab create RPC.
- **TDD gate:** golden-master test asserting RPC output `deepEquals` the current JS-folded output
  for the seed workspace, BEFORE cutover. `EXPLAIN (ANALYZE, BUFFERS)` the RPC.

## T11 — `get_component_library_graph(target_workspace_id uuid, include_detail boolean)` RPC (F8)

One round-trip returning items + nested `json_agg` of price options / current cost entries (and,
when `include_detail`, the version/history/attachment graph). Wire
`loadCurrentWorkspaceComponentRowsLibrary` to call it; keep the `includeDetailGraph:false` lite
path. **TDD gate:** round-trip count drops ~10 → ~2; parity vs current loader output.

## T13 — Cache taxonomy + seed folders out-of-band (F10/F11) — hybrid (G3)

- Cache the global category tree via `unstable_cache` keyed by `componentCategoryTaxonomyVersion`
  (no per-request 685-row fetch + JS tree-build).
- Move `ensureWorkspaceLibraryFolders` off the read path via a **trigger-on-workspace-create**
  seeding the taxonomy folder rows, OR virtualize *unchanged* taxonomy folders at the view layer.
- **Invariant (G3):** `library_folders` stays the canonical persisted source of truth for every
  item-addressable `library_folder_id` and every customized folder row (create/rename/delete/
  reorder, `source_category_node_id`). **Proof required:** customized names/order/deletes and
  item→folder references survive; no INSERT on the read path.

## T16 — Denormalize `workspace_id` onto template nodes/rows (F28)

`alter table estimate_template_nodes add column workspace_id uuid;` (+ rows table), backfill from
the parent template, add FK + index, switch the node/row RLS policies from a per-row correlated
`EXISTS (... join estimate_templates ...)` to direct `is_workspace_member(workspace_id)`.
**Proof:** EXPLAIN shows the correlated subplan gone. Additive (nullable column → backfill →
set not-null after backfill verified).

## T17-RLS — editor-write split + component child-table hardening (F19/D8)

Current state (audit): component *item* RLS is already editor-write split
(`20260526142913_project_sheet_collaboration_access.sql:756-762`); the gaps are:
1. **Template tables** (`20260522091621_component_library_templates.sql:583-620`) are still
   member-wide for writes → split into `SELECT using is_workspace_member` +
   `INSERT/UPDATE/DELETE using/with check is_workspace_editor` for `estimate_templates`,
   `estimate_template_nodes`, `estimate_template_row_items`.
2. **Component child tables** still allow member writes → harden
   `cost_library_item_versions`, `cost_library_item_variant_cost_entries`,
   `cost_library_item_variant_attachments` (and price options / history) to `is_workspace_editor`
   for writes, `is_workspace_member` for select.
- **Run a current-policy inventory first** (`select * from pg_policies where tablename in (...)`)
  and preserve already-correct policies. **Prove:** viewer denied + editor/admin allowed across
  items, price options, versions, cost entries, attachments, history, templates, nodes, rows,
  folders on the PG17 prove-harness.

---

## Prove-harness

Local PG17 (Docker absent — project memory), mirroring `scripts/prove-estimate-tabs-postgres.mjs`
/ `scripts/prove-notification-rls-postgres.mjs`. Seed one workspace with viewer/editor/admin
members; assert access decisions before/after each policy migration. RPC migrations add a
golden-master parity assertion before cutover.
