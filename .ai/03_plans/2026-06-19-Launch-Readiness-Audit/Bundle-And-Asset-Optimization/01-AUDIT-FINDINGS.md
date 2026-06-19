# Bundle & Asset Optimization — Audit Findings (2026-06-19)

## Scope & coverage

**Read in full / verified directly:**
- `package.json` (deps, devDeps, ignoreScripts, patchedDependencies).
- `next.config.ts` (images, optimizePackageImports, bundle analyzer, headers).
- `src/app/layout.tsx` (font strategy: `next/font/google` Doto + Roboto_Mono; SF Pro system stack).
- All heavy-lib import sites: `three` (zero), `d3-shape` (`CostDonutChart.tsx`), `exceljs` (`create-proposal-workbook.ts` only), `roughjs`/`rough-notation` (landing), `lenis` (`LandingSmoothScrollProvider`), `@firecms/neat` (`NeatWireframeBackground`).
- `next/dynamic` + `import()` split coverage (charts donut, library managers, modals, estimate tree/content, neat bg).
- exceljs server boundary: `build-proposal-export-model.ts` (client-reachable) vs `create-proposal-workbook.ts` (API-route-only). Confirmed clean.
- `public/**` asset inventory (`du`-sorted) + reference greps for the largest files.
- `@firecms/neat` package.json (confirms it bundles its own WebGL, declares **no** `three` dep).

**Deferred / not done (honest):**
- No `ANALYZE=true next build --webpack` treemap run this session (Turbopack build emits no analyzer report; webpack analyze build is slow and the env is mid-edit by concurrent agents). Byte-level "initial JS per route" remains **measured-by-grep-not-treemap**, same blocker the prior pack recorded.
- No live Lighthouse/WebPageTest for landing LCP.

## Reconciliation vs prior packs

