# 04 — Client Data Layer & State Management Audit

**Scope:** how data flows on the client, why tab revisits re-skeleton, and the lowest-blast-radius change that makes the feature feel like a SPA.

---

## A. Client-data architecture summary (how data flows today)

`/workshop/library` is a layout + three sibling server route segments + an editor route. The tabs are real `<Link>`s to separate URLs:

- **Overview** → `page.tsx` awaits `getLibraryOverview()` → props → `<LibraryOverview>`.
- **Components** → `page.tsx` → `LibraryComponentsRoute` (**async server component**) awaits `getCurrentWorkspaceComponentRowsLibrary()` → props → `LibraryPageClient` → `ComponentLibraryManager` (client).
- **Templates** → `page.tsx` awaits `getCurrentWorkspaceEstimateTemplates()` → props → `TemplatesBrowsePageClient` → `TemplatesBrowseManager` (client).
- **Editor** → `page.tsx` awaits `getEstimateTemplateById()` → props → `TemplateEditorClient` (client).

**All three browse tabs are server-prop tabs** — none client-fetch their primary dataset. The decisive fact: **TanStack Query is fully wired app-wide** (`src/app/providers.tsx:13-44`, `staleTime`/`gcTime` 5 min, `refetchOnWindowFocus:false`, mutation `retry:0`) but **exactly one surface uses it** — the editor's right-hand component dock (`TemplateEditorClient.tsx:121-125`, `useQuery(["workspace-component-library"])`). Every browse tab ignores the cache and relies on per-segment server fetch + `loading.tsx`.

Once mounted, each manager copies server props into local `useState` and uses a **"source-prop" reconciliation pattern** — `if (state.source !== props) setState(props)` during render (`ComponentLibraryManager.tsx:1105-1109`, `TemplatesBrowseManager.tsx:543-547`, `use-template-editor.ts:52-55`). Mutations are **server actions invoked imperatively** (not `useMutation`), with optimistic local patches followed by `router.refresh()`.

---

## B. Findings

### F6 🔴 — Every tab switch is a full server round-trip with a skeleton; no client cache for browse data
`*/page.tsx` + `*/loading.tsx`. Each tab's `page.tsx` `await`s a fresh repository fetch on every visit; Next shows the segment's `loading.tsx` each time. Because data lives in server props (not a client cache), **re-visiting a tab you already saw re-fetches and re-skeletons from scratch** — no `staleTime`/dedupe path. Click Components → skeleton → grid; click Templates → skeleton → list; click back to Components → skeleton *again*. A real SPA would show prior content instantly.

### F6 🔴 — TanStack Query exists and is used 6 inches away — but browse tabs don't touch it
`providers.tsx:13-44` (provider) vs `ComponentLibraryManager.tsx`/`TemplatesBrowseManager.tsx` (zero `useQuery`). The editor proves the pattern works here (`TemplateEditorClient.tsx:121`). The browse tabs fetch the *same kind of data* via server props with no caching. The inconsistency — one surface instant/cached, siblings blinking a skeleton every nav — is exactly why it "doesn't feel like a react app."

### F6/cache 🟠 — The "shared cache" the editor advertises is only half-shared
`TemplateEditorClient.tsx:119-129` + `src/lib/component-library/query-keys.ts`. The editor comment claims it reuses the estimate workspace's cache key, but `["workspace-component-library"]` appears only in `TemplateEditorClient.tsx`, `actions.ts`, and `query-keys.ts` — not in `EstimateWorkspaceClient.tsx`/`EstimateSheetContent.tsx`. And the Components **browse** tab doesn't read this cache at all despite showing the same catalogue. Same data, two fetch paths, one cached.

### F7 🟠 — All mutations are imperative server actions + `router.refresh()`, not `useMutation` with cache invalidation
Components: `ComponentLibraryManager.tsx` `handleComponentCreated:1166`, `handleComponentEdited:1197`, `duplicateInspectorComponent:1206`, `moveComponentToFolder:1397`, `createFolder/renameFolder/deleteFolder:1343-1395`, `executeArchiveComponentPreview:1305`. Templates: `TemplatesBrowseManager.tsx` `handleTemplateCreated:598`, `applyRenameTemplate:608`, `duplicateTemplate:643`, `moveTemplateToCategory:663`, `applyRenameCategory:700`, `confirmDeleteTemplate:737`. Editor: `use-template-editor.ts:64-223`. Each does optimistic local patching + rollback (good) but ends in `router.refresh()` (which `show("refresh")`s the overlay) — re-running the **whole segment** server component instead of surgically patching a cache. Writes feel like they "reload."

