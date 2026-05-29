# Baseline Performance Metrics

**Status:** Template — Fill in after running measurement script  
**Date collected:** ___________  
**App version:** `git rev-parse HEAD` → ___________  
**Environment:** [ ] Local dev (`bun run dev`) [ ] Production build (`bun run build && bun run start`)  
**Network:** [ ] No throttle [ ] Fast 3G [ ] Slow 3G  
**CPU:** [ ] No throttle [ ] 4x slowdown  

---

## Route Transition Timing (ms)

Measured from click to content visible. Median of 3 runs. Network: Fast 3G, CPU: 4x slowdown.

### Sidebar Navigation (Cold)

| From → To | Run 1 | Run 2 | Run 3 | Median | Overlay Shown? |
|------------|-------|-------|-------|--------|----------------|
| `/workshop` → `/workshop/projects` | | | | | |
| `/workshop` → `/workshop/library` | | | | | |
| `/workshop` → `/workshop/templates` | | | | | |
| `/workshop` → `/workshop/settings` | | | | | |

### Sidebar Navigation (Warm — revisit within 30s)

| From → To | Run 1 | Run 2 | Run 3 | Median | Cache Hit? |
|------------|-------|-------|-------|--------|------------|
| `/workshop/projects` → `/workshop` → back to `/workshop/projects` | | | | | |
| `/workshop/library` → `/workshop` → back to `/workshop/library` | | | | | |

### Project Navigation

| From → To | Run 1 | Run 2 | Run 3 | Median | Notes |
|------------|-------|-------|-------|--------|-------|
| `/workshop/projects` → `/workshop/projects/[id]` | | | | | 1 existing project |
| `/workshop/projects/[id]` → `/workshop/projects/[id]/estimates` | | | | | |
| `/workshop/projects/[id]/estimates` → `/workshop/projects/[id]/estimates/[nodeId]` | | | | | |
| `/workshop/projects/[id]/estimates/[nodeId]` → `/workshop/projects/[id]/charts` | | | | | |

### Browser Back/Forward

| Action | Run 1 | Run 2 | Run 3 | Median | bfcache Hit? |
|--------|-------|-------|-------|--------|--------------|
| Back (estimate workspace → estimates list) | | | | | |
| Back (estimates list → project detail) | | | | | |
| Back (project detail → project list) | | | | | |
| Forward (project list → project detail) | | | | | |

### Programmatic Navigation

| Action | Run 1 | Run 2 | Run 3 | Median | Notes |
|--------|-------|-------|-------|--------|-------|
| New Project form submit → redirect | | | | | |
| Estimate row click → estimate workspace | | | | | |
| `router.refresh()` after data mutation | | | | | |

---

## Peak-Load Timing (ms)

Run with seeded test data via `scripts/seed-performance-test-data.ts`.

### Project List (Many Thumbnails)

| Project Count | Cold Load | Warm Revisit | DOM Nodes | Notes |
|---------------|-----------|-------------|-----------|-------|
| 1 | | | | Baseline |
| 10 | | | | |
| 50 | | | | |
| 100 | | | | |

### Estimate Sheets List

| Sheet Count | Cold Load | Warm Revisit | DOM Nodes | Notes |
|-------------|-----------|-------------|-----------|-------|
| 1 | | | | Baseline |
| 10 | | | | |
| 30 | | | | |
| 50 | | | | |

### Estimate Row Items (Single Sheet)

| Row Count | Node Count | Cold Load | Scroll FPS | DOM Nodes | Notes |
|-----------|------------|-----------|------------|-----------|-------|
| 10 | 3 | | | | Baseline |
| 50 | 10 | | | | |
| 100 | 20 | | | | |
| 200 | 30 | | | | |
| 500 | 50 | | | | |

### Component Library

| Component Count | Cold Load | Warm Revisit | DOM Nodes | Notes |
|-----------------|-----------|-------------|-----------|-------|
| 10 | | | | Baseline |
| 100 | | | | |
| 500 | | | | |
| 1000 | | | | |

---

## Bundle Size Analysis

From `bun run build` output:

| Route | First Load JS (KB) | Shared JS (KB) | Route JS (KB) |
|-------|--------------------|----------------|---------------|
| `/` | | | |
| `/login` | | | |
| `/workshop` | | | |
| `/workshop/projects` | | | |
| `/workshop/projects/[projectId]` | | | |
| `/workshop/projects/[projectId]/estimates` | | | |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | | | |
| `/workshop/projects/[projectId]/charts` | | | |
| `/workshop/library` | | | |
| `/workshop/templates` | | | |
| `/workshop/settings` | | | |
| `/share/[token]` | | | |
| `/invite/[token]` | | | |

**Total build size:** ___________  
**Number of chunks:** ___________  
**Largest chunk:** ___________  

---

## Lighthouse Scores

Collected via `npx lighthouse http://localhost:3000/workshop/projects --throttling-method=simulate`.

| Route | Performance | LCP (s) | TBT (ms) | CLS | Notes |
|-------|-------------|---------|----------|-----|-------|
| `/workshop` | | | | | |
| `/workshop/projects` | | | | | |
| `/workshop/projects/[id]` | | | | | |
| `/workshop/projects/[id]/estimates/[nodeId]` | | | | | |

---

## Raw Data

Attach Chrome DevTools Performance trace exports for each scenario above.

### Trace Files
- `traces/sidebar-cold-projects.json`
- `traces/sidebar-cold-library.json`
- `traces/project-detail-cold.json`
- `traces/estimate-workspace-cold.json`
- `traces/back-forward-sequence.json`
- `traces/peak-50-projects.json`
- `traces/peak-200-rows.json`

---

## Summary

| Metric | Baseline | Target | Gap |
|--------|----------|--------|-----|
| Cold transition median | _ms | <150ms | |
| Warm revisit median | _ms | <50ms | |
| Back/forward median | _ms | <50ms | |
| 50-project page load | _ms | <300ms | |
| 200-row estimate page load | _ms | <500ms | |
| JS bundle (largest route) | _KB | <150KB | |
| Lighthouse Performance | _/100 | ≥90 | |

---

**Instructions:** Run `scripts/measure-route-transitions.ts` to auto-populate the timing data. Run `ANALYZE=true bun run build` for bundle data. Run `npx lighthouse` for Lighthouse scores.
