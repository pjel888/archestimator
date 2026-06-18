# Workshop Dashboard — PHASE 5 CLOSE NOTE

Built on `feat/sidebar-redesign`. The empty greeting shell is now the "command
center" homebase: greeting hero, continue-where-you-left-off, creation CTAs,
recent projects + sheets, a real favorites tree, quick links, library spotlight,
honest stat strip, and a designed first-run state — all on a warm-bloom + liquid
glass canvas, wired to the existing data layer with zero fabricated values.

## New fonts
- **Zilla Slab** (display) via `next/font/google` in `src/app/layout.tsx` → `--font-display` / `font-display`.
- **Roboto Mono** reused (already loaded) → `--font-numeric` / `font-numeric` for codes/dates/totals.

## New tokens (globals.css)
- `--font-display`, `--font-numeric` (`@theme inline`).
- `--brand-amber` `#e7a977`, `--brand-peach` `#f4cdb0` — warm-bloom mid-stops (brand family).
- Classes: `.workshop-dashboard-bloom` (bottom-right gradient bloom), `.dashboard-grid-pattern`
  (faint drafting dot-grid), `.dashboard-glass` / `.dashboard-glass-warm` (frosted CTA panels,
  reusing the `--glass-*` recipe) with `@supports` + `prefers-reduced-transparency` fallbacks.

## New components (`src/components/workshop/dashboard/`)
`WorkshopDashboard` (compose) · `DashboardGlassPanel` (surface primitive) · `DashboardHero` ·
`ContinueCard` · `CreateActions` · `QuickLinks` · `RecentProjectsList` · `RecentSheetsList` ·
`FavoritesTree` (a11y tree) · `LibrarySpotlight` · `DashboardStatStrip` · `DashboardEmptyState` ·
`lib.ts` (types + route helpers + formatters).

## Data — all real, all reused
- `getWorkshopHomebaseData()` → greeting/recent projects+sheets/continue (`firstNodeId` deep-link).
- `listMainSidebarFavoriteProjects()` → favorites tree (per-sheet favoriting confirmed in recon).
- `getLibraryOverview()` → spotlight + counts; fetched in parallel, **degrades to null on failure**
  so it never blocks the dashboard. No fabricated metrics — project/sheet counts are labelled
  "recent" (homebase caps at 12), library counts are real totals.

## Wiring touched (shared files)
`src/app/workshop/page.tsx` (parallel fetch), `WorkshopHomebaseClient.tsx` (renders banners +
`WorkshopDashboard`; greeting moved to `DashboardHero`), `src/app/workshop/loading.tsx`
(dashboard skeleton), `scripts/enforce-app-design-system.mjs` (dashboard px-exemption),
`DESIGN.md` (named exception documented), `.impeccable/config.json` (2 confirmed bloom colors).

## ⚠️ Conflicts resolved (surfaced, not silent)
1. **Locked "sparse" tests rewritten.** `tests/vitest/workshop-reset.test.tsx` and
   `tests/unit/reset-baseline.test.ts` were interim guards from the redesign branch that
   asserted the homebase stay empty (no projects/favorites/route-cards, no `Promise.all`).
   The directive supersedes them; both were rewritten to assert the dashboard while
   **preserving the greeting a11y contract** (region label, sun/moon icon role, tone regex,
   name fallback). `workshop-pending-invite.test.tsx` updated (new props; `Promise.all` allowed).
2. **12px type cap.** Resolved with the path-scoped dashboard typography exception (above),
   the same mechanism already used for `/share` and the sidebar glass.

## Verification
- `tsc --noEmit`: clean. `next build`: **compiled successfully** (exit 0, `/workshop` built, Zilla Slab resolved, 35/35 pages).
- `lint:design-system`: pass. Dashboard dir: **0** impeccable findings, **0** eslint errors/warnings.
- Tests: `tests/unit` 24 pass; dashboard DOM + enforcer-guard + pending-invite + sidebar-favorites suites green.
- **a11y/contrast (by construction):** load-bearing text uses `text-ink` (#3D3D3D ≈ 10.7:1) / `text-secondary`
  (#5d5d5d ≈ 7:1) — both clear AA over the warm bloom (low-alpha tint over white) and frosted glass;
  `text-tertiary` (#7f7f7f, 3.6:1) is used only for non-load-bearing metadata. Favorites tree is a real
  `role="tree"` with roving tabindex, `aria-expanded`, `aria-selected`, keyboard expand/collapse.
  Reduced-motion / reduced-transparency honored; blur layers capped; lists sliced to ≤6.

## ⚠️ Pre-existing (NOT introduced here — verified via `git stash`)
On `feat/sidebar-redesign` before this work: `bun run lint` has 5 errors (`.gitnexus/run.cjs`,
`sidebar/useLiquidGlassRefraction.ts`); `lint:design` flags 21 colors in `ui/spinner.tsx` +
`landing/*`; `test:dom` has 10 failing files (estimates / legal-terms / security-tooling /
workspace-repo-project-list) — none import dashboard files; stashing all my changes reproduces them.

## Outstanding NEEDS INPUT (Philip)
1. **Display font** — shipped Zilla Slab per the §J recommendation; confirm or name another slab.
2. **True totals** — a low-cost active-project/sheet `count` query could replace the "recent" framing if you want real workspace totals on the stat strip.
3. **Mobile** — desktop-first; the dashboard stacks to one column. Confirm no dedicated mobile layout needed for v1.
4. A stale doc string ("empty `WorkshopHomebaseClient`") in the closed-beta evidence index is now inaccurate; update when convenient (non-blocking).
