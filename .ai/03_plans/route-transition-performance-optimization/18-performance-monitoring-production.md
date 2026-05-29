# 18 — Production Performance Monitoring Strategy

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Establish runtime monitoring, alerting, and regression detection to ensure performance improvements are maintained in production.

---

## Table of Contents

1. [Monitoring Goals](#1-monitoring-goals)
2. [Client-Side Monitoring](#2-client-side-monitoring)
3. [Server-Side Monitoring](#3-server-side-monitoring)
4. [Alerting Thresholds](#4-alerting-thresholds)
5. [Regression Detection](#5-regression-detection)
6. [Dashboards & Metrics](#6-dashboards--metrics)
7. [CI/CD Integration](#7-cicd-integration)
8. [Incident Response](#8-incident-response)

---

## 1. Monitoring Goals

### What We're Monitoring

1. **Route transition latency** — Time from click to interactive (the core metric)
2. **Overlay visibility rate** — Percentage of navigations that show the loading overlay
3. **Server response time** — Time from request to first byte (TTFB)
4. **Query execution time** — Supabase query latency (P50, P95, P99)
5. **Bundle size** — Route-specific JS bundle sizes
6. **Error rates** — Navigation failures, hydration errors, query failures

### Success Criteria

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Cold navigation (P50) | < 150ms | > 300ms |
| Warm navigation (P50) | < 50ms | > 100ms |
| Overlay visibility rate | < 5% | > 15% |
| Server TTFB (P95) | < 200ms | > 500ms |
| Query latency (P95) | < 100ms | > 300ms |
| Navigation error rate | < 0.1% | > 1% |

---

## 2. Client-Side Monitoring

### 2.1 Navigation Timing Instrumentation

**File:** `src/components/performance-monitor.tsx` (created in Phase 0)

```typescript
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

export function PerformanceMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationStartTime = useNavigationUiStore((s) => s.startTime);

  useEffect(() => {
    // Measure navigation completion
    const navigationEnd = performance.now();
    const navigationDuration = navigationStartTime > 0 
      ? navigationEnd - navigationStartTime 
      : null;

    if (navigationDuration !== null) {
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Perf] Route transition: ${pathname}`, {
          duration: `${navigationDuration.toFixed(2)}ms`,
          route: pathname,
          search: searchParams.toString(),
        });
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === "production") {
        // Option A: Send to Vercel Analytics
        if (typeof window !== "undefined" && "va" in window) {
          (window as any).va("track", "route_transition", {
            route: pathname,
            duration: navigationDuration,
          });
        }

        // Option B: Send to custom endpoint
        fetch("/api/metrics/route-transition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route: pathname,
            duration: navigationDuration,
            timestamp: Date.now(),
          }),
        }).catch(console.error);
      }
    }
  }, [pathname, searchParams, navigationStartTime]);

  return null;
}
```

### 2.2 Overlay Visibility Tracking

**File:** `src/components/ui/route-loading-overlay.tsx` (modify existing)

```typescript
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

export function RouteLoadingOverlay() {
  const isNavigating = useNavigationUiStore((s) => s.isNavigating);

  useEffect(() => {
    if (isNavigating) {
      const startTime = Date.now();
      
      return () => {
        const duration = Date.now() - startTime;
        
        // Track overlay visibility
        if (process.env.NODE_ENV === "production") {
          fetch("/api/metrics/overlay-visibility", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visible: true,
              duration,
              timestamp: Date.now(),
            }),
          }).catch(console.error);
        }
      };
    }
  }, [isNavigating]);

  if (!isNavigating || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-route-overlay
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/25 backdrop-blur-md pointer-events-none transition-opacity duration-200 ease-out motion-reduce:transition-none"
    >
      <CircleNotch
        size={28}
        weight="regular"
        className="animate-spin text-white"
        aria-hidden="true"
      />
    </div>,
    document.body
  );
}
```

### 2.3 Web Vitals Monitoring

**File:** `src/lib/analytics/web-vitals.ts`

```typescript
import { onCLS, onFID, onLCP, onINP } from "web-vitals";

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
}

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    route: window.location.pathname,
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/metrics/web-vitals", body);
  } else {
    fetch("/api/metrics/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(console.error);
  }
}
```

**Usage in `_app.tsx` or `layout.tsx`:**

```typescript
import { reportWebVitals } from "@/lib/analytics/web-vitals";

