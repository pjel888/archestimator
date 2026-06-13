# 01 — Current-State Audit

**What this is:** A verified account of how the Templates feature actually works today — surfaces, data sources, state, routes, and the recently-shipped "Projects Auto-Added To Templates" capability — grounded in live code, the live database, and a live authenticated browser session.

**One-line truth:** Custom templates are fully persisted in Supabase and work; project-derived sources are virtual read-through queries that **browse but do not function end-to-end** in the live environment (the outline loader 500s and the insert path was never built). See [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md).

---

## 1. Feature shape (what the user sees)

The Templates feature has **three surfaces** plus one cross-cutting capability:

| # | Surface | Route / entry | Owner component |
|---|---------|---------------|-----------------|
| A | **Route browse / gallery** | `/workshop/library/templates` | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` |
| B | **Template editor** | `/workshop/library/templates/[templateId]` | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` |
| C | **In-estimate Templates panel** | right sidebar of `/workshop/projects/[projectId]/estimates/[nodeId]` | `src/components/workshop/component-library/index.tsx` (`EstimateRightSidebar`) → `tree/TemplatesTree.tsx` |
| — | **Projects Auto-Added (virtual sources)** | appears inside A and C as a "Projects" section | `src/lib/reusable-sources/actions.ts` + `templates-browse/project-source-browse-tree.tsx` |

Two source classes are unified at the UI layer:
- **Custom Templates** — persisted, workspace-scoped, fully editable.
- **Project-derived sources** — *virtual/read-through* live queries over `projects → estimates → tabs → groups/areas`. Decision D-11 (origin plan): never persisted into template tables unless the user explicitly "saves as template".

---

## 2. Live browser walkthrough (authenticated, dev server `localhost:3000`)

Observed against the user's authenticated Chrome session on the estimate page `…/projects/22222222-2222-4222-8222-222222222222/estimates/5918520a-cf63-4605-a1e1-ac0277daccaa` (project "Lewis Residence"):

1. **Estimate page renders** with a tab strip showing **"Main / Default"** (a *single synthetic default tab* — see §6, the real `estimate_tabs` table is not live).
2. **In-estimate Templates panel** (Components | **Templates** tabs) shows: source filters **All sources / Custom templates / Project sources**, scope filters **All projects / Current project only**, a **"Refresh project sources"** action, then two sections:
   - **Custom Templates** with ₱ totals: Exterior + Site → Roof Deck Lounge (₱97,400); Residential Rooms → Condo Fit-Out Starter (₱71,883), Powder Rooms (₱61,150).
   - **Projects**: Harbour Box, Lewis Residence, Lighting Project Proposal, Recipes, Tropical House (collapsed; lazy on expand).
3. **Expand a project** ("Lewis Residence") → **one server action** (`POST` to the route, Next-Action) → returns its estimates (ES-001, ES-002). Preview dock shows **"LIVE SOURCE / READ-THROUGH SOURCE"** badges and a **SOURCE OUTLINE**.
4. **Expand an estimate** (ES-001) → **server action returns HTTP 500**; the panel shows: *"Couldn't load estimate outline. {code: …, details: Null, hint: …, message: …}"*. Expanding ES-002 also 500s → **general failure**, not data-specific. (Root cause in §6 and 07.)
5. **Route browse** `/workshop/library/templates`: gallery lists only the **3 custom templates** with Open / Insert into estimate; clicking a **Project node does nothing** (gallery unchanged) and **right-click shows no context menu** → project sources are **inert** on this surface.
6. The right panel showed a **~3–6s skeleton** on initial load before resolving.

The currently-open estimate ("Lewis Residence - 001") also appears as a project source **of itself** (a self-reference case).

---

## 3. Data sources per surface (verified)

| Surface | Origin of truth | Delivery to client | Local mirror | Zustand | TanStack Query |
|---------|-----------------|--------------------|--------------|---------|----------------|
| A. Route browse | Supabase `estimate_templates*` via `getCurrentWorkspaceEstimateTemplates()` (`component-library-repository.ts:762`) + virtual sources via `listReusableProjectSources()` (`reusable-sources/actions.ts:56`) | Server Component props (`app/workshop/library/templates/page.tsx:13-16`) | `useState`, re-seeded render-time (`TemplatesBrowseManager.tsx:591-623`) | No | No |
| B. Template editor | Supabase `getEstimateTemplateById()` (`component-library-repository.ts:1045`) | Server Component prop (`[templateId]/page.tsx`) | optimistic `useState` (`use-template-editor.ts:48`) | No | **Yes** — dock dataset only, key `["workspace-component-library"]`, `staleTime` 5m (`TemplateEditorClient.tsx:121-125`) |
| C. In-estimate panel | Supabase via `loadCurrentWorkspaceComponentLibrary()` → `.templates` | TanStack `["workspace-component-library"]` → prop (`EstimateSheetContent.tsx:722-727,1871`) | `templateList` `useState` seeded **once**, **no prop-sync** (`component-library/index.tsx:704`) | No | Yes (shared key) |
| D. Project-derived sources | **Virtual** — live read-through of `estimates`/`estimate_nodes`/`estimate_row_items`/`estimate_tabs` via `reusable-sources/actions.ts` | top level via SC prop; deeper levels lazy via server actions merged into local state | `useState` merge maps | No | No (bare server-action promises) |

