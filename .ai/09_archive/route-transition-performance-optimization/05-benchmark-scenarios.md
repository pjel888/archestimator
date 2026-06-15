# 05 — Benchmark Scenarios: Performance Measurement Protocol

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Define concrete, reproducible performance measurement scenarios to establish baseline and track improvement

---

## Table of Contents

1. [Measurement Infrastructure](#1-measurement-infrastructure)
2. [Core Router Transition Benchmarks](#2-core-router-transition-benchmarks)
3. [Peak-Load Scenarios](#3-peak-load-scenarios)
4. [Network Condition Scenarios](#4-network-condition-scenarios)
5. [Baseline Collection Protocol](#5-baseline-collection-protocol)
6. [Success Thresholds](#6-success-thresholds)

---

## 1. Measurement Infrastructure

### 1.1 What We'll Measure

| Metric | Tool | Description |
|--------|------|-------------|
| **Navigation Start → First Paint** | Navigation Timing API + `performance.mark()` | Time from click to first pixel |
| **Navigation Start → Content Visible** | `performance.mark()` + MutationObserver | Time from click to meaningful content |
| **Navigation Start → Interactive** | Navigation Timing API | Time from click to full interactivity |
| **Route Commit Time** | Next.js `usePathname` effect timing | Time for Next.js to commit the new route |
| **Data Fetch Duration** | React Query DevTools + custom instrumentation | Supabase query round-trip time |
| **JS Bundle Size (per route)** | `bun run build` output | Kilobytes of JS per route |
| **First Load JS** | Next.js build output | Shared + route-specific JS |
| **LCP (Largest Contentful Paint)** | Lighthouse / Web Vitals | Perceived load speed |
| **CLS (Cumulative Layout Shift)** | Lighthouse / Web Vitals | Visual stability |
| **INP (Interaction to Next Paint)** | Web Vitals | Responsiveness |

### 1.2 Instrumentation Setup

Before running benchmarks, add temporary instrumentation:

```typescript
// In NavigationListener or a new PerformanceMonitor component:
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PerformanceMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    
    console.log("[Perf] Route transition:", {
      route: pathname,
      duration: navigationEntry?.duration ?? "N/A",
      domContentLoaded: navigationEntry?.domContentLoadedEventEnd,
      domComplete: navigationEntry?.domComplete,
      transferSize: navigationEntry?.transferSize,
    });
    
    // Mark navigation start in custom metric
    performance.mark(`route-commit-${pathname}`);
  }, [pathname, searchParams]);

  return null;
}
```

### 1.3 Data Collection Tool

Use Chrome DevTools Performance tab with these settings:
- **CPU throttling:** 4x slowdown (simulates mid-range mobile)
- **Network throttling:** "Fast 3G" for baseline, "Slow 3G" for stress
- **Screenshots:** Enabled (to correlate timeline with visual state)
- **Record:** Start recording, click a link, stop when page is fully loaded

For automated collection, use `lighthouse` CLI or Playwright with `page.metrics()`.

---

## 2. Core Router Transition Benchmarks

### 2.1 Sidebar Navigation (Workshop Internal)

**Setup:** Start at `/workshop`. Clear browser cache and React Query cache.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| A1 | Cold: Homebase → Projects | Click "Projects" in sidebar | Time to first project card visible |
| A2 | Warm: Projects → Homebase → Projects | Navigate away and back within 30s | Time to cached project list |
| A3 | Cold: Homebase → Library | Click "Components" in sidebar | Time to library tree visible |
| A4 | Cold: Homebase → Templates | Click "Templates" in sidebar | Time to template list visible |
| A5 | Cold: Homebase → Settings | Click "Settings" in sidebar | Time to settings form visible |

**Data to collect:**
- `performance.getEntriesByType("navigation")` duration
- `usePathname` change time
- React Query `isFetching` duration
- First contentful paint timestamp

### 2.2 Project Navigation (Workshop Internal)

**Setup:** Start at `/workshop/projects`. Have 1 project created.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| B1 | Cold: Projects → Project Detail | Click a project card | Time to project dashboard visible |
| B2 | Warm: Project Detail → Projects → Project Detail | Navigate away and back within 30s | Time to cached project detail |
| B3 | Cold: Project Detail → Estimates | Click "Estimates" in mini-sidebar | Time to estimates table visible |
| B4 | Cold: Estimates → Estimate Workspace | Click an estimate row | Time to estimate tree visible |
| B5 | Cold: Estimate Workspace → Charts | Click "Charts" in mini-sidebar | Time to chart visible |

### 2.3 Programmatic Navigation

**Setup:** On the estimates page.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| C1 | New Project Form submit | Fill form → click "Create Project" | Time from click to redirect + project detail visible |
| C2 | Estimate row click | Click estimate row in table (`useNavigationRouter().push`) | Time from click to estimate workspace visible |
| C3 | `router.refresh()` | Trigger a data mutation | Time from refresh start to updated data visible |
| C4 | Estimate tree node click | Click tree node (`useNavigationRouter().replace`) | Time from click to new node selected + row items visible |

### 2.4 Browser Back/Forward

**Setup:** Navigate through a pattern: Homebase → Projects → Project Detail → Estimates → Estimate Workspace → **Browser Back** × 4

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| D1 | Back: Estimate Workspace → Estimates | Browser Back button | Time to estimates table visible |
| D2 | Back: Estimates → Project Detail | Browser Back button | Time to project dashboard visible |
| D3 | Back: Project Detail → Projects | Browser Back button | Time to project list visible |
| D4 | Back: Projects → Homebase | Browser Back button | Time to homebase grid visible |
| D5 | Forward: Homebase → Projects | Browser Forward button | Time to project list visible |

### 2.5 Landing Page Navigation

**Setup:** Start at `/`.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| E1 | Landing → Features | Click navigation link | Time to features section visible |
| E2 | Landing → Pricing | Click navigation link | Time to pricing visible |
| E3 | Landing → Login | Click "Sign In" | Time to login form visible |
| E4 | Login → Landing | Click "Back to home" | Time to landing page visible |

### 2.6 Auth Flow Transitions

**Setup:** Not authenticated. On `/login`.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| F1 | Login → Workshop (after auth) | Complete Google OAuth flow | Time from callback to workshop visible |
| F2 | Invite → Workshop (signed out) | Open invite link, sign in | Time from accept to workshop visible |

### 2.7 Shared Route Transitions

**Setup:** Have a published project link.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| G1 | Cold: Direct share link | Open `/share/[token]` in new tab | Time to shared content visible |
| G2 | Password: Share with password | Enter password, submit | Time from submit to content visible |

---

## 3. Peak-Load Scenarios

### 3.1 Many Project Thumbnails

**Setup:** Seed a workspace with 50 projects, each with a unique thumbnail image.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| H1 | Cold load: 50 projects | Navigate to `/workshop/projects` | Time to first card visible, time to all cards visible, LCP, CLS |
| H2 | Warm revisit: 50 projects | Navigate away and back | Time to cached list visible |
| H3 | Scroll performance: 50 projects | Scroll through the list | Frame rate (60fps target), jank detection |
| H4 | 100 projects | Same as H1–H3 | Degradation curve |
| H5 | 200 projects | Same as H1–H3 | Degradation curve |

**Expected bottleneck:** Image loading + DOM node count.

### 3.2 Many Estimate Sheets

**Setup:** Seed a project with 30 estimate sheets.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| I1 | Cold load: 30 sheets | Navigate to estimates list | Time to table visible, time to all rows rendered |
| I2 | Scroll: 30 sheets | Scroll through the table | Frame rate, jank |
| I3 | Inline edit: 30 sheets | Click to edit a sheet name | Input responsiveness |
| I4 | 50 sheets | Same as I1–I3 | Degradation curve |
| I5 | 100 sheets | Same as I1–I3 | Degradation curve |

**Expected bottleneck:** TanStack Table rendering all rows without virtualization.

### 3.3 Many Estimate Row Items

**Setup:** Seed an estimate sheet with varying row counts.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| J1 | 50 rows, 5 nodes | Navigate to estimate workspace | Time to tree + rows visible |
| J2 | 100 rows, 10 nodes | Navigate to estimate workspace | Time to tree + rows visible |
| J3 | 200 rows, 20 nodes | Navigate to estimate workspace | Time to tree + rows visible |
| J4 | 500 rows, 50 nodes | Navigate to estimate workspace | Time to tree + rows visible |
| J5 | 1000 rows, 100 nodes | Navigate to estimate workspace | Stress test — does it crash? |

**Expected bottleneck:** React Complex Tree rendering all nodes + row table rendering all rows.

### 3.4 Many Library Components

**Setup:** Seed a workspace with varying component counts.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| K1 | 100 components | Navigate to `/workshop/library` | Time to tree + sheet visible |
| K2 | 500 components | Navigate to `/workshop/library` | Time to tree + sheet visible |
| K3 | 1000 components | Navigate to `/workshop/library` | Stress test |

### 3.5 Many Estimate Columns in Charts

**Setup:** Project with 3 estimates, each with 200+ row items.

| # | Scenario | Action | Measurement |
|---|----------|--------|-------------|
| L1 | 1 estimate column | Navigate to `/charts` | Time to chart + table visible |
| L2 | 2 estimate columns | Add second column | Time to both charts visible |
| L3 | 3 estimate columns (max) | Add third column | Time to all three visible |

---

## 4. Network Condition Scenarios

### 4.1 Network Profiles

| Profile | Download | Upload | Latency | Simulates |
|---------|----------|--------|---------|-----------|
| No throttle | Unlimited | Unlimited | ~0ms | Local dev |
| Fast 4G | 20 Mbps | 10 Mbps | 40ms | Good connection |
| Slow 4G | 4 Mbps | 2 Mbps | 100ms | Moderate connection |
| Fast 3G | 1.5 Mbps | 750 Kbps | 150ms | Mobile/cafe |
| Slow 3G | 400 Kbps | 400 Kbps | 400ms | Poor connection |

### 4.2 Cross-Matrix

Test **Scenario A3** (Homebase → Library) on all 5 network profiles. Record:

| Profile | First Paint | Content Visible | Interactive | Overlay Duration |
|---------|-------------|-----------------|-------------|-----------------|
| No throttle | | | | |
| Fast 4G | | | | |
| Slow 4G | | | | |
| Fast 3G | | | | |
| Slow 3G | | | | |

Repeat for **Scenario B4** (Estimates → Estimate Workspace, 200 rows).

---

## 5. Baseline Collection Protocol

### 5.1 Pre-Baseline Checklist

- [ ] Build the app: `bun run build`
- [ ] Start production server: `bun run start`
- [ ] Clear browser cache (DevTools → Application → Clear site data)
- [ ] Clear React Query cache (in app, or manually in console)
- [ ] Open Chrome DevTools Performance tab
- [ ] Set CPU throttling: 4x slowdown
- [ ] Set Network throttling: "Fast 3G"
- [ ] Enable screenshots in Performance recording

### 5.2 Collection Process (Per Scenario)

1. **Start recording** in Performance tab
2. **Perform the action** (click, navigate, etc.)
3. **Wait** until page is fully loaded (no spinners, no loading overlays)
4. **Stop recording**
5. **Record metrics:**
   - Navigation Timing: `duration`, `domContentLoaded`, `domComplete`
   - First Paint / First Contentful Paint (from Performance timeline)
   - LCP (from Performance timeline or Lighthouse)
   - JS heap size (from Performance timeline Memory track)
   - Number of network requests (from Network tab)
   - Total transferred KB (from Network tab)
6. **Repeat 3 times** for statistical significance
7. **Record median** value (not average — median is robust to outliers)

### 5.3 Baseline Data Template

```markdown
| Scenario | Run 1 | Run 2 | Run 3 | Median | Notes |
|----------|-------|-------|-------|--------|-------|
| A1: Cold Homebase → Projects | 450ms | 520ms | 480ms | 480ms | 3 image loads |
```

---

## 6. Success Thresholds

### 6.1 Target Metrics (Post-Optimization)

| Scenario | Current Baseline (est.) | Target | Stretch Goal |
|----------|------------------------|--------|--------------|
| A1: Cold Homebase → Projects | 300–500ms | < 150ms | < 80ms |
| A2: Warm revisit | 200–400ms | < 50ms | < 20ms |
| A3: Cold Homebase → Library | 300–500ms | < 150ms | < 80ms |
| B1: Cold Projects → Project Detail | 400–800ms | < 200ms | < 100ms |
| B4: Cold Estimates → Estimate Workspace | 500–1500ms | < 300ms | < 150ms |
| B5: Cold Estimates → Charts | 500–1000ms | < 300ms | < 150ms |
| D1–D5: Back/Forward | 300–800ms | < 50ms | < 20ms |
| H1: 50 projects cold load | 500–2000ms | < 300ms | < 150ms |
| J3: 200 rows cold load | 800–2000ms | < 500ms | < 300ms |

### 6.2 Acceptance Criteria

A route transition is considered "seamless" when:
- [ ] Content is visible within 100ms of click (cold, Fast 3G)
- [ ] Content is visible within 50ms of click (warm/cached)
- [ ] Back/Forward restores page within 50ms (bfcache hit)
- [ ] Loading overlay does not appear for cached/prefetched routes
- [ ] Skeleton screens appear within 50ms for cold routes
- [ ] No layout shift during content population (CLS < 0.1)
- [ ] Scroll position is preserved on back/forward

### 6.3 Degradation Acceptability

| Load Level | Acceptable Latency | Notes |
|------------|-------------------|-------|
| 1–20 projects | < 100ms | Instant |
| 21–50 projects | < 200ms | Fast |
| 51–100 projects | < 500ms with skeleton | Acceptable with progressive loading |
| 1–100 estimate rows | < 200ms | Instant |
| 101–500 estimate rows | < 500ms with skeleton | Acceptable with virtualization |
| 500+ estimate rows | < 1s with virtualization | Warning threshold |

---

**Next:** See `04-implementation-plan.md` for ordered phases to achieve these targets.
