# Metrics — `/workshop/projects` after the perf refactor

Measured 2026-06-19 at HEAD (perf commits `f54754a4`, `2f30b6e2`, `8284be4d`,
plus `165adfad` for lazy img + content-visibility). Numbers are real captures,
clearly labelled measured vs not-yet-measured. **The wins here are runtime
(server round-trips, re-renders, image bytes), not bundle size** — so the
headline proof is the render-count harness, not a First-Load-JS delta.

## 1. Render efficiency — EMPIRICAL PROOF (the headline)

Harness: `tests/vitest/perf/projects-page-render-baseline.test.tsx` (4 tests,
passing). It mounts the real `ProjectsPageClient` with a 10-project fixture and
counts `LiveProjectCardImpl` body renders per interaction (spying the
once-per-render `usePrefetchOnHover`), with a `<Profiler>` as a secondary signal.

| Interaction | Card re-renders NOW | Naive (no memo/defer) | 
|---|---|---|
| Initial mount (10 cards) | **10** (1 each — correct) | 10 |
| Type "Project" (7 keystrokes) in search | **0** | ~70 |
| Sort-direction toggle (real reorder) | **0** | ≥10 |
| View-mode change (control case) | **10** | 10 |

**Interpretation:** typing 7 characters now causes **zero** card re-renders (a
naive page re-renders all cards on every keystroke → ~70). A sort toggle reorders
with **zero** card-body re-renders. The view-mode control case still re-renders
all 10 (because `viewMode` genuinely changes) — proving the counter observes real
prop-driven renders and `memo` isn't silently swallowing everything. This is the
direct, regression-guarded proof of the Phase 2 work (`React.memo` +
`useDeferredValue` + `useStableCallback`). The assertions fail if any of those
are removed.

## 2. Server data fetch — MEASURED (deterministic concurrency test)

Phase 1 collapsed the post-wave-1 tail from **4 sequential round-trips** to **2
parallel waves** (`workspace-repository.ts`):
- Before: `sharedProjects` → `favoriteEstimates` → `publications` → `pendingInvites` (serial).
- After: `[sharedProjects ∥ favoriteEstimates]` then `[publications ∥ pendingInvites]`.

**Proven by** `tests/vitest/perf/projects-page-server-parallelism.test.ts` (passes,
stable across 3 runs): a latency-injected Supabase mock (50ms/round-trip) records
each query's start/end while the REAL `listCurrentWorkspaceProjects` runs with
fixtures that hit both waves. Measured:

| Wave | Queries | Overlap | Reading |
|---|---|---|---|
| Wave 2 | `sharedProjects` ∥ `favoriteEstimates` | **52ms** | full concurrency (~1 RTT) |
| Wave 3 | `project_publications` ∥ `collaboration_invitations` | **50ms** | full concurrency |
| Total | whole function | **208ms** | vs ~300ms all-serial floor |

The two waves collapse to **~2 sequential RTTs instead of ~4**. A serial regression
(2nd query starting only after the 1st resolves) would drop overlap to ≤0 and push
total past 300ms — the test would fail. This is the headless proof of the server win;
real-Postgres wall-clock additionally appears in the live capture (§6).

## 3. Bundle — measured (baseline, not where the win is)

Default `bun run build` (Next 16 + Turbopack) emits **no per-route size table**
(Turbopack limitation). Numbers below are from the webpack analyzer build
(`ANALYZE=true bunx next build --webpack`) + on-disk chunk measurement:

- **Projects-page entry chunk:** 72.8 KB parsed / **21.2 KB gzip**.
  - Top modules (statSize): `projects-page-client` 68.3 KB, `LiveProjectCard`
    37.2 KB, `ManageGroupsPopover` 17.2 KB, `dropdown-menu` 9.5 KB.
- **Shared app-shell baseline:** 417.9 KB raw / **123.3 KB gzip**.
- **Vendor (`@tanstack` + `@phosphor-icons`):** ~19–24 KB gzip (phosphor is
  scattered per-icon via `optimizePackageImports`, so only used icons load).
