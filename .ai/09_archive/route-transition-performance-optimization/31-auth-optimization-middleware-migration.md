# 31 — Auth Optimization & Middleware Migration

> ⚠️ **SUPERSEDED — DO NOT IMPLEMENT.** This document was written under the assumption that `src/proxy.ts` is dead code and that creating `src/middleware.ts` is needed. Both claims are FALSE in Next.js 16, where `proxy.ts` IS the active middleware file (renamed from `middleware.ts`). The recommendation to use `getSession()` for speed is a SECURITY RISK per current Supabase SSR documentation. See `CURRENT_CANONICAL_PLAN.md` §"Corrected Assumptions" #1 and #2, and `ADR_UPDATES.md` ADR-009 and ADR-013 for the corrected decisions.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Superseded by:** `CURRENT_CANONICAL_PLAN.md`, `ADR_UPDATES.md`  
**Historical purpose:** (Retained for reference) Concrete migration plan for moving auth from `WorkshopPageShell`-level Server Component calls to edge middleware.

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [The proxy.ts Non-Middleware Problem](#2-the-proxyts-non-middleware-problem)
3. [Target Architecture](#3-target-architecture)
4. [Migration Plan](#4-migration-plan)
5. [Performance Impact](#5-performance-impact)
6. [Files Changed](#6-files-changed)
7. [Risks & Mitigations](#7-risks--mitigations)

---

## 1. Current Architecture

### Verified Codebase State

```
User Request → [No middleware.ts exists]
                   ↓
              Server Component (page.tsx)
                   ↓
              WorkshopPageShell  ← (reused by every workshop page)
                   ├── cookies()                → dynamic: true
                   ├── getCurrentUserContext()
                   │    ├── createSupabaseServerClient()
                   │    │    ├── headers()       → dynamic: true
                   │    │    └── cookies()       → dynamic: true
                   │    ├── supabase.auth.getUser()  → HTTP round-trip (80-150ms)
                   │    └── supabase.from("profiles").select()  → DB query (20-50ms)
                   └── getSidePanelWidthCssVariables()
                        └── cookies()            → dynamic: true
                   ↓
              Content (Server Component children)
```

### The Problem

The `proxy.ts` file at `src/proxy.ts` contains a fully functional middleware function with the correct `config.matcher` — but it is **never invoked** at runtime because:
- No `src/middleware.ts` file exists to re-export it
- `proxy()` is only called in tests (`auth-proxy.test.ts`)
- All auth checking happens at the Server Component layer, AFTER rendering has begun

**Why proxy.ts was designed as middleware but never connected:**
The `config.matcher` export (line 76-78 in proxy.ts) only works when exported from `middleware.ts`. This strongly suggests proxy.ts was written to be middleware but the `middleware.ts` file was either:
- Never created, or
- Deleted/renamed at some point

**Result:** Every workshop page pays 100-200ms for auth checking that middleware could have done before rendering started.

### Cost Per Navigation

| Component | What It Costs | Location |
|-----------|--------------|----------|
| `cookies()` in WorkshopPageShell | ~20ms + forces dynamic rendering | Every workshop page |
| `headers()` in createSupabaseServerClient | ~10ms + forces dynamic rendering | Every workshop page |
| `cookies()` in createSupabaseServerClient | ~20ms + forces dynamic rendering | Every workshop page |
| `supabase.auth.getUser()` HTTP round-trip | 80-150ms | Every workshop page |
| `profiles` table SELECT | 20-50ms | Every workshop page |
| **Total** | **150-250ms overhead before content** | **Every navigation** |

---

## 2. The proxy.ts Non-Middleware Problem

### Current State (Verified)

```typescript
// src/proxy.ts — line 19 & 76-78
export async function proxy(request: NextRequest) { ... }
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The `config.matcher` pattern matches ALL non-static requests. But because the file is `proxy.ts` not `middleware.ts`, **Next.js never reads this config**. The proxy function is only called in tests.

**No auth checks happen at the edge.** Auth checking is duplicated across:
1. `WorkshopPageShell` → calls `getCurrentUserContext()` (Server Component)
2. `proxy.ts` → has the same auth logic but is dead code

### Why This Is Our Biggest Quick Win

Creating `src/middleware.ts` that re-exports from `proxy.ts` is a **3-line change** with outsized impact:

```typescript
// src/middleware.ts — NEW FILE (3 lines)
export { proxy as middleware } from "@/proxy";
export { config } from "@/proxy";
```

This immediately:
1. Runs auth checks at the edge, before Server Component rendering
2. Redirects unauthenticated users WITHOUT rendering protected pages
3. Caches auth tokens in the request context (available to Server Components via `cookies()`)
4. Reduces wasted server compute for unauthenticated requests by 100-200ms each

---

## 3. Target Architecture

### Phase 1 Target: Middleware Auth Only

```
User Request → middleware.ts (re-exports proxy.ts)
                   ├── Static/file requests → proceed (unchanged)
                   ├── Protected route + not authenticated → redirect /login
                   └── Protected route + authenticated → passthrough
                        ↓
                   WorkshopPageShell
                        ├── getCurrentUserContext()
                        │    └── supabase.auth.getUser()  → reused from middleware context
                        │    └── profiles fetch           → still needed for display name
                        └── content (Server Components)
```

**Key difference:** The middleware handles auth redirects. The Server Component still fetches user context (profile data), but this is a lighter operation because:
- The session cookie has already been validated by middleware
- `supabase.auth.getUser()` benefits from middleware's cookie refresh
- Unauthenticated requests never reach the Server Component at all

### Phase 2 Target: Deferred Profile Fetch

```
WorkshopPageShell
     └── getCurrentUserContext()
          ├── supabase.auth.getUser()  → ~85ms (cached by middleware)
          └── profiles.fetch           → ~35ms (deferrable — use Suspense)
```

Wrap the profile fetch in a Suspense boundary so the page shell renders immediately with a skeleton avatar/name placeholder:

```tsx
// WorkshopPageShell
const currentUser = await getCurrentUserContext(); // Blocks rendering

// → Change to:
const currentUserPromise = getCurrentUserContext(); // Don't await
<>
  <Suspense fallback={<UserSkeleton />}>
    <UserSection userPromise={currentUserPromise} />
  </Suspense>
  {children}
</>
```

---

## 4. Migration Plan

### Step 1: Create middleware.ts (5 minutes, P0)

```typescript
// src/middleware.ts — NEW FILE
export { proxy as middleware } from "@/proxy";
export { config } from "@/proxy";
```

### Step 2: Verify middleware works (15 minutes)

1. Run `bun run dev`
2. Visit `/workshop` while NOT authenticated → should redirect to `/login`
3. Visit `/workshop` while authenticated → should render normally
4. Visit `/login` while authenticated → should redirect to `/workshop`
5. Run `bun run validate`

### Step 3: Remove duplicate auth from WorkshopPageShell (Phase 1)

The middleware already redirects unauthenticated users, so `WorkshopPageShell` no longer needs to handle the `!user` case for redirects. However, it still needs `getCurrentUserContext()` for profile data.

**Change in WorkshopPageShell:**

```typescript
// Before (current):
export async function WorkshopPageShell({ ... }) {
  const currentUser = await getCurrentUserContext(); // also does redirect
  // ... render with user profile
}

// After (optimized):
export async function WorkshopPageShell({ ... }) {
  const currentUser = await getCurrentUserContext(); // now only fetches profile (lighter)
  // ... render with user profile
}
```

The `getCurrentUserContext()` function still fetches the profile, but:
- The auth check in middleware means we never render WorkshopPageShell for unauthenticated users
- We can simplify `requireCurrentUserContext()` to remove its redirect (already handled by middleware)
- Session token validation is now cached in middleware context

### Step 4: Remove Side Panel Width Cookies (Phase 2)

See doc 30 §4.2 for the detailed plan. Migrate from cookie storage to localStorage.

### Step 5: Suspense-Boundary Profile Loading (Phase 3)

Wrap the user profile display in a Suspense boundary so the shell renders immediately:

```tsx
// WorkshopPageShell.tsx
const currentUserPromise = getCurrentUserContext(); // Start fetch, don't block

return (
  <>
    <Sidebar>
      <Suspense fallback={<SidebarUserSkeleton />}>
        <SidebarUser userPromise={currentUserPromise} />
      </Suspense>
    </Sidebar>
    {/* Side panel widths from CSS defaults, no cookie fetch */}
    <main>{children}</main>
  </>
);
```

---

## 5. Performance Impact

### 5.1 Navigation Latency Reduction

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Authenticated navigation to `/workshop/projects` | 250ms | 150ms | 100ms (40%) |
| Redirect to `/login` for unauthenticated request | 135ms (rendered + redirected) | 50ms (edge redirect) | 85ms (63%) |
| Page refresh (already authenticated) | 250ms | 200ms | 50ms (20%) |

### 5.2 Impact on Route Transition Overlay Visibility

| Metric | Before | After |
|--------|--------|-------|
| Median navigation time (authenticated) | ~300ms | ~150ms |
| Overlay visible (>200ms navigation) | ~60% | ~15% |
| Overlay as primary UX | ✅ Yes | Nearly eliminated |

With the overlay's current 250ms minimum display timer and the 150ms proposed show-delay from doc 09:
- **Before:** Most navigations (300ms+) would show the overlay
- **After:** Most navigations (150ms) would complete before the overlay's delay threshold

### 5.3 Server Compute Savings

| Metric | Before | After |
|--------|--------|-------|
| Wasted compute for unauthenticated requests | ~150ms per request | 0ms (redirected at edge) |
| Duplicate auth cookie reads | Called in every page | Once in middleware, cached |
| Profile fetch blocking shell render | Yes (blocks 20-50ms) | Deferred after Phase 3 |

---

## 6. Files Changed

| File | Change | Complexity |
|------|--------|------------|
| **NEW** `src/middleware.ts` | 3-line re-export of proxy | Trivial |
| **MODIFIED** `src/components/workshop/WorkshopPageShell.tsx` | Remove redirect, add Suspense for profile | Medium |
| **MODIFIED** `src/lib/auth/session.ts` | Optional: simplify `requireCurrentUserContext()` (redirect now in middleware) | Low |
| **MODIFIED** `src/lib/repositories/side-panel-widths.ts` | Migrate from cookies to localStorage (Phase 2) | Medium |

**Total: 1 new file, 3 modified files**

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Middleware auth conflicts with existing page-level auth | Low | High | Test all auth flows (login, callback, protected pages, invite, share) before deploying |
| `supabase.auth.getUser()` called twice (middleware + page) | Medium | Medium | React `cache()` already deduplicates `getCurrentUserContext()`. Verify middleware doesn't bypass cache. |
| Middleware adds latency to ALL requests | Low | Low | proxy.ts already exists with correct matcher — it's designed to be middleware. Edge middleware adds ~5-15ms. |
| Static file serving affected | Low | Medium | proxy.ts already skips static files: `pathname.includes(".") || pathname.startsWith("/_next")` |
| Share page auth flow broken | Low | High | Share page has `force-dynamic` and its own auth. Verify middleware skips `/share` or handles it correctly. |

**Rollback:** Delete `src/middleware.ts`. Auth falls back to page-level checks in `WorkshopPageShell`. No data loss.

---

**Next:** See `30-dynamic-rendering-analysis.md` for the full route-by-route caching analysis. See `17-server-side-optimization-strategy.md` for the React.cache expansion strategy.
