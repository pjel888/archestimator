# 25 — Troubleshooting Guide

> ⚠️ **SUPERSEDED.** Contains getSession() example (security risk), fake fetchProjects queryFn (doesn't exist), and default dynamic import syntax examples (will fail with named exports). Use `CURRENT_CANONICAL_PLAN.md` and `IMPLEMENTATION_MATRIX.md` for current instructions.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Purpose:** Common issues and solutions when implementing route transition performance optimizations. Covers debugging techniques, error messages, and resolution steps.

---

## Table of Contents

1. [Build Errors](#1-build-errors)
2. [Hydration Errors](#2-hydration-errors)
3. [Navigation Issues](#3-navigation-issues)
4. [Cache Issues](#4-cache-issues)
5. [Performance Issues](#5-performance-issues)
6. [bfcache Issues](#6-bfcache-issues)
7. [Authentication Issues](#7-authentication-issues)
8. [Memory Issues](#8-memory-issues)
9. [Debugging Tools](#9-debugging-tools)

---

## 1. Build Errors

### 1.1 Dynamic Import Named Export Error

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'default')
```

**Cause:** Using default import syntax with named export.

**Incorrect:**
```typescript
// ❌ This fails for named exports
const MyComponent = dynamic(() => import('./MyComponent'));
```

**Solution:** Use `.then()` to access named export.

```typescript
// ✅ Correct for named exports
const MyComponent = dynamic(
  () => import('./MyComponent').then(mod => mod.MyComponent)
);
```

**Verification:** Check if component uses `export function` or `export default`.

```bash
# Check export type
grep -n "export" src/components/MyComponent.tsx | head -5
```

### 1.2 Bundle Size Exceeds Threshold

**Error:**
```
❌ /workshop/projects/[id]/estimates/[nodeId]: 350KB exceeds 200KB threshold
```

**Cause:** Route bundle is too large.

**Solutions:**

1. **Code split heavy components:**
```typescript
// Before: Import in page
import { HeavyComponent } from './HeavyComponent';

// After: Dynamic import
const HeavyComponent = dynamic(
  () => import('./HeavyComponent').then(mod => mod.HeavyComponent),
  { loading: () => <Skeleton /> }
);
```

2. **Analyze bundle:**
```bash
ANALYZE=true bun run build
# Open .next/analyze/client.html
# Find large modules and code split them
```

3. **Tree shake unused imports:**
```typescript
// ❌ Imports entire library
import { Button, Card, Input, Select, Modal } from 'antd';

// ✅ Import only what you need
import { Button } from 'antd/es/button';
import { Card } from 'antd/es/card';
```

### 1.3 TypeScript Type Errors

**Error:**
```
Type 'ComponentType<unknown>' is not assignable to type 'ComponentType<Props>'
```

**Cause:** Dynamic import loses type information.

**Solution:** Use type assertion or generic.

```typescript
// Option 1: Type assertion
const MyComponent = dynamic(
  () => import('./MyComponent').then(mod => mod.MyComponent)
) as ComponentType<Props>;

// Option 2: Generic (if supported)
const MyComponent = dynamic<Props>(
  () => import('./MyComponent').then(mod => mod.MyComponent)
);
```

---

## 2. Hydration Errors

### 2.1 Text Content Mismatch

**Error:**
```
Warning: Text content did not match. Server: "Loading..." Client: "Content"
```

**Cause:** Server and client render different content.

**Common causes:**
- Using `Date.now()` or `Math.random()` during render
- Accessing `window` or `document` during SSR
- Conditional rendering based on client-only state

**Solutions:**

1. **Use `useEffect` for client-only logic:**
```typescript
// ❌ Hydration mismatch
function Component() {
  const time = Date.now(); // Different on server vs client
  return <div>{time}</div>;
}

// ✅ No mismatch
function Component() {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    setTime(Date.now());
  }, []);
  
  return <div>{time}</div>;
}
```

2. **Check for browser environment:**
```typescript
// ❌ Hydration mismatch
function Component() {
  const width = window.innerWidth; // window undefined on server
  return <div>{width}</div>;
}

// ✅ No mismatch
function Component() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
  
  return <div>{width}</div>;
}
```

3. **Use `suppressHydrationWarning` for intentional differences:**
```typescript
// ✅ Suppress warning for time-sensitive content
<time suppressHydrationWarning>
  {new Date().toLocaleString()}
</time>
```

### 2.2 Dynamic Import SSR Mismatch

**Error:**
```
Warning: Expected server HTML to contain a matching <div> in <div>
```

**Cause:** Dynamic import with `ssr: false` causes mismatch.

**Solution:** Provide loading state.

```typescript
// ❌ Mismatch
const Chart = dynamic(() => import('./Chart'), { ssr: false });

// ✅ No mismatch
const Chart = dynamic(
  () => import('./Chart'),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 animate-pulse" />
  }
);
```

---

## 3. Navigation Issues

### 3.1 Prefetch Not Working

**Symptom:** Hovering links doesn't prefetch data.

**Debugging steps:**

1. **Check if hook is called:**
```typescript
function usePrefetchOnHover(href: string) {
  console.log('[DEBUG] usePrefetchOnHover called for:', href);
  
  const handlePointerEnter = useCallback(() => {
    console.log('[DEBUG] Pointer enter, prefetching:', href);
    router.prefetch(href);
  }, [href]);
  
  return { onPointerEnter: handlePointerEnter };
}
```

2. **Check React Query DevTools:**
   - Open DevTools → React Query tab
   - Hover over link
   - Check if query appears in cache

3. **Check network tab:**
   - Open DevTools → Network tab
   - Filter by "Fetch/XHR"
   - Hover over link
   - Check if prefetch request is made

**Common causes:**
- Hook not attached to element
- Debounce too long (user doesn't hover long enough)
- Network throttling disabled in DevTools

### 3.2 Overlay Not Appearing

**Symptom:** Loading overlay doesn't show on slow navigations.

**Debugging steps:**

1. **Check navigation-ui-store:**
```typescript
// Add logging to store
const show = useNavigationUiStore((s) => {
  console.log('[DEBUG] show() called');
  return s.show;
});
```

2. **Check timer logic:**
```typescript
// In navigation-ui-store.ts
show: (href: string) => {
  console.log('[DEBUG] show() called, starting 150ms timer');
  
  const timer = setTimeout(() => {
    console.log('[DEBUG] 150ms elapsed, showing overlay');
    set({ isNavigating: true });
  }, 150);
  
  // ...
}
```

3. **Check if navigation completes before 150ms:**
```typescript
// If navigation is < 150ms, overlay won't show (this is correct!)
// Test with network throttling to slow down navigation
```

**Common causes:**
- Navigation too fast (< 150ms) — this is correct behavior
- Store not updating React component
- CSS hiding overlay (check z-index)

### 3.3 Navigation Hangs

**Symptom:** Navigation starts but never completes.

**Debugging steps:**

1. **Check for infinite loops:**
```typescript
// Look for useEffect without dependencies
useEffect(() => {
  fetchData(); // This runs on every render!
});

// ✅ Add dependencies
useEffect(() => {
  fetchData();
}, [id]); // Only run when id changes
```

2. **Check for blocking operations:**
```typescript
// ❌ Blocks navigation
async function handleClick() {
  await heavyComputation(); // Blocks UI
  router.push('/next-page');
}

// ✅ Non-blocking
async function handleClick() {
  router.push('/next-page');
  // Run heavy computation in background
  heavyComputation();
}
```

3. **Check network tab:**
   - Look for failed requests (red)
   - Check for CORS errors
   - Check for authentication errors

**Common causes:**
- Infinite loops in useEffect
- Blocking synchronous operations
- Failed API requests
- Authentication errors

---

## 4. Cache Issues

### 4.1 Stale Data Showing

**Symptom:** Page shows old data after mutation.

**Debugging steps:**

1. **Check if cache is invalidated:**
```typescript
// After mutation
await createProject(data);

// Check if this is called
revalidateTag(`projects-${userId}`);
```

2. **Check React Query cache:**
```typescript
// Open React Query DevTools
// Find the query
// Check "Stale" status
// Check "Updated at" timestamp
```

3. **Check staleTime:**
```typescript
// If staleTime is too long, data won't refetch
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes
    },
  },
});
```

**Solutions:**

1. **Invalidate cache after mutation:**
```typescript
const mutation = useMutation({
  mutationFn: createProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    revalidateTag(`projects-${userId}`);
  },
});
```

2. **Reduce staleTime for frequently updated data:**
```typescript
useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  staleTime: 30_000, // 30 seconds instead of 5 minutes
});
```

3. **Use refetchOnMount:**
```typescript
useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  refetchOnMount: 'always', // Always refetch on mount
});
```

### 4.2 Cache Not Working

**Symptom:** Data is fetched on every navigation (no cache hit).

**Debugging steps:**

1. **Check query key consistency:**
```typescript
// ❌ Different keys = different cache entries
useQuery({ queryKey: ['projects', userId], ... });
useQuery({ queryKey: ['projects', user.id], ... });

