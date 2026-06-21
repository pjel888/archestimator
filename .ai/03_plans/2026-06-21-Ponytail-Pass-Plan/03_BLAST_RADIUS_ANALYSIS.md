# 03 — Blast Radius Analysis

**Date:** 2026-06-21 · **Status:** VALIDATED (Agents A/B/C complete; 2026-06-21 continuation reviewers integrated)

This document analyzes the blast radius of every proposed change in the Ponytail Pass Plan. Blast radius = who imports what, who calls what, what breaks if removed.

## Tier 1 dependency blast radius (VALIDATED by Agent A)

### T1.1 `class-variance-authority` — blast radius: ZERO

| Check | Method | Result |
|-------|--------|--------|
| `from "class-variance-authority"` | `rg` | 0 matches |
| `require("class-variance-authority")` | `rg` | 0 matches |
| `cva(` usage | `rg "cva\(" src` | 0 matches |
| `.storybook/*` / `src/stories/*` | `rg` | 0 matches |
| Dynamic imports | `rg` | 0 matches |
| Cross-reference | `2026-06-14-Codebase-Cleanup-Plan` F22 | Same finding, same evidence |
| package.json version | `^0.7.1` | — |
| Test files affected | 0 | None |
| Runtime paths affected | 0 | None |

**Verdict:** Zero blast radius. Safe to remove.

### T1.2 `three` — blast radius: ZERO

| Check | Method | Result |
|-------|--------|--------|
| `from "three"` | `rg` | 0 matches |
| `require("three")` | `rg` | 0 matches |
| `THREE.` namespace | `rg` | 0 matches (see false positive note) |
| `threejs` variant | `rg` | 0 matches |
| Dynamic import | `rg "import\(['\"]three['\"]\)"` | 0 matches |
| `.storybook/*` / `src/stories/*` | `rg` | 0 matches (see false positive) |
| Cross-reference | `2026-06-14-Codebase-Cleanup-Plan` F20 | Same finding, same evidence |
| package.json version | `^0.184.0` (`@types/three` `^0.184.1` also present) | — |
| Test files affected | 0 | None |
| Runtime paths affected | 0 | None |

**False positive noted:** `src/stories/charts/project-cost-comparison.stories.tsx:106` has a local `const THREE = makeData(...)`. This is a dataset variable, NOT the `three` package. No import. Safe to ignore.

**Verdict:** Zero blast radius. Safe to remove. Also remove `@types/three` (`^0.184.1`) since no consumer remains.

### T1.3 `@next/third-parties` — blast radius: 1 file + 3 test files + experiment-tracker dependency

| Check | Method | Result |
|-------|--------|--------|
| `@next/third-parties` importers | `rg -l "@next/third-parties" src` | 1 file: `src/components/landing/LandingAnalyticsLoader.tsx:3,17-21` |
| What's imported | Read file | `GoogleAnalytics` from `@next/third-parties/google` — renders only when `consent.analytics` is true and `gaId` exists |
| Established alternative | Read `src/components/landing/ClarityScript.tsx` | Uses `next/script` with `dangerouslySetInnerHTML` — mirror this pattern |
| **Critical dependency** | Read `src/lib/ab-testing/experiment-tracker.ts` | Consumes `window.gtag` + `window.clarity` globals. **The swap MUST preserve `window.gtag`** or experiment tracking becomes no-ops. |
| Test files affected | 3 | `tests/vitest/landing-ab-testing.test.tsx` (stubs gtag/clarity, asserts consent-gated tracking), `tests/vitest/closed-beta-env-manifest.test.ts` (verifies GA/Clarity env vars), `tests/vitest/project-publication-security.test.ts` (documents GA4/Clarity isolation on share routes) |
| Runtime paths affected | Landing page GA script load + experiment tracking | Verify GA fires + `window.gtag` works + consent respected |
| package.json version | `^16.2.6` | — |

**Verdict:** Contained blast — 1 file edit. But the swap MUST preserve `window.gtag` for `experiment-tracker.ts`. Browser QA: verify GA fires, consent respected, AND experiment tracking still calls `gtag(...)` successfully.

### T1.4 `d3` umbrella → `d3-shape` — blast radius: 1 file + 4 test files

