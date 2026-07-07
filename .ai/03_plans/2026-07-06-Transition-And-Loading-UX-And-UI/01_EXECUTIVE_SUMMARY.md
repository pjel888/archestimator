# Executive Summary

**Plan:** Transition and Loading UX/UI — App-Wide Audit, Measurement Strategy, and AI-Agent Rules
**Status:** `CONDITIONALLY READY` (Phases 0, 1.5, and 4 are `IMPLEMENTATION-READY`; UX/mount/perf phases carry owner decisions and need real-asset proof)
**Plan profile:** `exhaustive`
**Verification mode:** `emulated`
**Created:** 2026-07-06 · **Improved:** 2026-07-07 (Asia/Manila)

> **2026-07-07 improvement pass:** deepened evidence via 3 parallel lanes (route-cache contracts, credential/attack-surface taxonomy, Cloudflare free-tier cost model). **Surfaced 3 correctness bugs (ARCH-07a/b/c)** now sequenced into a new **Phase 1.5** before UX work. **Refined PERF-02 to default to Cloudflare Web Analytics (free, reports LCP/INP/CLS)** instead of a custom beacon. Added React-Compiler posture (not configured), per-route cache contracts, full state + a11y proof matrices, proof-contract rows, and a known-red validation ledger.

---

## What this plan is

A planning-only, no-code audit and forward strategy for three things at once:

1. **Audit** the current transition and loading UX/UI for the *entire* Archestimator app — every route, every `loading.tsx`/`error.tsx`, every `<Suspense>`, every `next/dynamic`, every prefetch decision, and every heavy client component on the mount path.
2. **Measurement** — define how performance will be measured, benchmarked, and regression-gated, including the production-RUM/Core-Web-Vitals gap, the existing Playwright/Vitest/bundle tooling, evaluator contracts, and budget cadence.
3. **Agent rules** — codify durable, repo-native rules so future AI agents (and humans) apply consistent Next.js 16 + React 19 best practice when mounting pages and components and when adding new features.

This is explicitly **not** an implementation pass. No application code, tests, migrations, configs, or provider state are changed by this plan.

## Headline findings

- **42 UI routes**, but loading/error coverage is uneven. Only **14** routes have their own `loading.tsx` and **8** their own `error.tsx`. The `/workshop/*` tree is well-covered in `library/*` but partial in `projects/*`, `settings/*`, `publisher`, `proposals`, `onboarding`. Two leaves (`/workshop/publisher`, `/workshop/projects/[projectId]/estimates`) have `error.tsx` but **no** `loading.tsx`. `/invite/[token]` (dynamic, token-bearing) has neither.
- **No root `loading.tsx` or root `error.tsx`.** The only root safety net is `global-error.tsx` (full-page replacement). Workshop subtree errors not caught by a deeper `error.tsx` escalate to a full-page "Something went wrong."
- **The global loading UX is a client overlay** (`RouteLoadingOverlay`, a blurred full-screen `Spinner` portal) driven by a Zustand navigation store. It works, but it is *also* the only transition feedback on routes that lack a `loading.tsx`, which means a heavy spinner where a skeleton could be. The roadmap already says "Loading states must use design-system Skeleton. No spinners" — the global overlay is a documented exception to that rule.
- **The two heaviest estimate-sheet chunks** (`EstimateSheetTree` 2165 LOC, `EstimateSheetContent` 2764 LOC) are mounted via `next/dynamic` with **default SSR and no `loading` fallback** (`EstimateWorkspaceClient.tsx:27,30`). They SSR + hydrate on the critical estimate route. A matching skeleton (`EstimateSheetRouteSkeleton`) already exists and is used by the route `loading.tsx` — opting these into `{ ssr:false, loading }` (or finer Suspense) is the single highest-leverage mount optimization.
- **`fetch` inside `useEffect`** on the public share surface (`SharePageComments.tsx`, `SharedLinkActivityFeed.tsx`) — no SSR, no cache, no dedupe, delays first meaningful paint on the receiver route.
- **No `useSuspenseQuery` / `HydrationBoundary` / `dehydrate` anywhere.** Client TanStack Query caches start cold; RSC-prefetched data is not bridged into the client cache. There is no data-driven Suspense on the client.
- **No production RUM / Core Web Vitals telemetry.** `WebVitalsProbe` is dev-only (`NEXT_PUBLIC_PERF_TRACE`), logs to `console.log`. Landing has GA4 + Clarity (traffic) but no CWV beacon. There is no `web-vitals` package, no Lighthouse CI, no Sentry/OTel/Datadog. CWV measurement exists only as in-test Performance-Timeline capture in the Playwright route-transition spec.
- **Substantial but fragmented perf tooling already exists:** Playwright route-transition suite with CDP Slow-3G throttling, a per-route gzipped-JS CI budget gate (`scripts/check-performance-budgets.mjs`, 350 KB default, advisory), `perf:*` npm scripts, many `scripts/measure-*` / `benchmark-*` tools, and a `metrics/` evidence folder. The gap is **cohesion and production signal**, not absence of tooling.
- **`experimental.staleTimes`** (`dynamic: 60, static: 180`) is the principal lever controlling whether `loading.tsx` re-fires on warm navigations — directly relevant to perceived loading UX.
- **Next.js 16 framework opportunity: `unstable_instant` + Cache Components.** This is the framework's supported path to *guaranteed* instant client navigations with build-time validation, but it requires enabling Cache Components (off today) and restructuring uncached data behind `<Suspense>`. This is a **future, owner-gated** decision, not a Phase-1 mandate.

