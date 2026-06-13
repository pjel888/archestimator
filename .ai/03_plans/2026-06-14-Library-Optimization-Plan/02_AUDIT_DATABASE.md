# 02 — Database Layer Audit

**Supabase project:** `ebxxqidacheyapmmzavr` (owner-authorized). **Data layer:** `src/lib/repositories/component-library-repository.ts`.

> **Method note:** Row counts and schema are **live and authoritative** (read via REST + service-role). `EXPLAIN (ANALYZE, BUFFERS)` could **not** be run during the audit — the direct DB host `db.<ref>.supabase.co` is deprecated/unresolvable and the pooler password in `.env.local` is stale. Query-plan claims (seq-scan vs index) are **inferred from the index inventory** and must be confirmed with `get_advisors` + `EXPLAIN` on the PG17 prove-harness before the P2 DB changes ship (`06 §E`, `08 Q4`).

---

## A. Schema summary

All workspace tables are RLS-enabled and scoped via `is_workspace_member(workspace_id)`; the taxonomy is global.

| Table | Key columns | Large JSONB? | Relevant indexes |
|---|---|---|---|
| `cost_library_items` | `workspace_id`, `lifecycle_state` enum, `category_node_id`, `supplier_id`, `brand_id`, `library_folder_id`, `unit_cost`/`misc_cost`/`labor_cost`, `thumbnail_path`, `updated_at` | **`metadata jsonb`** | `workspace_id`; `(workspace_id, lifecycle_state)`; `category_node_id`; `supplier_id`; `brand_id`; `library_folder_id`. **No `(workspace_id, updated_at)`.** |
| `estimate_templates` | `workspace_id`, `sort_order`, `category`, `updated_at` | `metadata jsonb` | `(workspace_id, sort_order, name)` ✅ |
| `estimate_template_nodes` | `template_id`, `parent_id`, `kind`, `sort_order` | `metadata jsonb` | `(template_id, parent_id, sort_order)` ✅ |
| `estimate_template_row_items` | `template_id`, `template_node_id`, `source_library_item_id`, `source_snapshot jsonb`, `sort_order` | **`source_snapshot`** + `metadata` | `(template_id, template_node_id, sort_order)` ✅; `source_library_item_id` ✅ |
| `component_category_nodes` | `id text`, `parent_id`, `sort_order` (**GLOBAL**) | — | `(parent_id, sort_order)`. RLS `for select to authenticated using (true)`. |
| `component_suppliers` / `component_brands` | `workspace_id`, `sort_order`, `name` | — | `(workspace_id, sort_order, name)` ✅ |
| `library_folders` | `workspace_id`, `parent_id`, `sort_order`, `source_category_node_id` | — | `(workspace_id, parent_id, sort_order)` ✅ |
| `cost_library_item_price_options` | `workspace_id`, `item_id`, `is_default`, `is_active`, `variant_sort_order` | **`variant_metadata`, `image_metadata`** | `(workspace_id, item_id, is_active)`; `(item_id, variant_sort_order, created_at, id)` ✅ |
| `cost_library_item_variant_cost_entries` | `price_option_id`, `item_id`, `is_current`, `deleted_at` | — | `(price_option_id, deleted_at, is_current desc, pricing_date desc, created_at desc)` ✅ |
| `cost_library_item_versions` | `(workspace_id, item_id, version_number desc)` ✅ | — | covered |
| `cost_library_item_price_history` / `state_history` | `(workspace_id, item_id, effective_at desc)` ✅ | `new_snapshot jsonb` | covered |
| `cost_library_item_variant_attachments` | `item_id` | `metadata jsonb` | `item_idx (item_id)` only |

RLS helper `is_workspace_member` is `language sql security definer stable`: `select exists(select 1 from workspace_members where workspace_id = $1 and user_id = auth.uid())` (`20260518090000_…core_schema.sql:165-178`). Template nodes/rows policies wrap this in a per-row correlated `EXISTS (select 1 from estimate_templates …)` (`20260522091621_…templates.sql:583-620`).

---

## B. Data volume (LIVE, today)

Single active workspace (`0c0919ba…`):

- `cost_library_items`: **154** · `price_options`: 155 · `variant_cost_entries`: 155 · `versions`: 157 · `price_history`: 156 · `state_history`: 156 · `variant_attachments`: 0
- `estimate_templates`: **3** · `template_nodes`: 10 · `template_row_items`: 15
- `component_category_nodes`: **685** (global) · `library_folders`: **685** (1:1 mirror) · `suppliers`: 22 · `brands`: 29

**Verdict:** current slowness is **architecture, not volume.** 154 items is tiny. The findings are round-trip count, over-fetch, and scaling cliffs that already add latency and worsen as items/workspaces grow.

---

## C. Findings

