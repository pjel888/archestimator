# 19 — Research, Review, and QA Evidence

## Research questions and sources
All framework-behavior claims are governed by the **local installed Next.js 16.2.10 docs** (`node_modules/next/dist/docs/`), supplemented by official `nextjs.org`. Local docs are highest authority for version-sensitive behavior.

### RQ1 — Does a parent `loading.tsx` show on child client navigation?
**Source:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` (lines 44-48, 78, 88); `…/02-guides/instant-navigation.md` (99-107).
**Finding:** No. On client nav, only the segment below the shared layout re-renders; the parent `loading.tsx` is above the shared layout and out of scope. Parent layout persists.
**Changed plan decisions:** Confirmed FR-2 and RC-3 analysis.

### RQ2 — Do layouts re-render on navigation?
**Source:** `…/01-getting-started/03-layouts-and-pages.md` (42-44); `…/03-file-conventions/layout.md` (152-154, 178-180, 238-240, 316-323); `…/02-guides/prefetching.md` (191-193).
**Finding:** No. Layouts preserve state, stay interactive, do not re-render, and are cached client-side. Only the page segment (and explicit Suspense boundaries below the layout) change. **Caveat:** uncached reads (`headers()`/`cookies()`) in a layout BLOCK navigation and suppress its loading fallback when `cacheComponents` is OFF (loading.md 90-95; layout.md 316-323).
**Changed plan decisions:** Drove DEC-02 and Phase 2.

### RQ3 — Flat vs nested vs route groups?
**Source:** `…/03-file-conventions/route-groups.md` (10-27, 30-31); `…/02-guides/prefetching.md` (18-22, 52-55, 191-193); `…/01-getting-started/04-linking-and-navigating.md` (85-88).
**Finding:** Nesting enables shared-layout reuse + SPA transitions + partial prefetch. Flat separate-root loses SPA transitions. Route groups can flatten URLs but rename everything.
**Changed plan decisions:** Drove DEC-01.

### RQ4 — Default prefetch behavior?
**Source:** `…/03-api-reference/02-components/link.md` (294-304, 298); `…/02-guides/prefetching.md` (24-32, 52-55, 57); `…/05-config/01-next-config-js/staleTimes.md` (32-36).
**Finding:** `prefetch="auto"` (default): static → full prefetch; dynamic → partial down to nearest `loading.tsx`. **Prefetch is production-only** (link.md:298; prefetching.md:57). `staleTimes` config in this repo deliberately set (dynamic 60s, static 180s).
**Changed plan decisions:** Mandated prod-build measurement in PERF-1 / Phase 0.

## Research validation rubric
- Primary sources first (local installed docs for this exact version).
- Distinguished current official guidance from community convention.
- Searched but confirmed: no `template.tsx` in repo; `cacheComponents` OFF; `staleTimes` set.

## Specialist workstream outputs
- **Codebase architecture lane:** full `/workshop` route map, layout/shell/sidebar ownership analysis, root-cause identification (RC-1/RC-2/RC-3). See `03`.
- **Next.js docs research lane:** all four RQs answered with local-doc citations. See above.
- **Lead spot-verification:** re-read `workshop/layout.tsx`, `WorkshopPageShell.tsx`, `StaticWorkshopLoadingShell.tsx`, `MainSidebar.tsx:1-60`, `proposals/{page,loading}.tsx`, `next.config.ts:90-106`, `route-loading-overlay.tsx` — all confirmed.

## Adversarial QA scenario matrix (for future implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| QA-1 | user | rapid nav `/workshop`↔`/workshop/proposals` x3 | prod build | Playwright mount probe | sidebar mounts once, no fl::ash | planned |
| QA-2 | user | direct URL load `/workshop/proposals` | prod build | manual | shell + content skeleton (not dashboard skeleton alone) | planned |
| QA-3 | unauth | hit `/workshop/proposals` no cookie | - | denial test | redirect `/login?next=/workshop/proposals` | planned |
| QA-4 | terms-pending user | hit `/workshop/proposals` | fixture | denial test | redirect to terms route | planned |
| QA-5 | user | ⌘4 shortcut to proposals | prod build | manual | navigates, focus correct | planned |
| QA-6 | user | nav to `library/*` and `projects/[projectId]/*` (nested layouts) | prod build | manual | NO double shell; one `[data-workshop-page-shell-root]` | planned |
| QA-7 | user | slow network nav | throttle | Playwright w/ throttle | content skeleton or global overlay shows, no blank | planned |
| QA-8 | user | back/forward between workshop routes | prod build | manual | persistent shell, instant | planned |

## Performance evaluator contract
See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` PERF-1.

## Independent final verifier evidence
**verification_mode: `emulated`.** Two read-only lanes (industry-facets research + adversarial review) ran concurrently with distinct outputs; the lead independently re-read the load-bearing source and verified the adversarial findings against current source. A *separate* independent native final-verifier was not dispatched. Per the Improve-Plan-Prompt authority contract, a **behavior-bearing** package with emulated verification **cannot be `IMPLEMENTATION-READY`** — it is capped at `CONDITIONALLY READY` (overall ≤97) unless a real independent verifier lane OR explicit owner acceptance reviews the final package. This package is behavior-bearing (restructures an auth/terms gate; changes navigation/shell rendering). To upgrade: dispatch a fresh independent verifier lane, or obtain Philip's explicit acceptance.

## Explicit validation gaps
- No live prod/perf measurement yet (Phase 0 produces the baseline).
- DEC-01 is owner-delegated (needs Philip's ack) — not a planning defect, but flagged.
- Phase 4 (`cacheComponents`) is unevaluated by choice (owner-gated).