// ✅ Same key format
const queryKey = ['projects', userId];
useQuery({ queryKey, ... });
```

2. **Check if QueryClient is shared:**
```typescript
// ❌ New QueryClient on every render
function App() {
  const queryClient = new QueryClient(); // Created on every render!
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  );
}

// ✅ Singleton QueryClient
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  );
}
```

3. **Check unstable_cache usage:**
```typescript
// ❌ Cache key doesn't include user ID (shared across users!)
const data = await unstable_cache(
  async () => fetchData(),
  ['data'], // Missing user ID
  { revalidate: 60 }
)();

// ✅ Include user ID in cache key
const data = await unstable_cache(
  async () => fetchData(userId),
  [`data-${userId}`],
  { revalidate: 60 }
)();
```

---

## 5. Performance Issues

### 5.1 Slow Navigation (> 500ms)

**Symptom:** Navigation takes longer than expected.

**Debugging steps:**

1. **Profile with React DevTools:**
   - Open DevTools → Profiler tab
   - Click "Record"
   - Perform navigation
   - Click "Stop"
   - Look for long bars (slow renders)

2. **Check for unnecessary re-renders:**
```typescript
// Add why-did-you-render (dev only)
import whyDidYouRender from '@welldone-software/why-did-you-render';

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

3. **Check bundle size:**
```bash
ANALYZE=true bun run build
# Check if route bundle is too large
```

