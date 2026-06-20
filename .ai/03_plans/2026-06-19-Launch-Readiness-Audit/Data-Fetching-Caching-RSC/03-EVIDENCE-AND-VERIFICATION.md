# 03 — Evidence & Verification: Data Fetching, Caching & RSC Architecture

**Date:** 2026-06-19 · **Lane:** Domain 8 · **Mode:** adversarial verification of `01-AUDIT-FINDINGS.md`
**Method:** opened every cited file at the cited lines and tried to REFUTE each claim. Re-checked
every `existing_plan_overlap` against the real prior packs on disk.

## Verdict table

| ID | Claim | Verdict | Evidence (file:line) |
|---|---|---|---|
| DATA-FETCH-01 | SIGNED_OUT evicts only favorites; warm QueryClient survives | **adjusted** (medium→low) | confirmed below; severity de-inflated vs AUTH-05 owner |
| DATA-FETCH-02 | Homebase 4-wave app path live; RPC flagged off | **confirmed** | `workspace-repository.ts:1120,1393,1404,1492,1512,1553`; env unset |
| DATA-FETCH-03 | Favorite toggle never reconciles server `favoriteProjectIds` | **confirmed** | `projects-page-client.tsx:1085-1108,706-712` |
| DATA-FETCH-04 | "Serial" awaits are React-cache hits, not a waterfall | **confirmed** | `projects/page.tsx:14-19`; `cache()` at `workspace-repository.ts:802,863`, `session.ts:31` |
| DATA-FETCH-05 | RSC/client boundary clean; no stray `"use client"` | **confirmed** | no client `page.tsx` in `workshop/`; `WorkshopDashboard.tsx` has no `"use client"` |
| DATA-FETCH-06 | Client hooks seed from `initialData`; no double-fetch | **confirmed** | `use-estimate-query.ts:44-47,105-108,159-161`; `LibraryPageClient.tsx:104-105` |
| DATA-FETCH-07 | TanStack defaults + mutation invalidation coherent | **confirmed** | `providers.tsx:14-28`; `use-estimate-row-mutations.ts:208-218` |

**No findings refuted.** The prior audit was accurate; the only correction is the **severity
de-inflation of DATA-FETCH-01** (and recognition that it is already owned by AUTH-05, not "none").

---

## Per-finding evidence

### DATA-FETCH-01 — adjusted (medium → low), overlap corrected (none → covered-by AUTH-05)

**Confirmed mechanics:**
- `providers.tsx:31` — single `useState(createQueryClient)`; `gcTime: 5*60_000` (`:19`).
- `app/layout.tsx:36` — `<AppProviders>` wraps the **root** layout → it wraps `/login` too
  (`app/login/page.tsx` exists; no separate auth layout outside root). Therefore
  `auth/actions.ts:137` `redirect("/login")` is a **soft navigation**; `AppProviders` does not
  remount → QueryClient survives.
- `realtime-auth-bridge.tsx:57` — `SIGNED_OUT` evicts **only** `favoritesQueryKeys.all()`.
- `useNotificationsQuery.ts:19-24` — notification keys (`["notifications"]`, `unread-count`,
  `feed`, `release-modal`) are **NOT user-scoped** → the one realistic residual-read path on a
  same-tab account switch (self-corrects in 30–60s via `staleTime`).

**Refutation attempt → why it stands but is LOW, not medium:**
1. Tenant-scoped keys (library/template/estimate/collaboration) cannot be read by key under a
   different login → **not a cross-user data leak**, only memory hygiene. (Confirms audit's own
   impact (a)/(b).)
2. The only un-scoped surface is notifications, and the leaked value (an unread *count* / feed
   preview) is low-sensitivity and self-correcting within one staleTime. That does not clear the
   bar for medium.
3. **Decisive correction:** the Auth pack's **AUTH-05** already documents this exact issue (same
   file `realtime-auth-bridge.tsx:54-58`, same `queryClient.clear()` fix) and grades it **low /
   not-a-blocker** (`.../2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security/02-REMEDIATION-PLAN.md:14,65`).
   So `existing_plan_overlap: none` was **wrong** — it is `covered-by AUTH-05`. The data-fetching
   lane's contribution is the notifications-key + Router-Cache nuance, not a new task.

**Enrichment confirmed:** `next.config.ts:64-67` sets `staleTimes.dynamic: 60` (client Router Cache,
in-memory, ignores HTTP cache-control). `proxy.ts:13,37` sets `Cache-Control: private, no-cache,
no-store` on sensitive routes → **no HTTP/CDN cross-user leak** (the only path that could have been
critical is closed). The 60s Router-Cache residual is in-tab only and is destroyed by AUTH-05's
preferred full-reload-on-signout.

### DATA-FETCH-02 — confirmed (low)
- `workspace-repository.ts:1120` — `if (process.env.WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED === "1")`;
  else `return getWorkshopHomebaseDataAppPath()` (`:1124`).
- `grep -c` of both `.env.local` and `.env.example` for the var → **0** (verified unset).
- App path waves verified: wave-1 `Promise.all` (`:1404`), wave-2 estimates (`:1492-1493`),
  wave-3 backfill (`:1512`), wave-4 H6/H7/H8 tail (`:1553`). 4 serial round-trips by data
  dependency, bounded by row caps. Refutation (could the RPC be on in prod?) — cannot prove prod
  env from repo; flagged in proof gates below.

