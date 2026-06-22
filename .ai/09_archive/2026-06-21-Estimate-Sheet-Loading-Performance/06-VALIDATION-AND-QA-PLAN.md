# 06 — Validation & QA Plan

**Principle:** every phase ships with the **narrowest evidence that proves it**
(doc 15 has the instruments; doc 14 has the test gaps). Proportional to blast
radius (per `VALIDATION_MATRIX.md`). No phase is "done" on a self-report.

## Instruments (already in the repo — reuse)

| Instrument | What it proves | When |
|------------|----------------|------|
| `PERF_TRACE=1` + `[perf-json]` log (`src/lib/perf/server-timing.ts`) | per-span server timings + `supabaseRoundTrips` count | every phase touching the server |
| `scripts/measure-route-transitions.ts` | per-hop soft-nav median ms, overlay-visibility rate, RSC request count | skeleton/nav phases |
| `scripts/bench-hero-browser.mjs` (real browser, `next start`) | production soft-nav timings | final confirmation (not `next dev`) |
| Vercel Speed Insights vitals (already shipping) | real-user TTFB/FCP/LCP/INP/CLS | prod truth (the LCP 7.1 s came from here) |
| `scripts/build-performance-query-inventory.ts` | query inventory / N+1 guard | Phase 4 |
| Existing vitest suites | no regressions in shared symbols | every phase |

## Per-phase validation

**Phase 0 (baseline):** record TTFB/FCP/LCP + per-span `[perf-json]` +
overlay-visibility-per-hop. **Pass = numbers captured and stored in-pack.**

**Phase 1 (leaf loading):**
- Visual: client-nav list→sheet shows a **sheet-shaped** skeleton (not the 12×8 list grid).
- `measure-route-transitions.ts`: the "Estimates → Target Estimate" step's skeleton is the new one.
- CLS: new skeleton ↔ hydrated page within tolerance (reuse real component's layout classes).
- **Pass = wrong list-skeleton no longer renders on the sheet route.**

**Phase 2 (stream page tail):**
- `[perf-json]`: `workshop.estimate-sheet` resolves **before** `workshop.estimate-sheet-tail`.
- FCP improves vs Phase 0 baseline.
- **Edit-affordance correctness:** `canEditEstimate` streamed tail must not produce a flash of wrong edit state — assert the fallback renders edit controls as "loading", and the resolved state matches the non-streamed behavior. (R3-vs-L4 race — doc 16.)
- Update the stale comment at `page.tsx:58-63`.
- **Pass = first paint precedes the tail; edit gating unchanged.**

**Phase 3 (stream library):**
- `ComponentLibrarySidebarFallback` no longer renders on the cold path.
- The library `useQuery` is `initialData`-seeded from the server → **no client refetch** (no double-fetch — preserves the doc-13 invariant).
- Grep both the symbol **and** the inline literal `["workspace-component-library"]` (doc 14 / [[workspace-component-library-key-inline-literal]]) to confirm no cache-key bleed.
- `[perf-json]`: library span streams in parallel, not serial with Block 1.
- **Pass = third skeleton gone; library hydrates from server seed.**

**Phase 4 (server waterfall):**
- `[perf-json]` `supabaseRoundTrips` drops (4a removes a serial hop; 4b dedupes a double read).
- `build-performance-query-inventory.ts`: no new N+1.
- Tree-load tests + RLS tests green.
- **4a gate:** schema check for `estimate_row_items.estimate_tab_id` **before** implementing; if a migration is needed → separate plan pack ([[supabase-db-query-skips-migration-ledger]]).
- **Pass = fewer serial RTTs, no query regression.**

**Phase 5 (layout first-paint):**
- Fresh-nav (F5) TTFB improves; **warm-nav unchanged** (Router Cache still serves layouts — assert no regression in soft-nav medians).
- Terms-gate redirect still correct (and resolve the `src/proxy.ts`/`middleware.ts` naming flag — doc 12 — so `AUTH_REQUEST_PATH_HEADER` is actually set).
- `WorkshopPageShell`'s 11 consumers + 5 tests green.
- **Pass = fresh-nav faster, warm-nav + auth unaffected.**

**Phase 6 (skeleton scope / PPR):** hard-load no longer shows the dashboard bento for deep routes; PPR cache-hit metrics (if 6b). Cross-route visual sweep (the shared loading files affect other routes — doc 14).

**Phase 7 (client code-split):** chunk size down; **LCP not regressed** (don't split an LCP element); sidebar hydrates before first interaction.

**Phase 8 (hygiene):** skeleton-sequence test + `cache()`-memoization test added and green; deprecated `send()` migrated.

## Release gate (before declaring the symptom fixed)

1. `PERF_TRACE=1` `[perf-json]` shows the expected span/streaming shape.
2. `measure-route-transitions.ts` overlay-visibility-per-hop dropped on the sheet step.
3. `bench-hero-browser.mjs` (production, real browser) sheet-step median improved vs baseline.
4. Vercel Speed Insights (in-region, after deploy) shows LCP improvement — **this is the production truth**, not the local dev number.
5. Shared-symbol test suites green; no new console errors (e.g. the Realtime `send()` warnings unless intentionally deferred).

## What "done" is NOT

- Not a green local `next dev` run alone (compilation-dominated, network-bound — doc 15).
- Not a single skeleton changed without the sequence test (doc 14 gap).
- Not a TTFB claim without the in-region Vercel number (doc 15 caveat).