**Common causes:**
- Large route bundle (> 200KB)
- Unnecessary re-renders (missing React.memo)
- Blocking operations in render
- Slow API responses

**Solutions:**
- Code split heavy components
- Add React.memo to list items
- Move heavy operations to useEffect
- Optimize API queries

### 5.2 High Memory Usage

**Symptom:** Browser tab uses > 500MB memory.

**Debugging steps:**

1. **Check memory in DevTools:**
   - Open DevTools → Memory tab
   - Take heap snapshot
   - Navigate between pages
   - Take another heap snapshot
   - Compare snapshots

2. **Check for memory leaks:**
```typescript
// ❌ Memory leak: Event listener not cleaned up
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);

// ✅ Cleanup event listener
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

3. **Check React Query cache size:**
```typescript
// Open React Query DevTools
// Check "Cache" tab
// Look for queries with large data
```

**Common causes:**
- Event listeners not cleaned up
- Timers not cleared
- Large data in React Query cache
- Circular references

**Solutions:**
- Clean up event listeners and timers in useEffect
- Reduce cache size:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60_000, // Garbage collect after 5 minutes
    },
  },
});
```

---

## 6. bfcache Issues

### 6.1 Page Not Restored from bfcache

**Symptom:** Back/forward navigation is slow (not instant).

**Debugging steps:**

1. **Check bfcache compatibility:**
   - Open DevTools → Application → Back/forward cache
   - Click "Test back/forward cache"
   - Check for blockers

2. **Check for unload listeners:**
```typescript
// Search for unload/beforeunload
grep -r "addEventListener.*unload" src/
grep -r "addEventListener.*beforeunload" src/
```

3. **Check for Cache-Control headers:**
```bash
# Check response headers
curl -I http://localhost:3000/workshop/projects

# Look for: Cache-Control: no-store
```

**Common blockers:**
- `unload` or `beforeunload` event listeners
- `Cache-Control: no-store` headers
- Open WebSocket connections
- Service Worker not calling `event.respondWith()`

**Solutions:**

1. **Remove unload listeners:**
```typescript
// ❌ Blocks bfcache
window.addEventListener('beforeunload', () => {
  saveState();
});

// ✅ Use pagehide instead
window.addEventListener('pagehide', () => {
  saveState();
});
```

2. **Remove Cache-Control: no-store:**
```typescript
// ❌ Blocks bfcache
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

// ✅ Allow caching
export const revalidate = 60; // Cache for 60 seconds
```

### 6.2 Stale Content After bfcache Restore

**Symptom:** Page shows old data after back/forward navigation.

**Solution:** Refetch data on bfcache restore.