### DATA-FETCH-03 — confirmed (low)
- `projects-page-client.tsx:1088` sets `favoriteOverrides`; `:1085-1108` shows **no**
  `router.refresh()` in `toggleProjectFavorite` and the override is never cleared (only an `onError`
  restore at `:1104`). Server `favoriteProjectIds` merged with overrides at `:706-712`. Within-tab
  correct; multi-tab stale. Matches D11/D14 design.

### DATA-FETCH-04 — confirmed (info)
- `projects/page.tsx:14` `listCurrentWorkspaceProjects()`, `:18` `requireCurrentUserContext()`,
  `:19` `ensureDefaultWorkspace()`. `cache()` at `workspace-repository.ts:802` (ensureDefaultWorkspace),
  `:863` (listCurrentWorkspaceProjects, which itself calls ensureDefaultWorkspace), `session.ts:31`
  (getCurrentUserContext; `requireCurrentUserContext` at `:87-88` delegates to it). L18/L19 are
  request-cache hits → no extra round-trip. Not a waterfall.

### DATA-FETCH-05 — confirmed (info)
- Loop over `find src/app/workshop -name page.tsx | head -1 == "use client"` → **none**.
- Only `"use client"` files under `src/app/workshop/`: `*/error.tsx` boundaries + `AdminStatusSelect.tsx`.
- `WorkshopDashboard.tsx:1-2` imports from `@phosphor-icons/react/dist/ssr` and `next/link`, no
  `"use client"` → Server Component.

### DATA-FETCH-06 — confirmed (info)
- `use-estimate-query.ts`: `initialData` + `staleTime: 5*60_000` + `enabled` gates at `:44-47`,
  `:105-108`, `:159-161`. `LibraryPageClient.tsx:104-105` `initialData: seed`, `staleTime: 5*60*1000`.

### DATA-FETCH-07 — confirmed (info)
- `providers.tsx:14-28` defaults (staleTime/gcTime 5min, refetchOnWindowFocus:false, retry:1,
  mutations retry:0). `use-estimate-row-mutations.ts:208-218` onMutate→invalidate(refetchType:"none")
  →onError-rollback pattern with deliberate `refetchType`.

---

## existing_plan_overlap re-verification (against real packs on disk)

| Finding | Audit claimed | Verified | Note |
|---|---|---|---|
| 01 | none | **WRONG → covered-by AUTH-05** | `2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security` AUTH-05 plans the identical fix at low severity. |
| 02 | covered-by Workshop-Dashboard-Query-Batching | **correct** | pack present in `.ai/09_archive/2026-06-19-Workshop-Dashboard-Query-Batching`. |
| 03 | partial:2026-06-16-Sidebar-Favorite-Projects-And-Estimates | **correct** | pack present in `.ai/03_plans/`. D11/D14 design = accepted limitation. |
| 04 | covered-by:2026-06-19-Projects-Page-Performance | **correct** | pack present in `.ai/09_archive/`; archived context, not an active launch gate. |
| 05 | covered-by memory workshop-dashboard-rsc | **correct** | matches MEMORY.md entry. |
| 06 | covered-by:2026-06-17-Performance-Refactor | **correct** | pack present. |
| 07 | none | **correct** | no prior pack owns the global TanStack defaults explicitly. |

---

## Proof gates per remediation item

### R1 (owned by AUTH-05) — broaden eviction / full-reload signout
- **Type-check:** `bun run type-check` green on `realtime-auth-bridge.tsx` (and `auth/actions.ts`
  if the full-reload option is taken).
- **Targeted test:** add/extend a Vitest that mounts `RealtimeAuthBridge`, fires a `SIGNED_OUT`
  auth event on a mocked browser client, and asserts `queryClient.clear()` (or that
  `["notifications"]` + workspace/library keys are gone), not just favorites. The favorites/sidebar
  reactivity suites already exist as a template.
- **Manual (cannot be proven by local unit tests):** sign out → sign in as a *different* closed-beta
  user in the same tab; confirm no residual notification count/feed or library data flashes from the
  warm cache before refetch. This is the authoritative gate for the confidentiality nuance — unit
  tests can prove the eviction call fires but **cannot** prove the absence of a UI flash across a
  real soft-nav timing window.
- **Honest limits:** local checks **cannot** prove (a) the prod value of
  `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED` (DATA-FETCH-02 — provider/env check required), nor (b) the
  real cross-account timing window (manual only). `bun run validate` is known-red on main for
  unrelated reasons (charts set-state-in-effect; ProposalExportPreviewDialog design-lint) — scope
  verification to touched files, do not block on the full gate.

### Non-action confirmations (no fix, evidence is the gate)
- **DATA-FETCH-02:** `rg -c WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED .env.local .env.example` → 0/0
  (done). Prod env var must be confirmed unset by a Vercel env check before relying on the app path.
- **DATA-FETCH-05 (optional guard):** a test asserting `WorkshopDashboard.tsx` source does not
  contain `"use client"` would lock the boundary; proof = the test passing.
