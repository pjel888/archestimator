# 02 — Remediation Plan: Data Fetching, Caching & RSC Architecture

**Date:** 2026-06-19 · **Lane:** Domain 8 (Data Fetching / Caching / RSC)
**Verifier verdict:** Prior audit is substantially correct and appropriately conservative.
**Launch blockers in this domain: 0.** One LOW hardening item (DATA-FETCH-01, *severity adjusted
down from medium*) that is **already owned by the Auth-And-Session-Security pack (AUTH-05)** — this
lane contributes a nuance, not a separate task. Everything else is covered-by a prior pack or
correct-as-designed INFO.

## Verification outcome summary

| ID | Prior sev / blocker | Verdict | Final sev / blocker | Why |
|---|---|---|---|---|
| DATA-FETCH-01 | medium / false | **adjusted** | low / false | Mechanics confirmed, but severity inflated vs the cross-domain owner. AUTH-05 in the Auth pack already plans the identical fix (same file/lines/`queryClient.clear()`) and grades it **low**. The notifications-key nuance is real but self-correcting in 30–60s on the rare same-tab account switch — does not justify medium. |
| DATA-FETCH-02 | low / false | **confirmed** | low / false | Env-gated RPC (`process.env.WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED === "1"`, L1120) verified unset in `.env.local`/`.env.example`; 4-wave app path is live; bounded by row caps. No launch action. |
| DATA-FETCH-03 | low / false | **confirmed** | low / false | `toggleProjectFavorite` (L1085-1108) sets `favoriteOverrides`, never `router.refresh()`, never clears the map. Within-tab correct; multi-tab divergence only. Accepted-by-design (D11/D14). |
| DATA-FETCH-04 | info | **confirmed** | info | `ensureDefaultWorkspace` (L802), `getCurrentUserContext` (session.ts:31), `listCurrentWorkspaceProjects` (L863) all `cache()`-wrapped → no waterfall. Record-only. |
| DATA-FETCH-05 | info | **confirmed** | info | No `workshop/**/page.tsx` is a client component; only `error.tsx` + `AdminStatusSelect` carry `"use client"`. `WorkshopDashboard` is a Server Component. |
| DATA-FETCH-06 | info | **confirmed** | info | Estimate/library hooks seed `initialData` + `staleTime: 5*60_000` + `enabled` gates. No double-fetch. |
| DATA-FETCH-07 | info | **confirmed** | info | TanStack defaults sane; mutations use onMutate→optimistic→onError-rollback→onSettled-invalidate with deliberate `refetchType`. |

**New enrichment (not a separate finding):** Next.js client **Router Cache** `staleTimes.dynamic: 60`
(`next.config.ts:64-67`) keeps a rendered dynamic RSC segment for 60s in the tab's JS heap. HTTP
`Cache-Control: private, no-store` is correctly set on sensitive routes (`proxy.ts:13,37`), so there
is **no CDN/proxy/HTTP cross-user leak** (the only path that could have been critical). The Router
Cache is in-memory and wiped on any full document load, so the residual window is the same narrow
same-tab account-switch case as DATA-FETCH-01 — and the AUTH-05 full-reload-on-signout option
(`window.location` instead of soft `redirect()`) clears it too. Folded into the AUTH-05 note below.

---

## Remediation items (prioritized)

There are **no launch-blockers** in this lane. The single actionable item is LOW and primarily
owned elsewhere. It is listed first only because it is the one thing that could touch confidentiality.

### R1 — (LOW, owned by Auth pack AUTH-05) Broaden signed-out cache eviction + prefer a full reload on signout

**Status:** **Defer to / coordinate with** `2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security`
AUTH-05. Do **not** double-implement. This lane's job is to (a) confirm the fix is correct from the
data-fetching side and (b) hand the notifications-key + Router-Cache nuance to that pack.

**Confirmed mechanics (this lane):**
- One long-lived `QueryClient` created once (`providers.tsx:31`, `useState(createQueryClient)`),
  `gcTime: 5*60_000`. `AppProviders` is mounted at the **root layout** (`app/layout.tsx:36`), so it
  wraps `/login` too — `signOut()`'s `redirect("/login")` (`auth/actions.ts:137`) is a **soft
  navigation**; the QueryClient and all non-favorites entries survive in memory up to `gcTime`.
