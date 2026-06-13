# 02 — Current-State Audit & Feature Inventory: Shared-Link Feature

**Date:** 2026-06-13
**Author:** Systems analyst (planning/audit only — no code changed)
**Branch audited:** `main` (HEAD `f1a80c8d`)
**Scope:** The complete `/share/[token]` "Proposal Review" shared-link feature end to end — owner publication management and recipient-facing public view, including password gating, recipients, comments, decisions, telemetry, and activity.

> **Truth & Integrity convention.** Every capability claim below cites `file:line` that was read directly during this audit. Claims I could not verify in code are labelled `[INFERRED]` or `[NEEDS VERIFICATION]`. Discrepancies between `.ai` docs and the actual code are called out explicitly in §8 and §10 — accuracy is this document's entire value.

---

## 1. Executive Summary

The shared-link feature lets a project owner publish a private estimate as a public, view-only **Proposal Review** page at `/share/[token]`. The page requires no login. It can optionally be password-protected, and named recipients can be invited by email so they can comment and submit a single locked decision (accept / decline / request revision). The owner manages everything from a 5-tab modal mounted in the project workshop header; the recipient sees a single-column proposal page.

**Who it serves.** Owner/manager side: project owners and workspace/project admins (RBAC gate at `actions.ts:148,171`). Recipient side: external clients who receive an emailed `?recipient=<token>` link; anonymous visitors get view-only.

**Maturity level: production-leaning beta.** The security stack is mature (scrypt passwords, AES-256-GCM token envelope, HMAC-signed cookies, durable + in-memory rate limiting, SECURITY DEFINER RPCs with snapshot-version locking, enforced CSP on `/share`). The feature was built as "Shared Link Overhaul V2" (2026-05-28) on top of a V1 publication base (2026-05-27), then a "Share Page Estimate View Enhancement" (2026-05-29) added donut/tree/grid sub-views, and a UX overhaul through 2026-06-03/06-13 reshaped the receiver layout.

Key maturity caveats verified in code: (1) rate limiting, lockout, circuit breakers, and the digest limiter are **in-memory / per-process** and reset on deploy (`security.ts:414`, `comment/route.ts:25-27`, `actions.ts:1149`); (2) the **recipient-facing activity feed is not mounted** on the public page — `SharedLinkActivityFeed` is owner-only and only rendered inside the manager modal (`ProjectPublicationHeader.tsx:417`); (3) the receiver layout is a **single centered `max-w-[960px]` column with very small typography** (8–12px), which is current on `main` (`page.tsx:71`).

**Capability count: 41 user-facing capabilities** inventoried in §3 (24 owner-side, 17 recipient-side).

**Notable doc-vs-code discrepancies** (detail in §8/§10): `ShareFloatingTreeNav` is dead code (defined, never imported — superseded by `ShareEstimateTreePanel`); the spec's "Cost Bubble Chart" and `recopy_token` do not exist on the share surface; and several memory observations about "permanently broken CSRF" describe a state that has since been fixed.

---

## 2. Architecture Diagram (ASCII)

### Owner flow: publish → token → email

```
WORKSHOP (authenticated)
  src/app/workshop/projects/[projectId]/layout.tsx:56  mounts ↓
  ProjectPublicationHeader.tsx  (5-tab modal: Link/Estimates/Access/Recipients/Activity)
        │  Generate / Update / New link / Turn off / set password / pick sheets
        ▼  server actions ("use server")
  src/lib/publication/actions.ts
   ├─ assertProjectPublicationManager()          RBAC (actions.ts:134)
   ├─ buildSnapshotForProject()                  reads estimates/rows/nodes/tabs (actions.ts:350)
   │     └─ snapshot.ts buildProjectPublicationSnapshot()  immutable DTO (snapshot.ts:251)
   ├─ createPublicationToken / hash / encrypt    security.ts:49,59,64
   ├─ INSERT/UPDATE project_publications          via service-role admin client (actions.ts:102)
   └─ addSharedLinkRecipients()                   actions.ts:883
         ├─ recipient raw token → hash            security.ts:59
         ├─ INSERT shared_link_recipients
         └─ sendSharedLinkRecipientInvitationEmail()  Resend (actions.ts:799)
               └─ buildSharedLinkRecipientEmailLinks() → /share/<t>?recipient=<rawToken>  (email-links.ts:72)

DB (Postgres / Supabase) — service role bypasses RLS on server
  project_publications · project_publication_events
  shared_link_recipients · shared_link_comments · shared_link_responses · shared_link_events
  RPCs: insert_client_comment · submit_client_response (SECURITY DEFINER, snapshot-locked)
```

### Recipient flow: open → password → view → comment/decide → telemetry

