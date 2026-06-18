# 01 — Current Query & Round-Trip Inventory

Anchored to `src/app/workshop/page.tsx`, `src/lib/repositories/workspace-repository.ts`, `src/lib/repositories/component-library-repository.ts`, `src/lib/auth/session.ts`. Line ranges are approximate (cite by function name; the repo shifts). All five entry functions run concurrently under the top-level `Promise.all` in `page.tsx`; **wall-clock is set by the slowest branch**, which is `getWorkshopHomebaseData`.

## Entry point

`src/app/workshop/page.tsx` → `Promise.all([ getWorkshopHomebaseData(), requireCurrentUserContext(), ensureDefaultWorkspace(), listMainSidebarFavoriteProjects(), loadDashboardLibrarySpotlight() ])`.

> A "wave" = a set of queries that run concurrently. A new wave begins when a query depends on a prior wave's result. Latency scales with **wave count**, not query count.

## Branch A — `getWorkshopHomebaseData` (the critical path)

`workspace-repository.ts`, `export async function getWorkshopHomebaseData` (~L1050). **NOT** `React.cache`-wrapped.

| Wave | Queries | Depends on | Notes |
|---|---|---|---|
| H1 (parallel ×6) | `project_favorites`, `estimate_favorites`, `projects` (recent, limit 12), `project_members`, `estimate_sheet_members`, `workspace_members` | workspace id | Good — one round-trip. |
| H2 (conditional) | `projects WHERE id IN favoriteProjectIds` | H1 favorites | **Same columns as H1 projects** (DUP-projects). |
| H3 (conditional) | `estimates WHERE project_id IN projectIds` (recent) | H1/H2 project ids | — |
| H4 (serial) | `estimates WHERE id IN favoriteEstimateIds` | H1 favorites | **Same table as H3** (DUP-estimates) — issued *after* H3. |
| H5 (conditional) | `projects WHERE id IN missingProjectIds` | H3 estimates | **Third** `projects` read (DUP-projects). |
| H6 | `readOptionalProjectPublications` → `project_publications IN projectIds` | project ids | Independent of H7/H8. |
| H7 | `readPendingCollaborationVisibilitySummary` → rpc + `collaboration_invitations` (2 parallel inside) | **role-filtered** project ids | Independent of H6/H8 for ordering. **Input set ≠ full project ids:** it is `projects.filter(p => canManageCollaborationRole(currentUserRole)).map(id)`. H6 uses ALL project ids; H7 uses the manage-able subset. Any merge/parallelize MUST preserve this filter (see `09-…` parity cases and `06-…` RISK-E). Best-effort (missing-table tolerant). |
| H8 (conditional) | `estimate_nodes WHERE estimate_id IN estimateIds` | estimate ids | Independent of H6/H7. |

**Critical finding:** H6, H7, H8 are **mutually independent** but currently run as three serial `await`s. H3+H4 are the same table. So the tail is ~6–7 sequential waves where ~3 are collapsible with **app code only**.

## Branch B — `listMainSidebarFavoriteProjects`

`workspace-repository.ts` (~L1263). `React.cache`-wrapped. Waves: `project_favorites` → (`projects` + `estimate_favorites` parallel) → `estimates`. ~2–3 waves. Overlaps Branch A's favorites reads (DUP across branches, but separate cache scopes).

## Branch C — `loadDashboardLibrarySpotlight` → `getLibraryOverview`

`component-library-repository.ts`, `getLibraryOverview` (~L892). **NOT** cached; best-effort (`try/catch → null`, never blocks).

| Wave | Queries | Dashboard uses? |
|---|---|---|
| L1 (parallel ×11) | `cost_library_items` count (active); `component_category_nodes` count; `component_suppliers` count; `component_brands` count; `cost_library_items` recent 6; `estimate_templates` recent 5 (`*`); `estimate_templates` categories; `cost_library_items` stale-pricing count; `cost_library_items` missing-brand count; `cost_library_items` last-updated; `cost_library_items` discontinued ids | Current dashboard render uses **componentCount**, **templateCount**, and **recent components**. `recentTemplates` exists in the spotlight type but is not currently rendered by `WorkshopDashboard`. |
| L2 (conditional) | `estimate_template_nodes` + `estimate_template_row_items` for recent template ids | Not needed for the current dashboard path unless the UI starts rendering template detail. |
| L3 (conditional) | `estimate_template_row_items` + `estimate_row_items` for discontinued ids | **No** — Library-page health only. |

**Over-fetch finding:** ~6 of the L1 queries (supplier/brand/category counts, stale-pricing, missing-brand, last-updated, discontinued) and the template-detail/row-count follow-up are discarded by the **current dashboard render** — they exist for the full Library page or for a future dashboard template surface. The current dashboard path needs only `componentCount`, `templateCount`, and `recentComponents[5]{id,name,category,updatedAt}`; the lean fetch may return `recentTemplates: []` to satisfy the existing type until the UI renders templates.

## Branches D/E — `requireCurrentUserContext`, `ensureDefaultWorkspace`

`session.ts` / `workspace-repository.ts`. Both `React.cache`-wrapped; mostly cache hits within a request. Small serial tails (auth → profile; workspace lookup → conditional membership/create). Low priority — they overlap Branch A and are short.

> **Load-bearing assumption (make explicit):** the "top-level `Promise.all` is already optimal, batching it buys ~0" conclusion holds *only because* `ensureDefaultWorkspace` and `requireCurrentUserContext` are `React.cache`-wrapped — `getWorkshopHomebaseData` itself calls `ensureDefaultWorkspace()` internally (~L1051) **and** the page calls it again in the same `Promise.all`; the cache dedupes them. If that `React.cache` is ever removed (or the dev-auth-bypass path changes cache semantics), the top-level branch pays for the workspace resolution twice and this premise must be re-evaluated.

## Duplication & redundancy summary

| ID | What | Where | Type |
|---|---|---|---|
| DUP-projects | `projects` read 3× (recent, favorites, missing) | Branch A H1/H2/H5 | Same columns, different id filters → collapsible to ≤2 waves. |
| DUP-estimates | `estimates` read 2× (by project, by id) | Branch A H3/H4 | Same table → one `(project_id IN … OR id IN …)`. |
| SERIAL-tail | H6/H7/H8 independent but serial | Branch A | Collapse to one `Promise.all` wave. |
| OVERFETCH-lib | ~6 L1 queries + L3 unused by dashboard | Branch C | Dashboard-lean fetch instead. |
| DOC-cache | `page.tsx` comment claims "all repository calls are React-cached" | `page.tsx` (~L116) | Inaccurate — `getWorkshopHomebaseData` + `getLibraryOverview` are **not** cached. Doc fix. |

## Correctness properties that must be preserved

- **RLS**: every read is workspace/user scoped today; any merged query or RPC must keep the membership-joined filter.
- **Error isolation / degrade-gracefully**: publications, pending-invites, and the whole library spotlight tolerate missing optional tables and degrade to null/0. Collapsing them into one unit must not turn one missing optional table into a total failure (see `06-…`).
- **Ordering & limits**: per-table `LIMIT 12` / `ORDER BY updated_at` semantics must survive any merge (merging two `LIMIT`ed reads into one changes which rows return — re-apply ordering/dedup client-side).
