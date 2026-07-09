# 18 — Stack Contract and Production Standards

Consolidates the version-sensitive stack decisions for this plan. Verified from source this cycle.

## Stack baseline (verified)
- `next` **16.2.10**, `react`/`react-dom` **19.2.7**, `@tanstack/react-query` **5.100.14**, `zustand` **5.0.14** (`package.json`).
- OpenNext on Cloudflare Workers; D1/R2/DO/Queue/Email (not touched here).
- `tsconfig.json`: `strict:true`, `moduleResolution:"bundler"`, `isolatedModules:true`.

## Next.js 16 config posture (verified from `next.config.ts`)
- **`cacheComponents`: OFF** (no key present) — load-bearing for this plan: `export const dynamic`/`revalidate`/`fetchCache` remain valid APIs; `<Activity>`-based nav state preservation is NOT active.
- **`experimental.staleTimes = { dynamic: 60, static: 180 }`** — deliberate (comment lines 94-101); reused layout chunks are NOT refetched on nav (this is the property Phase 1 relies on). Keep unchanged. Note: `staleTimes` is still `experimental` per bundled docs.
- **React Compiler: OFF** (no `reactCompiler` key; no `babel-plugin-react-compiler` installed). Non-goal for this fix (P2-4).
- **View Transitions: OFF** (no `experimental.viewTransition`; no `startViewTransition`/`<ViewTransition>`). Non-goal (P2-4).
- **`@next/bundle-analyzer`** installed (16.2.6), env-gated `ANALYZE=true`. Optional before/after payload evidence (P2).
- **Route segment config:** NONE in `src/app/workshop/` today.

## Route segment config decision (resolves P2-3)
**Decision: do NOT add `export const dynamic = "force-dynamic"`.** Rationale: `workshop/layout.tsx` already calls `await headers()` + `getCurrentUserContext()`/terms reads, which **automatically opts the route into dynamic rendering** (Next.js detects the dynamic API). `force-dynamic` would be redundant (and is removed entirely once Cache Components is enabled). A code comment documenting the dynamic mode is cheaper than a soon-deprecated export. `runtime` stays default (`nodejs`, required for better-auth/D1 client).

## Server/Client component boundaries (after Phase 1)
- **`WorkshopShell`** — Server Component (renders persistent chrome; calls `cookies()` for sidebar widths — stays server). Renders `<MainSidebar/>` (client) inside `<Suspense>`.
- **`WorkshopRouteHeader`** — Server Component (page-supplied title/breadcrumbs). May contain client children (`actions` slots).
- **`MainSidebar`** — `"use client"` (unchanged). Benefits from no longer remounting.
- **`"use client"` scope:** unchanged — no new client boundaries introduced. The client store for `sidebarStatus` (OPEN-1) reuses the existing client-store pattern.

## Data fetching / caching / rendering contract (per-route)
| Route/segment | Rendering | Data owner | Cache/revalidation |
|---|---|---|---|
| `workshop/layout.tsx` | **dynamic** (reads `headers()`, session) | gate reads (security) | no-store (auth/private) — unchanged |
| `workshop/page.tsx` | dynamic (dashboard fetch) | `getWorkshopHomebaseData` etc. | per existing `withPerfTraceRequest`; TanStack Query client cache for favorites |
| `workshop/proposals/page.tsx` | dynamic | `listRecipientProposals` (server) | `<Suspense>` around `ProposalsData`; TanStack Query client cache |
| Top-level loading.tsx | static shell + dynamic content | — | `staleTimes.dynamic:60` |
| `library/*`, `projects/[projectId]/*` | dynamic | existing repos | unchanged |

No mutation/`revalidate*` changes in scope. Read-your-own-writes behavior unchanged.

## Suspense / streaming contract (resolves streaming guidance)
- `WorkshopShell` renders immediately; `<AuthenticatedMainSidebar>` wrapped in its own `<Suspense fallback={<MainSidebarShellFallback/>}>` (sidebar streams in without blocking shell — same as today at `WorkshopPageShell.tsx:178-180`).
- Content slot: `<Suspense fallback={<WorkshopContentSkeleton/>}>{children}</Suspense>` — the leaf page streams its content; chrome is already painted.
- **Gate reads are NOT in a Suspense** (SEC-T1): they run synchronously first; the shell renders only after gate passes.

## Bundle / RSC payload impact
- Net **reduction**: shell JSX currently duplicated into each of 14 pages' RSC trees; after Phase 1 it lives once in the layout and is reused (cached client-side per `prefetching.md:191-193`). Optional `ANALYZE=true` before/after evidence.

## Hydration / browser-only containment
- No new browser-only code. `MainSidebar` hydration behavior unchanged (its `initialData` seeding + lazy hydration stays). No hydration mismatch risk introduced.

## TypeScript / validation
- All new components typed (`WorkshopShellProps`, `WorkshopRouteHeaderProps`). No `any`. Discriminated unions unchanged.
- `cloudflare-env.d.ts`: NOT regenerated (no binding change).

## Non-goals (explicit, with evidence)
- React Compiler (OFF; separate evaluation).
- View Transitions (OFF; not on critical path of remount fix).
- `export const dynamic` (redundant; do not add).
- `cacheComponents`/`<Activity>` (Phase 4 optional, owner-gated).
