# 02 — Codebase Analysis

**Date:** 2026-06-21 · **Method:** code-review-graph (16,148 nodes, 190,581 edges, 1,429 files) + 2 parallel explore agents + ponytail examples calibration + cross-reference with `2026-06-14-Codebase-Cleanup-Plan`

## Graph stats (snapshot 2026-06-19)

| Metric | Value |
|--------|------:|
| Files | 1,429 |
| Total nodes | 16,148 |
| Functions | 11,288 |
| Classes | 79 |
| Tests | 3,352 |
| Total edges | 190,581 |
| CALLS edges | 123,052 |
| CONTAINS edges | 15,542 |
| IMPORTS_FROM edges | 5,764 |
| TESTED_BY edges | 45,513 |
| Languages | TypeScript, TSX, JavaScript, SQL, Bash |

## Ponytail calibration (what the ruleset actually catches)

From ponytail's benchmark ([agentic benchmark](https://github.com/DietrichGebert/ponytail/blob/main/benchmarks/results/2026-06-18-agentic.md), Haiku 4.5, n=4, 12 feature tasks):

| Metric | ponytail vs no-skill |
|--------|---:|
| LOC | **−54%** (mean), up to −94% where over-build trap |
| Tokens | −22% |
| Cost | −20% |
| Time | −27% |
| Safety | 100% (every guard preserved) |

From ponytail's [examples](https://github.com/DietrichGebert/ponytail/blob/main/examples/README.md):

| Example | Without (LOC) | With (LOC) | Pattern |
|---|---:|---:|---|
| Email validation | 75 | 3 | stdlib regex |
| Debounce | 116 | 10 | `setTimeout`+`clearTimeout` is the debounce |
| CSV sum | 20 | 3 | stdlib |
| Countdown timer | 267 | 9 | `setInterval` is the countdown |
| Rate limiting | 128 | 10 | native |
| Modal dialog | 30 (1 dep) | 8 (0 dep) | native `<dialog>` |
| Infinite scroll | 1 dep | 0 dep | `IntersectionObserver` |
| URL params | 1 dep | 0 dep | `URLSearchParams` |

**Ponytail's ladder** (stop at the first rung that holds):

1. Does this need to exist? → no: skip it (YAGNI)
2. Stdlib does it? → use it
3. Native platform feature? → use it
4. Installed dependency? → use it
5. One line? → one line
6. Only then: the minimum that works

**Safety guarantees (what ponytail NEVER cuts):** trust-boundary validation, data-loss handling, security, accessibility, calibration real hardware needs, anything explicitly requested. "Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind."

## Findings — Tier 1A: Pure or contained dependency wins

### T1.1 `class-variance-authority` — unused dependency

> **✅ EXECUTED 2026-06-23** (commit `e65e2848`). Confirmed absent from `package.json` and 0 importers as of 2026-06-24 audit.

- **Evidence:** `rg "from ['\"]class-variance-authority['\"]|require\(['\"]class-variance-authority['\"]\)"` → 0 matches across repo. `rg "cva"` → 0 matches in src/ (confirmed by `2026-06-14-Codebase-Cleanup-Plan` F22 + this pass).
- **Action:** Remove from `package.json` dependencies. Run `bun install`.
- **Risk:** Zero — no importer, no runtime path.
- **LOC delta:** 0 in app code.
- **Verification:** `bun run type-check && bun run build` pass.

### T1.2 `three` — unused dependency

> **✅ EXECUTED 2026-06-24** — removed as part of the React Doctor warning cleanup pass (`.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`; `.ai/10_state/current-state.md` 2026-06-24 entry: "removed unused packages (`lenis`, `rough-notation`, `roughjs`, `three`, `@types/three`)"). Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit.

- **Evidence:** `rg "from ['\"]three['\"]|require\(['\"]three['\"]\)"` → 0 matches. `rg "THREE\."` → 0 matches. No dynamic `import("three")`. (Confirmed by cleanup plan F20.)
- **Action:** Remove from `package.json` dependencies. Run `bun install`.
- **Risk:** Zero — no importer, no runtime path.
- **LOC delta:** 0 in app code.
- **Verification:** `bun run type-check && bun run build` pass.