| Check | Method | Result |
|-------|--------|--------|
| `from "d3"` (umbrella) | `rg "from ['\"]d3['\"]"` | 0 matches (only `d3-shape` is imported) |
| `from "d3-shape"` | `rg "from ['\"]d3-shape['\"]"` | 1 file: `src/components/charts/CostDonutChart.tsx:4-5,158-320,322-453` |
| `from "d3-scale"`, `d3-array`, etc. | `rg "from ['\"]d3-"` | No other D3 sub-packages used |
| What's used | Read `CostDonutChart.tsx` | `pie()` (bucket totals → arc angles), `arc()` (arcs → donut ring paths with inner/outer radius, corner radius, active-slice expansion), `PieArcDatum` type (types `buildCallouts`), trig on arc mid-angle for label connectors |
| Cross-reference | `2026-06-14-Codebase-Cleanup-Plan` F21 | Same finding |
| package.json version | `d3` `^7.9.0` (no standalone `d3-shape` entry; `@types/d3` `^7.4.3`) | — |
| Test files affected | 4 | `tests/vitest/cost-donut-chart-ui.test.tsx` (direct rendering regression), `tests/vitest/share/cost-donut-chart-hydration.test.tsx` (deterministic SVG/hydration coverage), `tests/vitest/project-dashboard-charts-ui.test.ts` (asserts d3-shape stays isolated in shared donut), `tests/vitest/project-dashboard-ui-fixtures.ts` (reads CostDonutChart source for assertions) |
| Runtime paths affected | Chart rendering (donut geometry, hover state, hydration) | Verify CostDonutChart renders correctly |

**Two swap options:**
- **Option A (simple — recommended):** Replace `d3` umbrella with `d3-shape` in `package.json`. Update import in `CostDonutChart.tsx` from `"d3"` to `"d3-shape"`. Zero LOC change in app code. Lowest risk.
- **Option B (ponytail stricter):** Inline `pie()`/`arc()` math as native SVG (`Math.PI`, `sin`, `cos`, direct `path d=` strings). Keep existing `roundSvgPath`/`formatSvgNumber` helpers. -25 LOC. Drops `d3-shape` dep entirely. Medium risk — chart geometry, hover state, and hydration behavior are visually tested.

**Verdict:** Contained blast — 1 file edit. Option A is the cleanup plan's recommendation and the simplest. Option B is for when bundle size matters.

### T1.5 `@firecms/neat` — blast radius: 1 file + 4 test files

| Check | Method | Result |
|-------|--------|--------|
| `@firecms/neat` importers | `rg -l "@firecms/neat"` | 1 file: `src/components/landing/NeatWireframeBackground.tsx:4,116,120-172` |
| What's used | Read file | `NeatConfig` (types the wireframe config), `NeatGradient` (lazy-imported after idle time to mount a full-size animated canvas). Fallback render is a static warm linear-gradient block. |
| Has fallback | Read file | Yes — static CSS gradient fallback |
| Test files affected | 4 | `tests/vitest/neat-wireframe-background.test.tsx` (mocks NeatGradient and idle-load fallback), `tests/vitest/landing-interactivity.test.tsx`, `tests/vitest/landing-amigo-redesign.test.tsx`, `tests/vitest/landing-company-proof.test.ts` (verifies Neat fallback, idle activation, hero scope) |
| Runtime paths affected | Landing page hero background render | Visual QA required; reduced-motion/mobile gating must be preserved |
| package.json version | `0.8.0` (patched — adds `paused` property) | — |

**Verdict:** Contained blast — 1 file edit (if swap) or 0 (if keep). Owner decision. **Swap complexity: complex. Risk: high.** -130 LOC. This is a client-only, visually prominent hero background.

### T1.6 `lenis` — blast radius: 1 file + 3 test files

| Check | Method | Result |
|-------|--------|--------|
| `lenis` importers | `rg -l "lenis"` | 1 file: `src/components/landing/LandingSmoothScrollProvider.tsx:3-4,20-41` |
| What's used | Read file | `ReactLenis` wraps landing content unless reduced motion is preferred. Options: smooth wheel/anchor scrolling, `lerp`, `data-lenis-prevent` exclusion. |
| Test files affected | 3 | `tests/vitest/public-page-shell.test.tsx` (asserts native main and no lenis prevent wrapper), `tests/vitest/live-estimate-node-route.test.ts` (checks layout stays free of lenis CSS), `tests/vitest/landing-company-proof.test.ts` (verifies Lenis scope and provider behavior) |
| Runtime paths affected | Landing page scroll behavior | Visual + interaction QA required |
| Accessibility | — | Must respect `prefers-reduced-motion` (already does — renders children directly when reduced motion) |
| package.json version | `^1.3.23` | — |

**Verdict:** Contained blast — 1 file edit (if swap) or 0 (if keep). Owner decision. **Swap complexity: moderate. Risk: low-medium.** -30 LOC. Mostly UX feel and anchor scrolling, not data flow.