## Headline decisions (proposed, for implementation phases)

| Decision | Status | Rationale |
|---|---|---|
| Author a single `PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` under `.ai/00_system/` + pointer in `AGENTS.md` | Proposed (Phase 4, IMPLEMENTATION-READY) | Matches canonical-map rule: "New agent performance/recovery protocol: `00_system/` if it governs all agents." No `rules/` subdir. |
| Reference, don't duplicate, numeric budgets in `27-*.md` | Proposed | Single source of truth for LCP/INP/bundle numbers. |
| Make `EstimateSheet{Tree,Content}` non-blocking with a skeleton fallback | Proposed (Phase 2) | Highest-leverage mount fix; skeleton already exists. |
| Close loading/error gaps on token-bearing + authenticated dynamic routes | Proposed (Phase 1) | `/invite/[token]`, `/workshop/publisher`, estimates list, etc. |
| **Fix ARCH-07a/b/c revalidation correctness bugs (stale `/workshop/components` path; `/workshop/proposals`+`/workshop/publisher` zero server revalidation)** | **Proposed (Phase 1.5, IMPLEMENTATION-READY, release-blocking)** | Route-cache audit found stale data on hard refresh/new tab; release-blocking per Improve directive. |
| Migrate share-surface `fetch`-in-effect to TanStack Query | Proposed (Phase 2) | Enables cache + dedupe + SSR bridge. |
| **Production RUM via Cloudflare Web Analytics (Tier-1) first** | Proposed, **owner-gated** (Tier 1 vs Tier 2) | Refined 2026-07-07: Web Analytics is free, cookie-free, reports LCP/INP/CLS, no Worker code. Custom Worker→Workers Logs beacon is Tier-2 fallback. Paid APM rejected (free-tier). |
| Enable Cache Components + `unstable_instant` | Proposed, **owner-gated, future** | Cross-cutting, changes every uncached-data boundary. Not Phase 1. |
| Add `viewport` export + LCP-image `preload` discipline to agent rules | Proposed | Found gap: no `viewport` anywhere; LCP-image preload is documented Next.js guidance. |
| **Keep React Compiler OFF; manual memoization** | Proposed (Phase 4 rule) | Verified not configured; adoption is a separate cross-cutting plan with rules-of-React audit. |

## Readiness scores (initial → final; see `17_FINAL_READINESS_REVIEW.md`)

| Category | Final |
|---|---|
| Product strategy | 92 |
| Scope clarity | 96 |
| Requirements completeness | 95 |
| UX and UI readiness | 93 |
| Accessibility readiness | 92 |
| Architecture readiness | 94 |
| Performance and scalability readiness | 93 |
| Reliability and operational readiness | 90 |
| Blast-radius coverage | 95 |
| Testing and validation readiness | 92 |
| Rollout and rollback readiness | 88 |
| Requirements traceability | 96 |
| **Overall implementation readiness** | **93** |

Overall is below the 95 PASS bar because (a) verification is `emulated` (caps at 97 and, for high-blast-radius exhaustive packs, caps status at `CONDITIONALLY READY` without a real independent reviewer/owner acceptance), and (b) several forward phases carry genuine owner decisions (RUM sink, Cache Components, budget tightening) and browser/provider proof that a planning-only pass cannot settle. These are isolated to named phases; the rule-authoring and measurement-architecture phases are `IMPLEMENTATION-READY`.

## What an implementer should do first

1. Read `README.md` → `11_IMPLEMENTATION_PLAN.md`.
2. Start with **Phase 4 (Agent Rules)** and **Phase 0 (Measurement Baseline)** — both are `IMPLEMENTATION-READY` and unblock everything else.
3. Treat Phases 1–3 as scoped, owner-decision-bearing slices; do not start them without confirming the RUM sink and the Cache Components decision.
