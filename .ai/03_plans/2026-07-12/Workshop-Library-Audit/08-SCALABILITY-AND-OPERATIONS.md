# 08 — Scalability & Operations (Search, Pagination, Observability, i18n, Cache, Bulk, Export)

> Startup-scalability + operational audit of `/workshop/library`. Source read
> 2026-07-12; every claim cited `file:line`. Workspace caps: 10 000 components,
> 2 000 templates (`actions.ts:378-379`).

## 1. Search at scale — LIKE-based, no FTS5, won't scale past ~5-10k

### Architecture
Confirmed FTS5 absent: `grep -rli "fts5|CREATE VIRTUAL TABLE" migrations/` = empty. **D1 (SQLite at the edge) does not expose FTS5 to binding callers** the way Postgres exposes tsvector — so this isn't just "add an index," it's an architecture decision.

### Search paths
1. **Overview popover — `searchLibraryOverview`** (`actions.ts:2905-2944`): server-side, `LOWER(name) LIKE LOWER(?) OR LOWER(COALESCE(supplier,'')) LIKE LOWER(?) OR LOWER(COALESCE(brand,'')) LIKE LOWER(?)` with `%term%` (`:2922-2926`); template query `LOWER(name) LIKE LOWER(?)` (`:2938`); caps `LIMIT 6` (`:2928`) + `LIMIT 3` (`:2940`). Leading wildcard + `COALESCE` → **cannot use a B-tree index, forces full scan** per keystroke per workspace.
2. **In-manager / command-palette — `searchComponents`** (`helpers.ts:102-125`): client-side over loaded `items`; multi-field `.includes()` + scored (`:116-122`) + sorted (`:124`); `CommandPalette.tsx:71` `slice(0,10)`. O(n) over loaded dataset — bounded by 24 initial, but "Load all" at 10k scans 10k JS objects per keystroke.
3. **Template browse / in-sheet — `filterTemplatesByQuery`** (`templates.ts:169-172`): client-side `.filter()` linear over eagerly-loaded templates.

### BUG-OPS-01 [P2] — search won't scale past ~5-10k items
Perf budget (`27-performance-budget-and-regression-gates.md:92`) only budgets "Library search (filter 1 000 items) <300ms" — **no budget at the 10k cap**. Realistic options (priority order):
1. **App-level `search_tsv` column** (lowercased, space-joined `name|supplier|brand|category`) on `cost_library_items`, updated on write; query `search_tsv LIKE ?` (one column, no `COALESCE`, no OR) — removes ~3× scan cost, covering index usable.
2. **Trigram-style n-gram index table** (`bigram → item_id`) queried with `IN` — brings 10k search to tens of ms.
3. If/when migrating the library store off D1 to Postgres/Neon: `pg_trgm` GIN index on `(name, supplier, brand)` with `ILIKE` (the perf doc itself flags this needs "explicit product search use case approval" `:239`).
- Columns to index: `name` (weight A), `supplier`+`brand` (weight B), `category` (weight C). Ranking should prefer name-prefix matches (port the client scoring at `helpers.ts:116-122`). Highlight (`<mark>`) not currently rendered — add in `LibraryOverviewSearch.tsx`.

## 2. Pagination / unbounded reads

### BUG-OPS-02 [P1] — templates eager-load is a query bomb
`loadCurrentWorkspaceEstimateTemplatesAppPath` (`repository.ts:1291-1339`):
- `SELECT * FROM estimate_templates WHERE workspace_id = ? ORDER BY sort_order ASC, name ASC` (`:1300-1307`) — **no LIMIT**. Up to 2 000 rows.
- `SELECT * FROM estimate_template_nodes WHERE template_id IN (...)` (`:1313-1320`) — **no LIMIT**. Worst case 2 000 templates × ~50 nodes = **100 000 node rows** in one D1 query.
- `SELECT * FROM estimate_template_row_items WHERE template_id IN (...)` (`:1321-1328`) — **no LIMIT**. Worst case 2 000 × ~100 rows = **200 000 row-items** in one shot.
- Runs **eagerly on every cold load** of the Templates browse route (`page.tsx:11-13`) and on every cache miss / `loadCurrentWorkspaceEstimateTemplates` (`actions.ts:1237-1240`).

### Components "Load all" full-workspace scan (P2)
- Initial seed: `COMPONENTS_ROUTE_INITIAL_ITEM_LIMIT = 24` (`LibraryComponentsRoute.tsx:9`); bounded branch `LIMIT ?` (`repository.ts:404-414`). Good.
- "Load all": `onLoadAll: () => { void refetch(); }` (`LibraryPageClient.tsx:154-156`) → `loadCurrentWorkspaceComponentRowsLibrary()` (`actions.ts:1221-1224`) with no `itemLimit`.
- Unbounded path: `loadWorkspaceCostLibraryItemRows` enters the `for (offset ... LIMIT 1000 OFFSET ?)` loop (`repository.ts:419-432`) — **SELECT * of every non-archived `cost_library_items` row, paged 1000/page**.
- This drives `collectComponentLibraryWorkspaceRowsForItems` for price options + cost entries (`:1166-1189`) which itself loops `LIMIT 1000 OFFSET ?` over the **whole workspace** (not the item-id IN-list) and filters in JS (`:327-351`). At 10k items this is dozens of round trips with zero per-trip telemetry. (See first-pass PERF-01.)
- Detail graph (versions/price_history/state_history/attachments) correctly skipped (`includeDetailGraph:false` `:1199`). Good.

