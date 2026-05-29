# Readiness Assessment — Shared Link Overhaul

**Date:** 2026-05-28

This document evaluates the current readiness of the Archestimator codebase across product, technical, security, email infrastructure, and testing vectors.

---

## 1. Product / UX Readiness

### Strengths
- Clear requirements: sheet picker, tabs, email targeting, comments/decisions, visual polish, and owner notifications.
- Strict design limits defined in `DESIGN.md` (10-12px SF Pro, 3px `rounded-xs` border radius) prevent UI inconsistencies.
- Existing modal pattern in `ProjectPublicationHeader.tsx` provides a solid foundation for adding sheet selection and recipient controls.

### Gaps & Mitigations
- **Acceptance Semantics**: "Accept / Decline" actions must map directly to the snapshot version shown to the client. We will save these actions as immutable decision records referencing the `snapshot_version`.
- **Comment Visibility**: Internal project manager comments must be separated from client-facing comments. Comments will have an `is_internal` boolean column to distinguish them.
- **Receiver Aesthetics**: The public receiver page (`/share/[token]`) will utilize the `proposalPaper: #FFFDF8` background color to feel like a formal proposal, while maintaining the compact layout rules.
- **Owner Notification Loop**: Currently no mechanism alerts the project owner when a client views, comments, or decides. We must add an in-app activity feed and optional email digest.
- **Empty States**: No designs exist for "0 estimates selected", "no comments yet", or "link revoked" states. These must be added to the UI spec before implementation.

---

## 2. Technical / Data Model Readiness

### Strengths
- **Grounded Fact**: The database table `project_publications` *already* contains the `selected_estimate_ids uuid[]` column, and the server action `createProjectPublication` already normalizes and saves these IDs.
- **Grounded Fact**: The snapshot builder `buildSnapshotForProject` already handles subset filtering.
- **Grounded Fact**: Three existing API routes serve the share surface:
  - `GET /api/share/[token]` — returns the snapshot JSON for client-side hydration or external consumers.
  - `POST /api/share/[token]/password` — verifies password and sets the `ae_publication_access_*` cookie.
  - `POST /api/share/[token]/events` — records `open`, `password_success`, `password_failure`, and `download_attempt_blocked` events.
- The snapshot schema is typed and stores an array of estimates, meaning the data structure for tabs is already present.

### Gaps & Mitigations
- **New Tables Required**: We must introduce `shared_link_recipients`, `shared_link_comments`, and `shared_link_responses` to handle interactive review states.
- **Image URLs in Snapshot**: The snapshot builder must capture cover image metadata from `projects.metadata` (a `Json` column) and component image paths in `estimate_row_items.source_snapshot` so they render properly for clients.
  - *Note*: There is no dedicated `cover_image` column on `projects`; image references must live inside `metadata`.
- **Rate Limiting Infrastructure**: No Redis, KV, or in-memory rate-limiting service exists for unauthenticated endpoints. We must implement IP-based and token-based rate limiting using either a lightweight in-memory LRU (Node.js) or Supabase `pg_lock` / custom table.
- **Notification Infrastructure**: No event bus, webhook queue, or notification table exists. We will add `shared_link_events` (owner-facing) and a simple polling or Realtime-based in-app notification badge.

---

## 3. Auth / Security / Privacy Readiness

### Strengths
- Solid view-only password verification, cookie signatures (`ae_publication_access_*`), and security headers.
- CSP headers are configured in `next.config.ts` but are **report-only** on `/share/:path*`.
- Search index exclusions are already present (`X-Robots-Tag` is not yet set, but `<meta name="robots" content="noindex, nofollow" />` is present on the receiver page).
- Existing CSRF protection on public POST endpoints via `ae_publication_csrf` cookie + `x-archestimator-csrf` header.

### Gaps & Mitigations
- **Verification without Login**: We need a signed token-binding flow (`shared_link_session_[token]` cookie) to verify the recipient email for comments and decisions without forcing them to register a Supabase account. This builds on top of the existing `ae_publication_access_*` cookie pattern.
- **Anti-Spam**: Rate limits (5 comments/minute, 20/hour) must be enforced on unauthenticated endpoints. Implementation options:
  1. **Option A (Recommended for MVP)**: In-memory `lru-cache` keyed by `sha256(ip+token)` with TTL.
  2. **Option B (Scale)**: Redis or Upstash Redis if we add it later.
  3. **Option C (Immediate)**: A small PostgreSQL `rate_limit_buckets` table with `security definer` cleanup.