### T1.7 `rough-notation` — blast radius: 2 files + 3 test files

| Check | Method | Result |
|-------|--------|--------|
| `rough-notation` importers | `rg -l "rough-notation"` | 2 files: `src/components/landing/HeroSection.tsx:7,147-245`, `src/components/landing/LaunchFeatureHeading.tsx:4,11-34` |
| What's used | Read files | Hero: underline/circle annotations on "proposal/approval" and "Precision/Win". Launch heading: underlines "archestimator". |
| Test files affected | 3 | `tests/vitest/landing-interactivity.test.tsx`, `tests/vitest/landing-amigo-redesign.test.tsx`, `tests/vitest/landing-company-proof.test.ts` |
| Runtime paths affected | Landing hero + feature heading visuals | Visual QA required |
| package.json version | `^0.5.1` | — |

**Verdict:** Contained blast — 2 file edits (if swap) or 0 (if keep). Owner decision. **Swap complexity: moderate. Risk: medium.** -120 LOC. Headline styling and motion are landing-page visible.

### T1.8 `roughjs` — blast radius: 1 file + 2 test files

| Check | Method | Result |
|-------|--------|--------|
| `roughjs` importers | `rg -l "roughjs"` | 1 file: `src/components/landing/AnimatedProposalRecordSection.tsx:12-13,164-608,630-848` |
| What's used | Read file | Sketch-style SVG outlines for cards, arrows, dashed revision loop, and bubble quote in the "One Workflow" illustration. `rough.svg(svg)` powers all drawn geometry. ~684 lines of the file depend on roughjs. |
| Test files affected | 2 | `tests/vitest/closed-beta-pricing-copy.test.ts` (reads source for copy assertions), `tests/vitest/landing-amigo-redesign.test.tsx` (checks section presence in landing proof) |
| Runtime paths affected | Landing illustration render | Visual QA required |
| package.json version | `^4.6.6` | — |

**Verdict:** Contained blast — 1 file edit (if swap) or 0 (if keep). Owner decision. **Swap complexity: complex. Risk: high.** **-500 LOC** (much larger than first-pass estimated). Large custom visual composition with many geometry-dependent paths.

## Tier 2 mega-file blast radius (VALIDATED by Agent B)

### Coupling summary (validated)

| File | LOC | Importers | Tests | Hot path | Coupling | Refactor risk | Dead exports |
|------|----:|---:|---:|---|---|---|---:|
| `EstimateSheetContent.tsx` | 2950 | 1 (dynamic) | 16 | Yes — core estimate editor | Very-high | High | **25** |
| `component-library/index.tsx` | 2541 | 2 | 1 | Yes — library sidebar | High | High | 0 |
| `workspace-repository.ts` | 2695 | **37** | 10 | Yes — workshop data | Very-high | High | **13** |
| `package-builder/draft.ts` | 2412 | 1 | 2 | Only if AI enabled | Medium | Medium | 0 |
| `read-context.ts` | 2023 | 1 | 2 | Only if AI enabled | Medium | Medium | 2 |
| `publication/actions.ts` | ~1538 | 5 | 3 | Yes — share links | High | High | 1 |
| `component-library/actions.ts` | ~1591 | **14** | 3 | Yes — library CRUD | Very-high | High | **16** |

**Key findings:**
- **`workspace-repository.ts` has 37 source importers** — the widest fanout in the set. Any change to its public API touches 37 files. But it has 13 dead exports that can be safely removed in a first pass.
- **`EstimateSheetContent.tsx` has 25 dead exports** — the single biggest ponytail cut in Tier 2. Only 1 source importer (dynamic), 16 test files. The 25 dead exports are helpers + `EstimateRightSidebar` re-export + `pesoFormatter` that should move to a separate helpers module.
- **`component-library/actions.ts` has 14 importers and 16 dead exports** — broad CRUD/search/template surface. The 16 dead exports are types + unused functions that can be safely removed.
- **Total dead exports across all 7 mega-files: 57** — these are the safest first PRs (shrink public API surface without touching consumed exports).

See `05_TIER_2_MEGA_FILE_STRATEGY.md` for the full per-file importer lists, consumed exports, dead export names, test file lists, and recommended ponytail strategies.

## Tier 3 quick-cut blast radius

### T3.1 `src/components/landing/index.ts` barrel — blast radius: 7 source importers

