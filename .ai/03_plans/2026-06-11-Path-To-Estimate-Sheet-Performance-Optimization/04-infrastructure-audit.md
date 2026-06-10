# 04 — Infrastructure Audit

**Date**: 2026-06-11 | **Status**: Source-audited; runtime measurement pending | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Scope**: Proxy (`src/proxy.ts`), auth, RLS, caching, config

---

## Key Takeaways

1. **Middleware (`src/proxy.ts`) adds ~50-150ms per /workshop request** — `supabase.auth.getUser()` is a secure HTTP round-trip. Consider request-duration caching.
2. **Uses `getUser()` not `getSession()`** — secure JWT validation. ✅ Good security posture.
3. **RLS on all user-data tables** — enforced via custom Postgres functions with nested EXISTS. Profile overhead before optimizing.
4. **CSS baseline is 27KB per page** — `react-complex-tree/style-modern.css` (6,824B) and `lenis/dist/lenis.css` (513B) loaded globally. Move to scoped layouts.
5. **No lazy/session cache for component library yet** — component library data is fetched during the initial sheet path despite changing infrequently; remote/CDN cache is a later measured decision with privacy, invalidation, and cost gates.

---

## 1. Proxy Flow (`src/proxy.ts`)

### File: `src/proxy.ts` (Next.js 16 proxy/middleware)