### T1.3 `@next/third-parties` → `next/script` swap

- **Evidence:** Only importer is `src/components/landing/LandingAnalyticsLoader.tsx:3,17-21`, using `GoogleAnalytics` from `@next/third-parties/google`. `src/components/landing/ClarityScript.tsx` already uses `next/script` for Clarity Analytics — established pattern.
- **Critical constraint (Agent A):** `src/lib/ab-testing/experiment-tracker.ts` consumes `window.gtag` and `window.clarity` globals. The swap MUST preserve `window.gtag` (explicitly assign `window.gtag = gtag;` in the inline script), or experiment tracking — including `trackConversion` from `HeroSection.tsx:291` — becomes no-ops.
- **Action:** Rewrite `LandingAnalyticsLoader.tsx` to use `next/script` with the GA tag, matching `ClarityScript.tsx`'s pattern. Explicitly assign `window.gtag`. Remove `@next/third-parties` from `package.json`.
- **Risk:** Medium — consent-gated analytics and experiment tracking both depend on the script bootstrap.
- **LOC delta:** ~−5.
- **Verification:** Browser DevTools → Network → `google-analytics.com` request fires on landing load. `typeof window.gtag === "function"` in console. 3 affected tests pass: `landing-ab-testing.test.tsx`, `closed-beta-env-manifest.test.ts`, `project-publication-security.test.ts`. `bun run build` pass.
- **Blast radius:** 1 file (`LandingAnalyticsLoader.tsx`). No other importer.

### T1.4 `d3` umbrella → `d3-shape` only

- **Evidence (Agent A):** Only `d3-shape` is imported in `src/components/charts/CostDonutChart.tsx:4-5,158-320,322-453`. Uses `pie()` (bucket totals → arc angles), `arc()` (donut ring paths with inner/outer radius, corner radius, active-slice expansion), `PieArcDatum` type, trig on arc mid-angles for label connectors. Full `d3` umbrella package is in `package.json` but unused. (Confirmed by cleanup plan F21.)
- **Action options:**
  - **Option A (recommended, simple):** Replace `d3` umbrella with `d3-shape` in `package.json`. Update import in `CostDonutChart.tsx`. Zero LOC change.
  - **Option B (ponytail stricter):** Inline `pie()`/`arc()` math as native SVG (`Math.PI`, `sin`, `cos`, direct `path d=` strings). −25 LOC. Drops `d3-shape` dep entirely.
- **Risk:** Low (A) / Medium (B) — chart geometry, hover state, hydration behavior are visually tested. Option B must produce byte-identical SVG paths or hydration breaks.
- **LOC delta:** 0 (A) / −25 (B).
- **Verification:** `CostDonutChart` renders correctly. 4 affected tests pass: `cost-donut-chart-ui.test.tsx`, `share/cost-donut-chart-hydration.test.tsx`, `project-dashboard-charts-ui.test.ts`, `project-dashboard-ui-fixtures.ts`. `bun run build` pass.
- **Blast radius:** 1 file (`CostDonutChart.tsx`). No other D3 consumer (verified by Agent A).

## Findings — Tier 1B: Visual owner decisions

These are not "pure wins" because each replacement changes first-viewport or landing-page interaction. They are implementation-ready owner decisions: keep the dependency if the current visual is launch-critical, or swap only with the acceptance criteria in `13_VISUAL_DECISION_AND_QA_MATRIX.md`.

### T1.5 `@firecms/neat` — single-use visual dep

> **⏳ PENDING — 2026-06-24 audit confirms still 1 importer and dep still in `package.json` (v0.8.0). Owner decision still required.**

- **Evidence (2026-06-24 re-audit):** Only importer is `src/components/landing/NeatWireframeBackground.tsx`. Uses `NeatConfig` (type) and `NeatGradient` (lazy-imported after idle time to mount a full-size animated canvas). Fallback render is a static warm linear-gradient block.
- **Ponytail ask:** "Does a native platform feature cover it? CSS gradient / SVG noise / `backdrop-filter`."
- **Action options:**
  - **A (keep):** Keep for closed beta if the visual is owner-approved. ~1 dep.
  - **B (swap):** Keep the static gradient fallback permanently, or replace the canvas layer with pure CSS/SVG background motion. Drop dep. −130 LOC.
