# 04 — Tier 1 Dependency Cleanup Plan

**Date:** 2026-06-21 · **Status:** VALIDATED (Agent A `bg_d4c101b4` complete)

This document is the step-by-step plan for each Tier 1 dependency removal/swap. Execute in Wave 1 (see `07_IMPLEMENTATION_WAVES.md`), in the order listed (lowest risk first).

## Prerequisites

1. **Check `git log`** — if `2026-06-14-Codebase-Cleanup-Plan` already executed any of these (T1.1/T1.2/T1.4), skip them. Don't duplicate work.
2. **Check `git status`** — working tree must be clean. If another agent is editing, wait or coordinate (see `11_AGENT_COORDINATION_LEDGER.md`).
3. **Run `bun install`** before starting to ensure a clean baseline.

## T1.1 — Remove `class-variance-authority`

> **✅ EXECUTED 2026-06-23** — commit `e65e2848` "chore(deps): remove class-variance-authority and use local react-doctor binary". Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. Steps below are retained as the historical record of the executed change.

**Risk:** Zero · **Effort:** 2 minutes · **LOC delta:** 0 in app code

### Steps

1. **Pre-check (confirm 0 imports):**
   ```bash
   rg "from ['\"]class-variance-authority['\"]|require\(['\"]class-variance-authority['\"]\)|cva\(" src tests --type ts --type tsx
   # Expected: 0 matches
   ```
   If ANY match: **STOP.** The dep is used. Do not remove. Report the finding.

2. **Edit `package.json`:** Remove the `"class-variance-authority": "..."` line from `dependencies`.

3. **Install + gate:**
   ```bash
   bun install
   bun run type-check
   bun run build
   ```

4. **Verify:**
   - `bun install` exits 0 (lockfile updated)
   - `type-check` exits 0 (no new type errors)
   - `build` exits 0 (build artifacts present in `.next/`)

### Rollback

```bash
git revert HEAD
# or: re-add the line to package.json and bun install
```

### Commit message

```
chore(deps): remove unused class-variance-authority

0 imports across src/, tests/ (multi-pattern grep + 2026-06-14
cleanup plan cross-reference). Wave 1 of Ponytail Pass Plan.
```

---

## T1.2 — Remove `three`

> **✅ EXECUTED 2026-06-24** — removed as part of the React Doctor warning cleanup pass (see `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` and `.ai/10_state/current-state.md` 2026-06-24 entry: "removed unused packages (`lenis`, `rough-notation`, `roughjs`, `three`, `@types/three`)"). Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit.

**Risk:** Zero · **Effort:** 2 minutes · **LOC delta:** 0 in app code

### Steps

1. **Pre-check (multi-pattern, confirm 0 imports):**
   ```bash
   rg "from ['\"]three['\"]|require\(['\"]three['\"]\)|THREE\.|threejs" src tests src/stories .storybook --type ts --type tsx
   # Expected: 0 matches
   rg "import\(['\"]three['\"]\)" src tests
   # Expected: 0 dynamic imports
   ```
   If ANY match: **STOP.** Report the finding.

   **Known false positive:** `src/stories/charts/project-cost-comparison.stories.tsx:106` has `const THREE = makeData(...)`. This is a local dataset variable, NOT the `three` package. No import. Safe to ignore.

2. **Edit `package.json`:** Remove the `"three": "..."` line. Also remove `"@types/three": "..."` from devDependencies (no consumer remains).

3. **Install + gate:**
   ```bash
   bun install
   bun run type-check
   bun run build
   ```

4. **Verify:** Same as T1.1.

### Rollback

Same as T1.1.

### Commit message

```
chore(deps): remove unused three.js

0 imports across src/, tests/, src/stories/, .storybook/ (multi-pattern
grep including THREE. namespace + dynamic imports + 2026-06-14 cleanup plan
cross-reference). False positive at project-cost-comparison.stories.tsx:106
confirmed as local const, not the package. Also drop @types/three. Wave 1
of Ponytail Pass Plan.
```

---

## T1.3 — Swap `@next/third-parties` → `next/script`

**Risk:** Medium (consent-gated analytics + experiment tracking depend on the script bootstrap) · **Effort:** 15 minutes · **LOC delta:** ~−5

### Critical constraint

`src/lib/ab-testing/experiment-tracker.ts` consumes `window.gtag` and `window.clarity` globals. The swap MUST preserve `window.gtag` (and `window.clarity`), or experiment tracking — including `trackConversion` called from `HeroSection.tsx:291` — becomes no-ops.

