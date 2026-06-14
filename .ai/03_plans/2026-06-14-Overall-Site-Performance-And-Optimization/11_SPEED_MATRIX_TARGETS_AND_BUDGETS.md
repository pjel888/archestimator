# 11 — Speed Matrix Targets & Budgets

**Status: AUDIT / PLANNING / READINESS ONLY**
**Date:** 2026-06-14
**Repo HEAD at capture:** `3070c46c`
**Owner:** Philip (philipjonlewis@gmail.com)
**Author agent:** Claude (Opus 4.8, 1M context)

> This doc does two things: (1) critiques **every existing budget** in
> `e2e/route-transition-performance-budgets.json` and labels it honestly, and (2) proposes
> **readiness budgets** in three tiers (SMOKE / CLOSED-BETA / PUBLIC-LAUNCH) per surface,
> stating which tier gates which launch decision. It is consistent with — and expands —
> `evidence/current-budgets.md`, which already drafts this split. The per-surface targets
> live in `03_ROUTE_SPEED_MATRIX.md` (tiers A–E). No source/config files were changed.

---

## 1. The core distinction

The existing JSON is a **smoke** file: it answers "did the page basically work?" not "is this
fast enough to ship?". A passing smoke run must never be read as "ready". We therefore split
budgets into **three tiers**, each gating a different decision:

| Tier | Gates | Source of truth | Status today |
|------|-------|-----------------|--------------|
| **SMOKE** | CI / pre-merge regression catch | the current JSON (relabeled `*_smoke`) | exists; loose by design |
| **CLOSED-BETA** | closed-beta go/no-go | new `route-transition-readiness-budgets.json` (not yet created — planning) | **proposed here**; some rows are gaps today |
| **PUBLIC-LAUNCH** | public launch go/no-go | production RUM (p75) | **blocked** — `@vercel/speed-insights` absent (AS01/CR07/RT09/INV04/DB09) |

The single most important rule: **do not loosen the smoke file, and do not tighten it
either.** Keep it as the catastrophic-regression net, relabel its intent, and put the real
bars in a separate readiness file so nobody confuses the two. This is registry finding
**TG01** (High/Verified): "Published route-transition budgets are loose smoke thresholds, not
readiness budgets, yet the readiness checker defaults to them."

---

## 2. Critique of EACH existing budget

Source: `e2e/route-transition-performance-budgets.json`, consumed by
`e2e/route-transition-performance.spec.ts` and `scripts/check-route-transition-readiness.ts`.
Verdicts cross-checked against `evidence/current-budgets.md`.