- **Risk:** High — client-only, visually prominent hero background with reduced-motion/mobile gating. The patched v0.8.0 adds `paused` property — replacement must support pausing.
- **LOC delta (swap):** −130.
- **Verification:** 4 affected tests pass: `neat-wireframe-background.test.tsx`, `landing-interactivity.test.tsx`, `landing-amigo-redesign.test.tsx`, `landing-company-proof.test.ts`. Visual QA on landing page. `bun run build` pass.
- **Owner decision needed:** Is the Neat wireframe a launch-critical visual?

### T1.6 `lenis` — single-use smooth-scroll dep

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `lenis` removed outright by the React Doctor warning cleanup. Landing-v3 refactor (`66bfc93e`, `5d127690`) removed `LandingSmoothScrollProvider.tsx` and its `ReactLenis` wrapper before the dep was deleted. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. Historical analysis retained for traceability.

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `lenis` removed outright by the React Doctor warning cleanup. Landing-v3 refactor (`66bfc93e`, `5d127690`) removed `LandingSmoothScrollProvider.tsx` and its `ReactLenis` wrapper before the dep was deleted. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. The historical analysis below is retained for traceability.

### T1.7 `rough-notation` — single-use annotation dep

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `rough-notation` removed outright by the React Doctor warning cleanup. Landing-v3 refactor retired the legacy `HeroSection.tsx` / `LaunchFeatureHeading.tsx` surfaces that consumed it. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit.

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `rough-notation` removed outright by the React Doctor warning cleanup. Landing-v3 refactor retired the legacy `HeroSection.tsx` / `LaunchFeatureHeading.tsx` surfaces that consumed it. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit.

### T1.8 `roughjs` — single-use illustration dep

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `roughjs` removed outright by the React Doctor warning cleanup. Landing-v3 refactor retired the legacy `AnimatedProposalRecordSection.tsx` illustration that consumed it (the ~684 LOC dependent on `rough.svg()` went with the component). Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. The original −500 LOC cut was realized as a deletion, not a swap.

> **✅ EXECUTED 2026-06-24 (cleanup consumed)** — `roughjs` removed outright by the React Doctor warning cleanup. Landing-v3 refactor retired the legacy `AnimatedProposalRecordSection.tsx` illustration that consumed it. Confirmed 0 importers and absent from `package.json` as of 2026-06-24 audit. The original −500 LOC cut was realized as a deletion, not a swap.

## Findings — Tier 2: Mega-files (apply ponytail on any edit)

> **Strategy:** These are NOT refactored in one shot. The strategy is: (a) run `/ponytail-review` on any PR that touches these files, (b) shrink diff-by-diff, (c) extract concerns only when a natural edit boundary appears. One-shot refactors risk behavior regression.

### T2.1 `src/components/workshop/EstimateSheetContent.tsx` (2950 LOC at 2026-06-21 · **3550 LOC at 2026-06-24 audit · +600 drift**)

- **Largest function:** `EstimateSheetContent` — 1881 LOC (lines 1042-2922). Single component doing history, export, library wiring, tree rendering, grid editing, and sidebar coordination.
- **Ponytail ask:** "Does this need to exist as one component? Split by concern."
- **Natural split candidates:** history panel, export button, library wiring, tree renderer, grid editor, sidebar coordinator.
- **Coupling:** See `05_TIER_2_MEGA_FILE_STRATEGY.md` for full importer/exporter analysis.
- **Risk:** High — core estimate editing surface. Any regression blocks users.
- **Strategy:** Diff-by-diff only. Never one-shot. `/ponytail-review` on every PR.

### T2.2 `src/components/workshop/component-library/index.tsx` (2541 LOC at 2026-06-21 · **3409 LOC at 2026-06-24 audit · +868 drift**)

