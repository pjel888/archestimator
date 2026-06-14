# 09 — Dependency / Package / Build Cleanup Audit

Full analysis + tool output in `evidence/dependency-analysis.md`. Tools (`knip`, `depcheck`, `madge`) run ephemerally via `bunx` — no `package.json`/lockfile change. **madge: no circular dependencies.**

## Required table

| Package/Script/Patch | Type | Current Imports/Calls | Feature Owner | Runtime Needed? | Dev Needed? | Removal Risk | Bundle/Build Benefit | Test Gate | Decision |
|---|---|---|---|---|---|---|---|---|---|
| `three` | runtime dep | **0 imports** (knip+depcheck+grep) | — | No | No | LOW | ~600 KB off graph | type-check+build | REMOVE (F20) |
| `@types/three` | dev dep | follows `three` | — | No | No | LOW | — | type-check | REMOVE (F20) |
| `d3` | runtime dep | 0 direct (code uses `d3-shape`) | charts | No | No | LOW | drops ~33 d3 sub-pkgs | type-check+build+charts | REPLACE→`d3-shape` (F21) |
| `@types/d3` | dev dep | follows `d3` (`d3-shape` ships own types) | charts | No | No | LOW | — | type-check | REMOVE (F21) |
| `class-variance-authority` | runtime dep | 0 `cva(`/import (3 tools agree) | — | No | No | LOW | ~5 KB | re-grep+type-check+build | REMOVE_AFTER_PROOF (F22) |
| `d3-shape` | (missing) | `CostDonutChart`, charts | charts | Yes | — | n/a | correctness | build | ADD (F23) |
| `server-only` | (missing) | `lib/workshop/beta-feedback-review.ts` | infra | Yes | — | n/a | correctness | type-check | ADD (F23) |
| `@firecms/neat` (+patch) | runtime dep | `NeatWireframeBackground`→`HeroSection` (dynamic) | landing | Yes | — | HIGH (patch `paused`) | lazy ~580 KB | landing build | KEEP |
| `exceljs` | runtime dep | export API route only | export | Yes (server) | — | HIGH | server-only | export tests | KEEP |
| `roughjs` | runtime dep | `AnimatedProposalRecordSection` | landing | Yes | — | LOW | ~50 KB landing-only | landing build | KEEP (could defer→dynamic) |
| `rough-notation` | runtime dep | `HeroSection`,`LaunchFeatureHeading` | landing | Yes | — | LOW | ~15 KB landing-only | landing build | KEEP |
| `lenis` | runtime dep | `LandingSmoothScrollProvider` | landing | Yes | — | LOW | ~10 KB landing-only | landing build | KEEP |
| `@tanstack/react-table` | runtime dep | `ProjectEstimatesTable` | estimates | Yes | — | HIGH | route-isolated | estimates tests | KEEP |
| `@radix-ui/react-context-menu` | runtime dep | `context-menu.tsx`→tree menus | workshop | Yes | — | HIGH | minimal | tree tests | KEEP |
| `@phosphor-icons/react` | runtime dep | 122 files | core UI | Yes | — | CRITICAL | `optimizePackageImports` | build | KEEP |
| `react-complex-tree` | runtime dep | `LibraryFolderTree` + reorder | library | Yes | — | MED | ~40 KB | library tests | KEEP |
| `@next/third-parties`,`@vercel/analytics`,`sharp`,`resend`,core (`next`,`react*`,`@supabase/*`,`@tanstack/react-query`,`zustand`,`clsx`,`tailwind-merge`) | runtime | pervasive/critical | core | Yes | — | CRITICAL | n/a | all | KEEP |
| `@next/bundle-analyzer` | dev dep | `next.config.ts` (ANALYZE) | tooling | — | Yes | low | n/a | — | KEEP |
| Storybook stack, `@storybook/addon-{a11y,docs}`, `@tailwindcss/postcss`, `tailwindcss`, `@types/bun`, testing-library, vite, vitest, jsdom, eslint(+next), typescript | dev | configs/tests/CSS | tooling | — | Yes | varies | n/a | — | KEEP (tool false-positives) |
| patch `@firecms/neat@0.8.0` | patch | adds `paused` used by `NeatWireframeBackground` | landing | Yes | — | HIGH | — | landing build | KEEP |
| `scripts/enforce-app-font-size.mjs` | script | 1-line alias; `lint:font-size`→`lint:design-system` | governance | — | — | low | clarity | n/a | REMOVE_AFTER_PROOF (F24) |
| `scripts/benchmark-estimate-cursor-broadcast.ts` | script | no package.json/CI/test wiring | perf | — | — | low | clarity | n/a | REMOVE_AFTER_PROOF (F24) — confirm not manually run |
| `scripts/explain-estimate-list-summaries.mjs` | script | no wiring (EXPLAIN doc tool) | DB perf | — | — | low | clarity | n/a | ARCHIVE/REMOVE (F24) |
| `prove:*` (5) scripts | scripts | RLS/migration proofs | governance | — | — | n/a | audit trail | — | KEEP |
| `launch:*` (14) scripts | scripts | hosted readiness gates (manual, not CI) | launch | — | — | n/a | launch gates | — | KEEP |
| `perf:*`, `dbidx:*`, test-fixture scripts (`benchmark-proposal-workbook`, `benchmark-shared-link-activity`, `build-performance-query-inventory`, `check-public-cache-safety`) | scripts | imported by vitest tests / perf gates | perf/test | — | Yes | n/a | load-bearing | test:dom | KEEP |

## False positives (KEEP — flagged by tools, actually used)
`@storybook/addon-a11y`, `@storybook/addon-docs` (string addons in `.storybook/main.ts`), `@tailwindcss/postcss`+`tailwindcss` (CSS `@import`, postcss config), `@types/bun` (ambient), `@next/env` (Next internal), `@storybook/react` (re-export of `@storybook/nextjs-vite`), all test-fixture scripts.

## Findings F20–F24 (summary)
- **F20 `three`+`@types/three`** — zero usage, REMOVE. Largest single graph reduction.
- **F21 `d3`→`d3-shape`** — only `d3-shape` is imported; swapping drops ~33 unused d3 sub-packages. Drop `@types/d3`. No code change.
- **F22 `class-variance-authority`** — no `cva` usage; REMOVE after a final implementation-time `rg "cva\b|class-variance-authority" src`.
- **F23** — ADD `server-only`, `d3-shape` to deps (currently imported-but-unlisted; correctness/hygiene).
- **F24** — script hygiene: `enforce-app-font-size.mjs` is a redundant alias; `benchmark-estimate-cursor-broadcast.ts` + `explain-estimate-list-summaries.mjs` are unwired dev tools (confirm not manually relied on, then archive/remove).

## Build config (`next.config.ts`) — clean
`optimizePackageImports`, `staleTimes`, image `remotePatterns` (from Supabase URL), comprehensive `headers()` for share/workshop/invite, `ANALYZE`-gated bundle-analyzer. No dead `redirects()`/`rewrites()`. CSP `unsafe-inline` removal is a tracked deferred hardening item (out of cleanup scope). No action.

## Validation gate for all dependency changes
`bun install` → `bun run type-check` → `bun run build` → charts smoke (for F21) → `bun run test:dom`. Rollback: revert `package.json` + lockfile.
