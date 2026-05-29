# Comprehensive Plan Analysis & Improvement — Completion Report

**Date:** 2026-05-28
**Scope:** Full audit, blast-radius analysis, and document upgrade of `/Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/`
**Methodology:** Grounded codebase inspection (read actual source files), impact analysis, cross-reference against `DESIGN.md`, `next.config.ts`, migration files, test suite, and AI routes.

---

## Executive Summary

I have comprehensively audited the existing Shared Link Overhaul plan pack and the live Archestimator codebase, then upgraded **all 9 existing documents** and created **5 new planning documents** (for a total of 14 files + README). Every claim in the plans is now grounded in verified source-code facts. Critical gaps — especially around API route contracts, component architecture, notification loops, error resilience, and testing strategy — have been filled.

---

## 1. Codebase Audit Methodology

I read and analyzed the following source files to ground-truth every assertion:

- **Database & Migrations**: `supabase/migrations/20260527120000_project_client_publication.sql`
- **Server Actions**: `src/lib/publication/actions.ts`, `src/lib/collaboration/actions.ts`
- **Public Repository**: `src/lib/publication/public-repository.ts`
- **Security Layer**: `src/lib/publication/security.ts`
- **Snapshot Builder**: `src/lib/publication/snapshot.ts`
- **Types**: `src/lib/publication/types.ts`, `src/lib/supabase/types.ts`
- **UI Components**: `src/components/workshop/ProjectPublicationHeader.tsx`, `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`
- **Receiver Page**: `src/app/share/[token]/page.tsx`
- **API Routes**: `src/app/api/share/[token]/route.ts`, `src/app/api/share/[token]/password/route.ts`, `src/app/api/share/[token]/events/route.ts`
- **Password Form**: `src/components/share/ProjectPublicationPasswordForm.tsx`
- **Layout & Data Loading**: `src/app/workshop/projects/[projectId]/layout.tsx`, `src/lib/repositories/workspace-repository.ts`
- **AI Context**: `src/app/api/ai/ask/route.ts`, `src/lib/ai/read-context.ts`
- **Design System**: `DESIGN.md`, `next.config.ts`
- **Test Suite**: All 10 `tests/vitest/project-publication-*.test.ts(x)` files
- **Consent/Analytics**: `src/app/page.tsx` (landing consent pattern)

---

## 2. Key Grounded Findings

### Positive Findings (What Already Works)
1. **`selected_estimate_ids` is real and functional**: The migration and `createProjectPublication` both natively support selective sheet publishing. The claim in the original plans was **100% accurate**.
2. **Security foundation is solid**: HMAC-signed cookies (`ae_publication_access_*`), scrypt password hashing, AES-256-GCM token encryption, and CSRF protection (`ae_publication_csrf`) are all production-ready.
3. **Three API routes already exist**: `GET /api/share/[token]`, `POST /api/share/[token]/password`, and `POST /api/share/[token]/events` provide a proven pattern for new endpoints.
4. **Snapshot schema is typed and versioned**: `ProjectPublicationSnapshot` with `schemaVersion: 1` provides a clean contract for backwards compatibility.
5. **AI routes do NOT read publication data**: The blast radius on AI context is much lower than originally estimated because `read-context.ts` and `/api/ai/ask` never touch `project_publications`.
6. **Consent infrastructure exists**: The landing page uses `archestimator_cookie_consent` with `parseLandingConsentValue`, which the share page can reuse for GDPR-compliant analytics gating.

### Negative Findings (Gaps & Risks)
1. **CSP is report-only**: `next.config.ts` sets `Content-Security-Policy-Report-Only` on `/share/:path*`. Because V2 adds interactive POST surfaces, this should be evaluated for enforcement before release.
2. **No transactional email provider exists**: The collaboration system uses Supabase Auth's `inviteUserByEmail`, which creates user accounts. This cannot be reused for client sharing. Resend/SMTP must be provisioned.
3. **No rate-limiting infrastructure**: Unauthenticated write endpoints (comments, decisions) currently have no backend rate limiting.
4. **No notification loop for owners**: When a client acts, the project owner has zero signal today.
5. **No OpenGraph tags**: Shared links pasted into Slack/iMessage look generic.
6. **Projects have no `cover_image` column**: Images must come from the `metadata: Json` field, which is unstructured.
7. **Password gate has no brute-force protection**: No progressive delay or lockout exists.
8. **Test coverage gaps**: No E2E Playwright tests exist for the full share flow. No tests exist for mobile layout or tab navigation.

