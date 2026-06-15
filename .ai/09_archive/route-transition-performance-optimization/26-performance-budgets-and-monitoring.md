# 26 — Performance Budgets & Monitoring

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Define performance budgets, thresholds, and monitoring strategies to maintain performance improvements and prevent regressions.

---

## Table of Contents

1. [Performance Budgets Overview](#1-performance-budgets-overview)
2. [Bundle Size Budgets](#2-bundle-size-budgets)
3. [Latency Budgets](#3-latency-budgets)
4. [Core Web Vitals Budgets](#4-core-web-vitals-budgets)
5. [Resource Budgets](#5-resource-budgets)
6. [Monitoring Strategy](#6-monitoring-strategy)
7. [Alerting Thresholds](#7-alerting-thresholds)
8. [Regression Prevention](#8-regression-prevention)
9. [Performance Dashboard](#9-performance-dashboard)

---

## 1. Performance Budgets Overview

### 1.1 What Are Performance Budgets?

Performance budgets are **hard limits** that must not be exceeded. If a change violates a budget, it must be optimized or rejected.

**Key principles:**
- Budgets are **non-negotiable** — violations block deployment
- Budgets are **measurable** — automated checks in CI/CD
- Budgets are **realistic** — based on baseline + target improvements
- Budgets are **monitored** — tracked in production

### 1.2 Budget Categories

| Category | What We Measure | Why It Matters |
|----------|----------------|----------------|
| **Bundle Size** | JavaScript KB per route | Larger bundles = slower downloads |
| **Latency** | Navigation time (ms) | Slower navigation = worse UX |
| **Core Web Vitals** | LCP, FID, CLS | Google ranking factors |
| **Resources** | Memory, CPU usage | High usage = crashes, battery drain |
| **Overlay Visibility** | % of navigations showing overlay | Lower = better UX |

---

## 2. Bundle Size Budgets

### 2.1 Route Bundle Size Limits

**Maximum bundle sizes per route (compressed/gzipped):**

| Route | Max Size | Rationale |
|-------|----------|-----------|
| `/` (landing) | **150KB** | First impression, must load fast |
| `/login` | **100KB** | Simple form, minimal JS |
| `/workshop` | **150KB** | Homebase, moderate complexity |
| `/workshop/projects` | **150KB** | Project list, moderate complexity |
| `/workshop/projects/[id]` | **180KB** | Project detail, more data |
| `/workshop/projects/[id]/estimates` | **180KB** | Estimates list, table rendering |
| `/workshop/projects/[id]/estimates/[nodeId]` | **200KB** | Estimate workspace, heaviest route |
| `/workshop/projects/[id]/charts` | **180KB** | Charts with D3 |
| `/workshop/library` | **180KB** | Component library, tree rendering |
| `/workshop/templates` | **150KB** | Templates list |
| `/workshop/settings` | **120KB** | Settings forms |

**Shared chunks:**
- `vendor.js`: Max **100KB** (React, Next.js, etc.)
- `commons.js`: Max **50KB** (shared utilities)

### 2.2 Component Size Limits

**Maximum component sizes (uncompressed source):**

| Component Type | Max Lines | Rationale |
|----------------|-----------|-----------|
| Page component | **500 lines** | Should be thin wrapper |
| Layout component | **300 lines** | Reusable across pages |
| Feature component | **800 lines** | Complex but focused |
| Utility component | **200 lines** | Small and reusable |

**If component exceeds limit:**
1. Extract sub-components
2. Move logic to custom hooks
3. Use dynamic imports for heavy parts

### 2.3 CI Check Implementation

**File:** `scripts/check-bundle-size.ts`

```typescript
import { readFileSync, statSync } from 'fs';

const BUDGETS = {
  '/': 150_000,
  '/login': 100_000,
  '/workshop': 150_000,
  '/workshop/projects': 150_000,
  '/workshop/projects/[id]': 180_000,
  '/workshop/projects/[id]/estimates': 180_000,
  '/workshop/projects/[id]/estimates/[nodeId]': 200_000,
  '/workshop/projects/[id]/charts': 180_000,
  '/workshop/library': 180_000,
  '/workshop/templates': 150_000,
  '/workshop/settings': 120_000,
};

const manifest = JSON.parse(readFileSync('.next/build-manifest.json', 'utf-8'));

let hasError = false;

for (const [route, maxSize] of Object.entries(BUDGETS)) {
  const pageFiles = manifest.pages[route] || [];
  
  const totalSize = pageFiles.reduce((sum, file) => {
    try {
      const stats = statSync(`.next/${file}`);
      return sum + stats.size;
    } catch {
      return sum;
    }
  }, 0);
  
  const totalSizeKB = Math.round(totalSize / 1024);
  const maxSizeKB = Math.round(maxSize / 1024);
  
  if (totalSize > maxSize) {
    console.error(`❌ ${route}: ${totalSizeKB}KB exceeds ${maxSizeKB}KB budget`);
    hasError = true;
  } else {
    console.log(`✅ ${route}: ${totalSizeKB}KB / ${maxSizeKB}KB`);
  }
}

if (hasError) {
  console.error('\nBundle size budget exceeded. Please optimize:');
  console.error('1. Code split heavy components with dynamic imports');
  console.error('2. Tree shake unused imports');
  console.error('3. Move large components to separate routes');
  process.exit(1);
}

console.log('\n✅ All routes within bundle size budget');
```

**GitHub Actions integration:**

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run scripts/check-bundle-size.ts
```

---

## 3. Latency Budgets

### 3.1 Navigation Latency Limits

**Maximum navigation times (Fast 3G, 4x CPU slowdown):**

| Navigation Type | Max Time | Target |
|-----------------|----------|--------|
| **Cold navigation** (no cache) | **300ms** | < 200ms |
| **Warm navigation** (cached) | **100ms** | < 50ms |
| **Back/forward** (bfcache) | **50ms** | < 20ms |
| **Revisit** (within 5 min) | **100ms** | < 50ms |

**Measurement:**
- Use Chrome DevTools Performance tab
- Enable "Fast 3G" network throttling
- Enable "4x CPU slowdown"
- Measure from click to "First Input Delay < 50ms"

### 3.2 Route-Specific Latency Budgets

| Route | Cold | Warm | Back/Forward |
|-------|------|------|--------------|
| `/workshop` → `/workshop/projects` | 300ms | 100ms | 50ms |
| `/workshop/projects` → `/workshop/projects/[id]` | 350ms | 100ms | 50ms |
| `/workshop/projects/[id]` → `/estimates` | 350ms | 100ms | 50ms |
| `/workshop/projects/[id]/estimates` → `/[nodeId]` | 400ms | 150ms | 50ms |
| `/workshop` → `/workshop/library` | 350ms | 100ms | 50ms |

**Note:** Estimate workspace has higher budget (400ms) due to complexity.

### 3.3 Server Response Time Budgets

**Maximum server response times:**

| Metric | Max Time | Rationale |
|--------|----------|-----------|
| **TTFB** (Time to First Byte) | **200ms** | Server should respond quickly |
| **Auth check** | **50ms** | Middleware auth must be fast |
| **Database query** | **100ms** | Individual queries should be fast |
| **API route** | **300ms** | Full API response |

**Monitoring:**

```typescript
// Add timing to API routes
export async function GET(request: Request) {
  const start = performance.now();
  
  // ... handle request
  
  const duration = performance.now() - start;
  
  if (duration > 300) {
    console.warn(`[SLOW] API route took ${duration}ms`);
  }
  
  return NextResponse.json(data);
}
```

---

## 4. Core Web Vitals Budgets

### 4.1 LCP (Largest Contentful Paint)

**Budget:** < 2.5 seconds (Good), < 4.0 seconds (Needs Improvement)

**Target:** < 2.0 seconds for all routes

**Measurement:**
```bash
npx lighthouse http://localhost:3000/workshop/projects --only-categories=performance
```

**Optimization strategies:**
- Optimize images (use next/image)
- Preload critical resources
- Reduce server response time
- Code split above-the-fold components

### 4.2 FID (First Input Delay) / INP (Interaction to Next Paint)

**Budget:** < 100ms (Good), < 300ms (Needs Improvement)

**Target:** < 50ms for all interactions

**Measurement:**
- Use Chrome DevTools Performance tab
- Record user interactions
- Measure delay between click and visual feedback

**Optimization strategies:**
- Reduce main thread work
- Code split heavy components
- Use web workers for heavy computations
- Optimize React re-renders (React.memo)

### 4.3 CLS (Cumulative Layout Shift)

**Budget:** < 0.1 (Good), < 0.25 (Needs Improvement)

**Target:** < 0.05 for all routes

**Measurement:**
```bash
npx lighthouse http://localhost:3000/workshop/projects --only-categories=performance
```

**Optimization strategies:**
- Set explicit dimensions for images/videos
- Reserve space for skeleton screens
- Avoid inserting content above existing content
- Use transform animations instead of layout changes

### 4.4 TBT (Total Blocking Time)

**Budget:** < 200ms (Good), < 600ms (Needs Improvement)

**Target:** < 150ms for all routes

**Measurement:**
- Use Lighthouse
- Measure time between FCP and TTI where main thread was blocked

**Optimization strategies:**
- Code split heavy components
- Defer non-critical JavaScript
- Use web workers
- Optimize React renders

### 4.5 CI Check Implementation

**File:** `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/workshop",
        "http://localhost:3000/workshop/projects",
        "http://localhost:3000/workshop/library"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "first-input-delay": ["error", { "maxNumericValue": 100 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

**GitHub Actions integration:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run start &
      - run: sleep 5
      - run: npx @lhci/cli@0.12.x autorun
```

---

## 5. Resource Budgets

### 5.1 Memory Usage

**Budget:** < 300MB per tab (desktop), < 200MB (mobile)

**Measurement:**
- Chrome DevTools → Memory tab
- Take heap snapshot
- Monitor over time

**Warning threshold:** > 400MB

**Critical threshold:** > 500MB (likely to crash on mobile)

**Optimization strategies:**
- Clean up event listeners in useEffect
- Clear timers on unmount
- Reduce React Query cache size
- Lazy load heavy components

### 5.2 CPU Usage

**Budget:** < 30% average CPU during navigation

**Measurement:**
- Chrome DevTools → Performance tab
- Record navigation
- Check CPU usage graph

**Warning threshold:** > 50% average

**Critical threshold:** > 80% average (will cause jank)

**Optimization strategies:**
- Reduce main thread work
- Use web workers for heavy computations
- Optimize React renders
- Defer non-critical work

### 5.3 Network Usage

**Budget:** < 500KB total page weight (HTML + JS + CSS + images)

**Measurement:**
- Chrome DevTools → Network tab
- Check "Transferred" column

**Warning threshold:** > 750KB

**Critical threshold:** > 1MB

**Optimization strategies:**
- Compress images
- Code split JavaScript
- Minify CSS
- Use HTTP/2 push

---

## 6. Monitoring Strategy

### 6.1 Real User Monitoring (RUM)

**Tool:** Vercel Analytics or custom solution

**Metrics to track:**
- Navigation latency (per route)
- Overlay visibility rate
- Core Web Vitals (LCP, FID, CLS)
- Error rate

**Implementation:**

```typescript
// src/lib/analytics.ts
export function trackNavigation(route: string, duration: number) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event: 'navigation',
        route,
        duration,
        timestamp: Date.now(),
      }),
    });
  }
}

export function trackOverlayVisibility(duration: number) {
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event: 'overlay_visible',
        duration,
        timestamp: Date.now(),
      }),
    });
  }
}
```

### 6.2 Synthetic Monitoring

**Tool:** Playwright or Puppeteer

**Frequency:** Every 15 minutes

**Scenarios:**
1. Navigate through all routes
2. Measure navigation latency
3. Check for errors
4. Verify Core Web Vitals

**Implementation:**

```typescript
// tests/playwright/synthetic-monitoring.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Synthetic Monitoring', () => {
  test('all routes load within budget', async ({ page }) => {
    const routes = [
      '/workshop',
      '/workshop/projects',
      '/workshop/library',
    ];
    
    for (const route of routes) {
      const start = Date.now();
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // 2 second budget
    }
  });
});
```

### 6.3 Error Monitoring

**Tool:** Sentry or LogRocket

**What to track:**
- JavaScript errors
- API errors
- Hydration mismatches
- Navigation failures

**Implementation:**

```typescript
// src/lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { contexts: { custom: context } });
}

