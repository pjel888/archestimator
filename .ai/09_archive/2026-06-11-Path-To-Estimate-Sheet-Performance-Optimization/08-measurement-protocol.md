# 08 — Measurement Protocol

**Date**: 2026-06-11 | **Status**: Protocol ready; baseline measurements still blank | **Last Update**: 2026-06-11 02:42 UTC
**Purpose**: Reproducible benchmarks for before/after measurement of each optimization

---

## Baseline Measurement (Before Any Changes)

### Prerequisites
- Local Supabase running (`npx supabase start`)
- Dev server running (`bun run dev`)
- Chrome DevTools or browser with Performance tab
- Seed data loaded (use existing project/estimate)

### Metrics to Capture

| Metric | How to Measure | Tool |
|--------|---------------|------|
| **TTFB** (Time to First Byte) | Network tab → estimate page request → "Waiting" time | Chrome DevTools |
| **FCP** (First Contentful Paint) | Performance tab → record → FCP marker | Chrome DevTools / Lighthouse |
| **LCP** (Largest Contentful Paint) | Performance tab → record → LCP marker | Chrome DevTools / Lighthouse |
| **TBT** (Total Blocking Time) | Lighthouse report → "Total Blocking Time" | Lighthouse |
| **JS Parse Time** | Performance tab → "Scripting" in flame chart | Chrome DevTools |
| **Payload Size** | Network tab → total transferred for estimate page | Chrome DevTools |
| **Query Count** | Supabase logs or Network tab → XHR requests | Chrome DevTools |
| **Keystroke Lag** | Type in a cell → measure time between keypress and UI update | Performance tab (record while typing) |
| **KL Value** | Lighthouse → "Speed Index" + visual completeness | Lighthouse |

### Baseline Script

```bash
# 1. Start services
npx supabase start
bun run dev

# 2. Open Chrome DevTools → Network tab → check "Disable cache"
# 3. Navigate to: http://localhost:3000/workshop/projects/<PROJECT_ID>/estimates/<NODE_ID>
#    (Use seed data: open /workshop, click a project, click an estimate)
# 4. Record Performance tab while page loads
# 5. Record Performance tab while typing "100" in a quantity cell 10 times
# 6. Record Lighthouse report (Desktop, no throttling for dev comparison)

# 7. Measure bundle: ANALYZE=true bun run build
#    → Opens bundle analyzer at http://localhost:8888
```

### Quick Pre-Measurement Checks (Runnable Now)

```bash
# CSS baseline (already measured):
# globals.css: 20,055 bytes
# react-complex-tree/lib/style-modern.css: 6,824 bytes
# lenis/dist/lenis.css: 513 bytes
# Total: 27,392 bytes loaded on every page

# Hook density in critical component:
grep -cE "use(Effect|Memo|State|Callback|Ref)" src/components/workshop/EstimateSheetContent.tsx
# Current 2026-06-11 source snapshot:
# wc -l src/components/workshop/EstimateSheetContent.tsx
# Result: 4,336 lines
# Hook occurrences:
# useEffect 14, useMemo 23, useState 33, useCallback 32, useRef 7
# useTransition 0, useDeferredValue 0, useOptimistic 0

# select('*') instances across codebase:
grep -rn "\.select(\"\*\")" src/lib/repositories/ | wc -l
# Current 2026-06-11 source snapshot:
# Result: 29 in repositories, 48 across all source

# Landing component count:
ls src/components/landing/*.tsx | wc -l
# Result: 31 landing page components

# Workshop component line count:
wc -l src/components/workshop/*.tsx | tail -1
# Result: 15,064 total workshop component lines
```

### Baseline Target Sheet

Use a sheet with:
- 50 rows (small sheet baseline)
- 200 rows (medium sheet baseline)
- 500 rows (large sheet baseline — use seed data or create test data)

### Capture Format