- **CSP Enforcement**: The current CSP is `Report-Only`. Before V2 goes live, we should evaluate upgrading to enforced CSP on `/share/:path*` because we are adding interactive POST surfaces.
- **Password Brute Force**: The current password gate has no progressive delay or lockout. We should add a temporary block table (`publication_password_attempts`) to prevent brute forcing.

---

## 4. Email & Notification Infrastructure Audit

### Grounded Codebase Findings
- Audit of `src/lib/collaboration/actions.ts` shows the project's collaboration invite system uses:
  ```typescript
  await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
  ```
  This utilizes **Supabase Auth template emails** directly under service-role privileges.
- There is **no transactional email service** (e.g. Resend, SendGrid, Postmark) configured in the codebase today.
- **Infrastructure Impact**: Since inviting external clients via Supabase Auth would create user accounts and workspace memberships, we **cannot** reuse the existing invite email flow.
- **Transactional Solution**: To send Shared Link emails, we must configure a custom SMTP server in the Supabase dashboard (reusing Supabase's mailer) or introduce a lightweight Node mailer or transactional service (such as Resend) in Phase 2.
- **Notification Gap**: There is also no infrastructure for notifying the project owner when a client comments or decides. We need to add either:
  - In-app Realtime events (Supabase Realtime broadcast on `project:projectId` channel).
  - Or a lightweight email digest sent to the owner when activity occurs.

---

## 5. Performance & Optimization Opportunities

To keep the unauthenticated client portal extremely fast and resilient:

1. **Client-Side Tab State**: Maintain the active tab index inside a lightweight client component. Since all estimate data is pre-fetched and bundled in the initial server-rendered snapshot JSON, switching tabs is instant and requires no network requests.
2. **Component Image Lazy-Loading**: Utilize Next.js `<Image>` components with automatic WebP conversion and `loading="lazy"` to prevent slow load times when estimate tables contain many item images. Ensure `remotePatterns` in `next.config.ts` covers component image buckets.
3. **Database RLS Optimization**: Apply indexes on `shared_link_comments(publication_id, created_at desc)` and `shared_link_recipients(publication_id, email)` to keep query execution times under 50ms P95.
4. **Snapshot Payload Size**: The snapshot JSON is inlined in the server-rendered HTML. For projects with 10+ estimates and 500+ rows, the HTML payload could exceed 200KB. Consider:
   - Streaming the snapshot via `GET /api/share/[token]` and hydrating client-side.
   - Or compressing large snapshot fields if they grow beyond a threshold.
5. **API Route Performance**: New comment/decision POST routes should return minimal JSON (204 or `{ ok: true }`) to reduce TTFB. Avoid re-fetching the full snapshot on every comment post.

---

## 6. Overall Readiness Score

| Dimension | Score | Blocker? | Action Item |
|-----------|-------|----------|-------------|
| **Product/UX** | Medium | No | Spec drafted in `03-ux-ui-spec.md`. Empty states and notification UX need refinement. |
| **Data Model** | **High** | No | Core `selected_estimate_ids` already exists. New table schemas drafted in `04-data-model-and-schema-plan.md`. |
| **Auth/Security** | Medium | No | Signed token-binding flow drafted in `05-security-privacy-auth-plan.md`. Rate-limit infra choice pending. |
| **Email Infra** | Low | **Yes** | Setup SMTP or Resend credentials before Phase 2. No transactional email provider exists today. |
| **Notification Infra** | Low | Partial | In-app notification via Realtime is feasible; email digest requires the same email infra. |
| **Testing/Graph** | High | No | Graph tools and Vitest/Playwright harnesses are ready. 10 existing publication test files provide baseline. |

**Verdict**: Technically ready to begin Phase 1 (Rename + Sheet picker + Receiver tabs) since it has zero email-infrastructure dependencies. Phase 2 remains blocked on email provider confirmation. Phase 3 (comments/decisions) can begin in parallel with Phase 2 if we use a mock email service for local development.
