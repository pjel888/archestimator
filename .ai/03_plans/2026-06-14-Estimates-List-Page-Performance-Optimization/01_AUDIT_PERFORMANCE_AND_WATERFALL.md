# Audit 01 — Performance, Rendering Mode & Server Waterfall

Route: `/workshop/projects/[projectId]/estimates`. All claims carry file:line evidence. No code was modified.

---

## (a) Rendering-mode verdict: FULLY DYNAMIC, ZERO CACHING

No route-segment config exists anywhere in the chain. A grep for `export const dynamic | revalidate | fetchCache | runtime` across `src/app/layout.tsx`, `src/app/workshop/layout.tsx`, `src/app/workshop/projects/[projectId]/layout.tsx`, and `…/estimates/page.tsx` returns nothing.

The subtree is forced dynamic because server components read request-bound APIs:
- `cookies()` / `headers()` in `createSupabaseServerClient` — `src/lib/supabase/server.ts:7,21`
- `headers()` in `WorkshopLayout` — `src/app/workshop/layout.tsx:18`
- `src/proxy.ts:13,36-37` stamps `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` on sensitive routes.

There is **no** `unstable_cache`, no `revalidate`, no Next 16 `use cache`, no PPR/`cacheComponents`. The only memoization is React `cache()` for per-request dedupe.

**→ Every navigation is a full, uncached server render.**

---

## (b) The server waterfall (one cold page load)

Each `.from().select()` / `.rpc()` / `.auth.getUser()` is one network hop to Supabase. Sequence from request → HTML:

**Edge — `src/proxy.ts:112-129` (before any render):**
1. `supabase.auth.getUser()` — `proxy.ts:113`
2. `getClosedBetaAccessForEmail` → `rpc("check_closed_beta_access")` — `closed-beta-access.ts:67`

**`WorkshopLayout` — `src/app/workshop/layout.tsx` (serial awaits):**
3. `getCurrentUserContext` → `auth.getUser()` — `session.ts:40`
4. `getClosedBetaAccessForEmail` (again) — `session.ts:45`
5. `profiles` select — `session.ts:54`
6. `getCurrentUserTermsAcceptanceStatus(userId)` — `layout.tsx:28` (≥1 hop)

**`ProjectLayout` — `…/[projectId]/layout.tsx` (await, THEN `Promise.all`):**
7. `getCurrentWorkspaceProject` → `ensureDefaultWorkspace` (`workspaces` select) — `workspace-repository.ts:730`
8. `projects` select — `workspace-repository.ts:1153` (awaited at `layout.tsx:24`, **before** the Promise.all)
9. `Promise.all([getProjectCollaborationSummary, getProjectPublicationSummary, listProjectEstimateSheets])` — `layout.tsx:25-31`. Parallel with each other, but each fans out internally:
   - `getProjectCollaborationSummary` (`workspace-repository.ts:1174`): `projects` (1180) + `workspace_members` (1189) + `estimates` (1196) + `Promise.all` of 4 readOptional helpers (1205) + `readCollaborationProfiles` (1253) ≈ **7 hops**
   - `getProjectPublicationSummary` (`workspace-repository.ts:1329`): `projects` (1335) + `Promise.all` of 3 (1344) + conditional `Promise.all` of 4 activity reads (1367) ≈ **up to 8 hops, 3 serial layers**
   - `listProjectEstimateSheets` (`workspace-repository.ts:1480`): cached project hit + sheets query ≈ **1-2 hops**

**`ProjectEstimatesPage` — `estimates/page.tsx:13` (awaits AFTER layout fully resolves):**
   - `listProjectEstimates` (`workspace-repository.ts:1407`): cached project + `estimates` select (1419) + `Promise.all([estimate_nodes, estimate_row_items])` (1438) = **3 hops, 2 serial layers**, then JS aggregation over ALL nodes + ALL row-items (1453-1470).

**Totals (cold, real auth): ~22–28 Supabase hops, ~8–10 serial network layers** on the critical path. The layout `Promise.all` parallelizes its three summary branches, but the deepest branch (collaboration/publication, ~3 serial layers each) dominates, and the **page cannot begin until the layout's awaits resolve** — two sequential server phases.

---

## (c) Auth round-trips

- `getCurrentUserContext` **is** wrapped in React `cache()` (`session.ts:31`) → user + profile resolved once per render and reused. ✅
- The **proxy** (`proxy.ts:113`) does its **own** `auth.getUser()` + beta-access RPC every request — a separate process from render, so **not** deduped by React cache. 2 edge auth hops duplicate what `session.ts:45` also does. ⚠
- `ensureDefaultWorkspace` (`workspace-repository.ts:725`) is **NOT** wrapped in `cache()` — plain async. Called by `getCurrentWorkspaceProject` (1147), `getProjectCollaborationSummary` (1175), `getProjectPublicationSummary` (1330). The inner `requireCurrentUserContext` is deduped, but the **`workspaces` select at line 730 fires 3+ times per render.** 🟠 (F6)

