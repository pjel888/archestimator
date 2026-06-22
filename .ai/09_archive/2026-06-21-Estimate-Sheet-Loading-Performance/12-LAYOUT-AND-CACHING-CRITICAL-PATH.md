# 12 — Layout and Caching Critical Path

**Lane:** L3 (layouts + caching)
**Scope:** Which layout awaits block first paint on the Estimate Sheet path
(`/workshop/projects/[projectId]/estimates/[nodeId]`), and what re-runs on
navigation.
**Method:** Static read of `src/app/**/layout.tsx`, `src/lib/auth/session.ts`,
`src/lib/legal/terms-acceptance.ts`, `src/lib/repositories/workspace-repository.ts`,
the shell components, and a repo-wide cache-primitive inventory. READ-ONLY — no
runtime measurement (that is L6's lane).
**Provenance:** every claim cites `file:line`. Behavioural claims about Next.js
App Router layout caching are grounded in the framework's documented semantics
(cited inline) and flagged where the live build's `staleTimes` override applies.

---

## 1. Layout await inventory

The Estimate Sheet route traverses four layouts from root to leaf. Only the
two async layouts in the workshop segment gate first paint.

| # | Layout | `await` / blocking call | Purpose | Blocks first paint? | file:line |
|---|--------|-------------------------|---------|---------------------|-----------|
| 1 | `app/layout.tsx` (root) | none — pure sync render of `<AppProviders>` | Fonts, providers, analytics | NO | `src/app/layout.tsx:33-46` |
| 2 | `app/workshop/layout.tsx` | `await headers()` | Read `x-archestimator-request-path` for the terms-gate bypass check | YES (trivial — sync header read, no I/O) | `src/app/workshop/layout.tsx:18` |
| 3 | `app/workshop/layout.tsx` | `await getCurrentUserContext()` | Supabase `auth.getUser()` + `getClosedBetaAccessForEmail` + `profiles` read (1–3 queries). Wrapped in React `cache()` so deduped per request. | **YES** (the first hard I/O gate) | `src/app/workshop/layout.tsx:25`; impl `src/lib/auth/session.ts:31-85` |
| 4 | `app/workshop/layout.tsx` | `await getCurrentUserTermsAcceptanceStatus(currentUser.userId)` | One Supabase read on `legal_terms_acceptances`. **Not** wrapped in `cache()`. | **YES** (sequential after #3) | `src/app/workshop/layout.tsx:28`; impl `src/lib/legal/terms-acceptance.ts:59-85` |
| 5 | `app/workshop/projects/[projectId]/layout.tsx` | `await params` | Unwrap the dynamic segment (no I/O) | trivial | `src/app/workshop/projects/[projectId]/layout.tsx:17` |
| 6 | `app/workshop/projects/[projectId]/layout.tsx` | `await getCurrentWorkspaceProject(projectId)` | `projects` read (1 query) + optional `workspaces` read (1 query) for cross-workspace projects. Wrapped in React `cache()`. | **YES** (the second hard I/O gate) | `src/app/workshop/projects/[projectId]/layout.tsx:22`; impl `src/lib/repositories/workspace-repository.ts:1733-1759` |
| 7 | inside `[projectId]/layout.tsx` | `<WorkshopPageShell>` → `await getCurrentUserContext()` + `await cookies()` (parallel via `Promise.all`), then `await ensureDefaultWorkspace()` + `await listMainSidebarFavoriteProjects()` (parallel) | Build the sidebar + shell. Reuses cached `getCurrentUserContext`; `ensureDefaultWorkspace` and `listMainSidebarFavoriteProjects` are both `cache()`-wrapped (first call in this request pays). | **YES** (runs inside the layout's async render before `children` stream) | `src/components/workshop/WorkshopPageShell.tsx:97-107`; repo fns at `workspace-repository.ts:822` (`ensureDefaultWorkspace`) and `:1649` (`listMainSidebarFavoriteProjects`) |
| 8 | inside `[projectId]/layout.tsx` | `<ProjectChromeAsync>` behind `<Suspense>` | Three summary fetches in parallel (collaboration, publication, sheets) | **NO** — explicitly behind Suspense; streams after first paint (`ProjectChromeAsync.tsx:26-37`, wrapped at `[projectId]/layout.tsx:42-45`) |
| 9 | inside `[projectId]/layout.tsx` | `{children}` behind `<Suspense fallback={<ProjectRouteContentFallback />}>` | The sheet page itself | NO — route content streams via the inner Suspense at `[projectId]/layout.tsx:51` |

**Key components that are correctly NON-blocking:**
- `ProjectMiniSidebar` is a `"use client"` component reading only `usePathname()` — zero server awaits (`src/components/workshop/ProjectMiniSidebar.tsx:1-19,44`). It returns `null` on the estimate-sheet route anyway.
- `ProjectChromeAsync` is an async server component already isolated behind its own `<Suspense>` boundary with a CLS-stable skeleton (`ProjectChromeAsync.tsx:90-104`, `[projectId]/layout.tsx:42-45`).
- `WorkshopPageShell`'s `{children}` are wrapped in a *third* Suspense (`WorkshopPageShell.tsx:173`), and the `ProjectLayout` wraps *its* children in a fourth (`[projectId]/layout.tsx:51`).

---

## 2. Fresh-navigation (F5 / first visit) critical path

On a cold request the Estimate Sheet page cannot start streaming until the
async layouts resolve. The gates are strictly sequential because each depends
on the prior step's output:

1. **`workshop/layout.tsx` → `getCurrentUserContext()`** resolves first
   (`workshop/layout.tsx:25`). Internally this is itself a small sequential
   chain: `auth.getUser()` → `getClosedBetaAccessForEmail()` → `profiles`
   read, and on first-ever login an `ensure_current_user_profile` RPC fallback
   (`session.ts:37-76`). One `createSupabaseServerClient()` build is shared
   via `cache()` (`src/lib/supabase/server.ts:23`).

2. **`workshop/layout.tsx` → `getCurrentUserTermsAcceptanceStatus(userId)`**
   runs **after** step 1 because it consumes `currentUser.userId`
   (`workshop/layout.tsx:28`). It is its own Supabase round-trip on
   `legal_terms_acceptances` (`terms-acceptance.ts:63-72`). Confirmed
   **sequential**, not parallelisable in-place without restructuring the gate.

3. **`[projectId]/layout.tsx` → `getCurrentWorkspaceProject(projectId)`**
   (`[projectId]/layout.tsx:22`). This is the next hard gate down the tree.
   Internally it first awaits `ensureDefaultWorkspace()` (which itself awaits
   `requireCurrentUserContext()` → re-enters the cached `getCurrentUserContext`
   from step 1, so no extra auth round-trip), then issues the `projects` query
   and optionally a `workspaces` query (`workspace-repository.ts:1733-1759`).

4. **`<WorkshopPageShell>`** runs as part of the `[projectId]` layout render
   and issues a `Promise.all([getCurrentUserContext(), cookies()])` wave then
   a second `Promise.all([ensureDefaultWorkspace(), listMainSidebarFavoriteProjects()])`
   wave (`WorkshopPageShell.tsx:97-107`). Every function here is `cache()`-wrapped,
   so on a fresh nav these add **two new query waves** (workspace bootstrap + the
   favorites fan-out) to the critical path before the shell's `<Suspense>` can
   emit fallback HTML. This is a real cost, even though the auth reads are deduped.

5. **Only after all of 1–4 resolve** does the outer layout emit any HTML; the
   inner Suspense boundaries (chrome at step 8, children at step 9) then begin
   streaming. The Estimate Sheet page itself adds its *own* two-wave server fan
   (`[nodeId]/page.tsx:36-41` then `:64-71`) — that is L2's scope, not here.

**Net fresh-nav critical path (blocking awaits before first paint):**

```
headers() → getCurrentUserContext()  → getCurrentUserTermsAcceptanceStatus()
                                              ↓
                                   getCurrentWorkspaceProject()
                                              ↓
                            WorkshopPageShell: ensureDefaultWorkspace()
                                              ↓
                            WorkshopPageShell: listMainSidebarFavoriteProjects()
                                              ↓
                                   <<first paint unlocks>>
                                              ↓
                            streams: ProjectChromeAsync  ‖  [nodeId]/page.tsx
```

Six sequential server-side I/O hops (1 header + 5 DB rounds, where steps 4–6's
two waves each contain 2–3 parallel queries). Each hop pays the dev→hosted-
Supabase RTT locally (per `[[hero-path-perf-network-bound]]`), which is the
dominant local cost; on Vercel in-region the per-hop cost drops to single-digit
ms and the parallel waves dominate.

---

## 3. Client-side navigation re-execution

App Router preserves layouts across sibling-route navigations: a navigation
that stays within the same `[projectId]` segment reuses the already-rendered
`workshop/layout.tsx` and `[projectId]/layout.tsx`; only the leaf segment
re-renders. The open question is whether the router *caches* the rendered
output or re-renders server-side. Three forces apply:

### 3.1 Same project, sibling navigation
(`POST`/`GET` client nav: `/workshop/projects/[id]` → `/workshop/projects/[id]/estimates` → `/workshop/projects/[id]/estimates/[nodeId]`)

- **Default behaviour (no `staleTimes` override):** the Client-side Router Cache
  (`next.cacheHandlers` / "dynamic cache") holds the rendered segment for the
  default dynamic staleness. A warm Link navigation to a sibling *reuses* the
  cached layout subtree, so `workshop/layout.tsx` and `[projectId]/layout.tsx`
  **do NOT re-run their awaits**. Only the new leaf (`[nodeId]/page.tsx`) hits
  the server.
- **This repo overrides that TTL:** `next.config.ts:90-93` sets
  `experimental.staleTimes.dynamic = 60` (60 seconds, vs Next 15's default of 0
  for dynamic segments). This makes the layout cache **more** sticky, not less
  — warm sibling navigations within 60s are guaranteed to reuse the rendered
  layouts. Comment at `next.config.ts:82-89` documents this as the Library
  Optimization P0 T3 change.
- **Conclusion (same-project sibling nav):** the six blocking awaits in
  section 2 run **once per 60s window** for a given `[projectId]`, then are
  served from the client Router Cache. This holds for `project dashboard →
  estimates list → estimate sheet` within the same project.

### 3.2 Different project, or cold/back/forward navigation
(`project A → project B`, or after the 60s TTL expires, or a full reload)

- The `[projectId]` segment's rendered output is keyed by `projectId`, so
  navigating to a different project forces a fresh server render of
  `[projectId]/layout.tsx` (step 6 re-runs, step 7's shell waves re-run).
- `workshop/layout.tsx` is **shared across all projects** — its result
  (`getCurrentUserContext` + terms gate) is keyed only on the request, not on
  `projectId`, so for a warm navigation *between two projects* the workshop
  layout segment is reused from the Router Cache and **does not** re-await the
  user/terms calls. (UNVERIFIED at runtime — L6 should confirm with a trace;
  framework semantics say it should hold.)
- After the 60s TTL or on a hard reload, **all** awaits in section 2 re-run.
  React `cache()` does not help here — it is per-request only and does not
  survive across requests.

### 3.3 Summary table

| Navigation | `workshop/layout.tsx` awaits re-run? | `[projectId]/layout.tsx` awaits re-run? |
|------------|--------------------------------------|------------------------------------------|
| Same project, sibling (warm, <60s) | NO (Router Cache) | NO (Router Cache) |
| Same project, sibling (cold >60s / reload / F5) | YES | YES |
| Different project (warm, <60s) | NO (shared segment) | YES (segment keyed by `projectId`) |
| Different project (cold) | YES | YES |
| Back/forward (default browser cache) | typically NO if within TTL | depends on whether the leaf `[projectId]` entry is still cached |

**Major finding:** there is **no** layout await that re-runs on a warm same-
project navigation — the 60s `staleTimes.dynamic` override (documented at
`next.config.ts:82-93`) holds the rendered layouts. The skeleton-cascade
symptom (L1's lane) is therefore driven by **fresh-nav / cold-nav / cross-
project-nav** critical path length (section 2), not by repeated layout re-
execution on warm navigations. This narrows the optimisation target.

---

## 4. Caching primitives inventory

Repo-wide search (`rg -n "unstable_cache|cache\(|fetch\(|next:\s*\{|revalidate|generateStaticParams" src/lib src/app`):

### 4.1 React `cache()` — per-request dedupe (the only dedupe layer in use)
| Function | file:line | On the sheet path? |
|----------|-----------|---------------------|
| `getCurrentUserContext` | `src/lib/auth/session.ts:31` | YES (layout step 3, shell step 7, page) |
| `createSupabaseServerClient` | `src/lib/supabase/server.ts:23` | YES (every Supabase call) |
| `ensureDefaultWorkspace` | `src/lib/repositories/workspace-repository.ts:822` | YES (steps 6, 7) |
| `getCurrentWorkspaceProject` | `src/lib/repositories/workspace-repository.ts:1733` | YES (step 6, page) |
| `getCachedProjectMembers` | `src/lib/repositories/workspace-repository.ts:1766` | YES (inside `ProjectChromeAsync`) |
| `getProjectPublicationSummary` | `src/lib/repositories/workspace-repository.ts:1927` | YES (inside `ProjectChromeAsync`) |
| `listMainSidebarFavoriteProjects` | `src/lib/repositories/workspace-repository.ts:1649` | YES (step 7, shell) |
| `listCurrentWorkspaceProjects` | `src/lib/repositories/workspace-repository.ts:883` | no (projects list page only) |
| `getProjectLocation` | `src/lib/repositories/project-location-repository.ts:75` | no |
| `listProjectActivityPage` | `src/lib/repositories/project-activity-repository.ts:255` | no |
| `getRequestPublicationServiceClient` | `src/lib/publication/public-repository.ts:156` | no (share route) |
| `getCachedPublicationAccessRowByToken` | `src/lib/publication/public-repository.ts:170` | no |
| `getCachedPublicationSnapshotRowByToken` | `src/lib/publication/public-repository.ts:182` | no |

### 4.2 What is **NOT** cached (gaps)
- **`getCurrentUserTermsAcceptanceStatus`** — `src/lib/legal/terms-acceptance.ts:59`
  is a plain `async function`, not wrapped in `cache()`. Single caller
  (`workshop/layout.tsx:28`), so today the gap is harmless. **If** any other
  component on the workshop tree ever calls it (e.g. a future settings widget),
  it will issue a second `legal_terms_acceptances` round-trip per request.
  Low-risk, cheap fix: wrap in `cache()`.
- **`requireCurrentUserContext`** — `src/lib/auth/session.ts:87` is a plain
  `async function`, **but** it delegates to `getCurrentUserContext()`
  (`session.ts:88`), so it inherits the per-request dedupe transitively. Not a
  gap — verified.
- **`getProjectCollaborationSummary`** — `workspace-repository.ts:1771` is a
  plain `async function`. Its main internal fan (`workspace_members`,
  `estimates`, `project_members` via `getCachedProjectMembers`, sheet members,
  invitations, profiles) runs fresh on every call. Today it has a single
  caller (`ProjectChromeAsync`), so no duplication — but the function re-issues
  its `workspace_members` + `estimates` reads even when
  `getProjectPublicationSummary` (which runs in parallel in the same
  `ProjectChromeAsync` wave) is *also* issuing a `workspace_members` read
  (`workspace-repository.ts:1940-1949` vs `:1785-1795`). That is a **double
  `workspace_members` round-trip per project-layout render**, not deduped.
  Marked as an opportunity in §5.

### 4.3 `fetch()` cache / `next: { revalidate }` / `unstable_cache` / `generateStaticParams`
- **Zero** `unstable_cache` usages anywhere in `src/`.
- **Zero** `fetch(..., { next: { revalidate } })` or `cache: "..."` options
  anywhere in `src/` (the only `fetch()` calls are the DeepSeek AI provider at
  `src/lib/ai/deepseek.ts:48` and `src/lib/ai/package-builder/provider.ts:262`,
  both of which are AI chat calls with no Next cache options).
- **Zero** `generateStaticParams`. The entire workshop tree is dynamic.
- `revalidatePath` is used heavily in mutation server actions
  (`src/lib/estimates/actions.ts`, `src/lib/collaboration/actions.ts`,
  `src/lib/projects/actions.ts`, etc.) — this invalidates the Router Cache
  entries (the same cache that `staleTimes.dynamic` governs). After a mutation
  that calls `revalidatePath("/workshop/projects/[id]")`, the next navigation
  to that segment is a cold render and re-runs every await in section 2.

**Net caching story:** the only request-spanning dedupe layer is React
`cache()`. There is **no cross-request cache** (no `unstable_cache`, no
Data Cache, no Full Route Cache, no ISR). Every cold request pays the full
six-hop critical path. This is the correct design choice for an authenticated
multi-tenant app (user-scoped data must not leak across requests), but it means
the *only* levers for reducing cold-nav cost are (a) fewer sequential awaits,
(b) more `cache()` dedupe, and (c) moving blocking work behind Suspense.

---

## 5. Opportunities

Each opportunity maps to the specific await it fixes and notes blast radius.
Ordered by impact-to-risk ratio for the cold-nav critical path.

### O1. Move `getCurrentUserTermsAcceptanceStatus` behind Suspense (or drop it from the layout)
- **Fixes:** step 4 (the sequential terms gate). Today it blocks all workshop
  first paints even though the terms gate only matters for users who haven't
  accepted — a tiny minority of sessions after first login.
- **Approach:** split the gate into a streamed `<Suspense>` child of
  `workshop/layout.tsx` that renders `children` immediately and only redirects
  if the streamed read returns `requiresAcceptance`. This trades a hard gate
  for a "redirect after first paint" pattern (a brief flash of the workshop
  shell before the terms redirect for un-gated users — which is the rare case).
- **Blast radius:** HIGH — the terms gate is a compliance requirement.
  Redirect-after-paint is acceptable for SaaS terms gates (common pattern),
  but needs product (Philip) sign-off and must not allow un-gated access to
  sensitive mutations (server actions must independently verify terms if
  required). **Defer to a dedicated plan pack, not an opportunistic change.**
- **Alternative (lower-risk):** wrap `getCurrentUserTermsAcceptanceStatus` in
  React `cache()` so any *future* second caller is free, and parallelise it
  with the user-context bootstrap by accepting a promise into the layout
  (requires restructuring — the terms call needs `userId` from the user call,
  so it cannot be truly parallelised without a `Promise.all` shape change).

### O2. Defer the sidebar favorites fetch off the critical paint path
- **Fixes:** the second wave in step 7 — `listMainSidebarFavoriteProjects()`
  (`WorkshopPageShell.tsx:106`) runs three queries in two waves
  (`workspace-repository.ts:1649-1731`) before the shell can emit any HTML.
- **Approach:** move `<MainSidebar>`'s favorites data into its own async server
  component wrapped in `<Suspense>` (the sidebar already lives inside the
  shell). The sidebar would render with an empty/skeleton favorites list
  initially and stream the favorites in after first paint.
- **Blast radius:** MEDIUM — touches `WorkshopPageShell` (used by every
  workshop route, per the L5 blast-radius lane) and `MainSidebar`. Needs a
  skeleton that does not shift the shell layout. Visually contained to the
  sidebar.

### O3. Collapse the double `workspace_members` read in ProjectChromeAsync
- **Fixes:** not a first-paint blocker (it's inside the already-streamed
  `ProjectChromeAsync`), but it is a redundant round-trip on every project-
  layout render.
- **Approach:** extract a `getCachedWorkspaceMembership(workspaceId, userId)`
  `cache()` wrapper around the `workspace_members` read and call it from both
  `getProjectCollaborationSummary` and `getProjectPublicationSummary`.
- **Blast radius:** LOW — additive `cache()` wrapper; no behavioural change.
  Pure win. (~1 fewer round-trip per project-layout render.)

### O4. Add a `[nodeId]/loading.tsx`
- **Fixes:** not a layout await, but directly relevant — there is currently no
  loading file at `src/app/workshop/projects/[projectId]/estimates/[nodeId]/`
  (confirmed: `ls` shows only `error.tsx` and `page.tsx`). When the sheet page
  streams in, the inner Suspense at `[projectId]/layout.tsx:51` falls back to
  `ProjectRouteContentFallback` — which is the list-page-shaped fallback, not a
  sheet-shaped one. This is the "mismatched skeleton" part of the symptom
  (owned by L1's lane, mentioned here for completeness because it interacts
  with the layout's inner Suspense boundary).
- **Blast radius:** LOW — additive loading file. L1's scope.

### O5. Pin the `workshop/layout.tsx` await to its minimal scope
- **Fixes:** today `getCurrentUserContext()` resolves the full profile + beta
  access before the terms check can even start. The terms gate only needs the
  `userId`, not the profile/beta chain. A slimmer "who is the user" helper that
  returns just `{ userId }` from `auth.getUser()` (skipping the `profiles`
  read + beta gate) would let step 4 start sooner — but the beta-gate and
  profile are needed by the shell anyway, so this only helps if those move
  behind Suspense (O1/O2). Marginal.

---

## 6. Conflicts / handoffs to other lanes

- **O4 ([nodeId]/loading.tsx)** is L1's scope; the inner Suspense boundary it
  would slot into is at `[projectId]/layout.tsx:51`. L3 owns the boundary, L1
  owns the fallback content. No conflict — coordinate the skeleton shape.
- **The Estimate Sheet page's own awaits** (`[nodeId]/page.tsx:36-41, 64-71`)
  are L2's scope. They begin only after the layout's inner Suspense opens,
  which is gated by section 2's critical path — so L2's waterfall sits
  downstream of L3's findings.
- **`ProjectChromeAsync` internals** are partly L2 (the summary queries) and
  partly L3 (the Suspense boundary that already isolates them, §1 row 8). No
  overlap: L3 records that the isolation exists; L2 records what the isolated
  work costs.
- **Cross-request caching** is deliberately absent (§4.3). If L7 (best
  practices) recommends `unstable_cache` for any read on this path, it must
  contend with the user-scoped tenancy — most of these reads depend on the
  authenticated user and cannot be safely cached across requests without a
  per-user key.

---

## 7. Verified facts ledger

- `getCurrentUserContext` is `cache()`-wrapped — `src/lib/auth/session.ts:31`.
- `requireCurrentUserContext` is a plain async fn that delegates to
  `getCurrentUserContext` — `src/lib/auth/session.ts:87-91`. Dedupe inherited.
- `getCurrentUserTermsAcceptanceStatus` is **not** `cache()`-wrapped —
  `src/lib/legal/terms-acceptance.ts:59`. Single caller confirmed via
  `rg -n "getCurrentUserTermsAcceptanceStatus" src/`.
- `getCurrentWorkspaceProject` is `cache()`-wrapped —
  `src/lib/repositories/workspace-repository.ts:1733`.
- `createSupabaseServerClient` is `cache()`-wrapped —
  `src/lib/supabase/server.ts:23`.
- Zero `unstable_cache`, zero `fetch` cache options, zero
  `generateStaticParams` in `src/` — `rg` inventory in §4.3.
- `experimental.staleTimes.dynamic = 60` is set — `next.config.ts:90-93`,
  with the Library Optimization P0 T3 rationale documented at `:82-89`.
- `ProjectMiniSidebar` is `"use client"`, returns null on the sheet route —
  `src/components/workshop/ProjectMiniSidebar.tsx:1,19,44`.
- `ProjectChromeAsync` is already behind its own `<Suspense>` —
  `src/app/workshop/projects/[projectId]/layout.tsx:42-45`.
- No `[nodeId]/loading.tsx` exists —
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/` contains only
  `error.tsx` and `page.tsx`.

## 8. UNVERIFIED items (handoff to L6)

- Runtime confirmation that warm same-project client navigations do not re-
  trigger `workshop/layout.tsx` and `[projectId]/layout.tsx` awaits. Framework
  semantics + the `staleTimes.dynamic = 60` override strongly imply they do
  not, but a `[perf-json]` trace across a `dashboard → estimates list → sheet`
  navigation would confirm (L6's lane).
- Whether `src/proxy.ts` is actually wired as Next.js middleware. It exports a
  default handler and a `config.matcher` (`src/proxy.ts` final lines), but
  Next.js conventionally requires the file to be named `middleware.ts`.
  `AUTH_REQUEST_PATH_HEADER` (`x-archestimator-request-path`) is intended to
  be set by this middleware; if it is not wired, the terms gate's `requestPath`
  silently falls back to `TERMS_GATE_FALLBACK_NEXT` (`terms-gate.ts:4,16`) —
  this does not block first paint either way, but it does mean the gate may
  redirect to `/workshop` instead of the originally-requested sheet URL after
  terms acceptance. Out of L3 scope; flagged for whoever owns auth/middleware.