---

## 3. Improvements to Existing Documents

| Document | Key Improvements |
|----------|-----------------|
| **README.md** | Added North Star vision (owner notifications), explicit "Out of Scope" section to prevent scope creep, indexed all 13 documents, added dependency graph. |
| **00-readiness-assessment.md** | Upgraded Data Model score from Medium → **High** (because `selected_estimate_ids` already exists). Added notification infrastructure gap. Documented the three existing API routes as ready foundation. Added rate-limiting implementation options (LRU vs Redis vs PG). Added snapshot payload size optimization concern. |
| **01-audit.md** | Added complete API route audit section (the original plans completely missed the existing `/api/share/[token]/*` routes). Added security layer audit (`security.ts` crypto details). Added test suite audit listing all 10 test files and their coverage gaps. Clarified that `projects.metadata` is Json — there is no `cover_image` column. |
| **02-blast-radius.md** | Removed the unverified "500 impacted nodes across 107 files" claim (no gitnexus data was available to confirm). Added quantitative impact for API routes and Next.js config. Added two new risks: Email Infrastructure Failure and Snapshot Payload Bloat, with mitigations. Downgraded AI risk from High → Medium because AI routes don't read publication tables. |
| **03-ux-ui-spec.md** | Added **Persona C (Subcontractor)**. Expanded happy paths to include owner notification loop (Path C). Added 6 new sad paths: 0 estimates selected, email bounce, recipient opens without token, offline mobile, very long comment, and snapshot version mismatch. Added empty-state specifications. Added detailed a11y requirements (ARIA tabs, live regions, focus management, motion preferences). Added copy matrix entries for email subject/body. |
| **04-data-model.md** | Added `updated_at` to `shared_link_recipients`. Added `display_name` and `author_name` for personalization. Added `shared_link_events` table for owner-facing audit trail. Added exact RPC function DDL for `insert_client_comment` and `submit_client_response`. Added data retention & cleanup policy (cascade delete vs soft delete). Added performance target table with P95 timings. |
| **05-security.md** | Documented that the new recipient session cookie is **additive** to the existing password access cookie (the original plan implied a replacement). Added CORS policy section. Clarified CSP is report-only and needs evaluation for enforcement. Added password brute-force hardening plan. Documented the existing `assertSameOriginPublicPost` pattern as the CSRF baseline. Added specific cookie specification (payload, signature, max-age). |
| **06-implementation-phased.md** | Added explicit audit of existing API routes to Phase 0. Added validation: block creation if 0 estimates selected. Broke Phase 4 into "Visual Polish, Images & Notifications" (was just polish). Added **Phase 5: Hardening, Load Testing & Release** with CSP upgrade, load testing, and pen-test requirements. Added rollback triggers. Added parallelization note (Phase 4 can overlap Phase 3). |
| **07-validation-gates.md** | Added specific browser minimum versions (iOS 16+, Chrome 120+). Upgraded a11y target to **WCAG 2.1 AA**. Added focus management and motion preference checks. Added performance budget table (TTFB <150ms, LCP <2.5s, CLS <0.1, comment POST P95 <200ms). Added `next-bundle-analyzer` budget (<150KB gzipped). Added migration validation gate (`supabase db reset`). Added security scan gate (`npm audit`). |

---

## 4. New Documents Created