// Usage
try {
  await fetchData();
} catch (error) {
  trackError(error, { route: '/workshop/projects' });
}
```

---

## 7. Alerting Thresholds

### 7.1 Critical Alerts (Page Immediately)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Navigation latency P95** | > 1000ms | Investigate immediately |
| **Error rate** | > 5% | Investigate immediately |
| **Overlay visibility rate** | > 50% | Investigate immediately |
| **LCP P75** | > 4.0s | Investigate immediately |

### 7.2 Warning Alerts (Investigate Within 24h)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Navigation latency P50** | > 300ms | Investigate within 24h |
| **Error rate** | > 1% | Investigate within 24h |
| **Overlay visibility rate** | > 20% | Investigate within 24h |
| **LCP P75** | > 2.5s | Investigate within 24h |

### 7.3 Alert Implementation

**File:** `src/lib/alerting.ts`

```typescript
const THRESHOLDS = {
  navigationP95: 1000,
  navigationP50: 300,
  errorRate: 0.05,
  overlayVisibilityRate: 0.5,
  lcpP75: 4000,
};

export function checkAlerts(metrics: Metrics) {
  const alerts: Alert[] = [];
  
  if (metrics.navigationP95 > THRESHOLDS.navigationP95) {
    alerts.push({
      severity: 'critical',
      message: `Navigation P95 is ${metrics.navigationP95}ms (threshold: ${THRESHOLDS.navigationP95}ms)`,
    });
  }
  
  if (metrics.errorRate > THRESHOLDS.errorRate) {
    alerts.push({
      severity: 'critical',
      message: `Error rate is ${(metrics.errorRate * 100).toFixed(1)}% (threshold: ${(THRESHOLDS.errorRate * 100).toFixed(1)}%)`,
    });
  }
  
  // Send alerts to Slack/PagerDuty
  if (alerts.length > 0) {
    sendAlerts(alerts);
  }
}
```

---

## 8. Regression Prevention

### 8.1 CI/CD Checks

**Every PR must pass:**

1. **Bundle size check** — All routes within budget
2. **Lighthouse CI** — Core Web Vitals within budget
3. **E2E tests** — All tests pass
4. **Unit tests** — All tests pass
5. **Type check** — No TypeScript errors

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run type-check
      - run: bun run test
      - run: bun run build
      - run: bun run scripts/check-bundle-size.ts
      - run: npx @lhci/cli@0.12.x autorun
```