| Budget key | Current value | What it gates | Critique | Verdict |
|------------|---------------|---------------|----------|---------|
| `publicRoute.navigationDurationMs` | **15000** | public page nav duration | Observed real public nav is ~179–394ms (no-throttle). 15000ms would pass a catastrophically broken page; it catches only total failure. ~40–80× looser than reality. | **Legacy smoke budget, not a readiness budget** |
| `publicRoute.resourceCount` / `scriptCount` / `nextAssetCount` | **250 / 120 / 160** | resource counts on public route | Counts, not weight or timing. 120 scripts is far beyond a healthy public-LCP profile; a page can hit these caps and still be slow, or be fast and fail them. No byte signal (BN-04 blocked). | **Legacy smoke budget, not a readiness budget** |
| `protectedRedirect.navigationDurationMs` | **15000** (+ `overlayCount: 0`) | unauth → /login redirect | A redirect should be < 400ms; 15000ms is meaningless as a target. **Keep `overlayCount: 0`** — it asserts no loading overlay flashes during the bounce, which is real signal. | **Legacy smoke budget, not a readiness budget** — *keep `overlayCount: 0`* |
| `slow3gPublicRoute.navigationDurationMs` | **30000** | public route on Slow-3G | Observed Slow-3G public is 834–6893ms. 30000ms is "did it ever finish", not a UX bar. | **Legacy smoke budget, not a readiness budget** |
| `slow3gPublicRouteTransition.medianTransitionMs` | **30000** (+ `overlayVisibilityRateMax: 1`) | Slow-3G Link transition | Same 30s problem. `overlayVisibilityRateMax: 1` means "overlay always allowed" → not a constraint at all on Slow-3G (intentional, since the overlay is the honest UX there). | **Legacy smoke budget, not a readiness budget** |
| `publicRouteTransition.medianTransitionMs` | **15000** (+ `overlayVisibilityRateMax: 1`) | warm public Link transition | Observed warm medians ~180–400ms; budget is ~40–80× too loose. On a *warm* transition the overlay should rarely show, so a max-rate of 1 is also too permissive here (tighten in readiness tier). | **Legacy smoke budget, not a readiness budget** |
| `bfcache.backForwardRestoreMs` | **1500** (+ `overlayCount: 0`) | back/forward restore | A true bfcache restore is < 100ms; a warm (non-bfcache) restore < 300ms. 1500ms hides real regressions and would "pass" even when bfcache is fully broken (which it may be — bfcacheScore 0, INV09). **Keep `overlayCount: 0`** — an overlay during restore is always a bug. | **Legacy smoke budget, not a readiness budget** — *keep `overlayCount: 0`* |
| `authenticatedWorkshopTransition.transitionMs` | **10000** (+ `prefetchRscRequestMin: 1`, `overlayCount: 0`) | authed sidebar nav | Observed authed no-throttle medians ~1857–2725ms; 10000ms never trips. **Keep both assertions**: `prefetchRscRequestMin: 1` proves prefetch actually fired (correctness, not speed), and `overlayCount: 0` proves no overlay flash on warm nav. These carry real signal even though the ms threshold does not. | **Legacy smoke budget, not a readiness budget** — *keep `prefetchRscRequestMin: 1` and `overlayCount: 0`* |

**Headline (per TG01):** every numeric millisecond/count threshold in this file is a
**regression smoke catcher**, not a readiness bar, and none is wired to a launch decision.
The non-numeric assertions — **`overlayCount: 0`** (protectedRedirect, bfcache, authed) and
**`prefetchRscRequestMin: 1`** (authed) — are the only parts that carry readiness signal and
**must be preserved verbatim** in the SMOKE tier.

### 2.1 Assertions to preserve (the signal inside the smoke file)

| Assertion | Where | Why it carries signal |
|-----------|-------|-----------------------|
| `overlayCount: 0` | protectedRedirect, bfcache, authenticatedWorkshopTransition | A loading overlay flashing during a redirect, a bfcache restore, or a warm authed nav is *always* a UX bug regardless of timing. Correctness gate, keep. |
| `prefetchRscRequestMin: 1` | authenticatedWorkshopTransition | Proves the prefetch path actually issued ≥1 RSC request — i.e. the route-transition prefetch infra (INV11, landed) is wired and firing. A timing budget can't prove this; keep. |
| `overlayVisibilityRateMax: 1` | slow3gPublicRouteTransition | Intentionally permissive on Slow-3G (overlay is the honest UX there). Keep at 1 in SMOKE; tighten only for warm transitions in readiness. |

---

## 3. Proposed readiness budgets (three tiers, per surface)

Tiers map to the speed tiers A–E in `03_ROUTE_SPEED_MATRIX.md` and to captured evidence.
**SMOKE** keeps the current loose numbers (rename only). **CLOSED-BETA** is the bar this
audit gates against. **PUBLIC-LAUNCH** requires production RUM (p75) proof, not lab.

> Legend for "Current": **observed** = evidence artifact; **blocked** = measurement
> prevented this session; **gap** = observed worse than the CLOSED-BETA bar.

