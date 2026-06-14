# Templates Panel — Deferred Work & Future Improvements

**Last updated:** 2026-06-14
**Status:** Backlog — none of these are started. They were intentionally deferred during the 2026-06-14 templates-panel fix pass (see [templates-panel-fix-landed memory] / the session report).
**Scope:** The estimate-sheet **right sidebar** (`EstimateRightSidebar` = `src/components/workshop/component-library/index.tsx`) — combined component library + saved templates + reusable project/estimate sources, plus the insert flows that write into the estimate (`src/lib/estimates/actions.ts`, `src/lib/reusable-sources/actions.ts`, `EstimateSheetContent.tsx`).

## Context: what already shipped (2026-06-14)

A comprehensive audit + fix pass landed on the local `main` worktree (unpushed). **Fixed:** RS-1 (non-default-tab insert showed the wrong tab), INS-2 (silent template-insert failures), INS-1 (concurrent category-drop lost inserts → batched server action + revision guards), INS-4 (success clobbered in-flight cell edits), and perf wins UI-1/2 (precomputed totals), PERF-3 (deferred search), PERF-4 (removed duplicate tree build), PERF-5 (`React.memo` on the sidebar), PERF-7 (`refetchType:"none"`), UI-7 (stale context-menu id). The DB/RPC layer was audited and confirmed fully applied on hosted with no drift — **all remaining work below is app-layer or owner-gated DB hygiene.**

## Priority table

| ID | File | Title | Type | Severity | Effort | Risk | Gated? |
|----|------|-------|------|----------|--------|------|--------|
| PERF-1 | [01](01-deferred-perf-1-lazy-template-nodes.md) | Lazy-load template node trees (slim the lite loader) | Perf (cold open) | High value | Large | Med — needs a lazy-load layer | No |
| INS-3 | [02](02-deferred-ins-3-atomic-insert-wrap.md) | Make node-insert / area-wrap atomic (no orphaned DB nodes on partial failure) | Correctness | High | Medium | Med — server transaction | No |
| RS-2/3/4 | [03](03-deferred-reusable-source-query-perf.md) | Reusable-source query perf (outline N+1, search materialization, server-side scope) | Perf | Medium | Medium | Low | No |
| RS-5/6 + errors | [04](04-deferred-correctness-rs5-rs6-errors.md) | Bulk-source serialize, cross-workspace guard, error taxonomy | Correctness/UX | Low–Med | Small | Low | No |
| Future | [05](05-future-improvements.md) | Hover-prefetch, skeleton-injection split, shared-Tree virtualization, DB index hygiene, regression tests | Mixed | Mixed | Mixed | Mixed | Some owner-gated |

## Recommended sequencing

1. **First (cheap, high felt value):** PERF-2 hover-prefetch + the RS-1/INS-1 regression tests (both in [05](05-future-improvements.md)) — low risk, locks in what we just fixed and warms the panel on navigation.
2. **Then (perf):** [03](03-deferred-reusable-source-query-perf.md) reusable-source query perf — bounded, server-side, no UI risk.
3. **Then (correctness):** [02](02-deferred-ins-3-atomic-insert-wrap.md) atomicity — removes a real data-integrity hazard.
4. **Larger:** [01](01-deferred-perf-1-lazy-template-nodes.md) lazy template nodes — the biggest cold-open win but needs the most careful refactor (it touches drag-insert, totals, and preview, all of which read `template.nodes` synchronously today).
5. **Owner-gated, low urgency:** the DB index hygiene in [05](05-future-improvements.md) (small writes during a maintenance window).

## Cross-references

- Prior templates audit: `.ai/03_plans/2026-06-13-Templates-Audit-And-Improvement-Plan/`
- Estimate-tree unification (the tab/kind model these inserts run on): `.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/`
- Known issues register: `.ai/10_state/known-issues.md`
