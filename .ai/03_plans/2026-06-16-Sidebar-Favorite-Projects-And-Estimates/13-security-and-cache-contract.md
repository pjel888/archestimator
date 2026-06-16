# 13 — Security & Cache Contract

Plan-level security and cache-correctness contract for the reactive sidebar favorites. Produced by the
2026-06-16 audit-2 security pass (verified against real source). Every item here is a hard requirement, not a
suggestion — an implementer must be able to satisfy each without inventing policy.

---

## Threat model in one place

The favorites cache holds **per-user, human-readable** data: favorite project names, project codes, estimate
sheet names, and navigable hrefs — scoped to one user within one workspace. The three exploits to prevent:

1. **Cross-user/workspace leakage via a shared cache layer** — another user (or a CDN/proxy) seeing user A's
   favorites.
2. **Sign-out residue** — user A's favorites surviving in the in-memory QueryClient after logout on a shared
   or kiosk browser (5-min `gcTime` window).
3. **Silent auth fall-through** — an unauthenticated data path returning an empty/garbage result instead of
   failing closed, so the UI shows "no favorites" instead of an error.

---

## C1 — Loader auth (Server Action posture) **[required]**

The loader is a `"use server"` function (`fetchSidebarFavoriteProjects`), **not** a Route Handler (D3). This
is the security-preferred shape:

- It calls `listMainSidebarFavoriteProjects()` → `ensureDefaultWorkspace()` → `requireCurrentUserContext()`,
  which authenticates server-side; in a Server Action context `redirect("/login")` behaves correctly (unlike a
  Route Handler, where `redirect()` throws `NEXT_REDIRECT` → a 307 to HTML that a `response.ok`-only client
  fetcher mis-parses).
- Server Actions are POST-only and are **not** statically cached or CDN-cacheable, so the
  `Cache-Control: private, no-store` + `export const dynamic = "force-dynamic"` obligations that a GET Route
  Handler would have carried are **moot** — this is the reason the route handler was dropped.
- The query only runs for users already on `/workshop` (the layout auth-gates). The `queryFn` therefore never
  executes for anonymous callers in practice; still, the server-side `requireCurrentUserContext()` is the
  authoritative guard, not the route gate.

**If a Route Handler is ever reintroduced** (it should not be without revisiting D3): it must (a) call
`getCurrentUserContext()` and return `new Response(null, { status: 401 })` when null — never rely on
`redirect()`; (b) set `Cache-Control: private, no-store` on every response path; (c)
`export const dynamic = "force-dynamic"`; (d) the client fetcher must reject redirects/non-JSON
(`{ redirect: "manual" }` or a content-type check) before `response.json()`. The repo enforces (b)+(c) on every
comparable GET handler (`api/health`, `api/share/[token]`, `workshop/pending-invite`).

## C2 — Server-action write authorization **[required]**

Both `setProjectFavorite` and `setEstimateFavorite` already derive `workspace_id`/`user_id` server-side from
the session. Hardening (D14):

- **Boolean validation, exact shape:** `if (typeof favorite !== "boolean") throw new Error("Invalid input.")`
  in both actions. A `"use server"` action is POST-invocable from the browser, so the TypeScript `boolean` type
  is not a runtime guarantee — a truthy string would otherwise coerce a delete into a write.
- **`workspace_id` on the project-favorite delete filter (authz, not just hygiene):** verified, the project
  delete filters only `user_id` + `project_id` (`actions.ts:32-36`) while the estimate delete already includes
  `workspace_id` (`actions.ts:112-117`). The `project_favorites` unique constraint is `(user_id, project_id)`
  with no workspace dimension, so a delete can act on a broader scope than the caller's current workspace
  authorizes. Add `.eq("workspace_id", ...)` to the delete.
- Ids continue to be validated (UUID shape + workspace membership) exactly as today; errors are generic and
  client-safe (no internal detail).

## C3 — Client cache scoping **[required]**

- The query key is `["favorites", "sidebar", workspaceId, userId]` built by the one shared
  `favoritesQueryKeys.sidebar(scope)` helper (D2). No code may read the `["favorites"]` prefix without the
  full scope when rendering user-facing data.
- Optimistic hrefs are constructed from authorized DTO ids only; never treat a cached href as server authority,
  and never prefetch a route from a cache entry whose scope does not match the current `{ workspaceId, userId }`.

## C4 — Scope-change eviction **[required, explicit mechanism]**

Changing the query key creates a **separate** cache entry (so a new scope does not *render* old data), but the
old entry is **not** auto-evicted — it lingers for `gcTime` (5 min, `providers.tsx`). Therefore, on a
workspace/user scope change, `useSidebarFavoritesQuery` must **explicitly**:

```ts
queryClient.removeQueries({ queryKey: favoritesQueryKeys.sidebar(previousScope) });
```

before rendering favorite links or registering hover/focus prefetch routes for the new scope. Relying on the
key change alone is insufficient (verified against `query-core@5.100.14`).

## C5 — Logout cache clear **[required — currently missing in the codebase]**

Verified: `signOut` (`src/lib/auth/actions.ts`) calls `supabase.auth.signOut()` then `redirect("/login")` with
**no** QueryClient interaction, and `RealtimeAuthBridge` (`src/components/realtime-auth-bridge.tsx`) handles
`SIGNED_OUT` only by `supabase.realtime.setAuth(undefined)`. So after logout, the previous user's favorite
names/hrefs survive in the in-memory QueryClient for up to `gcTime` (5 min). On a shared/kiosk browser the next
user could see them during initial paint.

**Requirement:** on logout, clear the favorites cache:
`queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() })` (or `queryClient.clear()` if a broader
clear is acceptable). The natural hook is the `SIGNED_OUT` handler in `RealtimeAuthBridge` (it already runs
client-side and has the auth event), or a client effect tied to the sign-out flow. "Scope change" in D2/C4 is
defined to **include** logout.

## C6 — Input rendering / XSS **[verify]**

Favorite names/codes render as text and `title`/`aria` attributes. React escapes text children by default, so
the primary surface is safe; the verification obligation is that **no** favorite-derived string is passed to
`dangerouslySetInnerHTML`, and that `title=` / `aria-label=` attributes receive the raw string (attribute
escaping is automatic, but confirm no manual string interpolation into markup). QA-15 covers long/unicode/
instruction-like names.

## C7 — Shared/non-owned favorites boundary **[required, preserve]**

Preserve the 2026-06-03 decision (D6) suppressing non-owned shared favorites. The reactive cache must not
surface a favorite the current user does not own; the server reader already enforces per-user rows, and the
cache inherits that scoping via C3. Do not add a code path that merges another user's favorites into this
cache.

---

## Requirements added to traceability (`07`)

| ID | Requirement | Contract |
|---|---|---|
| R14 | Loader is a server-side-authenticated Server Action; no CDN-cacheable GET surface for favorites. | C1 |
| R15 | Project-favorite delete includes `workspace_id`; both actions runtime-validate the boolean. | C2 |
| R16 | Scope change explicitly `removeQueries` the previous scope before render/prefetch. | C4 |
| R17 | Logout clears the favorites cache (`favoritesQueryKeys.all()`). | C5 |

## QA scenarios added (`10`)

- **QA-17** — Sign out, then a different user signs in in the same browser: no prior favorites render or are
  prefetched (covers C5).
- **QA-22** — No favorite-derived string reaches `dangerouslySetInnerHTML`; `title`/`aria` carry raw text
  (covers C6, complements QA-15).
