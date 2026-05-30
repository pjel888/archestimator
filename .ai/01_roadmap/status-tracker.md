> **SUPERSEDED — HISTORICAL ONLY.**
> Do not use this file for current launch status, blocker counts, owner decisions, or Codex execution order.
> Current source of truth: README.md, 00-production-readiness-dashboard.md, 01-launch-gates-master-checklist.md, 22-ruthless-prioritization-for-beta.md, 23-codex-goal-execution-plan.md, 26-codex-goal-cards.md, and 34-roadmap-consistency-index.md.
>
> *(Previous superseded notice from 2026-05-30 retained below.)*

# Production Readiness Status Tracker (SUPERSEDED)

**Last Updated:** 2026-05-30
**Status:** Live Tracker

---

## 1. High-Level Progress Dashboard

| Dimension | Completed Tasks | Total Tasks | Completion % | Status |
| :--- | :---: | :---: | :---: | :---: |
| **DevOps** | 1 | 7 | 14.3% | 🔴 Lacking CD & Environments |
| **Security** | 4 | 9 | 44.4% | 🟡 Verification Pending |
| **Production** | 1 | 7 | 14.3% | 🔴 Launch Blocked |
| **UX** | 2 | 6 | 33.3% | 🟡 Optimizations Pending |
| **UI** | 2 | 4 | 50.0% | 🟢 Minor Adjustments |
| **Overall** | **10** | **33** | **30.3%** | 🔴 Pre-launch MVP |

---

## 2. Detailed Task Tracker

### 2.1 DevOps Tasks