### 8.2 Performance Regression Tests

**File:** `scripts/check-performance-regression.ts`

```typescript
import { readFileSync } from 'fs';

const baseline = JSON.parse(readFileSync('baseline-metrics.json', 'utf-8'));
const current = JSON.parse(readFileSync('current-metrics.json', 'utf-8'));

const REGRESSION_THRESHOLD = 0.2; // 20%

for (const route of Object.keys(baseline)) {
  const baselineTime = baseline[route].timeToInteractive;
  const currentTime = current[route].timeToInteractive;
  
  const regression = (currentTime - baselineTime) / baselineTime;
  
  if (regression > REGRESSION_THRESHOLD) {
    console.error(
      `❌ ${route}: ${currentTime}ms is ${Math.round(regression * 100)}% slower than baseline (${baselineTime}ms)`
    );
    process.exit(1);
  } else {
    console.log(`✅ ${route}: ${currentTime}ms (baseline: ${baselineTime}ms)`);
  }
}
```

### 8.3 Code Review Checklist

**Before approving PR:**

- [ ] Bundle size within budget?
- [ ] No unnecessary dependencies added?
- [ ] Heavy components code split?
- [ ] React.memo used for list items?
- [ ] useEffect cleanup implemented?
- [ ] No blocking operations in render?
- [ ] Performance tests pass?

