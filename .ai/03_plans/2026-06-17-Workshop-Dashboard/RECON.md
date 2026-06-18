# Workshop Dashboard — PHASE 0 RECON (findings)

> Source of truth = the repo. Compiled from 7 parallel recon sweeps on
> `feat/sidebar-redesign` @ `1025581b`. Quotes use verbatim token / file / symbol names.

## Stack & conventions
- **Next.js 16.2.6, App Router** (`src/app/`). Runtime **Bun** (`bun.lock`). TS path alias `@/* → ./src/*`.
- **Tailwind CSS v4.3.0**, CSS-config style: `@import "tailwindcss"` + `@theme inline` in `src/app/globals.css` (no `tailwind.config`).
- **shadcn/ui** (New York, `src/components/ui/`). Icons: **Phosphor** (`@phosphor-icons/react/dist/ssr`) in app chrome + lucide default.
- **TanStack Query 5.100** (provider `src/app/providers.tsx`, staleTime 5m). **Zustand 5** (`src/stores/`).
- **Fonts via `next/font/google`** in `src/app/layout.tsx` — currently only `Roboto_Mono` → `--font-roboto-mono`. Body font is the system stack `--font-sf-pro`. **Light mode only**, no theme provider.
- Scripts: `type-check` (`tsc --noEmit`), `lint` (eslint), `lint:design-system` (`scripts/enforce-app-design-system.mjs`), `lint:design` (impeccable detect), `test` (`bun test tests/unit`), `test:dom` (vitest), `validate` runs all. Build `next build`.

## Design system & tokens (verbatim)
- Canvas `--canvas/--warm-canvas: #f5f5f5`; surface `--surface: #fff`; ink `--ink/--primary: #3D3D3D`; `--secondary: #5d5d5d`; `--tertiary/--muted: #7f7f7f` (**fails AA, 3.6:1** — metadata only); `--muted-foreground: #6b6b6b` (5.3:1, AA-safe); `--hairline/--divider: #f2f2f2`.
- **Warm brand accent = `--brand-orange: rgb(170,65,42)`** (+`--brand-orange-dark`, `--brand-orange-soft`). Used by sidebar active pill (`--glass-nav-active-bg`) + logo slab.
- **Glass recipe already tokenised** (sidebar-scoped, authorized 2026-06-17): `--glass-bg rgba(255,255,255,.72)`, `--glass-bg-fallback #fbfbfc`, `--glass-blur 18px`, `--glass-saturate 145%`, `--glass-border`, `--glass-inset-hi`, `--glass-shadow`, `--glass-radius 12px`, `--glass-nav-radius 8px`. Classes `.sidebar-glass*`.
- **Type scale is COMPACT and HARD-CAPPED at 12px** for app/workshop by `enforce-app-design-system.mjs` (named sizes banned; only `text-[8px]`…`text-[12px]`; weights normal/medium only; `font-mono/serif` banned; radius only `rounded-xs` or `var(--glass-radius|--glass-nav-radius)`). Path-scoped exceptions already exist for landing pages and `/share` (Client Portal). **→ The directive's display hero requires a new, equally path-scoped exception.**
- Radius `--radius-xs: 3px`. Spacing tight (xs4/sm8/md12/lg20). One soft shadow per surface (`--glass-shadow`).

## Data model (real tables)
- `projects` (id, name, client_name, project_code, location, currency_code, **created_at, updated_at** — no last_opened_at).
- `estimates` = the "estimate sheets" (FK `project_id`, name, sheet_code, updated_at). Project→estimates is 1-to-many.
- Library: **`cost_library_items`** = Components; **`estimate_templates`** = Templates. Routes `/workshop/library/{components,templates}`.
- **Favorites exist at BOTH levels**: `project_favorites (user_id,project_id)` + `estimate_favorites (user_id,estimate_id)`. → **Favorites tree (fav projects ▸ nested fav sheets) is fully supported.**
- **No last_opened_at / activity log** → "recent" = `updated_at` proxy (acceptable, documented).
- Aggregates are **computable**: RPC `estimate_sheet_total()`, `project_estimate_list_summaries`; `getLibraryOverview()` returns real `componentCount/templateCount/...`. No materialized totals.
- `project_groups` + memberships exist (per-user) — out of dashboard scope v1.