### F5(client) 🟡 — Local-vs-server state duplication via render-phase reconciliation
`ComponentLibraryManager.tsx:1091-1109`, `TemplatesBrowseManager.tsx:512-547`, `use-template-editor.ts:46-55`. Each holds `{source, items}` and re-seeds mid-render when props change. A hand-rolled cache-reconciliation layer, duplicated three times with subtle differences, that **TanStack Query provides for free** (`queryFn` + `onMutate`/`setQueryData`). Maintenance cost of not using the cache you already pay for.

### F29 🟡 — Template-editor autosave fires `router.refresh()` on every mutation
`use-template-editor.ts:64-88` (`run()` → `router.refresh()` at `:76`). The most interaction-dense surface re-runs `getEstimateTemplateById()` and re-streams the entire template body on every add/rename/delete/edit/drop. For large templates this re-serializes the whole tree per edit.

### F17(client) 🟠 — Hydration payload: full datasets serialized into RSC props per tab
`LibraryComponentsRoute.tsx:10` (categoryTree + suppliers + brands + folders + **all** libraryItems), `templates/page.tsx:12` (all templates), `[templateId]/page.tsx:16` (full template body). Browse data passed as server props means the **entire catalogue is serialized into the RSC/hydration payload on each navigation**. With a client cache, the first load pays this once; today it's re-shipped per visit.

---

## C. The SPA-feel unlock (revised after gap review)

**Move the three browse tabs onto the TanStack Query cache that is already wired and already proven by the editor dock — and stop reloading server segments on mutation.**

1. **Do not treat `initialData` as sufficient by itself.** If `page.tsx` still awaits the repository fetch before returning a client manager, Next can still show the route's `loading.tsx` before TanStack Query has a chance to render cached data. P0b must choose one architecture that can prove no warm-revisit skeletons: either an immediate client shell route that reads the query cache, or client-panel tabs with URL sync. Only then should server data be used as `initialData`/dehydrated seed data.

2. **Replace the `router.refresh()` tail with `queryClient.setQueryData`/`invalidateQueries`** (ideally `useMutation` + `onMutate` optimistic + `onSettled` invalidate). The optimistic-patch logic already exists in all three managers — it just needs to write to the cache instead of local `useState`, which **deletes the triplicated source-prop reconciliation** (F5) and removes the full-segment server re-render (F7, F29).

3. **Pick the lowest-blast-radius P0b option only after proof.** Route client shells preserve URL ownership with less layout rewrite; client-panel tabs give the strongest SPA feel but require preserving back/forward and deep-link semantics. The Playwright standard session decides whether the chosen option passes: warm revisits must show no route `loading.tsx`, no manager fallback skeleton, and no overlay.

**Net:** this is not an architecture missing the tools — it built the right tool (TanStack Query + optimistic patching) and used it on only one of four surfaces. But the route architecture must be changed enough for the cache to render before `loading.tsx`; otherwise the plan only fixes overlay timing, not the user's "loading pages all over" complaint.

---

## D. What's already good

- **TanStack Query correctly configured app-wide** (`providers.tsx:13-27`) — the fix needs no new infra.
- **The editor dock is the right pattern** and proves it works here (`TemplateEditorClient.tsx:121-129`, with a `handleLibraryDataChanged` → `invalidateQueries` path).
- **Optimistic updates with rollback implemented everywhere** — component move (`ComponentLibraryManager.tsx:1397-1417`), template rename/move/delete (`TemplatesBrowseManager.tsx:608-759`), all editor mutations (`use-template-editor.ts:64-88`). The hard part of optimistic UX is done; it's just wired to local state, not the cache.
- **Heavy clients are code-split** with tailored fallbacks (`LibraryPageClient.tsx:12-17`, `TemplatesBrowsePageClient.tsx:8-13`, + `LibraryFolderTree`, `AddComponentModal`, `NewTemplateModal`, `InsertIntoEstimatePicker`).
- **Per-segment `loading.tsx` mostly have good a11y semantics** (`role="status"`/`aria-label`), but their geometry and reuse still need review: Overview is wrong-shape, Templates stacks two mismatched shapes, and P0b must prove warm revisits do not show segment loaders.
- **Save-state feedback is solid** — `aria-live` status + shared `setSaveState` chrome hook.