---

## (d) Revalidation double-fetch

`revalidateProjectEstimatePaths` (`actions.ts:1122-1126`) calls `revalidatePath` on three paths: `/workshop/projects/{id}`, `…/estimates`, `…/charts`. Create calls it at `actions.ts:1456`.

The client **also** calls `router.refresh()` (`ProjectEstimatesClient.tsx:49` via `use-navigation-router.ts:26`). So a create:
1. `revalidatePath` purges the full-route cache for 3 paths (server-side).
2. `router.refresh()` forces a fresh round-trip re-rendering the **entire layout + page** — re-running all ~22–28 hops in (b) including the heavy node/row aggregation.

For the current tab's immediate refresh the `revalidatePath` is largely redundant (route is uncached/dynamic, so `router.refresh()` already gets fresh data); it matters only for the sibling `/charts` and project-detail paths. Net: a create both purges cache **and** triggers a full re-render. 🟡 (F12)

Note: node rename/delete deliberately avoid `router.refresh()` (obs 4040), but sheet-level create/duplicate/delete (`actions.ts:1456,1616,1725,1785,1806`) all call `revalidateProjectEstimatePaths`.

---

## (e) Create / CRUD latency chain

`handleCreateEstimateSheet` (`ProjectEstimatesClient.tsx:48-49`): `createEstimateSheetDraft(projectId).then(() => router.refresh())`. Minimum **2 sequential server round-trips**:

1. **Server-action POST** (`createEstimateSheetDraft`, `actions.ts:1440`): serial internal hops — `getCurrentWorkspaceProject` (1441) → `requireCurrentUserContext` (1445) → `generateNextEstimateSheetCode` (1446, a query) → `createEstimateWithDefaultTree` (1448, multiple inserts) → `revalidatePath ×3`. Server actions are serialized POSTs.
2. **`router.refresh()`** — a second round-trip re-rendering layout+page = the full waterfall in (b) + JS re-aggregation.

Strictly sequential (`.then`). **No optimistic insert** — the new sheet appears only after the refresh completes. 🔴 (F11)

---

## (f) Streaming vs blocking verdict: PARTIAL — the layout blocks the shell

`loading.tsx` exists (`estimates/loading.tsx:1-5` → `ProjectRouteContentFallback`) and `ProjectLayout` wraps `{children}` in `<Suspense fallback={<ProjectRouteContentFallback/>}>` (`layout.tsx:69`). But:

- The Suspense boundary only covers the **page** (`children`) — i.e. the `listProjectEstimates` await.
- `ProjectLayout` is itself `async` and `await`s its own data (collaboration/publication/sheets, `layout.tsx:24-31`) **before returning JSX**, so the shell (header, sidebar, the Suspense boundary itself) cannot stream until the layout's data resolves.
- On a fresh navigation the user waits for the **full layout waterfall** before anything paints; only then does the estimates skeleton appear while `listProjectEstimates` runs.
- `router.refresh()` re-runs the layout too, so even refresh blocks on layout data.

**→ Perceived first paint is gated on the slowest layout branch (collaboration/publication fan-out), not on the skeleton.** 🔴 (F5)

---

## (g) `next.config.ts` notes

- No `compress` set (defaults to Next gzip; Vercel handles at platform). Not tuned.
- No `output`, no `experimental.ppr`, no `cacheComponents`/`dynamicIO` → PPR off, which is why the layout fully blocks.
- `experimental.optimizePackageImports: ["@phosphor-icons/react"]` (line 55) — icon bundle win only.
- `images.remotePatterns` scoped to Supabase public component-images (31-58).
- `headers()` (60-117) governs only landing CSP-Report-Only and `/share` enforced CSP — **none of it touches `/workshop`** (workshop cache-control comes from `proxy.ts`). (See `04_AUDIT_INFOSEC.md` F14.)
- `@next/bundle-analyzer` behind `ANALYZE=true` (120-124).

---

## Top performance levers (feeds `06_IMPLEMENTATION_PLAN.md`)

1. **Layout blocks the shell** (F5) — move the collaboration/publication/sheets awaits behind their own `<Suspense>` (or pass them as streamed children) so the shell + estimates skeleton paint immediately.
2. **`ensureDefaultWorkspace` not cached** (F6) — wrap in React `cache()`; kills 2 redundant workspace lookups/render.
3. **Redundant `projects` / `workspace_members` re-queries** (F7) — pass the already-resolved project into the summary fns.
4. **Edge auth duplicates render auth** — `proxy.ts:113-129` repeats getUser + beta-access that `session.ts` already does.
5. **Create chain = 2 serial round-trips, no optimistic UI** (F11) — optimistic insert + targeted state update instead of full `router.refresh()`.
6. **`listProjectEstimates` JS aggregation** (F8) — DB-side aggregate (RPC) removes 2 large table scans from the critical path. See `02_AUDIT_DATABASE.md` §C.