- **Largest function:** `EstimateRightSidebarBase` — 1748 LOC (lines 786-2533).
- **Ponytail ask:** "Peel off local hooks/helpers. One component doing 5 jobs."
- **Natural split candidates:** search/filter, category tree, card list, drag source, detail panel.
- **Strategy:** Diff-by-diff. `/ponytail-review` on every PR.

### T2.3 `src/lib/repositories/workspace-repository.ts` (2695 LOC at 2026-06-21 · **3242 LOC at 2026-06-24 audit · +547 drift · 36 importers (was 37)**)

- **Ponytail ask:** "Separate access resolution, query orchestration, and DTO mapping."
- **Natural split candidates:** access guards, query builders, response shaping, RPC wrappers.
- **Strategy:** Extract helpers when a natural boundary appears. `/ponytail-review` on every PR.

### T2.4 `src/lib/ai/package-builder/draft.ts` (2412 LOC at 2026-06-21 · **2443 LOC at 2026-06-24 audit · +31 drift**)

- **Ponytail ask:** "Heuristic parser with many one-off text helpers. Collapse by concern."
- **Natural split candidates:** text extraction, line-item classification, assembly, validation.
- **Caveat:** AI surface is off by default (see speculative features). If AI is cut for closed beta, this file may not need refactoring at all.
- **Strategy:** Decide AI surface first. If keeping, diff-by-diff. If cutting, delete the file.

### T2.5 `src/lib/ai/read-context.ts` (2023 LOC at 2026-06-21 · **2020 LOC at 2026-06-24 audit · −3 drift**)

- **Ponytail ask:** "One giant dispatcher. Break by intent/domain."
- **Same caveat as T2.4:** AI-gated. May not need refactoring if AI is cut.

### T2.6 `src/lib/publication/actions.ts` (~1538 LOC at 2026-06-21 · **1637 LOC at 2026-06-24 audit · +99 drift · 4 importers (was 5)**)

- **Ponytail ask:** "Repeated auth/rate-limit/client helpers. Extract shared helper."
- **Strategy:** Extract shared auth/rate-limit helper. Diff-by-diff.

### T2.7 `src/lib/component-library/actions.ts` (~1591 LOC at 2026-06-21 · **1749 LOC at 2026-06-24 audit · +158 drift**)

- **Ponytail ask:** "Duplicated access checks/validators. Factor common pattern."
- **Strategy:** Extract shared access-check helper. Diff-by-diff.

## Findings — Tier 3: Small over-engineering (quick cuts)

### T3.1 `src/components/landing/index.ts` — pure barrel

- 27-line pure re-export file. Ponytail: "boilerplate nobody asked for."
- **Action:** Cut unless it earns its keep (check if any importer uses `from "@/components/landing"` vs direct imports).
- **Risk:** Low — barrel removal just updates import paths.

### T3.2 `src/lib/activity/index.ts` — pure barrel

- 6-line pure re-export. Same as T3.1.

### T3.3 `src/components/workshop/ProjectEstimatesTable.tsx:99-121` — localStorage wrappers with empty catches

- Ponytail: **data-loss handling is never on the chopping block.** Empty `catch` blocks swallow errors that could lose user data.
- **Action:** Either handle the error (log + fallback) or drop the wrapper and use `localStorage` directly with a single try/catch at the call site.
- **Risk:** Low — preference storage, not critical path.

### T3.4 `src/lib/reusable-sources/actions.ts:192-217` — `supabase as unknown as` cast

- Ponytail: **no `as any` / cast escapes.** The cast wraps one optional tab query.
- **Action:** Replace with a typed helper or simpler branch. If the query is optional, guard with `if (query)`.
- **Risk:** Low — optional path.

### T3.5 `src/lib/share/sanitize-recipient-text.ts` — hand-rolled HTML stripping

- Ponytail: **stdlib / native platform feature.** `DOMParser` or a trusted sanitizer (`DOMPurify`) is more robust than hand-rolled entity decoding.
- **Action:** Replace with `DOMParser` + `textContent`, or import a trusted sanitizer.
- **Risk:** Medium — share recipient text is a trust-boundary input. Ponytail explicitly preserves trust-boundary validation. The swap must be at least as robust as the hand-rolled version.
- **Verification:** Test with malicious input (`<script>`, `<img onerror>`, encoded entities).

