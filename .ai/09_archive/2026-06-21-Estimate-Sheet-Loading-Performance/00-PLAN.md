# 00 — PLAN · Estimate Sheet Loading Performance

**Status:** IN-PROGRESS (audit + plan, not implementation)
**Date opened:** 2026-06-21
**Owner:** Claude (lead) — product/perf/architecture judgment; Philip is decision-maker.
**Target surface:** `/workshop/projects/[projectId]/estimates/[nodeId]` (the Estimate Sheet).
**Canonical URL under audit:** `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/122c3bb3-7c02-425c-aa46-33ba6c9202b3`

---

## 1. Goal

Comprehensively audit **why the Estimate Sheet page loads slowly and shows a
cascade of mismatched loading skeletons**, then produce a fully-scoped,
adversarially-reviewed **plan** (not code) to fix it. Deliver everything as this
dated plan pack.

The owner's stated symptom: *"all the loading skeleton of all the pages before
I get to the estimate sheet is being shown — bad practice AND slow."*

## 2. Scope (in)

- The route segment tree from `/workshop` down to `estimates/[nodeId]`: every
  `loading.tsx`, `layout.tsx`, `page.tsx`, and in-layout `<Suspense>` fallback
  on that path.
- The server-side data-fetch critical path of the sheet page
  (`estimates/[nodeId]/page.tsx` → `workspace-repository.ts` → Supabase) and the
  async layouts that gate first paint.
- The client hydration critical path of `EstimateWorkspaceClient` + the glass
  estimate sheet subtree (TanStack Query fan-out, the component-library lazy
  server action, JS bundle weight).
- Real measurement: `[perf-json]` trace snapshots (via
  `withPerfTraceRequest`/`traced`) + a browser performance trace + the visual
  skeleton sequence. Real HTTP `Server-Timing` headers are not assumed unless a
  later implementation phase adds and verifies them.
- Blast radius of every candidate change (loading files, layouts, page awaits,
  repository functions).
- Target-state best-practices comparison (Next.js App Router loading/streaming/
  PPR/prefetch patterns).

## 3. Scope (out / non-goals)

- Implementing the fixes. This is a **plan**. No source edits to the app.
- Re-architecting the estimate sheet's data model, RLS, or the glass visual
  redesign (already shipped — see [[glass-estimate-sheet-redesign]]).
- Performance of unrelated routes (library, dashboard) except where they share
  the offending layout/loading files.

## 4. Orchestration (disjoint scopes, parallel lanes)

Lead coordinates. Lanes write ONLY their own doc (first-writer-wins on the
filename) and log STARTED / conflicts / COMPLETE in `LOOP_LEDGER.md`. Lanes do
not edit each other's docs; conflicts surface to the lead for resolution.

| Lane | Doc | Owns |
|------|-----|------|
| L1 Cascade | `10-LOADING-SKELETON-CASCADE.md` | Every `loading.tsx` + in-layout Suspense fallback on the path; the exact skeleton sequence; the missing `[nodeId]/loading.tsx`; mismatched list-skeleton-for-sheet. |
| L2 Server waterfall | `11-SERVER-DATA-FETCHING-WATERFALL.md` | `estimates/[nodeId]/page.tsx` awaits + `workspace-repository.ts` (`resolveEstimateTabRouteContext`, `requireCurrentUserContext`, `getEstimateTabs`, `resolveEstimateEditCapability`); DB/RPC inventory; sequential hops. |
| L3 Layouts/caching | `12-LAYOUT-AND-CACHING-CRITICAL-PATH.md` | `workshop/layout.tsx` (user+terms), `[projectId]/layout.tsx` (project fetch); `React cache()`, `fetch` cache, `unstable_cache`; what re-runs on navigation. |
| L4 Client hydration | `13-CLIENT-HYDRATION-AND-BUNDLE.md` | `EstimateWorkspaceClient` + glass sheet subtree; TanStack Query fan-out; component-library lazy server action; bundle weight & hydration count. |
| L5 Blast radius | `14-BLAST-RADIUS-MATRIX.md` | Consumers of every skeleton/layout/page/repository symbol we might touch; tests; safe-vs-risky matrix. |
| L6 Benchmark | `15-BENCHMARK-AND-MEASUREMENTS.md` | Live `[perf-json]` trace capture, browser perf trace, screenshot skeleton sequence, real timings. |
| L7 Best practices | `16-BEST-PRACTICES-AND-TARGET-STATE.md` | Canonical Next.js App Router loading/streaming/PPR/prefetch patterns + repo-internal precedents. |

Lead synthesizes → `01-CURRENT-STATE-AUDIT.md`, `02-ROOT-CAUSE-AND-SYMPTOM-MAP.md`,
`05-IMPLEMENTATION-ROADMAP.md`, `06-VALIDATION-AND-QA-PLAN.md`. Adversarial pass →
`18-ADVERSARIAL-REVIEW.md`.

## 5. Stop condition

This plan is DONE when: (a) every lane doc is written with real-evidence-backed
findings (no speculation presented as fact); (b) the synthesized root-cause +
roadmap is internally consistent; (c) the adversarial review has challenged the
root-cause and the roadmap and its surviving objections are recorded; and
(d) the owner (Philip) has a clear, sequenced, blast-radius-aware set of
optimization decisions to approve.

## 6. Acceptance criteria

1. Root cause of the skeleton cascade is stated as a **verifiable mechanism**
   (which Suspense boundary shows, in what order, why) — not a guess.
2. The server critical path is inventoried query-by-query with the sequential
   hops marked.
3. The layout critical path identifies exactly which awaits block first paint
   and whether they re-run on navigation.
4. At least one **real measurement** (`[perf-json]` trace or browser perf trace) is captured,
   with the dev→hosted-Supabase RTT caveat called out (per
   [[hero-path-perf-network-bound]]).
5. Blast radius of each proposed change is mapped.
6. Roadmap is phased, blast-radius-ordered, with a validation method per phase.

## 7. Provenance note

This pack follows `archestimator-plan-pack` discipline. The work is audit/plan
only — proportionality applies; no padding docs. Prior relevant memory:
[[hero-path-perf-network-bound]] (dev→hosted RTT is the bottleneck locally;
measure on Vercel in-region), [[glass-estimate-sheet-redesign]] (glass sheet
shipped at `/newdesign`; glass-scoped), [[use-server-exports-only-async]],
[[supabase-types-not-pure-generated]].