### F8 🟠 — Components tab: 4-hop serial waterfall, 10 unbounded queries
`loadCurrentWorkspaceComponentRowsLibrary` (`:515-730`) runs three sequential `Promise.all` *waves* with a blocking step between: wave 1 = categories + suppliers + brands + items (`:531-552`); then **`ensureWorkspaceLibraryFolders`** (`:561`, a round-trip, sometimes a bulk INSERT); wave 2 = price_options + cost_entries (`:587`); wave 3 = versions + price_history + state_history + attachments (`:615`). The waves are data-dependent (`itemIds` from wave 1 feed waves 2/3) so they can't be flattened client-side. **Fix:** collapse into one `get_component_library_graph(workspace_id)` RPC returning items with nested `json_agg` of price-options/cost-entries/history — one round-trip instead of four. (See §D.)

### F9 🟠 — `select("*")` over-fetch
Items (`:546`), price_options (`:591`), cost_entries/versions/history/attachments (`:597-640`) all `select("*")`. This ships large `metadata` JSONB (imageUrl, seed_key, categoryPath array, …), `variant_metadata`/`image_metadata` on price options, plus columns the UI never reads (`labor_cost`, `supplementary_cost`, `created_by`). Pure bandwidth/PostgREST-serialization waste, linear in row count. **Fix:** explicit column lists per query; never spread raw `metadata` to the client.

### F10 🟠 — 685-row folder mirror provisioned on the read path
`ensureWorkspaceLibraryFolders` (`:330-379`) stages one folder per category node and bulk-inserts; live data confirms 685 folders == 685 category nodes. It runs inside the components load (`:561`) and always does a `fetchLibraryFolders` read regardless. A write hidden inside a "GET", and 685 rows fetched every load. **Fix:** seed folders out-of-band (trigger on workspace create / migration), and/or derive taxonomy folders virtually from `component_category_nodes` instead of materializing 685 rows per workspace.

### F11 🟠 — Global taxonomy fetched in full + JS tree-build every load
`component_category_nodes select("*")` (`:532`), then `buildComponentCategoryTreeFromRows` + `flattenCategoryTree` in JS (`:560,704`). 685 static rows + JS tree-build per request. **Fix:** cache the taxonomy tree (global + version-stamped via `componentCategoryTaxonomyVersion`) via `unstable_cache`/route cache or a materialized JSON.

### F12 🟠 — Missing index for Overview recents/last-update
`getLibraryOverview` runs `recentComponents` (order by `updated_at desc limit 6`, `:900`) and `lastLibraryUpdate` (`:930`), both filtered by `workspace_id`. **No `(workspace_id, updated_at)` index** exists. Fine at 154 rows; textbook scaling cliff. **Fix:** `create index … on cost_library_items (workspace_id, updated_at desc)` (optionally partial `where lifecycle_state <> 'archived'`).

### F13 🟠 — `getLibraryOverview` = 11 parallel + up to 4 follow-up queries
`:865-937` issues 11 queries in one `Promise.all` (4 `count head`, recents, template recents, template categories, stale count, missing-brand count, last-update, discontinued ids), then up to 2 more waves (`:971`, `:1019`). **Six** of them re-scan `cost_library_items` with the same `workspace_id` filter. **Fix:** one `get_library_overview(workspace_id)` RPC computing the stats as a single aggregate pass (`count(*) filter (...)`, `max(updated_at)`, lateral for recents). (See §D.)

### F14 🟡 — JS-side aggregation that belongs in SQL
`templateCount`/`templateGroupCount`/`templateCategories` fetch all template `category` rows then count/dedupe in JS (`:908-911,1004-1012`); `discontinuedInUseCount` pulls all ids then two `.in()` lookups + JS `Set` dedupe (`:1016-1041`); template totals folded in JS (`:441-509`). **Fix:** push counts/sums/distincts into the aggregation RPC.

### F15 🟠 — RLS helpers use bare `auth.uid()` (no initplan caching)
`is_workspace_member` (core schema `:176`) and `is_workspace_admin` (`:191`) call `auth.uid()` directly. 142 bare `auth.uid()` occurrences across migrations; only 3 unrelated migrations use the `(select auth.uid())` initplan form. This is exactly the Supabase `auth_rls_initplan` lint: bare `auth.uid()` is re-evaluated per row instead of once per query. On the 154-item / 685-folder / 685-node scans this multiplies the auth lookup. **Fix:** wrap as `(select auth.uid())` inside the helpers — one-line change, repo-wide benefit. **Highest blast radius DB change — gated on before/after access-decision proof (`08 Q4`).**

### F16 🟠 — No pagination anywhere (scaling cliff)
Items (`:545-552`), all price/version/history queries (`:587-640`), templates (`:739-744`), template nodes/rows (`:753-764`) — **none** has `.limit()`/`.range()`. At 154 items OK; at 1k–10k items × (price options + cost entries + versions + history + attachments) this is an unbounded fetch, and history tables grow forever. **Fix:** server-side `range` + virtualize the components list; load the per-item history/version graph lazily per inspected item (the `includeDetailGraph:false` lite path at `:529,1134` already proves the pattern — apply it to the management surface).

### F28 🟡 — Template node/row RLS does a per-row correlated EXISTS join
Nodes & row_items policies (`templates migration :588-620`) use `using (exists (select 1 from estimate_templates where id = … and is_workspace_member(workspace_id)))`, whereas `cost_library_items` filters `workspace_id` directly. Cheap at 10–15 rows; compounds with F15. **Fix:** denormalize `workspace_id` onto `estimate_template_nodes`/`row_items` (already FK-bound) so the policy is a direct `is_workspace_member(workspace_id)`.