| Surface | Metric | SMOKE (keep, relabel) | CLOSED-BETA target | PUBLIC-LAUNCH target | Current |
|---------|--------|------------------------|--------------------|-----------------------|---------|
| Public landing `/` | LCP (lab, no-throttle) | (none) | **≤ 2500ms** | ≤ 2000ms p75 RUM | **blocked** (no fresh public Lighthouse, BN-04) |
| Public landing `/` | TBT | (none) | **≤ 250ms** | ≤ 200ms p75 (INP) | blocked |
| Public landing `/` | first-load JS | `scriptCount ≤ 120` (smoke) | **byte budget set from treemap** (BN-04) | bytes held p75 | blocked — `JS Budget: TBD-treemap` |
| Public → public Link (warm) | median | `< 15000` | **< 300ms** | < 250ms p75 RUM | observed ~179–394ms ✓ (warm) |
| Public route (Slow-3G) | median | `< 30000` | **< 3000ms** | < 3000ms p75 | **gap** — observed up to 6893ms |
| Unauth → /login redirect | median (+ overlayCount 0) | `< 15000` (overlay 0) | **< 400ms** (overlay 0) | < 300ms (overlay 0) | blocked (no fresh timing) |
| bfcache back/forward | restore (+ overlayCount 0) | `< 1500` (overlay 0) | **< 300ms + DevTools "restored from bfcache" proof** | < 100ms p75 | **blocked/inconclusive** — bfcacheScore 0 (INV09) |
| Authed sidebar nav (warm) | median (+ rsc≥1, overlay 0) | `< 10000` (rsc≥1, overlay 0) | **< 800ms** (rsc≥1, overlay 0) | < 500ms p75 (INP-adjacent) | observed ~1857–2725ms family → **gap to 800ms** |
| `/workshop` homebase | shell paint | (none) | **< 300ms shell** | RUM p75 | blocked |
| `/workshop/projects` (cold) | LCP (authed lab) | (none) | **≤ 3000ms** | ≤ 2500ms p75 RUM | **gap** — observed **3865ms** |
| `/workshop/projects` (Slow-3G) | median | `< 30000` (smoke shares public) | **< 5000ms** | RUM-proven | **gap** — observed 6941ms |
| Project detail `[projectId]` | shell paint | (none) | **< 300ms shell** (don't block on title) | RUM p75 | blocked (RT02: title await blocks today) |
| Estimates list `…/estimates` | shell / data | (none) | **shell < 300ms; data < 1500ms cold** | RUM p75 | blocked |
| Estimate editor `[nodeId]` | shell paint | (none) | **< 300ms shell** (add loading.tsx) | RUM p75 | blocked — **no editor Lighthouse/treemap (BN-07)** |
| Estimate editor `[nodeId]` | entry-chunk JS | (none) | **byte budget from treemap (BN-07)** | held p75 | blocked — `TBD-treemap` |
| Estimate cell edit / tree click | INP | (none) | **< 200ms** (Profiler) | < 200ms p75 RUM | **blocked/unmeasured** (CR01/CR03) |
| Charts (cold) | data ready | (none) | **< 1500ms** (buckets RPC wired) | RUM-proven | blocked; RPC unwired (DB02/RLS09) |
| `/workshop/library` (cold) | data ready | (none) | **< 1500ms cold** (loader request-cached) | RUM p75 | observed 2675ms no-throttle → **gap to warm bar** |
| `/workshop/library` (Slow-3G) | median | `< 30000` | **< 5000ms** | RUM-proven | **gap** — observed 6748ms |
| `/workshop/templates` (Slow-3G) | median | `< 30000` | **< 5000ms** | RUM-proven | **gap** — observed 5864ms |
| `/workshop/settings` (Slow-3G) | median | `< 30000` | **< 5000ms** | RUM-proven | **gap** — observed **11963ms (2.4×)** |
| Excel export | first feedback + progress | (none) | **< 200ms feedback + progress state** | same | blocked (no timed export); INV12/DB05 verified |
| AI routes | first feedback | (none) | **< 200ms ack + streaming** | same | flag-gated/deferred → **not a beta gate** |
| INP (all interactive surfaces) | p75 | (none) | **< 200ms** | < 200ms p75 RUM | **unmeasured everywhere** |

---

## 4. Which tier gates which launch decision

### 4.1 SMOKE → CI / pre-merge (block catastrophic regressions only)

- **What it gates:** every merge / CI run. Purpose is to catch a page that went from working
  to broken, nothing more.
- **Action:** keep the current `e2e/route-transition-performance-budgets.json` numbers
  exactly as-is; relabel each key's *intent* as `*_smoke` in-doc (and in a follow-up,
  rename in the file with a top-level `"_purpose": "legacy smoke budget, not readiness"`).
