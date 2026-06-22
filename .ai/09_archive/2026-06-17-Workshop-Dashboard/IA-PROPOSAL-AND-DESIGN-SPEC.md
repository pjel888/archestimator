# Workshop Dashboard — PHASE 1 IA PROPOSAL + PHASE 2 DESIGN SPEC

Grounded entirely in RECON.md. Core job (§A): *get the user into the right estimate
fast, let them start a new one with zero friction, orient across Projects / Sheets /
Library / Favorites.*

## §E Critical-thinking answers
1. **Most-frequent returning action** = re-open the estimate sheet they were just editing. → **Continue card** (one tap) is the hero. Backed by `getWorkshopHomebaseData().estimates[0]` (`updated_at` desc) + `firstNodeId` deep-link.
2. **Continue where you left off** = **YES, build it.** Highest-value module on a tool like this; data fully supports a single-tap jump (`/workshop/projects/{project_id}/estimates/{firstNodeId}`, fallback `…/estimates`).
3. **At-a-glance stats** = surface **only real, cheap** numbers. Library counts (`getLibraryOverview`) are real. Project/sheet "totals" from homebase are capped at 12 → framed as **"recent"**, not totals; a true active-project count is a proposed low-cost `count` query (NEEDS INPUT). **No faked stat cards.**
4. **Global search / command palette** = **DROP from v1.** No existing search infra; building it is its own project. Sidebar nav + recent/favorite lists cover navigation. Note as future.
5. **Library spotlight** = **KEEP (compact).** `recentTemplates` shortens start-from-template path. Secondary priority.
6. **First-run (zero projects)** = **designed empty state**: Zilla hero greeting + a focused "Create your first project" CTA + a "start from a template" nudge. Never a blank card.
7. **Deliberately EXCLUDED:** (a) global search/command palette — no infra, large scope; (b) activity feed / audit timeline — **no activity-log table exists** (would require faking); (c) deep analytics/charts — belongs in the project Data view; (d) notifications panel — already handled by `WorkshopNotificationEntry`.
8. **Hierarchy:** HERO → primary → secondary → tertiary (table below).

## §E module table
| Module | Decision | Backing data (real) | Render cost | Serves core job | Hierarchy | Notes |
|---|---|---|---|---|---|---|
| Continue last estimate | **Keep** | `homebase.estimates[0]` + `firstNodeId` | trivial (in homebase) | ★ directly | **HERO** | deep-link; hidden first-run |
| New Project / New Sheet | **Keep** | `createProject`, `createEstimateSheetDraft(projectId)` | trivial | ★ directly | **HERO** | New Sheet needs a project → picker from recent/fav |
| Greeting | **Keep+elevate** | `userDisplayName` | trivial | orientation | **HERO** | Zilla Slab; preserve a11y hooks |
| Recent Projects | **Keep** | `homebase.projects` | trivial | ★ | primary | ≤6 shown, link to all |
| Recent Estimate Sheets | **Keep** | `homebase.estimates` | trivial | ★ | primary | ≤6, deep-link each |
| Favorites tree | **Keep** | `listMainSidebarFavoriteProjects()` | trivial (cached) | ★ | secondary | collapsible a11y tree, fav projects ▸ fav sheets |
| Quick links | **Keep** | static routes | none | navigation | secondary | Projects / Library / Components / Templates |
| Library spotlight | **Keep (compact)** | `getLibraryOverview().recentTemplates` | 1 cached server call | start-from-template | tertiary | templates first |
| At-a-glance stats | **Keep (real only)** | `getLibraryOverview` counts | trivial | orientation | tertiary | library counts real; project total = NEEDS INPUT |
| Global search | **Drop** | — | — | — | — | no infra; future |
| Activity feed | **Drop** | — | — | — | — | no activity-log table |
| Analytics/charts | **Drop** | — | — | — | — | lives in project Data view |

