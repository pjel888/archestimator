# 12 - Current Evidence and Gap Audit

**Date**: 2026-06-11
**Purpose**: Correct the plan pack against the current worktree and separate source evidence from unproven performance hypotheses.
**Scope**: Read-only audit of the path from `/` to `/workshop/projects/[projectId]/estimates/[nodeId]`.

---

## Executive Correction

The original pack was useful but too optimistic. It labeled several source-audited findings as "verified" and "ready for implementation" while the runtime baseline table remained blank. Current source inspection confirms the main hotspots, but implementation is not complete and the pack must not claim measured wins.

Future implementation must start with the baseline and characterization gates in `08-measurement-protocol.md`, then follow `13-implementation-readiness-plan.md`.

---

## Current Worktree Snapshot

| Evidence | Current result | Planning impact |
|----------|----------------|-----------------|
| Worktree state | Existing unrelated source/test modifications plus this untracked target plan folder | Future implementers must re-check `git status --short` before edits and isolate plan/docs changes from code work. |
| Code-review graph | Graph available with 13,048 nodes / 142,844 edges; direct semantic searches for the exact phrase returned 0 nodes, but communities show estimate, package-builder, workshop, row, and tree clusters | Use graph for impact mapping, then confirm with direct source reads because keyword coverage is imperfect. |
| Route shape | App route file is `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Docs must use `[nodeId]` for the route segment. Repository fallback may treat a non-node UUID as an estimate ID. |
| Sheet component size | `src/components/workshop/EstimateSheetContent.tsx` is 4,336 lines | Older 4,249-line references are stale. Treat line numbers as current-snapshot anchors. |
| Hook/concurrency snapshot | 14 `useEffect`, 23 `useMemo`, 33 `useState`, 32 `useCallback`, 7 `useRef`; 0 `useTransition`, 0 `useDeferredValue`, 0 `useOptimistic` | React 19 concurrency is available but unused in this component. Do not introduce it before focus/rollback parity tests exist. |
| `select("*")` snapshot | 29 repository hits, 48 source-wide hits | Repository-only count remained stable, source-wide count increased from the original 45. |
| Estimate sheet eager library load | `ProjectEstimateNodePage` still fetches `getCurrentWorkspaceComponentLibrary()` in initial `Promise.all` | R4 remains valid. |
| Estimate list row aggregate | `listProjectEstimates()` now selects only `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost` from `estimate_row_items` | The original estimate-list `source_snapshot` overfetch claim is stale. The remaining issue is row transfer plus JavaScript aggregation. |
| Virtualization dependency | `@tanstack/react-virtual` is not present in `package.json` | R1 requires explicit dependency approval and measurement-backed need. |
| Global CSS | `src/app/layout.tsx` still imports `react-complex-tree/lib/style-modern.css` and `lenis/dist/lenis.css` globally | Landing/global CSS finding remains valid. |
| Redis / remote cache | No Redis, Upstash, or KV dependency in `package.json`; local Next 16 docs frame `use cache: remote` as shared durable cache with cost and network latency | Do not add Redis by default. Require a measured shared-cache problem, invalidation plan, and cost approval. |
| Image optimization | `next.config.ts` has Supabase component-image `remotePatterns` and `sharp`; component thumbnails still use inline `backgroundImage`; landing hero uses `priority` | `next/image` adoption is valid for public component thumbnails, but must use Next 16 `preload` semantics for true LCP images and preserve accessibility/layout. |

---

## Evidence Classification

| Claim family | Evidence strength | What proves it | What is still missing |
|--------------|------------------|----------------|-----------------------|
| Source topology and route path | Strong | Direct file reads of App Router paths and component hierarchy | Re-check after any source branch changes. |
| Sheet render and state hotspots | Strong for existence, weak for magnitude | Direct source reads show bare totals, no memoized row table, no deferred/optimistic/concurrent features | Runtime flame charts, render counts, keystroke latency across 50/200/500-row sheets. |
| Data overfetch | Strong for `select("*")` existence, weak for byte impact | `rg` count plus source reads of repository calls | Network payload captures by route and fixture size. |
| Estimate-list bottleneck | Corrected | Current code shows row aggregate columns only, not `source_snapshot` | SQL/RPC aggregate parity and EXPLAIN proof. |
| Database index need | Plausible | `.in("item_id", itemIds)` patterns and schema inventory | EXPLAIN ANALYZE before/after on local and linked-safe environments. |
| Landing auth overhead | Plausible | `getLandingAuthState()` calls `supabase.auth.getUser()` on public routes | Actual TTFB split for anonymous and signed-in sessions. |
| Package/cache/image decisions | Strong for current inventory, weak for runtime impact | `package.json`, `next.config.ts`, source search, and local Next 16 docs | Bundle analyzer, image byte transfer, cache hit/miss, invalidation, and provider-cost evidence. |
| Speed Insights / RES impact | Not proven | Prior memory says Vercel CLI metrics exist for route-level fields | Current deployment/window/device proof and dashboard/export evidence if required. |

---

## False-Green Risks

1. **Blank baseline table**: A protocol with empty cells does not prove performance.
2. **Line-number drift**: The sheet component changed from the original 4,249-line snapshot to 4,336 lines in the current worktree.
3. **Estimate-list stale claim**: Current code no longer fetches row-item JSONB for the estimate list. Future work should target aggregation, not a nonexistent list-page `source_snapshot` overfetch.
4. **Memoization self-report**: Adding `React.memo` can appear green while hiding stale callbacks or mutated props. Require behavior parity plus render-count evidence.
5. **`useDeferredValue` focus risk**: Deferred global row state can break cursor position, tab order, rollback, proposal previews, or activity scope.
6. **Index cargo-culting**: Additive indexes are still provider mutations and must earn their place with EXPLAIN evidence.
7. **Provider metrics drift**: Local Lighthouse or old deployment metrics must not be reported as current hosted production wins.
8. **Redis cargo-culting**: A distributed cache can add latency, provider cost, stale-data risk, and secret/key management without improving the protected path.
9. **Image rewrite false positive**: Replacing `backgroundImage` with `next/image` is only a win if transferred bytes, layout stability, and accessibility improve.

---

## Current Gaps to Close Before Code

- Fill the 50/200/500-row baseline table in `08-measurement-protocol.md`.
- Create or identify deterministic fixture sheets and record exact project/node IDs.
- Add characterization coverage for all sheet behaviors listed in `13-implementation-readiness-plan.md`.
- Decide whether `@tanstack/react-virtual` is approved if Sprint 3 still needs virtualization after Sprint 0-2.
- Decide package/cache/image gates with `16-dependency-cache-image-decision-matrix.md`, including whether Redis remains out of scope.
- Re-run blast-radius analysis from `17-blast-radius-and-impact-analysis-plan.md` before every source edit.
- Decide the database proof path for any future migration: local-only first, linked exact-file proof only with owner-approved provider authority.
- Re-run graph impact analysis against the future code-bearing branch before editing symbols.
