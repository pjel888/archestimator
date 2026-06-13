# 04 — Data-Fetching & State Architecture Audit

**Lens:** Where template data lives, how it flows, query keys, invalidation, optimistic updates, staleness of read-through sources, and cross-surface cache coherence. Directly answers the owner's question.

---

## Direct answer: "local store, or all from Supabase?"

Both, by design, with a clean split — but **the three surfaces each keep an independent local mirror, so they are not automatically coherent after a mutation.**

- **All template *data* originates in Supabase** (`estimate_templates` / `estimate_template_nodes` / `estimate_template_row_items`, read through `component-library-repository.ts`).
- **There is no Zustand store for templates.** The only in-scope Zustand store, `useEstimateUiStore` (`src/stores/estimate-ui-store.ts:32`), holds UI ephemera (selection, focus, expansion, drag) with **zero** template fields (verified `:6-23`).
- The "local" part is ordinary component-level `useState` mirroring server data, plus **one** TanStack query (`["workspace-component-library"]`).
- **Project-derived sources** are virtual live read-through queries over the estimate tables — never persisted as templates unless explicitly saved.

---

## Local store vs Supabase — definitive table

| Surface | Origin of truth | Delivery | Local mirror? | Zustand? | TanStack? |
|---|---|---|---|---|---|
| Route browse / gallery | Supabase `estimate_templates*` via `getCurrentWorkspaceEstimateTemplates()` (`component-library-repository.ts:762`) + virtual via `listReusableProjectSources()` (`reusable-sources/actions.ts:56`) | SC props (`templates/page.tsx:13-16`) | Yes — re-seeded render-time `if (source !== templates)` (`TemplatesBrowseManager.tsx:613-623`) | No | No |
| Template editor | Supabase `getEstimateTemplateById()` (`component-library-repository.ts:1045`) | SC prop (`[templateId]/page.tsx:16-19`) | Yes — optimistic, re-seeded render-time (`use-template-editor.ts:52-55`) | No | **Yes** — dock dataset only, key `["workspace-component-library"]`, `staleTime 5m` (`TemplateEditorClient.tsx:121-125`) |
| In-estimate panel | Supabase via `loadCurrentWorkspaceComponentLibrary()` → `.templates` | TanStack `["workspace-component-library"]` → prop (`EstimateSheetContent.tsx:722-727,1871`) | Yes — `templateList` seeded **once**, **no prop-sync** (`component-library/index.tsx:704`) | No | Yes (shared key) |
| Project-derived sources | **Virtual** live read-through via `reusable-sources/actions.ts` | top level via SC prop; deeper levels lazy via server actions merged into local state (`TemplatesBrowseManager.tsx:640-704`; `index.tsx:1735,1769`) | Yes — merge maps | No | No (bare promises) |

---

**Loading consequence (owner question — "store or direct from DB?"):** the in-estimate panel's project-derived sources are fetched **directly from the database via server actions into local React state — no client cache/store, no loaded-id tracking** (only the component-library dataset is TanStack-cached; the project-source lazy loads are bare promises). So **every tree expand re-hits the DB and shows a "Loading…" state** — nothing serves instant data. The fix is a keyed client cache + prefetch-on-hover + skeleton-in-place so expansion is instant and spinner-free, and errors surface via the existing toast (no layout shift) — see [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U6/U23/U1b, [03](03_PERFORMANCE_AUDIT.md) PERF-3, [17](17_FRONTEND_BUILD_SPEC.md) A4/B3.

---

## Query keys & invalidation map

| Query key | Where | staleTime | Caches | Invalidated by |
|---|---|---|---|---|
| `["workspace-component-library"]` | `TemplateEditorClient.tsx:121`; `EstimateSheetContent.tsx:723` | 5m | full `ComponentLibraryDataset` (incl. templates) | `queryClient.invalidateQueries` on `onLibraryDataChanged` (`TemplateEditorClient.tsx:127-129`, `EstimateSheetContent.tsx:733-735`) |

