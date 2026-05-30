# 01 — Current Inventory: Shared Link System

**Date:** 2026-05-30
**Purpose:** Code-level catalog of every file, function, table, type, route, and component in the Shared Link (view-only client publication) feature.

---

## Routes

| Route | File | Purpose | Access |
|-------|------|---------|--------|
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Public share page: resolves publication, handles password gate, renders estimate view | Public |
| `/api/share/[token]` | `src/app/api/share/[token]/route.ts` | API: returns snapshot JSON (no-store, password-gated) | Public |
| `/api/share/[token]/password` | `src/app/api/share/[token]/password/route.ts` | API: verifies password, sets signed access cookie | Public (CSRF-gated POST) |
| `/api/share/[token]/comment` | `src/app/api/share/[token]/comment/route.ts` | API: post comment (session-validated, rate-limited, sanitized, circuit-breaker) | Session-gated POST |
| `/api/share/[token]/decision` | `src/app/api/share/[token]/decision/route.ts` | API: submit decision (session-validated, 409 on duplicate) | Session-gated POST |
| `/api/share/[token]/activity` | `src/app/api/share/[token]/activity/route.ts` | API: load activity feed (owner-only) | Authenticated |
| `/api/share/[token]/events` | `src/app/api/share/[token]/events/route.ts` | API: record publication events (opens, etc.) | Public |
| `/workshop/projects/[projectId]` | via `ProjectPublicationHeader` in layout | Manager modal: create/republish/rotate/revoke shared links | Protected |

---

## UI Components — Manager Side

| Component | File | Role | States |
|-----------|------|------|--------|
| `ProjectPublicationHeader` | `src/components/workshop/ProjectPublicationHeader.tsx` | Header rail button + full modal with 5 tabs | Link on/off/expired/revoked; publish/republish/rotate/revoke; password set/clear; sheet selection |
| `RecipientEmailComposer` | `src/components/workshop/publication/RecipientEmailComposer.tsx` | Chip-based email input, manage recipients, send invites | Loading, empty, chips added, sending, sent, pending/bounced status |
| `SheetPickerList` | `src/components/workshop/ProjectPublicationHeader.tsx` (co-located export) | Sheet checkboxes for publication scope | All selected, none selected, partial, disabled |

---

## UI Components — Recipient Side

| Component | File | Role | States |
|-----------|------|------|--------|
| `SharePageTabs` | `src/components/share/SharePageTabs.tsx` | Per-estimate tabs with Tree View / Grid Preview toggle, donut charts | Active tab, sub-tab view (tree/grid), empty estimates, loading |
| `SharePageHero` | `src/components/share/SharePageHero.tsx` | Hero cover image (from project metadata, Next/Image + lazy) | Image present, image absent (renders nothing) |
| `SharePageDecision` | `src/components/share/SharePageDecision.tsx` | Accept/Decline/Request Revision buttons + confirmation modal | Not decided, confirming, submitted (read-only badge), hidden (no session) |
| `SharePageComments` | `src/components/share/SharePageComments.tsx` | Comment list + composer with character counter | Idle, posting, optimistic, error, rate-limited, offline queue, hidden (no session) |
| `SharePageSessionBanner` | `src/components/share/SharePageSessionBanner.tsx` | Session status indicator for recipients | Session active, no session |
| `ShareEstimateTreePanel` | `src/components/share/ShareEstimateTreePanel.tsx` | Floating navigation tree for estimate hierarchy | Desktop only, scroll-tracking active highlight |
| `ShareEstimateTreeView` | `src/components/share/ShareEstimateTreeView.tsx` | Tree view of reconstructed estimate hierarchy from flat snapshot rows | Group nodes, area nodes, read-only |
| `SharedLinkActivityFeed` | `src/components/share/SharedLinkActivityFeed.tsx` | Owner activity feed (rendered in manager modal Activity tab) | Comment items, decision items, event items, "Load more", empty |
| `ProjectPublicationPasswordForm` | `src/components/share/ProjectPublicationPasswordForm.tsx` | Password gate form | Idle, submitting, invalid password, locked out (5 attempts), error |
| `CostDonutChart` | `src/components/charts/CostDonutChart.tsx` | Shared D3 donut chart (used in both workshop and share page) | Data present, empty, hover/focus interaction |

