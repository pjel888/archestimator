# 28 — Code Style Guide for Performance Optimizations

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Coding standards, patterns, and anti-patterns for implementing route transition performance optimizations. Ensures consistency, maintainability, and performance.

---

## Table of Contents

1. [General Principles](#1-general-principles)
2. [Component Patterns](#2-component-patterns)
3. [Data Fetching Patterns](#3-data-fetching-patterns)
4. [Caching Patterns](#4-caching-patterns)
5. [Dynamic Import Patterns](#5-dynamic-import-patterns)
6. [Error Handling Patterns](#6-error-handling-patterns)
7. [Performance Patterns](#7-performance-patterns)
8. [Anti-Patterns to Avoid](#8-anti-patterns-to-avoid)
9. [Testing Patterns](#9-testing-patterns)
10. [Documentation Standards](#10-documentation-standards)

---

## 1. General Principles

### 1.1 Performance-First Mindset

**Every line of code should be evaluated for performance impact:**

```typescript
// ❌ Bad: Importing entire library
import _ from 'lodash';

// ✅ Good: Import only what you need
import debounce from 'lodash/debounce';
```

**Ask yourself:**
- Will this increase bundle size?
- Will this cause unnecessary re-renders?
- Will this block the main thread?
- Can this be deferred or lazy-loaded?

### 1.2 Measure Before Optimizing

**Don't optimize based on assumptions:**

```typescript
// ❌ Bad: Optimizing without measuring
const MemoizedComponent = React.memo(Component); // Maybe not needed?

// ✅ Good: Profile first, then optimize
// 1. Use React DevTools Profiler
// 2. Identify slow renders
// 3. Add React.memo only if needed
```

**Tools:**
- React DevTools Profiler
- Chrome DevTools Performance tab
- Lighthouse
- Why-did-you-render (dev only)

### 1.3 Keep It Simple

**Avoid over-engineering:**

```typescript
// ❌ Bad: Complex caching with multiple layers
const cache = new Map();
const memoizedFn = memoize(fn, { cache });
const cachedFn = unstable_cache(memoizedFn, ['key']);

// ✅ Good: Simple caching
const cachedFn = unstable_cache(fn, ['key']);
```

**Rule of thumb:** If you can't explain the optimization in one sentence, it's too complex.

---

## 2. Component Patterns

### 2.1 Component Size

**Maximum component sizes:**

| Type | Max Lines | Example |
|------|-----------|---------|
| Page | 500 | `src/app/workshop/projects/page.tsx` |
| Layout | 300 | `src/app/workshop/layout.tsx` |
| Feature | 800 | `src/components/ProjectList.tsx` |
| Utility | 200 | `src/components/Button.tsx` |

**If component exceeds limit:**
1. Extract sub-components
2. Move logic to custom hooks
3. Use dynamic imports

### 2.2 Component Structure

**Standard component structure:**

```typescript
// 1. Imports (grouped)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { Project } from '@/types';

// 2. Types
type ProjectListProps = {
  projects: Project[];
  onProjectClick: (id: string) => void;
};

// 3. Component
export function ProjectList({ projects, onProjectClick }: ProjectListProps) {
  // 4. Hooks
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  
  // 5. Handlers
  const handleClick = useCallback((id: string) => {
    setSelectedId(id);
    onProjectClick(id);
  }, [onProjectClick]);
  
  // 6. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 7. Render
  return (
    <ul>
      {projects.map(project => (
        <li key={project.id} onClick={() => handleClick(project.id)}>
          {project.name}
        </li>
      ))}
    </ul>
  );
}
```

### 2.3 React.memo Usage

**When to use React.memo:**

```typescript
// ✅ Good: List items that re-render often
export const ProjectCard = React.memo(function ProjectCard({ 
  project, 
  onClick 
}: ProjectCardProps) {
  return (
    <div onClick={() => onClick(project.id)}>
      {project.name}
    </div>
  );
});

// ✅ Good: Expensive components
export const Chart = React.memo(function Chart({ data }: ChartProps) {
  // Complex rendering logic
  return <svg>...</svg>;
});

// ❌ Bad: Components that always re-render
export const Header = React.memo(function Header() {
  const user = useUser(); // Changes on every render
  return <h1>Welcome {user.name}</h1>;
});
```

**Rules:**
- Use for list items (10+ items)
- Use for expensive components (> 100ms render time)
- Don't use for components with frequently changing props
- Always test with React DevTools Profiler

### 2.4 Custom Hooks

**Extract complex logic into custom hooks:**

```typescript
// ✅ Good: Custom hook for prefetch
export function usePrefetchOnHover(href: string) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout>();
  
  const handlePointerEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 200);
  }, [href, router]);
  
  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);
  
  return { handlePointerEnter, handlePointerLeave };
}

// Usage
function ProjectLink({ href }: { href: string }) {
  const { handlePointerEnter, handlePointerLeave } = usePrefetchOnHover(href);
  
  return (
    <Link
      href={href}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      Projects
    </Link>
  );
}
```

**Rules:**
- Name hooks with `use` prefix
- Return object (not array) for better readability
- Include cleanup in useEffect
- Document parameters and return values

---

## 3. Data Fetching Patterns

### 3.1 Server Components

**Prefer server components for data fetching:**

```typescript
// ✅ Good: Server component
export default async function ProjectsPage() {
  const projects = await fetchProjects(); // Server-side fetch
  
  return <ProjectList projects={projects} />;
}

// ❌ Bad: Client component with useEffect
export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(setProjects);
  }, []);
  
  return <ProjectList projects={projects} />;
}
```

**When to use client components:**
- Need interactivity (onClick, onChange)
- Need browser APIs (window, localStorage)
- Need React hooks (useState, useEffect)

### 3.2 React Query

**Use React Query for client-side data fetching:**

```typescript
// ✅ Good: React Query with proper config
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 10 * 60_000, // 10 minutes
  });
}

// ❌ Bad: Manual state management
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);
  
  return { projects, loading, error };
}
```

### 3.3 Prefetching

**Prefetch data on hover:**

```typescript
// ✅ Good: Prefetch on hover with debounce
function usePrefetchOnHover(href: string) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout>();
  
  const handlePointerEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 200); // 200ms debounce
  }, [href, router]);
  
  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);
  
  return { handlePointerEnter, handlePointerLeave };
}

// ❌ Bad: Prefetch immediately (no debounce)
function usePrefetchOnHover(href: string) {
  const router = useRouter();
  
  const handlePointerEnter = useCallback(() => {
    router.prefetch(href); // Fires on every hover!
  }, [href, router]);
  
  return { handlePointerEnter };
}
```

---

## 4. Caching Patterns

### 4.1 React.cache

**Use React.cache for server-side deduplication:**

```typescript
// ✅ Good: Cache repository function
import { cache } from 'react';

export const getProject = cache(async (id: string) => {
  return db.project.findUnique({ where: { id } });
});

// Usage in multiple components
async function ProjectHeader({ id }: { id: string }) {
  const project = await getProject(id); // Cached
  return <h1>{project.name}</h1>;
}

async function ProjectDetails({ id }: { id: string }) {
  const project = await getProject(id); // Same cache
  return <p>{project.description}</p>;
}
```

**Rules:**
- Only use for server-side functions
- Cache is per-request (not shared across users)
- Don't cache user-specific data without user ID in key

### 4.2 unstable_cache

**Use unstable_cache for cross-request caching:**

```typescript
// ✅ Good: Cache with user ID
import { unstable_cache } from 'next/cache';

export const getUserProjects = unstable_cache(
  async (userId: string) => {
    return db.project.findMany({ where: { userId } });
  },
  ['user-projects'], // Cache key
  {
    revalidate: 60, // 60 seconds
    tags: [`user-${userId}-projects`], // For invalidation
  }
);

// Usage
const projects = await getUserProjects(userId);

// Invalidation
revalidateTag(`user-${userId}-projects`);
```

**Rules:**
- Always include user ID in cache key
- Set appropriate revalidate time (60s for lists, 300s for static data)
- Use tags for granular invalidation
- Never cache sensitive data without user ID

### 4.3 React Query Cache

**Configure React Query cache:**

```typescript
// ✅ Good: Proper cache config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes
      gcTime: 10 * 60_000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Rules:**
- Set staleTime based on data freshness needs
- Set gcTime longer than staleTime
- Disable refetchOnWindowFocus for workshop data
- Use retry: 1 for mutations

---

## 5. Dynamic Import Patterns

### 5.1 Named Exports

**Use .then() for named exports:**

```typescript
// ✅ Good: Named export
const MyComponent = dynamic(
  () => import('./MyComponent').then(mod => mod.MyComponent),
  { loading: () => <Skeleton /> }
);

// ❌ Bad: Default import (will fail)
const MyComponent = dynamic(
  () => import('./MyComponent'), // Assumes default export
  { loading: () => <Skeleton /> }
);
```

**Check export type:**
```bash
grep -n "export" src/components/MyComponent.tsx | head -5
```

### 5.2 SSR Control

**Disable SSR for client-only components:**

```typescript
// ✅ Good: Client-only component
const Chart = dynamic(
  () => import('./Chart').then(mod => mod.Chart),
  {
    ssr: false, // Don't render on server
    loading: () => <ChartSkeleton />,
  }
);

// ✅ Good: Server-rendered component
const Button = dynamic(
  () => import('./Button').then(mod => mod.Button),
  {
    ssr: true, // Default, render on server
    loading: () => <ButtonSkeleton />,
  }
);
```

**When to use ssr: false:**
- Component uses window/document APIs
- Component has hydration mismatches
- Component is heavy and not needed for SEO

### 5.3 Loading States

**Always provide loading state:**

```typescript
// ✅ Good: Meaningful loading state
const EstimateSheet = dynamic(
  () => import('./EstimateSheet').then(mod => mod.EstimateSheet),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    ),
  }
);

// ❌ Bad: Generic loading state
const EstimateSheet = dynamic(
  () => import('./EstimateSheet').then(mod => mod.EstimateSheet),
  {
    loading: () => <div>Loading...</div>,
  }
);
```

---

## 6. Error Handling Patterns

### 6.1 Error Boundaries

**Use error boundaries for component errors:**

```typescript
// ✅ Good: Error boundary with retry
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, retryCount: 0 };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToService(error, errorInfo);
  }
  
  handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState(prev => ({
        hasError: false,
        retryCount: prev.retryCount + 1,
      }));
    }
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
        />
      );
    }
    
    return this.props.children;
  }
}
```

**Rules:**
- Limit retries to 3
- Log errors to monitoring service
- Show user-friendly message
- Provide fallback action (retry, reload, go home)

### 6.2 Try-Catch

**Use try-catch for async operations:**

```typescript
// ✅ Good: Try-catch with error handling
async function handleSubmit() {
  try {
    setIsLoading(true);
    await createProject(data);
    router.push('/projects');
  } catch (error) {
    if (error instanceof ValidationError) {
      setFormErrors(error.errors);
    } else {
      toast.error('Failed to create project');
      logError(error);
    }
  } finally {
    setIsLoading(false);
  }
}

// ❌ Bad: No error handling
async function handleSubmit() {
  await createProject(data); // Unhandled error!
  router.push('/projects');
}
```

---

## 7. Performance Patterns

### 7.1 Memoization

**Use useMemo for expensive calculations:**

```typescript
// ✅ Good: Memoize expensive calculation
function ProjectList({ projects }: { projects: Project[] }) {
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);
  
  return <ul>{sortedProjects.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// ❌ Bad: Recalculate on every render
function ProjectList({ projects }: { projects: Project[] }) {
  const sortedProjects = [...projects].sort((a, b) => 
    a.name.localeCompare(b.name)
  ); // Expensive!
  
  return <ul>{sortedProjects.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

### 7.2 useCallback

**Use useCallback for stable function references:**

```typescript
// ✅ Good: Stable callback
function ProjectList({ onProjectClick }: { onProjectClick: (id: string) => void }) {
  const handleClick = useCallback((id: string) => {
    onProjectClick(id);
  }, [onProjectClick]);
  
  return (
    <ul>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onClick={handleClick} />
      ))}
    </ul>
  );
}

// ❌ Bad: New function on every render
function ProjectList({ onProjectClick }: { onProjectClick: (id: string) => void }) {
  return (
    <ul>
      {projects.map(p => (
        <ProjectCard 
          key={p.id} 
          project={p} 
          onClick={(id) => onProjectClick(id)} // New function!
        />
      ))}
    </ul>
  );
}
```

### 7.3 Virtualization

**Use virtualization for long lists:**

```typescript
// ✅ Good: Virtualized list
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedProjectList({ projects }: { projects: Project[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const project = projects[virtualRow.index];
          return (
            <div
              key={project.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ProjectCard project={project} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Rules:**
- Use for lists with 50+ items
- Set accurate estimateSize
- Use overscan for smooth scrolling
- Test on mobile devices

---

## 8. Anti-Patterns to Avoid

### 8.1 Unnecessary Re-renders

```typescript
// ❌ Bad: Object in JSX creates new reference
<ProjectCard 
  project={project} 
  style={{ margin: 10 }} // New object on every render!
/>

// ✅ Good: Memoize object
const style = useMemo(() => ({ margin: 10 }), []);
<ProjectCard project={project} style={style} />
```

### 8.2 Blocking Main Thread

```typescript
// ❌ Bad: Blocking operation in render
function ProjectList({ projects }: { projects: Project[] }) {
  const processed = projects.map(p => heavyComputation(p)); // Blocks!
  return <ul>{processed.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// ✅ Good: Defer to useEffect
function ProjectList({ projects }: { projects: Project[] }) {
  const [processed, setProcessed] = useState([]);
  
  useEffect(() => {
    const result = projects.map(p => heavyComputation(p));
    setProcessed(result);
  }, [projects]);
  
  return <ul>{processed.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

### 8.3 Memory Leaks

```typescript
// ❌ Bad: No cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(() => { /* ... */ }, 1000);
  // Missing cleanup!
}, []);

// ✅ Good: Clean up
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(() => { /* ... */ }, 1000);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
  };
}, []);
```

### 8.4 Over-Optimization

```typescript
// ❌ Bad: Memoizing everything
const MemoizedHeader = React.memo(Header);
const MemoizedFooter = React.memo(Footer);
const MemoizedButton = React.memo(Button);
// ... 50 more memoized components

// ✅ Good: Memoize only what's needed
const MemoizedProjectCard = React.memo(ProjectCard); // List item
const MemoizedChart = React.memo(Chart); // Expensive
```

---

## 9. Testing Patterns

### 9.1 Unit Tests

```typescript
// ✅ Good: Test behavior, not implementation
describe('ProjectList', () => {
  it('renders projects', () => {
    const projects = [
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' },
    ];
    
    render(<ProjectList projects={projects} onProjectClick={() => {}} />);
    
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });
  
  it('calls onProjectClick when project is clicked', async () => {
    const onProjectClick = jest.fn();
    const projects = [{ id: '1', name: 'Project 1' }];
    
    render(<ProjectList projects={projects} onProjectClick={onProjectClick} />);
    
    await userEvent.click(screen.getByText('Project 1'));
    
    expect(onProjectClick).toHaveBeenCalledWith('1');
  });
});
```

### 9.2 Performance Tests

```typescript
// ✅ Good: Test performance
describe('ProjectList performance', () => {
  it('renders 100 projects without blocking', () => {
    const projects = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `Project ${i}`,
    }));
    
    const start = performance.now();
    render(<ProjectList projects={projects} onProjectClick={() => {}} />);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // Should render in < 100ms
  });
});
```

---

## 10. Documentation Standards

### 10.1 Component Documentation

```typescript
/**
 * ProjectList displays a list of projects with virtualization.
 * 
 * @param projects - Array of projects to display
 * @param onProjectClick - Callback when project is clicked
 * 
 * @example
 * ```tsx
 * <ProjectList 
 *   projects={projects} 
 *   onProjectClick={(id) => router.push(`/projects/${id}`)} 
 * />
 * ```
 */
export function ProjectList({ 
  projects, 
  onProjectClick 
}: ProjectListProps) {
  // ...
}
```

### 10.2 Performance Documentation

```typescript
/**
 * usePrefetchOnHover prefetches a route on hover with 200ms debounce.
 * 
 * Performance impact:
 * - Reduces navigation latency by 50-80% for prefetched routes
 * - Adds ~2KB to bundle size
 * - No impact on main thread
 * 
 * @param href - Route to prefetch
 * @returns Event handlers for pointer enter/leave
 */
export function usePrefetchOnHover(href: string) {
  // ...
}
```

---

**Next:** See `29-future-roadmap.md` for long-term vision and Phase 5+ ideas.
