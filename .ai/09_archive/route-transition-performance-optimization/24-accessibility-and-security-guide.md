# 24 — Accessibility & Security Guide

> ⚠️ **SUPERSEDED.** Contains fetchProjects reference (fake function). Use `CURRENT_CANONICAL_PLAN.md` for security guardrails.

**Status:** SUPERSEDED  
**Created:** 2026-05-29  
**Purpose:** Ensure performance optimizations maintain accessibility standards and don't introduce security vulnerabilities. Covers WCAG compliance, screen reader support, keyboard navigation, and security best practices.

---

## Table of Contents

1. [Accessibility Requirements](#1-accessibility-requirements)
2. [Skeleton Screens Accessibility](#2-skeleton-screens-accessibility)
3. [Error Boundaries Accessibility](#3-error-boundaries-accessibility)
4. [Loading Overlay Accessibility](#4-loading-overlay-accessibility)
5. [Keyboard Navigation](#5-keyboard-navigation)
6. [Screen Reader Support](#6-screen-reader-support)
7. [Security Considerations](#7-security-considerations)
8. [Authentication Migration Security](#8-authentication-migration-security)
9. [Cache Security](#9-cache-security)
10. [Content Security Policy](#10-content-security-policy)

---

## 1. Accessibility Requirements

### 1.1 WCAG 2.1 Compliance

All performance optimizations must maintain **WCAG 2.1 Level AA** compliance.

**Key Principles:**
- **Perceivable:** Information must be presentable in ways users can perceive
- **Operable:** Interface components must be operable by all users
- **Understandable:** Information and UI operation must be understandable
- **Robust:** Content must be interpretable by assistive technologies

### 1.2 Accessibility Testing Tools

| Tool | Type | Use Case |
|------|------|----------|
| **axe DevTools** | Browser extension | Automated WCAG testing |
| **Lighthouse** | Browser DevTools | Accessibility audit |
| **WAVE** | Browser extension | Visual accessibility evaluation |
| **NVDA** | Screen reader (Windows) | Manual screen reader testing |
| **VoiceOver** | Screen reader (macOS/iOS) | Manual screen reader testing |
| **TalkBack** | Screen reader (Android) | Manual screen reader testing |

### 1.3 Accessibility Checklist

Before shipping any performance optimization:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible and clear
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] All images have alt text (or are decorative with `alt=""`)
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Loading states are announced to screen readers
- [ ] No content is conveyed through color alone
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets are at least 44x44px (mobile)

---

## 2. Skeleton Screens Accessibility

### 2.1 Screen Reader Announcements

**Problem:** Skeleton screens are visual-only and not announced to screen readers.

**Solution:** Use `aria-live` regions to announce loading state.

```typescript
// Skeleton with screen reader announcement
function ProjectsSkeleton() {
  return (
    <>
      {/* Visual skeleton */}
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
      
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Loading projects...
      </div>
    </>
  );
}
```

**Key attributes:**
- `aria-hidden="true"` on visual skeleton (prevents screen reader from reading decorative elements)
- `role="status"` indicates this is a status message
- `aria-live="polite"` announces when user is idle
- `aria-atomic="true"` announces entire message, not just changes
- `sr-only` class hides visually but keeps accessible to screen readers

### 2.2 Focus Management

**Problem:** When skeleton appears, focus may be lost or trapped.

**Solution:** Manage focus explicitly.

```typescript
function ProjectsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isLoading && contentRef.current) {
      // Move focus to content when loaded
      contentRef.current.focus();
    }
  }, [isLoading]);
  
  if (isLoading) {
    return <ProjectsSkeleton />;
  }
  
  return (
    <div ref={contentRef} tabIndex={-1}>
      {/* Content */}
    </div>
  );
}
```

**Key points:**
- `tabIndex={-1}` makes element focusable but not in tab order
- Focus moves to content when loaded
- User can continue navigating from content

### 2.3 Reduced Motion

**Problem:** Skeleton animations can cause motion sickness.

**Solution:** Respect `prefers-reduced-motion` media query.

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
```

```typescript
// Tailwind CSS approach
<div className="animate-pulse motion-reduce:animate-none">
  {/* Skeleton */}
</div>
```

---

## 3. Error Boundaries Accessibility

### 3.1 Error Announcements

**Problem:** Error boundaries must announce errors to screen readers.

**Solution:** Use `role="alert"` for critical errors.

```typescript
function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-8 bg-red-50 border border-red-200 rounded-lg"
    >
      <h2 className="text-xl font-semibold text-red-800">
        Something went wrong
      </h2>
      <p className="mt-2 text-red-600">
        We encountered an error loading this page. Please try again.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Try Again
      </button>
    </div>
  );
}
```

**Key attributes:**
- `role="alert"` indicates critical message
- `aria-live="assertive"` interrupts user to announce immediately
- Clear error message and action button
- Focus moves to retry button

### 3.2 Error Logging

**Problem:** Errors must be logged for debugging but not exposed to users.

**Solution:** Log technical details, show user-friendly message.

```typescript
class ErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service (Sentry, LogRocket, etc.)
    logErrorToService(error, errorInfo);
    
    // Don't expose technical details to user
    this.setState({ hasError: true });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback resetErrorBoundary={this.resetError} />;
    }
    return this.props.children;
  }
}
```

### 3.3 Retry Limits

**Problem:** Infinite retry loops can trap users.

**Solution:** Limit retries and offer alternative actions.

```typescript
function ErrorBoundaryFallback({ 
  error, 
  resetErrorBoundary,
  retryCount 
}: ErrorBoundaryFallbackProps) {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    return (
      <div role="alert" className="p-8">
        <h2>Unable to load page</h2>
        <p>We've tried multiple times but the page won't load.</p>
        <div className="mt-4 space-x-4">
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
          <button onClick={() => window.location.href = '/workshop'}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div role="alert" className="p-8">
      <h2>Something went wrong</h2>
      <button onClick={resetErrorBoundary}>
        Try Again ({retryCount}/{maxRetries})
      </button>
    </div>
  );
}
```

---

## 4. Loading Overlay Accessibility

### 4.1 Overlay Announcements

**Problem:** Loading overlay must be announced to screen readers.

**Solution:** Use `aria-live` and `role="status"`.

```typescript
function RouteLoadingOverlay() {
  const isNavigating = useNavigationUiStore((s) => s.isNavigating);
  
  if (!isNavigating) return null;
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/25 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-8 w-8 text-white" /* ... */ />
        <span className="text-white font-medium">Loading...</span>
      </div>
    </div>
  );
}
```

### 4.2 Focus Trapping

**Problem:** Overlay should not trap focus (it's temporary).

**Solution:** Use `aria-hidden` on background content.

```typescript
function App() {
  const isNavigating = useNavigationUiStore((s) => s.isNavigating);
  
  return (
    <>
      <div aria-hidden={isNavigating}>
        {/* Main content */}
      </div>
      {isNavigating && <RouteLoadingOverlay />}
    </>
  );
}
```

**Key points:**
- `aria-hidden="true"` on background when overlay is active
- Screen readers ignore background content
- Focus stays on overlay or is managed by screen reader

### 4.3 Escape Key Handling

**Problem:** Users should be able to cancel navigation with Escape key.

**Solution:** Add keyboard handler to overlay.

```typescript
function RouteLoadingOverlay() {
  const hide = useNavigationUiStore((s) => s.hide);
  
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        hide(); // Cancel navigation
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hide]);
  
  // ... rest of component
}
```

**Note:** This is optional and may not be desired for all apps.

---

## 5. Keyboard Navigation

### 5.1 Focus Indicators

**Problem:** Focus indicators must be visible for keyboard users.

**Solution:** Use high-contrast focus rings.

```css
/* globals.css */
*:focus-visible {
  outline: 2px solid #3b82f6; /* Blue-500 */
  outline-offset: 2px;
}

/* Remove outline for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

**Tailwind CSS approach:**

```typescript
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>
```

### 5.2 Skip Links

**Problem:** Keyboard users need to skip repetitive navigation.

**Solution:** Add skip link at top of page.

```typescript
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>
      
      <header>
        {/* Navigation */}
      </header>
      
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
```

### 5.3 Tab Order

**Problem:** Tab order must follow visual order.

**Solution:** Avoid positive `tabIndex` values.

```typescript
// ✅ Good: Natural tab order
<button>First</button>
<button>Second</button>
<button>Third</button>