useEffect(() => {
  reportWebVitals();
}, []);
```

---

## 3. Server-Side Monitoring

### 3.1 Request Timing Middleware

**File:** `src/middleware.ts` (add to existing middleware)

```typescript
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // ... existing auth logic ...
  
  const response = NextResponse.next();
  
  // Add timing header for observability
  const duration = Date.now() - startTime;
  response.headers.set("x-middleware-duration-ms", duration.toString());
  
  // Log slow middleware executions
  if (duration > 200) {
    console.warn(`[Middleware] Slow execution: ${duration}ms`, {
      path: request.nextUrl.pathname,
      method: request.method,
    });
  }
  
  return response;
}
```

### 3.2 Query Performance Monitoring

**File:** `src/lib/supabase/server.ts` (wrap Supabase client)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Wrap query methods with timing
  if (process.env.NODE_ENV === "production") {
    const originalFrom = client.from.bind(client);
    
    client.from = (table: string) => {
      const queryStart = Date.now();
      const query = originalFrom(table);
      
      // Wrap all terminal methods (select, insert, update, delete)
      const wrapTerminal = (method: string) => {
        const original = query[method].bind(query);
        query[method] = async (...args: any[]) => {
          const result = await original(...args);
          const duration = Date.now() - queryStart;
          
          // Log slow queries
          if (duration > 100) {
            console.warn(`[Supabase] Slow query: ${table}.${method}`, {
              duration: `${duration}ms`,
              table,
              method,
            });
          }
          
          // Send to metrics endpoint
          fetch("http://localhost:3000/api/metrics/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table,
              method,
              duration,
              timestamp: Date.now(),
            }),
          }).catch(() => {}); // Fire and forget
          
          return result;
        };
      };
      
      wrapTerminal("select");
      wrapTerminal("insert");
      wrapTerminal("update");
      wrapTerminal("delete");
      
      return query;
    };
  }

  return client;
}
```

### 3.3 Server Component Render Timing

**File:** `src/lib/performance/server-timing.ts`

```typescript
import { unstable_cache } from "next/cache";

export function withTiming<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  return (async () => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === "production") {
      console.log(`[ServerTiming] ${label}: ${duration}ms`);
      
      // Send to metrics
      fetch("http://localhost:3000/api/metrics/server-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, duration, timestamp: Date.now() }),
      }).catch(() => {});
    }
    
    return result;
  })();
}

// Usage in page.tsx
export default async function ProjectsPage() {
  const projects = await withTiming(
    () => listCurrentWorkspaceProjects(),
    "ProjectsPage.listProjects"
  );
  
  return <ProjectsPageClient projects={projects} />;
}
```

---

## 4. Alerting Thresholds

### 4.1 Metrics API Endpoints

**File:** `src/app/api/metrics/route-transition/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { route, duration, timestamp } = await request.json();
  
  // Store in database or send to monitoring service
  // Example: Send to Datadog, New Relic, or custom database
  
  // Check alert thresholds
  if (duration > 300) {
    await sendAlert({
      type: "slow_route_transition",
      route,
      duration,
      timestamp,
    });
  }
  
  return NextResponse.json({ ok: true });
}

async function sendAlert(alert: any) {
  // Send to Slack, PagerDuty, or email
  console.error("[PerformanceAlert]", alert);
  
  // Example: Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Performance Alert: ${alert.type}`,
        attachments: [
          {
            color: "danger",
            fields: [
              { title: "Route", value: alert.route, short: true },
              { title: "Duration", value: `${alert.duration}ms`, short: true },
              { title: "Timestamp", value: new Date(alert.timestamp).toISOString(), short: false },
            ],
          },
        ],
      }),
    }).catch(console.error);
  }
}
```

**Similar endpoints for:**
- `/api/metrics/overlay-visibility` — Track overlay visibility rate
- `/api/metrics/web-vitals` — Track Core Web Vitals
- `/api/metrics/query` — Track Supabase query latency
- `/api/metrics/server-render` — Track server component render time

### 4.2 Alert Rules

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Route transition (P50) | > 200ms | > 300ms | Investigate slow route, check queries |
| Overlay visibility rate | > 10% | > 15% | Check prefetch/cache effectiveness |
| Server TTFB (P95) | > 400ms | > 500ms | Check middleware, queries, caching |
| Query latency (P95) | > 200ms | > 300ms | Optimize slow queries, add indexes |
| Navigation error rate | > 0.5% | > 1% | Check auth, network, error boundaries |

### 4.3 Alert Escalation

```typescript
// src/lib/monitoring/alerting.ts
export async function checkAlertThresholds() {
  const metrics = await getRecentMetrics(/* last 15 minutes */);
  
  const alerts = [];
  
  // Route transition latency
  if (metrics.routeTransition.p50 > 300) {
    alerts.push({
      severity: "critical",
      message: `Route transition P50 is ${metrics.routeTransition.p50}ms (threshold: 300ms)`,
    });
  } else if (metrics.routeTransition.p50 > 200) {
    alerts.push({
      severity: "warning",
      message: `Route transition P50 is ${metrics.routeTransition.p50}ms (threshold: 200ms)`,
    });
  }
  
  // Overlay visibility rate
  if (metrics.overlayVisibilityRate > 0.15) {
    alerts.push({
      severity: "critical",
      message: `Overlay visibility rate is ${(metrics.overlayVisibilityRate * 100).toFixed(1)}% (threshold: 15%)`,
    });
  }
  
  // Send alerts
  for (const alert of alerts) {
    await sendAlert(alert);
  }
}
```

**Schedule:** Run every 15 minutes via Vercel Cron or external scheduler.

---

## 5. Regression Detection

### 5.1 Automated Performance Testing in CI

**File:** `.github/workflows/performance-regression.yml`

```yaml
name: Performance Regression Check