```
## Baseline — 2026-06-11
**Sheet**: <estimate_name> (<N> rows)
**Route**: /workshop/projects/<PROJECT_ID>/estimates/<NODE_ID>
**Fixture source**: seed | local generated | hosted owner-approved
**Worktree state**: <branch/commit plus dirty-file summary>

| Metric | 50 rows | 200 rows | 500 rows |
|--------|---------|----------|----------|
| TTFB | ___ms | ___ms | ___ms |
| FCP | ___ms | ___ms | ___ms |
| LCP | ___ms | ___ms | ___ms |
| TBT | ___ms | ___ms | ___ms |
| Payload (transferred) | ___KB | ___KB | ___KB |
| DB query count | ___ | ___ | ___ |
| Keystroke lag (avg 10 chars) | ___ms | ___ms | ___ms |
```

The blank cells above are intentional. They mean the current pack has a measurement protocol, not a measured runtime baseline.

### Recorded Baseline — 2026-06-11 implementation run

**Sheet**: synthetic jsdom fixtures (5×10, 10×20, 10×50 areas×rows)
**Route**: `EstimateSheetContent` rendered directly (vitest/jsdom), mocked server actions
**Fixture source**: local generated (`tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`)
**Worktree state**: `perf/path-to-estimate-sheet` @ 626d44a + 7 unrelated dirty templates-panel files (preserved untouched)

| Metric | 50 rows | 200 rows | 500 rows |
|--------|---------|----------|----------|
| TTFB | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| FCP | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| LCP | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| TBT | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| Payload (transferred) | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| DB query count | BLOCKED¹ | BLOCKED¹ | BLOCKED¹ |
| Initial render (jsdom) | 176.7ms | 287.3ms | 1119.3ms |
| Keystroke lag (jsdom avg 10 chars) | 19.6ms | 82.0ms | 212.8ms |
| Keystroke lag (jsdom worst) | 36.7ms | 197.0ms | 314.0ms |
| Non-edited table renders / 10 keystrokes | 45 | 90 | 90 |

¹ Browser metrics for authenticated routes BLOCKED this run: workshop requires real auth (dev-auth bypass disabled), Docker/local Supabase unavailable, hosted Supabase access denied by permission classifier. See `.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/environment-status.md`. jsdom values are relative-comparison evidence for the render-path units; the keystroke render cascade (every table re-renders on every keystroke) is proven by the render-count rows.

Raw artifact: `.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/baseline/jsdom-render-baseline-before.json`

---

## Per-Sprint Measurement Gates

### Baseline Gate — Before Any Source Edit

**Required before Sprint 0**:
- Filled 50/200/500-row measurement table above.
- Static source snapshot: line count, hook counts, `select("*")` counts, package dependency state, Redis/remote-cache absence or presence, `next/image` vs `backgroundImage` inventory, route path, and worktree dirt.
- Behavior characterization for quantity edit, misc cost edit, contingency/discount, row add/delete, template insert, bulk selection, drag/drop, remote cursor overlay, activity scope, and proposal preview signature.
- Pre-edit blast-radius and package/cache/image decision receipts for any planned package, cache, image, config, repository, or high-risk component change.

**Pass Gate**: baseline evidence exists and can be rerun by a future implementer without relying on chat history.

### Sprint 0 — Low-Risk Render Relief

**Changes**: React.memo on EstimateRowItemsTable, projectTotal memoization. Do not introduce deferred row state in this sprint unless the future implementer deliberately widens scope and passes the Sprint 2 input-focus tests.

**Re-measure**:
- Keystroke lag (primary metric): should drop from ~50-200ms to <16ms for non-editing rows
- TBT: should decrease as fewer components re-render per keystroke
- Verify: no regression in TTFB, FCP, LCP (should be unchanged)

**Pass Gate**: Keystroke lag improves without stale totals, stale callbacks, lost focus, drag/drop regression, or cursor overlay regression.

### Sprint 1 — Data Layer