## Findings — Tier 4: Ponytail won't help (leave alone)

- `src/lib/supabase/types.ts` (4509 LOC) — generated by Supabase CLI. Don't edit by hand.
- `.agents/`, `.claude/`, `.github/` skill scripts (impeccable detector, live-browser.js) — third-party scripts, not app code.
- `supabase/migrations/*` — schema source of truth. Ponytail is for code, not schema.
- Tests (3,352 test nodes) — ponytail preserves tests. Don't apply ponytail to test files.
- `archestimator_pitch deck/deck-stage.js` (1763 LOC) — pitch deck, not app code.

## Speculative features (owner decision, not auto-cut)

### SF.1 AI surface — off by default

- `src/lib/ai/feature-flags.ts` defaults `AI_ROUTES_ENABLED_ENV` and `ASK_FLIP_UI_ENABLED_ENV` to `false`.
- Client surface: `src/components/workshop/EstimateCopilotFloatingButton.tsx` (gated by `useAskFlipUiEnabled`).
- Server surface: `src/lib/ai/` (read-context, package-builder/draft, package-builder/apply), `src/app/api/ai/ask/`, `src/app/api/ai/package-builder/`.
- Security contract if kept hidden: routes must deny while disabled, require auth when enabled, preserve rate limits, avoid provider calls while flags are false, and retain audit events. See `14_SECURITY_AND_NETWORK_CONTRACTS.md`.
- **Ponytail rung 1 (YAGNI):** "Does this need to exist for closed beta?"
- **Options:**
  - **Keep hidden:** Leave flags off, ship closed beta without AI. Code stays for future enable.
  - **Cut:** Remove the entire AI surface (routes, lib, tests, flags). Smaller bundle, less to maintain. Re-add when AI is real beta scope.
- **Owner decision needed.** Overlaps with cleanup plan OG-1/F25.

### SF.2 Project-wide cursors — partly off by default

- `src/lib/collaboration/feature-flags.ts` defaults estimate-sheet cursor broadcast (`NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST`) to `true`; project-wide cursors (`NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS`) and follow-mode are separate closed-beta decisions and default disabled.
- Surface: `src/components/workshop/ProjectCursorLayer.tsx`, `src/hooks/use-estimate-cursor-broadcast.ts`, `src/hooks/use-project-presence.ts`.
- Cut boundary: do not remove estimate-sheet cursor collaboration unless the owner explicitly broadens SF.2. A project-wide cursor cut must keep collaboration invitations, project members, estimate sheet members, and sheet cursor tests intact.
- **Ponytail rung 1 (YAGNI):** "Does this need to exist for closed beta?"
- **Options:**
  - **Keep hidden:** Leave flags off. Code stays for future enable.
  - **Cut:** Remove cursor/presence surface. Re-add when Teamspace realtime ships.
- **Owner decision needed.** Overlaps with cleanup plan OG-3/F26. Cleanup plan also found follow-mode helpers have **zero callers** — strong cut signal.

## Second-pass findings (from parallel codebase re-pass agent — VALIDATED, Agent C 3h31m)

### T3.6 Repeated auth/rate-limit boilerplate in `collaboration/actions.ts:466`

- **Finding:** Invite flows repeat the same access + rate-limit gate sequence 4 times. Shared helper would cut boilerplate.
- **Ponytail action:** Extract shared `assertInviteAccess` / `rateLimitInvite` helper. One PR, low risk. −30 LOC.

### T3.7 Repeated RBAC/limiter boilerplate in `publication/actions.ts:1205`

- **Finding:** `assertProjectPublicationManager` shows up 7 times. Extract shared publication guard. (Overlaps with T2.6 mega-file strategy.)
- **Ponytail action:** Extract shared `assertPublicationAccess` helper. −40 LOC.

### T3.8 Over-fixture'd Storybook stories

- **Finding:** `src/stories/domain/share/receiver-states.stories.tsx:19` — 400+ lines of static snapshot data. `src/stories/domain/workshop/modal-patterns.stories.tsx:19` — oversized modal fixture.
- **Ponytail action:** Trim fixtures. Move static data to a shared fixture file. −300 LOC combined.

