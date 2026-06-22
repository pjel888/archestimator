# 07 — Requirements Traceability

> **Audit-2 (2026-06-16):** Added R14–R20 (scope sourcing, server-action loader, `staleTime`, optimistic
> timestamp, logout clear, focus management, required legibility cue). Test names are authoritative here and
> match `03` §3 and `09`.

## Requirements

| ID | Requirement | Files/units | Acceptance evidence |
|---|---|---|---|
| R1 | Project favorite updates card and sidebar optimistically without `router.refresh()`. | U3/U7; `projects-page-client.tsx:508`, `use-toggle-project-favorite` | Component/browser test (QA-01). |
| R2 | Estimate favorite under a visible sidebar favorite project, within the top-8 project cap, updates row and sidebar optimistically. | U4/U7; estimate page/client/table/button, `use-toggle-estimate-favorite` | Component/browser test (QA-03). |
| R3 | Estimate favorite under non-favorited or currently hidden parent project updates row only **and** fires the required legibility cue. | U1/U4/U7; shaping helper, estimate mutation | Helper + component test, reload parity (QA-04, QA-07). |
| R4 | Query key is scoped by workspace and user, built by one shared helper. | U1/U2; `favoritesQueryKeys.sidebar`, shell, query hook | Unit/component test for scope mismatch (QA-12). |
| R5 | Query has a `"use server"` loader as its `queryFn` (not a route handler). | U1/U2; `sidebar-favorites-actions.ts`, query hook | `invalidateQueries` refetch test or code proof. |
| R6 | Sidebar DTO carries non-null `favoriteCreatedAt`, emitted from both shaping sites. | U1; sidebar types, repository reader `:1259-1282` | Typecheck + helper sort tests. |
| R7 | Optimistic helper matches server caps/order. | U1; pure helper | 8-project and 5-sheet trim tests (QA-05, QA-06). |
| R8 | Rollback reverts every touched surface from one snapshot. | U3/U4/U7; project/estimate mutations | Mocked rejection tests (QA-10, QA-11). |
| R9 | Server actions validate ids, boolean input (exact shape), and workspace membership. | U6; `src/lib/workshop/actions.ts` | Invalid/cross-workspace tests or targeted code review (QA-13, QA-14). |
| R10 | No deprecated one-arg `revalidateTag` is added. | U6; server actions/cache code | Code review / grep (compile-checked in Next 16). |
| R11 | Homebase removed-project favorite action routes through the shared project mutation, preserving its `router.replace` navigation. | U5; `WorkshopHomebaseClient.tsx:73-84` | Test or code inspection. |
| R12 | UX states match the expanded `08` (loading, focus, live regions, insert animation). | U7; `MainSidebar`, star controls | Component tests + manual/browser proof where available. |
| R13 | Concurrent dirty files are preserved. | U0; worktree | `git status` before/after; no unrelated reversions (see `12`). |
| R14 | Loader is a server-side-authenticated Server Action; no CDN-cacheable GET surface for favorites. | U1/U6; `sidebar-favorites-actions.ts` | Code review (`13` C1). |
| R15 | Project-favorite delete includes `workspace_id`; both actions runtime-validate the boolean. | U6; `actions.ts` | Negative tests / code review (`13` C2, QA-13). |
| R16 | Scope change explicitly `removeQueries` the previous scope before render/prefetch. | U2; query hook | Scope-mismatch test (`13` C4, QA-12). |
| R17 | Logout clears the favorites cache (`favoritesQueryKeys.all()`). | U2/U5; logout/`RealtimeAuthBridge` | Logout cache test (`13` C5, QA-17). |
| R18 | Favorites query uses `staleTime: 0` so invalidation + per-route remount refetch. | U2; query hook | Refetch-on-navigation test or code proof (QA-19). |
| R19 | Optimistic insert synthesizes `favoriteCreatedAt` and sorts to top; `onSettled` reconciles. | U1/U3/U4; helper + hooks | Helper test + mutation test. |
| R20 | Focus survives item removal/rollback; no escape to `<body>`; active-route unfavorite handled. | U7; `MainSidebar`, focus rescue | Focus test (QA-18, QA-21). |

## Implementation units

| Unit | Scope |
|---|---|
| U0 | Preflight, dirty-file ownership (read `12`), current behavior tests. |
| U1 | Scoped query key + shared builder, `"use server"` loader, DTO timestamps + shaping, pure shaping/sort/trim/synth helpers. |
| U2 | Sidebar query hook (`staleTime: 0`), explicit scope-change eviction. |
| U3 | Project favorite mutation hook (shared internal helper). |
| U4 | Estimate favorite mutation hook + parent metadata threading + required cue. |
| U5 | Homebase removed-project action alignment (preserve navigation); logout cache clear. |
| U6 | Server action validation/hygiene (boolean shape, workspace_id authz). |
| U7 | UX state implementation (loading/focus/live-region/animation) + focused validation. |

## Focused validation

```sh
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/sidebar-favorites-shaping.test.ts --maxWorkers=1
bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx tests/vitest/estimate-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```

Note: `tests/vitest/main-sidebar-favorites.test.tsx` **already exists** and must be **updated** (not created):
add `favoriteCreatedAt` to fixtures and wrap the render in a `QueryClientProvider` once `MainSidebar` is
query-wired. Run authenticated Playwright proof when auth state is available; otherwise record the gap.