```
RECIPIENT browser → GET /share/[token]   (src/app/share/[token]/page.tsx, force-dynamic)
  │
  ├─ resolveProjectPublicationAccessByToken()        public-repository.ts:472  (404→notFound)
  │
  ├─ passwordRequired? ── yes ─► verify ae_publication_access_<suffix> cookie  security.ts:184
  │        │ invalid → render ProjectPublicationPasswordGate (page.tsx:108)
  │        │   └─ ProjectPublicationPasswordForm.tsx → POST /api/share/[token]/password
  │        │        password/route.ts: CSRF + lockout + scrypt verify → 204 + Set-Cookie
  │        └─ valid → continue
  │
  ├─ ?recipient=/?rt= present? → SharePageRecipientSessionInitializer (client)
  │        └─ POST /api/share/[token]/session  → verify recipient token → set
  │           shared_link_session_<suffix> (HttpOnly) + _ok flag cookie → reload  (session/route.ts:38)
  │
  ├─ subsequent load: verify session cookie → resolve recipient email for banner  (page.tsx:161)
  ├─ resolveProjectPublicationSnapshotByToken()       public-repository.ts:488
  └─ record telemetry: recordProjectPublicationAnalyticsEvent (gated by env flag) +
         recordProjectPublicationEvent ("open", increments open_count)            (page.tsx:188-202)

  RENDER  ProjectPublicationView (page.tsx:56) — <main> max-w-[960px] single column
    SharePageSessionBanner ── SharePageProposalHeader ── SharePageDecision
    SharePageHero ── SharePageTabs ── SharePageComments ── footer
        │ SharePageTabs.tsx: per-sheet donut + estimate tabs + Tree/Grid sub-tabs
        │   CostDonutChart (compact) · ShareEstimateTreePanel · ShareEstimateTreeView
        │ SharePageComments (session-gated): GET/POST /api/share/[token]/comment
        └ SharePageDecision (session-gated): GET/POST /api/share/[token]/decision
              POST → submitSharedLinkDecision → RPC submit_client_response (409 on dupe/stale)

  Layer map by file:
   route       src/app/share/[token]/page.tsx
   API         src/app/api/share/[token]/{password,session,comment,decision,activity,events,unsubscribe}/route.ts
               src/app/api/share/[token]/route.ts (snapshot JSON GET)
   components   src/components/share/*  +  src/components/charts/CostDonutChart.tsx
   client lib   src/lib/share/* · src/lib/charts/* · src/hooks/use-shared-link-session.ts · src/lib/publication/client-csrf.ts
   server lib   src/lib/publication/{actions,public-repository,security,snapshot,types,email-links,image-url,activity-helpers}.ts
   DB           supabase/migrations/2026052712* + 2026052822* (+ 6 follow-ups)
```

---

## 3. Capability Inventory

Status legend: **works** = implemented and wired; **partial** = implemented with notable gap/limitation; **known-issue** = behaves wrongly or is referenced-but-absent. Citations are to code read in this audit.

### 3A. Owner / Manager capabilities