### T3.9 Registry-like bridges with one consumer

- **Finding:** `src/components/workshop/use-estimate-header-actions-store.ts:19` — singleton register/clear bridge with one real register site. `src/lib/collaboration/realtime-telemetry.ts:30` — sink registry exists but no sink is registered in src (dormant).
- **Ponytail action:** Inline the bridge into its sole consumer, or remove if dormant. −50 LOC.

### T3.10 Trivial hook wrapper

- **Finding:** `src/hooks/use-is-hydrated.ts:23` — tiny wrapper around `useSyncExternalStore`. 1-line hook.
- **Ponytail action:** Inline at call site, or keep for name clarity (`useIsHydrated` is self-documenting). −10 LOC (or 0 if kept).

### T3.11 Duplicate date formatting

- **Finding:** `src/components/workshop/ProjectDashboardClient.tsx:52` — `formatDate` duplicated across workshop, share, and dashboard surfaces.
- **Ponytail action:** Extract one shared `formatDate` helper in `src/lib/ui/`. Update callers. −15 LOC net.

### T3.12 Duplicate query-string parsing

- **Finding:** `src/components/workshop/project-data/ProjectDataClient.tsx:42` — `URLSearchParams` parsing is duplicated. Same pattern in `ComponentLibraryManager.tsx`.
- **Ponytail action:** Extract shared `parseUrlParams` helper. Stdlib `URLSearchParams` exists; the parsing logic is what's duplicated. −10 LOC.

### T3.13 Hand-rolled debounce in two hooks (NOT YET a cut)

- **Finding:** `src/hooks/use-prefetch-on-hover.ts:24` — hand-rolled debounce. Similar logic in `use-estimate-cursor-broadcast.ts`. Two callers, not three.
- **Ponytail action:** No action yet. Ponytail says "don't build a utility until 3+ callers." Add `ponytail:` comment noting the ceiling. Flag when a third caller appears.

### T3.14 API routes with zero client callers

- **Finding:** 5 routes with no src client callers found: `src/app/api/health/route.ts:7` (ops-only, expected), `src/app/api/webhooks/resend/route.ts:18` (webhook-only, expected), `src/app/api/share/[token]/events/route.ts:17`, `src/app/api/share/[token]/unsubscribe/route.ts:54`, `src/app/api/share/[token]/route.ts:18`.
- **Ponytail action:** Keep health + webhook (ops/infrastructure). Evaluate share routes with owner — verify indirect access path before cutting.

### Categories that came back clean

No new findings for: ≤3-state reducers/FSMs, HOCs/render-props, config-for-config, premature-abstraction interfaces, over-typed TS beyond the already-captured cast-heavy code. Archestimator doesn't have the kind of abstraction-layer over-engineering ponytail targets in dependency injection frameworks — the over-engineering is concentrated in dependency sprawl, mega-files, and duplicate boilerplate — all captured in Tier 1-2 + T3.1-T3.14.

## Cross-reference to existing cleanup plan

| This plan | Cleanup plan (2026-06-14) | Note |
|---|---|---|
| T1.1 (`class-variance-authority`) | F22 | Same finding, same evidence |
| T1.2 (`three`) | F20 | Same finding, same evidence |
| T1.4 (`d3`→`d3-shape`) | F21 | Same finding, same evidence |
| SF.1 (AI surface) | F25 / OG-1 | Same finding; this plan adds ponytail framing |
| SF.2 (project cursors) | F26 / OG-3 | Same finding; cleanup plan found follow-mode zero-caller |
| T2.1-T2.7 (mega-files) | (not covered) | **This plan adds** the mega-file strategy |
| T1.3 (`@next/third-parties` swap) | (not covered) | **This plan adds** |
| T1.5-T1.8 (visual deps) | (not covered) | **This plan adds** |
| T3.1-T3.5 (quick cuts) | (partially covered) | This plan adds ponytail framing |
| 10_PONYTAIL_OPERATING_MODEL.md | (not covered) | **This plan adds** the ongoing discipline |