---

## 9. Performance Dashboard

### 9.1 Dashboard Metrics

**Real-time metrics to display:**

1. **Navigation Latency**
   - P50, P95, P99 over time
   - Per-route breakdown
   - Trend line (improving/degrading)

2. **Overlay Visibility Rate**
   - % of navigations showing overlay
   - Target: < 5%
   - Trend line

3. **Core Web Vitals**
   - LCP, FID, CLS over time
   - Per-route breakdown
   - Good/Needs Improvement/Poor status

4. **Error Rate**
   - % of navigations with errors
   - Error types breakdown
   - Trend line

5. **Bundle Sizes**
   - Per-route bundle size
   - Budget limits
   - Trend line

### 9.2 Dashboard Implementation

**Tool:** Grafana, Datadog, or custom

**Data source:** Analytics API

**Refresh rate:** Every 5 minutes

**Example Grafana dashboard:**

```json
{
  "dashboard": {
    "title": "Route Transition Performance",
    "panels": [
      {
        "title": "Navigation Latency (P95)",
        "type": "graph",
        "targets": [
          {
            "query": "percentile(95, navigation_duration) by (route)"
          }
        ]
      },
      {
        "title": "Overlay Visibility Rate",
        "type": "stat",
        "targets": [
          {
            "query": "count(overlay_visible) / count(navigation) * 100"
          }
        ]
      }
    ]
  }
}
```

---

## 10. Budget Review Process

### 10.1 Monthly Review

**Every month:**
1. Review performance dashboard
2. Identify trends (improving/degrading)
3. Update budgets if needed
4. Plan optimization work

**Questions to ask:**
- Are we meeting our budgets?
- Which routes are slowest?
- What's causing regressions?
- What optimizations should we prioritize?

### 10.2 Budget Adjustment Process

**When to adjust budgets:**
- Sustained improvement (> 20% better for 1 month)
- New features require higher budgets
- Baseline measurements were unrealistic

**Process:**
1. Propose budget change in PR
2. Provide justification (data, analysis)
3. Get team approval
4. Update budget in code
5. Update monitoring alerts

---

**Next:** See `27-gradual-rollout-strategy.md` for safe deployment strategies.
