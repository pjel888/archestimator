# 05 — Bundle / JS / CSS / Asset Audit

**Status: AUDIT / PLANNING ONLY**
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ `main` (verified against HEAD `3070c46c`)
**Dimension:** Client bundle composition — JS chunks, CSS, fonts, images, third-party scripts.
**Companion docs:** `01_AUDIT_SCOPE_AND_METHOD.md`, `03_ROUTE_SPEED_MATRIX.md`, sibling deep-dives `04`–`09`.

---

## 1. Purpose

Re-audit the bundle / JS / CSS / asset dimension: what ships per route, which heavy
dependencies are correctly isolated vs leaking into first-load chunks, which routes still
need a dynamic split, CSS/animation cost, font strategy, image optimization, and the
third-party scripts that touch public LCP/TBT. **No source was modified.** This is a
planning-only audit; every action below is a recommendation gated behind a measurement.

---

## 2. Summary (honest posture)

The bundle posture is **good and getting better** — most of the obvious wins are already
landed. ExcelJS is cleanly isolated to the export API route (verified — zero client-bundle
leakage). D3 is imported as the `d3-shape` submodule (not whole-`d3`) and the cost donut is
further dynamic-split so the **default chart views ship no D3 at all**. The estimate tree /
content, the component-library manager, the templates manager, library folder tree, and the
WebGL landing background (`@firecms/neat`, `ssr:false`) are all behind `next/dynamic`.
Phosphor is wired into `optimizePackageImports` and used predominantly via the
`/dist/ssr` deep path. `lucide` is **not used anywhere** (zero hits). Fonts are a single
`next/font/google` family (`Roboto_Mono`) — self-hosted, no external font fetch.

The remaining bundle debt is concentrated on the **public landing route (`/`)**, which is the
LCP/TBT-sensitive surface: `roughjs` (whole default import) and `rough-notation` are pulled
**statically** into the landing first-load JS via eagerly-rendered hero/proof sections, even
though both libraries only execute inside `IntersectionObserver` / `useEffect` decoration
effects. `lenis/react` is also statically imported in the landing scroll provider. These are
deferred-execution but **not deferred-download** — the classic "in the bundle, runs later"
trap. Secondary debt: three Supabase-storage `<img>` thumbnails bypass `next/image` (unbounded
bytes, no responsive sizing), and the phosphor import style is inconsistent (98 deep / 26
barrel) which is cosmetically untidy but neutralized by `optimizePackageImports` in production.

**Measurement honesty:** the real `ANALYZE=true` treemap build is **BLOCKED this session**
(shared `.next/` contention with concurrent agents; bundle-analyzer only emits with
`--webpack`, not turbopack). No byte sizes are fabricated below. The only cited byte evidence
is the prior, archived Library result (initial JS ~618 KB → ~232 KB after the dynamic-import
work). Every "Current metric" that depends on a fresh treemap is recorded as `blocked`.

---

## 3. Already implemented (do not re-recommend)

Reconciled against the GROUND TRUTH block and re-verified in source this session:

- **ExcelJS isolated to the export API route** — `exceljs` appears only in
  `src/lib/proposal-export/create-proposal-workbook.ts`, imported only by
  `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`.
  No client route or component imports it. (verified)
- **D3 as submodule, not whole-d3** — `CostDonutChart.tsx` imports `{ arc, pie }` from
  `d3-shape` (+ `PieArcDatum` type). No `import * as d3` / whole-`d3` anywhere. (verified)
- **Cost donut dynamic-split** — `ProjectChartsClient.tsx` wraps `ProjectCostDonutChart` in
  `dynamic(...)`; default comparison views (variance spine / composition bars / table) ship
  no d3-shape. (verified)
- **WebGL landing bg deferred + `ssr:false`** — `NeatWireframeBackground` is `dynamic(... {
  ssr:false })`, AND `@firecms/neat` itself is `await import()`-ed inside the activation
  effect, gated by reduced-motion / coarse-pointer / small-viewport fallback + idle callback.
  `three` is a transitive dep of `@firecms/neat` and rides this same defer. (verified)
