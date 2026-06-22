# Evidence — Dependency Analysis

Tools run ephemerally via `bunx` (no `package.json`/lockfile modification): `knip --no-progress`, `depcheck`, `madge src --extensions ts,tsx --warning --circular`. Cross-checked with manual `rg` import scans.

## Tool headline results

**knip**
```
Unused dependencies (3): class-variance-authority, d3, three
Unused devDependencies (2): @types/d3, @types/three
Unlisted dependencies: d3-shape (CostDonutChart.tsx) [true positive],
                       @next/env (playwright.config) [false positive],
                       @storybook/react ×89 story files [false positive]
```
**depcheck**
```
Unused dependencies:    class-variance-authority, d3, three
Unused devDependencies: @storybook/addon-a11y, @storybook/addon-docs,
                        @tailwindcss/postcss, @types/bun, @types/d3, @types/three,
                        tailwindcss   [last 5 are FALSE POSITIVES — see below]
Missing dependencies:   d3-shape, server-only, @storybook/react
```
**madge**
```
✔ No circular dependency found!
Skipped 286 files (@/* alias resolution — expected Next.js limitation)
```

## False positives (DO NOT remove — flagged by tools but in use)

| Package | Why it's actually used |
|---|---|
| `@storybook/addon-a11y`, `@storybook/addon-docs` | string-literal addons in `.storybook/main.ts` |
| `@tailwindcss/postcss`, `tailwindcss` | Tailwind v4 via `postcss.config.mjs` + `@import "tailwindcss"` in `globals.css` (CSS, not JS) |
| `@types/bun` | ambient types for `Bun.file()` / `bun:test` in `tests/unit/` |
| `@next/env` | Next internal, available via `next` |
| `@storybook/react` | re-exported by `@storybook/nextjs-vite` |

## Dependency decision table

| Package/Script/Patch | Type | Imports/Calls (where) | Owner | Runtime? | Dev? | Removal risk | Bundle/Build benefit | Test gate | Decision |
|---|---|---|---|---|---|---|---|---|---|
| `three` | runtime | **0 imports anywhere** | — | No | No | LOW (3 tools + grep agree) | ~600 KB off dep graph | type-check+build | **REMOVE** (+ `@types/three`) |
| `d3` | runtime | 0 direct; code imports `d3-shape` | charts | No (wrong pkg) | — | LOW | drops ~33 d3 sub-pkgs from lockfile | type-check+build+charts smoke | **REPLACE with `d3-shape`** (+ remove `@types/d3`) |
| `class-variance-authority` | runtime | 0 `cva(` / import-from in src | — | No | No | LOW | ~5 KB | type-check+build | **REMOVE_AFTER_PROOF** |
| `server-only` | (missing) | imported in `lib/workshop/beta-feedback-review.ts` | infra | Yes | — | n/a | correctness | type-check | **ADD to deps** |
| `d3-shape` | (missing) | `CostDonutChart`, charts | charts | Yes | — | n/a | correctness | build | **ADD to deps** (replaces `d3`) |
| `@firecms/neat` (patched) | runtime | `NeatWireframeBackground` (dynamic) → `HeroSection` (`/`) | landing | Yes | — | HIGH (patch adds `paused`) | lazy-loaded ~580 KB | landing build | **KEEP** |
| `exceljs` | runtime | `proposal-export/create-proposal-workbook.ts` → export API only | export | Yes (server) | — | HIGH | server-only, route-isolated | export tests | **KEEP** |
| `three`→ see above; `roughjs` | runtime | `AnimatedProposalRecordSection` (landing) | landing | Yes | — | LOW | ~50 KB landing-only | landing build | **KEEP** (could defer to dynamic import) |
| `rough-notation` | runtime | `HeroSection`, `LaunchFeatureHeading` (landing) | landing | Yes | — | LOW | ~15 KB landing-only | landing build | **KEEP** |
| `lenis` | runtime | `LandingSmoothScrollProvider` (`/`) | landing | Yes | — | LOW | ~10 KB landing-only | landing build | **KEEP** |
| `@tanstack/react-table` | runtime | `ProjectEstimatesTable` only | estimates | Yes | — | HIGH | route-isolated | estimates tests | **KEEP** |
| `@radix-ui/react-context-menu` | runtime | `context-menu.tsx`→estimate tree menus | workshop | Yes | — | HIGH | minimal | tree tests | **KEEP** |
| `@phosphor-icons/react` | runtime | 122 files | core UI | Yes | — | CRITICAL | mitigated by `optimizePackageImports` | build | **KEEP** |
| `@next/third-parties`, `@vercel/analytics` | runtime | analytics loaders | analytics | Yes | — | low | small | build | **KEEP** |
| `sharp` | runtime | image API routes | images | Yes (server) | — | HIGH | native | build | **KEEP** |
| core (`next`,`react`,`react-dom`,`@supabase/*`,`@tanstack/react-query`,`zustand`,`clsx`,`tailwind-merge`,`class-variance-authority`?) | runtime | pervasive | core | Yes | — | CRITICAL | n/a | all | **KEEP** (cva is the exception → remove) |
| `@next/bundle-analyzer` | dev | `next.config.ts` (ANALYZE) | tooling | — | Yes | low | n/a | — | **KEEP** |
| Storybook stack, testing-library, vite, vitest, jsdom, eslint(+next), typescript, @types/* | dev | configs/tests | tooling | — | Yes | varies | n/a | — | **KEEP** (except `@types/d3`,`@types/three`) |

## Patch

`patches/@firecms%2Fneat@0.8.0.patch` — adds `paused` boolean used by `NeatWireframeBackground.tsx` (IntersectionObserver pause/resume). **KEEP** while the landing hero uses Neat.

## Net dependency reduction if P2 applied

Remove from `package.json`: `three`, `d3`, `class-variance-authority` (runtime); `@types/three`, `@types/d3` (dev). Add: `d3-shape`, `server-only`. Net = **3 removed, 2 added (runtime), 2 dev removed** → smaller install graph, identical runtime behavior. (cva removal pending a final `rg "cva\b|class-variance-authority"` confirmation at implementation time.)