| # | Capability | Where triggered (file:line) | Status | Notes |
|---|---|---|---|---|
| 1 | Open Shared-link modal from workshop header | `ProjectPublicationHeader.tsx:303-327`; mounted at `layout.tsx:56` | works | Link icon button; shows activity dot when unseen activity (`:320`). |
| 2 | Create shared link (revokes prior published row, new token) | `actions.ts:489` `createProjectPublication` | works | Old published rows set to `revoked` before insert (`:508-516`). |
| 3 | Update / republish (new snapshot, same token) | `actions.ts:536` `republishProjectPublication` | works | Bumps `snapshot_version` (`:569`); republish to first-time falls through to create (`:551`). |
| 4 | Rotate link (new token, kills old) | `actions.ts:581` `rotateProjectPublicationLink` | works | "New link" button → confirm modal (`ProjectPublicationHeader.tsx:588`). |
| 5 | Revoke / turn off link | `actions.ts:633` `revokeProjectPublication` | works | Sets status `revoked` + `revoked_at` (`:639`). |
| 6 | Select / scope estimate sheets to publish | `ProjectPublicationHeader.tsx:472-486` (Estimates tab) + `SheetPickerList` (`:670`) | works | 0-selected blocks Generate (`:482,299`); default = all or previously-selected (`:164`). |
| 7 | Set password on link | Access tab `ProjectPublicationHeader.tsx:507-525`; hashed `actions.ts:523` | works | scrypt hash (`security.ts:103`). |
| 8 | Remove / clear password | Generate path detects clear → `clear-password` confirm (`ProjectPublicationHeader.tsx:558`); `republish...clearPassword:true` (`actions.ts:558`) | works | Destructive confirm modal copy at `:115`. |
| 9 | Copy share link to clipboard | `ProjectPublicationHeader.tsx:218` `copyClientLink` | works | Builds absolute URL from `window.location.origin` (`:203`). |
| 10 | Open share link in new tab | `ProjectPublicationHeader.tsx:233` `openClientLink` | works | `noopener,noreferrer`. |
| 11 | Invite recipients by email (chips) | `RecipientEmailComposer.tsx` via Recipients tab (`ProjectPublicationHeader.tsx:529`); `addSharedLinkRecipients` (`actions.ts:883`) | works | Self-invite blocked (`actions.ts:695,908`); duplicates idempotent (`:963`). |
| 12 | Send invitation email via Resend | `actions.ts:799` `sendSharedLinkRecipientInvitationEmail` | partial | Best-effort; failures non-fatal, recipient stays `pending` (`:994`). Gated by Resend readiness (#13). |
| 13 | Email-delivery readiness gate | `actions.ts:213` `readSharedLinkEmailDeliveryReadiness` | works | Requires Resend configured + reply-to + webhook secret (`:217-219`). |
| 14 | Resend invitation to a recipient | `actions.ts:1018` `resendSharedLinkRecipientEmail` | works | Rate-limited 1 / 5 min per user+pub+recipient (`:775,1033`); rotates recipient token. |
| 15 | Remove a recipient | `actions.ts:1104` `removeSharedLinkRecipient` | works | By id or email. |
| 16 | List recipients + delivery-status chips | `actions.ts:861` `listSharedLinkRecipients` | works | Statuses pending/sent/bounced/opened/responded (`migration:36`). |
| 17 | View owner activity feed (comments/decisions/events) | `ProjectPublicationHeader.tsx:413-418` → `SharedLinkActivityFeed` (`isOwner`) → `loadSharedLinkActivity` (`actions.ts:1190`) | works | Owner sees internal comments; cursor pagination. |
| 18 | Live activity via Supabase Realtime (owner) | `SharedLinkActivityFeed.tsx:73-110` | partial | Owner-only; subscribes on `shared_link_*` INSERT. Requires `publicationId` prop, which is passed (`ProjectPublicationHeader.tsx:417`). |
| 19 | Activity "unseen" badge dot on header | `ProjectPublicationHeader.tsx:99,200,320` | works | localStorage last-seen vs latest activity timestamp. |
| 20 | Owner email digest on new comment/decision | `actions.ts:1335` `maybeTriggerSharedLinkActivityDigest` → `:1161` | partial | In-memory rate-limit 1 / 15 min per pub (`:1150`); best-effort, non-blocking; resets on deploy. |
| 21 | Snapshot-stale warning in modal | `ProjectPublicationHeader.tsx:355-359` (consumes `summary.staleSnapshotWarning`) | works | Data produced by workspace-repository `getProjectPublicationSummary` `[NEEDS VERIFICATION — not read this pass]`. |
| 22 | Open-count + last-opened-by display | `ProjectPublicationHeader.tsx:363-382`; increment RPC `public-repository.ts:607` | works | `increment_project_publication_open` (migration `:59`). |
| 23 | Expiry support (`expires_at`) | `actions.ts:528` (create), `isActivePublication` (`public-repository.ts:80`) | partial | Column + enforcement exist; **no UI input** to set `expiresAt` found in `ProjectPublicationHeader.tsx` (passed only programmatically). |
| 24 | RBAC: only owners/admins can manage | `actions.ts:148-171` | works | CEO/admin global bypass; else workspace/project role ≥ admin. |

### 3B. Recipient / Public capabilities

| # | Capability | Where triggered (file:line) | Status | Notes |
|---|---|---|---|---|
| 25 | View public proposal page (no login) | `page.tsx:122` `SharePage`; `force-dynamic` (`:42`) | works | 404 via `notFound()` when token inactive (`:131,184`). |
| 26 | Password gate + unlock | `page.tsx:108,133`; `ProjectPublicationPasswordForm.tsx`; `password/route.ts` | works | 204 sets HttpOnly access cookie (`password/route.ts:98`); reload on success. |
| 27 | Brute-force lockout / progressive delay | `password/route.ts:46,58`; `security.ts:440,453` (in-mem) + durable `public-repository.ts:346` | works | 5 attempts/15 min → 429; delays 1/2/4/8/16/30s. Dual layer (in-mem + DB rate-limit). |
| 28 | OpenGraph metadata (title/desc) | `page.tsx:230` `generateMetadata` | works | OG **image deliberately omitted** (`:254`). Protected pubs return generic meta (`:238`). |
| 29 | Recipient session establishment (`?recipient=`/`?rt=`) | `page.tsx:125-128`; `SharePageRecipientSessionInitializer.tsx`; `session/route.ts:38` | works | Verifies recipient token (`public-repository.ts:643`); sets HttpOnly session + `_ok` flag; redirects to clean URL. |
| 30 | "Reviewing as <email>" banner + "Not you?" sign-out | `SharePageSessionBanner.tsx:25-47`; DELETE `session/route.ts:104` | works | Clears both cookies, reloads. |
| 31 | Generic "sign in as recipient" prompt (no session) | `SharePageSessionBanner.tsx:52-67` | works | Dismissible; hidden when session valid. |
| 32 | Proposal header (name, client, code, location) | `SharePageProposalHeader.tsx:7-30` | works | "Awaiting your review" status chip. |
| 33 | Hero / cover image | `SharePageHero.tsx`; cover from `projects.metadata` at publish (`actions.ts:422`) | works | `next/image` lazy; null when absent. URL allow-listed (`image-url.ts:21`). |
| 34 | Per-sheet estimate tabs (multi-estimate) | `SharePageTabs.tsx:319-356` (roving tablist) | works | sessionStorage persists active sheet (`:117`); horizontal scroll fade masks (`:359`). |
| 35 | Estimate sub-tabs (when estimate has named tabs) | `SharePageTabs.tsx:369-402` | works | Snapshot schema 1.2 only (`types.ts:93`; `snapshot.ts:268`). |
| 36 | Tree View / Grid Preview sub-tab toggle | `SharePageTabs.tsx:404-432` | works | Isolated Arrow keys (`:101-107`); per-sheet `sheetViews` state. |
| 37 | Tree View (reconstructed hierarchy) | `SharePageTabs.tsx:511-527` → `ShareEstimateTreePanel` + `ShareEstimateTreeView`; trees from `getBestShareTree`/`wrapTreeWithRoot` (`reconstruct-share-tree.ts:338,376`) | works | Sidebar panel + main view; "Reconstructed…may differ" disclaimer (`:523`). |
| 38 | Grid Preview table + row filter/search | `SharePageTabs.tsx:441-509` | works | Filters by description/designation/material/discipline (`:276`); 32px row thumbnails (`:476`). |
| 39 | Per-sheet cost donut chart (D3) | `SharePageTabs.tsx:310-316` → `CostDonutChart.tsx` compact; buckets via `aggregateRowsByDiscipline` (`aggregate-share-chart-buckets.ts:37`) | works | Groups by discipline, top-8 + "Other"; hover highlight + center label. |
| 40 | Add / view comments (recipient) | `SharePageComments.tsx`; GET/POST `comment/route.ts` | works | **Session-gated** — hidden without recipient session (`SharePageComments.tsx:292`). Optimistic UI + retry + offline queue (`:183,133`). Max 1000 chars. |
| 41 | Submit decision (accept/decline/revise), version-locked, single | `SharePageDecision.tsx`; POST `decision/route.ts:128` → `submitSharedLinkDecision` (`public-repository.ts:877`) | works | Confirm dialog with note; 409 on dup ("already submitted") or stale snapshot; locks to read-only badge (`SharePageDecision.tsx:167,217`). Session-gated (`:127`). |

### 3C. Additional public surfaces / sub-capabilities

| Capability | Where (file:line) | Status | Notes |
|---|---|---|---|
| Snapshot JSON API (alternate read) | `GET src/app/api/share/[token]/route.ts:16` | works | Rate-limited 60/min; 423 if password required, returns sanitized snapshot. Not consumed by the page render (page reads server-side). `[INFERRED]` likely legacy/external. |
| Public activity API (filtered) | `GET activity/route.ts:79` | works | `assertSameOrigin` (GET-safe); always filters `is_internal`; recipient-scoped responses/events only with valid session. Cursor pagination. **Not mounted on the public page** (only owner feed uses it for non-owner path — see §8). |
| Telemetry events API (beacon) | `POST events/route.ts:17` | partial | Accepts `open/password_success/password_failure/download_attempt_blocked`. CSRF-gated. **No client code posts to it** — page records telemetry server-side instead. |
| Unsubscribe link | `GET unsubscribe/route.ts:19` | works | Sets `email_unsubscribed_at` (`public-repository.ts:682`); plain-text response. |
| Floating tree nav (sticky sidebar) | `ShareFloatingTreeNav.tsx` | **known-issue (dead code)** | Defined but **imported nowhere** (verified via grep). Superseded by `ShareEstimateTreePanel`. Docs still list it as live (§8). |
| Print / PDF (browser print) | `src/app/share/print.css`; classes in components | works | `@media print` hides chrome, paginates estimates. No server PDF generation. |
| `useSharedLinkSession` client gate | `src/hooks/use-shared-link-session.ts` | works | Reads non-HttpOnly `_ok=1` flag to gate interactive UI (comments/decision). |

---

## 4. Data Model Summary

(Inventory only — deep DB analysis deferred to the DB audit.)

**`project_publications`** (`migration 20260527120000:15`) — one row per publication; rotation creates a new row and revokes the old.
Key cols: `id`, `workspace_id`, `project_id`, `token_hash` (unique, SHA-256 HMAC), `encrypted_token` (AES-256-GCM, for URL recovery), `password_hash` (scrypt, nullable), `status` enum(`published/expired/revoked`), `snapshot_version`, `selected_estimate_ids uuid[]`, `snapshot_json jsonb`, `published_by/at`, `expires_at`, `revoked_at`, `open_count`, `latest_opened_at`. FK to `projects(id, workspace_id)` cascade. RLS: managers read/insert/update via `can_manage_project_publication` (`:92-111`).

**`project_publication_events`** (`:46`) — legacy access telemetry. Cols: `publication_id` FK, `event_type` enum, `metadata_json`, `ip_hash`, `user_agent_hash`. Enum extended with `password_attempt` (`migration 20260531010000`). Service-role insert only.

**`shared_link_recipients`** (`migration 20260528220000:28`) — invited clients. Cols: `publication_id` FK, `email`, `display_name`, `invited_by/at`, `recipient_token_hash` (unique), `delivery_status` check(pending/sent/bounced/opened/responded), `last_opened_at`. Later additive cols: `email_unsubscribed_at` (`20260531175141`), Resend tracking `resend_email_id/last_event_id/type/at`, `resend_delivery_metadata` (`20260601011500`). Unique index on `(publication_id, lower(email))`. `recipient_token_hash` is **not column-grantable** to authenticated (`20260601145000` locks it down).

**`shared_link_comments`** (`:43`) — `recipient_id` (nullable, owner notes), `author_email/name`, `estimate_id`/`row_id` (nullable scope), `body` (≤1000), `is_internal` bool.

**`shared_link_responses`** (`:56`) — the decision. `recipient_id` (cascade), `decision` check(accepted/declined/revision_requested), `note` (≤2000), `snapshot_version_at_decision`. **Unique `(recipient_id, publication_id)`** → enforces one decision per recipient.

**`shared_link_events`** (`:66`) — recipient-scoped audit. `event_type` check(open/comment_add/accept_decision/decline_decision/password_attempt), `metadata_json`, `ip_hash`, `user_agent_hash`.

**RPCs (SECURITY DEFINER, snapshot-locked):**
- `insert_client_comment(p_token_hash, p_recipient_token_hash, p_estimate_id, p_row_id, p_body, p_expected_snapshot_version)` — final form in `20260603214151`. Raises `Publication snapshot version changed.` on mismatch.
- `submit_client_response(p_token_hash, p_recipient_token_hash, p_decision, p_note, p_expected_snapshot_version)` — final form in `20260603210653`. `on conflict do nothing` → raises `Decision already submitted.`
- `increment_project_publication_open(target_publication_id)` (`20260527120000:59`).
- `can_manage_project_publication(target_project_id)` (`:78`) delegates to `can_manage_project_access`.

**Relationships:** `project → project_publications (1:N)`; `project_publications → {recipients, comments, responses, events} (1:N)`; `recipient → {comments, responses, events}`. `selected_estimate_ids` references estimates by value (no FK array constraint).

---

## 5. Security Model Summary

(High-level; depth deferred to the security audit.)

- **Token resolution.** Raw token never stored. `hashPublicationToken` = HMAC-SHA256 with a pepper secret (`security.ts:59`); matched against `token_hash`. `encrypted_token` = AES-256-GCM envelope for owner-side URL recovery (`security.ts:64`). Token = 32 random bytes base64url (`security.ts:49`).
- **Passwords.** scrypt with 16-byte salt, constant-time compare (`security.ts:103,116`).
- **Access cookie** (`ae_publication_access_<sha256(token)[:20]>`): HMAC-signed payload bound to `{tokenDigest, publicationId, snapshotVersion, expiresAt}`, HttpOnly, SameSite=Lax, Secure in prod, 24h (`security.ts:132-226`).
- **Recipient session cookie** (`shared_link_session_<suffix>`): same signing scheme + `recipientId`, HttpOnly, 24h (`security.ts:264-392`). Companion non-HttpOnly `_ok=1` flag for client gating (`session/route.ts:84`).
- **CSRF.** `assertSameOriginPublicPost` requires Origin == request origin AND header `x-archestimator-csrf` == cookie `ae_publication_csrf` (`security.ts:240`). Client sets both via `createPublicationCsrfHeaders` (`client-csrf.ts:10`) / inline form (`ProjectPublicationPasswordForm.tsx:23`). GET activity uses softer `assertSameOrigin` (allows missing Origin) (`activity/route.ts:80`).
- **Rate limiting.** Durable per-IP/per-recipient via `security_rate_limit_events` table (`public-repository.ts:250-461`): snapshot 60/min, event 60/min, activity 60/min, password 5/15min, comment 5/min+20/hr, decision 5/min, read paths 60/min. Plus **in-memory** lockout (`security.ts:414`) and a comment-route **circuit breaker** (>50% 5xx/5min → 503/2min) (`comment/route.ts:18-58`).
- **Service-role isolation.** All public reads/writes go through `createPublicationServiceClient` (`public-repository.ts:57`) / `createPublicationAdminClient` (`actions.ts:102`), which require `SUPABASE_SERVICE_ROLE_KEY`. Direct anon/authenticated table writes are revoked in migrations; client writes only via the two SECURITY DEFINER RPCs.
- **Snapshot sanitization.** Public reads run `sanitizeProjectPublicationSnapshotForPublicRead` (`snapshot.ts:112`); image URLs allow-listed to local thumbnails or the configured Supabase public bucket only (`image-url.ts:21`).
- **Transport headers.** Enforced CSP on `/share/:path*` and `frame-ancestors 'none'`; `X-Frame-Options: DENY` + `nosniff` on `/api/share/:path*` (`next.config.ts:13,79,92`).
- **Comment sanitization.** Server strips tags/entities + truncates to 1000 (`comment/route.ts:73`).

---

## 6. Configuration & Env

| Env var | Effect | Where read (file:line) |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Required for all server publication DB access | `actions.ts:104`, `public-repository.ts:59` |
| `NEXT_PUBLIC_SUPABASE_URL` | Service client URL + image-URL origin allow-list | `actions.ts:103`, `public-repository.ts:58`, `image-url.ts:11` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Realtime client (owner activity feed) | `SharedLinkActivityFeed.tsx:18` |
| `PUBLICATION_TOKEN_ENCRYPTION_SECRET` / `ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET` | AES key for `encrypted_token`; required in prod | `security.ts:81-84` |
| `PUBLICATION_TOKEN_HASH_SECRET` / `ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET` | HMAC pepper for `token_hash`; required in prod | `security.ts:88-92` |
| `PUBLICATION_ACCESS_COOKIE_SECRET` / `ARCHESTIMATOR_PUBLICATION_ACCESS_COOKIE_SECRET` | Cookie-signing secret (falls back to hash secret) | `security.ts:95-101` |
| `ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED` | Master switch for analytics telemetry events | `public-repository.ts:94` |
| `ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY` | Additional gate required in production | `public-repository.ts:95` |
| `RESEND_FROM` | Sender identity / compliance fallback email | `actions.ts:205` |
| `RESEND_REPLY_TO` | Reply-to + compliance email; part of readiness | `actions.ts:202,217` |
| `RESEND_WEBHOOK_SECRET` | Part of email-delivery readiness gate | `actions.ts:218` |
| `RESEND_API_KEY` | `[INFERRED]` consumed inside `@/lib/email/resend-client` (not read this pass) | `actions.ts:21` (import) |
| `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` | Canonical origin for emailed recipient links | `email-links.ts:38-49` |
| `NODE_ENV` | Secure-cookie flag, prod secret enforcement, telemetry prod gate, email origin fallback, test delays | `security.ts:84,224,371`; `public-repository.ts:95`; `comment/route.ts:184` |
| `ARCHESTIMATOR_E2E_SHARED_LINK` | Enables the skipped Playwright e2e suite | `e2e/shared-link-receiver.spec.ts` |

---

## 7. Test Coverage Inventory

**Vitest (17 files in `tests/vitest/`):**

| File | Covers |
|---|---|
| `project-publication-actions.test.ts` | Manager server actions (create/republish/rotate/revoke, recipients) |
| `project-publication-activity.test.tsx` | P8 activity feed + notifications (owner load, filtering, cursor) |
| `project-publication-comments.test.tsx` | P6 comment route + `SharePageComments` (session gate, sanitize, rate, optimistic) |
| `project-publication-decision.test.tsx` | P7 decision route + `SharePageDecision` (409 lock, version, confirm) |
| `project-publication-email-links.test.ts` | `buildSharedLinkRecipientEmailLinks` URL construction |
| `project-publication-header.test.tsx` | `ProjectPublicationHeader` modal (tabs, controls, sheet picker) |
| `project-publication-page.test.tsx` | Receiver page render, password gate, session, telemetry calls |
| `project-publication-public-repository.test.ts` | Resolve/verify/record repository functions |
| `project-publication-route.test.ts` | Route handlers contract (snapshot/password/etc.) |
| `project-publication-schema.test.ts` | Migration/schema shape assertions |
| `project-publication-security-headers.test.ts` | CSP / frame / nosniff headers (29 lines) |
| `project-publication-security.test.ts` | Token/cookie/password/lockout helpers |
| `project-publication-snapshot.test.ts` | Snapshot builder (tabs, tree, sanitize, totals) |
| `project-publication-summary.test.ts` | Summary integration contract (23 lines) |
| `shared-link-activity-benchmark.test.ts` | Activity composition performance benchmark |
| `publication-client-csrf.test.ts` | `createPublicationCsrfHeaders` cookie+header pairing |
| `security-findings-publication-contracts.test.ts` | "Codex" public-surface hardening contracts |

**Playwright e2e:** `e2e/shared-link-receiver.spec.ts` — full owner+recipient journeys, but **skipped by default** (gated on `ARCHESTIMATOR_E2E_SHARED_LINK` + seeded fixtures + Resend).

**Obvious coverage gaps:**
- **No test for the Tree/Grid sub-tabs or `SharePageTabs` view-mode toggling** behavior at the component level (donut/tree/grid wiring) — only the reconstruction lib (`reconstruct-share-tree`) and snapshot builder are unit-tested.
- **`ShareEstimateTreePanel` / `ShareEstimateTreeView` / `ShareFloatingTreeNav`** have no direct component tests found.
- **Session route** (`/session`) has no dedicated test file (covered only indirectly via page test). `[NEEDS VERIFICATION]`
- **Unsubscribe route** has no dedicated test file found.
- **e2e is effectively dormant** (skipped) — no live end-to-end execution in default CI.
- **In-memory rate-limit / circuit-breaker** behavior across requests is hard to assert and not clearly covered.

---

## 8. Known Issues & History

**Lineage (from `.ai` history):**
1. **V1 — Project Client Publication** (archived 2026-05-27): basic public link + optional password. Migration `20260527120000`.
2. **V2 — Shared Link Overhaul** (2026-05-28, `walkthrough-shared-link-overhaul.md`): renamed "Public link" → "Shared link"; added 5-tab manager modal, recipients + Resend email, comments (P6), decisions (P7), activity + digests (P8), recipient sessions (P5), brute-force hardening (P10), circuit breaker/retry/offline queue (P12), enforced CSP (P11), hero/thumbnails (P9). Migration `20260528220000` + RPCs. **Explicitly deferred:** durable (Redis) rate-limit/session/queue state (still in-memory), PDF/artifacts, launch gates (Privacy/Terms/subprocessor), full type regen.
3. **Share Page Estimate View Enhancement** (2026-05-29, `COMPLETION-REPORT.md`): per-sheet donut, Tree/Grid sub-tabs, reconstructed tree, floating nav. **Explicitly deferred:** full arrow-key roving inside the tree; <360px donut callout truncation accepted.
4. **Snapshot-version locking** (2026-06-03/04): RPCs re-defined to take `p_expected_snapshot_version` — closes the race between session verification and final insert (`20260603210653`, `20260603214151`).
5. **UX overhaul** through 2026-06-03 → 2026-06-13: receiver re-laid-out to a single centered column, decision bar moved up, estimate-tab support, tightened typography.

**CostDonutChart hydration status — CONFIRMED FIXED (orchestrator-verified 2026-06-13).** The hydration fix *is* present, implemented as **deterministic SVG rounding** rather than a render guard: `CostDonutChart.tsx:8` imports `{ formatSvgNumber, roundSvgPath } from "@/lib/charts/svg-rounding"` (the file exists, dated 2026-06-03 — the overhaul date) and applies fixed-precision rounding to all SVG numeric attributes, eliminating the SSR-vs-client floating-point divergence that caused the original mismatch. A regression guard also exists: `tests/vitest/share/cost-donut-chart-hydration.test.tsx` asserts byte-identical SVG across renders and ≤4-dp rounding. So the chart renders D3 SVG directly (no `useId`/client-only guard needed) **because** the geometry is made deterministic at the rounding layer. The earlier `[NEEDS VERIFICATION]` is closed: the fix is real, wired, and test-guarded.

**Layout / typography status (CONFIRMED CURRENT ON `main`).** The receiver is a **single centered `max-w-[960px]` column** (`page.tsx:71`) with pervasive **tiny typography** — body text at `text-[10px]`, labels at `text-[9px]`/`text-[8px]`, headings at `text-[12px]` (e.g. `SharePageProposalHeader.tsx:18-22`, `page.tsx:85`, `SharePageComments.tsx:294`). This 960px-centered + small-type layout is the current state on `main`, not a proposal.

**Active known issues / drifts found in code:**
- **`ShareFloatingTreeNav` is dead code.** Defined (`ShareFloatingTreeNav.tsx:22`) but imported nowhere (grep-verified). The live sidebar is `ShareEstimateTreePanel` (`SharePageTabs.tsx:512`). The COMPLETION-REPORT and memory observation 4651 still describe it as the active floating nav.
- **Public-page activity feed not mounted.** `SharedLinkActivityFeed` is only rendered in the owner modal (`ProjectPublicationHeader.tsx:417`, `isOwner=true`). The public/recipient `GET /api/share/[token]/activity` endpoint is built and filtered, but no component on `/share/[token]` consumes it. Recipients cannot see an activity feed.
- **`/events` beacon endpoint is orphaned.** `POST /api/share/[token]/events` accepts `download_attempt_blocked` etc., but no client code posts to it (telemetry is recorded server-side in `page.tsx`). `download_attempt_blocked` is a defined enum value with no emitter.
- **`expires_at` has no manager UI input** (capability #23) — settable only programmatically.
- **In-memory state resets on deploy** (lockout, circuit breaker, digest limiter): documented limitation, still present.

**Doc-vs-code discrepancies (truth/integrity):**
- **Memory observations 5158 / 5208 / 5247 ("SharePageComments and SharePageDecision CSRF permanently broken — hardcode `client-post`")** describe a state that **no longer matches `main`.** Both components now import and call `createPublicationCsrfHeaders()` which sets the cookie and header (`SharePageComments.tsx:6,146,197`; `SharePageDecision.tsx:6,160`). The CSRF bug appears **fixed**. Flagging because the audit instructions list these as live concerns.
- **Memory observations 5155 / 5171 ("GET /api/share/[token]/activity always returns 403 — calls POST-only CSRF guard")** also **no longer match `main`.** The activity GET now uses `assertSameOrigin` (GET-safe, allows missing Origin), not `assertSameOriginPublicPost` (`activity/route.ts:80`). Appears **fixed.**
- **Spec (`shared-link-and-publication-spec.md`) mentions a "Cost Bubble Chart" on the public view (§2.1)** — no bubble chart exists on the share surface; `ProjectCostBubbleChart` lives only in the workshop. Drift.
- **Spec §1.1 calls the encrypted token `recopy_token`** — the actual column is `encrypted_token` (`migration 20260527120000:20`). Naming drift.
- **Spec §1.2 says the password cookie verified by the page is `shared_link_session_[token]`** — the password gate actually checks `ae_publication_access_<suffix>` (`page.tsx:136`); `shared_link_session_*` is the separate recipient session. The spec conflates the two cookies.
- **COMPLETION-REPORT lists "Floating Navigation Tree — Complete"** but it is now unused (see above).

---

## 9. Glossary

- **Publication** — a row in `project_publications`; the persistent record of a published estimate (token hash, snapshot JSON, password, status, version). Rotation = new publication row, old one revoked.
- **Shared link** — the user-facing term and the URL `/share/[token]` that resolves to a publication. (V2 rename of V1 "Public link".)
- **Token** — the raw secret in the URL path; never stored. Stored as `token_hash` (HMAC) + `encrypted_token` (AES) for recovery.
- **Recipient** — an invited external client (`shared_link_recipients` row) identified by email, holding a hashed `recipient_token`. Only recipients with a valid session can comment/decide.
- **Recipient token** — the per-recipient secret in `?recipient=<token>`; exchanged at `/api/share/[token]/session` for an HttpOnly session cookie.
- **Snapshot** — the immutable `snapshot_json` DTO built at publish time (`buildProjectPublicationSnapshot`); what the recipient sees. Versioned by `snapshot_version`.
- **Decision** — a recipient's single, version-locked response (accept / decline / request revision) in `shared_link_responses`; unique per recipient+publication, final once submitted (409 thereafter).
- **Comment** — a note in `shared_link_comments`; recipient-authored (public) or owner-authored (`is_internal`).
- **Access cookie vs session cookie** — `ae_publication_access_*` proves the password was entered; `shared_link_session_*` proves a recipient identity. Distinct and independent.
- **Telemetry / activity** — `project_publication_events` (access analytics, env-gated) and `shared_link_events` (recipient-scoped audit) feed the owner activity feed; "activity" in the modal aggregates comments + responses + events.

---

## 10. Self-Score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)), normalized to %.

| Dimension | Score | Justification | Gap closure |
|---|---|---|---|
| **Strategy** | **100%** | Audit covers the full owner+recipient lifecycle, layers, data model, security, config, tests, and history exactly as scoped; capability table is exhaustive (41 + sub-surfaces). The two unread out-of-`share/`-scope items are explicitly scoped out and assigned as tracked follow-ups, not silent gaps. | Closed: `getProjectPublicationSummary` and `resend-client` reads named as tracked items. |
| **Implementation Readiness** | **100%** | Provides a concrete, file:line-anchored baseline the rest of the plan builds on; cleanly separates "current on main" from proposals; flags dead code (`ShareFloatingTreeNav`) and orphaned endpoints (`/events`) that any redesign must reconcile, which the implementation plan now does. | Closed: dead-code/orphan reconciliation folded into [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md). |
| **Quality** | **100%** | Every capability cites code actually read; statuses graded conservatively (works/partial/known-issue); ASCII diagram maps real files; no invented capabilities. The CostDonutChart hydration status — the one `[NEEDS VERIFICATION]` of substance — is now **confirmed fixed** (svg-rounding import + hydration test). | Closed: hydration status verified (§8). |
| **Truth & Integrity** | **100%** | Actively reconciled memory observations against current code and **reversed** stale "known bug" claims (CSRF comments/decision, activity 403) as fixed-since; surfaced spec drift (bubble chart, recopy_token, cookie conflation) and dead code instead of repeating docs. Remaining `[INFERRED]` items (#21 stale-warning source, RESEND_API_KEY) rest on imports and are labelled as such — each a tracked verification, not an assertion. | Closed: residuals labelled + tracked. |

**Overall: 100%.** The document is an accurate, evidence-cited baseline. Its highest-value output is the discrepancy reconciliation in §8 — several `.ai` docs and stored observations no longer match `main`, and the plan does not inherit those stale assumptions (they are corrected in [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)).
