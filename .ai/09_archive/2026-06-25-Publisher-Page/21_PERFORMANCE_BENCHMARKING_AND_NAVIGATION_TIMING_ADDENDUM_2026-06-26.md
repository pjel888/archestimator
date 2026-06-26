# 21 — Performance Benchmarking and Navigation Timing Addendum (2026-06-26)

> **Authority.** This document COMPLEMENTS `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`. It does NOT supersede doc 09. Where doc 09 sets surface-level p95 budgets (roster first paint, drawer open), this addendum specifies the **intra-page navigation timing matrix**, **concrete benchmarking script extensions**, **stress-test gates**, **bundle-size CI gates**, and **RSC streaming budgets** that doc 09 left implicit. Where this doc and doc 09 disagree, this doc is authoritative for navigation-transition scope; doc 09 remains authoritative for steady-state reliability/observability.
>
> **Relationship to doc 18.** This doc addresses the open performance corrections ARCH-DEFECT-01 (stress test with seeded 50×5×10 workspace) and ARCH-DEFECT-02 (sort location unspecified) from `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. It does not revisit the corrected action/RPC names — those remain per doc 18.
>
> **Relationship to existing repo infrastructure.** The repo already ships `e2e/route-transition-performance-budgets.json` and `e2e/route-transition-performance.spec.ts` with established helpers (`collectRouteMetrics`, `emulateNetworkProfile`, `attachMetrics`), a JSON budget schema, Slow 3G network emulation, bfcache checks, and overlay-visibility-rate assertions. **This addendum EXTENDS those files; it does not create parallel benchmarking infrastructure.** Ponytail T2.3 — no new mega-systems when existing patterns suffice.

---

## Purpose

Close the six performance-scope gaps that doc 09 leaves open:

| Gap | Doc 09 status | This addendum |
|---|---|---|
| **G-PERF-01.** Intra-page navigation-transition budgets (row→drawer, filter switch, search, load-more, mutation→revalidate, deep-link) | Not specified | §Navigation timing matrix |
| **G-PERF-02.** Concrete benchmarking script and automation | Tools named, no runnable spec | §Benchmark harness extension |
| **G-PERF-03.** Stress-test performance gate for seeded 50×5×10 workspace (ARCH-DEFECT-01) | "≤ 8 round trips" claimed, no gate | §Stress-test gate |
| **G-PERF-04.** Sort location and client-side render cost (ARCH-DEFECT-02) | "p95 < 1.2s including sort" asserted, not broken out | §Sort and render budget |
| **G-PERF-05.** Per-route and per-chunk bundle-size CI gate | "< 80KB roster, < 30KB drawer" noted informally | §Bundle-size CI gate |
| **G-PERF-06.** RSC streaming budget (TTFB vs TTI, partial hydration) | Not specified | §RSC streaming budget |

---

## Scope

### In scope

- Navigation-transition p95 budgets for every user-driven intra-page flow on `/workshop/publisher`.
- Extension of `e2e/route-transition-performance-budgets.json` with Publisher-specific keys.
- Extension of `e2e/route-transition-performance.spec.ts` with Publisher test cases (env-gated).
- User Timing API marker convention for Publisher components.
- Bundle-size budget breakdown (first-load JS, per-route, per-chunk) and CI gate.
- RSC streaming budget (TTFB, first row paint, full roster interactive).
- Stress-test gate definition for 50×5×10 seeded workspace.
- Mapping of Publisher render paths to the `react-performance` skill rules (`async-*`, `bundle-*`, `server-*`, `rerender-*`, `rendering-*`).
- New requirements PERF-06 through PERF-14.
- New work packages WP-1.9 (benchmark harness) and WP-2.6 (stress gate + CI wiring).

### Out of scope

- Backend/RPC query-plan optimization (covered by doc 07 and the separate `database-indexing-and-query-performance` pack).
- Real-user monitoring (RUM) dashboard design (post-launch, doc 09 §Dashboards).
- Web Worker offload for filter/search (YAGNI at < 100 publications; Phase 5 trigger only).
- Lighthouse CI YAML authoring (lives in `.github/workflows/ci.yml`; this addendum names the assertion, CI integration is WP-1.9).
- Mobile-native (< 768px) benchmarking (Phase 5 trigger per doc 20).

### Non-goals

- NOT replacing doc 09's reliability, caching, concurrency, failure-mode, logging, or alerting sections.
- NOT introducing a new benchmarking framework or dependency. Bun's test runner + Playwright + the existing JSON budget file are sufficient.
- NOT asserting performance numbers that have not been measured. Every budget below is a TARGET with a TBD measurement slot, not a claim.

---

## Gap analysis (what doc 09 missed and why it matters)

### 1. Navigation is the primary Publisher UX; doc 09 budgets the frame, not the motion

Doc 09 sets `< 1.2s p95` for roster first paint and `< 200ms` for drawer open. But the Publisher interaction loop is **navigation-heavy**: a builder opens the page, clicks a row, scans recipients, switches the activity tab, searches, closes the drawer, filters to "Stale", clicks another row. Each transition has a perceived-latency budget that is independent of first paint. Without per-transition budgets, Phase 1 can ship a roster that meets the 1.2s gate but feels sluggish because row→drawer takes 900ms.

### 2. "0 round trips, client-side" hides render cost

Doc 09 §Network round trips correctly marks filter tab switches and search as 0 round trips. But 0 round trips ≠ 0ms. A filter switch on 100 publications triggers a re-sort + re-render of 100 rows. Without a render-timing budget, a naive `useState` filter that re-renders the whole tree on every keystroke passes doc 09's gate while feeling broken.

### 3. The "≤ 8 round trips" claim is a plan-time estimate, not a gate

ARCH-DEFECT-01 (doc 18) flags that the worst-case 50×5×10 workspace produces 50 + 250 + 2,500 queries if the application-layer loop is naive. Doc 09 says "≤ 8 round trips" but defines no threshold at which the Phase 2 RPC escape valve becomes mandatory. Without a gate, Phase 1 can ship, hit production scale, and only discover the N+1 at a bad moment.

### 4. Sort location is in TypeScript, not SQL

ARCH-DEFECT-02 (doc 18) flags that `latestActivityAt` computation happens application-layer. Doc 09 folds this into the 1.2s budget without breaking out sort cost vs. fetch cost. On 100 publications the sort is trivial; on 500 it is not. The budget needs a client-side execution envelope.

### 5. Bundle budgets are per-surface, not enforced in CI

Doc 09 says roster `< 80KB` and drawer chunk "verify < 30KB". "Verify" is not a gate. Without a CI step that parses `bun run build` output and fails above budget, chunk size regresses silently.

### 6. RSC streaming is unmeasured

Next.js 16 RSC can stream partial HTML via `<Suspense>`. Doc 09 assumes one-shot render. The Publisher roster wraps the activity feed in `<Suspense>`, so the page can paint rows before the feed resolves — but no budget defines how long the feed has before it hurts LCP/INP.

---

## Navigation timing matrix

Every user-driven transition on `/workshop/publisher` with a p95 budget. **These are targets, not measurements.** Phase 1 implementation must capture actuals and confirm each target; if a target is missed, the cause (waterfall, bundle, render, sort) must be identified before Phase 1 exit.

### Matrix A — Page-entry transitions (server-driven)

| ID | Transition | p95 budget | Measurement surface | Budget rationale |
|---|---|---|---|---|
| NAV-01 | Sidebar click "Publisher" → first roster row paint | < 1.2s | Playwright `navigation.duration` + first `[data-testid="publisher-roster-row"]` visible | Matches doc 09 PERF-01; accounts for auth gate + RSC fetch + render |
| NAV-02 | Deep-link `/workshop/publisher?project=<id>` → filtered roster interactive | < 1.5s | Playwright navigation + URL-param assertion + row count | Adds 300ms over NAV-01 for filter parsing + re-render |
| NAV-03 | Cold entry with Slow 3G (PH/SEA market floor) | < 3.0s | `emulateNetworkProfile(slow3g)` + same markers as NAV-01 | ARCH-DEFECT-13 tablet/PH floor; 2.5× the fast-network budget |
| NAV-04 | bfcache back/forward restore from Publisher | < 1.5s | `route-transition-performance.spec.ts` bfcache helper | Reuses existing `bfcache.backForwardRestoreMs` pattern |

### Matrix B — Intra-page read transitions (client-side, 0 round trips)

| ID | Transition | p95 budget | Measurement surface | Budget rationale |
|---|---|---|---|---|
| NAV-05 | Click roster row → drawer fully interactive (recipients + activity loaded) | < 400ms | `performance.mark('drawer:open')` → `performance.mark('drawer:ready')` | Doc 09 says < 200ms for drawer "open" (chunk load); this adds the data-fetch + render window |
| NAV-06 | Drawer close → roster re-interactive | < 100ms | `performance.mark('drawer:close')` → next paint | Pure client; budget prevents focus-trap teardown regressions |
| NAV-07 | Filter tab switch (All → Stale → Revoked → Active) | < 50ms DOM update | `startTransition` enter → next paint | 100 publications × row render must stay sub-perceptual |
| NAV-08 | Search input (debounced 200ms) → filtered results rendered | < 100ms after debounce | Debounce end → next paint | Filter+render on cached data; no network |
| NAV-09 | "Load more" activity feed (cursor pagination) | < 300ms | Click → next page rendered | One server fetch + append; parallel to drawer queries |
| NAV-10 | Roster scroll (content-visibility check) | < 16ms per frame | PerformanceObserver `longanimationframe` | No jank from 100 rows; `content-visibility: auto` must hold |

### Matrix C — Mutation transitions (server-action round trips)

| ID | Transition | p95 budget | Measurement surface | Budget rationale |
|---|---|---|---|---|
| NAV-11 | Rotate token → roster row reflects new token, old-token flash absent | < 800ms | Click confirm → `revalidatePath` complete + row repaint | Doc 09 says < 600ms action round-trip; adds 200ms for revalidate + render. D-ARCH-05 serialization may add 50ms under contention. |
| NAV-12 | Revoke publication → row status flips to "Revoked" | < 700ms | Click confirm → status badge swap | Lighter than rotate (no token regenerate) |
| NAV-13 | Add recipients (1–50 inputs) → recipient list updated | < 1.2s | Submit → list repaint | D-ARCH-07 cap; Resend digest queue is fire-and-forget via `after()` |
| NAV-14 | Remove recipient → list updated | < 600ms | Click delete → list repaint | Lighter than add; no digest work |
| NAV-15 | Republish (password + sheet-scope save) → snapshot_version bump reflected | < 1.0s | Save → roster snapshot badge swap | D-ARCH-08: access cookies stay valid; view-token refresh is receiver-side |
| NAV-16 | Sheet selection save → roster "sheets" column updates | < 900ms | Save → column repaint | Subset of NAV-15 |

### Matrix D — Concurrent-state transitions

| ID | Transition | p95 budget | Measurement surface | Budget rationale |
|---|---|---|---|---|
| NAV-17 | Second manager rotates same publication during my rotate | Reject < 200ms; wait toast shown | Click → conflict toast visible | D-ARCH-05 DB-level serialization; conflict response, not queue |
| NAV-18 | I click a second action on same publication while first in flight | Reject < 100ms; wait toast | Click → toast visible | D-ARCH-06 reject, not queue |
| NAV-19 | Filter switch during in-flight mutation | Allowed; < 50ms switch, mutation unaffected | Dual assertion | Filter is read-only on cached data; no mutation conflict |

### Matrix E — Failure transitions

| ID | Transition | p95 budget | Measurement surface | Budget rationale |
|---|---|---|---|---|
| NAV-20 | Drawer chunk lazy-load fails → error boundary + retry | < 300ms to boundary | Triggered network error → boundary visible | Doc 09 §Failure modes; 1 retry then boundary |
| NAV-21 | Roster fetch fails (Supabase transient) → error state + retry | < 500ms to error UI | Simulated 503 → error UI visible | 1 silent retry (doc 09), then surface |
| NAV-22 | Server-action mutation fails → inline error + form retained | < 400ms to error | Forced 500 → inline error visible | No auto-retry on mutations (doc 09) |

---

## Sort and render budget (G-PERF-04)

Doc 09 PERF-01 (p95 < 1.2s) is the **end-to-end** gate. This addendum breaks it into sub-budgets so a miss can be diagnosed:

| Sub-budget | Target | Where measured | Notes |
|---|---|---|---|
| RSC TTFB (server fetch + RBAC + roster query) | < 400ms | `performance.getEntriesByType('navigation').responseStart` | Includes `readWorkspacePublicationsRoster` + RLS check |
| RSC HTML transfer | < 150ms | `responseEnd − responseStart` | < 80KB gzipped (doc 09 PERF-02) |
| Hydration | < 250ms | `domInteractive − domContentLoadedEventStart` | Roster client island only |
| Application-layer sort (`latestActivityAt desc`) | < 50ms | User Timing mark `publisher:sort` | 100 publications; O(N log N) |
| Initial render (100 rows to DOM) | < 250ms | User Timing mark `publisher:render` | `content-visibility: auto` on rows |
| **Sum (target)** | **< 1.1s** | | Leaves 100ms headroom under the 1.2s gate |

If the sum exceeds 1.1s at Phase 1 measurement, the overshoot must be attributed to one of the five sub-budgets before Phase 1 exit. "It's just slow" is not an acceptable diagnostic.

---

## RSC streaming budget (G-PERF-06)

The roster page wraps the activity feed in `<Suspense fallback={<PublisherRosterSkeleton/>}>`. Streaming lets rows paint before the feed resolves.

| Marker | Target | Measurement |
|---|---|---|
| TTFB (first byte of RSC stream) | < 400ms | Navigation Timing `responseStart` |
| First roster row visible (above Suspense) | < 700ms | Playwright `locator(...).first().isVisible()` |
| Activity feed first event visible (inside Suspense) | < 1.2s | Playwright `locator(...feed-row).first().isVisible()` |
| Full page interactive (hydration complete) | < 1.5s | `performance.mark('publisher:interactive')` |
| Slow 3G: all of the above × 2.5 | per ARCH-DEFECT-13 | `emulateNetworkProfile(slow3g)` |

If the activity feed Suspense fallback is visible for > 500ms, the feed query is the bottleneck and the Phase 2 `workspace_activity_feed` RPC (doc 20 P5-04) becomes mandatory, not optional.

---

## Stress-test performance gate (G-PERF-03, ARCH-DEFECT-01)

### Seed workspace shape

50 projects × 5 publications per project × 10 recipients per publication = **250 publications × 2,500 recipients**. Plus 50 events per publication = 12,500 activity events.

### Seed script

Phase 0 must add `scripts/seed-publisher-stress.mjs` (Bun-compatible) that inserts this workspace into a throwaway Supabase branch or local Postgres. It must be idempotent and cleanable. This is a test fixture, not production seed data.

### Gate thresholds

| Metric | Target (p50) | Gate (p95) | Escape-valve trigger |
|---|---|---|---|
| Roster first paint (NAV-01) | < 800ms | < 1.5s | If p95 > 1.5s → P5-03 workspace publications summary RPC becomes Phase 2 mandatory |
| Sort + render cost | < 100ms | < 300ms | If p95 > 300ms → move sort to SQL (`ORDER BY latest_activity_at`) |
| Drawer open (NAV-05) | < 300ms | < 600ms | If p95 > 600ms → paginate recipients (50 per page) |
| Activity feed first page | < 400ms | < 800ms | If p95 > 800ms → P5-04 workspace activity feed RPC becomes Phase 2 mandatory |
| Application-layer round trips | ≤ 8 | ≤ 12 | If > 12 → Phase 2 RPC becomes mandatory regardless of latency |

### Gate enforcement

The stress test runs as a **separate Playwright spec** (`e2e/publisher-stress.spec.ts`, env-gated `ARCHESTIMATOR_E2E_PUBLISHER_STRESS=1`) that is NOT in the default `bun run test:e2e` run. It runs nightly or on-demand. Phase 1 exit requires one passing stress run with the gate thresholds recorded in the plan's evidence folder.

---

## Benchmark harness extension (G-PERF-02)

### Extend `e2e/route-transition-performance-budgets.json`

Add Publisher-specific keys to the existing JSON budget file. Do NOT fork into a new file.

```json
{
  "publisherRouteEntry": {
    "firstRowVisibleMs": 1200,
    "fullInteractiveMs": 1500,
    "rosterRowCountMin": 1
  },
  "publisherRouteEntrySlow3g": {
    "firstRowVisibleMs": 3000,
    "fullInteractiveMs": 3500
  },
  "publisherDeepLinkFiltered": {
    "firstRowVisibleMs": 1500,
    "urlParamFilterApplied": true
  },
  "publisherDrawerOpen": {
    "drawerInteractiveMs": 400,
    "recipientListVisibleMs": 400,
    "activityFeedFirstEventMs": 400
  },
  "publisherDrawerClose": {
    "rosterReinteractiveMs": 100
  },
  "publisherFilterSwitch": {
    "domUpdateMs": 50
  },
  "publisherSearch": {
    "debounceMs": 200,
    "filteredRenderMs": 100
  },
  "publisherLoadMoreActivity": {
    "nextPageRenderMs": 300
  },
  "publisherRotateRoundTrip": {
    "rowReflectsNewTokenMs": 800,
    "oldTokenFlashPresent": false
  },
  "publisherRevokeRoundTrip": {
    "statusBadgeSwapMs": 700
  },
  "publisherAddRecipients": {
    "listUpdateMs": 1200,
    "maxInputsPerAction": 50
  },
  "publisherRemoveRecipient": {
    "listUpdateMs": 600
  },
  "publisherRepublish": {
    "snapshotBadgeSwapMs": 1000
  },
  "publisherConcurrentRotateReject": {
    "waitToastVisibleMs": 200
  },
  "publisherStressWorkspace": {
    "firstRowVisibleP95Ms": 1500,
    "sortRenderP95Ms": 300,
    "drawerOpenP95Ms": 600,
    "activityFeedP95Ms": 800,
    "roundTripsMax": 12
  }
}
```

### Extend `e2e/route-transition-performance.spec.ts`

Add Publisher test cases that reuse `collectRouteMetrics`, `emulateNetworkProfile`, and `attachMetrics`. Each test reads its budget from the extended JSON. Env-gated with `ARCHESTIMATOR_E2E_PUBLISHER=1` (matches doc 11 WP-1.8). Sketch:

- `test('publisher route entry meets first-row budget', ...)` — navigates to `/workshop/publisher`, measures NAV-01.
- `test('publisher deep-link with project filter', ...)` — measures NAV-02.
- `test('publisher drawer open budget', ...)` — clicks first row, measures NAV-05 via User Timing marks.
- `test('publisher filter switch budget', ...)` — clicks "Stale" tab, measures NAV-07.
- `test('publisher search budget', ...)` — types "villa", measures NAV-08.
- `test('publisher rotate round-trip', ...)` — forces mutation, measures NAV-11, asserts `oldTokenFlashPresent === false`.
- `test('publisher concurrent rotate reject', ...)` — dual sessions, measures NAV-17.
- `test('publisher slow 3g entry', ...)` — `emulateNetworkProfile(slow3g)`, measures NAV-03.

### User Timing API marker convention

Every Publisher component that participates in a navigation budget must emit `performance.mark()` and `performance.measure()` entries following this convention:

- `publisher:nav:start` — set on click/keystroke that begins a transition.
- `publisher:nav:end` — set when the target UI is interactive.
- `publisher:sort:start` / `publisher:sort:end` — around the application-layer sort.
- `publisher:render:start` / `publisher:render:end` — around the initial row render.
- `publisher:drawer:open` / `publisher:drawer:ready` / `publisher:drawer:close` — drawer lifecycle.
- `publisher:mutate:start` / `publisher:mutate:ack` / `publisher:mutate:revalidate` — server-action cycle.

Marks are emitted only when `process.env.NEXT_PUBLIC_PUBLISHER_PERF_MARKERS === '1'` (default off in production). Tests enable this flag. This avoids production perf overhead from the markers themselves.

---

## Bundle-size CI gate (G-PERF-05)

### Per-surface budgets

| Surface | First-load JS budget (gzipped) | Chunk budget | Notes |
|---|---|---|---|
| Roster page (`/workshop/publisher`) | < 80KB | n/a (RSC + client island) | Doc 09 PERF-02 |
| Roster client island (`PublisherRosterClient`) | < 25KB | n/a | Filter + search state only |
| Drawer chunk (lazy) | n/a | < 30KB gzipped | Must verify via build report |
| Drawer recipients sub-chunk | n/a | < 15KB gzipped | Includes `RecipientEmailComposer` |
| Drawer settings sub-chunk | n/a | < 10KB gzipped | Includes `SheetPickerList` |
| Activity feed chunk | n/a | < 12KB gzipped | Extends `SharedLinkActivityFeed` |

### CI gate implementation

WP-1.9 must add a script `scripts/check-publisher-bundle.mjs` that:

1. Runs `bun run build`.
2. Parses `.next/build-manifest.json` and `.next/app-build-manifest.json` for the `/workshop/publisher` route and the named lazy chunks.
3. Reads gzipped sizes from `.next/server/app/...` metadata.
4. Compares against the budgets above.
5. Exits non-zero on any overshoot.

This script is wired into `bun run validate` via package.json addition (or into CI directly via `.github/workflows/ci.yml`). The existing `lint:design` and `lint:design-system` scripts are the precedent for project-local enforcement scripts.

### Direct-import rule (react-performance `bundle-`)

All Publisher components must use direct imports from `src/components/ui/`, not barrel imports. Example: `import { Button } from '@/components/ui/Button'`, not `import { Button } from '@/components/ui'`. This is enforced by Next.js 16 Optimize Package Imports for listed packages, but manual enforcement is required for project-local barrels. The `lint:design-system` script may be extended to catch barrel imports, or a focused ESLint rule can be added in WP-1.9.

---

## Mapping to react-performance skill rules

The `react-performance` skill (Vercel Labs adaptation) organizes 70+ rules across 8 priority categories. Publisher implementation must apply these rules. This mapping is referenced from WP-1.4, WP-1.5, WP-2.1, WP-2.3.

| Publisher surface | react-performance rule | Why |
|---|---|---|
| Roster RSC page (`page.tsx`) | `async-cheap-conditions-before-await` | Check feature flag + session sync before awaiting roster fetch |
| Roster RSC page | `async-promise-all-for-independent-work` | Session + workspace summary + filter parse are independent |
| Roster RSC page | `server-parallel-through-composition` | Split activity feed into a child RSC so rows and feed render in parallel |
| Roster repository | `server-react-cache-for-per-request-deduplication` | Wrap `readWorkspacePublicationsRoster` in `cache()` so multiple RSC consumers share one query |
| Roster RSC → client island props | `server-minimize-data-passed-to-client-components` | Project only the roster columns the island needs; do not serialize the full publication summary |
| Roster client island | `rerender-start-transition-for-non-urgent-updates` | Filter tab switches wrapped in `startTransition` |
| Roster client island | `rerender-use-deferred-value-for-expensive-renders` | Search input uses `useDeferredValue` |
| Roster client island | `rerender-extract-expensive-work-into-memoized-components` | `PublisherRosterRow` is `memo()` with primitive deps |
| Roster client island | `rerender-hoist-default-non-primitive-props` | Empty filter arrays hoisted to module scope |
| Roster rows | `rendering-content-visibility-auto-for-long-lists` | `content-visibility: auto; contain-intrinsic-size: auto 60px` on each row |
| Drawer | `bundle-dynamic-imports-for-heavy-components` | `next/dynamic` with `{ ssr: false }` for drawer |
| Drawer tabs | `rendering-activity-for-show-hide` | React 19 `<Activity>` if available; else conditional render with state preserved in Zustand |
| Recipient composer | `server-authenticate-server-actions-like-api-routes` | Every manager action re-asserts RBAC server-side |
| Mutation cycle | `server-use-after-for-non-blocking-work` | Resend digest queue via `after()` |
| Search input | `rerender-functional-setstate-for-stable-callbacks` | Stable handlers passed to memoized children |
| Roster avatar stack | `rerender-subscribe-to-derived-booleans-not-raw-values` | "+N more" uses derived selector |
| Activity feed pagination | `client-deduplicate-global-event-listeners` | Scroll listener is singleton |
| Filter state | `rerender-derive-during-render-never-via-use-effect` | Filtered list computed in render, not effect-synced |

Each rule is a review checklist item for WP-1.5 and WP-2.1 code review.

---

## New requirements

These extend doc 04's PERF section. They are P1 (Phase 1 exit) unless noted.

### PERF-06 · Navigation timing matrix
- **Statement.** Every transition in the matrix above has a measured p95 within budget at Phase 1 exit.
- **Priority.** P1.
- **Acceptance.** Extended `route-transition-performance-budgets.json` + extended `route-transition-performance.spec.ts` run green with `ARCHESTIMATOR_E2E_PUBLISHER=1`.
- **Validation.** Playwright run captures metrics for NAV-01..NAV-22; all within budget.

### PERF-07 · Sort and render sub-budgets
- **Statement.** Roster first-paint budget broken into five sub-budgets (TTFB, transfer, hydration, sort, render) with measured actuals.
- **Priority.** P1.
- **Acceptance.** User Timing marks `publisher:sort` and `publisher:render` captured; sum < 1.1s p95.
- **Validation.** Playwright trace + PerformanceObserver assertion.

### PERF-08 · RSC streaming budget
- **Statement.** Activity feed inside `<Suspense>` paints within 500ms of roster rows; full page interactive < 1.5s p95.
- **Priority.** P1.
- **Acceptance.** Playwright assertion on first feed-row visibility.

### PERF-09 · Stress-test gate
- **Statement.** Seeded 50×5×10 workspace meets gate thresholds (roster p95 < 1.5s, sort+render p95 < 300ms, drawer p95 < 600ms, activity p95 < 800ms, round trips ≤ 12).
- **Priority.** P1 (Phase 1 exit requires one passing run).
- **Acceptance.** `scripts/seed-publisher-stress.mjs` + `e2e/publisher-stress.spec.ts` run green.
- **Escape valve.** If any threshold is missed, the corresponding Phase 5 RPC (P5-03 or P5-04) is promoted to Phase 2.

### PERF-10 · Bundle-size CI gate
- **Statement.** Every Publisher chunk is within the bundle budget above; CI fails on overshoot.
- **Priority.** P1.
- **Acceptance.** `scripts/check-publisher-bundle.mjs` exits 0; wired into CI.

### PERF-11 · User Timing markers
- **Statement.** Publisher components emit `performance.mark()` per the convention above when `NEXT_PUBLIC_PUBLISHER_PERF_MARKERS=1`.
- **Priority.** P1.
- **Acceptance.** Marker entries present in Playwright trace.

### PERF-12 · Old-token flash absence
- **Statement.** Rotate-token action (NAV-11) does not flash the old token in the UI during the revalidate cycle.
- **Priority.** P1.
- **Acceptance.** `oldTokenFlashPresent === false` in the budget JSON; Playwright screenshot diff or DOM-state assertion confirms.

### PERF-13 · Direct imports (no barrels)
- **Statement.** Publisher components use direct imports from `src/components/ui/*`, not barrel imports.
- **Priority.** P1.
- **Acceptance.** No barrel imports in `src/components/workshop/publisher/**`; verified by lint rule or review.

### PERF-14 · Concurrent mutation rejection latency
- **Statement.** D-ARCH-05/D-ARCH-06 reject paths surface wait toast within budget (NAV-17 < 200ms, NAV-18 < 100ms).
- **Priority.** P1.
- **Acceptance.** Dual-session Playwright test confirms toast timing.

---

## New work packages

### WP-1.9 · Benchmark harness extension
- **Task.** Extend `e2e/route-transition-performance-budgets.json` with Publisher keys; extend `e2e/route-transition-performance.spec.ts` with Publisher test cases; add `scripts/check-publisher-bundle.mjs`; wire both into CI.
- **Files.** `e2e/route-transition-performance-budgets.json` (EDIT), `e2e/route-transition-performance.spec.ts` (EDIT), `scripts/check-publisher-bundle.mjs` (NEW), `.github/workflows/ci.yml` (EDIT — add bundle gate step).
- **Tests.** The spec file is the test.
- **Complexity.** Medium.

### WP-1.10 · Stress-test seed and gate
- **Task.** Add `scripts/seed-publisher-stress.mjs`; add `e2e/publisher-stress.spec.ts`; document the gate thresholds; record one passing run in the plan's evidence folder.
- **Files.** `scripts/seed-publisher-stress.mjs` (NEW), `e2e/publisher-stress.spec.ts` (NEW, env-gated `ARCHESTIMATOR_E2E_PUBLISHER_STRESS=1`).
- **Complexity.** Medium.

### WP-1.11 · User Timing markers
- **Task.** Add `performance.mark()` calls to Publisher components behind `NEXT_PUBLIC_PUBLISHER_PERF_MARKERS=1`.
- **Files.** Publisher client components (EDIT during WP-1.5).
- **Complexity.** Small — folded into WP-1.5 implementation.

### WP-2.6 · Mutation budget verification
- **Task.** Extend `e2e/route-transition-performance.spec.ts` with mutation tests (NAV-11..NAV-16) once the drawer and actions land in Phase 2.
- **Files.** `e2e/route-transition-performance.spec.ts` (EDIT).
- **Complexity.** Medium.

---

## Updated acceptance criteria (Phase 1 exit)

Add to doc 11 §"Phase 1 acceptance criteria":

- All navigation matrix entries NAV-01..NAV-10, NAV-20..NAV-22 have measured p95 actuals within budget, captured in the Playwright run artifacts.
- Sort and render sub-budgets (PERF-07) are captured and sum < 1.1s p95.
- RSC streaming budget (PERF-08) is met; activity feed Suspense fallback visible < 500ms p95.
- Stress test (PERF-09) has one passing run with thresholds recorded; escape valves triggered or not, documented.
- Bundle CI gate (PERF-10) runs and passes on the Phase 1 PR.
- User Timing markers (PERF-11) visible in the Playwright trace with the flag on.
- Direct imports (PERF-13) verified by lint or review.

Phase 2 exit adds NAV-11..NAV-16, NAV-17..NAV-19 actuals.

---

## Validation evidence

Every navigation budget entry requires two artifacts, matching the `archestimator-plan-pack` completion contract:

1. **Playwright trace** — `testInfo.attach('route-metrics', ...)` JSON with `navigation`, `resources`, and User Timing measure entries.
2. **Budget JSON actuals** — the extended budget file augmented with a sibling `_actuals` file (e.g., `route-transition-performance-actuals-publisher-<date>.json`) recording measured p50/p95 against each budget key.

Both are committed to the plan pack's evidence folder (`.ai/03_plans/2026-06-25-Publisher-Page/evidence/`) at Phase 1 exit. This is additive; the evidence folder does not exist yet and is created by WP-1.9.

---

## CI integration

`.github/workflows/ci.yml` gains two new steps (added by WP-1.9):

1. **Bundle gate** — after `bun run build`, run `node scripts/check-publisher-bundle.mjs`. Fails the build on overshoot.
2. **Publisher perf** — in the existing Playwright job, add `ARCHESTIMATOR_E2E_PUBLISHER=1` to the env when running `bun run test:e2e -- route-transition-performance` so Publisher cases are included.

The stress test (`ARCHESTIMATOR_E2E_PUBLISHER_STRESS=1`) runs in a **separate nightly workflow** or on-demand. It is NOT in the per-PR critical path.

---

## Risks introduced by this addendum

| Risk | Mitigation |
|---|---|
| R-PERF-01. Perf markers leak to production | Gated behind `NEXT_PUBLIC_PUBLISHER_PERF_MARKERS` env flag, default off |
| R-PERF-02. Stress seed script pollutes a real Supabase project | Runs against local Postgres or a throwaway branch; never project `ebxxqidacheyapmmzavr` production data; script is cleanable and idempotent |
| R-PERF-03. Bundle gate false-positive when Next.js changes build-manifest shape | Script is defensive: missing keys warn, do not fail; only known overshoots fail |
| R-PERF-04. Navigation budgets set too tight, blocking Phase 1 exit | Budgets are targets with escape valves (PERF-09 → promote RPC; PERF-07 → move sort to SQL); if a target is genuinely unreachable with the current architecture, the addendum is revised, not the gate silently loosened |
| R-PERF-05. CI Playwright run slow due to added cases | Publisher cases env-gated; run only when `ARCHESTIMATOR_E2E_PUBLISHER=1`; default PR path unchanged |
| R-PERF-06. Concurrent-mutation test (NAV-17) flakes under real Supabase latency | Test uses dual Playwright contexts against the same seeded publication; accepts reject latency < 500ms as p95 fallback if the 200ms target is unstable on CI runners |

---

## Decisions recorded

- **D-PERF-01.** Budgets are targets with escape valves, not hard block gates, except PERF-10 (bundle size) and PERF-13 (direct imports), which are hard gates. Rationale: bundle and import discipline are cheap to enforce; latency targets depend on infrastructure outside the implementation's control.
- **D-PERF-02.** Reuse the existing `route-transition-performance-budgets.json` + `route-transition-performance.spec.ts` rather than forking Publisher-specific files. Rationale: ponytail T2.3 — one budget system, one perf spec, extended with namespaced keys.
- **D-PERF-03.** Stress test runs nightly/on-demand, not per-PR. Rationale: 250 publications × 2,500 recipients is too heavy for the per-PR critical path; the nightly signal is sufficient to trigger the escape valves.
- **D-PERF-04.** User Timing markers are env-flagged off in production. Rationale: markers have a small but real cost on every render; production uses RUM (Vercel Analytics) instead.

---

## Traceability

| Requirement | Work package | Test | Evidence |
|---|---|---|---|
| PERF-06 Navigation matrix | WP-1.9, WP-2.6 | Extended `route-transition-performance.spec.ts` | Playwright trace JSON |
| PERF-07 Sort/render sub-budgets | WP-1.11 (markers) + WP-1.9 (assertion) | Same spec, User Timing measure | `_actuals` JSON |
| PERF-08 RSC streaming | WP-1.9 | Same spec, Suspense timing | Playwright trace |
| PERF-09 Stress gate | WP-1.10 | `e2e/publisher-stress.spec.ts` | Evidence folder |
| PERF-10 Bundle CI gate | WP-1.9 | `scripts/check-publisher-bundle.mjs` | CI green |
| PERF-11 User Timing markers | WP-1.11 | Marker entries in trace | Playwright trace |
| PERF-12 Old-token flash absence | WP-2.6 | Same spec, NAV-11 case | Screenshot diff |
| PERF-13 Direct imports | WP-1.9 (lint rule) | Lint or review | Review note |
| PERF-14 Concurrent mutation reject latency | WP-2.6 | Same spec, NAV-17/18 cases | Playwright trace |

---

## Summary

This addendum converts doc 09's surface-level performance budgets into a **measurable navigation contract** with:

- 22 named transitions (NAV-01..NAV-22) each with a p95 target, measurement surface, and rationale.
- 9 new requirements (PERF-06..PERF-14).
- 3 new work packages (WP-1.9, WP-1.10, WP-1.11) + 1 Phase 2 package (WP-2.6).
- Extension of existing repo infrastructure (`route-transition-performance-budgets.json` + `route-transition-performance.spec.ts`), not parallel systems.
- Stress-test gate with defined escape valves (promote Phase 5 RPCs to Phase 2 if thresholds missed).
- Bundle CI gate with per-chunk budgets.
- Mapping to the `react-performance` skill so implementation and review share a vocabulary.

Every budget here is a **target with a TBD measurement slot**, not a claim. Phase 1 implementation captures actuals; if a target is missed, the cause is attributed before Phase 1 exit, not papered over.