---

## D. Proposed aggregation RPC sketches (address F8, F13, F14)

**Contract guard:** the overview RPC must return the current `LibraryOverview` shape, not a partial dashboard summary. The required keys are: `componentCount`, `categoryCount`, `supplierCount`, `brandCount`, `templateCount`, `templateGroupCount`, `templateCategories`, `recentComponents`, `recentTemplates`, and nested `health` with `staleComponentCount`, `discontinuedInUseCount`, `missingBrandCount`, and `lastLibraryUpdate`. The implementation in `07 T10` must golden-master the RPC output against today's `getLibraryOverview()` result before cutover.

```sql
-- Overview: one round-trip, one aggregate pass over cost_library_items.
create or replace function public.get_library_overview(p_workspace_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with item_stats as (
    select
      count(*) filter (where lifecycle_state <> 'archived')                          as component_count,
      count(distinct category) filter (where lifecycle_state <> 'archived')           as category_count,
      count(distinct supplier) filter (where lifecycle_state <> 'archived'
                         and coalesce(nullif(supplier,''), null) is not null)         as supplier_count,
      count(distinct brand) filter (where lifecycle_state <> 'archived'
                         and coalesce(nullif(brand,''), null) is not null)            as brand_count,
      count(*) filter (where lifecycle_state <> 'archived'
                         and pricing_date is not null
                         and pricing_date < current_date - 90)                       as stale_count,
      count(*) filter (where lifecycle_state <> 'archived' and brand_id is null
                         and coalesce(nullif(brand,''), null) is null)               as missing_brand_count,
      max(updated_at)                                                                as last_update
    from cost_library_items where workspace_id = p_workspace_id
  ),
  tmpl as (
    select count(*) as template_count,
           count(distinct category) as group_count,
           array_agg(distinct category order by category) as categories
    from estimate_templates where workspace_id = p_workspace_id
  ),
  health_stats as (
    -- Replace this sketch placeholder with the SQL equivalent of the current JS Set logic.
    select null::bigint as discontinued_in_use_count
  )
  select jsonb_build_object(
    'componentCount',    (select component_count    from item_stats),
    'categoryCount',     (select category_count     from item_stats),
    'supplierCount',     (select supplier_count     from item_stats),
    'brandCount',        (select brand_count        from item_stats),
    'templateCount',     (select template_count     from tmpl),
    'templateGroupCount',(select group_count        from tmpl),
    'templateCategories',(select categories         from tmpl),
    'recentComponents',  (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select id,name,category,supplier,unit,unit_cost,thumbnail_path,lifecycle_state,updated_at
        from cost_library_items
        where workspace_id = p_workspace_id and lifecycle_state <> 'archived'
        order by updated_at desc limit 6) r),
    'recentTemplates',   (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        -- Must include the summarized fields expected by LibraryOverviewTemplate:
        -- id, name, category, updatedAt, groupCount, areaCount, rowCount, total.
        select id,name,category,updated_at as "updatedAt"
        from estimate_templates
        where workspace_id = p_workspace_id
        order by updated_at desc limit 5) t),
	    'health',            jsonb_build_object(
	        'staleComponentCount',     (select stale_count         from item_stats),
	        'discontinuedInUseCount',  (select discontinued_in_use_count from health_stats),
	        'missingBrandCount',       (select missing_brand_count from item_stats),
	        'lastLibraryUpdate',       (select last_update         from item_stats))
  );
$$;

create index if not exists cost_library_items_workspace_updated_idx
  on cost_library_items (workspace_id, updated_at desc);  -- F12
```

A parallel `get_component_library_graph(p_workspace_id)` RPC (items + nested `json_agg` of price options / cost entries) collapses the F8 4-hop waterfall into one round-trip. Both RPCs are `security definer set search_path = public` and **must** filter `workspace_id` from the resolved caller (not a client-supplied id) so RLS-equivalent scoping is preserved (`05` cross-checks this).

---

## E. What's already good / not a problem

- **Templates are well-modeled and well-indexed** — every order-by has a matching composite index; `getEstimateTemplateById` (`:1068`) is tight (1 row + 2 parallel children, UUID-validated, RLS-scoped).
- **The lite-loader split is genuinely good** — `includeDetailGraph:false` (`:529,1134`) already skips the 4 history/attachment queries for the in-estimate panel; the right pattern, just not yet applied to the management tab (F16).
- **Price/version/history tables are correctly indexed** for the loader's filters/sorts.
- **Count queries use `head:true` + `count:exact`** (no row bodies) for the 4 header counts.
- **Cross-workspace isolation is sound** — every workspace table RLS-protected; `getEstimateTemplateById` 404s stale cross-workspace ids; the global taxonomy `using(true)` is appropriate.
- **Volume is not the bottleneck today** — fixing round-trips, over-fetch, and initplan caching moves felt latency; index + pagination + RPC are insurance against the cliff.