## Layout (ties IA → §F: white top-left, warm bloom bottom-right)
```
┌────────────────────────────────────────────────────────────────────┐
│  ☀  Good evening,                          ░░ warm bloom anchored ░░ │
│     Philip Lewis  ← Zilla Slab hero (white top-left)      ▓ bottom-  │
│  ──────────────────────────────────────────────────────  ▓▓ right ▓ │
│  [ Quick links: Projects · Library · Components ·     ]   ▓▓▓▓▓▓▓▓▓  │
│  [ Templates ]                                           ╔═════════╗ │
│                                                          ║ CONTINUE║ │  ← glass-over-bloom
│  Recent Projects            Recent Sheets                ║ last    ║ │
│  • Lewis Residence          • Lewis Residence-001        ║ sheet → ║ │
│  • Makati Office            • Makati Office-Tender        ╚═════════╝ │
│  ▸ Favorites (tree)                                      ╔═════════╗ │
│    ▾ Lewis Residence                                     ║ + New   ║ │
│        · ES-001 ★                                        ║ Project ║ │
│  (dense, crisp lists — top-left white)                   ║ + Sheet ║ │
│                                                          ╚═════════╝ │
│                                          [ Library spotlight: tmpl ] │
└────────────────────────────────────────────────────────────────────┘
```
- **Legibility-critical / dense** (greeting, quick links, recent lists, favorites tree) → **white top-left**, plain crisp rows (no frost on data).
- **Visual / CTA** (Continue, Create, Library spotlight) → **warm bottom-right**, glass-over-bloom.

## States (every module)
- **loaded** — real data.
- **empty/first-run** — zero projects → hero + "Create first project" + template nudge; per-list empty rows ("Star a project to pin it here", "No recent sheets yet").
- **loading** — `loading.tsx` skeleton (greeting + module skeletons), Suspense fallback already in shell.
- **error** — homebase is server-fetched (page-level error boundary); library spotlight degrades to hidden if `getLibraryOverview` throws (caught, never blocks dashboard).

## PHASE 2 — Design spec (token-level)
### Typography
- **New display family: `Zilla Slab`** via `next/font/google` in `layout.tsx` → `--font-zilla-slab` (weights 400/500/600, `display:"swap"`, on `<body>` variable — no layout shift).
- `@theme inline`: `--font-display: var(--font-zilla-slab)` → utility **`font-display`**; `--font-numeric: var(--font-roboto-mono)` → utility **`font-numeric`** (reuses existing Roboto Mono; avoids banned `font-mono`).
- Hero sizes use arbitrary `text-[Npx]` (>12px) **only inside `src/components/workshop/dashboard/`**, which is granted a px-cap exemption in `enforce-app-design-system.mjs` (path-scoped, mirrors `/share`). All other dashboard text stays ≤12px and uses existing role sizes. Weights limited to normal/medium.
### Warm bloom (dashboard-scoped token)
- `.workshop-dashboard-bloom`: `radial-gradient(... at 100% 100%, clay → amber → soft-peach → transparent)` built from `--brand-orange` via `color-mix`. Low alpha; dissolves before center. Single class, no inline one-offs. Sits behind dashboard content, above the white card.
### Glass recipe (dashboard panels)
- `.dashboard-glass`: reuses `--glass-bg/-blur/-saturate/-border/-shadow/-inset-hi`, `border-radius: var(--glass-radius)`. `@supports not(backdrop-filter)` + `prefers-reduced-transparency` → `--glass-bg-fallback` solid, no blur. **Cap: a few large panels only** (Continue, Create, Library spotlight) — dense lists stay plain. Documented extension of the glass exception to the dashboard.
### Pattern
- `.dashboard-grid-pattern`: faint dot/blueprint grid (`radial-gradient` dots, ~0.04 alpha), under decorative cards only, never under body text.
### Motion
- Hover/focus depth on glass only; `prefers-reduced-motion` disables. No animated gradients.
### Component tree (`src/components/workshop/dashboard/`)
`WorkshopDashboard` (layout/compose) › `DashboardGlassPanel` (primitive) · `DashboardHero` (greeting, keeps hooks) · `ContinueCard` · `CreateActions` · `QuickLinks` · `RecentProjectsList` · `RecentSheetsList` · `FavoritesTree` · `LibrarySpotlight` · `DashboardStatStrip` · `DashboardEmptyState`. Data shaping + hrefs in `dashboard/lib.ts`.

## Accessibility / perf gates
- AA over the most saturated bloom + glass (verify worst case; ink `#3D3D3D`/`--secondary` on light frost passes easily; CTAs over bloom use ink, not tertiary).
- Favorites tree = `role="tree"`/`treeitem"/`group`, keyboard expand/collapse, `aria-expanded`.
- Blur layers capped; large lists sliced (≤6) with "view all" links; library spotlight non-blocking.

## Outstanding NEEDS INPUT
1. **Font family** (default Zilla Slab) — confirm/override.
2. **True active-project/sheet counts** — add a low-cost `count` query, or keep "recent" framing only? (Defaulting to recent-framing + real library counts; no fake totals.)
3. **Mobile depth** — desktop-first confirmed; dashboard stacks gracefully. Confirm no dedicated mobile layout needed for v1.
