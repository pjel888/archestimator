# 13 - Implementation Readiness Plan

**Date**: 2026-06-11
**Type**: `perf`
**Execution posture**: Future implementation only; this document is planning and audit work.

---

## Summary

Improve the landing-to-estimate-sheet path by first proving the baseline, then reducing sheet render churn, data payload, estimate-list aggregation cost, component-library eager loading, and only finally DOM pressure. The plan avoids starting with virtualization because the current largest risks are unmeasured computation and payload costs.

---

## Requirements

- R1. Baseline performance must be measured for 50-, 200-, and 500-row sheets before any source edit.
- R2. Sheet editing behavior must be characterized before optimizing `EstimateSheetContent.tsx`.
- R3. Future code changes must preserve quantity, unit cost, misc cost, contingency/discount, row add/delete, template insert, bulk selection, drag/drop, remote cursor, proposal preview, and activity scope behavior.
- R4. Estimate-sheet tree loads must stop fetching large unused JSONB columns where the current render does not need them.
- R5. Component library data must not block initial estimate-sheet render when the right sidebar is closed.
- R6. Estimate-list aggregation must avoid transferring every row item when a SQL/RPC aggregate can produce equivalent counts and totals.
- R7. Database indexes must be backed by EXPLAIN proof before linked-provider application.
- R8. Landing/global CSS and auth display work must reduce anonymous first-paint cost without weakening protected-route auth validation.
- R9. Virtualization must be deferred until Sprint 0-2 measurements prove DOM count remains the limiting factor.
- R10. Hosted or provider performance claims must cite route, deployment/window, device class, and metric source.
- R11. Every package, cache, and image optimization must pass the decision matrix before dependency/config/source changes.
- R12. Redis, Upstash, KV, or `use cache: remote` must not be added unless measured shared-cache pressure, invalidation design, privacy safety, and cost approval are all recorded.
- R13. Every production source edit must have pre-edit blast-radius analysis and post-diff impact verification.

---

## Key Decisions

- KTD1. **Measurement precedes optimization**: The pack currently has source evidence, not runtime proof. Baseline traces are required before code.
- KTD2. **Characterization-first sheet work**: `EstimateSheetContent.tsx` is a high-state 4,336-line component. Future implementation must pin behavior before memoization, deferred state, or splitting.
- KTD3. **No broad cache relaxation**: Public/marketing cache headers and protected route privacy remain separate. Speed or TTFB pressure does not justify weakening fail-closed/auth/privacy behavior.
- KTD4. **SQL aggregate over client reduction for estimate lists**: Current list-page row item columns are already narrowed; the next gain is moving aggregation to Postgres with arithmetic parity.
- KTD5. **Dependency approval for virtualization**: `@tanstack/react-virtual` is absent today. Add it only if measurements prove Sprint 0-2 did not solve the limiting issue.
- KTD6. **No Redis by default**: Protected estimate-sheet data is not a distributed-cache-first problem. Prefer query shape, lazy loading, client/session cache, and Postgres aggregate proof before remote cache.
- KTD7. **Next image adoption is targeted**: Component thumbnails should move from `backgroundImage` to `next/image` only when the image URL is public/allowed and the implementation provides `sizes`, stable containers, and before/after network evidence.
- KTD8. **Package changes need analyzer proof**: `optimizePackageImports`, new dependencies, and cache handlers require route chunk/metric evidence rather than assumptions.
- KTD9. **Blast radius is a gate**: Graph/GitNexus/manual impact mapping must happen before touching high-risk symbols, with post-diff verification tied to changed surfaces.

---

## Implementation Units

### U0. Baseline and Behavior Harness

- **Goal:** Create reproducible baseline fixtures and characterization coverage before source optimization.
- **Files:** `tests/vitest/estimate-sheet-cost-inputs.test.tsx`, `tests/vitest/estimate-sheet-tree-dom.test.tsx`, `tests/vitest/estimate-tree-context-menu.test.tsx`, future performance harness under `tests/vitest/perf/` or `e2e/`.
- **Dependencies:** None.
- **Approach:** Record current worktree state, line/hook/select counts, fixture IDs, network payload, and keystroke traces. Add tests only in the future code-bearing branch.
- **Test scenarios:** Quantity edit preserves displayed value and total; discount remains negative; row delete rollback restores rows; drag/drop preserves tree; remote cursor overlay renders; proposal preview signature updates after row edits.
- **Verification:** Baseline table in `08-measurement-protocol.md` is filled, characterization tests fail if current behavior regresses, and artifacts are archived.