| Ref | Task Description | Priority | Status | Verification Method / Target File |
| :--- | :--- | :---: | :---: | :--- |
| **DO-1** | CI Validation Workflow Setup | P0 | **DONE** | Check [.github/workflows/ci.yml](file:///Users/philiplewis/archestimator/.github/workflows/ci.yml) |
| **DO-2** | Automated CD Pipeline (Vercel Integration) | P0 | **LEFT TO DO** | Deploy triggers on push to `main` |
| **DO-3** | Staging Database Environment Isolation | P0 | **LEFT TO DO** | Set up separate staging Supabase Project |
| **DO-4** | Automated Migration Validation in CI | P1 | **LEFT TO DO** | Update `ci.yml` to run test Supabase DB docker |
| **DO-5** | Production APM (Sentry) Setup | P1 | **LEFT TO DO** | Sentry SDK configuration in layout and API |
| **DO-6** | Centralized Server Log Aggregation | P1 | **LEFT TO DO** | Connect Vercel integrations to log shipper |
| **DO-7** | Disaster Recovery / Backup Runbook | P2 | **LEFT TO DO** | Write and execute manual recovery script |

### 2.2 Security Tasks

| Ref | Task Description | Priority | Status | Verification Method / Target File |
| :--- | :--- | :---: | :---: | :--- |
| **SE-1** | Supabase Auth Magic Link & Redirects Setup | P0 | **DONE** | Verify [src/lib/auth/redirects.ts](file:///Users/philiplewis/archestimator/src/lib/auth/redirects.ts) |
| **SE-2** | Tenant Isolation (Workspace RLS) | P0 | **DONE** | Core policies in database migrations |
| **SE-3** | Shared Link Password Protection Rate Limit | P0 | **DONE** | Brute force lockout in Shared Link receiver |
| **SE-4** | Google Cloud OAuth Console App Verification | P0 | **LEFT TO DO** | Status inside Google Cloud Console API Dashboard |
| **SE-5** | Privacy Policy & Terms Page Final Copy | P0 | **LEFT TO DO** | Replace stubs in [src/app/privacy/page.tsx](file:///Users/philiplewis/archestimator/src/app/privacy/page.tsx) and [src/app/terms/page.tsx](file:///Users/philiplewis/archestimator/src/app/terms/page.tsx) |
| **SE-6** | Automated Multi-Tenant RLS Penetration Tests | P0 | **LEFT TO DO** | Write `tests/integration/rls-isolation.test.ts` |
| **SE-7** | Persistent Rate Limiting (Redis Backing) | P1 | **LEFT TO DO** | Connect Upstash Redis in server actions |
| **SE-8** | Strict CSP Gating (Workshop App Workspace) | P1 | **LEFT TO DO** | Enforce CSP in `next.config.ts`, refactor `@firecms/neat` styles |
| **SE-9** | Static Secrets Scanner in CI (Gitleaks) | P2 | **LEFT TO DO** | Add Gitleaks workflow step to `ci.yml` |

### 2.3 Production Tasks

| Ref | Task Description | Priority | Status | Verification Method / Target File |
| :--- | :--- | :---: | :---: | :--- |
| **PR-1** | Production Email Infra Setup (Resend Client) | P0 | **DONE** | Verify [src/lib/email/resend-client.ts](file:///Users/philiplewis/archestimator/src/lib/email/resend-client.ts) |
| **PR-2** | Custom Domain Mapping & DNS Settings | P0 | **LEFT TO DO** | DNS records configured in domain register |
| **PR-3** | SSL/TLS Certificate Deployment | P0 | **LEFT TO DO** | HTTPS confirmation on live URL |
| **PR-4** | Custom Domain Authentication for Email (Resend) | P0 | **LEFT TO DO** | SPF, DKIM, and DMARC verification records |
| **PR-5** | Heavy Modules Bundle Optimization | P1 | **LEFT TO DO** | Use `next/dynamic` code splitting for Three.js / ExcelJS |
| **PR-6** | Custom Error Pages (404 / 500) | P1 | **LEFT TO DO** | Create `src/app/not-found.tsx` and `error.tsx` |
| **PR-7** | Next Bundle Analyzer Integration | P2 | **LEFT TO DO** | Install `@next/bundle-analyzer` |

### 2.4 UX Tasks

| Ref | Task Description | Priority | Status | Verification Method / Target File |
| :--- | :--- | :---: | :---: | :--- |
| **UX-1** | Page-Level Loading Skeletons on Workshop | P0 | **DONE** | Check [src/app/workshop/library/loading.tsx](file:///Users/philiplewis/archestimator/src/app/workshop/library/loading.tsx) |
| **UX-2** | A/B Testing Infrastructure & Consent Cookie | P0 | **DONE** | Check [src/lib/ab-testing/](file:///Users/philiplewis/archestimator/src/lib/ab-testing/) and [src/lib/landing/consent.ts](file:///Users/philiplewis/archestimator/src/lib/landing/consent.ts) |
| **UX-3** | Route Transition Optimization (Phases 1-4) | P0 | **LEFT TO DO** | Benchmark transitions under 100ms in development |
| **UX-4** | Mobile viewport guard on private routes | P1 | **LEFT TO DO** | Add responsive block layout to `/workshop` |
| **UX-5** | Persistent Offline Mutation Queue | P1 | **LEFT TO DO** | Save queue to IndexDB/localStorage to survive reloads |
| **UX-6** | GDPR User Data Rights (Delete & Export UI) | P1 | **LEFT TO DO** | Setup self-serve delete button and DSAR zip export |

### 2.5 UI Tasks

| Ref | Task Description | Priority | Status | Verification Method / Target File |
| :--- | :--- | :---: | :---: | :--- |
| **UI-1** | Design System Font & Size Constraints Linting | P0 | **DONE** | Verify [scripts/enforce-app-design-system.mjs](file:///Users/philiplewis/archestimator/scripts/enforce-app-design-system.mjs) |
| **UI-2** | Typography Scale & Sizing Strict Audit | P0 | **DONE** | Enforced under `<12px` font limits in app views |
| **UI-3** | Google Fonts CLS Fix | P1 | **LEFT TO DO** | Use `@next/font` for local caching |
| **UI-4** | Complete UI Primitives Consolidation | P1 | **LEFT TO DO** | Audit and replace custom tailwind button blocks |

---

## 3. Explanations of Core Unsolved Areas

*   **T&C and Privacy Policy (SE-5):** Currently, the `/privacy` and `/terms` routes in the codebase display placeholder status pages. This is a launch blocker. Legal copy must be written and replace these stubs before any marketing launch.
*   **Transition Performance (UX-3):** Although base transition hooks and skeletons are implemented, the performance optimization plan (Phases 1-4) is not yet carried out. Fast page transitions are not fully solved and are still categorized under "Left to Do."
*   **Rate Limiting & lockout persistence (SE-7):** Brute-force rate limiting is in-memory only. A server restart will wipe lockouts. Redis integration is required to secure password protection in production.
*   **Google OAuth Verification (SE-4):** Google login works locally but the OAuth credentials live in "Testing" mode. Verification must be approved by Google to allow more than 100 signups.