---

## Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useSharedLinkSession` | `src/hooks/use-shared-link-session.ts` | Reads companion `_ok` cookie to determine if interactive features should render |

---

## Lib — Publication Core

| File | Exports | Purpose |
|------|---------|---------|
| `src/lib/publication/actions.ts` | `createProjectPublication()`, `republishProjectPublication()`, `rotateProjectPublicationLink()`, `revokeProjectPublication()`, `addSharedLinkRecipients()`, `removeSharedLinkRecipient()`, `listSharedLinkRecipients()`, `loadSharedLinkActivity()`, `maybeTriggerSharedLinkActivityDigest()` | All server actions: create/update/revoke publications, manage recipients, load activity, trigger digests |
| `src/lib/publication/public-repository.ts` | `resolveProjectPublicationAccessByToken()`, `resolveProjectPublicationSnapshotByToken()`, `recordProjectPublicationEvent()`, `insertSharedLinkComment()`, `submitSharedLinkDecision()`, `createPublicationServiceClient()`, `verifySharedLinkRecipientToken()` | DB read/write layer: access resolution, snapshot loading, event recording, comment/decision insert, recipient token verification |
| `src/lib/publication/security.ts` | `createPublicationToken()`, `hashPublicationToken()`, `encryptPublicationToken()`, `decryptPublicationToken()`, `hashPublicationPassword()`, `createPublicationAccessCookieName()`, `verifyPublicationAccessCookieValue()`, `createSharedLinkSessionCookieName()`, `verifySharedLinkSessionCookieValue()`, `assertSameOriginPublicPost()`, `readPublicationTokenHashSecret()`, `readPublicationTokenEncryptionSecret()` | Complete crypto layer: token gen (HMAC-SHA256 + AES-256-GCM), password hashing (scrypt), cookie signing/verification, same-origin enforcement, CSRF |
| `src/lib/publication/snapshot.ts` | `buildProjectPublicationSnapshot()` | Aggregates project + estimates + rows + nodes into immutable JSON snapshot |
| `src/lib/publication/types.ts` | `ProjectPublicationStatus`, `ProjectPublicationSummary`, `PublicationSnapshotRow`, `PublicationSnapshotEstimate`, `PublicationSnapshotTreeNode`, `ProjectPublicationSnapshot`, `ProjectEstimateSheet` | All publication TypeScript types |
| `src/lib/share/aggregate-share-chart-buckets.ts` | `aggregateRowsByDiscipline()` | Discipline-based aggregation for donut chart |
| `src/lib/share/reconstruct-share-tree.ts` | `reconstructTreeFromRows()`, `wrapTreeWithRoot()` | Client-side tree reconstruction from flat snapshot rows |
| `src/lib/email/resend-client.ts` | `sendEmail()`, `ResendEmailClient` | Resend SDK wrapper with circuit breaker, graceful degradation, mock fallback |

---

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `project_publications` | `20260528220000` | Core: token_hash, encrypted_token, snapshot_json (JSONB), password_hash, selected_estimate_ids, status, published_at, expires_at, revoked_at, snapshot_version, open_count, latest_opened_at |
| `shared_link_recipients` | `20260528220000` | Per-recipient: email, display_name, recipient_token_hash, delivery_status, invited_by, last_opened_at |
| `shared_link_comments` | `20260528220000` | Comments: body, author_email, is_internal, estimate_id, row_id, publication_id |
| `shared_link_responses` | `20260528220000` | Decisions: decision, note, recipient_id, publication_id |
| `shared_link_events` | `20260528220000` | Events: event_type, metadata_json, recipient_id, publication_id |

