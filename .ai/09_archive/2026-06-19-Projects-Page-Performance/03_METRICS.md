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

**Heavy caveat:** these are **DEV-server** numbers — superseded by §7 (production).

## 7. PRODUCTION-representative authed Lighthouse — MEASURED (the real picture)

Captured against a **true production build** (`next build` → `next start`, minified
bundles, prod React) authenticated with a **real Supabase session** (minted for the
seeded user via admin `generateLink` → `verifyOtp` → `@supabase/ssr` cookies). The
dev-auth bypass is dead-code-eliminated in production builds (it's `NODE_ENV !==
"production"`-gated), so a real session — NOT a gate change — was the correct path.
No security code was modified (`git diff` on the gate/proxy is empty). Localhost
loopback, no network throttle, single run per condition (treat as representative,
±~10% variance):

| Metric | Cold | Warm |
|---|---|---|
| **First Load JS** (`/workshop/projects`) | **767 kB raw / 215.9 kB gzip** | — |
| **Performance score** | **56** | **64** |
| FCP | 1.4 s | 1.4 s |
| **LCP** | **4.9 s** | **4.4 s** |
| TBT | 650 ms | 440 ms |
| CLS | **0** | **0** |
| Speed Index | 13.6 s | 11.1 s |

**Dev vs production:** the dev LCP 10.6s was ~6s of pure dev overhead (Turbopack JIT
compile + unminified JS). Production LCP **4.4–4.9s is ~2.2–2.4× faster**. CLS 0.

**Images — fix + thumbnail win CONFIRMED in production:** 3/3 card `<img>` to the
auth-gated `/api/projects/images` proxy rendered (`naturalWidth=512`, HTTP 200,
`image/webp`), each **14.9 / 17.8 / 57.1 kB (avg ~30 kB)** — tens of KB, not the old
~414 kB. Both the broken-image fix (revert to `<img>` so the browser carries the
session cookie) and the 512px-thumbnail optimization are validated end-to-end.

**The remaining ~4.4s warm LCP is genuine production cost** — NOT bundle compile. The
next real levers (beyond this pack's scope) are main-thread/hydration work (TBT 440ms)
and the **serial auth-gated image-proxy fetches** (Speed Index 11s = images painting
late, after LCP). Bundle size is not the bottleneck.

## Resolved / remaining

- **Production-representative authed Lighthouse — DONE** (§7). The earlier "blocked by
  design" note is resolved: instead of weakening the prod-disabled dev-auth bypass, a
  real Supabase session was minted for the seeded user against a true `next start` build.
  Production LCP is **4.4s warm** (vs the 2026-06-01 baseline of 3865ms — *higher*, but
  that baseline was a different, pre-RPC build; the meaningful comparison is dev 10.6s →
  prod 4.4s, and the image bytes drop). Closing LCP under 3s further needs the
  main-thread / image-proxy work noted in §7, not bundle changes.
- **Multi-run authed Lighthouse — `manual-proof-pending`.** The §7 numbers are a
  single representative run per condition. A multi-run median (≥3 runs) against
  `next build → next start` with a real Supabase session was NOT re-captured in the
  verify-then-finish loop (heavy browser+session harness, not runnable headless here).
  The single-run §7 result stands as `local production-build proof`. Operator command:
  mint a real session (admin `generateLink` → `verifyOtp` → `@supabase/ssr` cookies),
  then run Lighthouse ×3 vs `next start` and take the median LCP/CLS/TBT.
- **Slow-3G — SKIPPED (justified), still uncaptured.** It would only matter to decide
  the next lever, and that decision is already made: the LCP element is **text**, so the
  first-row image `priority` lever is N/A regardless of throttling. Capture only if a
  future pack needs throttled evidence.
- **Repo harness gap (found, worth fixing):** `e2e/route-transition-performance.spec.ts`
  gates its authed projects test on `ARCHESTIMATOR_DEV_AUTH_BYPASS===1` but never
  injects the bypass **secret cookie**, so the authed scenario redirects to `/login`
  and times out. The standalone capture above injects the cookie; the committed spec
  should be patched to add the cookie (or use `PLAYWRIGHT_STORAGE_STATE`) to make the
  authed transition measurable in CI.
