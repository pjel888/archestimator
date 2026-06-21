# 05 — Implementation Roadmap

**Sequencing principle:** blast-radius-ordered — lowest-risk, highest-leverage
first. Each phase is independently shippable and independently validatable.
Phases 1–3 attack the **visible** complaint (skeleton cascade + wrong skeleton);
phases 4–5 attack the **latency** complaint (TTFB/LCP); 6–8 are stretch/hygiene.

**This is a plan.** No code is written here. Each phase states what, why, blast
radius (from doc 14), the files, the validation (from doc 06/15), and risks.

> **Cross-cutting note (applies to every phase):** on **warm client-nav the
> layouts do not re-run** (`staleTimes.dynamic=60`, doc 12). So the owner's
> everyday "click into a sheet" experience is dominated by the **page waterfall
> (doc 11) + client second-phase (doc 13)**, not the layout awaits. The layout
> waterfall (Phase 5) only bites on fresh/F5/cross-project navigation. This
> justifies doing Phases 1–4 before 5.

---

## Phase 0 — Measurement baseline *(no code change)*

**What:** capture the authoritative numbers before touching anything.
**Why:** every later phase needs a before/after delta; the instrumentation exists.
**How:** owner runs (doc 15 §4): `PERF_TRACE=1 … bun run dev`, load the sheet,
grep `[perf-json]`; plus `bun run scripts/measure-route-transitions.ts` with
`HERO_ESTIMATE_NODE_ID=122c3bb3-…` for the skeleton-sequence + overlay-visibility
rate + soft-nav medians. **Critical addition (adversarial review Ch.3/5):**
(a) capture a **Vercel in-region** measurement (deploy + Speed Insights / a
`bench-hero-browser.mjs` run against `next start`) — the local numbers are
network-bound and the ROI of Phases 4–5 depends on the in-region magnitude;
(b) write the **two missing tests** (skeleton-sequence walk +
`cache()`-memoization assertion, doc 14) now — Phases 2/4 rely on them.
**Blast radius:** none (measurement); LOW (two additive tests).
**Validation:** baseline TTFB/FCP/LCP (local ~2/2.3/7.1 s; in-region unmeasured until Phase 0) +
per-span ms + the cascade overlay-visibility-per-hop + the two tests green.
**Risk:** none. **Do this first** so all later claims are grounded. **Hard stop:**
if in-region LCP is already <2.5 s, descope Phases 4a/5 to nice-to-have (adversarial Ch.3).

---

## Phase 1 — Add the missing leaf loading state *(LOW blast · HIGHEST leverage)*