- **10 files use `next/dynamic`** — estimate tree + content, ComponentLibraryManager,
  AddComponentModal, LibraryFolderTreeSurface, TemplatesBrowseManager, NewTemplateModal,
  InsertIntoEstimatePicker, NewProjectModal/ProjectDetailsModal, NeatWireframeBackground.
  (verified)
- **Phosphor `optimizePackageImports`** set in `next.config.ts` `experimental`. (verified)
- **`react-complex-tree` CSS scoped to workshop layout** — `style-modern.css` imported only in
  `src/app/workshop/layout.tsx` (CSS, not the JS lib at layout level). (verified)
- **`@vercel/analytics` Web Analytics only**, mounted once in root `layout.tsx`; **no**
  `@vercel/speed-insights` installed. (verified)
- **GA4 / Clarity landing-scoped** — `@next/third-parties`, `ClarityScript`,
  `LandingAnalyticsLoader` live under `src/components/landing/*` + `features/page.tsx`, behind
  cookie-consent gating; never imported by `/share` or workshop. (verified)
- **`lucide` not present** — zero imports in `src/`. Single icon system (phosphor). (verified)
- **Single self-hosted font** — `Roboto_Mono` via `next/font/google` in `layout.tsx`; no
  external `<link rel=stylesheet>` font fetch. (verified; note design-system "SF Pro"
  discrepancy is tracked elsewhere, not a bundle issue)
- **`experimental.staleTimes` + bundle-analyzer wired** (`ANALYZE=true` + `--webpack`).
  (verified)

---

## 4. Findings

### PERF-BN-01 — `roughjs` (whole default import) ships in the public landing first-load JS

Severity: High
Confidence: Verified
Bottleneck class: Bundle weight / unused-on-paint JS on the LCP-critical public route
Affected surface: `/` (landing) — `AnimatedProposalRecordSection` via `CompanyProofCarouselSection`
User symptom: Slower public LCP/TBT on first visit and Slow-3G; JS parsed/downloaded before any rough drawing is ever needed (drawing only fires inside an IntersectionObserver).
Technical cause: `AnimatedProposalRecordSection.tsx` does a **static** `import rough from "roughjs"` (full default export) + `roughjs/bin/core` type. The component is rendered eagerly by `CompanyProofCarouselSection`, which `app/page.tsx` renders directly in `<main>`. So `roughjs` is in the landing entry chunk even though `rough.*` is only invoked inside a `useEffect` + `IntersectionObserver` (line ~641+).
Evidence:
- `src/components/landing/AnimatedProposalRecordSection.tsx:12` `import rough from "roughjs"`
- `src/components/landing/CompanyProofCarouselSection.tsx:9,113` renders `<AnimatedProposalRecordSection />`
- `src/app/page.tsx` renders `<CompanyProofCarouselSection />` in `<main>` (no dynamic boundary)
- 27 KB source file; `roughjs` ^4.6.6 in `package.json`
Current metric:
- blocked (needs `ANALYZE=true bunx next build --webpack` treemap for the `/` entry chunk byte delta)
Target metric:
- `roughjs` + `AnimatedProposalRecordSection` JS removed from the `/` first-load entry chunk (loads only on scroll-into-view / interaction).
Recommended action:
- Plan to `next/dynamic` the `AnimatedProposalRecordSection` (and/or move the `rough` import to an `await import("roughjs")` inside the existing IntersectionObserver effect) so the rough drawing code is fetched only when the section nears the viewport. Keep the SSR'd static markup for layout/LCP stability.
Validation gate:
- `ANALYZE=true bunx next build --webpack` → confirm `roughjs` no longer in the `/` entry treemap; re-run public Lighthouse on `/` (LCP/TBT) before vs after.
Risk:
- Low blast radius (one landing section). Risk = a brief visual pop-in of the hand-drawn decoration on slow connections; mitigate by keeping the static SVG/markup and only deferring the rough annotation pass.
Rollback/deletion criteria:
- If the treemap shows the section's JS is already negligible, or pop-in is unacceptable, revert to static import — no behavior change.