- `realtime-auth-bridge.tsx:57` evicts **only** `favoritesQueryKeys.all()` on `SIGNED_OUT`.
- **Notifications keys are NOT user-scoped** (`useNotificationsQuery.ts:19-24`:
  `["notifications"]`, `["notifications","unread-count"]`, `["notifications","feed",cursor]`,
  `["notifications","release-modal"]`). On a fast same-tab sign-out → sign-in as a *different*
  account, the prior user's cached unread count / feed can momentarily display until `staleTime`
  (30s unread / 60s feed) triggers a refetch with the new user's server action. The library/
  template/estimate/collaboration keys are tenant-scoped by `userId`+`workspaceId` or UUID, so they
  cannot be *read by key* under a different login — they are memory-hygiene only.

**Concrete steps (to be done in the Auth lane, with this nuance applied):**
1. In `src/components/realtime-auth-bridge.tsx`, in the `SIGNED_OUT` branch (currently L55-58),
   replace `queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() })` with
   `queryClient.clear()`. This removes the need to enumerate keys as new caches are added and closes
   the un-scoped-notifications residual-read path. Keep the `void applyAuth(undefined)` call.
2. **(Stronger, AUTH-05's preferred option)** Change signout to a **full reload** rather than a soft
   redirect: have the signout entry point navigate via `window.location.assign("/login")` (client)
   or keep the server `redirect("/login")` but trigger a hard reload on the resulting `SIGNED_OUT`
   event. A full document load destroys both the TanStack QueryClient **and** the Next.js client
   Router Cache (which `queryClient.clear()` alone does not touch), eliminating the 60s
   `staleTimes.dynamic` residual RSC segment as well. This is the single change that closes both
   cache surfaces.
3. If option (2) is taken, step (1) becomes belt-and-suspenders (still cheap; keep it).

**Files:** `src/components/realtime-auth-bridge.tsx` (single-line eviction broadening). Optional
signout-reload touches `src/lib/auth/actions.ts` and/or the client signout trigger — **owned by the
Auth lane**, not this one.

**Migration / RLS notes:** None. No DB or RLS change.

**Risk:** Very low. `queryClient.clear()` on signout only forces a clean refetch on next login
(the desired behavior). A full-reload signout slightly slows the logout transition (one document
load) — acceptable and arguably more correct for a logout.

**Effort:** S (eviction broadening) / S–M (if the full-reload signout is also adopted, Auth lane).

**Dependencies:** Auth-And-Session-Security (AUTH-05) is the owner. Coordinate so the fix lands once.

---

## Explicitly NOT planned (confirmed non-actions)

- **DATA-FETCH-02 (homebase 4-wave fetch):** No launch action. Enabling the
  `workspace_homebase_summary` RPC requires applying its migration to prod (PITR disabled / branch-DB
  caveats) and measuring per the archived `2026-06-19-Workshop-Dashboard-Query-Batching` protocol —
  out of lane, not needed for closed beta. The app path is bounded by `WORKSHOP_HOMEBASE_ITEM_LIMIT`.
- **DATA-FETCH-03 (favorite override not reconciled):** Accept for launch. Multi-tab/multi-device
  divergence only; single-user MVP. Future option: drive the card star off the shared sidebar
  favorites query instead of a separate override map, or `broadcastQueryClient`.
- **DATA-FETCH-04/05/06/07:** INFO/positive evidence. No action. Optional nice-to-have: a lint/test
  guard asserting `WorkshopDashboard` stays a Server Component (DATA-FETCH-05) to catch a future
  `"use client"` regression — not a launch item.

## Cross-domain handoffs (route to owners)

- **Auth & Session Security (domain 1):** Owns R1 / AUTH-05. Apply the notifications-key +
  Router-Cache nuance above when implementing.
- **DB Schema / Indexing (domain 3):** Confirm composite-index coverage for the homebase/projects
  fetch shapes (`workspace-repository.ts` waves at L876, L971, L1404, L1492, L1512, L1553):
  favorites by `(workspace_id,user_id,created_at)`, estimates by `project_id`, nodes by
  `estimate_id`. Out of this lane.
- **Observability (domain 9):** `traced(...)` / Server-Timing labels exist on the homebase path
  (`workspace-repository.ts:1337,1553`). Confirm they surface in RUM rather than being dropped.

## Sequencing

1. **R1** — coordinate with Auth lane; land once (their pack, this nuance). LOW, reversible.

No other items. This lane is launch-ready as-is; R1 is defense-in-depth hardening, not a gate.