```typescript
useEffect(() => {
  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      // Page restored from bfcache
      // Refetch data to ensure freshness
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  }
  
  window.addEventListener('pageshow', handlePageShow);
  return () => window.removeEventListener('pageshow', handlePageShow);
}, [queryClient]);
```

---

## 7. Authentication Issues

### 7.1 Auth Redirect Loop

**Symptom:** Page redirects between login and protected route infinitely.

**Debugging steps:**

1. **Check middleware logs:**
```typescript
// Add logging to middleware
export async function middleware(request: NextRequest) {
  console.log('[DEBUG] Middleware called for:', request.url);
  
  const session = await getSession(request);
  console.log('[DEBUG] Session:', session);
  
  if (!session && request.nextUrl.pathname.startsWith('/workshop')) {
    console.log('[DEBUG] Redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}
```

2. **Check cookie values:**
```typescript
// In browser console
document.cookie;

// Check for:
// - sb-access-token
// - sb-refresh-token
```

**Common causes:**
- Session not being set correctly
- Middleware not reading cookies
- Cookie domain mismatch

**Solutions:**

1. **Check session creation:**
```typescript
// In login handler
const { data, error } = await supabase.auth.signInWithPassword(credentials);

if (error) {
  console.error('Login failed:', error);
  return;
}

console.log('Session created:', data.session);

// Ensure cookies are set
// Supabase should set cookies automatically
```

2. **Check middleware cookie reading:**
```typescript
// In middleware
const accessToken = request.cookies.get('sb-access-token')?.value;
console.log('[DEBUG] Access token:', accessToken);

if (!accessToken) {
  console.log('[DEBUG] No access token, redirecting to login');
  return NextResponse.redirect(new URL('/login', request.url));
}
```

### 7.2 Session Expired But Not Redirected

**Symptom:** User stays on protected page with expired session.

**Solution:** Check session expiration in middleware.

```typescript
export async function middleware(request: NextRequest) {
  const supabase = createClient(/* ... */);
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Check expiration
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  
  if (expiresAt && expiresAt < now) {
    console.log('[DEBUG] Session expired, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}
```

---

## 8. Memory Issues

### 8.1 Memory Leak in useEffect

**Symptom:** Memory usage increases over time.

**Debugging:**

```typescript
// Add logging to useEffect
useEffect(() => {
  console.log('[DEBUG] useEffect mounted');
  
  return () => {
    console.log('[DEBUG] useEffect unmounted');
  };
}, []);
```

**Common causes:**
- Event listeners not cleaned up
- Timers not cleared
- Subscriptions not unsubscribed

**Solutions:**

```typescript
// ✅ Clean up event listener
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// ✅ Clean up timer
useEffect(() => {
  const timer = setInterval(() => { /* ... */ }, 1000);
  return () => clearInterval(timer);
}, []);

// ✅ Clean up subscription
useEffect(() => {
  const subscription = observable.subscribe(data => { /* ... */ });
  return () => subscription.unsubscribe();
}, []);
```

---

## 9. Debugging Tools

### 9.1 React DevTools

**Profiler:**
- Identify slow renders
- Find unnecessary re-renders
- Measure component render times

**Components:**
- Inspect component props
- Check component state
- View component tree

### 9.2 React Query DevTools

**Queries:**
- View all queries
- Check query status (fresh, stale, fetching)
- Inspect query data
- Manually invalidate queries

**Mutations:**
- View all mutations
- Check mutation status
- Inspect mutation data

### 9.3 Chrome DevTools

**Performance:**
- Record performance profile
- Identify long tasks
- Measure navigation timing

**Network:**
- Monitor network requests
- Check request timing
- Identify failed requests

**Memory:**
- Take heap snapshots
- Identify memory leaks
- Monitor memory usage

**Application:**
- Check bfcache compatibility
- View cookies and storage
- Inspect service workers

### 9.4 Custom Debugging

**Add debug mode:**

```typescript
// src/lib/debug.ts
export const DEBUG = process.env.NODE_ENV === 'development';

export function debug(...args: any[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Usage
debug('Navigation started:', href);
debug('Cache hit:', queryKey);
debug('Render time:', duration);
```

**Performance marks:**

```typescript
// Mark important points
performance.mark('navigation-start');
router.push(href);
performance.mark('navigation-end');

// Measure between marks
performance.measure('navigation', 'navigation-start', 'navigation-end');

// View in DevTools Performance tab
```

---

**Next:** See `09-handoff-next-steps.md` for implementation handoff.