```
Request → proxy.ts
  │
  ├─ Skip? isStaticFile(path) OR path.startsWith("/_next") OR path.startsWith("/api")
  │   └─ YES → pass through (no auth)
  │
  ├─ Auth route? path starts with "/login"
  │   ├─ User authenticated? → redirect to /workshop
  │   └─ No user → pass through
  │
  ├─ Protected route? path starts with "/workshop"
  │   ├─ Dev auth bypass? hasDevAuthBypass(headers, cookies) → use bypass user
  │   ├─ No Supabase envs? → redirect to /workshop?error=configuration
  │   ├─ User check: supabase.auth.getUser()
  │   │   ├─ No user → redirect to /login?next=[sanitizedPath]
  │   │   └─ Has user → check beta access
  │   │       ├─ No beta access → signOut() + redirect to /beta/access-required
  │   │       └─ Has beta access → continue
  │   └─ Set headers: X-Auth-Request-Path, Cache-Control
  │
  └─ Cache-Control headers:
      ├─ Marketing pages (/, /about, /features, etc.):
      │   Cache-Control: private, no-cache, max-age=0, must-revalidate
      └─ Protected/sensitive routes:
          Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

### Performance Bottleneck
- `supabase.auth.getUser()` is a **secure HTTP round-trip** to Supabase Auth servers to validate the JWT
- This happens on **every /workshop request** (not cached between requests)
- Typical latency: 50-150ms depending on Supabase Auth server proximity

### Recommendation
- Consider session token caching for the request duration (same user across multiple layouts/pages)
- Explore Next.js 16 `after` callback for non-blocking auth refresh

---

## 2. Auth Check Patterns

### Server-Side (Secure)
```typescript
// ✅ CORRECT — used everywhere in codebase
const { data: { user } } = await supabase.auth.getUser()
// Performs HTTP round-trip to validate JWT with Supabase Auth servers
```

```typescript
// ❌ NOT used — would be vulnerable to JWT forgery
const { data: { session } } = await supabase.auth.getSession()
// Only reads local cookie data — can be forged
```

### Key Auth Functions
| Function | File | Behavior |
|----------|------|----------|
| `getCurrentUserContext()` | `src/lib/auth/session.ts` | Returns `UserContext` or `null`. Checks dev bypass → Supabase auth → beta access → profile. Wrapped in `cache()`. |
| `requireCurrentUserContext()` | `src/lib/auth/session.ts` | Calls `getCurrentUserContext()`. If null → `redirect("/login")`. |
| `getCurrentUserTermsAcceptanceStatus()` | `src/lib/legal/terms-acceptance.ts` | Checks `legal_terms_acceptances` table. |
| `getClosedBetaAccessForEmail()` | `src/lib/auth/session.ts` | Checks `closed_beta_users` table. |

### Auth Overhead Per Request
| Check | Queries | Approx Latency |
|-------|---------|---------------|
| Proxy `getUser()` | 1 (Supabase Auth HTTP) | 50-150ms |
| `getCurrentUserContext()` | 1 (profiles) + 1 (beta) | 30-80ms |
| Terms acceptance | 1 (legal_terms_acceptances) | 10-30ms |
| **Total** | **1 HTTP + 3 DB** | **90-260ms** |

---

## 3. RLS Policy Analysis

RLS is enabled on all user-data tables. Access is governed by custom Postgres functions.

### Key RLS Functions
| Function | Purpose | Complexity |
|----------|---------|------------|
| `is_workspace_member(workspace_id)` | Check if auth.uid() is in workspace_members | `SELECT 1 ... LIMIT 1` — fast |
| `is_workspace_admin(workspace_id)` | Check if user has 'admin' role | `SELECT 1 ... LIMIT 1` — fast |
| `can_access_project(project_id)` | Check workspace OR project OR estimate sheet membership | 3 nested `EXISTS` — medium overhead |
| `can_edit_project(project_id)` | Check project edit permission | `EXISTS` — medium |
| `can_access_estimate(estimate_id)` | Check sheet membership OR inherited project access | 2 nested `EXISTS` — medium |
| `can_edit_estimate(estimate_id)` | Check estimate edit permission | `EXISTS` — medium |
| `can_access_realtime_topic()` | Check realtime topic access | `EXISTS` — low |

### RLS Policy Count
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `workspaces` | ✅ (member) | ✅ (creator) | ✅ (admin) | ❌ |
| `projects` | ✅ (access) | ✅ (editor) | ✅ (edit) | ✅ (edit) |
| `estimates` | ✅ (access) | ✅ (edit project) | ✅ (edit) | ✅ (edit) |
| `estimate_nodes` | ✅ (access estimate) | ✅ (edit estimate) | ✅ (edit estimate) | ✅ (edit estimate) |
| `estimate_row_items` | ✅ (access estimate) | ✅ (edit estimate) | ✅ (edit estimate) | ✅ (edit estimate) |
| `profiles` | ✅ (self/admin/overlap) | ❌ | ✅ (self/admin) | ❌ |
| `project_members` | ✅ (project member) | ✅ (admin) | ✅ (admin) | ✅ (admin) |
| `workspace_members` | ✅ (member) | ✅ (admin) | ✅ (admin) | ✅ (admin) |

### RLS Performance Concern
- `can_access_project` and `can_access_estimate` use **nested EXISTS** queries
- On every SELECT, the RLS policy fires one or more subqueries
- For pages loading 15+ tables, this means **15+ RLS policy evaluations** per request

### Recommendation
- Profile RLS overhead with `EXPLAIN ANALYZE` on the full estimate page query set
- Consider materializing access checks per-session via a JWT claim or session variable

---

## 4. Next.js Configuration

### `next.config.ts`
```typescript
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"]  // ✅ Good
}
images: {
  remotePatterns: supabaseImageRemotePatterns  // ✅ Component images from Supabase Storage
}
// Bundle analyzer: @next/bundle-analyzer (when ANALYZE=true)
```

### Missing Performance Configurations
| Feature | Status | Impact |
|---------|--------|--------|
| `optimizePackageImports` for `@tanstack/react-query` | ❌ Missing | Could reduce TanStack Query bundle |
| `optimizePackageImports` for `zustand` | ❌ Missing | Minor — Zustand is tiny |
| `compiler.removeConsole` in production | ❌ Unknown | Could reduce bundle logging overhead |
| `experimental.ppr` (Partial Prerendering) | ❌ Not enabled | Could pre-render static shell |
| `experimental.staleTimes` | ❌ Not configured | Default 30s for dynamic, 5min for static |

---

## 5. Caching Headers Audit

### Middleware (`src/proxy.ts`)
| Route Type | Cache-Control | Effect |
|-----------|--------------|--------|
| Marketing (landing, about, etc.) | `private, no-cache, max-age=0, must-revalidate` | ✅ Allows bfcache, prevents CDN caching of user-specific content |
| Protected (/workshop/*) | `private, no-cache, no-store, max-age=0, must-revalidate` | ✅ Maximum privacy — no browser or CDN caching |

### Route Handlers
| Route | Cache-Control | Revalidation |
|-------|--------------|-------------|
| `/api/share/[token]` | `no-store` | `force-dynamic` |
| `/api/projects/images` (GET) | `private, max-age=300` | None |
| `/api/projects/images` (POST) | `31536000` (upload to Supabase) | None |

### Missing Cache Opportunities With Safety Gates
- Component library data changes infrequently, but it is workspace-scoped. Prefer lazy load plus client/session cache first. Remote/CDN cache requires a documented privacy, invalidation, and cost decision from [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md).
- Estimate sheet data is user-specific — cannot be CDN/shared-cache optimized under the current protected route model (correctly configured).

---

## 6. Dependency Versions

| Package | Version | Notes |
|---------|---------|-------|
| `next` | 16.2.6 | Latest Next.js 16 |
| `react` / `react-dom` | 19.2.6 | React 19 (concurrent features available) |
| `@supabase/ssr` | 0.10.3 | Supabase SSR package |
| `@supabase/supabase-js` | 2.106.2 | Supabase client |
| `@tanstack/react-query` | 5.100.14 | TanStack Query v5 (latest) |
| `zustand` | 5.0.14 | Zustand v5 |
| `d3` | ^7.9.0 | Not loaded on this path |
| `exceljs` | ^4.4.0 | Server-side only |
| `three` | ^0.184.0 | Not loaded on this path |
| `sharp` | ^0.34.5 | Image optimization on server |

---

## 7. Vercel Deployment

### `vercel.json`
```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

- No custom routing rules
- No custom headers beyond Next.js proxy (`src/proxy.ts`)
- No edge function configuration

### Recommendation
- Consider `vercel.json` `headers` for static asset caching (immutable assets with content hashes)
- Explore Vercel Edge Config for feature flags to reduce database lookups

---

## 8. Security Posture

| Check | Status |
|-------|--------|
| Uses `getUser()` not `getSession()` | ✅ Secure |
| RLS on all user-data tables | ✅ Enabled |
| CSP headers (report-only for app, enforced for /share) | ✅ Configured |
| `no-store` on sensitive routes | ✅ Configured |
| No hardcoded secrets in codebase | Source scan should be rerun during implementation closeout |
| Closed beta access gating | ✅ Enabled in proxy (`src/proxy.ts`) |
| Terms acceptance gating | ✅ Enabled in layout |