**Answer to the owner's question — "local store, or all from Supabase?"** All template *data* originates in Supabase. There is **no Zustand store for templates** (`src/stores/estimate-ui-store.ts:32` holds only UI ephemera — selection/focus/expansion/drag — no template fields). The "local" part is ordinary component-level `useState` mirroring server data, plus exactly **one** TanStack query (`["workspace-component-library"]`). Project sources are live queries, never persisted. Full detail and the cross-surface coherence consequences are in [04_DATA_FETCHING_AND_STATE_AUDIT.md](04_DATA_FETCHING_AND_STATE_AUDIT.md).

---

## 4. Persisted schema (custom templates) — LIVE

Migration `supabase/migrations/20260522091621_component_library_templates.sql` (applied live):

- `estimate_templates` (`:4-15`) — workspace-scoped root (`workspace_id` FK→workspaces CASCADE, name, description, category, sort_order, metadata, created_by, timestamps).
- `estimate_template_nodes` (`:17-33`) — tree of groups/areas; composite FK `(template_id, parent_id)→(template_id, id)` keeps children in-template; `kind in ('group','area')`.
- `estimate_template_row_items` (`:35-60`) — component rows; composite FK keeps rows in-template; CHECKs `quantity/unit_cost/misc_cost >= 0`.
- Indexes on hot paths (`:62-67`); `updated_at` triggers (`:69-75`); tree-validation trigger `validate_estimate_template_tree` (`:77-153`); area-only-row trigger (`:180-205`).
- Insert RPC `insert_estimate_template_into_estimate_with_history` (SECURITY DEFINER) copies a template into an estimate.

RLS: one "members can manage…" policy per table, gated by `is_workspace_member(workspace_id)` — verified live and sound for workspace-shared assets. Detail in [05_DATABASE_RLS_SECURITY_AUDIT.md](05_DATABASE_RLS_SECURITY_AUDIT.md).

**There is no table for project-derived sources** (correct — they are virtual).

---

## 5. Key flows

### 5.1 Insert a custom template into an estimate (works)
`InsertIntoEstimatePicker` → `resolveEstimateTemplateInsertTarget()` (first root group) → `insertEstimateTemplateIntoEstimate()` (`src/lib/estimates/actions.ts:2157`) → RPC `insert_estimate_template_into_estimate_with_history` → server re-reads template → writes copies into `estimate_nodes`/`estimate_row_items` with provenance metadata → returns refreshed tree. No optimistic update; modal waits for the server. The RPC re-reads the source server-side, so this path is staleness-safe.

### 5.2 Browse a project-derived source (partially broken)
Expand project → `listReusableProjectEstimateSources()` (`reusable-sources/actions.ts:70`) → estimates list (works). Expand estimate → `getReusableEstimateOutline()` (`:190`) → `getEstimateTabs()` + `getEstimateTabTree()` → **500 in the live DB** (§6).

### 5.3 Insert a project-derived source into an estimate (NOT IMPLEMENTED)
There is **no** `insert_estimate_subtree_into_estimate_with_history` RPC, **no** `insertProjectSourceIntoEstimate` action, the `onInsertProjectSource` prop is **never supplied** (`component-library/index.tsx:1368` consumer; zero suppliers), and the project-source drag payload `readProjectSourceDragPayload` has **no consumer**. The "Add to estimate" menu item is disabled with `disabledReason` = "Project source insertion is not wired in this surface yet" (`tree/TemplatesTree.tsx:819`). Full evidence in [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md).

### 5.4 Save a project-derived source AS a custom template (path exists)
`createEstimateTemplateFromEstimateNode` (`src/lib/component-library/actions.ts:672`) reads the source subtree on the RLS user client and persists a real `estimate_templates` row; the standard template-insert path can then be used. This is the only route by which project content reaches an estimate today (template-first), and only via the editor/browse, not as a one-step project-source insert.

---

## 6. The critical reality: `estimate_tabs` is NOT applied to the live database

`list_migrations` (live, project `ebxxqidacheyapmmzavr`) ends at **`20260606095935_legal_terms_acceptance`**. The migration `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` exists in the repo but is **not applied** — its own header says *"Local-only migration until the linked Supabase apply is owner-authorized"* (`:2`). Live reads confirm `public.estimate_tabs` and `estimate_nodes.estimate_tab_id` **do not exist**.