**Changes**: Column selection, parallel fetching, estimate-list aggregate query/RPC, composite indexes, and targeted `next/image` adoption only after the decision matrix passes. No Redis/remote-cache change in this sprint unless the measured trigger and owner approval exist.

**Re-measure**:
- Payload size (primary metric): should drop 60-80% (verify per-table reduction)
- TTFB: should drop 30-50%
- DB query count: estimate-sheet count may remain stable; estimate-list query shape should reduce row transfer and JavaScript aggregation.
- Image transfer bytes and LCP when `next/image` replaces inline thumbnails or hero image props.
- Bundle chunk sizes when package/config optimizations are proposed.
- Verify: no regression in keystroke lag

**Pass Gate**: Payload and TTFB improve against the baseline. Do not require `<50KB` or `<300ms` unless the baseline proves those are realistic for the chosen fixture and environment.

### Sprint 2 — Computation Storm

**Changes**: useDeferredValue refactoring, useOptimistic evaluation, cursor isolation, lazy-load library

**Re-measure**:
- Keystroke lag (primary metric): should be <16ms (imperceptible)
- TBT: should drop significantly (less JS execution during typing)
- Initial payload: should drop (component library deferred)
- Verify: no regression in opening component library (skeleton → content transition smooth)

**Pass Gate**: Keystroke lag < 16ms at 200 rows + library first-open < 500ms

### Sprint 3 — Structure & DOM

**Changes**: Split 4,336-line component, virtualize grid only if Sprint 0-2 measurements still prove DOM pressure.

**Re-measure**:
- FCP/LCP (primary metric): should improve (less initial DOM)
- Keystroke lag: should remain <16ms at 500+ rows
- Memory: should drop significantly (fewer DOM nodes)
- Verify: drag-and-drop still works with virtual positions

**Pass Gate**: Keystroke lag < 16ms at 1000 rows + FCP < 1s

---

## Automated Benchmarking (Future)

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse
  run: |
    npx lhci autorun --collect.url=http://localhost:3000/workshop/projects/$PROJECT_ID/estimates/$NODE_ID
```

### Custom Keystroke Lag Test

```typescript
// tests/vitest/perf/keystroke-lag.test.ts
// Measure time between simulated keystroke and DOM update
// Using Vitest + jsdom + performance.now()
```

### Database EXPLAIN ANALYZE

```sql
-- Run on Supabase SQL editor before/after index changes:
EXPLAIN ANALYZE
SELECT * FROM cost_library_item_price_options
WHERE workspace_id = '<workspace_id>'
AND item_id IN (<item_ids>);

-- Check: "Index Scan" vs "Seq Scan"
-- Target: Index Scan on (workspace_id, item_id)
```

---

## Regression Checkpoints

After EVERY sprint, verify these didn't regress:

| Surface | Check | How |
|---------|-------|-----|
| Landing page load | FCP < 1s | Lighthouse |
| Login flow | No redirect loops | Manual test |
| Workshop home | No error boundaries | Page load |
| Estimate sheet open | Works with keyboard | Tab through cells |
| Tree drag-drop | Nodes reorder | Manual test |
| Library sidebar | Items load | Manual test |
| Export proposal.xlsx | Downloads correctly | Click export |
| Shared link view | Loads correctly | Open share URL |

---

## Success Criteria (Target)

| Metric | Baseline Target | Sprint 3 Target |
|--------|----------------|-----------------|
| TTFB | < 500ms | < 200ms |
| FCP | < 1.5s | < 800ms |
| LCP | < 2s | < 1.2s |
| TBT | < 300ms | < 100ms |
| Keystroke lag (200 rows) | Baseline blank until measured | < 16ms |
| Payload (initial) | Baseline blank until measured | < 50KB |
| DB queries (initial) | Baseline blank until measured | -8 candidate if library deferred |

These Sprint 3 targets are desired product budgets, not current proof. They become enforceable only after a reproducible baseline exists.