- **Must preserve:** `overlayCount: 0` and `prefetchRscRequestMin: 1` and
  `overlayVisibilityRateMax: 1` (Slow-3G) — these are the only readiness-bearing parts.
- **A passing smoke run does NOT imply readiness.** State this in the spec header.

### 4.2 CLOSED-BETA → closed-beta go/no-go (the bar THIS audit gates against)

- **What it gates:** the decision to invite real beta users.
- **Source:** a **new** `route-transition-readiness-budgets.json` holding the CLOSED-BETA
  column above (do **not** put these in the smoke file). Backlog item (see
  `12_OPTIMIZATION_BACKLOG.md`, P0).
- **Open gaps that block closed-beta today** (observed worse than the bar):
  1. `/workshop/settings` Slow-3G **11963ms** vs ≤5000ms — worst breach (2.4×).
  2. `/workshop/projects` authed **LCP 3865ms** vs ≤3000ms; Slow-3G 6941ms vs ≤5000ms.
  3. `/workshop/library` Slow-3G 6748ms; `/workshop/templates` Slow-3G 5864ms vs ≤5000ms.
  4. Public Slow-3G up to 6893ms vs ≤3000ms (bundle-trim dependent: BN-01/02/03/08, BN-04).
  5. **INP unmeasured** on every interactive surface → cannot certify any Tier A row.
- **Blocked-not-gap rows** (no evidence either way) must be **measured before** the go/no-go,
  not assumed pass: estimate editor (BN-07), charts (DB02 RPC wiring), bfcache (RT07),
  `/login` post-INV01, all `JS Budget: TBD-treemap` rows (BN-04).

### 4.3 PUBLIC-LAUNCH → public launch go/no-go (requires field RUM)

- **What it gates:** opening to the public.
- **Hard prerequisite:** production **field RUM** (Vercel Speed Insights or equivalent),
  which is **NOT wired** — `@vercel/speed-insights` is absent from `package.json`; only
  `@vercel/analytics` (Web Analytics) is present. This is asserted five times in the registry
  (AS01, CR07, RT09, INV04, DB09 — all Verified). **No p75 PUBLIC-LAUNCH budget is provable
  until RUM exists.**
- This is a **launch blocker, not a beta blocker** — closed-beta can proceed on lab evidence;
  public launch cannot.

---

## 5. Recommended actions (consistent with `evidence/current-budgets.md` §4)

1. **Relabel, don't loosen.** Mark the smoke file's intent as `*_smoke` and add a separate
   `route-transition-readiness-budgets.json` for the CLOSED-BETA tier. Never relax the smoke
   numbers; never put readiness numbers in the smoke file. (P0 backlog.)
2. **Preserve the signal-bearing assertions** verbatim: `overlayCount: 0` (×3) and
   `prefetchRscRequestMin: 1`. Optionally tighten `overlayVisibilityRateMax` for *warm*
   public transitions in the readiness tier only.
3. **Wire production RUM** (Speed Insights) before adopting any PUBLIC-LAUNCH p75 budget —
   it is the gate for the entire launch tier (AS01).
4. **Set the `TBD-treemap` byte budgets** from a committed `ANALYZE=true bunx next build
   --webpack` treemap (BN-04) — this un-blocks the JS-budget rows for `/` and the editor.
5. **Capture the two missing Lighthouse runs**: fresh **public** Lighthouse (BN-04) and the
   **estimate-editor** authed Lighthouse (BN-07) — both are blocked and both gate CLOSED-BETA.
6. Track each gap in §4.2 as an explicit closed-beta blocker in
   `15_READINESS_DECISION.md`; do not mark any `blocked` row as passing without measurement.

---

## 6. Consistency note

This doc is the authoritative budget critique + tiered-budget proposal. It **expands**
`evidence/current-budgets.md` (which drafted the same three-tier split and §1 critique table)
and is the budget counterpart to the per-surface targets in `03_ROUTE_SPEED_MATRIX.md`. Any
divergence between the three should be reconciled in favor of: (a) captured evidence first,
(b) this doc's tier bars second, (c) the smoke file's loose numbers only as the regression
net. Language discipline (`observed`/`verified`/`likely`/`unknown`/`blocked`) is enforced
throughout: no readiness claim without live or prod-like proof.