---

### PERF-BN-02 — `rough-notation` statically imported into the landing Hero (first-load)

Severity: Medium
Confidence: Verified
Bottleneck class: Bundle weight / deferred-execution-but-not-deferred-download
Affected surface: `/` (landing) Hero; also `LaunchFeatureHeading` (proof section)
User symptom: Extra public-route JS on the most LCP-sensitive component; the annotation library downloads even for reduced-motion users who never see the underline/circle animations.
Technical cause: `HeroSection.tsx` does a top-level `import { annotate } from "rough-notation"`; `annotate()` is only called inside a `useEffect` (lines 147+). The Hero is the eager LCP component of `/`. `LaunchFeatureHeading.tsx` and `AnimatedProposalRecordSection.tsx` also statically import `annotate`.
Evidence:
- `src/components/landing/HeroSection.tsx:7` `import { annotate } from "rough-notation"`; usage at `:151,:160,:182,:191`
- `src/components/landing/LaunchFeatureHeading.tsx:7`, `AnimatedProposalRecordSection.tsx:7` same import
- `rough-notation` ^0.5.1 in `package.json`
Current metric:
- blocked (treemap byte share of `rough-notation` in `/` entry chunk)
Target metric:
- `rough-notation` deferred out of the synchronous Hero render path (lazy `await import` inside the effect, or behind a reduced-motion / idle guard like Neat already uses).
Recommended action:
- Plan to convert the three static `annotate` imports to `await import("rough-notation")` inside their existing effects, optionally skipping entirely when `prefers-reduced-motion: reduce` (consistent with the existing Neat/Lenis reduced-motion pattern). Annotations are pure decoration; deferring them does not change LCP content.
Validation gate:
- `ANALYZE=true bunx next build --webpack` treemap before/after; verify no `rough-notation` in `/` entry; public Lighthouse TBT on `/`.
Risk:
- Low — one library, decoration-only. Annotation may appear ~1 frame later.
Rollback/deletion criteria:
- Negligible treemap delta or visible annotation flicker → revert to static import.

---

### PERF-BN-03 — `lenis/react` statically imported in the landing scroll provider