**What:** create `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
that mirrors `EstimateWorkspaceClient`'s glass shell shape (reuse its layout
classes — same skeleton-mirror discipline as `workshop/loading.tsx`, doc 10).
**Why:** eliminates the headline visible defect — on client-nav the sheet falls
through to `estimates/loading.tsx` = `ProjectEstimatesListSkeleton` (a 12×8
**list** table for a route that renders no list). The team already anticipated
this fix in a code comment (`ProjectEstimatesListSkeleton.tsx:3-6`).
**Blast radius:** **LOW** — zero existing consumers; pure file addition (doc 14).
**Files:** new `estimates/[nodeId]/loading.tsx`; likely a new
`EstimateSheetSkeleton` component under `src/components/workshop/` (mirroring the
real sheet's tree + grid + right-rail layout).
**Validation:** doc 06 — client-nav list→sheet shows the sheet-shaped skeleton
(visual + a `measure-route-transitions.ts` run); `EstimateSheetSkeleton` layout
matches the hydrated page within CLS tolerance.
**Risk:** skeleton/real-page shape drift over time — mitigate by reusing the real
component's layout classes (the established pattern).
**Fixes:** Root cause B (doc 02). **Expected user impact:** the most visible win.

---

## Phase 2 — Stream the page tail behind `<Suspense>` *(LOW–MED blast)*

**What:** move Block 2 (`tabs ∥ canEditEstimate`, `estimates/[nodeId]/page.tsx:64-71`)
behind an in-page `<Suspense>` so first paint returns after Block 1 only. Copy
the `ProjectChromeAsync` discipline already used in the layout
(`[projectId]/layout.tsx:42-44`, doc 16).
**Why:** today the page is fully `await`-gated; the shell can't stream until both
blocks resolve. The `canEditEstimate` RPC and the tabs tail don't need to block
the sheet's tree/first paint.
**Blast radius:** LOW–MED — page-local; but `canEditEstimate` gates edit UI, so
the streamed fallback must render edit affordances as "loading" until resolved
(no incorrect enabled-state). Update the now-stale comment at `page.tsx:58-63`.
**Files:** `estimates/[nodeId]/page.tsx`; a new `EstimateTabsAsync`/equivalent
Suspense wrapper (mirrors `ProjectChromeAsync`).
**Validation:** doc 06 — `[perf-json]` trace logs show `workshop.estimate-sheet` resolving
before `workshop.estimate-sheet-tail`; FCP improves; edit buttons still gate
correctly (no flash of "editable" then "read-only" or vice versa).
**Risk:** **R3-vs-L4 conflict (doc 16):** there is a client-side TanStack Query
tab fetch that must not race the streamed server tabs. Resolve by making the
client query `initialData`-seeded from the server (the established no-double-fetch
pattern, doc 13) so the streamed tail only refills on the server.
**Fixes:** part of Root cause C. **Dependencies:** Phase 0 baseline.

---

## Phase 3 — Stream the component-library load; kill the 3rd skeleton *(MED blast)*

**What:** today `loadProjectComponentLibraryLite` (`actions.ts:426`) is fired by
a `useQuery` that lives **inside** the `next/dynamic` `EstimateSheetContent` chunk
(`EstimateWorkspaceClient.tsx:33-38`), so it can't start until that chunk
downloads+hydrates → a visible `ComponentLibrarySidebarFallback` skeleton (doc 13,
`EstimateSheetContent.tsx:3078`). Move the library fetch to a **parallel server
`<Suspense>` boundary** and seed the client via `initialData` (no re-gate of
first paint).
**Why:** eliminates the third distinct skeleton state and removes the
chunk→query waterfall. NOTE: the page comment (`page.tsx:33-35`) intentionally
defers the library out of Block 1 — so do **not** simply drop it into Block 1
(that re-gates first paint). Put it in its own streaming Suspense boundary so
the shell paints first and the library streams in (the `ProjectChromeAsync` model).
**Blast radius:** MED — touches the page + `EstimateWorkspaceClient` props + the
client query seeding. The `workspaceComponentLibraryLiteQueryKey` has the known
inline-literal consumer gotcha (doc 14 / [[workspace-component-library-key-inline-literal]]) — grep both symbol and literal.
**Files:** `estimates/[nodeId]/page.tsx`; `EstimateWorkspaceClient.tsx`;
`EstimateSheetContent.tsx` (the `useQuery` site).
**Validation:** doc 06 — `ComponentLibrarySidebarFallback` no longer renders on
the cold path; library `useQuery` is `initialData`-seeded (no client refetch);
`[perf-json]` trace logs show the library span streaming in parallel, not serial.
**Risk:** shifting cost server-side — measure (Phase 0) to confirm net LCP win.
**Fixes:** Root cause E. **Dependencies:** Phase 0; coordinate with Phase 2
(both add Suspense boundaries in the page).

---

## Phase 4 — Trim the server waterfall *(4b LOW first; 4a CONDITIONAL)*

**What (4b — do this):** L3 O3 — collapse the **double `workspace_members` read**
between `getProjectCollaborationSummary` and `getProjectPublicationSummary` behind
one shared `cache()` wrapper. Pure win, LOW risk.
**What (4a — DROPPED by default; resurrect only if both gates pass):** L2 OPP-1 —
make tab-rows parallel with tab-nodes by scoping rows per-tab. **Gates** (adversarial
Ch.4): (i) `estimate_row_items.estimate_tab_id` already exists (no migration), AND
(ii) Phase 0's `[perf-json]` proves the rows query is the dominant span. A migration
for one serial hop is a bad trade → if 4a needs a migration, spawn a separate
plan-pack ([[supabase-db-query-skips-migration-ledger]]) and get owner sign-off.
**Why:** cuts serial RTTs on the common path (the 5-RTT waterfall, doc 11).
**Blast radius:** 4b **LOW** (doc 12/14); 4a MED–HIGH/schema-dependent (deferred).
**Files:** `workspace-repository.ts` (4b: the two summary functions; 4a: the resolver).
**Validation:** doc 06 — `supabaseRoundTrips` in `[perf-json]` drops; query inventory
script confirms no new N+1; RLS + tree-load tests green.
**Fixes:** Root cause C (deeper). **Dependencies:** Phase 0 (in-region magnitude +
the dominant-span proof gates 4a).

---

## Phase 5 — Layout first-paint (fresh/cross-project nav only) *(HIGH blast)*

**What:** L3 O2 (MED) — defer `listMainSidebarFavoriteProjects` (a 3-query wave
in `WorkshopPageShell`) behind Suspense. L3 O1 (HIGH, **needs product sign-off**)
— stream the terms-acceptance gate.
**Why:** fresh/F5/cross-project nav runs 6 sequential layout hops before any HTML
(doc 12). **But** warm client-nav skips layouts entirely (Router Cache) — so this
phase is lower priority than 1–4 for the everyday experience.
**Blast radius:** HIGH — `WorkshopPageShell` has 11 route consumers + 5 tests; the
terms gate is auth-critical (doc 14).
**Files:** `workshop/layout.tsx`; `WorkshopPageShell.tsx`; the sidebar-favorites
fetch.
**Validation:** doc 06 — fresh-nav TTFB improves; warm-nav unchanged (cache);
terms-gate redirect still correct (watch the L3 side-flag: `src/proxy.ts` is not
named `middleware.ts`, so `AUTH_REQUEST_PATH_HEADER` may be unset — verify the
post-accept redirect target separately).
**Risk:** auth/terms-gate changes need product + security review.
**Fixes:** Root cause C (layout half). **Dependencies:** Phase 0.

---

## Phase 6 (stretch) — Shallow-skeleton scope + PPR

**What (6a):** R2 (doc 16) — scope `estimates/loading.tsx` (and the shallow
`workshop/loading.tsx` dashboard bento) so deep routes don't **inherit** the
list/dashboard skeletons during hard-load descent (use route groups). **What
(6b):** R6 — PPR / Cache Components for a static shell with streamed auth data.
**Why:** removes the hard-load cascade's loudest layers (the ~80–90-node
dashboard bento flashing for a deep sheet route).
**Blast radius:** 6a MED (shared loading files — doc 14); 6b **HIGH and deferred**
— PPR is stable in Next 16 but requires a repo-wide Cache Components migration
with changed caching-default blast radius (doc 16). Confirm the repo's Next
version first (**UNVERIFIED** — dev log showed Next 16.2.6, so 6b is feasible but
still a cross-cutting effort).
**Validation:** doc 06 — hard-load no longer shows the dashboard bento for deep
routes; PPR cache-hit metrics.
**Risk:** 6b is orthogonal to Phases 1–5 — keep it separate.

---

## Phase 7 (stretch) — Client code-split

**What:** L4 C2 — code-split `EstimateRightSidebar` (~4.3K LOC incl. trees) out of
the content chunk via `dynamic(... ssr:false)`, like the 4 interaction-gated
modals already are (doc 13).
**Why:** trims hydration cost (~13.8K LOC across 17 client modules hydrate today).
**Blast radius:** MED — component-local; verify the sidebar's SSR contribution to
LCP first (don't split something on the LCP path).
**Validation:** doc 06 — chunk size down; LCP not regressed; sidebar still
hydrates before first interaction.

---

## Phase 8 — Hygiene (non-blocking)

- **Tests (doc 14):** add the missing skeleton-sequence walk
  (`/workshop → /projects → /[projectId] → /estimates → /[nodeId]`) and a
  `cache()`-memoization assertion (the assumption Phases 2/4 rely on).
- **Realtime:** migrate the deprecated `send()` → `httpSend()` in
  `use-estimate-cursor-broadcast.ts:304` (doc 15); consider whether the cursor
  channel's on-mount websocket handshake (doc 13) belongs on the critical path.
- **Middleware flag (doc 12):** resolve `src/proxy.ts` vs `middleware.ts` naming
  so `AUTH_REQUEST_PATH_HEADER` is actually set.

---

## Suggested order & decision points for Philip

| # | Phase | Blast | Leverage | Owner decision needed? |
|---|-------|-------|----------|------------------------|
| 0 | Baseline measurement | none | enables all | just run it |
| 1 | Leaf `loading.tsx` | LOW | HIGH | approve (anticipated by team's own comment) |
| 2 | Stream page tail | LOW–MED | HIGH | approve (watch the tab-fetch race) |
| 3 | Stream library load | MED | HIGH | approve (chunk-literal gotcha) |
| 4 | Server waterfall (4b LOW; 4a schema-gated) | LOW→HIGH | MED | 4a needs schema check → maybe its own pack |
| 5 | Layout first-paint | HIGH | MED (fresh-nav only) | product sign-off (terms gate) |
| 6 | Skeleton scope / PPR | MED→HIGH | MED | defer; PPR = separate effort |
| 7 | Client code-split | MED | MED | approve after LCP check |
| 8 | Hygiene | LOW | LOW | bundle in |

**Expected end-state (Phases 0–3):** the wrong list-skeleton is gone (1), the
shell streams on Block 1 (2), and the third library skeleton is gone (3) → the
cascade collapses to at most one correct sheet-shaped skeleton + the
well-debounced overlay, and LCP drops because first paint is no longer gated on
the full page tail + chunk waterfall. Phases 4–5 then attack the remaining TTFB.
