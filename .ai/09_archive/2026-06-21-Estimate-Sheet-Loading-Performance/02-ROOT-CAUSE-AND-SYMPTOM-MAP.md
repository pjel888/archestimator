# 02 — Root Cause & Symptom Map

**Synthesized from:** L1 (cascade), L2 (server waterfall), L5 (blast radius),
L6 (measurements), L7 (best practices), plus lead's direct reads of the layouts
and page. L3 (layouts/caching) and L4 (client hydration) cross-check the
layout and client sections — their docs carry the per-line detail.

## The symptom (owner's words)

> *"all the loading skeleton of all the pages before I get to the estimate sheet
> is being shown — bad practice AND slow."*

This decomposes into **two distinct complaints** that happen to share a surface,
and each has an independent root cause:

- **"all the loading skeletons … is being shown"** → a **skeleton-cascade / wrong-skeleton** UX defect.
- **"slow"** → a **server-critical-path + client-second-phase** latency defect.

Measured (L6, owner's own browser session, local dev): **TTFB ≈ 2.0–2.2 s,
FCP ≈ 2.3 s, LCP ≈ 7.1 s** (network-bound; re-measure on Vercel).

---

## Root cause A — The skeleton cascade (the "all skeletons flash" part)

**Mechanism:** the route to the sheet,
`/workshop/projects/[projectId]/estimates/[nodeId]`, passes through **four
nested route-level `loading.tsx` files** plus **two in-layout `<Suspense>`
fallbacks** = **six stacked skeleton boundaries**, and the **heaviest skeleton
sits at the shallowest segment**.

| # | Boundary | Source | Fallback | Weight | file:line |
|---|----------|--------|----------|--------|-----------|
| 1 | `/workshop` | loading.tsx | full **dashboard bento** | ~80–90 Skeleton nodes | `workshop/loading.tsx` |
| 2 | `/workshop/projects` | loading.tsx | ProjectsList (8 cards) | ~68 nodes | `projects/loading.tsx` |
| 3 | `/workshop/projects/[projectId]` | loading.tsx | ProjectDashboard sidebar | ~5 nodes | `[projectId]/loading.tsx` |
| — | (in-layout) | `<Suspense>` | `ProjectHeaderChromeSkeleton` | ~4 nodes | `[projectId]/layout.tsx:42` |
| — | (in-layout) | `<Suspense>` | `ProjectRouteContentFallback` | ~5 nodes | `[projectId]/layout.tsx:51` |
| 4 | `/workshop/projects/[projectId]/estimates` | loading.tsx | **ProjectEstimatesListSkeleton** (12×8 list table) | ~101 nodes | `estimates/loading.tsx` |
| 5 | `…/estimates/[nodeId]` | **(ABSENT)** | — falls through to #4 | — | — |

On a **hard navigation** (F5 / first visit / external link), React streams the
route from the root: the **shallowest** unresolved Suspense fallback paints
first (the full dashboard bento from `/workshop/loading.tsx`), then resolves
level-by-level as each async layout/page completes. The user literally watches
dashboard → projects → project → estimates-list skeletons replace each other
before the sheet appears. **This is the "all skeletons flash" mechanism.**

(Evidence: L1 doc; framework streaming semantics. Empirical check for L6/owner:
run `measure-route-transitions.ts` and watch the overlay-visibility rate per
hop.)

## Root cause B — The mismatched skeleton (the "wrong skeleton" part)

**Mechanism:** the leaf segment `estimates/[nodeId]` (the actual sheet) **has no
`loading.tsx`** (dir contains only `page.tsx` + `error.tsx`). On a **client-side
navigation** (clicking the estimate from the list), App Router uses the **nearest
ancestor** loading file as the Suspense fallback → `estimates/loading.tsx` →
`ProjectEstimatesListSkeleton`, which renders a **search bar + a 12-row × 8-column
list table** — the skeleton for the *estimates list page*, not a sheet. A route
that renders no list shows a list skeleton while it loads. This is the
"wrong/primitive skeleton" half of the complaint, and it stays up for the whole
slow transition (Root cause C).

The fix is the **lowest-risk, highest-leverage** change in the whole audit: add
`estimates/[nodeId]/loading.tsx` mirroring the glass sheet shell. **Zero existing
consumers** (pure addition) — L5.

## Root cause C — The await-gated server path (the "slow" part, server side)

The sheet can't stream until the server resolves a chain of awaits. Two layers:

1. **Async layouts block first paint.**
   - `workshop/layout.tsx`: `await getCurrentUserContext()` → `await getCurrentUserTermsAcceptanceStatus(userId)` (**sequential** — terms needs userId) — `workshop/layout.tsx:25,28`.
   - `[projectId]/layout.tsx`: `await getCurrentWorkspaceProject(projectId)` — `[projectId]/layout.tsx:22`.
   (L3 documents which of these re-run on client nav vs are preserved, and the `cache()` dedupe.)

2. **The page itself is fully `await`-gated with two sequential blocks.**
   - **Block 1** (`estimates/[nodeId]/page.tsx:36-41`): `Promise.all(resolveEstimateTabRouteContext ∥ requireCurrentUserContext)`.
   - **Block 2** (`page.tsx:64-71`): `Promise.all(tabs ∥ canEditEstimate)` — runs **after** Block 1 because `canEditEstimate` needs `estimate.id`.

   Inside `resolveEstimateTabRouteContext` (L2): ~4 serial Supabase round-trips —
   `estimate_nodes+estimates` join → `tab nodes (LIMIT 1500+1)` →
   `tab rows .in(node_id, LIMIT 5000+1)`, plus a parallel workspace/auth lookup.
   Block 2 adds the `can_edit_estimate` RPC (tabs short-circuit — already attached).

   **Total ≈ 5 serial RTTs on the common path.** At dev→hosted-Supabase RTT that's
   the ~2 s TTFB (L6). In-region (Vercel) each hop is single-digit ms, so the
   *structural* waterfall is the lever, not the network. **No N+1, no RLS loop**
   (one bounded nodes query + one `.in(node_id)` rows query + one RPC) — L2.

   The first paint is gated on **all** of this because nothing is streamed behind a
   Suspense boundary in the page (contrast with the gold-standard
   `ProjectChromeAsync` already used in the layout at `[projectId]/layout.tsx:42-44`
   — L7).

## Root cause D — The global `RouteLoadingOverlay` (compounding UX)

Every client-side navigation sets `isNavigating` in `navigation-ui-store`, which
`RouteLoadingOverlay` (`src/components/ui/route-loading-overlay.tsx:14-50`) uses
to portal a **full-screen `bg-white/25 backdrop-blur-md` + large Spinner** and set
`aria-hidden="true"` on the workshop shell for the **entire** transition. So a
single client-nav to the sheet stacks: the full-screen spinner **on top of** the
mismatched list skeleton (Root cause B), both visible through the blur, for the
whole ~seconds-long wait (Root cause C). The overlay is the
`[data-route-overlay]` element the bench harness keys on (L6).

## Root cause E — Client second phase (the "slow" part, after first paint)

After the server streams the shell, `EstimateWorkspaceClient` (glass variant)
hydrates and begins a **second loading phase** (doc 13). The structural waterfall
is **not** a query-on-query `enabled` chain (none exists, and there's **no
double-fetch** — the server passes tree/tabs/canEdit/user as props and the client
queries are `initialData`-seeded, `refetchOnMount:false`, `staleTime:5min`). It is
at the **dynamic-import layer**: the lazy library `useQuery`
(`loadProjectComponentLibraryLite`, `actions.ts:426`) lives **inside** the
`next/dynamic` `EstimateSheetContent` chunk
(`EstimateWorkspaceClient.tsx:33-38`), so it cannot even start until that chunk
downloads and hydrates → a visible **third** skeleton
(`ComponentLibrarySidebarFallback`, `EstimateSheetContent.tsx:3078`). A Supabase
Realtime cursor channel also opens on mount (`use-estimate-cursor-broadcast.ts:36-53`),
adding a websocket handshake to the critical path. This second phase is the gap
between FCP (2.3 s) and LCP (7.1 s) in L6's measurements. ~13.8K LOC across 17
client modules hydrate; heaviest are `EstimateSheetContent` (3134 LOC),
`EstimateRightSidebar`/component-library (2586), `EstimateSheetTree` (1595),
`activity-history` (1708).

## Refinement (L3) — which causes bite on which navigation mode

L3's key nuance: on **warm client-nav** the layouts are **Router-Cached for 60 s**
(`next.config.ts:90-93`, `experimental.staleTimes.dynamic=60`), so the layout
waterfall (Root cause C's layout half) **does not re-run** on the owner's everyday
"click into a sheet" — only the page waterfall + client second-phase run, masked
by the wrong list-skeleton (B) and the >150 ms overlay (D). The layout waterfall
only bites on **fresh/F5/cross-project** navigation. So:
- **Everyday client-nav:** B + C(page) + D + E dominate. → Phases 1–4 of the roadmap.
- **Fresh/F5 nav:** A + C(layout+page) + D + E — the full cascade. → adds Phase 5.

This is why the roadmap (doc 05) does Phases 1–4 before the higher-blast Phase 5.

---

## Symptom → Root cause → Evidence map

| Owner-perceived symptom | Root cause | Primary evidence |
|---|---|---|
| "all the loading skeletons shown" (hard nav) | A — 6 stacked boundaries, heaviest first | L1 doc; the 4 `loading.tsx` files + 2 in-layout Suspense |
| "wrong / primitive skeleton" (client nav) | B — missing `[nodeId]/loading.tsx`, falls to list skeleton | L1 + L5; `estimates/[nodeId]/` has only page+error |
| "full-screen spinner for ages" | D — global `RouteLoadingOverlay` | `route-loading-overlay.tsx:14-50` |
| "slow to first content" | C — await-gated layouts + page | L2; TTFB ≈ 2 s (L6) |
| "slow to fully load" | C + E — server waterfall + client second phase | L2 + L4; LCP ≈ 7.1 s (L6) |

## What is NOT the cause (rule-outs — save the roadmap from chasing ghosts)

- **Not a prefetch gap.** The sheet link already prefetches on hover/focus via
  `usePrefetchOnHover` (`ProjectEstimatesTable.tsx:5,1087,1100`); `<Link prefetch={false}>`
  is a deliberate "don't prefetch every visible link on viewport" choice (L7 + lead verify).
- **Not an N+1 / RLS loop.** Tree load is one bounded nodes query + one `.in(node_id)` rows query; edit capability is one RPC (L2).
- **Not layout instability.** CLS is 0.0004–0.0069 — the skeleton-mirror work is doing its job (L6).
- **Not a broken import.** The dev-log "module has no exports" error was transient Turbopack HMR noise; `actions.ts:2522` exports `updateEstimateRowItem` and the import resolves (L6, verified).
- **Not the glass redesign.** Glass is scoped and shipped; this audit is orthogonal ([[glass-estimate-sheet-redesign]]).

## The one-sentence root cause

> The Estimate Sheet is slow to *show* because a fully `await`-gated server path
> (async layouts + a 5-RTT page waterfall) blocks first paint, and it *feels*
> even slower because six stacked skeletons (with the heaviest — a full dashboard
> bento — at the shallowest segment), a missing leaf loading file that falls
> through to the wrong list skeleton, and a full-screen transition overlay all
> flash in sequence over the multi-second wait.