Severity: Low
Confidence: Verified
Bottleneck class: Bundle weight on public route (mitigated by reduced-motion runtime gate)
Affected surface: `/` and other landing routes wrapped by `LandingSmoothScrollProvider`
User symptom: `lenis` + `lenis/react` JS ships in the landing bundle even though it renders a passthrough `<>{children}</>` for `prefers-reduced-motion` users (who get the download but never the runtime).
Technical cause: `LandingSmoothScrollProvider.tsx` does top-level `import { ReactLenis } from "lenis/react"`. The reduced-motion check is a runtime early-return, so the library is still in the chunk. (The prior `lenis-non-home-scope` work scoped lenis to landing routes only — good — but did not defer the download.)
Evidence:
- `src/components/landing/LandingSmoothScrollProvider.tsx:4` `import { ReactLenis } from "lenis/react"`; reduced-motion passthrough at `:34`
- `lenis` ^1.3.23 in `package.json`; only consumer in `src/` (verified single hit)
- prior scoping evidence: `.ai/03_plans/2026-06-05-performance-and-speed/evidence/lenis-non-home-scope-2026-06-06/`
Current metric:
- blocked (treemap byte share of `lenis` on landing entry)
Target metric:
- `lenis` excluded from the synchronous landing render path for reduced-motion users; ideally lazy-mounted only when smooth scroll is actually engaged.
Recommended action:
- Plan to lazy-load `ReactLenis` (e.g. `next/dynamic` the provider's lenis branch, or `await import("lenis/react")` after the reduced-motion check passes) so reduced-motion sessions never download it. Low priority — lenis is small relative to roughjs/neat.
Validation gate:
- treemap before/after; confirm reduced-motion landing entry no longer contains `lenis`.
Risk:
- Very low — single provider, already reduced-motion-aware.
Rollback/deletion criteria:
- If treemap delta is trivial, leave as-is (documented accepted cost).

---

### PERF-BN-04 — Public landing `/` lacks a fresh ANALYZE treemap and fresh public Lighthouse

Severity: High
Confidence: Verified (the measurement gap is verified; the byte impact is blocked)
Bottleneck class: Measurement gap / unverified bundle budget on the LCP-critical surface
Affected surface: `/`, `/features`, `/pricing`, `/about`, `/contact`
User symptom: We cannot prove the public first-load JS budget; PERF-BN-01/02/03 byte savings are unquantified, so prioritization is by inference not measurement.
Technical cause: `ANALYZE=true` treemap requires `--webpack` (bundle-analyzer does not emit under turbopack) and a clean `.next/`; this session's `.next/` is shared with concurrent agents and no dev/build was run. No fresh public Lighthouse either (no server up).
Evidence:
- `next.config.ts:181-185` `@next/bundle-analyzer` gated on `ANALYZE === "true"`
- `01_AUDIT_SCOPE_AND_METHOD.md` §4 measurement matrix (build deferred, Lighthouse blocked)
- captured public evidence only: `/features→/pricing` ~179–394 ms normal / 834–6893 ms Slow3G
Current metric:
- blocked — no fresh treemap; no fresh public Lighthouse this session
Target metric:
- A committed ANALYZE treemap artifact + a public-route Lighthouse run (perf, LCP, TBT) for `/`, used to set a real first-load JS budget (proposal: ≤ ~180–220 KB gz landing entry, to be confirmed by the treemap).
Recommended action:
- Make `ANALYZE=true bunx next build --webpack` the **next measurement step** (run in an isolated worktree/`.next` to avoid concurrent-agent contention), archive the treemap under this plan's `evidence/`, then size the BN-01/02/03 wins from real bytes before implementing.
Validation gate:
- treemap HTML present in `evidence/`; public Lighthouse JSON for `/` present in `evidence/`.
Risk:
- None (measurement only). Must run isolated to avoid clobbering shared `.next/`.
Rollback/deletion criteria:
- n/a — measurement artifact.

---

### PERF-BN-05 — Three Supabase-storage thumbnails bypass `next/image` (raw `<img>`)

Severity: Medium
Confidence: Verified
Bottleneck class: Unbounded / non-optimized images
Affected surface: `ProjectDetailsModal`, `NewProjectImagePanel`, `library/ComponentInspectorDock` (authed workshop)
User symptom: Full-resolution uploaded images are fetched and decoded at display size with no responsive `sizes`, no AVIF/WebP transform, no width/height (CLS risk) — heavier bytes + main-thread decode on workshop image surfaces.
Technical cause: Three components render raw `<img src=...>` for user-uploaded thumbnails/previews instead of `next/image`, even though `next.config.ts` already whitelists the Supabase `component-images` remote pattern and `sharp` is installed for the optimizer.
Evidence:
- `src/components/workshop/ProjectDetailsModal.tsx:198` `<img src={imagePreviewUrl} ... className="h-40 w-full object-cover" />`
- `src/components/workshop/NewProjectImagePanel.tsx:33` raw `<img src={previewUrl} ...>`
- `src/components/workshop/library/ComponentInspectorDock.tsx:182` raw `<img src={item.imageUrl} ...>`
- `next.config.ts:44-46` remotePattern for `/storage/v1/object/public/component-images/**`; `sharp` ^0.34.5 in `package.json`
- contrast: 10 components already use `next/image` (HeroSection, MainSidebar, ComponentLibraryManager, AddComponentModal, share/* …)
Current metric:
- blocked (per-image transferred bytes; not measured this session)
Target metric:
- The two persisted-image surfaces (`ComponentInspectorDock`, `ProjectDetailsModal` saved preview) served via `next/image` with explicit `sizes` + width/height → optimized format + bounded bytes + zero CLS.
Recommended action:
- Plan to migrate the two **persisted-URL** `<img>` to `next/image` (the remote pattern already supports them). Leave `NewProjectImagePanel`'s `blob:`/object-URL local preview as raw `<img>` (object URLs cannot be optimized by the loader — document this exception).
Validation gate:
- Network panel: confirm optimized `/_next/image` responses with reduced bytes on the inspector dock; CLS=0 in a Lighthouse run of the library route.
Risk:
- Low — display-only thumbnails. Must verify the Supabase object URL shape matches the whitelisted `pathname`; mismatches would 400 via the loader.
Rollback/deletion criteria:
- If object URLs don't match the remote pattern, or optimizer adds latency on tiny thumbs, revert specific surfaces to raw `<img>`.

---

### PERF-BN-06 — `react-complex-tree` JS loads for ALL workshop routes via the workshop layout (CSS verified scoped; JS placement to confirm)

Severity: Medium
Confidence: Likely
Bottleneck class: Heavy lib pulled into a broad shared chunk where most routes don't need it
Affected surface: All `/workshop/*` routes (projects, library, templates, settings) — only the estimate editor and library tree actually render the tree
Technical cause: The `react-complex-tree` **CSS** (`style-modern.css`) is imported directly in `src/app/workshop/layout.tsx`, so its styles load on every workshop route. The library's JS is consumed by the estimate tree and library folder tree (`library-folder-reorder.ts`); those tree surfaces ARE dynamic-imported, but a shared workshop chunk may still hoist the tree lib if any always-mounted layout child references it. Whether the JS lands in a per-route chunk vs the shared workshop chunk is unverified without the treemap.
Evidence:
- `src/app/workshop/layout.tsx:15` `import "react-complex-tree/lib/style-modern.css"` (CSS at layout level — loads on all workshop routes)
- `react-complex-tree` JS consumers: `src/lib/component-library/library-folder-reorder.ts` + the dynamic tree surfaces
- `react-complex-tree` ^2.6.1 in `package.json`
Current metric:
- blocked (need treemap to see if the tree JS is in the shared `/workshop` chunk vs route chunks)
Target metric:
- `react-complex-tree` JS present only in the estimate-editor + library-tree route chunks; the workshop CSS cost (small) acknowledged or scoped to those routes.
Recommended action:
- Plan to (a) confirm via treemap where the tree JS lands, and (b) if the CSS cost matters, move the `style-modern.css` import down into the tree components that are already dynamic (so it co-loads with the dynamic JS) instead of the always-rendered layout. Verify first — the CSS is small and may not justify the move.
Validation gate:
- treemap: tree lib absent from `projects`/`settings` route chunks; CSS request only on tree routes.
Risk:
- Medium — moving the CSS import risks unstyled-tree flashes if the dynamic boundary loads CSS late; must verify the tree renders styled on first paint.
Rollback/deletion criteria:
- Any unstyled-tree flash → keep CSS at layout level (accept the small shared cost).

---

### PERF-BN-07 — Estimate editor route is the heaviest authed surface; dynamic split landed but not byte-verified

Severity: Medium
Confidence: Likely
Bottleneck class: Largest authed route bundle (tree + content + phosphor + tree lib)
Affected surface: `/workshop/projects/[id]/estimates/[id]` (EstimateWorkspaceClient)
User symptom: The estimate workspace is the most JS-dense authed view; tree/content are split (good) but the parent client + many phosphor icons + complex-tree still compose a large interactive chunk. Authed Projects already measured LCP 3865 ms / TBT 124 ms; the editor is heavier and unmeasured.
Technical cause: `EstimateWorkspaceClient.tsx` dynamic-imports `EstimateSheetTree` and `EstimateSheetContent` (both with skeleton fallbacks) — correct. But the editor pulls many statically-imported phosphor icons across `estimate-sheet/*` rows/tabs/visuals plus the tree lib; the composed first-interactive cost is unmeasured.
Evidence:
- `src/components/workshop/EstimateWorkspaceClient.tsx:19-32` two `dynamic(...)` splits with fallbacks
- many `@phosphor-icons/react/dist/ssr` imports in `estimate-sheet/rows/*`, `EstimateTabStrip`, `activity-history`, `EstimateSheetTree`
- captured authed Projects baseline: `.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z/` (LCP 3865 / TBT 124)
Current metric:
- blocked (no fresh editor Lighthouse; no treemap for the editor route chunk)
Target metric:
- Editor route Lighthouse captured; editor entry chunk sized; TBT held ≤ ~200 ms on the editor (proposal pending baseline).
Recommended action:
- Plan to capture a Lighthouse + treemap for the editor route specifically (it is absent from current evidence), then decide if further splitting (e.g. activity-history, tab strip, copilot button) is warranted. Do not pre-split without the measurement.
Validation gate:
- editor-route Lighthouse JSON + treemap in `evidence/`.
Risk:
- None (measurement). Any subsequent split is a separate gated change.
Rollback/deletion criteria:
- n/a — measurement-first.

---

### PERF-BN-08 — `@firecms/neat` pulls `three` (~large WebGL dep) — verify it never leaks past the dynamic boundary

Severity: Medium
Confidence: Likely
Bottleneck class: Very heavy transitive dep on a public route (mitigated, needs proof)
Affected surface: `/` (landing hero background only)
User symptom: If `three`/`@firecms/neat` were to leak into the landing entry chunk it would dominate public first-load JS; current design defers it, but only a treemap proves the boundary holds.
Technical cause: `three` ^0.184.0 is a transitive dependency of `@firecms/neat` ^0.8.0. The Neat usage is well-engineered: `NeatWireframeBackground` is `dynamic(... ssr:false)` AND `@firecms/neat` is `await import()`-ed inside the activation effect, gated by reduced-motion / coarse-pointer / max-width:767px fallback + `requestIdleCallback`. The risk is a regression (a stray static `three`/`neat` import elsewhere) silently re-introducing it into a shared chunk.
Evidence:
- `src/components/landing/NeatWireframeBackground.tsx:4` (type-only import), `:116` `await import('@firecms/neat')`
- `src/components/landing/HeroSection.tsx:11` `dynamic(... ssr:false)` for the background
- only `@firecms/neat`/`three` consumer in `src/` is this file (verified single hit)
- `three` + `@firecms/neat` in `package.json`
Current metric:
- blocked (treemap must confirm `three` is in a lazy chunk, not the `/` entry)
Target metric:
- `three`/`@firecms/neat` present only in an async-loaded chunk; **zero** bytes in the `/` entry chunk.
Recommended action:
- Plan to assert this with the ANALYZE treemap and add a lightweight guard (lint rule / grep CI check) forbidding static `three`/`@firecms/neat` imports outside `NeatWireframeBackground.tsx`, so a future refactor can't silently re-bundle it.
Validation gate:
- treemap: `three` only in a `chunks/*` async file, never the landing entry; optional CI grep guard green.
Risk:
- None now (verified deferred). The guard is additive.
Rollback/deletion criteria:
- n/a — verification + guard only.

---

### PERF-BN-09 — Phosphor import style is inconsistent (98 deep `/dist/ssr` vs 26 barrel) — cosmetic, neutralized by optimizePackageImports

Severity: Low
Confidence: Verified
Bottleneck class: Icon import hygiene (production-neutral, dev-DX + regression-safety)
Affected surface: app-wide (UI components, workshop, landing, notifications)
User symptom: None in production (tree-shaken). In dev, barrel imports can slow HMR/compile of the affected modules; the inconsistency is a latent regression risk if `optimizePackageImports` is ever removed.
Technical cause: 98 imports use the recommended `@phosphor-icons/react/dist/ssr` deep path; 26 use the barrel `@phosphor-icons/react` (some are type-only `import type`, which is free). `experimental.optimizePackageImports: ["@phosphor-icons/react"]` rewrites barrel imports to per-icon modules at build time, so production bundles are unaffected — but the codebase is inconsistent.
Evidence:
- `grep` counts: 98 `/dist/ssr` lines vs 26 barrel lines (incl. type-only)
- barrel examples: `src/components/ui/toast.tsx`, `MainSidebar`/`SidebarHeader` region, `data-table.tsx`, `command-dialog`, notifications
- `next.config.ts:55` `optimizePackageImports: ["@phosphor-icons/react"]`
Current metric:
- 26 barrel import sites (verified count); production byte impact ≈ 0 (optimized)
Target metric:
- All value (non-type) phosphor imports use `/dist/ssr` (or all use barrel) — one consistent convention; no production regression.
Recommended action:
- Plan a low-priority, mechanical normalization of the ~26 barrel imports to `/dist/ssr` (skip type-only imports). Pure hygiene; bundle this with other small cleanups — do not spend a measurement cycle on it.
Validation gate:
- `grep -rh 'from "@phosphor-icons/react"' src | grep -v "type "` returns only intended cases; build size unchanged in treemap.
Risk:
- Very low (import-path swap). Some icon names differ between barrel and `/dist/ssr`; verify each renders.
Rollback/deletion criteria:
- Any icon resolution break → revert that file's import path.

---

### PERF-BN-10 — `globals.css` (872 lines / ~18 KB) + 29 animation declarations ship on every route

Severity: Low
Confidence: Verified
Bottleneck class: Global CSS / animation cost on all routes incl. public + share
Affected surface: every route (root layout imports `globals.css`); `/share` is enforced-CSP and the most byte-sensitive public surface
User symptom: A single global stylesheet (~18 KB raw, smaller gzipped) loads on every route, including the minimal `/share` view; 29 `@keyframes`/`animation`/`transition` declarations add a small style-recalc surface. Minor relative to JS, but it is unconditional.
Technical cause: Tailwind v4 + custom CSS in one `src/app/globals.css` imported by the root `layout.tsx`; no per-route CSS splitting for the public/share surfaces. The `react-complex-tree` CSS and `AnimatedProposalRecordSection.module.css` (268 lines) are correctly scoped separately.
Evidence:
- `wc`: `src/app/globals.css` = 872 lines / 18,379 bytes; 29 animation-related declarations
- `src/app/layout.tsx:5` `import "./globals.css"`
- scoped CSS done right: `AnimatedProposalRecordSection.module.css` (CSS module), `share/print.css` (48 lines), workshop tree CSS at workshop layout
Current metric:
- 18.4 KB raw globals (verified); gzipped size + unused-on-`/share` ratio blocked (needs build)
Target metric:
- Confirm Tailwind v4 purge is dropping unused utilities in production (raw 18 KB is largely authored CSS + tokens, acceptable); only act if the build CSS for `/share` is materially bloated.
Recommended action:
- Plan to verify (via the production build) the emitted per-route CSS size; globals is small enough that no split is recommended unless the build shows otherwise. Lowest priority — record as accepted unless measurement contradicts.
Validation gate:
- Inspect built `.next` CSS asset sizes per route; confirm Tailwind purge active (no full utility set shipped).
Risk:
- None (verification). Any CSS split risks FOUC; not recommended without strong byte evidence.
Rollback/deletion criteria:
- n/a — verification only; no change planned unless build proves bloat.

---

## 5. Bundle inventory (per-route heavy deps + dynamic-import status)

Byte sizes deliberately omitted (no fresh treemap — see PERF-BN-04). "Ships static" = in the
route's first-load entry chunk; "Deferred" = behind `next/dynamic` or `await import`.

| Route / surface | Heavy deps | Load strategy | Status |
|---|---|---|---|
| `/` landing | `roughjs` (whole) | **static** via CompanyProof→Animated section | ⚠ PERF-BN-01 |
| `/` landing | `rough-notation` | **static** in Hero + 2 sections | ⚠ PERF-BN-02 |
| `/` landing | `lenis`/`lenis/react` | static, runtime reduced-motion gate | ⚠ PERF-BN-03 |
| `/` landing | `@firecms/neat` + `three` | `dynamic ssr:false` + `await import`, idle+device gated | ✅ deferred (verify PERF-BN-08) |
| `/` landing | `next/image` (hero) | static (intended LCP image) | ✅ |
| `/features` | `@next/third-parties` (GA4), Clarity | consent-gated landing scripts | ✅ scoped |
| `/share/*` | enforced CSP; no GA4/Clarity/lenis/rough | minimal public surface | ✅ |
| `/workshop/*` (all) | `react-complex-tree` CSS | static at workshop layout | ⚠ PERF-BN-06 (CSS) |
| `/workshop/projects` | phosphor (`/dist/ssr`) | static, optimizePackageImports | ✅ |
| estimate editor | EstimateSheetTree, EstimateSheetContent | `next/dynamic` + skeletons | ✅ (size unverified PERF-BN-07) |
| estimate editor | `react-complex-tree` JS | via dynamic tree surfaces | ✅ likely (verify PERF-BN-06) |
| project charts | `d3-shape` (donut) | `next/dynamic`; default views ship no d3 | ✅ |
| project charts | `d3-shape` import shape | submodule (`{ arc, pie }`), not whole-d3 | ✅ |
| library / templates | ComponentLibraryManager, TemplatesBrowseManager, LibraryFolderTreeSurface, AddComponentModal, NewTemplateModal, InsertIntoEstimatePicker | `next/dynamic` | ✅ (618→232 KB landed) |
| export proposal.xlsx | `exceljs` | **API route only** — zero client bundles | ✅ verified isolated |
| root layout (all) | `Roboto_Mono` (`next/font/google`) | self-hosted, no external fetch | ✅ |
| root layout (all) | `@vercel/analytics` Web Analytics | mounted once; no speed-insights | ✅ |
| root layout (all) | `globals.css` 18.4 KB / 29 anims | static on every route | ⚠ PERF-BN-10 (low) |
| workshop image surfaces | Supabase storage thumbs | 3× raw `<img>` (no next/image) | ⚠ PERF-BN-05 |
| (app-wide) | `lucide` | **not used** (0 imports) | ✅ |

### ANALYZE protocol note

The real measurement is **blocked this session** (shared `.next/` contention with concurrent
agents). The next measurement step is:

```
ANALYZE=true bunx next build --webpack
```

Constraints: `@next/bundle-analyzer` only emits a treemap with `ANALYZE=true` **AND**
`--webpack` (it does **not** emit under turbopack). Run in an **isolated worktree / separate
`.next/`** to avoid clobbering concurrent agents. Archive the treemap HTML + per-route chunk
list under this plan's `evidence/`, then size PERF-BN-01/02/03/06/07/08 from real bytes before
implementing any split. Pair with a fresh public Lighthouse for `/` and an authed Lighthouse
for the estimate editor route (both currently absent from evidence).

---

## 6. Cross-references

- `01_AUDIT_SCOPE_AND_METHOD.md` — method, evidence grading, measurement matrix (build deferred / Lighthouse blocked).
- `03_ROUTE_SPEED_MATRIX.md` — per-route speed evidence; pairs with the inventory table above.
- Sibling deep-dives `04`/`06`/`07`/`08`/`09` — rendering/state, DB/API, RLS/RPC, caching/prefetch, images/fonts/third-parties (analytics + font discrepancy live there).
- `.ai/09_archive/store/2026-06-14-Library-Optimization-Plan/` — the landed Library dynamic-import work (initial JS ~618 KB → ~232 KB) cited as the only fresh-byte precedent.
- `.ai/03_plans/2026-06-05-performance-and-speed/evidence/lenis-non-home-scope-2026-06-06/` — prior lenis route-scoping evidence (relevant to PERF-BN-03).
- `evidence/command-log.md` (this plan) — honest record of blocked/deferred measurements.
- `next.config.ts` — `optimizePackageImports`, `staleTimes`, image remotePatterns, bundle-analyzer wiring, CSP headers.