// ❌ Bad: Manual tab order
<button tabIndex={3}>Third</button>
<button tabIndex={1}>First</button>
<button tabIndex={2}>Second</button>
```

**Exception:** Use `tabIndex={-1}` for programmatic focus (not in tab order).

---

## 6. Screen Reader Support

### 6.1 Live Regions

**Problem:** Dynamic content changes must be announced.

**Solution:** Use `aria-live` regions.

```typescript
function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {projects.length} projects loaded
      </div>
      
      <ul>
        {projects.map((project) => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
    </>
  );
}
```

**Live region types:**
- `aria-live="polite"` — Announces when user is idle
- `aria-live="assertive"` — Interrupts user immediately
- `aria-live="off"` — Never announces

### 6.2 Landmark Roles

**Problem:** Screen readers need landmarks to navigate page structure.

**Solution:** Use semantic HTML and ARIA landmarks.

```typescript
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header role="banner">
        {/* Site header */}
      </header>
      
      <nav role="navigation" aria-label="Main navigation">
        {/* Navigation links */}
      </nav>
      
      <main role="main" id="main-content">
        {children}
      </main>
      
      <aside role="complementary" aria-label="Sidebar">
        {/* Sidebar content */}
      </aside>
      
      <footer role="contentinfo">
        {/* Site footer */}
      </footer>
    </>
  );
}
```

**Note:** Semantic HTML elements (`<header>`, `<nav>`, `<main>`, etc.) automatically have landmark roles.

### 6.3 Image Alt Text

**Problem:** Images must have descriptive alt text.

**Solution:** Provide meaningful alt text or mark as decorative.

```typescript
// ✅ Good: Descriptive alt text
<img src="project.jpg" alt="Modern office building with glass facade" />