Security/network acceptance for this swap is explicit in `14_SECURITY_AND_NETWORK_CONTRACTS.md`: preserve consent gating, CSP compatibility, GA ID allowlisting/escaping from env, no GA/Clarity on share/publication routes, no pre-consent network requests, and no project/user PII in analytics payloads.

Three test files cover this:
- `tests/vitest/landing-ab-testing.test.tsx` — stubs gtag/clarity and asserts consent-gated tracking
- `tests/vitest/closed-beta-env-manifest.test.ts` — verifies GA/Clarity env vars
- `tests/vitest/project-publication-security.test.ts` — documents GA4/Clarity isolation on share routes

### Steps

1. **Pre-check (find all importers):**
   ```bash
   rg -l "@next/third-parties" src
   # Expected: only src/components/landing/LandingAnalyticsLoader.tsx
   ```
   If >1 file: **STOP.** The dep has more consumers than expected. Update the plan.

2. **Read the existing pattern:**
   ```bash
   cat src/components/landing/ClarityScript.tsx
   ```
   Note how `next/script` is used: the `Script` component, the `strategy` prop, the `src` prop, `dangerouslySetInnerHTML` for inline scripts, where it's mounted.

3. **Read the current GA loader:**
   ```bash
   cat src/components/landing/LandingAnalyticsLoader.tsx
   ```
   Note what's imported from `@next/third-parties/google` (`GoogleAnalytics`), what props it takes (`ga_id` or similar), and how `consent.analytics` gates the render.

4. **Read the experiment tracker (to preserve `window.gtag`):**
   ```bash
   cat src/lib/ab-testing/experiment-tracker.ts
   ```
   Note exactly how `window.gtag` and `window.clarity` are called. The swap must keep these globals working.

5. **Rewrite `LandingAnalyticsLoader.tsx`:**
   ```tsx
   // Before:
   import { GoogleAnalytics } from "@next/third-parties/google";
   // ...
   {consent.analytics && gaId && <GoogleAnalytics ga_id={gaId} />}

   // After (match ClarityScript pattern + preserve window.gtag):
   import Script from "next/script";
   // ...
   {consent.analytics && gaId && (
     <>
       <Script
         src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
         strategy="afterInteractive"
       />
       <Script id="google-analytics" strategy="afterInteractive">
         {`
           window.dataLayer = window.dataLayer || [];
           function gtag(){dataLayer.push(arguments);}
           window.gtag = gtag;
           gtag('js', new Date());
           gtag('config', '${gaId}');
         `}
       </Script>
     </>
   )}
   ```
   **Critical:** explicitly assign `window.gtag = gtag;` so `experiment-tracker.ts` keeps working. Adjust to match the exact props/strategy used in `ClarityScript.tsx`.

6. **Edit `package.json`:** Remove the `"@next/third-parties": "..."` line.

7. **Install + gate:**
   ```bash
   bun install
   bun run type-check
   bun run build
   ```

8. **Run the affected tests:**
   ```bash
   bun run test:dom -- landing-ab-testing closed-beta-env-manifest project-publication-security
   # All three must pass
   ```

9. **Browser QA:**
   ```bash
   bun run dev
   ```
   - Open `http://localhost:3000`
   - Open DevTools → Network
   - Filter `google-analytics.com` or `googletagmanager.com`
   - Verify the GA script fires on landing load (after consent accepted)
   - **Verify `window.gtag` is defined** in the console: `typeof window.gtag` → `"function"`
   - **Verify consent banner interaction:** if the landing has a consent banner, verify GA respects it (fires only after consent accepted). This is critical — `@next/third-parties` may have built-in consent handling that `next/script` does not.
   - **Verify experiment tracking still works:** trigger an experiment view (e.g., load a landing variant) and verify `gtag('event', ...)` calls fire in Network.

### Rollback

```bash
git revert HEAD
```

### Commit message

```
chore(analytics): swap @next/third-parties for next/script

LandingAnalyticsLoader.tsx was the only consumer of @next/third-parties.
Swap to next/script, matching the existing ClarityScript.tsx pattern.
Explicitly assign window.gtag so experiment-tracker.ts keeps working.
Removes one dependency. Wave 1 of Ponytail Pass Plan.

Browser QA: GA fires on landing load; consent banner gating verified;
window.gtag defined; experiment tracking gtag('event', ...) calls fire.
Tests: landing-ab-testing, closed-beta-env-manifest, project-publication-security all pass.
```

