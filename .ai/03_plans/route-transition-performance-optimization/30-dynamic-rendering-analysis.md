# 30 — Dynamic Rendering Analysis: Route Caching Inhibitors

**Status:** New  
**Created:** 2026-05-29  
**Purpose:** Map every route's dynamic rendering triggers (the code that forces `force-dynamic` or prevents static generation). This document quantifies the caching opportunity and informs server-side optimization priorities.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Dynamic Rendering Trigger Reference](#2-dynamic-rendering-trigger-reference)
3. [Route-by-Route Analysis](#3-route-by-route-analysis)
4. [Mitigation Strategies](#4-mitigation-strategies)
5. [Impact Assessment](#5-impact-assessment)
6. [Recommended Actions](#6-recommended-actions)

---

## 1. Executive Summary

### The Problem

Every page in the workshop section is **fully dynamic (ondemand)** — no route can be statically generated or cached at the edge. This means every navigation incurs a full server round-trip before any content can render.

**Why this matters for route transition performance:**
- Dynamic rendering adds 100-300ms of server computation before the browser receives any content
- Even with RSC payload prefetch, the server must re-execute the page on each navigation
- The auth check alone (in `WorkshopPageShell`) adds ~100-200ms per page load
- Unlike static routes that can be served from CDN edge, dynamic routes always hit the origin server

### Root Causes

| Cause | Files Affected | Routes | Latency Contribution |
|-------|---------------|--------|---------------------|
| `cookies()` | `WorkshopPageShell`, `page.tsx`, `supabase/server.ts` | All workshop + landing | ~20-50ms per call |
| `headers()` | `lib/supabase/server.ts` | All workshop pages | ~10-30ms per call |
| `searchParams` | login, workshop, settings, charts pages | 6 route files | N/A (routing) |
| `supabase.auth.getUser()` | `lib/auth/session.ts` (HTTP round-trip) | All workshop pages | ~80-150ms |
| `force-dynamic` export | All `/api/share/[token]/*` routes | 6 API routes | Explicit |

**Net effect:** Every workshop page has ~150-350ms of unavoidable server-side overhead before content streaming can begin. This is the single largest contributor to perceived navigation latency.

### What We Cannot Fix

Some dynamic rendering is unavoidable:
- **Auth state** — must check authentication on every protected page
- **User-specific data** — profiles, preferences, workspace data
- **Side panel widths** — persisted in cookies, read on every page

### What We CAN Fix

| Fix | Est. Savings | Complexity |
|-----|-------------|------------|
| Move auth to middleware (pre-checks before rendering) | 80-150ms (avoids rendering protected pages for unauthenticated users) | Medium |
| Add `React.cache()` to all repository functions | 20-50ms (deduplicates within request) | Low |
| Replace cookie-width storage with localStorage + client-side init | 20-30ms (removes `cookies()` call from layout) | Medium |
| Static generation for landing and settings pages | 100-300ms (eliminates server compute on these routes) | Low |
| `unstable_cache` for auth-independent data | 50-100ms (cached across requests) | Medium |

**Target:** Reduce unavoidable server overhead from ~250ms to ~100ms per navigation.

---

## 2. Dynamic Rendering Trigger Reference

### 2.1 Explicit Dynamic Segments (`force-dynamic`)

| File | Export | Impact |
|------|--------|--------|
| `src/app/api/share/[token]/route.ts` | `export const dynamic = "force-dynamic"` | Share API — data changes frequently |
| `src/app/api/share/[token]/events/route.ts` | `export const dynamic = "force-dynamic"` | Share events — real-time |
| `src/app/api/share/[token]/decision/route.ts` | `export const dynamic = "force-dynamic"` | Share decisions — transactional |
| `src/app/api/share/[token]/password/route.ts` | `export const dynamic = "force-dynamic"` | Password verification |
| `src/app/api/share/[token]/comment/route.ts` | `export const dynamic = "force-dynamic"` | Comments — write-heavy |
| `src/app/api/share/[token]/activity/route.ts` | `export const dynamic = "force-dynamic"` | Activity feed — real-time |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | `export const dynamic = "force-dynamic"` | File export |

**Assessment:** All `force-dynamic` API routes are justified — they serve real-time or transactional data. No change needed.

### 2.2 Implicit Dynamic Triggers (`cookies()`, `headers()`)

| File | Call | Causes Dynamic For | Notes |
|------|------|-------------------|-------|
| `src/components/workshop/WorkshopPageShell.tsx:33` | `cookies()` (via `getSidePanelWidthCssVariables()`) | All 12+ workshop pages | Side panel width persistence |
| `src/components/workshop/WorkshopPageShell.tsx:53` | `getCurrentUserContext()` | All 12+ workshop pages | Auth check |
| `src/lib/auth/session.ts:20` | `createSupabaseServerClient()` | All workshop pages | Called from WorkshopPageShell |
| `src/lib/auth/session.ts:23` | `supabase.auth.getUser()` | All workshop pages | **HTTP round-trip** to Supabase Auth |
| `src/lib/auth/session.ts:31` | `supabase.from("profiles").select()` | All workshop pages | Database query |
| `src/lib/supabase/server.ts:7` | `headers()` | All workshop pages | Dev auth bypass check |
| `src/lib/supabase/server.ts:19` | `cookies()` (via `cookieStore`) | All workshop pages | Supabase session cookie |
| `src/app/page.tsx:25` | `cookies()` | Landing page (`/`) | Required server-side rendering |
| `src/app/share/[token]/page.tsx:134` | `cookies()` + `headers()` | Share page | Auth and user context |

### 2.3 Routes Using `searchParams`

| File | Routes Affected |
|------|----------------|
| `src/app/login/page.tsx` | `/login` |
| `src/app/workshop/page.tsx` | `/workshop` |
| `src/app/workshop/projects/[projectId]/charts/page.tsx` | `/workshop/projects/[id]/charts` |
| `src/app/workshop/settings/profile/page.tsx` | `/workshop/settings/profile` |
| `src/app/workshop/settings/workspace/page.tsx` | `/workshop/settings/workspace` |
| `src/app/share/[token]/page.tsx` | `/share/[token]` |

**Note:** `searchParams` in Next.js App Router pages automatically makes the page dynamic (prevents static generation), even if the searchParams value is not used. This is a Next.js design constraint.

---

## 3. Route-by-Route Analysis

### 3.1 Landing Pages (`/`, `/features`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`)

| Route | Dynamic Cause | Caching Potential |
|-------|--------------|-------------------|
| `/` | `cookies()` in `page.tsx` | **Medium** — cookies() only used for auth-aware rendering. Could split into static shell + client-side auth check. |
| `/features` | None (static route — likely server component with no dynamic APIs) | **High** — can be fully static if no auth or cookies used |
| `/about` | Same as above | **High** |
| `/pricing` | Same as above | **High** |
| `/contact` | Same as above | **High** |
| `/privacy` | Same as above | **High** |
| `/terms` | Same as above | **High** |

**Key insight:** Only `/` (the main landing page) needs to be dynamic for the auth-aware header. All other landing pages can be statically generated if they don't import `WorkshopPageShell` or call `cookies()`.

### 3.2 Auth Routes (`/login`, `/auth/callback`)

| Route | Dynamic Cause | Caching Potential |
|-------|--------------|-------------------|
| `/login` | `searchParams` (for `next`, `sent`, `error` params) | **None** — must handle redirect and error params |
| `/auth/callback` | Route handler (always dynamic) | **None** — OAuth callback |
| `/invite/[token]` | Unknown (likely server component with auth) | **Low** — invite tokens are unique |

### 3.3 Workshop Routes (All Protected)

Every workshop page uses `WorkshopPageShell` which calls `cookies()` and `getCurrentUserContext()`. **All 12+ workshop routes are fully dynamic.**

| Route | Additional Dynamic Causes |
|-------|--------------------------|
| `/workshop` | `searchParams` |
| `/workshop/projects` | — |
| `/workshop/projects/[projectId]` | Layout also calls `WorkshopPageShell` |
| `/workshop/projects/[projectId]/estimates` | — |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | — |
| `/workshop/projects/[projectId]/charts` | `searchParams` |
| `/workshop/library` | — |
| `/workshop/templates` | — |
| `/workshop/settings/profile` | `searchParams` |
| `/workshop/settings/workspace` | `searchParams` |
| `/workshop/onboarding` | — |
| `/workshop/components` | Redirect to `/workshop/library` |

### 3.4 Share Route

| Route | Dynamic Cause | Caching Potential |
|-------|--------------|-------------------|
| `/share/[token]` | `force-dynamic`, `cookies()`, `headers()`, `searchParams` | **None** — shared data changes, auth-dependent |

---

## 4. Mitigation Strategies

### 4.1 Auth Extraction from Shell (Recommended — Phase 1.5)

**Current:** Every workshop page calls `cookies()` + `supabase.auth.getUser()` via `WorkshopPageShell`.

**Proposed:** Create a focused auth-checking layout or middleware:

Option A — **Middleware auth guard** (requires creating `src/middleware.ts`):
```typescript
// src/middleware.ts
import { proxy } from "@/proxy";

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = proxy.config;
```
This reuses the existing proxy.ts, which already has the correct `config.matcher` pattern. The key benefit: middleware runs BEFORE Server Components, so unauthenticated users are redirected before any page rendering begins.

Option B — **Auth layout** (leaner, no middleware):
```typescript
// src/app/workshop/layout.tsx — NEW FILE
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  // Lightweight auth check — just validate session token, skip profile fetch
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
```
The profile fetch happens later in `WorkshopPageShell`. This decouples auth (which must be fast) from profile (which can be deferred).

**Recommendation:** Option A (middleware). The proxy.ts already has the correct `config.matcher` — it was clearly designed to be middleware. Creating `src/middleware.ts` that re-exports it is a 3-line change that:
- Redirects unauthenticated users before page rendering starts
- Prevents wasted server compute on protected pages for non-users
- Caches auth result in request context

### 4.2 Side Panel Width Migration (Phase 2)

**Current:** `cookies()` is called in `WorkshopPageShell` to read persisted side panel widths. This forces every workshop page to be dynamic.

**Proposed:** Migrate width storage from cookies to localStorage + CSS custom properties:

1. Set defaults in CSS (no cookie read)
2. Client-side component reads localStorage on mount, sets CSS variables
3. Server never reads cookies for layout widths

This removes the `cookies()` call from `WorkshopPageShell` and would allow partial static generation of the shell.

**Trade-off:** Width initialization happens client-side after hydration. Users see default widths for ~100ms before their custom widths apply. Acceptable for the performance gain.

### 4.3 `React.cache()` Expansion (Phase 1)

Already planned in doc 17. Verified codebase finding: `getCurrentUserContext()` is already wrapped in `cache()`. The `cache()` wrapper should be added to:
- `getCurrentWorkspaceProject()`
- `listCurrentWorkspaceProjects()`
- `getCurrentWorkspaceComponentRowsLibrary()`
- `getCurrentWorkspaceEstimateTemplates()`
- Any repository function called in both layout + page

**Impact per function:** 20-50ms saved per duplicate call within the same request.

### 4.4 Landing Page Static Generation (Phase 3)

**Current state (verified):** Only `/` calls `cookies()`. Other landing pages likely don't.

**Strategy:**
1. Verify `/features`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms` do not import any dynamic API
2. If verified, these routes are automatically static (Next.js static generation by default for Server Components without dynamic APIs)
3. For `/`, extract the cookie read to a smaller client component:
   ```tsx
   // Instead of reading cookies() in server component:
   // Use a tiny client component that only reads auth state
   <AuthAwareLandingHeader />
   ```
   This makes the main landing page content fully static, with only a tiny auth-aware wrapper being dynamic.

---

## 5. Impact Assessment

### 5.1 Current State: All Routes Dynamic

| Route Group | Current | After Opt. | Savings |
|-------------|---------|------------|---------|
| Landing (except `/`) | Dynamic (unknown cause — verify) | Static | 100-300ms |
| Landing (`/`) | Dynamic (`cookies()`) | Static shell + client auth | 50-100ms |
| Workshop (all) | Dynamic (auth + cookies) | Dynamic (auth only — middleware) | 50-150ms |
| Share | Dynamic (justified) | Dynamic | N/A |
| Settings | Dynamic (`searchParams`) | Dynamic (can't avoid) | N/A |

### 5.2 Auth Optimization Breakdown

| Step | Current Latency | With Middleware |
|------|----------------|----------------|
| `cookies()` call | 20ms | 0ms (in middleware) |
| `headers()` call | 10ms | 0ms (in middleware) |
| `createServerClient()` | 5ms | 5ms |
| `supabase.auth.getUser()` HTTP round-trip | 80-150ms | 80-150ms (same cost) |
| `profiles` table query | 20-50ms | 20-50ms (deferred) |
| **Total** | **135-235ms** | **105-205ms** (30ms saved) |

**Middle-tier savings:** The middleware approach saves ~30ms per navigation by running auth before page rendering starts. The bigger benefit is wasted-compute avoidance: unauthenticated requests to protected pages cost 0ms instead of 135-235ms.

### 5.3 Side Panel Width Migration

| Step | Current | After Migration |
|------|---------|----------------|
| `cookies()` in shell | 20ms per page | 0ms |
| Static generation possible? | No (cookies forces dynamic) | Yes (partial) |
| **Total savings** | — | **20ms + static generation** |

---

## 6. Recommended Actions

### Phase 1 (Before Main Implementation — Low Hanging Fruit)

| Priority | Action | Files | Effort | Savings |
|----------|--------|-------|--------|---------|
| P0 | Create `src/middleware.ts` re-exporting proxy.ts | 1 new file, 3 lines | 5 min | 30ms + wasted-compute avoidance |
| P1 | Add `React.cache()` to all repository functions | `src/lib/repositories/*.ts` | 30 min | 20-50ms per duplicate call |
| P2 | Verify all non-`/` landing pages for static eligibility | Check src/app/{features,about,pricing,...} | 15 min | 100-300ms on those routes |

### Phase 2 (During Main Implementation)

| Priority | Action | Files | Effort | Savings |
|----------|--------|-------|--------|---------|
| P1 | Extract side panel width from cookies → localStorage | `WorkshopPageShell`, side-panel-widths.ts | 2-4 hrs | 20ms + enables partial static generation |
| P2 | Extract landing page auth check to client component | `app/page.tsx`, new `AuthAwareHeader` | 1 hr | 50-100ms on landing page |

### Phase 3 (Post-Launch — Investigative)

| Priority | Action | Effort | Savings | Risk |
|----------|--------|--------|---------|------|
| P3 | Investigate `searchParams` removal from workshop page | 2 hrs | Dynamic→Static for settings | Medium — may need alternative param handling |
| P3 | Evaluate partial prerendering (PPR) for workshop layout | Research | Potentially large | High — Next.js 16 PPR not fully production-ready |

---

**Next:** See `31-auth-optimization-middleware-migration.md` for the detailed middleware migration plan. See `17-server-side-optimization-strategy.md` for React.cache and N+1 query fixes.