on:
  pull_request:
    branches: [main]

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build application
        run: bun run build
      
      - name: Start production server
        run: bun run start &
      
      - name: Wait for server
        run: sleep 10
      
      - name: Run performance benchmarks
        run: bun run scripts/performance-benchmark.ts
      
      - name: Compare against baseline
        run: bun run scripts/compare-performance.ts
      
      - name: Fail if regression detected
        run: |
          if [ -f .performance-regression ]; then
            echo "Performance regression detected!"
            cat .performance-regression
            exit 1
          fi
```

### 5.2 Benchmark Script

**File:** `scripts/performance-benchmark.ts`

```typescript
import puppeteer from "puppeteer";

const THRESHOLDS = {
  coldNavigationP50: 300, // ms
  warmNavigationP50: 100, // ms
  overlayVisibilityRate: 0.15, // 15%
};

async function runBenchmarks() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Authenticate
  await page.goto("http://localhost:3000/login");
  // ... login flow ...
  
  // Benchmark: Cold navigation (Projects)
  const coldDurations = [];
  for (let i = 0; i < 5; i++) {
    await page.goto("http://localhost:3000/workshop");
    await page.waitForSelector('[data-testid="project-card"]');
    
    const startTime = Date.now();
    await page.click('a[href="/workshop/projects"]');
    await page.waitForSelector('[data-testid="projects-grid"]');
    const duration = Date.now() - startTime;
    
    coldDurations.push(duration);
    
    // Clear cache for next iteration
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
  
  // Benchmark: Warm navigation (Projects)
  const warmDurations = [];
  for (let i = 0; i < 5; i++) {
    await page.goto("http://localhost:3000/workshop");
    await page.waitForSelector('[data-testid="project-card"]');
    
    // First visit (populate cache)
    await page.click('a[href="/workshop/projects"]');
    await page.waitForSelector('[data-testid="projects-grid"]');
    
    // Navigate away
    await page.click('a[href="/workshop/library"]');
    await page.waitForSelector('[data-testid="library-tree"]');
    
    // Warm revisit
    const startTime = Date.now();
    await page.click('a[href="/workshop/projects"]');
    await page.waitForSelector('[data-testid="projects-grid"]');
    const duration = Date.now() - startTime;
    
    warmDurations.push(duration);
  }
  
  // Calculate P50
  const coldP50 = percentile(coldDurations, 50);
  const warmP50 = percentile(warmDurations, 50);
  
  console.log(`Cold navigation P50: ${coldP50}ms`);
  console.log(`Warm navigation P50: ${warmP50}ms`);
  
  // Check thresholds
  const regressions = [];
  
  if (coldP50 > THRESHOLDS.coldNavigationP50) {
    regressions.push(
      `Cold navigation P50 is ${coldP50}ms (threshold: ${THRESHOLDS.coldNavigationP50}ms)`
    );
  }
  
  if (warmP50 > THRESHOLDS.warmNavigationP50) {
    regressions.push(
      `Warm navigation P50 is ${warmP50}ms (threshold: ${THRESHOLDS.warmNavigationP50}ms)`
    );
  }
  
  if (regressions.length > 0) {
    await fs.writeFile(".performance-regression", regressions.join("\n"));
    console.error("Performance regressions detected:");
    regressions.forEach((r) => console.error(`  - ${r}`));
    process.exit(1);
  }
  
  await browser.close();
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

runBenchmarks().catch(console.error);
```

### 5.3 Baseline Comparison

**File:** `scripts/compare-performance.ts`

```typescript
import fs from "fs/promises";

async function comparePerformance() {
  // Read current metrics
  const current = JSON.parse(
    await fs.readFile(".performance-metrics.json", "utf-8")
  );
  
  // Read baseline (from main branch)
  let baseline;
  try {
    baseline = JSON.parse(
      await fs.readFile(".performance-baseline.json", "utf-8")
    );
  } catch {
    console.log("No baseline found. Creating initial baseline.");
    await fs.writeFile(
      ".performance-baseline.json",
      JSON.stringify(current, null, 2)
    );
    return;
  }
  
  // Compare
  const regressions = [];
  
  for (const [metric, value] of Object.entries(current)) {
    const baselineValue = baseline[metric];
    if (!baselineValue) continue;
    
    const percentChange = ((value - baselineValue) / baselineValue) * 100;
    
    if (percentChange > 20) {
      regressions.push(
        `${metric}: ${value}ms (baseline: ${baselineValue}ms, +${percentChange.toFixed(1)}%)`
      );
    }
  }
  
  if (regressions.length > 0) {
    await fs.writeFile(".performance-regression", regressions.join("\n"));
    console.error("Performance regressions detected:");
    regressions.forEach((r) => console.error(`  - ${r}`));
    process.exit(1);
  }
  
  console.log("No performance regressions detected.");
}

comparePerformance().catch(console.error);
```

---

## 6. Dashboards & Metrics

### 6.1 Grafana Dashboard (Self-hosted)

**File:** `monitoring/grafana-dashboard.json`

Create a Grafana dashboard with panels:

1. **Route Transition Latency (P50, P95, P99)**
   - Time series graph
   - Grouped by route
   - Threshold line at 150ms (P50)

2. **Overlay Visibility Rate**
   - Gauge chart
   - Target: < 5%
   - Alert at 15%

3. **Server Response Time (TTFB)**
   - Time series graph
   - Grouped by route
   - Threshold line at 200ms (P95)

4. **Query Latency**
   - Time series graph
   - Grouped by table/operation
   - Threshold line at 100ms (P95)

5. **Bundle Size**
   - Bar chart
   - Grouped by route
   - Threshold line at 150KB

6. **Error Rates**
   - Time series graph
   - Navigation errors, hydration errors, query failures

### 6.2 Vercel Analytics (Managed)

If using Vercel, enable:
- **Speed Insights** — Real-time Web Vitals from production users
- **Analytics** — Route-level performance metrics
- **Logs** — Server-side timing logs

**Dashboard URL:** `https://vercel.com/[team]/[project]/analytics`

### 6.3 Custom Metrics API

**File:** `src/app/api/metrics/dashboard/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  // Query metrics from database
  const metrics = await getMetricsFromDatabase(/* last 24 hours */);
  
  return NextResponse.json({
    routeTransition: {
      p50: metrics.routeTransition.p50,
      p95: metrics.routeTransition.p95,
      p99: metrics.routeTransition.p99,
    },
    overlayVisibilityRate: metrics.overlayVisibilityRate,
    serverResponseTime: {
      p50: metrics.serverResponseTime.p50,
      p95: metrics.serverResponseTime.p95,
    },
    queryLatency: {
      p50: metrics.queryLatency.p50,
      p95: metrics.queryLatency.p95,
    },
    bundleSize: metrics.bundleSize,
    errorRates: metrics.errorRates,
  });
}
```

---

## 7. CI/CD Integration

### 7.1 Bundle Size Check

**File:** `.github/workflows/bundle-size-check.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build with bundle analysis
        run: ANALYZE=true bun run build
      
      - name: Check bundle sizes
        run: bun run scripts/check-bundle-size.ts
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const bundleReport = fs.readFileSync('.bundle-report.md', 'utf-8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: bundleReport,
            });
```

**File:** `scripts/check-bundle-size.ts`

```typescript
import fs from "fs/promises";

const THRESHOLDS = {
  "/workshop": 150 * 1024, // 150KB
  "/workshop/projects/[projectId]/estimates/[nodeId]": 200 * 1024, // 200KB
  "/workshop/library": 150 * 1024, // 150KB
};

async function checkBundleSizes() {
  // Parse build output
  const buildOutput = await fs.readFile(".next/build-manifest.json", "utf-8");
  const manifest = JSON.parse(buildOutput);
  
  const report = [];
  const failures = [];
  
  for (const [route, threshold] of Object.entries(THRESHOLDS)) {
    const size = manifest.routes[route]?.size ?? 0;
    const sizeKB = size / 1024;
    const thresholdKB = threshold / 1024;
    
    report.push(`- **${route}**: ${sizeKB.toFixed(2)}KB (threshold: ${thresholdKB}KB)`);
    
    if (size > threshold) {
      failures.push(
        `${route}: ${sizeKB.toFixed(2)}KB exceeds threshold of ${thresholdKB}KB`
      );
    }
  }
  
  // Write report
  await fs.writeFile(".bundle-report.md", `## Bundle Size Report\n\n${report.join("\n")}`);
  
  if (failures.length > 0) {
    console.error("Bundle size thresholds exceeded:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  
  console.log("All bundle sizes within thresholds.");
}

checkBundleSizes().catch(console.error);
```

### 7.2 Lighthouse CI

**File:** `.github/workflows/lighthouse.yml`

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build application
        run: bun run build
      
      - name: Start production server
        run: bun run start &
      
      - name: Wait for server
        run: sleep 10
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000/workshop
            http://localhost:3000/workshop/projects
            http://localhost:3000/workshop/library
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**File:** `lighthouse-budget.json`

```json
{
  "performance": 90,
  "accessibility": 95,
  "best-practices": 90,
  "seo": 90,
  "metrics": {
    "largest-contentful-paint": 2500,
    "total-blocking-time": 200,
    "cumulative-layout-shift": 0.1,
    "speed-index": 3000
  }
}
```

---

## 8. Incident Response

### 8.1 Performance Incident Playbook

**When:** Alert fires (route transition > 300ms, overlay visibility > 15%)

**Steps:**

1. **Triage (5 minutes)**
   - Check Grafana dashboard for affected routes
   - Identify when regression started (correlate with deployments)
   - Check server logs for errors or slow queries

2. **Investigate (15 minutes)**
   - Run `bun run scripts/performance-benchmark.ts` to reproduce
   - Check recent commits: `git log --oneline --since="24 hours ago"`
   - Profile with Chrome DevTools Performance tab
   - Check Supabase query logs for slow queries

3. **Mitigate (30 minutes)**
   - If caused by recent deployment: Roll back deployment
   - If caused by database issue: Check Supabase status page
   - If caused by code change: Revert specific commit

4. **Resolve (1-2 hours)**
   - Identify root cause
   - Implement fix
   - Test fix locally with benchmarks
   - Deploy fix to production

5. **Post-mortem (next day)**
   - Document incident in `.ai/10_state/incidents/YYYY-MM-DD-performance-regression.md`
   - Identify preventive measures (better monitoring, earlier detection)
   - Update alert thresholds if needed

### 8.2 Rollback Procedures

**Vercel Deployment:**
```bash
# Rollback to previous deployment
vercel rollback
```

**Git Revert:**
```bash
# Revert specific commit
git revert <commit-hash>
git push origin main
```

**Database Migration:**
```bash
# Revert migration
supabase migration repair <migration-name> --status reverted
```

### 8.3 Communication Templates

**Slack Alert:**
```
🚨 Performance Alert: Route Transition Latency

Route: /workshop/projects/[projectId]/estimates/[nodeId]
P50 Duration: 450ms (threshold: 300ms)
Timestamp: 2026-05-29T14:32:00Z

Dashboard: https://grafana.archestimator.com/d/performance
Logs: https://vercel.com/archestimator/logs
```

**Incident Update:**
```
🔧 Performance Incident Update

Status: Investigating
Impact: Estimate workspace route is 2x slower than normal
Started: 2026-05-29T14:30:00Z
Next Update: 2026-05-29T14:45:00Z

Investigation:
- Regression started after deployment #1234
- Caused by N+1 query in getProjectEstimateTreeByNode()
- Fix in progress

ETA: 30 minutes
```

---

**Next:** See `19-react-memo-strategy.md` for client-side optimization via component memoization.