| Read | File:line | Worst-case rows | Lazy? |
|---|---|---|---|
| Components "Load all" items | `repository.ts:419-432` | 10 000 | paginated 1000/page, whole-ws |
| Components price options | `repository.ts:1166-1172` via `:339-350` | ~10k × variants | full-ws scan, JS filter |
| Components cost entries | `repository.ts:1182-1189` via `:339-350` | ~10k × history | full-ws scan, JS filter |
| Templates | `repository.ts:1300-1307` | 2 000 | **eager, no LIMIT** |
| Template nodes | `repository.ts:1313-1320` | ~100 000 | **eager, no LIMIT** |
| Template row items | `repository.ts:1321-1328` | ~200 000 | **eager, no LIMIT** |

## 3. Observability

### Route-level perf tracing — present on all 3 routes
- Components: `withPerfTraceRequest("workshop.library.components")` + nested `traced("library.components.rows")` / `traced("library.components.canManage")` (`LibraryComponentsRoute.tsx:30-39`). (Corrects the first-pass note that components wasn't traced — it IS.)
- Templates browse: `templates/page.tsx:11-13`. Template detail: `templates/[templateId]/page.tsx:17`.

### What's BLIND — the repository/actions layer
- `grep "withPerfTraceRequest|traced" src/lib/component-library/ src/lib/repositories/component-library-repository.ts src/app/api/component-library/` = **empty**. None of the 6-query waterfall in `loadCurrentWorkspaceComponentRowsLibraryAppPath` or the unbounded template SELECT are individually traced. Route-level trace measures the whole `Promise.all` — breakdown between items/price-options/cost-entries/categories/suppliers/brands/folders is invisible.

### BUG-OPS-03 [P2] — action errors lose context; some swallowed
- `throwActionError(userMessage, cause)` (`action-errors.ts:8-18`) calls `logAppError` with context `{ event, action, user_message }` only — **no workspaceId, no userId, no action name, no SQL, no input shape**.
- Several actions swallow errors: `loadComponentLibraryUserPreferences` catch → `return null` (`:537-539`); `saveComponentLibraryUserPreferences` → `{ ok:false, ignored:true }` (`:556-558`); telemetry recorder → `{ ok:false, ignored:true }` (`:516-518`).
- D1 batch failure (`runBatch` `:159-161`) throws generic `"Cloudflare D1 component library batch failed."` with underlying per-statement errors discarded — no logging, no context.

## 4. Internationalization / localization (Philippines-first startup)

### BUG-OPS-04 [P3] — currency hardcoded PHP in ~12 sites; no central constant, no multi-currency display
- `formatPeso` / `pesoFormatter` use `Intl.NumberFormat("en-PH", { currency:"PHP" })` (`repository.ts:474-476`; `helpers.ts:18-22`).
- Defaults: `currency ?? "PHP"` everywhere (`actions.ts:770,784,812`; `estimate-templates.ts:45`; `repository.ts:510,963`; `helpers.ts:229,357,641`). Schema stores `currency` per price option / cost entry (`actions.ts:1056,1100`) but **no currency picker in the library UI** (only free-text in `NewComponentForm.tsx:68`) and all rendering assumes PHP. A workspace that stored one row in USD renders it with a ₱ prefix. No multi-currency display conversion.

### BUG-OPS-05 [P3] — binary collation mis-sorts Filipino names (Ñ / Ng)
- `ORDER BY name ASC` / `ORDER BY category ASC, name ASC` (`repository.ts:398,426,712,1128,1136,1305`) uses D1/SQLite default **binary collation**, not Filipino (`fil-PH`) locale. Filipino uses the 28-letter alphabet (adds Ñ and the Ng digraph); binary collation mis-sorts accented names and treats "Ng" as a plain two-letter sequence. For a Philippines-first product catalog with Filipino category names this is a real correctness gap.

### Date locale (P3)
Preview surface uses `Intl.DateTimeFormat("en", ...)` (`component-library/index.tsx:381`) instead of `"en-PH"`. Acceptable for en-PH but inconsistent with the number formatter's `en-PH`.

## 5. Caching / revalidation — multi-user staleness

### Client (TanStack Query)
- Components: `staleTime: 5 * 60 * 1000` (5 min); no `gcTime`, no `refetchOnWindowFocus`, no `refetchInterval` (`LibraryPageClient.tsx:107-113`). `refetchOnMount: seedIsPartial ? false : true`.
- Templates: `staleTime: 5 * 60 * 1000`; same gaps (`TemplatesBrowsePageClient.tsx:79-84`).

### Server revalidation
- `revalidateLibraryRoutes()` → `/workshop/library`, `/workshop/library/components` (`actions.ts:307-310`). `revalidateTemplateSurfaces()` → `/workshop/library`, `/workshop/library/templates` (`:171-174`). Mutations patch TanStack cache directly (`LibraryPageClient.tsx:117-135`; `TemplatesBrowsePageClient.tsx:86-97`) rather than `router.refresh()` — good for perceived perf.

### BUG-OPS-06 [P2] — multi-user staleness (shared workspace)
This is a **shared-workspace** product (multi-user is a stated use case). With 5-min `staleTime`, **no `refetchOnWindowFocus`**, **no `refetchInterval`**, and **no realtime/invalidate-on-other-writer signal** (no Pusher/Supabase Realtime/polling), User B's library view is stale for up to 5 min after User A edits/archives/deletes — even if User B refocuses the tab. The cache patching (`setQueryData`) is local-only; User A's optimistic patch doesn't propagate to User B. After 5 min, User B's next action triggers a refetch that fetches the **full unbounded dataset** (§2), so the stale window is also a performance cliff. D1 read-after-write consistency at the edge is an additional concern.

## 6. Bulk operations safety

| Op | Cap | Atomic? | On failure |
|---|---|---|---|
| Bulk archive (`:1705-1764`) | 500 ids (`:1706`) | Yes, single UPDATE (`:1739`) | Hash-guarded (`expectedPreviewHash` `:1721-1731`); error propagates **unlogged** |
| Folder delete (`:1835-1859`) | **none** | Yes, via D1 `batch()` (`:1843-1856`) | Components orphaned, not deleted (safe) — but a one-click 10k-row UPDATE with no confirmation hash |
| Template create | n/a | No native txn; compensating `DELETE` (`:2369`) | Orphan risk if DELETE fails |
| Template duplicate | n/a | No native txn; compensating `DELETE` (`:2665+`) | Orphan risk if DELETE fails |

### BUG-OPS-07 [P2] — folder delete has no size cap / no preview hash
Unlike bulk archive (500-id cap + hash gate), folder delete is a one-click operation with no confirmation. Semantics are safe-by-orphan (components are unassigned, not deleted), but a 10k-row UPDATE with no preview is an ops risk. Add a size check + confirmation for large folders.

## 7. Data export / portability

### BUG-OPS-08 [P1] — no live export/import; marketing promises exports the library doesn't deliver
- Dead helpers confirmed: `exportLibraryItemsToJson` (`helpers.ts:463`), `exportLibraryItemsToCsv` (`:487`), `parseLibraryCsv` (`:409`), `parseLibraryJson` (`:433`) — zero callers.
- Telemetry events `bulk_export` + `export_large_export_logged` are defined (`library-telemetry.ts:26,41`) but **never emitted**.
- No CSV/XLSX/JSON download UI in the library surface (`grep download|xlsx|csv|file.*input` = only the dead `parseLibraryCsv` reference).
- **The pricing page advertises "never metered on estimating, exports, or BOQ lines"** (`src/app/pricing/page.tsx:14`) and the perf budget references "XLSX export trigger (500 rows) <500ms" (`27-performance-budget-and-regression-gates.md:95`). So **marketing promises exports the library surface does not deliver**.
- For a Philippines-first startup expecting first users: no live way to export/import the component library or templates. GDPR art. 20 data portability + basic "I want my data"/"I want to migrate" use cases are unserved. Either delete the dead code or wire it up before charging users.

## TOP SCALABILITY / OPS RISKS (summary)
- **BUG-OPS-02 [P1]** templates eager-load query bomb (~300k rows worst case)
- **BUG-OPS-08 [P1]** no live export/import; pricing page overpromises
- **BUG-OPS-01 [P2]** LIKE-based search won't scale past ~5-10k (no FTS5 on D1)
- **BUG-OPS-03 [P2]** action errors lose context; some swallowed
- **BUG-OPS-06 [P2]** multi-user staleness (5-min window, no refetch/realtime)
- **BUG-OPS-07 [P2]** folder delete: no cap / no hash
- **BUG-OPS-04/05 [P3]** currency hardcoded / binary collation mis-sorts Filipino

## Key file references
- Search: `actions.ts:2905-2944`; `helpers.ts:102-125`; `templates.ts:169-172`
- Unbounded reads: `repository.ts:327-351,419-432,1166-1189,1291-1328`
- Perf tracing: `LibraryComponentsRoute.tsx:30-39`; gaps in `src/lib/component-library/`
- Errors: `action-errors.ts:8-18`; swallows at `actions.ts:516,537,556`
- i18n: `repository.ts:474-476`; `helpers.ts:18-22`; `component-library/index.tsx:381`
- Cache: `LibraryPageClient.tsx:107-113`; `TemplatesBrowsePageClient.tsx:79-84`
- Export dead code: `helpers.ts:409,433,463,487`; marketing `src/app/pricing/page.tsx:14`
- Perf budget: `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:48,92,95,239`
