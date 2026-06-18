# Dashboard v2 — Bento build spec (synthesized + owner-calibrated)

Owner directive 2026-06-18: full-width bento, liquid-glass + color-blocking + complex
gradients, Roboto Mono voice, simpler bg, warm-dark sidebar + square bigger logo.
Dashboard dir is FULLY design-system-exempt (enforcer) — explore boldly, stay on-brand.

## Layout — full-bleed, 3 bands (no centered max-w)
Scroll container: `w-full px-4 lg:px-6 py-4`, background `var(--grad-canvas-wash)`.
Root grid rows: `auto auto 1fr` (masthead · image band · working desk), row-gap 16.

- **Masthead** `grid-cols:[minmax(0,1fr)_minmax(320px,0.9fr)]` (sm:1col): left = greeting hero; right = **ContinueCard** (HERO #1, rich warm glass).
- **Image band** lg `grid-cols:[1.6fr_1fr_1fr_1fr]` rows `clamp(168px,19vw,232px)`; md 2×2; sm 1col. Order: **Projects (1.6fr) · Components · Templates · Library-hub**.
- **Working desk** lg 12-col `grid-template-areas`:
  ```
  "create create create create stats   stats   stats   recproj recproj recproj recsheet recsheet"
  "create create create create favs    favs    favs    recproj recproj recproj recsheet recsheet"
  "libspot libspot libspot libspot favs favs    favs    recproj recproj recproj recsheet recsheet"
  ```
  md 6-col + sm 1col variants (see synth). create=CreateActions(HERO#2), libspot=LibrarySpotlight, stats=StatStrip, favs=FavoritesTree, recproj=RecentProjects, recsheet=RecentSheets.
- **First-run:** masthead greeting + full-width `DashboardEmptyState` (`.dashboard-glass-warm` over faint `.workshop-dashboard-bloom`) + the 4 image cards beneath at 120px ("what you can build"). Never blank.

## Per-module treatment
| Module | Surface | Text |
|---|---|---|
| Projects/Components/Templates | full-bleed `next/image` (`/Cards/*-Card.jpg`) + bottom `--scrim-*` (terracotta/sage/indigo) | white on scrim; plate index `font-numeric 9px --on-art-faint`; label `12px/500 --on-art`; count `font-numeric 12px --on-art-muted` |
| Library hub | `.library-hub` gradient (`--library-hub-gradient`) + `.grain-overlay` + scrim | white scale |
| ContinueCard (HERO#1) | `.dashboard-glass-warm` + `bg-image:var(--grad-hero-continue)` | ink name (Zilla 18 opt), `font-numeric` code/secondary, arrow |
| CreateActions (HERO#2) | `.dashboard-glass-warm` + `var(--grad-hero-create)` | "Create" 12/500 ink; primary New project = brand-orange button; New sheet = frosted picker |
| LibrarySpotlight | `.dashboard-glass` | template chips 11 ink, dates `font-numeric 9px --secondary` |
| StatStrip | plain `bg-white border-hairline rounded-xs` (NO frost) | numbers `font-numeric 18/500 ink`, labels 9 secondary, real counts only |
| RecentProjects/RecentSheets | plain white ledgers | rows 11 ink, meta 10 secondary, codes/dates `font-numeric`, ≤6 + View all |
| FavoritesTree | plain white | `role=tree` 11px, star `text-orange-600`, counts mono |
| DashboardHero | plain over wash | kicker `font-numeric 11 --secondary`; name `font-display 34/500 ink` |
Image-card FALLBACK if render fails → flat block token (Projects `--block-clay`, Components `--block-sage`, Templates `--block-indigo`). Radius 12 (`--glass-radius`) everywhere; inner 3px.

## New globals.css tokens + classes (dashboard layer)
```css
--image-card-radius: var(--glass-radius);
--image-card-border: 1px solid var(--glass-border);
--image-card-shadow: var(--glass-shadow);
--scrim-terracotta: linear-gradient(0deg, rgba(40,18,10,.80) 0%, rgba(40,18,10,.42) 42%, transparent 78%);
--scrim-sage:       linear-gradient(0deg, rgba(22,30,20,.78) 0%, rgba(22,30,20,.40) 42%, transparent 78%);
--scrim-indigo:     linear-gradient(0deg, rgba(16,22,40,.80) 0%, rgba(16,22,40,.42) 42%, transparent 78%);
--library-hub-base: var(--brand-orange);
--library-hub-gradient:
  radial-gradient(120% 120% at 100% 100%, var(--brand-orange-dark) 0%, color-mix(in srgb, var(--brand-orange-dark) 0%, transparent) 55%),
  radial-gradient(90% 90% at 12% 8%, color-mix(in srgb, var(--brand-amber) 55%, transparent) 0%, transparent 48%),
  radial-gradient(140% 130% at 50% 120%, color-mix(in srgb, var(--brand-peach) 30%, transparent) 0%, transparent 60%),
  linear-gradient(135deg, color-mix(in srgb, var(--brand-orange) 95%, white) 0%, var(--brand-orange-dark) 100%);
--on-art: #ffffff; --on-art-muted: rgba(255,255,255,0.85); --on-art-faint: rgba(255,255,255,0.62);
--grad-hero-continue: linear-gradient(135deg, color-mix(in srgb,var(--brand-orange) 22%,var(--glass-bg)) 0%, color-mix(in srgb,var(--brand-amber) 16%,var(--glass-bg)) 48%, color-mix(in srgb,var(--brand-peach) 10%,var(--glass-bg)) 100%);
--grad-hero-create: linear-gradient(180deg, color-mix(in srgb,var(--brand-orange) 17%,var(--glass-bg)) 0%, color-mix(in srgb,var(--brand-amber) 11%,var(--glass-bg)) 100%);
--grad-canvas-wash:
  radial-gradient(120% 95% at 88% 100%, color-mix(in srgb,var(--brand-orange) 9%,transparent) 0%, transparent 46%),
  radial-gradient(90% 80% at 100% 92%, color-mix(in srgb,var(--brand-amber) 7%,transparent) 0%, transparent 52%),
  radial-gradient(70% 60% at 96% 78%, color-mix(in srgb,var(--brand-peach) 6%,transparent) 0%, transparent 58%),
  linear-gradient(155deg,#ffffff 0%,#fbfafa 40%,#f7f6f5 100%);
--block-clay: var(--brand-orange); --block-sage: #4a5d4e; --block-indigo: #3b4a6b; --block-ink: #2c2c2c;
--glass-shadow-hover: 0 12px 36px rgba(30,35,50,0.16), 0 3px 10px rgba(30,35,50,0.08);
/* warm-dark sidebar */
--glass-bg-sidebar: color-mix(in srgb, var(--brand-orange-dark) 12%, rgba(28,22,20,0.66));
--sidebar-texture: url("/sidebar-BG.png");
--on-rail: rgba(255,255,255,0.94); --on-rail-muted: rgba(255,255,255,0.66); --rail-hairline: rgba(255,255,255,0.12);
```
Classes: `.image-card` + `.image-card-{projects,components,templates} .scrim`, `.library-hub` + `.scrim`, `.grain-overlay::after` (svg-noise, off under reduced-transparency), `.dashboard-card-hover` (translate/scale on `transform` only). Reuse existing `.dashboard-glass`/`.dashboard-glass-warm`.

## Typography
Roboto Mono (`font-numeric`) = greeting kicker, all labels/eyebrows/kickers, all numerics/codes/dates. Zilla Slab (`font-display`) = hero name (34/500) + first-run headline (24). SF Pro = body/buttons. No bold (500 max). Tracking 0. Pre-capitalized strings, no `uppercase` util.

## Sidebar (warm-dark) + square logo — SHIP IT (owner asked)
`.sidebar-glass` surface: layer `--sidebar-texture` cover ~16% under the existing single blur, dark warm frost `--glass-bg-sidebar`; keep one backdrop-filter. Text/icons white (`--on-rail`/`--on-rail-muted`), hairlines `--rail-hairline`, active pill keeps brand-orange `--glass-nav-active-bg` with WHITE mark, hover `rgba(255,255,255,.08)`. Logo: **64×64 square** orange glass slab (`headerFrameHeight 64`, radius 12, `--glass-logo-bg`+shadow) holding `archestimator_logo_white.svg` at **36px** centered; collapsed → 40×40 slab. Wordmark white beside when expanded. Keep `prefers-reduced-transparency`/`@supports` fallbacks → `--glass-bg-fallback`.

## a11y/perf
White text only over scrim/dark gradient; ink only over light frost/paper; never `--tertiary` on busy/colored surfaces (use `--secondary`). `next/image` covers, `priority` on Projects only, lazy others, `fill object-cover`. Backdrop-blur ≤4 panels (Continue/Create/LibrarySpotlight/EmptyState); dense cells plain white. Motion = transform/opacity only, off under reduced-motion. AA ≥4.5:1 every text/surface incl. warm-dark rail.

## Build split
A (shared, me first): globals.css tokens/classes; page.tsx full-bleed + wash + first-run bloom gate; WorkshopDashboard 3-band grid shell. B (parallel agents, isolated files): ImageDestinationCard, LibraryHubCard, ContinueCard, CreateActions, StatStrip, RecentProjects/Sheets, FavoritesTree restyle, LibrarySpotlight, DashboardHero, DashboardEmptyState. C (me/1 agent, shared sidebar): MainSidebar + SidebarHeader + globals sidebar surface + layout. D (me): integrate grid areas in WorkshopDashboard, verify build + screenshots + a11y.