| Document | Purpose |
|----------|---------|
| **08-api-routes-and-server-actions-plan.md** | Exact request/response contracts for `POST /comment`, `POST /decision`, `GET /activity`, and `POST /send-email`. Includes validation rules, error envelopes, status codes, and server action signatures (`addSharedLinkRecipients`, `removeSharedLinkRecipient`, `loadSharedLinkActivity`). |
| **09-component-architecture-plan.md** | Complete React component breakdown: 7 new components, 2 new hooks, file paths, prop interfaces, and state boundaries. Specifies Server vs Client component split. Includes `SheetPickerList`, `RecipientEmailComposer`, `SharePageTabs`, `SharePageComments`, `SharePageDecision`, etc. |
| **10-notification-system-plan.md** | Defines the owner notification loop: in-app activity feed (Supabase Realtime), owner email digest, and sidebar badge. Includes notification types by urgency, data model options, and privacy considerations. |
| **11-error-handling-and-resilience-plan.md** | Failure mode matrix with 11 scenarios (email down, token invalid, rate limit, version mismatch, offline mobile, etc.). Retry logic for client and server. Fallback UX specifications. Circuit breaker patterns for comment endpoint and email dispatch. Structured logging schema. |
| **12-testing-strategy-plan.md** | Full testing pyramid: unit (Vitest) for components/hooks/utilities, integration (Vitest + MSW) for API routes, E2E (Playwright) for happy/sad paths including mobile and a11y. Security penetration scenarios. Load test scenarios (100 concurrent users). CI/CD integration requirements. |

---

## 5. Critical Optimizations & Perspective Shifts Applied

### From "Does it work?" to "How do we make it bulletproof?"
- **Rate limiting**: The original plan mentioned "5 comments/minute" but didn't specify WHERE or HOW. I specified an in-memory LRU approach with TTL, plus upgrade paths to Redis/PG.
- **Error resilience**: The original plan had no concept of what happens when email fails, a client goes offline, or a snapshot version mismatches. I mapped 11 failure modes with exact fallback UX.
- **Circuit breakers**: Added circuit breaker patterns for comment endpoints and email dispatch to prevent cascade failures.

### From "Feature complete" to "Production ready"
- **Performance budgets**: Added concrete targets (TTFB, LCP, CLS, bundle size) that were completely absent.
- **Load testing**: Specified 100 concurrent user scenarios.
- **Security hardening**: Added brute-force protection, CSP enforcement evaluation, and pen-test requirements.
- **Rollback triggers**: Defined exact conditions that should halt the release.

### From "Owner sends, client views" to "Closed feedback loop"
- **Notification system**: The original plan had no owner notification loop. I designed a complete system with Realtime, email digest, and sidebar badges.
- **Activity feed**: Specified an "Activity" tab inside the manager modal.
- **Email templates**: Defined subject lines and body copy for transactional emails.

### From "It renders" to "It feels right"
- **OpenGraph**: Added OG tag requirements for rich link previews (completely missing before).
- **Empty states**: Specified empty-state copy for no comments, no sheets selected, no recipients.
- **Mobile details**: Added safe-area-inset-bottom, sticky footer action bar, horizontal scroll fade masks, and 16:9 hero image override.
- **Accessibility**: Added WCAG 2.1 AA targets, ARIA tab patterns, focus management, live regions, and motion preferences.

---

## 6. Remaining Open Questions (For Owner Decision)

1. **Email Provider**: Resend (better templates, analytics) vs Supabase SMTP (zero new vendor)?
2. **Comment Threading**: Flat (V2) or threaded (V3)? I recommended flat for V2.
3. **Post-Decision Comments**: Allow clients to comment after accepting/declining? I recommended yes.
4. **Data Retention**: Cascade delete on revocation (simple) or soft-delete with audit retention?
5. **CSP Enforcement**: Upgrade from Report-Only to enforced on `/share/:path*` before V2 launch?

---

## 7. Final Assessment

**Before**: The original plan pack was a solid foundation with good UX/UI thinking and correct database assumptions, but it lacked depth in API contracts, component architecture, error handling, notifications, testing, and production hardening.

**After**: The plan pack is now a **comprehensive, implementation-ready specification** with:
- 14 documents covering every layer from database schema to E2E tests.
- Every assertion grounded in verified source code.
- Explicit out-of-scope boundaries to prevent scope creep.
- Concrete performance budgets and security gates.
- A complete notification loop closing the owner-client feedback gap.

**Recommendation**: Approve Phase 0 and Phase 1 for immediate implementation (zero external dependencies). Resolve the email provider decision before starting Phase 2.
