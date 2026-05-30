> **SUPERSEDED — HISTORICAL ONLY.**
> Do not use this file for current launch status, blocker counts, owner decisions, or Codex execution order.
> Current source of truth: README.md, 00-production-readiness-dashboard.md, 01-launch-gates-master-checklist.md, 22-ruthless-prioritization-for-beta.md, 23-codex-goal-execution-plan.md, 26-codex-goal-cards.md, and 34-roadmap-consistency-index.md.
>
> *(Previous superseded notice from 2026-05-30 retained below.)*

# Production Readiness Audit (SUPERSEDED)

**Last Updated:** 2026-05-30
**Status:** Complete Audit
**Scope:** DevOps, Security, Production, UX, and UI readiness evaluation for Archestimator.

---

## 1. DevOps Audit

### 1.1 CI/CD & Deployments
*   **Current State:**
    *   CI pipeline defined in [.github/workflows/ci.yml](file:///Users/philiplewis/archestimator/.github/workflows/ci.yml).
    *   Runs typechecks (`tsc`), ESLint, app-specific design system lints, unit tests, vitest DOM tests, builds the Next.js app, and runs Playwright E2E smoke tests.
*   **Gaps & Lacking Items:**
    *   **No Automated CD Pipeline:** Code is built in CI but there is no deployment pipeline to Vercel (or similar hosting provider) upon merging to `main`.
    *   **No Preview Environments Sync:** No configured pipeline to deploy pull requests to isolated preview environments with test databases.
*   **Risk Level:** Medium

### 1.2 Development / Staging / Production Parity
*   **Current State:**
    *   App connects to a single remote Supabase instance `ebxxqidacheyapmmzavr` for both local development (using bypass hooks) and production.
*   **Gaps & Lacking Items:**
    *   **No Staging Environment:** Lack of a dedicated staging Supabase project. Developing and testing against a single remote production database risks schema/data corruption.
    *   **No Test Seed Script:** The database relies on manual migration seed files (e.g., `20260518110000_attach_philip_seed_data.sql`), but does not have a clean seed script to reset a local/staging environment to a known baseline.
*   **Risk Level:** High

### 1.3 Database Migration Lifecycle
*   **Current State:**
    *   Migrations live in [supabase/migrations/](file:///Users/philiplewis/archestimator/supabase/migrations/).
    *   Local migration state is manually pushed or compared.
*   **Gaps & Lacking Items:**
    *   **No Automated Migration Validation:** CI does not test migrations against a clean DB pool before building the app.
    *   **Manual Drift Checking:** No automated alerts or checks to detect schema drift between local files and the remote Supabase database.
*   **Risk Level:** Medium

### 1.4 Logging, Observability & Crash Reporting
*   **Current State:**
    *   Standard `console.log` statements are used on the server.
    *   Development mode includes a custom client-side `PerformanceMonitor`.
    *   Shared Link layers contain basic circuit breakers and offline memory queues.
*   **Gaps & Lacking Items:**
    *   **No Production APM/Telemetry:** No Application Performance Monitoring tool (such as Sentry, Logrocket, or Datadog) is installed to capture client-side and server-side errors, uncaught exceptions, or database query latencies.
    *   **No Structured Log Aggregation:** Server logs are lost when Vercel instances recycle. No log forwarding to a centralized log shipper (e.g., Logflare, Better Stack, or Axiom).
*   **Risk Level:** High

### 1.5 Disaster Recovery (Backup & Restore)
*   **Current State:**
    *   Relies on default Supabase automated database backups (daily for Pro tiers).
*   **Gaps & Lacking Items:**
    *   **No Documented Recovery Runbook:** No disaster recovery walkthrough exists. There is no verified proof of restoring database backups, storage backups, or rolling back migration states in case of catastrophic loss.
    *   **No Point-in-Time Recovery (PITR) Configured:** PITR is not explicitly configured or tested.
*   **Risk Level:** Critical

### 1.6 Environment Variables Management
*   **Current State:**
    *   Sample configuration defined in [.env.example](file:///Users/philiplewis/archestimator/.env.example).
*   **Gaps & Lacking Items:**
    *   **No Runcheck/Validation Script:** No startup script checks for the presence and format of required variables (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DEEPSEEK_API_KEY`) at server startup. Missing env vars fail silently at runtime.
*   **Risk Level:** Low

---

## 2. Security Audit

### 2.1 Row-Level Security (RLS) & Tenancy Isolation
*   **Current State:**
    *   RLS is enabled on core app tables (e.g. `workspaces`, `projects`, `estimates`, `estimate_nodes`, `estimate_row_items`, `shared_links`).
    *   Security definer functions enforce correct tenant isolation.
*   **Gaps & Lacking Items:**
    *   **No Automated RLS Isolation Testing:** The test suite does not include automated test cases that explicitly attempt to cross-read or cross-write workspace boundaries (e.g., trying to read Workspace A's projects while authenticated as a member of Workspace B) to guarantee isolation.
*   **Risk Level:** High (due to potential for data leakage if policies regression occurs)

### 2.2 Auth Security & Hardening
*   **Current State:**
    *   Supabase Auth is configured for Google OAuth (primary) and email sign-in links (fallback).
    *   Safe redirect sanitizer enforces allow-listed hosts.
    *   Shared Link receiver uses an in-memory/session progressive rate limit for password brute-force hardening (5 attempts, 15-minute lockout).
*   **Gaps & Lacking Items:**
    *   **In-Memory Rate Limiting:** Brute-force lockout and rate limits are stored in server/client memory. If the server instance restarts or serverless functions scale, lockouts are cleared. Needs a persistent store (e.g., Redis or database-backed tracking).
    *   **No Captcha Gate:** Magic link routes and auth callback endpoints lack CAPTCHA protection, leaving the application vulnerable to automated auth abuse.
    *   **Supabase Dashboard Security Evidence Missing:** Redacted evidence of Supabase Auth settings (rate limits, OTP expiration times, signup policies, anonymous logins disabled) is missing.
*   **Risk Level:** High

### 2.3 Content Security Policy (CSP) & HTTP Security Headers
*   **Current State:**
    *   Enforced CSP on `/share/:path*` via `next.config.ts`.
    *   Report-Only CSP is applied to public marketing pages (`/`, `/about`, `/features`, `/pricing`, `/contact`).
*   **Gaps & Lacking Items:**
    *   **No Enforced CSP on App Workspace:** The private `/workshop/*` app workspace lacks an enforced Content Security Policy because older dependencies (such as `@firecms/neat@0.8.0` and inline styling in react-complex-tree) require `'unsafe-inline'` and `'unsafe-eval'`.
    *   **Inline Style Blocker:** Full, strict CSP is blocked until custom styling overrides are implemented or external packages are refactored.
*   **Risk Level:** High

### 2.4 API Security & Route Guards
*   **Current State:**
    *   AI routes (`/api/ai/ask`, `/api/ai/package-builder`) verify user session server-side.
    *   `src/proxy.ts` protects `/workshop` routes.
*   **Gaps & Lacking Items:**
    *   **API Route Protection Gaps:** `src/proxy.ts` intentionally bypasses the `/api` prefix. Standard API routes (like `/api/projects/images` or `/api/component-library/*`) must enforce internal auth checks manually. We need a comprehensive review of all `/api` routes to ensure no unauthenticated write/read is possible.
*   **Risk Level:** High

### 2.5 Secrets Management
*   **Current State:**
    *   Workspace clean of secrets.
*   **Gaps & Lacking Items:**
    *   **No Static Secrets Scanning:** There is no tool (like Gitleaks or Trufflehog) in the CI pipeline to block accidental commits containing API keys, private keys, or Supabase service-role keys.
*   **Risk Level:** Medium

### 2.6 Legal & Compliance Policies
*   **Current State:**
    *   Privacy Policy ([src/app/privacy/page.tsx](file:///Users/philiplewis/archestimator/src/app/privacy/page.tsx)) and Terms of Service ([src/app/terms/page.tsx](file:///Users/philiplewis/archestimator/src/app/terms/page.tsx)) are placeholder status pages saying "pending review."
*   **Gaps & Lacking Items:**
    *   **No Reviewed Privacy Policy or Terms of Service:** Public self-serve sign-ups cannot launch without final legal copy.
    *   **No Subprocessor List:** Required by GDPR.
    *   **No Data Retention Policy:** No automated scheduling to delete accounts or anonymize data.
    *   **No Cookie Consent Persistence:** Cookie consent selection is recorded in a cookie, but consent records are not archived/tracked on the database for auditing purposes.
*   **Risk Level:** Critical (regulatory blocker)

---

## 3. Production Audit

### 3.1 Domain, DNS, & SSL Setup
*   **Current State:**
    *   Local setup and development hostname only.
*   **Gaps & Lacking Items:**
    *   **No Domain Mapping:** Production domains are not mapped or DNS settings configured.
    *   **No SSL/TLS Policy:** SSL/TLS certificate configuration is pending.
*   **Risk Level:** High (launch blocker)

### 3.2 Email Infrastructure
*   **Current State:**
    *   Resend is configured as the email client for sending invitations.
*   **Gaps & Lacking Items:**
    *   **Domain Authentication Pending:** The sender email domain needs SPF, DKIM, and DMARC verification inside the DNS configuration to prevent transactional emails (invites, password requests) from going into spam.
*   **Risk Level:** High

### 3.3 Third-Party OAuth App Verification
*   **Current State:**
    *   Google Cloud OAuth setup in progress.
*   **Gaps & Lacking Items:**
    *   **OAuth Credentials in Testing Mode:** The Google OAuth app in Google Cloud Console is not verified. This means users will see a "This app is not verified by Google" safety warning on signup, and active signups will be capped at 100 users.
*   **Risk Level:** High

### 3.4 Build Optimizations & Bundle Audit
*   **Current State:**
    *   Bun is used for bundling and transpilation.
*   **Gaps & Lacking Items:**
    *   **Heavy Core Bundles:** Large packages like `three` (Three.js), `d3`, `exceljs`, and `react-complex-tree` are loaded in main route layouts.
    *   **No Bundle Analysis:** Lack of bundle analysis tool (e.g., Next Bundle Analyzer) to track chunk sizes.
    *   **Missing Code-Splitting:** Dynamic imports (`next/dynamic`) are not utilized for heavy components (e.g. 3D view renders, XLSX export processors).
*   **Risk Level:** Medium

### 3.5 Custom Error Pages & Boundaries
*   **Current State:**
    *   Default Next.js error layouts.
*   **Gaps & Lacking Items:**
    *   **No Custom 404 / 500 Pages:** Missing bespoke styled error pages matching the design system.
    *   **Missing App-Wide React Error Boundaries:** Uncaught React render crashes will crash the entire UI without presenting a friendly fallback page with a reload action.
*   **Risk Level:** Medium

---

## 4. UX Audit

### 4.1 Route Transition Performance
*   **Current State:**
    *   `BfcacheHandler`, `PerformanceMonitor`, and hover-prefetch hook are built. Loading skeletons are placed on workshop paths.
*   **Gaps & Lacking Items:**
    *   **Transitions Still Exceed 100ms:** Real navigation transition performance has not met the sub-100ms cold transition target. Prefetch wiring on links, RSC hydration optimizations, and query preheating remain uncompleted.
*   **Risk Level:** Medium

### 4.2 Network Resiliency & Offline Mode
*   **Current State:**
    *   In-memory queues capture failing mutations.
*   **Gaps & Lacking Items:**
    *   **Data Loss on Reload:** Offline mutation queues are stored in React state. If a user reloads their browser while offline or with a failing request, their draft changes are lost.
*   **Risk Level:** Medium

### 4.3 Mobile Viewport Compatibility
*   **Current State:**
    *   Shared Link receiver has mobile responsive screens.
*   **Gaps & Lacking Items:**
    *   **No Mobile Guard on Workshop:** The private `/workshop` app workspace is highly complex and desktop-centric. Renders on smaller screen widths result in overlapping columns and unclickable buttons. UX lacks a mobile redirect or responsive warning modal telling users to open the app on a desktop.
*   **Risk Level:** Low

### 4.4 User Data Rights (GDPR / CCPA)
*   **Current State:**
    *   Settings page allows updating profile parameters.
*   **Gaps & Lacking Items:**
    *   **No Account Deletion UI:** Users cannot delete their accounts self-serve.
    *   **No DSAR Data Export UI:** No feature allows a user to export all their workspace data as a JSON/CSV file.
*   **Risk Level:** High (regulatory compliance)

---

## 5. UI Audit

### 5.1 Typography Layout Shift (CLS)
*   **Current State:**
    *   App uses system font stacks and SF Pro fonts.
*   **Gaps & Lacking Items:**
    *   **Font Flash / Layout Shifts:** Google fonts on public pages load asynchronously, causing visible Cumulative Layout Shift (CLS) during page loading. Fonts need to be preloaded or hosted locally.
*   **Risk Level:** Low

### 5.2 Primitive Design System Compliance
*   **Current State:**
    *   `bun run lint:design-system` enforces constraints on font size, weight, and radius.
*   **Gaps & Lacking Items:**
    *   **Incomplete Primitive Reuse:** Several older views still use raw custom button tailwind classes (`bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded`) instead of reusing `Button` or standard inputs.
*   **Risk Level:** Low
