# 21 — Error Boundary Strategy: Resilience & Recovery

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Implement route-level and component-level error boundaries to prevent full-page crashes, provide graceful degradation, and enable fast recovery without full page reloads.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Why Error Boundaries Matter for Performance](#2-why-error-boundaries-matter-for-performance)
3. [Route-Level Error Boundaries](#3-route-level-error-boundaries)
4. [Component-Level Error Boundaries](#4-component-level-error-boundaries)
5. [Error Recovery Patterns](#5-error-recovery-patterns)
6. [Implementation Plan](#6-implementation-plan)

---

## 1. Current State Analysis

### Codebase Audit

**`error.tsx` files:** 0 (zero)  
**Error boundary components:** 0 (zero)  
**`try/catch` blocks:** ~50 (mostly in data fetching)  
**Global error handler:** None visible

**What this means:**
1. If a component throws during render, the entire page crashes
2. User sees Next.js default error page (white screen or generic error)
3. Only recovery: full page reload (loses all client state)
4. No graceful degradation — one broken component kills the entire UI

### Failure Scenarios

**Scenario 1: Estimate Sheet Content Crash**

```
User navigates to /workshop/projects/123/estimates/456
  → EstimateSheetContent renders
  → Bug: undefined property access in row calculation
  → Component throws during render
  → React unmounts entire component tree
  → User sees white screen
  → Must reload page (loses unsaved edits, scroll position, form state)
```

**Scenario 2: Chart Component Crash**

```
User navigates to /workshop/projects/123/charts
  → ProjectCostBubbleChart renders
  → Bug: D3 scale domain is empty array
  → D3 throws error
  → Component crashes
  → Entire charts page crashes (even though donut chart is fine)
  → User sees error page
```

**Scenario 3: Tree Component Crash**

```
User expands tree node
  → EstimateSheetTree re-renders
  → Bug: tree model has circular reference
  → Infinite loop or stack overflow
  → Browser tab freezes or crashes
  → User must force-quit tab
```

---

## 2. Why Error Boundaries Matter for Performance

### Performance Impact of Crashes

**Without error boundaries:**
1. Component crashes → entire page unmounts
2. User reloads page → full server round-trip (~500ms)
3. React rehydrates → full client-side render (~300ms)
4. User re-navigates to where they were → another navigation (~200ms)
5. **Total recovery time:** ~1000ms + user frustration

**With error boundaries:**
1. Component crashes → error boundary catches
2. Error boundary shows fallback UI (retry button)
3. User clicks retry → component re-renders in isolation (~50ms)
4. **Total recovery time:** ~50ms + minimal frustration

**Performance gain:** 20x faster recovery (1000ms → 50ms)

### Perceived Performance

Error boundaries improve **perceived performance** by:
1. Preventing full-page crashes (user doesn't lose context)
2. Enabling fast retry without navigation
3. Providing clear feedback ("Something went wrong, click to retry")
4. Preserving unrelated UI (sidebar, header, other sections still work)

---

## 3. Route-Level Error Boundaries

### Next.js `error.tsx` Convention

Next.js App Router supports route-level error boundaries via `error.tsx` files:

```typescript
// src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EstimateWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Estimate workspace error:", error);
    
    if (process.env.NODE_ENV === "production") {
      fetch("/api/metrics/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: "/workshop/projects/[projectId]/estimates/[nodeId]",
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          timestamp: Date.now(),
        }),
      }).catch(console.error);
    }
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-ink">
          Unable to load estimate sheet
        </h2>
        <p className="mt-2 text-sm text-tertiary">
          Something went wrong while loading this estimate. You can try again or
          return to the project dashboard.
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
        <Button
          onClick={() => window.history.back()}
          variant="secondary"
        >
          Go back
        </Button>
      </div>
      
      {process.env.NODE_ENV === "development" && (
        <details className="mt-8 max-w-2xl text-left">
          <summary className="cursor-pointer text-sm text-tertiary">
            Error details (development only)
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-4 text-xs">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### Error Boundary Placement Strategy

Create `error.tsx` files at key route segments:

| Route | Error Boundary | Fallback UI |
|-------|---------------|-------------|
| `src/app/error.tsx` | Root error boundary | Full-page error with "Return to home" |
| `src/app/workshop/error.tsx` | Workshop error boundary | Workshop shell + error message |
| `src/app/workshop/projects/[projectId]/error.tsx` | Project error boundary | Project layout + error message |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/error.tsx` | Estimate error boundary | Retry button + "Go to project" |
| `src/app/workshop/library/error.tsx` | Library error boundary | Retry button + "Go to workshop" |

### Error Boundary Hierarchy

```
Root Layout
  └─ error.tsx (catches errors in layout itself)
      └─ Workshop Layout
          └─ error.tsx (catches errors in workshop pages)
              └─ Project Layout
                  └─ error.tsx (catches errors in project pages)
                      ├─ estimates/[nodeId]/page.tsx
                      │   └─ error.tsx (catches estimate-specific errors)
                      └─ charts/page.tsx
                          └─ error.tsx (catches chart-specific errors)
```

**Behavior:** If estimate page crashes, only the estimate content area shows error. Project layout (header, mini-sidebar) remains visible.

---

## 4. Component-Level Error Boundaries

### Custom Error Boundary Component

For finer-grained control, create a reusable error boundary:

```typescript
// src/components/ui/error-boundary.tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    this.props.onError?.(error, errorInfo);
    
    if (process.env.NODE_ENV === "production") {
      fetch("/api/metrics/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: "ErrorBoundary",
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: Date.now(),
        }),
      }).catch(console.error);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }
      
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm text-tertiary">Something went wrong</p>
          <Button onClick={this.reset} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage: Protecting High-Risk Components

#### A. Chart Components (D3 is error-prone)

```typescript
// src/app/workshop/projects/[projectId]/charts/page.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProjectCostDonutChart } from "@/components/workshop/project-charts/ProjectCostDonutChart";
import { ProjectCostBubbleChart } from "@/components/workshop/project-charts/ProjectCostBubbleChart";

export default function ChartsPage() {
  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      <ErrorBoundary
        fallback={(error, reset) => (
          <ChartErrorFallback error={error} onRetry={reset} chartName="Donut Chart" />
        )}
      >
        <ProjectCostDonutChart />
      </ErrorBoundary>
      
      <ErrorBoundary
        fallback={(error, reset) => (
          <ChartErrorFallback error={error} onRetry={reset} chartName="Bubble Chart" />
        )}
      >
        <ProjectCostBubbleChart />
      </ErrorBoundary>
    </div>
  );
}

function ChartErrorFallback({
  error,
  onRetry,
  chartName,
}: {
  error: Error;
  onRetry: () => void;
  chartName: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface">
      <p className="text-sm text-tertiary">Unable to render {chartName}</p>
      <Button onClick={onRetry} variant="secondary" size="sm">
        Retry
      </Button>
    </div>
  );
}
```

**Benefit:** If bubble chart crashes, donut chart still renders. User can retry bubble chart independently.

#### B. Estimate Sheet Content (Complex, High-Risk)

```typescript
// src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";

export default function EstimateWorkspacePage() {
  return (
    <div className="flex h-full">
      <EstimateSheetTree /> {/* Protected by route error.tsx */}
      
      <ErrorBoundary
        fallback={(error, reset) => (
          <EstimateContentErrorFallback error={error} onRetry={reset} />
        )}
      >
        <EstimateSheetContent />
      </ErrorBoundary>
    </div>
  );
}

function EstimateContentErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-ink">
          Unable to load estimate content
        </h3>
        <p className="mt-2 text-sm text-tertiary">
          The tree sidebar is still available. You can try reloading the content
          area or navigating to a different estimate.
        </p>
      </div>
      
      <Button onClick={onRetry} variant="primary">
        Reload content
      </Button>
    </div>
  );
}
```

**Benefit:** If content area crashes, tree sidebar still works. User can select different node or retry content load.

#### C. Tree Components (Recursion Risk)

```typescript
// src/components/workshop/EstimateSheetTree.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function EstimateSheetTree(props: TreeProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <TreeErrorFallback error={error} onRetry={reset} />
      )}
    >
      <TreeImplementation {...props} />
    </ErrorBoundary>
  );
}

function TreeErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 border-r p-4">
      <p className="text-sm text-tertiary">Unable to load tree</p>
      <Button onClick={onRetry} variant="secondary" size="sm">
        Retry
      </Button>
    </div>
  );
}
```

**Benefit:** If tree crashes (infinite loop, stack overflow), content area still works. User can retry tree independently.

#### D. Modals (User-Triggered, Lower Risk)

```typescript
// src/components/workshop/NewProjectForm.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";
import dynamic from "next/dynamic";

const NewProjectModal = dynamic(
  () => import("./NewProjectModal").then(mod => mod.NewProjectModal),
  { loading: () => <ModalSkeleton /> }
);

export function NewProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>New Project</Button>
      
      {isOpen && (
        <ErrorBoundary
          fallback={(error, reset) => (
            <ModalErrorFallback error={error} onClose={() => setIsOpen(false)} onRetry={reset} />
          )}
        >
          <NewProjectModal onClose={() => setIsOpen(false)} />
        </ErrorBoundary>
      )}
    </>
  );
}

function ModalErrorFallback({
  error,
  onClose,
  onRetry,
}: {
  error: Error;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-surface p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Unable to open modal</h3>
        <p className="mt-2 text-sm text-tertiary">
          Something went wrong. You can try again or close this dialog.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={onRetry} variant="primary">
            Try again
          </Button>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Error Recovery Patterns

### Pattern 1: Retry with Exponential Backoff

For transient errors (network timeouts, temporary server issues):

```typescript
// src/lib/error-recovery.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Usage in error boundary
<ErrorBoundary
  fallback={(error, reset) => {
    const handleRetry = async () => {
      try {
        await retryWithBackoff(() => fetchEstimateData());
        reset();
      } catch (e) {
        console.error("Retry failed:", e);
      }
    };
    
    return <RetryButton onClick={handleRetry} />;
  }}
>
  <EstimateSheetContent />
</ErrorBoundary>
```

### Pattern 2: Graceful Degradation

Show partial UI when component fails:

```typescript
// src/components/workshop/project-charts/ChartsDashboard.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function ChartsDashboard() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Primary chart (critical) */}
      <ErrorBoundary
        fallback={<ChartPlaceholder message="Primary chart unavailable" />}
      >
        <ProjectCostDonutChart />
      </ErrorBoundary>
      
      {/* Secondary chart (nice-to-have) */}
      <ErrorBoundary
        fallback={<ChartPlaceholder message="Secondary chart unavailable" />}
      >
        <ProjectCostBubbleChart />
      </ErrorBoundary>
    </div>
  );
}

function ChartPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
      <p className="text-sm text-tertiary">{message}</p>
    </div>
  );
}
```

### Pattern 3: Error Reporting to Monitoring

Centralized error tracking:

```typescript
// src/lib/monitoring/error-reporter.ts
export function reportError(error: Error, context: Record<string, any> = {}) {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    route: typeof window !== "undefined" ? window.location.pathname : "server",
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "node",
    timestamp: Date.now(),
    ...context,
  };
  
  // Send to monitoring service
  if (process.env.NODE_ENV === "production") {
    fetch("/api/metrics/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorReport),
    }).catch(console.error);
    
    // Optional: Send to Sentry, LogRocket, etc.
    if (typeof window !== "undefined" && "Sentry" in window) {
      (window as any).Sentry.captureException(error, { contexts: { react: context } });
    }
  } else {
    console.error("[Dev Error]", errorReport);
  }
}

// Usage in error boundary
<ErrorBoundary
  onError={(error, errorInfo) => {
    reportError(error, {
      componentStack: errorInfo.componentStack,
      componentName: "EstimateSheetContent",
    });
  }}
>
  <EstimateSheetContent />
</ErrorBoundary>
```

### Pattern 4: User-Friendly Error Messages

Translate technical errors to user-friendly messages:

```typescript
// src/lib/error-messages.ts
export function getUserFriendlyMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes("network") || message.includes("fetch")) {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  
  if (message.includes("timeout")) {
    return "The request took too long. Please try again.";
  }
  
  if (message.includes("permission") || message.includes("unauthorized")) {
    return "You don't have permission to view this content.";
  }
  
  if (message.includes("not found")) {
    return "The requested content could not be found.";
  }
  
  return "Something went wrong. Please try again.";
}

// Usage in error boundary
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>{getUserFriendlyMessage(error)}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  )}
>
  <EstimateSheetContent />
</ErrorBoundary>
```

---

## 6. Implementation Plan

### Phase 1: Route-Level Error Boundaries (Day 1)

| Task | Effort | Impact |
|------|--------|--------|
| **1.1 Create root `error.tsx`** | Low | Catches layout errors |
| **1.2 Create workshop `error.tsx`** | Low | Catches workshop page errors |
| **1.3 Create project `error.tsx`** | Low | Catches project page errors |
| **1.4 Create estimate `error.tsx`** | Low | Catches estimate-specific errors |
| **1.5 Create library `error.tsx`** | Low | Catches library-specific errors |

**Validation:**
- Intentionally throw error in estimate page
- Verify only estimate content shows error (project layout remains)
- Click "Retry" button, verify component re-renders
- Check error is logged to console (and metrics endpoint in production)

### Phase 2: Reusable Error Boundary Component (Day 2)

| Task | Effort | Impact |
|------|--------|--------|
| **2.1 Create `ErrorBoundary` class component** | Medium | Reusable across app |
| **2.2 Add error logging to monitoring endpoint** | Low | Centralized error tracking |
| **2.3 Create fallback UI components** | Low | Consistent error UX |

**Validation:**
- Wrap test component in `ErrorBoundary`
- Throw error, verify fallback renders
- Click retry, verify component re-renders
- Check error is logged to `/api/metrics/error`

### Phase 3: Protect High-Risk Components (Day 3)

| Task | Effort | Impact |
|------|--------|--------|
| **3.1 Wrap chart components in `ErrorBoundary`** | Low | Prevents full-page crash on D3 errors |
| **3.2 Wrap `EstimateSheetContent` in `ErrorBoundary`** | Low | Isolates content crashes from tree |
| **3.3 Wrap `EstimateSheetTree` in `ErrorBoundary`** | Low | Isolates tree crashes from content |
| **3.4 Wrap modals in `ErrorBoundary`** | Low | Prevents modal crashes from affecting page |

**Validation:**
- Throw error in bubble chart, verify donut chart still renders
- Throw error in estimate content, verify tree still works
- Click retry buttons, verify components recover

### Phase 4: Advanced Recovery Patterns (Day 4)

| Task | Effort | Impact |
|------|--------|--------|
| **4.1 Implement retry with exponential backoff** | Medium | Handles transient errors |
| **4.2 Add graceful degradation fallbacks** | Low | Shows partial UI on failure |
| **4.3 Implement user-friendly error messages** | Low | Better UX |
| **4.4 Add error boundary tests** | Medium | Prevents regressions |

**Validation:**
- Simulate network timeout, verify retry succeeds after backoff
- Throw error in non-critical component, verify partial UI shows
- Check error messages are user-friendly (not stack traces)

---

## Testing Error Boundaries

### Unit Tests

```typescript
// src/components/ui/__tests__/error-boundary.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Success</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
  
  it("renders fallback when error occurs", () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });
  
  it("calls onError callback when error occurs", () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });
  
  it("resets error state when retry is called", () => {
    let shouldThrow = true;
    
    const { rerender } = render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <button onClick={() => {
            shouldThrow = false;
            reset();
          }}>
            Retry
          </button>
        )}
      >
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Retry")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Retry"));
    
    // After reset, component should render successfully
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// src/app/workshop/projects/[projectId]/estimates/[nodeId]/__tests__/error.test.tsx
import { render, screen } from "@testing-library/react";
import EstimateWorkspacePage from "../page";

// Mock EstimateSheetContent to throw error
jest.mock("@/components/workshop/EstimateSheetContent", () => ({
  EstimateSheetContent: () => {
    throw new Error("Test crash");
  },
}));

describe("Estimate Workspace Error Handling", () => {
  it("shows error boundary when content crashes", () => {
    render(<EstimateWorkspacePage />);
    
    // Tree should still render
    expect(screen.getByTestId("estimate-tree")).toBeInTheDocument();
    
    // Content area should show error fallback
    expect(screen.getByText("Unable to load estimate content")).toBeInTheDocument();
    expect(screen.getByText("Reload content")).toBeInTheDocument();
  });
});
```

---

## Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Recovery time from crash | ~1000ms (full reload) | ~50ms (retry) | 20x faster |
| User frustration | High (lose context) | Low (graceful degradation) | Significant |
| Error visibility | None (silent failures) | High (logged to monitoring) | Complete |
| Partial UI availability | 0% (all-or-nothing) | 80% (isolated failures) | Major |

**Total impact:** Significant improvement in resilience and perceived reliability. Users experience fewer full-page crashes and faster recovery when errors occur.

---

## Summary

This error boundary strategy provides:

1. **Route-level protection** via Next.js `error.tsx` convention
2. **Component-level isolation** via custom `ErrorBoundary` component
3. **Graceful degradation** with partial UI on failure
4. **Fast recovery** with retry buttons (no full page reload)
5. **Centralized error monitoring** for production debugging
6. **User-friendly messages** instead of stack traces

By implementing error boundaries, we prevent full-page crashes, enable fast recovery, and improve perceived performance by 20x (1000ms → 50ms recovery time).

---

**Next:** All new documents complete. Begin improving existing documents (t1-t8).