- **Approx First Load JS** for the route ≈ **~165 KB gzip** (entry + shared +
  vendor) — an estimate; Next's official figure wasn't emitted (the webpack build
  fails type-check on an UNRELATED pre-existing file
  `src/app/invite/[token]/accept/route.ts`, before writing `app-build-manifest.json`).
- **Middleware:** none (no user `middleware.ts`).

**A/B build is uninformative here:** Phase 1 is server-side (`Promise.all`, zero
client bundle), and `memo`/`useDeferredValue` add only already-imported React
APIs — bundle delta is <0.5 KB gzip. The gains are runtime, captured in §1.

## 4. Images — MEASURED LIVE (the lazy-load payoff)

Captured in a real authed browser (Playwright + chromium, dev-auth bypass, the
seeded account renders 3 image-bearing cards):
- **Above-the-fold initial paint: 0 image bytes** (`imgCount=0`, `naturalWidth=0`
  on first navigation) — LCP is text/card content, not an image.
- **After scrolling all cards into view: 3 images, ~483 KB total** (transferSize
  483,736 B), dominated by one 414 KB hero (+ 26 KB + 43 KB).

So the Phase-1 `loading="lazy"` defers **~483 KB off the first-paint critical path**
to intersection/scroll. Concrete, not theoretical.

## 5. Off-screen rendering — Phase 3

`content-visibility:auto` + `contain-intrinsic-size: auto <len>` on each card lets
the browser skip layout/paint for off-screen cards. Effect scales with list
length; visible in a browser profiler on a large list (not unit-measurable). With
only 3 cards in the seeded workspace it doesn't move the needle here — it's a
hardening win for large lists.

## 6. Live authed page load — MEASURED (DEV server; NOT production-representative)

Real authed `/workshop/projects` via Playwright (dev-auth bypass: `BYPASS=1` +
32-char `BYPASS_SECRET` cookie + `ADMIN_DB=1`), `bun run dev` (Turbopack), local,
no network throttling:

| Metric | Cold (best of 3) | Warm (HMR) |
|---|---|---|
| TTFB | **711 ms** | 1.9 s |
| FCP | 812 ms | 2.1 s |
| LCP | 812 ms (text, not image) | — |
| DOMContentLoaded / Load | ~4.0 s | ~7.8 s |
| Cards above-fold / tablist | 3 / present | 3 / present |

Lighthouse (mobile, simulated slow-4G, authed): **perf 56 · FCP 1.4s · LCP 10.6s ·
TBT 450ms · CLS 0 · SI 7.5s**.

**Heavy caveat:** these are **DEV-server** numbers — unminified bundles + Turbopack
on-demand compilation. The 10.6s Lighthouse LCP and score 56 reflect dev-mode JS
weight + simulated throttling, **NOT production**. Treat as relative/dev signals,
not the production figure. (CLS 0 is meaningful and good; the skeleton + reserved
tabs row keep layout stable.)

## What remains genuinely blocked (and why)

- **Production-representative authed Lighthouse / Slow-3G** — *blocked by design*,
  not deferred: the dev-auth bypass only works when `NODE_ENV !== production`, and
  `next start` forces production, which disables it (a security control). A
  production authed run therefore needs a **real logged-in session**
  (`PLAYWRIGHT_STORAGE_STATE` from a real credentialed login) — unavailable
  headlessly without real credentials. This is the one figure left to confirm the
  old 3865ms LCP baseline closes; capture it from a logged-in session when convenient.
- **Repo harness gap (found, worth fixing):** `e2e/route-transition-performance.spec.ts`
  gates its authed projects test on `ARCHESTIMATOR_DEV_AUTH_BYPASS===1` but never
  injects the bypass **secret cookie**, so the authed scenario redirects to `/login`
  and times out. The standalone capture above injects the cookie; the committed spec
  should be patched to add the cookie (or use `PLAYWRIGHT_STORAGE_STATE`) to make the
  authed transition measurable in CI.