// ✅ Good: Decorative image
<img src="divider.svg" alt="" aria-hidden="true" />

// ❌ Bad: Missing alt text
<img src="project.jpg" />

// ❌ Bad: Generic alt text
<img src="project.jpg" alt="image" />
```

---

## 7. Security Considerations

### 7.1 Security Principles

**Key principles for performance optimizations:**

1. **Don't expose sensitive data** in client-side code
2. **Validate all inputs** on server-side
3. **Use HTTPS** for all requests
4. **Implement CSP** (Content Security Policy)
5. **Sanitize user inputs** to prevent XSS
6. **Use secure cookies** for authentication

### 7.2 Common Vulnerabilities

| Vulnerability | Risk | Mitigation |
|---------------|------|------------|
| **XSS (Cross-Site Scripting)** | High | Sanitize inputs, use CSP, escape output |
| **CSRF (Cross-Site Request Forgery)** | High | Use CSRF tokens, SameSite cookies |
| **Cache Poisoning** | Medium | Validate cache keys, use HTTPS |
| **Auth Bypass** | Critical | Validate auth on server, use middleware |
| **Data Leakage** | High | Don't cache sensitive data, use HTTPS |

---

## 8. Authentication Migration Security

### 8.1 Proxy.ts to Middleware Migration

**Risk:** Migration could break authentication for 16+ protected routes.

**Security Checklist:**

- [ ] **Test all protected routes** after migration
  - `/workshop/*`
  - `/workshop/projects/*`
  - `/workshop/library/*`
  - `/workshop/templates/*`
  - `/workshop/settings/*`
  - `/workshop/projects/[id]/*`
  - `/workshop/projects/[id]/estimates/*`
  - `/workshop/projects/[id]/estimates/[nodeId]/*`
  - `/workshop/projects/[id]/charts/*`
  - And all other protected routes

- [ ] **Test all auth flows**
  - Login (email/password)
  - Login (OAuth: Google, GitHub)
  - Logout
  - Session refresh
  - Email verification
  - Password reset
  - Invite acceptance

- [ ] **Verify session validation**
  - Expired sessions redirect to login
  - Invalid tokens redirect to login
  - Missing cookies redirect to login

- [ ] **Test edge cases**
  - Concurrent requests
  - Rapid navigation
  - Network interruptions
  - Cookie manipulation

### 8.2 Middleware Security Best Practices

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. Validate session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${request.cookies.get('sb-access-token')?.value}`,
        },
      },
    }
  );
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 2. Validate token expiration
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  
  if (expiresAt && expiresAt < now) {
    // Token expired, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 3. Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    '/workshop/:path*',
    // Add other protected routes
  ],
};
```

### 8.3 Rollback Plan

If migration causes auth issues:

```bash
# 1. Revert middleware changes
git revert <middleware-commit-hash>

# 2. Restore proxy.ts
git checkout HEAD~1 src/proxy.ts

# 3. Deploy immediately
vercel --prod
```

---

## 9. Cache Security

### 9.1 Cache Key Validation

**Problem:** Invalid cache keys could leak data between users.

**Solution:** Include user ID in cache key.

```typescript
// ✅ Good: User-scoped cache key
const cacheKey = `projects-${userId}-${workspaceId}`;

// ❌ Bad: Global cache key (data leakage risk)
const cacheKey = `projects-${workspaceId}`;
```

### 9.2 Sensitive Data Caching

**Problem:** Caching sensitive data (PII, auth tokens) is risky.

**Solution:** Never cache sensitive data.

```typescript
// ✅ Good: Cache non-sensitive data
const projects = await unstable_cache(
  async () => fetchProjects(userId),
  [`projects-${userId}`],
  { revalidate: 60 }
)();

// ❌ Bad: Cache sensitive data
const user = await unstable_cache(
  async () => fetchUserWithTokens(userId),
  [`user-${userId}`],
  { revalidate: 60 }
)();
```

### 9.3 Cache Invalidation

**Problem:** Stale cache could show outdated data.

**Solution:** Invalidate cache on mutations.

```typescript
// After creating a project
await createProject(data);

// Invalidate project cache
revalidateTag(`projects-${userId}`);

// After updating a project
await updateProject(projectId, data);

// Invalidate specific project cache
revalidateTag(`project-${projectId}`);
```

---

## 10. Content Security Policy

### 10.1 CSP Headers

**Problem:** XSS attacks can inject malicious scripts.

**Solution:** Implement strict CSP.

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
              "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

### 10.2 CSP Testing

**Tools:**
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) — Validate CSP
- [CSP Reporter](https://report-uri.com/) — Monitor CSP violations

**Testing:**
1. Deploy CSP in report-only mode first
2. Monitor violations for 1 week
3. Fix legitimate violations
4. Switch to enforce mode

---

## 11. Security Testing

### 11.1 Automated Security Scanning

**Tools:**
- **OWASP ZAP** — Automated security testing
- **Snyk** — Dependency vulnerability scanning
- **GitHub Dependabot** — Automated dependency updates

**CI Integration:**

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run OWASP ZAP
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://your-app.vercel.app'
```

### 11.2 Manual Security Testing

**Checklist:**
- [ ] Test auth flows with invalid tokens
- [ ] Test protected routes without auth
- [ ] Test cache invalidation after mutations
- [ ] Test CSP with XSS payloads
- [ ] Test input sanitization
- [ ] Test CSRF protection
- [ ] Review server logs for suspicious activity

---

**Next:** See `25-troubleshooting-guide.md` for common issues and solutions.