## Existing data-access (REUSE — no parallel layer)
- **`getWorkshopHomebaseData(): WorkshopHomebaseData`** (`workspace-repository.ts:1050`) → `{ workspace, projects: WorkshopProjectSummary[≤12], estimates: WorkshopEstimateSummary[≤12], pendingInvites, removedProjectFavorites, receivedPendingInviteCount }`. Already merges recent (`updated_at` desc) + favorites. **This is the dashboard's spine.**
  - `WorkshopEstimateSummary` carries `id, project_id, name, sheet_code, updated_at, projectName, projectCode, **firstNodeId**, isFavorite` → enables the **Continue deep-link** `/workshop/projects/{project_id}/estimates/{firstNodeId}`.
- **`listMainSidebarFavoriteProjects(): MainSidebarFavoriteProject[]`** → already a tree: `{id,name,projectCode,href,favoriteEstimateSheets:[{id,name,sheetCode,href}]}` (≤8 projects, ≤5 sheets). React-cached.
- **`getLibraryOverview(): LibraryOverview`** → counts + `recentComponents[6]` + `recentTemplates[5]`.
- Mutations: `createProject(FormData)` (redirects), `createEstimateSheetDraft(projectId)` / `createEstimate(projectId,FormData)`, `setProjectFavorite`/`setEstimateFavorite`, hooks `useToggleProjectFavorite/useToggleEstimateFavorite`, `useSidebarFavoritesQuery` + `favoritesQueryKeys`.

## Routing & nav
- Dashboard route `/workshop` → `src/app/workshop/page.tsx` (async server). Shell `WorkshopPageShell.tsx` (sidebar + floating white surface + `WorkshopGlassBackdrop`). Greeting in `WorkshopHomebaseClient.tsx`.
- Links: Projects `/workshop/projects`, Library `/workshop/library` (+`/components`,`/templates`), Settings `/workshop/settings`. No central `routes.ts`.
- Nav: sidebar (Phosphor) Workshop/Projects/Library + Favorites. `MainSidebar.tsx`. Navigation via `next/link` + `useNavigationRouter`.

## Current Workshop page
- `WorkshopHomebaseClient` renders banners + a **sparse greeting** in `div.flex...bg-white.p-2`. Greeting `<section aria-label="Workshop greeting">` with `getWorkshopGreetingTone()` (time-of-day, sun/moon icon role) + `formatWorkshopGreetingName()` (`"there"` fallback). SSR placeholder → `useIsHydrated()` swap (timezone-safe). **These hooks must be preserved.**
- `WorkshopGlassBackdrop` already seeds a faint bottom-right `rgba(170,65,42,0.022)` bloom — global/calm; **do not amplify globally** (it backs every workshop screen). Dashboard gets its own scoped bloom.

## Responsive
- **Desktop-first, mobile graceful degradation.** Tailwind v4 default breakpoints (sm640/md768/lg1024/xl1280). Sidebar `hidden lg:flex` rail. Lists use user view-modes + `auto-fill` grids. `prefers-reduced-motion` + `prefers-reduced-transparency` already honored in `globals.css`; **no dark mode**. DESIGN.md aspires to tablet drawers (not yet built).

## ⚠️ Conflicts surfaced (per directive §B1)
1. **Locked "sparse" tests** — `tests/vitest/workshop-reset.test.tsx` + `tests/unit/reset-baseline.test.ts` (a source-grep) assert the homebase has *no* projects/favorites/routes and forbid `Promise.all` in `page.tsx`. They are an interim lock from the redesign branch. The directive supersedes them → **both rewritten** to assert the dashboard (greeting a11y hooks preserved). Flagged in close note.
2. **12px type cap** vs. directive's display hero → resolved with a **path-scoped dashboard typography exception** (new), mirroring the existing `/share` exemption. Documented in DESIGN.md.

## ⚠️ NEEDS INPUT (carried to IA)
- **Q1 font** — defaulting to **Zilla Slab** (display) + reuse existing **Roboto Mono** for numerics (no new mono dep). Philip may override the family.
- **Total project/sheet COUNTS** — `getWorkshopHomebaseData` caps at 12, so it is *not* a true total. Library counts are real (`getLibraryOverview`). Dashboard stat strip will surface **only** real counts (library) + "recent" framing for projects/sheets; a true active-project count would need a lightweight `count` query (proposed, low-cost) — flagged, not faked.