| Topic | Prior coverage | Verdict |
|---|---|---|
| Landing libs (neat/lenis/roughjs) code-split & `ssr:false` | `2026-06-14-Overall-Site-Performance` INV10/INV11 — verified split correct, weight unmeasured | **covered-by** prior pack; structure still correct in code today. Not re-reported except the residual measurement gap. |
| `optimizePackageImports:['@phosphor-icons/react']` + 111/135 files use `/dist/ssr` | INV11 verified | covered-by prior; residual barrel-import normalization is a low finding (BUNDLE-05). |
| exceljs server isolation | Backlog "ExcelJS isolation verify" (P2) | **I re-verified and it is clean** — closing the verify item, not re-opening. |
| d3 *submodule* import (`d3-shape`) keeps full d3 out of client | INV11 "D3 submodule imports" verified | covered-by prior for the *client-bytes* concern. BUT the **dependency-declaration** mismatch (full `d3` declared, only `d3-shape` used transitively) was **never flagged** → new finding BUNDLE-02. |
| Dead/orphaned `public/` assets (~10MB) | AS03 — documented, **partially** remediated (Cards/*.jpg now gone) | **partial:** Screenshot PNG, frosted-construction PNG, logo PNG, 5 starter SVGs still present → BUNDLE-03. |
| `sidebar-BG.png` 2.6MB CSS bg re-encode | AS04 — documented backlog | **partial** (unremediated) → BUNDLE-04. |
| Private project images bypass next/image | AS10 | cross-domain (image route) — noted, not owned here. |
| `@vercel/speed-insights` not wired | AS-/09 audit | Domain 9 (Observability) — cross-domain note. |
| Unused `three` (38MB) + `@types/three` | **NOT in any prior pack** | **none** → new finding BUNDLE-01. |

## Findings

### BUNDLE-01 — `three` (38 MB) is a fully unused dependency
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** `package.json:87` declares `"three": "^0.184.0"`; `package.json:105` declares `"@types/three"`. A whole-repo grep (`rg "['\"]three['\"]|three/src|three/examples|THREE\."` over `src tests scripts .storybook`) returns **zero** real import sites (the only two hits are a `bedrooms: three` test variable and a `label: "Three"` tab fixture). `du -sh node_modules/three` = **38M**. Git: added in `6bc0a893 chore: update dependencies with @firecms/neat and three.js`. The WebGL background uses `@firecms/neat`, whose own `package.json` (`node_modules/@firecms/neat/package.json`) declares **no** `three` dependency — it ships its own bundled WebGL — so the top-level `three` is dead weight.
- **Impact:** No client-bundle bytes (never imported, so tree-shaken out), but: slower `bun install` / CI cold installs (38M on disk), supply-chain surface for a lib that does nothing, and a live foot-gun — any future `import ... from "three"` would silently ship ~600KB+ to a client chunk with no review friction because it's already a sanctioned dep.
- **Recommendation:** Remove `three` and `@types/three` from `package.json`; `bun install` to update the lockfile; `bun run type-check` to confirm nothing breaks. One-line revert if a real three feature lands later.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### BUNDLE-02 — full `d3` meta-package declared but only `d3-shape` is actually used (transitive)
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `package.json:74` declares `"d3": "^7.9.0"` and `package.json:101` `"@types/d3"`. The only d3 import in the app is `import { arc, pie } from "d3-shape"` at `src/components/charts/CostDonutChart.tsx:4`. `d3-shape` is **not** declared in `package.json` — it resolves only as a transitive child of the `d3` meta-package (`node_modules/d3-shape` v3.2.0, hoisted). `du node_modules/d3` = 868K of meta-package + ~30 d3-* submodules pulled into the install graph, of which exactly one submodule is used. Prior pack correctly verified the *client-bytes* are fine (submodule import + dynamic-loaded donut); this is a **dependency-hygiene / install-graph** gap it did not flag.
- **Impact:** Relying on a transitive package is fragile — a future `d3` major (v8) or a hoisting change could drop/relocate `d3-shape` and break the build with no direct-dep signal. Also inflates install graph with ~29 unused d3 submodules.
- **Recommendation:** Add `d3-shape` (+ `@types/d3-shape`) as **direct** deps; remove `d3` + `@types/d3` (after a grep confirms no other `d3`/`d3-*` import exists — verified none today). Net: smaller, honest install graph and a stable direct dependency. The donut stays dynamic-imported (no client-byte change).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** partial:2026-06-14-Overall-Site-Performance (client-byte side covered; dep-declaration side new)

### BUNDLE-03 — orphaned static assets still shipped in `public/`
- **Severity:** low · **launch_blocker:** false
- **Evidence:** Confirmed still-present and unreferenced (grep over `src` excluding `public/**` returns 0 hits each):
  - `public/Screenshot 2026-05-18 at 9.00.39 PM.png` (**968K**) — a dev screenshot.
  - `public/landing/archestimator-frosted-construction.png` (**2.3M**) — superseded; landing uses `hero-slides/*.jpg` + `next/image`.
  - `public/archestimator_logo.png` (**697K**) — the app uses the SVG logos (`archestimator_logo.svg` / `archestimator_logo_white.svg`); only a Storybook/test references the PNG indirectly via `n_white` SVG, not this PNG.
  - Next starter SVGs `public/{next,vercel,window,globe,file}.svg` — unreferenced boilerplate.
  - (Prior pack's `public/Cards/*.jpg` ~6MB are **already deleted** — partial remediation done.)
- **Impact:** ~4MB of dead bytes in the deploy artifact; not loaded by users at runtime (so no LCP/bundle impact), but slower deploys, larger repo, and the dev Screenshot leaking into a public deploy is sloppy for a launch.
- **Recommendation:** Delete the four orphans + five starter SVGs after a final per-file grep (no dynamic string concat, no email template, no manifest). Keep `component-thumbnails/` and `landing/hero-slides/` (both referenced).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** partial:2026-06-14-Overall-Site-Performance (AS03 — Cards portion done, these remain)

### BUNDLE-04 — `sidebar-BG.png` (2.6 MB) served as a CSS background on every authenticated page, unoptimized
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** `src/app/globals.css` sets `--sidebar-texture: url("/n.png")` (a noise texture). `public/sidebar-BG.png` is **2.6M**; the actually-referenced `/n.png` is the texture file. Because it is a CSS `background-image` it **bypasses `next/image`** entirely — no AVIF/WebP transform, no responsive sizing, served at full bytes on first authed paint of every `/workshop/*` page. (Prior pack AS04 flagged the principle; still unremediated.)
- **Impact:** A multi-MB image on the cold-load critical path of every authenticated page hurts authed-LCP for the highest-frequency surface (the workshop). This is the single largest *actually-loaded* asset in the app.
- **Recommendation:** Re-encode the texture to AVIF/WebP at the rendered tile size (a tiling noise texture should be a few KB, not MB), update `--sidebar-texture` to the new file, and consider a `background-size`/tiling approach instead of a full-bleed bitmap. Verify the `/n.png` vs `sidebar-BG.png` relationship first (one may be the orphan, the other the live texture — confirm which path CSS actually loads).
- **Effort:** M · **Confidence:** medium (need to confirm which file CSS actually resolves and rendered size) · **existing_plan_overlap:** partial:2026-06-14-Overall-Site-Performance (AS04)

### BUNDLE-05 — phosphor barrel imports in a few app components (not `/dist/ssr`)
- **Severity:** low · **launch_blocker:** false
- **Evidence:** 111/135 phosphor consumers use the tree-shake-friendly `@phosphor-icons/react/dist/ssr` path; `optimizePackageImports:["@phosphor-icons/react"]` (`next.config.ts:55`) covers the barrel for the rest. A handful of *non-story* app components still import from the barrel `@phosphor-icons/react` (e.g. `src/components/share/ShareEstimateTreeView.tsx:5`, `src/components/share/ShareEstimateTreePanel.tsx:5`, `src/components/ui/checkbox.tsx:2`).
- **Impact:** Minimal — `optimizePackageImports` already rewrites barrel imports to per-icon modules at build, so the byte delta is ~0. Pure consistency / belt-and-suspenders.
- **Recommendation:** Optionally normalize these to `/dist/ssr` for consistency and to not depend on the experimental optimizer flag. Low priority; not a launch concern.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-14-Overall-Site-Performance (INV11 icon-import-normalize backlog)

### BUNDLE-06 — bundle-analyzer only works under webpack; no Turbopack treemap / no enforced budget (measurement gap)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `next.config.ts:190` wires `@next/bundle-analyzer` gated on `ANALYZE=true`, but the analyzer only emits a treemap on a **webpack** build (`next build --webpack`); the default `next build`/`next dev` use Turbopack and emit nothing. There is no CI bundle-size budget/check. The prior pack repeatedly records landing initial-JS as "blocked — no analyzer run."
- **Impact:** No objective per-route JS budget. The code-split *structure* is verified by grep, but there is no regression guard if a future change accidentally static-imports a heavy lib into a client entry.
- **Recommendation:** Document the `ANALYZE=true next build --webpack` recipe in the README/launch checklist and run it once pre-launch to capture a baseline treemap (especially landing `/` and `/workshop`). Optional post-launch: a lightweight CI size check on the `.next` route manifest. Not a blocker for closed-beta.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** covered-by:2026-06-14-Overall-Site-Performance (recurring "blocked, no analyzer run" note)

## Confirmed-healthy (no action; recorded so they are not re-audited)

- **exceljs (22M) never reaches the client.** Only `src/lib/proposal-export/create-proposal-workbook.ts` imports `exceljs`, and only the Node API route `app/api/.../export/proposal.xlsx/route.ts` (`runtime="nodejs"`, `dynamic="force-dynamic"`) imports it. The client component `EstimateSheetContent.tsx` imports `build-proposal-export-model.ts`, which contains **no** exceljs reference (verified `grep -c exceljs` = 0). Clean server/client boundary.
- **Landing animation libs are correctly deferred.** `@firecms/neat` + WebGL are behind `dynamic(... { ssr:false })` in `HeroSection.tsx`; `@firecms/neat` is `import()`-ed inside `NeatWireframeBackground.tsx`; `lenis` is a `'use client'` provider; the donut's `d3-shape` is dynamic-imported (`ProjectChartsClient.tsx:26`). `rough-notation` is a small (108K) static import in the hero — acceptable.
- **Fonts are self-hosted via `next/font/google`** (Doto, Roboto_Mono with `display:swap`) — no render-blocking external font CSS, no FOIT risk. Body UI uses the SF Pro system stack (zero font bytes). Good strategy.
- **Hero images use `next/image`** with `fill`, `priority`, and `sizes` (`HeroSection.tsx:308-321`). The Supabase `component-images` remote pattern is configured in `next.config.ts:69-71`.

## Reconciliation summary

The prior `2026-06-14-Overall-Site-Performance` pack is the authoritative predecessor and is **largely correct and still valid** — landing split, exceljs isolation, d3 submodule client-bytes, phosphor optimization are all confirmed in today's code. This audit's net-new contributions are: (1) **BUNDLE-01** unused `three`/38MB — missed by every prior pack; (2) **BUNDLE-02** the `d3` meta-package dependency-declaration gap (prior pack only assessed client bytes); and (3) confirming AS03 is now *partially* done (Cards deleted) while the rest of the orphans + the sidebar texture re-encode remain open. Nothing in this domain is a hard launch blocker for closed-beta.
