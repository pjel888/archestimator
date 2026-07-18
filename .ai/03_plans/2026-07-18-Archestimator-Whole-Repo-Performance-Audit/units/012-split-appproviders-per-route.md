# UNIT-012 — Global AppProviders Ships 8 Providers To Every Route · PERF-FE-002

**Finding:** PERF-FE-002 · **Priority:** P2 · **Wave:** 2 (W2-3 / HL-3) · **Effort:** M · **Risk:** Medium
**Roadmap item:** W2-3 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

Public routes (`/`, `/share/*`, `/auth/*`) ship only the providers they need
(QueryClient, Bfcache, WebVitals); workshop routes add Toast, Notification,
NavigationListener, RealtimeAuthBridge (until UNIT W2-4 removes it), and
RouteLoadingOverlay via a workshop-scoped provider tree. Main-bundle bytes
on public routes drop measurably (magnitude per W0-4 baseline).

## Affected surface

- `src/app/layout.tsx:39` — `AppProviders` mount point (root layout)
- `src/app/providers.tsx:31-49` — the 8-provider composition
- `src/features/notifications/components/NotificationProvider.tsx:6` —
  statically imports `ReleaseAnnouncementModal`
- **New file (likely):** `src/app/workshop/layout.tsx` workshop-scoped
  provider mount (if it does not already exist)

## Dependencies

- **W0-4 bundle baseline** (`ANALYZE=true bun run build`) — required to
  *measure* the byte reduction. Static change can ship without it.
- **Characterization test for provider relocation** (per finding "Risk:
  Medium — provider relocation can subtly break context inheritance"). A
  characterization test confirms Toast/notification functionality remains in
  the workshop and auth/share routes still render correctly.
- **Pairs with W2-4 (RealtimeAuthBridge removal)** — removing the no-op
  provider first makes the split cleaner, but is not a hard prerequisite.
- No AUTH_BOUNDARY items for source change; bundle baseline is build-gated.

## Implementation intent

From PERF-FE-002 "Recommendation" (do 1-3; 4 is a follow-up):

1. **Split `AppProviders`** into:
   - `PublicProviders` — `QueryClientProvider` + `BfcacheHandler` +
     `WebVitalsCollector` (the minimum every route needs).
   - `WorkshopProviders` — `ToastProvider` + `NotificationProvider` +
     `NavigationListener` + `RealtimeAuthBridge` (until W2-4) +
     `RouteLoadingOverlay`.
2. **Mount `WorkshopProviders` in `src/app/workshop/layout.tsx`** (create the
   file if absent). `PublicProviders` stays in `src/app/layout.tsx:39`.
3. **Move `ReleaseAnnouncementModal` to `next/dynamic` import** inside the
   workshop surface (currently statically imported at
   `NotificationProvider.tsx:6`), so its bytes leave the public bundle.
4. **(Defer to W2-4)** remove `RealtimeAuthBridge` entirely (returns `null`,
   documented transitional).

Constraints (from finding): Toast/notification functionality must remain in
the workshop; auth/share routes must continue to render correctly. Run the
characterization test before/after the relocation.

## Expected evidence

Verification command from PERF-FE-002 "Verification":

```
# Bundle analyzer route bytes for /, /share/[token], /auth/login before/after
ANALYZE=true bun run build   # (build gate — W0-4 baseline)
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing
`PublicProviders` in `layout.tsx`, `WorkshopProviders` in
`workshop/layout.tsx`, and `ReleaseAnnouncementModal` behind `next/dynamic`
is the decisive non-test signal). The bundle-byte reduction is build-gated
follow-up that confirms the magnitude (per finding, the magnitude is
HYPOTHESIS until W0-4).

## Completion signal

- `src/app/layout.tsx:39` mounts `PublicProviders` (3 providers) not
  `AppProviders` (8 providers).
- `src/app/workshop/layout.tsx` mounts `WorkshopProviders`.
- `NotificationProvider.tsx:6` no longer statically imports
  `ReleaseAnnouncementModal` — it is loaded via `next/dynamic` inside the
  workshop.

## Recovery path

**Required (Risk: Medium).** If provider relocation breaks context inheritance
(e.g. Toast context missing in a workshop subtree, or auth routes fail to
render), restore the single `AppProviders` in `src/app/layout.tsx:39`. The
`next/dynamic` move of `ReleaseAnnouncementModal` can stay (it is independent
of the provider split). Run the characterization test before declaring the
split stable; if it fails, revert and re-audit the context boundaries before
re-attempting.
