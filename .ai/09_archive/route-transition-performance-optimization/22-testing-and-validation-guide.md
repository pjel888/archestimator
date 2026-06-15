# 22 — Testing & Validation Guide

> ⚠️ **SUPERSEDED.** Contains references to fake functions (fetchProjects, etc.). Use `BENCHMARK_PROTOCOL.md` and `IMPLEMENTATION_MATRIX.md` for current validation steps.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Purpose:** Comprehensive testing strategy for all performance optimizations. Ensures quality, prevents regressions, and validates improvements.

---

## Table of Contents

1. [Baseline Metrics Collection](#1-baseline-metrics-collection)
2. [Testing Pyramid](#2-testing-pyramid)
3. [Unit Testing Strategy](#3-unit-testing-strategy)
4. [Integration Testing Strategy](#4-integration-testing-strategy)
5. [E2E Testing Strategy](#5-e2e-testing-strategy)
6. [Performance Testing Strategy](#6-performance-testing-strategy)
7. [Regression Testing Plan](#7-regression-testing-plan)
8. [Validation Checklists](#8-validation-checklists)

---

## 1. Baseline Metrics Collection

### 1.1 Pre-Implementation Baseline (Phase 0)

**CRITICAL:** You must collect baseline metrics BEFORE implementing any optimizations. Without baseline, you cannot prove improvement.

#### Step 1: Environment Setup

```bash
# 1. Ensure production build
bun run build

# 2. Start production server
bun run start

# 3. Open Chrome DevTools
# - Navigate to http://localhost:3000
# - Open Performance tab
# - Enable "Enable advanced paint instrumentation"
# - Enable "Screenshots"

# 4. Set throttling
# - CPU: 4x slowdown
# - Network: Fast 3G (or custom: 1.6 Mbps down, 750 Kbps up, 150ms RTT)
```

#### Step 2: Collect Navigation Metrics

For each route transition in the table below, perform 3 runs and record the median:

| From | To | Metric | Run 1 | Run 2 | Run 3 | Median |
|------|----|--------|-------|-------|-------|--------|
| `/workshop` | `/workshop/projects` | Time to Interactive (ms) | | | | |
| `/workshop/projects` | `/workshop/projects/[id]` | Time to Interactive (ms) | | | | |
| `/workshop/projects/[id]` | `/workshop/projects/[id]/estimates` | Time to Interactive (ms) | | | | |
| `/workshop/projects/[id]/estimates` | `/workshop/projects/[id]/estimates/[nodeId]` | Time to Interactive (ms) | | | | |
| `/workshop` | `/workshop/library` | Time to Interactive (ms) | | | | |
| `/workshop` | `/workshop/templates` | Time to Interactive (ms) | | | | |
| `/` (landing) | `/workshop` | Time to Interactive (ms) | | | | |

**How to measure "Time to Interactive":**
1. Clear browser cache (DevTools → Application → Clear storage → Clear site data)
2. Start recording in Performance tab
3. Click navigation link
4. Stop recording when page is fully interactive (no spinners, all elements clickable)
5. Measure from "Navigation Start" to "First Input Delay < 50ms"

#### Step 3: Collect Bundle Size Metrics

```bash
# Run build with analyzer
ANALYZE=true bun run build

# Record bundle sizes for each route:
```

| Route | First Load JS (KB) | Shared JS (KB) | Route-Specific JS (KB) |
|-------|-------------------|----------------|------------------------|
| `/` (landing) | | | |
| `/workshop` | | | |
| `/workshop/projects` | | | |
| `/workshop/projects/[id]` | | | |
| `/workshop/projects/[id]/estimates/[nodeId]` | | | |
| `/workshop/library` | | | |

#### Step 4: Collect Core Web Vitals

Use Lighthouse to collect Core Web Vitals for each route:

```bash
npx lighthouse http://localhost:3000/workshop/projects --output=json --output-path=./lighthouse-baseline.json
```

| Route | LCP (s) | FID (ms) | CLS | TBT (ms) | Performance Score |
|-------|---------|----------|-----|----------|-------------------|
| `/workshop` | | | | | |
| `/workshop/projects` | | | | | |
| `/workshop/projects/[id]/estimates/[nodeId]` | | | | | |
| `/workshop/library` | | | | | |

#### Step 5: Collect Overlay Visibility Rate

1. Install the `PerformanceMonitor` component (Task 0.2)
2. Navigate through all routes 10 times each
3. Record how many times the overlay appeared

| Route | Navigations | Overlay Appearances | Visibility Rate |
|-------|-------------|---------------------|-----------------|
| `/workshop` → `/workshop/projects` | 10 | | |
| `/workshop/projects` → `/workshop/projects/[id]` | 10 | | |
| `/workshop/projects/[id]/estimates` → `[nodeId]` | 10 | | |
| `/workshop` → `/workshop/library` | 10 | | |

**Save baseline to:** `.ai/03_plans/route-transition-performance-optimization/baseline-metrics-[date].md`

### 1.2 Post-Implementation Metrics

After each phase, repeat the baseline collection and compare:

```markdown
## Phase 1 Results

### Navigation Latency Improvement

| Route | Baseline | Phase 1 | Improvement | Target Met? |
|-------|----------|---------|-------------|-------------|
| `/workshop` → `/workshop/projects` | 450ms | 280ms | -38% | ✅ |
| `/workshop/projects` → `[id]` | 520ms | 350ms | -33% | ✅ |

### Bundle Size Improvement

| Route | Baseline | Phase 1 | Improvement | Target Met? |
|-------|----------|---------|-------------|-------------|
| `/workshop/projects/[id]/estimates/[nodeId]` | 450KB | 320KB | -29% | ✅ |

### Overlay Visibility Rate

| Route | Baseline | Phase 1 | Improvement | Target Met? |
|-------|----------|---------|-------------|-------------|
| All routes | 100% | 65% | -35% | ✅ |
```

---

## 2. Testing Pyramid

### 2.1 Test Distribution

```
        /\
       /  \        E2E Tests (10%)
      / E2E\       - Critical user journeys
     /______\      - Cross-browser compatibility
    /        \
   /Integration\   Integration Tests (30%)
  /    Tests    \  - Component interactions
 /______________\  - Data flow between components
/                \
/   Unit Tests    \ Unit Tests (60%)
\________________/ - Individual functions
                   - Pure logic
                   - Utilities
```

### 2.2 Test Coverage Goals

| Test Type | Coverage Goal | Tools |
|-----------|---------------|-------|
| Unit Tests | 80% line coverage | Vitest |
| Integration Tests | Critical paths | Vitest + Testing Library |
| E2E Tests | Happy paths | Playwright |
| Performance Tests | All routes | Lighthouse CI |

---

## 3. Unit Testing Strategy

### 3.1 PerformanceMonitor Component

**File:** `tests/vitest/performance-monitor.test.tsx`

```typescript
import { render } from "@testing-library/react";
import { PerformanceMonitor } from "@/components/performance-monitor";

describe("PerformanceMonitor", () => {
  it("logs navigation metrics on route change", () => {
    const consoleSpy = vi.spyOn(console, "log");
    
    render(<PerformanceMonitor />);
    
    // Simulate route change
    // ... trigger pathname change
    
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Perf] Navigation:",
      expect.objectContaining({
        route: expect.any(String),
        duration: expect.any(Number),
      })
    );
  });
});
```

### 3.2 usePrefetchOnHover Hook

**File:** `tests/vitest/use-prefetch-on-hover.test.ts`

```typescript
import { renderHook, act } from "@testing-library/react";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";

describe("usePrefetchOnHover", () => {
  it("prefetches after 200ms debounce", async () => {
    vi.useFakeTimers();
    
    const routerPrefetch = vi.fn();
    const queryClientPrefetch = vi.fn();
    
    const { result } = renderHook(() =>
      usePrefetchOnHover([{
        href: "/workshop/projects",
        prefetch: routerPrefetch,
      }])
    );
    
    act(() => {
      result.current.handlePointerEnter("/workshop/projects");
    });
    
    // Should not prefetch immediately
    expect(routerPrefetch).not.toHaveBeenCalled();
    
    // Advance 200ms
    vi.advanceTimersByTime(200);
    
    expect(routerPrefetch).toHaveBeenCalledWith("/workshop/projects");
    
    vi.useRealTimers();
  });
  
  it("cancels prefetch on pointer leave", () => {
    vi.useFakeTimers();
    
    const routerPrefetch = vi.fn();
    
    const { result } = renderHook(() =>
      usePrefetchOnHover([{
        href: "/workshop/projects",
        prefetch: routerPrefetch,
      }])
    );
    
    act(() => {
      result.current.handlePointerEnter("/workshop/projects");
    });
    
    act(() => {
      result.current.handlePointerLeave("/workshop/projects");
    });
    
    vi.advanceTimersByTime(200);
    
    expect(routerPrefetch).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
```

### 3.3 React.memo Components

**File:** `tests/vitest/estimate-row-item.test.tsx`

```typescript
import { render } from "@testing-library/react";
import { EstimateRowItem } from "@/components/workshop/EstimateSheetContent";

describe("EstimateRowItem", () => {
  it("does not re-render when props are unchanged", () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    
    const props = {
      row: { id: "1", description: "Test", quantity: 10 },
      onUpdate,
      onDelete,
    };
    
    const { rerender } = render(<EstimateRowItem {...props} />);
    
    // Re-render with same props
    rerender(<EstimateRowItem {...props} />);
    
    // Component should not re-render (React.memo)
    // This is hard to test directly, but we can verify via React DevTools Profiler
  });
  
  it("re-renders when props change", () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    
    const { rerender } = render(
      <EstimateRowItem
        row={{ id: "1", description: "Test", quantity: 10 }}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
    
    // Re-render with different props
    rerender(
      <EstimateRowItem
        row={{ id: "1", description: "Updated", quantity: 20 }}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
    
    // Component should re-render
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });
});
```

### 3.4 Error Boundary

**File:** `tests/vitest/error-boundary.test.tsx`

```typescript
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Success</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
  
  it("renders fallback when error occurs", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
  
  it("calls onError callback when error occurs", () => {
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    render(
      <ErrorBoundary fallback={<div>Error</div>} onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });
});
```

---

## 4. Integration Testing Strategy

### 4.1 Navigation Flow

**File:** `tests/vitest/navigation-flow.test.tsx`

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";

describe("Navigation Flow", () => {
  it("navigates from workshop to projects with skeleton", async () => {
    render(
      <AppProviders>
        <WorkshopPage />
      </AppProviders>
    );
    
    const user = userEvent.setup();
    
    // Click "Projects" link
    await user.click(screen.getByRole("link", { name: "Projects" }));
    
    // Skeleton should appear immediately
    await waitFor(() => {
      expect(screen.getByTestId("projects-skeleton")).toBeInTheDocument();
    });
    
    // Projects should load
    await waitFor(() => {
      expect(screen.getByText("Project 1")).toBeInTheDocument();
    });
  });
  
  it("prefetches on hover", async () => {
    const routerPrefetch = vi.fn();
    
    render(
      <AppProviders>
        <SidebarNavItemRow href="/workshop/projects" onPrefetch={routerPrefetch} />
      </AppProviders>
    );
    
    const user = userEvent.setup();
    
    // Hover over link
    await user.hover(screen.getByRole("link", { name: "Projects" }));
    
    // Wait for debounce
    await waitFor(() => {
      expect(routerPrefetch).toHaveBeenCalledWith("/workshop/projects");
    }, { timeout: 300 });
  });
});
```

### 4.2 Cache Behavior

**File:** `tests/vitest/cache-behavior.test.tsx`

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("Cache Behavior", () => {
  it("serves from cache on revisit within 5 minutes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60_000,
        },
      },
    });
    
    const fetchSpy = vi.fn().mockResolvedValue({ projects: [] });
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsPage fetchProjects={fetchSpy} />
      </QueryClientProvider>
    );
    
    // Initial load
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    
    // Navigate away
    // ... (simulate navigation)
    
    // Navigate back within 5 minutes
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsPage fetchProjects={fetchSpy} />
      </QueryClientProvider>
    );
    
    // Should not fetch again (served from cache)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  
  it("invalidates cache on mutation", async () => {
    const queryClient = new QueryClient();
    
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    
    // Create project
    await act(async () => {
      await result.current.mutateAsync({ name: "New Project" });
    });
    
    // Cache should be invalidated
    expect(queryClient.getQueryState(["projects"])).toBeUndefined();
  });
});
```

---

## 5. E2E Testing Strategy

### 5.1 Critical User Journeys

**File:** `tests/playwright/performance.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Performance", () => {
  test("navigation to projects page is fast", async ({ page }) => {
    // Set throttling
    await page.context().route("**/*", async (route) => {
      await route.continue({
        // Simulate Fast 3G
      });
    });
    
    await page.goto("/workshop");
    
    // Measure navigation time
    const startTime = Date.now();
    await page.click('a[href="/workshop/projects"]');
    await page.waitForSelector('[data-testid="projects-grid"]');
    const duration = Date.now() - startTime;
    
    // Should be < 300ms after optimizations
    expect(duration).toBeLessThan(300);
  });
  
  test("overlay does not appear for cached routes", async ({ page }) => {
    await page.goto("/workshop/projects");
    
    // Navigate to project detail
    await page.click('[data-testid="project-card-1"]');
    await page.waitForSelector('[data-testid="project-detail"]');
    
    // Navigate back to projects
    await page.click('a[href="/workshop/projects"]');
    
    // Overlay should not appear (cached)
    await expect(page.locator('[data-route-overlay]')).not.toBeVisible({
      timeout: 500,
    });
  });
  
  test("skeleton appears before content", async ({ page }) => {
    // Slow down network
    await page.route("**/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    
    await page.goto("/workshop");
    await page.click('a[href="/workshop/projects"]');
    
    // Skeleton should appear immediately
    await expect(page.locator('[data-testid="projects-skeleton"]')).toBeVisible({
      timeout: 100,
    });
    
    // Content should load eventually
    await expect(page.locator('[data-testid="projects-grid"]')).toBeVisible({
      timeout: 5000,
    });
  });
});
```

### 5.2 Cross-Browser Testing

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
```

---

## 6. Performance Testing Strategy

### 6.1 Lighthouse CI

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
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

**Run Lighthouse CI:**

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run Lighthouse CI
lhci autorun
```

### 6.2 Bundle Size Monitoring

**File:** `.github/workflows/bundle-size.yml`

```yaml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: ANALYZE=true bun run build
      - name: Check bundle sizes
        run: |
          # Parse build output and check sizes
          # Fail if any route exceeds threshold
          bun run scripts/check-bundle-size.ts
```

**File:** `scripts/check-bundle-size.ts`

```typescript
import { readFileSync } from "fs";

const THRESHOLDS = {
  "/": 200_000, // 200KB
  "/workshop": 150_000, // 150KB
  "/workshop/projects": 150_000,
  "/workshop/projects/[id]/estimates/[nodeId]": 200_000,
  "/workshop/library": 150_000,
};

// Parse .next/build-manifest.json
const manifest = JSON.parse(readFileSync(".next/build-manifest.json", "utf-8"));

let hasError = false;

for (const [route, maxSize] of Object.entries(THRESHOLDS)) {
  const pageFiles = manifest.pages[route] || [];
  const totalSize = pageFiles.reduce((sum, file) => {
    const stats = statSync(`.next/${file}`);
    return sum + stats.size;
  }, 0);
  
  if (totalSize > maxSize) {
    console.error(`❌ ${route}: ${totalSize}KB exceeds ${maxSize}KB threshold`);
    hasError = true;
  } else {
    console.log(`✅ ${route}: ${totalSize}KB`);
  }
}

if (hasError) {
  process.exit(1);
}
```

---

## 7. Regression Testing Plan

### 7.1 Performance Regression Detection

**When to run:** After every PR merge to `main`

**How to detect:**

1. **Automated Lighthouse CI** — Runs on every PR, fails if performance score drops > 5 points
2. **Bundle size check** — Fails if any route bundle increases > 10KB
3. **Navigation timing** — Custom script measures navigation times, alerts if > 20% slower

**File:** `scripts/check-performance-regression.ts`

```typescript
import { readFileSync } from "fs";

const baseline = JSON.parse(readFileSync("baseline-metrics.json", "utf-8"));
const current = JSON.parse(readFileSync("current-metrics.json", "utf-8"));

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

### 7.2 Functional Regression Testing

**Existing E2E tests** must continue to pass after performance optimizations:

```bash
bun run test:e2e
```

**Key tests to monitor:**
- `tests/playwright/auth.spec.ts` — Auth flows (login, logout, session refresh)
- `tests/playwright/estimate-workspace.spec.ts` — Estimate workspace functionality
- `tests/playwright/project-management.spec.ts` — Project CRUD
- `tests/playwright/component-library.spec.ts` — Component library operations

### 7.3 Visual Regression Testing

**Tool:** Playwright screenshots

**File:** `tests/playwright/visual-regression.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("skeleton screens match baseline", async ({ page }) => {
    await page.goto("/workshop");
    await page.click('a[href="/workshop/projects"]');
    
    // Capture skeleton screenshot
    await expect(page).toHaveScreenshot("projects-skeleton.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
  
  test("error boundaries match baseline", async ({ page }) => {
    // Trigger error
    await page.goto("/workshop/projects/invalid-id");
    
    // Capture error boundary screenshot
    await expect(page).toHaveScreenshot("error-boundary.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
```

---

## 8. Validation Checklists

### 8.1 Phase 1 Validation Checklist

- [ ] `bun run build` succeeds
- [ ] `bun run validate` passes (lint + type-check)
- [ ] `bun run test` passes (unit + integration)
- [ ] `bun run test:e2e` passes (E2E tests)
- [ ] Navigation latency improved by 30-50% (compare to baseline)
- [ ] Bundle sizes reduced (compare to baseline)
- [ ] Overlay visibility rate < 70% (compare to baseline 100%)
- [ ] No console errors in production
- [ ] No hydration mismatches
- [ ] All routes render correctly
- [ ] Auth flows work (login, logout, session refresh)
- [ ] Mutations invalidate cache correctly

### 8.2 Phase 1.5 Validation Checklist

- [ ] `bun run build` succeeds
- [ ] `bun run validate` passes
- [ ] `bun run test` passes
- [ ] `bun run test:e2e` passes
- [ ] Proxy.ts migration: all auth flows work (16+ protected routes)
- [ ] React.memo: React DevTools Profiler shows skipped renders
- [ ] Layout caching: sub-navigation is 90ms faster
- [ ] Error boundaries: component errors show retry UI, not full-page crash
- [ ] Navigation latency improved by 50-70% (cumulative from baseline)
- [ ] Overlay visibility rate < 40%

### 8.3 Phase 2 Validation Checklist

- [ ] `bun run build` succeeds
- [ ] `bun run validate` passes
- [ ] `bun run test` passes
- [ ] `bun run test:e2e` passes
- [ ] Prefetch: React Query DevTools shows prefetched data on hover
- [ ] bfcache: Chrome DevTools bfcache test passes for all routes
- [ ] N+1 fixes: server query count is O(1) not O(N)
- [ ] Navigation latency < 150ms for most routes
- [ ] Overlay visibility rate < 10%

### 8.4 Phase 3 Validation Checklist

- [ ] `bun run build` succeeds
- [ ] `bun run validate` passes
- [ ] `bun run test` passes
- [ ] `bun run test:e2e` passes
- [ ] Virtualization: smooth scrolling with 100+ items (60fps)
- [ ] Streaming: shell renders immediately, content streams in
- [ ] Navigation latency < 100ms for most routes
- [ ] Overlay visibility rate < 5%
- [ ] All peak-load scenarios meet degradation thresholds

---

**Next:** See `23-browser-compatibility-and-mobile-guide.md` for browser and mobile considerations.