| Check | Method | Result |
|-------|--------|--------|
| Importers of `@/components/landing` | `rg "from ['\"]@/components/landing['\"]" src tests` | 7 source importers: `src/app/about/page.tsx`, `src/app/terms/page.tsx`, `src/app/features/page.tsx`, `src/app/privacy/page.tsx`, `src/app/contact/page.tsx`, `src/app/page.tsx`, `src/app/pricing/page.tsx` |
| If 0 importers | Delete file | Zero blast |
| If >0 importers | Update each to direct import | Blast = N importer file edits |

### T3.2 `src/lib/activity/index.ts` barrel — blast radius: 4 source importers + 8 tests/fixtures

| Check | Method | Result |
|-------|--------|--------|
| Importers of `@/lib/activity` | `rg "from ['\"]@/lib/activity['\"]" src tests` | Source: `src/lib/publication/actions.ts`, `src/lib/repositories/project-activity-repository.ts`, `src/app/api/share/[token]/activity/route.ts`, `src/components/workshop/estimate-sheet/activity-history.tsx`. Tests/fixtures: 8 files under `tests/vitest/`. |
| Same pattern as T3.1 | | Update importers to direct modules, then delete the barrel. |

### T3.3 `ProjectEstimatesTable.tsx:99-121` empty catches — blast radius: 1 file

- Contained to `ProjectEstimatesTable.tsx`. Wrappers are local. Fix is in-file.
- Test files: check `tests/vitest/` for `ProjectEstimatesTable` coverage.

### T3.4 `reusable-sources/actions.ts:192-217` cast — blast radius: 1 file

- Contained to `reusable-sources/actions.ts`. Cast wraps one optional query.
- Test files: check `tests/vitest/` for `reusable-sources` coverage.

### T3.5 `sanitize-recipient-text.ts` — blast radius: 1 file, TRUST BOUNDARY

- Contained to `sanitize-recipient-text.ts`. But the function is called on trust-boundary input.
- Callers: `src/app/api/share/[token]/decision/route.ts`, `src/app/api/share/[token]/comment/route.ts`.
- Test files: `project-publication-comments`, `project-publication-decision`, and `share/recipient-content-escaping` coverage must pass or be added before the swap.
- **Risk is higher than the LOC suggests** — XSS via share recipient text if the swap is weaker.

## Speculative feature blast radius

### SF.1 AI surface — blast radius: LARGE (if cut)