---

## T1.4 — Narrow `d3` → `d3-shape` (Option A) or inline native SVG math (Option B)

**Risk:** Low (Option A) / Medium (Option B) · **Effort:** 5 min (A) / 30 min (B) · **LOC delta:** 0 (A) / −25 (B)

### Context

Agent A confirmed: only `d3-shape` is imported (no `d3` umbrella, no other D3 sub-packages). The importer is `src/components/charts/CostDonutChart.tsx:4-5,158-320,322-453`. It uses:
- `pie()` — converts bucket totals into arc angles
- `arc()` — converts arcs into donut ring paths with inner/outer radius, corner radius, and active-slice expansion
- `PieArcDatum` type — types `buildCallouts`
- Trig on each arc mid-angle for label connectors

4 test files cover this: `cost-donut-chart-ui.test.tsx`, `share/cost-donut-chart-hydration.test.tsx`, `project-dashboard-charts-ui.test.ts`, `project-dashboard-ui-fixtures.ts`.

### Option A — Narrow `d3` → `d3-shape` (recommended, simplest)

**Steps:**

1. **Pre-check (find all D3 imports):**
   ```bash
   rg "from ['\"]d3['\"]|from ['\"]d3-" src
   # Expected: only CostDonutChart.tsx importing from d3-shape
   ```
   If any file imports from `d3` umbrella: note it. If any file imports from `d3-scale`, `d3-array`, etc.: keep those sub-packages.

2. **Edit `package.json`:** Replace `"d3": "^7.9.0"` with `"d3-shape": "^3.x"`. Also replace `"@types/d3": "^7.4.3"` with `"@types/d3-shape": "^3.x"` in devDependencies.

3. **Edit `CostDonutChart.tsx` (if needed):**
   ```tsx
   // Before (if importing from d3 umbrella):
   import { arc, pie } from "d3";
   import type { PieArcDatum } from "d3";
   // After:
   import { arc, pie } from "d3-shape";
   import type { PieArcDatum } from "d3-shape";
   ```
   If already importing from `d3-shape`: no change needed.

4. **Install + gate:**
   ```bash
   bun install
   bun run type-check
   bun run build
   ```

5. **Run the affected tests:**
   ```bash
   bun run test:dom -- cost-donut-chart project-dashboard-charts
   # All must pass
   ```

6. **Browser QA:**
   ```bash
   bun run dev
   ```
   - Open a project that has charts (any project with estimate data)
   - Verify `CostDonutChart` renders correctly (donut shape, arcs, labels, hover state)

### Option B — Inline native SVG math (ponytail stricter, drops `d3-shape` entirely)

**Steps:**

1. Read `CostDonutChart.tsx` fully (lines 1-453). Note every use of `pie()`, `arc()`, `PieArcDatum`.
2. Write native SVG replacements:
   - `pie()` → compute arc angles with `Math.PI * 2 * (value / total)` per slice
   - `arc()` → compute SVG path `d=` strings with `Math.sin`/`Math.cos` for each arc point; handle inner/outer radius, corner radius, active-slice expansion
   - `PieArcDatum` → define a local type
   - Label connector trig → keep as-is (already native math)
3. Keep existing `roundSvgPath`/`formatSvgNumber` helpers.
4. Remove `d3-shape` and `@types/d3-shape` from `package.json`.
5. Gate + tests + browser QA (same as Option A).

**Risk:** Medium — chart geometry, hover state, and hydration behavior are visually tested. The swap must produce byte-identical SVG paths (the hydration test checks deterministic SVG output). If paths differ, hydration breaks.

**Recommendation:** Start with Option A (simple dep narrowing). Only pursue Option B if bundle size is a launch gate.

### Rollback

```bash
git revert HEAD
```

### Commit message (Option A)

```
chore(deps): narrow d3 umbrella to d3-shape

Only d3-shape (pie, arc, PieArcDatum) is imported, by CostDonutChart.tsx.
Replace the d3 umbrella with the specific sub-package. Wave 1 of Ponytail
Pass Plan.

Tests: cost-donut-chart-ui, cost-donut-chart-hydration, project-dashboard-charts-ui all pass.
Browser QA: CostDonutChart renders correctly.
```

### Commit message (Option B)