That is the **only** TanStack key touching templates. Everything else is server actions + `revalidatePath` + `router.refresh()`:

| Mutation | `revalidatePath` targets | Note |
|---|---|---|
| browse CRUD (`actions.ts` rename/delete/duplicate/moveToCategory/renameCategory/create) | `/workshop/library/templates` only | does **not** revalidate `[id]` editor, `/workshop/library` overview, or the TanStack cache |
| editor mutations (`template-editor-actions.ts`) | `/workshop/library/templates` **and** `/workshop/library/templates/${id}` (`:26-29`) | correctly revalidates both |
| save-from-estimate (`createEstimateTemplateFromEstimateNode/Tab`) | `/workshop/library/templates` (`actions.ts:812,999`) | does not touch the estimate route or TanStack cache |
| `insertEstimateTemplateIntoEstimate` (`estimates/actions.ts:2157`) | none — returns refreshed `tree` | client merges returned tree |

---

## Findings

| ID | Sev | Area | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|---|
| DATA-1 | **P1** | Cache coherence | The in-estimate `templateList` seeds from the prop **once** with **no prop-sync effect**, so it ignores later `revalidatePath`/`invalidateQueries` updates. | `index.tsx:704` (`useState(templates)`, comment `:702-703`); no `[templates]` effect / render-time sync (contrast browse `:613-623`, editor `:52-55`) | A template renamed/deleted/created elsewhere is **not reflected** in an already-open estimate panel until remount — stale insert targets; deleted templates remain insertable. | Add a render-time source-value sync (the pattern already used twice) that preserves local optimistic appends. |
| DATA-2 | P2 | Invalidation | Save-as-template from an estimate revalidates `/workshop/library/templates` but **never invalidates** `["workspace-component-library"]`. | `actions.ts:812,999`; handler `index.tsx:1468` updates only local list + `onLibraryDataChanged?.()` | A *second* open estimate (or the editor dock) serves the 5-min-stale template set; the new template is invisible there. | Route the save through `onLibraryDataChanged` → `invalidateQueries(["workspace-component-library"])`. |
| DATA-3 | P2 | Invalidation | Browse CRUD revalidates only `/workshop/library/templates`, not the shared TanStack cache nor `/workshop/library`. | `actions.ts:1032,1052,1095,1224,1264,1286` | Estimate panels in other tabs show stale names/membership up to 5m; overview counts lag. | Broaden invalidation (a shared `revalidateTemplateSurfaces()` + cache invalidation). |
| DATA-4 | P2 | Staleness | **No re-read-at-insert guarantee for project-derived previews** — previews are lazily fetched and held in local state, never revalidated at any insert moment. (Today mitigated only because project-source insertion isn't wired — DATA-5.) The custom-template insert path *is* safe (RPC re-reads server-side). | preview merge `TemplatesBrowseManager.tsx:688-704`; template RPC re-reads `estimates/actions.ts:2168,2247-2260` | If project-source insertion is wired off cached previews, an edited/deleted source between browse and insert copies stale/ghost data. Preview can already show a deleted tab/node with no staleness signal. | Drive any future project-source insert from a fresh server-side read keyed by id (mirror the template RPC). |
| DATA-5 | P2 | Feature wiring | Project-source "Add to estimate" is surfaced but `onInsertProjectSource` is **never passed** by `EstimateSheetContent`; the only live insert path is custom-template. | `index.tsx:504,1368` (optional prop, zero suppliers); `disabledReason` "not wired in this surface yet" (`tree/TemplatesTree.tsx:819`) | Half-built capability; see [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md). | Build the insert path (07/08 U2) with re-read-at-insert (DATA-4). |
| DATA-6 | P2 | Performance (state) | `searchReusableProjectSources` is a synchronous N+1 fan-out (see [03](03_PERFORMANCE_AUDIT.md) PERF-1). | `reusable-sources/actions.ts:94-188` | Unbounded server cost per search. | Server-side search. |
| DATA-7 | P3 | Consistency | `EstimateTemplateRowItemRow.kind` is narrowed by two different helpers (`getTemplateNodeKind` vs `normalizeEstimateTreeNodeKind`). | `component-library-repository.ts:381-384` vs `actions.ts:21` | Divergence risk. | Consolidate on `normalizeEstimateTreeNodeKind`. |

---

## Optimistic updates

- **Editor** (`use-template-editor.ts`): sound. `run()` (`:64-88`) snapshots `previous`, applies optimistically, awaits, `router.refresh()`, rolls back on error; render-time re-seed absorbs the refreshed prop. Moves/inserts pass `optimistic: null` and rely on the refresh. One subtlety: rapid concurrent mutations each snapshot from the latest committed state, so a late rollback could revert two edits — acceptable for a single-user editor.
- **Browse** (`TemplatesBrowseManager.tsx`): rename/move/renameCategory/delete apply optimistic edits with explicit `.catch` rollback then `router.refresh()`; duplicate/create append on success.
- **In-estimate** (`index.tsx`): rename/delete update local list **only after** the server resolves (not optimistic), no list rollback needed; the real defect is DATA-1 (no inbound prop-sync).

---

## Cache-coherence narrative

Three independent local mirrors of the same Supabase set, each seeded from a different fetch: (1) browse (SC prop, re-syncs on refresh), (2) editor (SC prop, re-syncs + shared TanStack dock list), (3) in-estimate (shared TanStack cache **frozen into `templateList` at mount with no re-sync** — DATA-1). Net effect: rename in the editor → browse updates on nav, but an open estimate panel shows the **old name** and can still insert a renamed/deleted template until remount; save-as from estimate A → estimate B won't see it for ≤5m (DATA-2) and even then won't pick it up without remount (DATA-1). The project-derived branch is coherent-by-construction for *reads* (always live) but has **no staleness signal** and **no re-read-at-insert** contract (DATA-4/5).

---

## Server-action discipline (VERIFIED)

- **RLS-scoped, admin-free:** every template/reusable read and write goes through `createSupabaseServerClient()` (anon-key, cookie-bound, RLS-enforced; `src/lib/supabase/server.ts:23`); the only admin client is a dev-host bypass (`isDevAdminDatabaseBypassRequest`, `:10`). No service-role client appears in any template path (grep-clean). `asEstimateTabsReadClient` is a type cast of the *same* RLS client (`workspace-repository.ts:1573-1577`).
- **Auth gate:** every action begins with `requireCurrentUserContext()` / `ensureDefaultWorkspace()`; mutations scope by `workspace_id` and re-verify membership; UUID guards fail closed.
- **Repository boundary:** reads are centralized in `component-library-repository.ts`; **writes** call `supabase.from("estimate_template_*")` directly in the server actions — consistent with this codebase's "actions own writes" convention, so not a violation, but note there is no single repository surface for template *writes*.

---

## Evidence used

`src/stores/estimate-ui-store.ts`, `src/lib/component-library/{actions,template-editor-actions,estimate-templates}.ts`, `src/lib/repositories/component-library-repository.ts`, `src/lib/reusable-sources/actions.ts`, `src/components/workshop/library/template-editor/{use-template-editor,TemplateEditorClient}.tsx`, `templates-browse/TemplatesBrowseManager.tsx`, `component-library/index.tsx` (`:704, :1368, :1468`), `tree/TemplatesTree.tsx:819`, `EstimateSheetContent.tsx`, `src/lib/supabase/server.ts`.

## Truth & integrity

- **VERIFIED:** the data-source table; DATA-1 (single `useState`, no sync — the load-bearing line is `index.tsx:704`); DATA-2/3 (revalidate targets + absence of cache invalidation); DATA-5 (zero `onInsertProjectSource` suppliers); RLS-scoped/admin-free/authenticated.
- **ASSUMPTION:** DATA-4 real-world severity is conditional on future insert wiring; "repository pattern" interpreted as read-centralization (this codebase's actual convention).
