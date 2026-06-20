# Hero-Path Performance — Deploy & Measure Handoff

Created 2026-06-20. Owner action required: deploy full `main` to Vercel when all in-flight work is merged, then run the benchmark runbook below. This doc is self-contained so a future agent (or Philip) can finish the production proof.

## Why production proof was deferred

Two environments, neither currently trustworthy for measuring the **current optimized code**:

1. **Local `next start` is network-bound.** This dev machine → hosted Supabase round-trip is **0.3–5 s per call** (measured), and each authenticated hero route makes several sequential Supabase calls, so local cold renders are 4–10 s. The DB itself executes the hero queries in **<1 ms** (in-region, via Supabase MCP `EXPLAIN ANALYZE`), and unauth `/login` served in 4–17 ms — so the cost is the dev→Supabase network, not the code. Local numbers are noise.
2. **`https://www.archestimator.com` is ~13 days stale** — it does NOT contain latest `main` or these optimizations. (Measured ~2 s medians there, but that's old code + residential→Vercel latency + Vercel cold-starts + harness overhead — not representative.)

The fix is to deploy the current code to Vercel (in-region with Supabase) and measure that. Philip chose to defer the deploy because multiple coding agents are still working the codebase.

## What was implemented (this branch / working tree — NOT yet committed/deployed)

All changes are **safe, zero UX/UI change**, and verified: `bun run type-check` → exit 0; targeted Vitest suites green; `bun run build` → exit 0.

| # | Change | File(s) | Effect |
|---|--------|---------|--------|
| A4 | Memoize `createSupabaseServerClient` with React `cache()` | `src/lib/supabase/server.ts` | Builds the per-request Supabase client once instead of ~19×/render (each did `await headers()`+`cookies()`). Verified safe: @supabase/ssr cookie adapter reads lazily + buffers writes; all auth flows use a single instance per request. |
| A6 | Parallelize the serial sidebar tail | `src/components/workshop/WorkshopPageShell.tsx` | `ensureDefaultWorkspace()` + `listMainSidebarFavoriteProjects()` now run via `Promise.all` (removes one sequential round-trip on every workshop page). |
| A11 | Dynamic-import flag-off copilot | `src/components/workshop/WorkshopPageShell.tsx` | `AskFlipFooterAssistant` (flag OFF by default) no longer in the shared client chunk. |
| A3 | Dynamic-import 4 sheet modals | `src/components/workshop/EstimateSheetContent.tsx` | CommandPalette, ProposalExportPreviewDialog, ActivityHistoryModal, RowDetailsModal code-split off the 759 kB estimate-sheet route (heaviest, ~2× others). Closed-by-default → no visible change. |
| A9 | Dynamic-import settings/feedback modal bodies | `src/components/workshop/WorkshopSettingsModalContent.tsx`, `WorkshopFeedbackModal.tsx` | `WorkshopSettingsModalContentView` (~292 L) + `BetaFeedbackForm` (~132 L) load on open instead of in the shared chunk. |
| A5 | Hover/focus route-prefetch dashboard recents | `src/components/workshop/ProjectDashboardClient.tsx` | The dashboard "Recent estimate sheets" links (→ heaviest route) now prefetch on hover, route-only (no query double-fetch). Mirrors `LiveProjectCard`. |
| A8 | Immutable image-proxy cache | `src/app/api/projects/images/route.ts` | Content-addressed (`randomUUID`, `upsert:false`) image URLs cached `private, max-age=86400, immutable` (was 300 s) — avoids repeated auth+DB+storage round-trips. |
| A16 | `refetchOnMount:false` on tabs query | `src/hooks/use-estimate-query.ts` | Server-seeded tabs no longer refetch on mount (matches tree hooks). |

Auth round-trips were found to be **already deduped** (`getCurrentUserContext` is already `cache()`-wrapped → 1× `getUser`/render).

New benchmark tooling (keep, commit with the rest):
- `scripts/bench-hero-browser.mjs` — real-browser soft-nav benchmark via Kimi WebBridge (overlay-based, robust to soft/hard nav). Param: `BENCH_BASE_URL`, args `[runs] [label]`.
- `scripts/bench-hero-server.mjs` — authenticated full-doc + RSC server timing per route.
- `scripts/measure-route-transitions.ts` — unchanged from prior task (a stray exploratory edit was reverted).

## Baseline numbers (for later comparison)

Local `next start` production build, real authenticated browser, n=10 (NOISY — network-bound, busy dev machine). Medians / max / best-observed:

| Transition | median | max | best |
|---|---:|---:|---:|
| Workshop → Projects | 911 ms | 2146 ms | ~650 ms |
| Projects → Target Project | 1187 ms | 3232 ms | ~660 ms |
| Target Project → Estimates | 1251 ms | 3647 ms | ~690 ms |
| Estimates → Target Estimate | 1208 ms | 3755 ms | ~650 ms |

Artifacts: `benchmarks/hero-browser-prod-baseline.json`, `benchmarks/hero-browser-prod-after-wave1.json`, `benchmarks/hero-server-after-wave1.json`, `benchmarks/hero-browser-prod-vercel-live.json` (stale-prod reference). Full audit: `audit/AUDIT-2026-06-20.md`.

## RUNBOOK — run this after `main` (with these changes) is deployed to Vercel

Prereq: the hero seed data exists in Supabase `ebxxqidacheyapmmzavr` (project `22222222-2222-4222-8222-222222222222`, estimate node `bf254cbd-13d4-4dbf-b21a-84b171cdd6db`) — confirmed present in prod's DB. If the estimate node id has changed, update `STEPS`/`NODE_ID` in `scripts/bench-hero-browser.mjs`.

1. **Deploy** full `main` to Vercel (`vercel --prod`, or your normal flow). Confirm `vercel ls` shows a fresh Production deployment and `https://www.archestimator.com` serves it.
2. **Start the browser bridge** (only needed for the real-browser benchmark): `~/.kimi-webbridge/bin/kimi-webbridge start` → `status` should show `running:true, extension_connected:true`.
3. **Sign in** to `https://www.archestimator.com` with Google in the real browser (a tab the bridge can see).
4. **Benchmark the deployed app** (real-browser soft-nav, in-region):
   ```bash
   BENCH_BASE_URL=https://www.archestimator.com node scripts/bench-hero-browser.mjs 10 prod-deployed
   ```
   Output → `benchmarks/hero-browser-prod-deployed.json`.
5. (Optional, lower-noise server view) capture auth as a storage-state and run server timing:
   - In the signed-in tab, the `sb-...-auth-token.*` cookies are readable; write them to a `/tmp` storage-state (see `scripts/bench-hero-server.mjs` header — it reads `/tmp/hero-storage-state.json`; do NOT commit that file).
   - `BENCH_BASE_URL=https://www.archestimator.com node scripts/bench-hero-server.mjs 15 prod-deployed`
6. **Compare** to the baseline table above. On Vercel in-region (server→Supabase ~1–10 ms instead of 0.3–5 s), expect the server component of each transition to drop sharply.

### Suggested acceptance target (adjust to taste)
Production soft-nav transitions: **median ≤ 800 ms, p95 ≤ 1500 ms** per hero hop, warm. (Note residential browser→Vercel latency + Vercel cold-starts add a real-user floor; warm/repeat navigations are the fair signal.)

## Remaining wins that need an OWNER decision (not done — out of "safe, zero-UX" scope)

- **B1 — per-row RLS hoist**: wrap `auth.uid()`/`auth.jwt()` in `(select …)` in `is_platform_admin()` etc. (the standard Supabase pattern; semantics-preserving). Biggest in-DB win (47 ms/53 rows → ~constant) but HIGH-blast-radius (RLS/security) → needs review + before/after EXPLAIN as the `authenticated` role. Negligible in-region anyway, so low priority unless sheets grow large.
- **B2 — estimates-list pagination/windowing**: `ProjectEstimatesTable` renders all rows (sheet rows ARE already virtualized; the list is not). UX change → your call. Matters only if estimate counts grow materially.
- **B5 — browserslist trim** (drop ~38.5 kB `polyfill-nomodule` from every route's First Load JS): needs a supported-browser-floor decision.
- **B4 — invert `ProjectDashboardClient` to a server shell + client leaves** (853 L `use client`, ~19 interactive sites): larger refactor of the busiest interior route.
- **A1 — add `@vercel/speed-insights`** for real-user field metrics (needs the dep + a deploy to collect data).

## State notes for the next agent

- Changes are in the **working tree, uncommitted** (other agents are concurrently editing; do not force a commit). They are type-check/build/test clean as of 2026-06-20.
- The local dev server was swapped to `next start` during benchmarking; it has been restored to `next dev` (or restart with `bun run dev`).
- Any `/tmp/hero-storage-state.json` (auth cookies) created during benchmarking is deleted after use; never commit it.