```
refactor(charts): inline d3-shape math as native SVG in CostDonutChart

Replace pie()/arc()/PieArcDatum with native SVG path math (Math.PI, sin,
cos, direct path d= strings). Drops d3-shape dependency. -25 LOC. Wave 1
of Ponytail Pass Plan.

Tests: cost-donut-chart-ui, cost-donut-chart-hydration (byte-identical SVG),
project-dashboard-charts-ui all pass.
Browser QA: CostDonutChart renders correctly, hover state works, hydration matches.
```

---

## T1.5-T1.8 — Visual dependency decisions

**These are NOT in Wave 1.** They require owner decisions (keep or swap). See `07_IMPLEMENTATION_WAVES.md` Wave 2 for the owner decision flow and `13_VISUAL_DECISION_AND_QA_MATRIX.md` for the implementation-ready visual acceptance criteria.

**Validated blast radius (Agent A):**

| Dep | LOC delta (swap) | Swap complexity | Risk | Test files affected |
|-----|---:|---|---|---|
| `@firecms/neat` | −130 | Complex | High (visually prominent hero background; reduced-motion/mobile gating) | 4 tests |
| `lenis` | −30 | Moderate | Low-medium (UX feel, not data flow) | 3 tests |
| `rough-notation` | −120 | Moderate | Medium (headline styling and motion are landing-page visible) | 3 tests |
| `roughjs` | **−500** | Complex | High (large custom visual composition, many geometry-dependent paths) | 2 tests |

For each visual dep where the owner decides **swap**, the step-by-step is:

### T1.5 `@firecms/neat` swap (if owner approves)

1. Read `src/components/landing/NeatWireframeBackground.tsx` (lines 4, 116, 120-172)
2. Write a CSS gradient + SVG noise replacement, OR keep the static gradient fallback permanently and drop the canvas layer
3. **Preserve reduced-motion/mobile gating** (the current component has it; the replacement must too)
4. **Preserve `paused` property behavior** (the patched v0.8.0 adds pause/resume for WebGL animation loop — the CSS/SVG replacement should support pausing)
5. Remove the `@firecms/neat` import, `NeatConfig` type, `NeatGradient` lazy-import, idle activation, observers, and dynamic import
6. Edit `package.json` — remove `@firecms/neat`
7. `bun install && bun run type-check && bun run lint:design-system && bun run build`
8. Run affected tests: `bun run test:dom -- neat-wireframe-background landing-interactivity landing-amigo-redesign landing-company-proof`
9. Browser QA: landing page background visual; reduced-motion respected; mobile gating works; before/after screenshot; owner approves
10. Commit: `chore(landing): swap @firecms/neat for CSS gradient + SVG noise`

### T1.6 `lenis` swap (if owner approves)

> **✅ EXECUTED 2026-06-24 (cleanup consumed, no swap needed)** — `lenis` was removed outright by the React Doctor warning cleanup pass (see `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` and `.ai/10_state/current-state.md` 2026-06-24). The landing-v3 refactor (`66bfc93e`, `5d127690`, `bc81a8af`) removed `LandingSmoothScrollProvider.tsx` and its `ReactLenis` wrapper before the dep was deleted. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. The owner-decision matrix below is retained as a historical record; no further action required.

1. Read `src/components/landing/LandingSmoothScrollProvider.tsx` (lines 3-4, 20-41)
2. Replace `ReactLenis` wrapper with `html { scroll-behavior: smooth; }` in `globals.css` + `scroll-margin-top` / anchor offsets + a `prefers-reduced-motion` guard
3. **Preserve `data-lenis-prevent` exclusion semantics** (or drop them intentionally — document the decision)
4. Remove the `lenis` import and provider usage
5. Edit `package.json` — remove `lenis`
6. `bun install && bun run type-check && bun run lint:design-system && bun run build`
7. Run affected tests: `bun run test:dom -- public-page-shell live-estimate-node-route landing-company-proof`
8. Browser QA: landing page scroll feel; reduced-motion respected; anchor scrolling works; owner approves
9. Commit: `chore(landing): swap lenis for native scroll-behavior`

### T1.7 `rough-notation` swap (if owner approves)

> **✅ EXECUTED 2026-06-24 (cleanup consumed, no swap needed)** — `rough-notation` was removed outright by the React Doctor warning cleanup pass (see `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` and `.ai/10_state/current-state.md` 2026-06-24). The landing-v3 refactor retired the legacy `HeroSection.tsx` / `LaunchFeatureHeading.tsx` surfaces that consumed it. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit.