| Component | Files | Notes |
|-----------|-------|-------|
| Feature flags | `src/lib/ai/feature-flags.ts` | — |
| Client UI | `src/components/workshop/EstimateCopilotFloatingButton.tsx` | Gated by `useAskFlipUiEnabled` |
| Server lib | `src/lib/ai/` (read-context, package-builder/draft, package-builder/apply) | Includes T2.4, T2.5 mega-files |
| API routes | `src/app/api/ai/ask/`, `src/app/api/ai/package-builder/` | — |
| Tests | `tests/vitest/ai-package-builder-*.test.ts` | ~4400 LOC of tests |
| **KEEP** | AI audit tables (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`) | Compliance — do NOT cut |
| **KEEP** | Security-contract tests | — |

**Verdict:** Large blast if cut. Owner decision. If cut, keep audit tables + security tests. Overlaps with `2026-06-14-Codebase-Cleanup-Plan` OG-1/F25.

### SF.2 Project cursors — blast radius: MEDIUM (if cut)

| Component | Files | Notes |
|-----------|-------|-------|
| Feature flags | `src/lib/collaboration/feature-flags.ts` (project cursor/presence parts) | Estimate-sheet broadcast defaults true; project cursors are a separate disabled flag |
| UI layer | `src/components/workshop/ProjectCursorLayer.tsx` | Mounted through `src/components/workshop/ProjectChromeAsync.tsx` |
| Hooks | `src/hooks/use-estimate-cursor-broadcast.ts`, `src/hooks/use-project-presence.ts` | Keep sheet cursor broadcast unless owner broadens the cut; cleanup plan found follow-mode helpers have **zero callers** |
| Tests | `project-collaboration-realtime`, `teamspace-collaboration-header`, `estimate-cursor-broadcast-throttle`, `perf/estimate-sheet-cursor-isolation`, `estimate-cursor-identity`, `project-chrome-streaming` | Split project-wide cursor expectations from sheet cursor expectations |
| **KEEP** | `collaboration_invitations`, `project_members`, `estimate_sheet_members` | Invites are separate from cursors |

**Verdict:** Medium blast if cut. Owner decision. Cleanup plan found follow-mode helpers have zero callers — strong cut signal. Overlaps with `2026-06-14-Codebase-Cleanup-Plan` OG-3/F26.

## Confidence levels

| Finding class | Confidence | Reason |
|---|---|---|
| T1.1 (`class-variance-authority` unused) | **Very high** | 3 independent confirmations (first pass + cleanup plan + Agent A multi-pattern grep) |
| T1.2 (`three` unused) | **Very high** | 3 independent confirmations + Agent A multi-pattern grep including `.storybook/` and `src/stories/`; false positive at `project-cost-comparison.stories.tsx:106` confirmed as local variable, not the package |
| T1.3 (`@next/third-parties` swap) | **High** | Single importer identified; established pattern in `ClarityScript.tsx`; Agent A surfaced `experiment-tracker.ts` dependency on `window.gtag` — swap must preserve it |
| T1.4 (`d3`→`d3-shape`) | **High** | Agent A confirmed only `d3-shape` is imported; `pie()`/`arc()`/`PieArcDatum` usage mapped; 4 test files identified |
| T1.5-T1.8 (visual deps) | **High** | Agent A validated single-importer pattern; test files mapped; swap complexity and LOC delta refined |
| T2.1-T2.7 (mega-files) | **High** | Agent B completed exhaustive 2h10m pass — per-file importer lists, consumed exports, dead exports, test files, coupling scores all validated |
| T3.1-T3.2 (barrels) | **Medium** | Need importer grep before action (not in Agent A/B scope) |
| T3.3-T3.4 (catch/cast) | **High** | Contained to one file |
| T3.5 (HTML stripping) | **High** | Contained, but trust-boundary risk raises severity |
| SF.1-SF.2 (feature cuts) | **High** | Owner decision; cleanup plan cross-referenced |

## Agent B's key findings (Tier 2 mega-files)

1. **`workspace-repository.ts` has 37 source importers** — the widest fanout in the set. Includes 6 workshop pages, 4 API routes, 7+ server action modules, 6 other repositories, and 7 workshop components. Any change to its public API touches 37 files. But it has **13 dead exports** that can be safely removed in a first pass without touching the 21 consumed exports.

2. **`EstimateSheetContent.tsx` has 25 dead exports** — the single biggest ponytail cut in Tier 2. The file exports 26 names but only 1 is consumed by source code (`EstimateSheetContent` itself, dynamically imported by `EstimateWorkspaceClient.tsx`). The other 25 are helpers + `EstimateRightSidebar` re-export + `pesoFormatter` used only by tests. These should move to a separate `component-library-helpers.ts` module.

3. **`component-library/actions.ts` has 14 importers and 16 dead exports** — broad CRUD/search/template surface with many UI consumers. The 16 dead exports are types (`ComponentPriceOptionInput`, `ComponentVariantCostEntryInput`, etc.) + unused functions (`loadCurrentWorkspaceComponentLibraryLite`, `changeCostLibraryComponentLifecycleState`). Safe to remove in a first pass.

4. **`component-library/index.tsx` is NOT a barrel** — despite the `index.tsx` name, it doesn't re-export from other modules. It's a stateful entry point with 2 importers and 0 dead exports. The internal `EstimateRightSidebarBase` (1748 LOC) has 0 direct JSX render sites; the exported wrapper `EstimateRightSidebar` is rendered in 3 files.

5. **AI mega-files (T2.4, T2.5) have narrow fanout** — each has 1 source importer (the AI API handler). Agent B recommends **diff-by-diff** (not split-by-concern) because the narrow fanout means internal restructuring has less impact. But these are conditional on SF.1 — if AI is cut, delete the files instead.

6. **Total dead exports across all 7 mega-files: 57** — these are the safest first PRs. They shrink the public API surface without touching any consumed export. Per-file breakdown: T2.1 (25) + T2.3 (13) + T2.7 (16) + T2.5 (2) + T2.6 (1) + T2.2 (0) + T2.4 (0) = 57.

7. **`publication/actions.ts` has only 1 dead export** (`SharedLinkEmailDeliveryReadiness`) — the file is well-utilized. 12 consumed exports across 5 importers. The refactor opportunity here is extracting shared auth/rate-limit helpers (duplication), not removing dead exports.

8. **Agent B's recommended priority** differs from the safety-first priority. Agent B says start with `workspace-repository.ts` (clearest separation of concerns despite wide fanout). The safety-first approach says start with `publication/actions.ts` (5 importers is safer than 37). Both are defensible — see `05_TIER_2_MEGA_FILE_STRATEGY.md` § "Execution priority order" for both options.
