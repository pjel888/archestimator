> **SUPERSEDED — HISTORICAL ONLY.**
> Do not use this file for current launch status, blocker counts, owner decisions, or Codex execution order.
> Current source of truth: README.md, 00-production-readiness-dashboard.md, 01-launch-gates-master-checklist.md, 22-ruthless-prioritization-for-beta.md, 23-codex-goal-execution-plan.md, 26-codex-goal-cards.md, and 34-roadmap-consistency-index.md.
>
> *(Previous superseded notice from 2026-05-30 retained below.)*

# Production Readiness Action Plan (SUPERSEDED)

**Last Updated:** 2026-05-30
**Status:** Implementation Blueprint
**Goal:** Address all security, DevOps, production, UX, and UI deficiencies to achieve launch authorization.

---

## Phase A: Security & Compliance Hardening

### Task A.1: Tenant Isolation & RLS Testing
*   **Action:** Add automated integration tests under `tests/integration/rls-isolation.test.ts` to prove that users in Workspace A cannot read or write projects, estimates, library folders, or custom component variants in Workspace B.
*   **Verification:** Run `bun test tests/integration/rls-isolation.test.ts` in CI.

### Task A.2: Redis-Backed Rate Limiting & Lockouts
*   **Action:** Implement Upstash Redis (or equivalent cloud Redis) inside Next.js server actions and API route handlers. Move brute-force lockouts (Shared Link passwords) and Magic Link creation endpoints from in-memory arrays to Redis-backed caches.
*   **Verification:** Run brute-force simulation tests locally, verify lockout states persist across dev server restarts.

### Task A.3: Google Cloud OAuth Verification
*   **Action:** Submit the OAuth consent screen in Google Cloud Console. Update terms & privacy links in console. Provide the required video walkthrough of scopes and verify domain ownership.
*   **Verification:** Authenticated Google login flow displays no "This app is not verified" safety screen.

### Task A.4: Privacy Policy & Terms of Service Drafting
*   **Action:** Replace the pending review stubs in [src/app/privacy/page.tsx](file:///Users/philiplewis/archestimator/src/app/privacy/page.tsx) and [src/app/terms/page.tsx](file:///Users/philiplewis/archestimator/src/app/terms/page.tsx) with finalized legal documents. Detail subprocessor lists (Supabase, Resend, Vercel), cookie definitions, retention periods, and GDPR/CCPA user rights.
*   **Verification:** Pages render correct copy; legal reviewer marks them as `PASS`.

### Task A.5: Secret Scanning in CI
*   **Action:** Integrate Gitleaks (or GitHub Actions GitGuardian workflow) into [.github/workflows/ci.yml](file:///Users/philiplewis/archestimator/.github/workflows/ci.yml) to scan commits for AWS, Supabase, Google, or Resend secrets.
*   **Verification:** CI fails on any commit containing a test API key or service role key.

---

## Phase B: Performance & UX Polish

### Task B.1: Route Transition Performance Optimization (Phases 1-4)
*   **Action:** Wire up prefetch handlers on all Next.js Link primitives. Implement React Server Component (RSC) prefetching and React Query hydration. Use code splitting for dynamic components.
*   **Verification:** Cold navigation transitions benchmark under `100ms` inside the `PerformanceMonitor` log.

### Task B.2: Bundle Size Optimization & Code-Splitting
*   **Action:** Add `@next/bundle-analyzer` to Next.js configuration. Refactor routes containing large client modules:
    *   Lazy load Three.js dynamic scenes inside components.
    *   Lazy load ExcelJS/proposal export processors.
*   **Verification:** Main bundle chunk sizes drop below `200KB` (gzip).

### Task B.3: React Error Boundaries & Custom Error Pages
*   **Action:** Create custom `src/app/not-found.tsx` (404) and `src/app/error.tsx` (500) pages using design system styles. Implement error boundary providers around `/workshop` views to allow inline retries for crashing tables/trees.
*   **Verification:** Simulating rendering crashes displays the custom recovery page.

### Task B.4: Mobile Viewport Protection
*   **Action:** Implement a viewport hook. On routes starting with `/workshop` (excluding `/share`), if screen width is less than `768px`, show a responsive overlay blocking the editor interface with copy recommending desktop access.
*   **Verification:** Emulate mobile screens in Chrome DevTools and verify the desktop-only guard blocks the dashboard.

### Task B.5: Typography CLS (Cumulative Layout Shift) Elimination
*   **Action:** Update public layouts to utilize `@next/font` for local font preloading. Eliminate external stylesheets fetching Google Fonts dynamically during page load.
*   **Verification:** Lighthouse audit report records `0` CLS.

---

## Phase C: DevOps & Production Setup

### Task C.1: Automated Deployment Pipeline (Vercel CD)
*   **Action:** Integrate GitHub repository with Vercel. Map deployment triggers for pull requests (deploy preview) and pushes to `main` (production).
*   **Verification:** Git pushes automatically build and publish to preview/production URLs.

### Task C.2: Staging Environment Isolation
*   **Action:** Spin up a separate Supabase project for staging. Setup environment secrets in Vercel staging environments to point to the staging database pool.
*   **Verification:** Staging builds perform schema migrations independently from production.

### Task C.3: Automated Database Migration Tests in CI
*   **Action:** Update `ci.yml` workflow to spin up a local Supabase Docker container, apply all migration scripts in sequence from `/supabase/migrations`, and verify that the schema builds without errors or constraint conflicts.
*   **Verification:** CI validate command runs database builds cleanly.

### Task C.4: Sentry Error Reporting Integration
*   **Action:** Install Sentry SDK. Configure serverless functions and client-side error interceptors to forward unhandled exceptions to Sentry.
*   **Verification:** Generate test runtime exception on staging environment and verify it logs in Sentry dashboard.

### Task C.5: Email Domain Verification (SPF/DKIM/DMARC)
*   **Action:** Map DNS txt records for SPF, DKIM, and DMARC verification in the domain registry to authenticate the Resend email domain.
*   **Verification:** Sent test invitations return a `PASS` status for SPF, DKIM, and DMARC in Gmail headers.

### Task C.6: Backup & Disaster Recovery Verification
*   **Action:** Write a backup recovery runbook `docs/devops/disaster-recovery.md`. Verify manual export and restore of database schema + storage contents from production to local Docker.
*   **Verification:** Execute restoration walkthrough once and sign off on runbook validation.

---

## Phase D: Data Rights & Compliance Integration

### Task D.1: Self-Serve Account Deletion (GDPR)
*   **Action:** Add a "Delete Account" button in user settings. Create a transactional database function `delete_user_data()` that cascades deletions across workspaces (if sole owner), profiles, and user tables.
*   **Verification:** Verify user is fully scrubbed from database records upon execution.

### Task D.2: Data Portability (DSAR Export)
*   **Action:** Add an "Export My Data" button in workspace settings. Build a server action that aggregates all projects, estimates, components, and activity events for the user's workspace, generating a downloadable JSON zip archive.
*   **Verification:** Downloaded JSON file parses successfully and contains complete workspace records.