1. Read `src/components/landing/HeroSection.tsx` (lines 7, 147-245) and `LaunchFeatureHeading.tsx` (lines 4, 11-34)
2. Replace `annotate(...)` calls with CSS `text-decoration: wavy underline` or an SVG underline/circle overlay path
3. The hero already has some inline SVG highlight scaffolding — reuse or extend it
4. Remove the `rough-notation` import and annotation usage from both files
5. Edit `package.json` — remove `rough-notation`
6. `bun install && bun run type-check && bun run lint:design-system && bun run build`
7. Run affected tests: `bun run test:dom -- landing-interactivity landing-amigo-redesign landing-company-proof`
8. Browser QA: hero + feature heading visuals; underline/circle animations; before/after screenshot; owner approves
9. Commit: `chore(landing): swap rough-notation for CSS/SVG underline overlays`

### T1.8 `roughjs` swap (if owner approves)

> **✅ EXECUTED 2026-06-24 (cleanup consumed, no swap needed)** — `roughjs` was removed outright by the React Doctor warning cleanup pass (see `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` and `.ai/10_state/current-state.md` 2026-06-24). The landing-v3 refactor retired the legacy `AnimatedProposalRecordSection.tsx` illustration that consumed it (the ~684 LOC dependent on `rough.svg()` went with the component). Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. The largest single-dep LOC cut in the original plan (−500) was realized as a deletion, not a swap.

1. Read `src/components/landing/AnimatedProposalRecordSection.tsx` (lines 12-13, 164-608, 630-848 — ~684 LOC depend on roughjs)
2. Replace the sketch-style SVG illustration with an authored SVG asset (static or CSS-animated) — cards, arrows, dashed revision loop, bubble quote
3. OR drop the illustration entirely (if the owner decides the illustration isn't launch-critical)
4. Remove the `roughjs` import and all `rough.svg(svg)` usage
5. Edit `package.json` — remove `roughjs`
6. `bun install && bun run type-check && bun run lint:design-system && bun run build`
7. Run affected tests: `bun run test:dom -- closed-beta-pricing-copy landing-amigo-redesign`
8. Browser QA: section illustration visual; before/after screenshot; owner approves
9. Commit: `chore(landing): swap roughjs for authored SVG illustration`

**Note on T1.8:** This is the largest single-dep LOC cut in the plan (−500 LOC), but also the highest visual complexity. The owner should decide carefully — the sketch illustration is a distinctive visual element. If keeping, the dep stays. If cutting, the replacement SVG must be authored carefully to preserve the illustration's intent.

---

## Wave 1 completion checklist

- [ ] T1.1: `class-variance-authority` removed, gates pass
- [ ] T1.2: `three` + `@types/three` removed, gates pass
- [ ] T1.3: `@next/third-parties` swapped, GA fires in browser, **`window.gtag` defined**, consent respected, experiment tracking `gtag('event', ...)` calls fire, 3 affected tests pass
- [ ] T1.4: `d3` narrowed to `d3-shape` (Option A) or inlined as native SVG (Option B), chart renders, 4 affected tests pass
- [ ] `bun run type-check && bun run build` exit 0, or any failure is documented as pre-existing in the fresh baseline from `08_VERIFICATION_STRATEGY.md`
- [ ] No NEW test failures (pre-existing failures are OK — see `08_VERIFICATION_STRATEGY.md`)
- [ ] Each change in its own commit (or one squashed commit with all 4)

## What NOT to do in Wave 1

- **Do not remove `class-variance-authority` if Agent A or your own grep finds ANY usage.** Report and stop.
- **Do not remove `three` if ANY `THREE.` or dynamic import is found.** Report and stop. (Known false positive: `src/stories/charts/project-cost-comparison.stories.tsx:106` local `const THREE` — safe to ignore.)
- **Do not swap `@next/third-parties` without preserving `window.gtag`.** `experiment-tracker.ts` depends on it. Verify `typeof window.gtag === "function"` in browser QA. Run the 3 affected tests.
- **Do not narrow `d3` without running the 4 affected tests.** The hydration test checks deterministic SVG output — any path difference breaks hydration.
- **Do not execute Wave 1 if `git status` is dirty.** Wait or coordinate.
- **Do not execute Wave 1 if `2026-06-14-Codebase-Cleanup-Plan` already did.** Check `git log` first.
- **Do not pursue T1.4 Option B (inline native SVG) without byte-identical SVG paths.** The `cost-donut-chart-hydration.test.tsx` test will fail if paths differ. If paths differ, revert to Option A.