Consequences (verified):
- The estimate editor **still works** because `getProjectEstimateTreeByEstimate`/`getProjectEstimateTreeByNode` **catch** the missing-relation error via `isEstimateTabsSchemaMissing(...)` (`workspace-repository.ts:1824, 1846, 1866, 1917`) and fall back to a legacy single-tab loader — rendering the synthetic "Main" tab seen in the browser.
- The reusable-source outline loaders **do not have that fallback**. `getEstimateTabs` (`:1691`, `throw` at `:1703, :1713`) and `getEstimateTabTree` (`:1731`, `throw` at `:1748, :1759, :1773, :1786`) query `estimate_tabs` and rethrow the raw Postgres `42P01` ("relation does not exist", `details: null`) — producing the live **500** observed in §2.4 and the leaked error banner.
- The `asEstimateTabsReadClient` cast (`:1573-1577`) is a "temporary compatibility boundary" that assumes the table exists post-apply.

This single fact — an **unapplied migration plus an asymmetric fallback** — is the root of the headline defect. See [07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) §1 and the fix in [08_SOLUTIONS_AND_OPTIMIZATIONS.md](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U1.

---

## 7. Routes & components inventory

| Concern | Files |
|---------|-------|
| Browse route | `src/app/workshop/library/templates/page.tsx`, `loading.tsx`, `error.tsx` |
| Browse client | `templates-browse/TemplatesBrowsePageClient.tsx` (dynamic import), `TemplatesBrowseManager.tsx`, `TemplateGallery.tsx`, `TemplatePreviewDock.tsx`, `project-source-browse-tree.tsx`, `InsertIntoEstimatePicker.tsx` |
| Editor route | `src/app/workshop/library/templates/[templateId]/page.tsx`, `loading.tsx`, `error.tsx` |
| Editor client | `template-editor/TemplateEditorClient.tsx`, `TemplateEditorSheet.tsx`, `TemplateStructureTree.tsx`, `use-template-editor.ts`, `template-editor-model.ts` |
| In-estimate panel | `component-library/index.tsx` (`EstimateRightSidebar:656`, `ProjectSourcePreviewPanel:382`), `tree/TemplatesTree.tsx`, `NewTemplateModal.tsx`, `templates.ts` |
| Server actions | `lib/component-library/actions.ts`, `template-editor-actions.ts`, `lib/reusable-sources/actions.ts`, `lib/estimates/actions.ts` (insert) |
| Repositories | `lib/repositories/component-library-repository.ts`, `lib/repositories/workspace-repository.ts` |
| Types | `lib/component-library/estimate-templates.ts`, `lib/reusable-sources/types.ts` |
| Schema | `supabase/migrations/20260522091621_component_library_templates.sql` (live), `…/20260612094734_estimate_tabs_foundation.sql` (local-only) |
| Tests | `tests/vitest/template-*.test.tsx`, `reusable-sources-actions.test.ts`, `reusable-source-drag.test.ts`, `component-library-templates-*.test.ts`, `estimate-tab-strip.test.tsx`, `estimate-tabs-*.test.ts`, `proposal-*.test.ts`; `e2e/workshop-template-insert-smoke.spec.ts`, `e2e/estimate-tabs.spec.ts`; `scripts/prove-estimate-tabs-postgres.mjs` |

---

## 8. Terminology / "sheet → tab" rebrand status

The user-facing rebrand is clean on the Templates surfaces: every remaining `sheet` occurrence is in comments, `data-*` attributes, import paths (`estimate-sheet/…`), or the intentional keep-list (Excel "worksheet" vocabulary, the `Sheet` overlay primitive, construction-material strings). No user-visible "sheet" residue was found in the template components. (Verified by grep + the UX lane.)

---

## Evidence used

- Code: `src/lib/reusable-sources/actions.ts`, `src/lib/repositories/workspace-repository.ts` (`asEstimateTabsReadClient:1573`, `isEstimateTabsSchemaMissing:1588`, `getEstimateTabs:1691`, `getEstimateTabTree:1731`, fallbacks `:1824/1846/1866/1917`), `src/lib/repositories/component-library-repository.ts`, `src/components/workshop/component-library/index.tsx` (`:704, :1368`), `tree/TemplatesTree.tsx:819`, `src/app/workshop/library/templates/page.tsx`, `src/stores/estimate-ui-store.ts:32`.
- Migrations: `20260522091621_component_library_templates.sql` (live), `20260612094734_estimate_tabs_foundation.sql` (local-only).
- Live DB: `list_migrations` (ends `20260606095935`), `pg_class` confirming `estimate_tabs` absent (project `ebxxqidacheyapmmzavr`, read-only).
- Live browser: authenticated session, estimate page + `/workshop/library/templates`, network (server-action POSTs: 200 on project expand, 500 on estimate outline) and DOM.

## Truth & integrity

- **VERIFIED:** all data-source mappings; no-Zustand-for-templates; one TanStack key; `estimate_tabs` not live; the fallback asymmetry; the live 500 (reproduced twice); route-browse inert project sources; the unbuilt insert path.
- **ASSUMPTION / manual-proof-pending:** exact Postgres error code for the 500 is inferred as `42P01` from the error shape (`details: null`) + the confirmed missing table; a server-log capture would confirm the code string. Responsive behaviour below `lg` was not exercised.