---

## Env Variables

| Variable | Where Used | Required For | Set in .env.local? | In .env.example? |
|----------|-----------|-------------|-------------------|-----------------|
| `RESEND_API_KEY` | `resend-client.ts` | Recipient email sending + owner digests | ✅ | ❌ |
| `RESEND_FROM` | `resend-client.ts` (fallback) | Sender address override | ❌ (falls back to "Archestimator <no-reply@archestimator.com>") | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | `actions.ts:createPublicationAdminClient()` | All DB writes for publication operations | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Same | Supabase connection URL | ✅ | ✅ |
| `NEXT_PUBLIC_APP_URL` | origin resolution | Absolute URL for client links | ❌ | ❌ |

---

## Security Layers (Complete)

| Layer | Mechanism | File |
|-------|-----------|------|
| URL token entropy | 32 random bytes → base64url (256-bit) | `security.ts:createPublicationToken()` |
| Token storage | HMAC-SHA256 hash in DB, AES-256-GCM encrypted copy | `security.ts:hashPublicationToken()`, `encryptPublicationToken()` |
| Password protection | scrypt hash + signed HttpOnly access cookie (24h) | `security.ts:hashPublicationPassword()`, `verifyPublicationAccessCookieValue()` |
| Password lockout | 5 attempts → progressive delay → 15-min hard lockout (IP+token) | `page.tsx` + `password/route.ts` |
| Session cookie | HMAC-signed, HttpOnly + non-HttpOnly companion flag | `security.ts:createSharedLinkSessionCookieName()`, `verifySharedLinkSessionCookieValue()` |
| Same-origin POST | All /api/share/* POSTs check Origin header | `security.ts:assertSameOriginPublicPost()` |
| CSRF (password) | Client-generated token in cookie + custom header | `ProjectPublicationPasswordForm.tsx` |
| Rate limiting | 5/min + 20/hour per recipient (in-memory LRU) | `comment/route.ts` |
| Sanitization | Strip HTML tags + script/style + truncate to 1000 chars | `comment/route.ts:sanitizeAndTruncate()` |
| Circuit breaker | >50% 5xx in 5-min window → 2-min cooldown | `comment/route.ts:isCircuitOpen()` |
| Email circuit breaker | >50% failures in 5-min window → 10-min cooldown | `resend-client.ts` |
| CSP | Enforced on /share/:path* | `next.config.ts` |
| Security headers | X-Content-Type-Options, X-Frame-Options, Referrer-Policy on share API | `next.config.ts` |
| No tracking | GA4/Clarity excluded from /share/[token] | CSP + conditional loading |
| No-store cache | Cache-Control: no-store on all share API responses | All API route files |
| No service-role on public routes | Publication reads use anon key, not service-role | `public-repository.ts` |

---

## Tests

| File | Type | What It Validates |
|------|------|-------------------|
| `tests/vitest/project-publication-header.test.tsx` | UI contract | Modal structure, tabs, link controls, status labels |
| `tests/vitest/project-publication-actions.test.ts` | Actions contract | `sendEmail` integration, recipient token generation, `invited_by` field |
| `tests/vitest/project-publication-comments.test.tsx` | Comments UI + circuit breaker | Comment rendering, posting, circuit behavior |
| `tests/vitest/project-publication-activity.test.tsx` | Activity feed + digest | Digest rate-limiting, activity rendering |
| `tests/vitest/project-publication-page.test.tsx` | Page contract | Share page rendering, password gate, snapshot display |
| `tests/vitest/share/reconstruct-share-tree.test.ts` | Logic unit | Tree reconstruction accuracy, XSS safety |
| `e2e/shared-link-receiver.spec.ts` | E2E | Owner create, client accept, lockout, mobile, keyboard — **skipped** (gated on `ARCHESTIMATOR_E2E_SHARED_LINK=1`) |