### U0A. Blast Radius and Package/Cache/Image Decision Gate

- **Goal:** Prevent premature package installs, Redis/cache changes, image rewrites, or high-risk source edits.
- **Files:** `package.json`, `next.config.ts`, touched source files from later units, `16-dependency-cache-image-decision-matrix.md`, `17-blast-radius-and-impact-analysis-plan.md`.
- **Dependencies:** U0 static snapshot.
- **Approach:** For each implementation unit, run graph/GitNexus/manual impact mapping, then fill the relevant decision row before code. Redis/Upstash/KV remain out of scope unless the matrix says the measured trigger is satisfied.
- **Test scenarios:** Package decision with no dependency change; image decision for component thumbnail URLs; cache decision for component library data; high-risk symbol edit with impact receipt.
- **Verification:** A blast-radius receipt and package/cache/image decision receipt exist before the corresponding source change.

### U1. Safe Render Relief

- **Goal:** Reduce avoidable sheet re-renders without changing input scheduling.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, focused tests above.
- **Dependencies:** U0.
- **Approach:** Add `React.memo` around the row table with a comparator that is proven safe; memoize `projectTotal`.
- **Test scenarios:** Editing one row does not stale another row; totals update after all row mutations; callbacks remain live after row add/delete; render-count proof shows non-edited tables skip renders.
- **Verification:** Keystroke trace improves or remains neutral; all characterization tests pass.

### U2. Explicit Column Selection for Estimate-Sheet Loads

- **Goal:** Remove JSONB overfetch from initial estimate-sheet and project layout queries.
- **Files:** `src/lib/repositories/workspace-repository.ts`, tests covering repository return shape.
- **Dependencies:** U0.
- **Approach:** Replace path-relevant `select("*")` calls with explicit columns. Fetch `source_snapshot` only when a caller truly needs linked-row source data.
- **Test scenarios:** Estimate sheet opens, linked component display still has required fields, unlinked rows do not require source snapshots, project header still renders publication/collaboration data.
- **Verification:** Network payload decreases against baseline; TypeScript catches missing fields without `as any` or suppressions.

### U3. Estimate-List Aggregate Query

- **Goal:** Replace row transfer plus JavaScript reduction in `listProjectEstimates()` with a SQL/RPC aggregate.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `supabase/migrations/*` if an RPC/view is selected, tests for estimate list summaries.
- **Dependencies:** U0.
- **Approach:** Preserve existing arithmetic semantics exactly, including null and discount handling. Keep rollback path until parity proof is green.
- **Test scenarios:** Multi-estimate project totals match current JavaScript; empty estimates return zero counts; discount rows subtract correctly; RLS permits only accessible project estimates.
- **Verification:** EXPLAIN shows bounded plan; payload and CPU improve for 50-estimate fixture.

### U4. Component Library Lazy Load

- **Goal:** Remove `getCurrentWorkspaceComponentLibrary()` from initial estimate-sheet server render.
- **Files:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/components/workshop/component-library/index.tsx`, component-library hooks/actions as needed.
- **Dependencies:** U0, U2 optional.
- **Approach:** Load library data only when sidebar opens, with a session cache and a skeleton/error state.
- **Test scenarios:** Sheet opens without library data; sidebar first-open loads items/templates; second-open uses cache; errors are visible and non-blocking.
- **Verification:** Initial query count drops; first-open latency is measured and under the selected budget.

### U5. Database Index Proof and Migration

- **Goal:** Add only indexes that EXPLAIN proves useful.
- **Files:** `supabase/migrations/*`, `tests/vitest/supabase-performance-migrations.test.ts`, DB proof artifacts.
- **Dependencies:** U2 or U4 identifying final query shapes.
- **Approach:** Run EXPLAIN before adding indexes, then after. Apply locally first. Linked/provider apply requires explicit owner/provider authority.
- **Test scenarios:** Planner uses intended indexes for `.eq("workspace_id").in("item_id", ids)` patterns; migration is idempotent; RLS behavior unchanged.
- **Verification:** EXPLAIN before/after evidence and migration tests are archived.

### U6. Landing and Global CSS/Auth Display

- **Goal:** Reduce public first-paint overhead without weakening protected auth.
- **Files:** `src/app/layout.tsx`, `src/app/workshop/layout.tsx`, landing public pages/components.
- **Dependencies:** U0 public-route baseline.
- **Approach:** Scope tree CSS to workshop and Lenis CSS to landing if feasible. Replace landing auth round-trip with neutral CTA or display-only hint, while protected routes keep `getUser()`.
- **Test scenarios:** Landing renders for anonymous users; signed-in users can still enter workshop; no redirect loops; CSS still applies in workshop tree.
- **Verification:** Landing CSS bytes and TTFB improve against baseline.

### U7. React 19 Scheduling and Optimistic State

- **Goal:** Introduce `useDeferredValue` and/or `useOptimistic` only after U1 proves safe local relief.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/hooks/use-estimate-row-mutations.ts`.
- **Dependencies:** U0, U1.
- **Approach:** Split immediate cell drafts from deferred expensive derivations. Evaluate whether `useOptimistic` can replace manual rollback without losing revision guards.
- **Test scenarios:** Rapid typing, tab-away, blur commit, rollback after failed server action, proposal preview update, activity scope update, row add/delete under concurrent edits.
- **Verification:** Keystroke lag improves at 200 rows; no stale UI or rollback corruption.

### U8. Cursor Isolation

- **Goal:** Prevent remote cursor traffic from re-rendering sheet content.
- **Files:** `src/hooks/use-estimate-cursor-broadcast.ts`, `src/components/workshop/EstimateSheetContent.tsx`, possible Zustand cursor slice.
- **Dependencies:** U0.
- **Approach:** Move cursor overlay into an isolated memoized subtree/state slice and reduce pointer-move DOM traversal if profiling proves it matters.
- **Test scenarios:** Remote cursors update, disappear on timeout, do not steal input focus, and do not re-render non-cursor sheet rows.
- **Verification:** Render-count and collaboration tests pass.

### U9. Component Split

- **Goal:** Split `EstimateSheetContent.tsx` into smaller components after behavior and data fixes.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, new child components under `src/components/workshop/estimate-sheet/` if selected.
- **Dependencies:** U0-U8 as applicable.
- **Approach:** Extract header, body, modals, footer, and sidebar boundaries without changing behavior.
- **Test scenarios:** Existing sheet flows remain green after each extraction.
- **Verification:** Diff is mechanical and tests pass after every extraction batch.

### U10. Virtualization

- **Goal:** Virtualize rows only if post-U1-U9 profiling still shows DOM count as the limiting bottleneck.
- **Files:** Future `EstimateSheetBody` component, package files if `@tanstack/react-virtual` is approved.
- **Dependencies:** U0-U9 and explicit dependency approval.
- **Approach:** Add virtualizer with variable-height measurement, overscan, focus preservation, drag/drop zone mapping, and cursor overlay coordinate mapping.
- **Test scenarios:** Keyboard editing survives row recycling; drag/drop zones work; bulk selection sees off-screen rows correctly; cursors map to virtualized rows; print/export paths are unaffected.
- **Verification:** 500/1000-row sheets meet the chosen keystroke and paint budgets.

---

## Future Rollout Gates

1. **Docs-to-code handoff:** Use a fresh worktree or clean branch. Do not mutate this planning branch/source state accidentally.
2. **Before source edits:** Run graph impact on touched symbols/files and record current dirty worktree state.
3. **Before package/cache/image/config edits:** Apply `16-dependency-cache-image-decision-matrix.md` and record a decision receipt.
4. **Per unit:** Land focused tests and code together. Avoid omnibus changes in `EstimateSheetContent.tsx`.
5. **Provider work:** Database migrations, Vercel metrics, Redis/KV services, and hosted proof require explicit authority and separate evidence artifacts.
6. **Completion:** A future implementation can claim success only when local behavior, runtime metrics, impact receipts, and provider evidence each match the scope of the claim.
