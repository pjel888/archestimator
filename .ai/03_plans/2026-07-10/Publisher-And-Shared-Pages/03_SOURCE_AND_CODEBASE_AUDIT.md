# 03 — Source And Codebase Audit

<!-- Audit baseline: git HEAD 081a0757a on 2026-07-10. All file:line references
are against this commit. This audit is read-only evidence; it does not modify
source. -->

## A. Feature Inventory (what exists today)

The Publisher + Shared Link feature spans **four user-facing surfaces**, backed
by a deep server-side publication engine and a D1 schema.

| Surface | Route | Audience | Purpose |
|---|---|---|---|
| Publisher roster + drawer | `/workshop/publisher` | Manager (owner/admin) | Manage project publications, generate share links, invite recipients |
| Shared link (proposal review) | `/share/[token]` | Recipient (client) | View published proposal, comment, decide |
| Recipient proposals inbox | `/workshop/proposals` | Recipient (signed-in user) | Browse proposals sent to your email, open them |
| Dashboard published links | `/workshop` (home) | Manager | Quick copy/preview/rotate/revoke live links |

### File inventory by surface

#### Publisher roster + drawer (manager)

| File | Lines | Role |
|---|---|---|
| `src/app/workshop/publisher/page.tsx` | 53 | RSC entry; loads roster, streams `PublisherRosterClient` |
| `src/app/workshop/publisher/loading.tsx` | 6 | Route skeleton |
| `src/app/workshop/publisher/error.tsx` | 16 | Route error boundary |
| `src/components/workshop/publisher/PublisherRosterClient.tsx` | 295 | Core interactive surface; URL state, drawer wiring, copy link |
| `src/components/workshop/publisher/PublisherRosterRow.tsx` | 177 | Presentational roster `<tr>` with status badge + actions |
| `src/components/workshop/publisher/PublisherRosterSkeleton.tsx` | 38 | Loading skeleton |
| `src/components/workshop/publisher/PublisherEmptyState.tsx` | 50 | Empty states (filtered/mobile/no-publications) |
| `src/components/workshop/publisher/PublisherDrawer.tsx` | 541 | 6-tab manage drawer (Overview/Recipients/Sheets/Access/Settings/Activity) |
| `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx` | 473 | Internal collaborator management (NOT email recipients) |
| `src/components/workshop/publisher/PublisherActivityFeed.tsx` | 34 | Activity tab wrapper |
| `src/components/workshop/publisher/usePublisherDrawer.ts` | 69 | TanStack Query hook for drawer data + 3 mutations |
| `src/components/workshop/publication/SheetPickerList.tsx` | 103 | Sheet selection checklist |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | 765 | Recipient email chip input + invite/resend/remove |
| `src/components/workshop/publication/publication-optimistic.ts` | 30 | UI staleness signature (possibly orphaned) |

#### Publisher data layer

| File | Lines | Role |
|---|---|---|
| `src/lib/publisher/roster-repository.ts` | 607 | Heavy roster query (100 pubs + 4×1000 child rows) |
| `src/lib/publisher/roster-filter.ts` | 89 | URL→filter parser |
| `src/lib/publisher/drawer-actions.ts` | 70 | Drawer server action |
| `src/lib/publisher/activity-actions.ts` | 21 | Activity server action wrapper |
| `src/lib/publisher/activity-repository.ts` | 502 | 5-source activity feed aggregator |
| `src/lib/publisher/permissions.ts` | 9 | RBAC predicates |

#### Publication core (shared by publisher + share page)

| File | Lines | Role |
|---|---|---|
| `src/lib/publication/actions.ts` | 1980 | ALL manager mutations: create/republish/rotate/revoke + recipients |
| `src/lib/publication/security.ts` | 553 | Token/password/cookie/CSRF/origin crypto |
| `src/lib/publication/snapshot.ts` | 514 | Snapshot builder + public-ID obfuscation |
| `src/lib/publication/public-repository.ts` | 1092 | Public-side service layer (access/snapshot/rate-limit) |
| `src/lib/publication/d1-store.ts` | 736 | Low-level D1 data access for public paths |
| `src/lib/publication/admin-d1-client.ts` | 699 | Supabase-style query builder + 5 "procedures" |
| `src/lib/publication/activity-helpers.ts` | 324 | Activity cursor crypto + target validation |
| `src/lib/publication/types.ts` | 133 | Domain types |
| `src/lib/publication/email-links.ts` | 100 | Recipient email link construction |
| `src/lib/publication/share-copy.ts` | 12 | Unavailable-link copy |
| `src/lib/publication/recipient-limits.ts` | 6 | Recipient action limit (50) |
| `src/lib/publication/image-url.ts` | 69 | Image URL allow-list |
| `src/lib/publication/client-csrf.ts` | 15 | Client CSRF helper |

#### Shared link page (recipient)

| File | Lines | Role |
|---|---|---|
| `src/app/share/[token]/page.tsx` | 361 | RSC entry; password gate, session bootstrap, render |
| `src/app/share/[token]/loading.tsx` | — | Skeleton |
| `src/app/share/[token]/not-found.tsx` | — | Unavailable link page |
| `src/app/share/print.css` | 61 | Print/PDF stylesheet |
| `src/components/share/SharePageTabs.tsx` | 866 | Estimate browser (tree + collated grid + cost donut) |
| `src/components/share/SharePageComments.tsx` | ~530 | Discussion section |
| `src/components/share/SharePageDecision.tsx` | ~370 | Decision section |
| `src/components/share/SharePageDecisionConfirmDialog.tsx` | — | Native dialog confirm |
| `src/components/share/ShareReviewWorkspace.tsx` | — | Orchestrator + mobile bottom nav |
| `src/components/share/SharePageProposalHeader.tsx` | — | Project title header |
| `src/components/share/SharePageSummaryCard.tsx` | — | Total + stats card |
| `src/components/share/SharePageHero.tsx` | — | Cover image |
| `src/components/share/SharePageSessionBanner.tsx` | — | Identity banner |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | — | Password gate form |
| `src/components/share/ShareContainer.tsx` | — | Layout primitive |
| `src/components/share/ShareEstimateTreePanel.tsx` | — | Tree sidebar (lg only) |
| `src/components/share/ShareEstimateTreeView.tsx` | — | Tree view |
| `src/components/share/SharedLinkActivityFeed.tsx` | 363 | Activity feed (shared by owner + recipient) |

#### Shared link API routes

| File | Role |
|---|---|
| `src/app/api/share/[token]/route.ts` | GET snapshot JSON |
| `src/app/api/share/[token]/password/route.ts` | POST password verify |
| `src/app/api/share/[token]/session/route.ts` | GET/POST/DELETE recipient session |
| `src/app/api/share/[token]/activity/route.ts` | GET public activity feed |
| `src/app/api/share/[token]/comment/route.ts` | GET/POST comments |
| `src/app/api/share/[token]/decision/route.ts` | GET/POST decisions |
| `src/app/api/share/[token]/unsubscribe/route.ts` | GET interstitial / POST unsubscribe |
| `src/app/api/share/[token]/events/route.ts` | POST telemetry (currently unused) |

#### Recipient proposals inbox

| File | Role |
|---|---|
| `src/app/workshop/proposals/page.tsx` | RSC entry |
| `src/app/workshop/proposals/proposals-data.tsx` | Auth + data fetch |
| `src/lib/repositories/recipient-proposals-repository.ts` | Inbox query (LIMIT 50) |
| `src/lib/recipient-proposals/actions.ts` | Server action wrapper |
| `src/components/workshop/proposals-page-client.tsx` | Client orchestrator |
| `src/components/workshop/proposals-page/ProposalRow.tsx` | Row with "Review" button |

#### D1 schema

| Migration | Tables |
|---|---|
| `migrations/0014_publication_shared_links.sql` | `project_publications`, `project_publication_events`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `publication_digest_log` |
| `migrations/0015_publication_admin_sidecars.sql` | `estimate_row_items`, `estimate_nodes`, `estimate_tabs` (with FK CASCADE to estimates) |
| `migrations/0006_ai_audit_rate_limits.sql` | `security_rate_limit_events` (used by share rate limiters) |

## B. Current User Journey (manager → publish → recipient views)

```text
Manager logs in
  → /workshop dashboard
  → finds a project (Projects / Favorites / Recent)
  → ProjectChromeAsync shows Share/Access icons IF canManagePublication
    → clicks Share icon → deep-links to /workshop/publisher?project=<id>&drawer=<id>
  → OR navigates via sidebar "Publisher" (⌘5)
    → Publisher roster table (desktop only; <768px = "needs more width")
    → finds project row
    → clicks SlidersHorizontal icon → opens PublisherDrawer
      → Overview tab (read-only)
      → Recipients tab (empty: "available after a shared link exists")
      → Sheets tab ← THIS IS WHERE PUBLISHING HAPPENS
        → selects sheets (checkboxes)
        → clicks "Generate shared link" (or "Update shared page")
        → success: "Shared link ready." (tiny 9px feedback)
      → Recipients tab (now usable)
        → types emails → sends invitations
      → Settings tab
        → password / rotate / revoke
    → to VIEW the shared page: clicks "Open" anchor → /share/<token> in new tab
      → opens ANONYMOUS read-only view (no recipient session)
      → sees "sign in as a recipient" prompt but can't act on it
```

**Key friction: there is no "Share" button, no wizard, no primary CTA. Publishing
is a side-effect of saving sheet scope in a buried tab.**

## C. Current User Journey (recipient → receives → reviews)

```text
Recipient receives email with /share/<token>?recipient=<rawToken>
  → clicks link
  → /share/[token] page
    → if ?recipient= present → redirect to /api/share/[token]/session
      → sets HttpOnly session cookie → redirects back to clean URL
    → if password required + no access cookie → ProjectPublicationPasswordGate
    → renders: header → summary card → hero → ShareReviewWorkspace
      → SharePageTabs (estimate browser)
      → SharePageComments (if valid session)
      → SharePageDecision (if valid session)

  OR if recipient is a signed-in Archestimator user:
    → /workshop/proposals inbox
    → finds proposal row
    → clicks "Review" (disabled if not published)
    → openRecipientProposalAction → sets cookies → redirect to /share/<token>
```

## D. Current Data Flow

### D.1 Publish flow (manager)

```text
PublisherDrawer "Generate shared link"
  → republishProjectPublication({projectId, selectedEstimateIds, ...})
  → assertProjectPublicationManager(projectId) [RBAC: actorRank >= admin(30)]
  → loadProjectForPublication(projectId)
  → buildProjectPublicationSnapshot(projectId, selectedEstimateIds)
    → reads estimates, nodes, tabs, rows from D1
    → recomputes rowTotal server-side
    → creates ID maps (opaque public IDs)
    → sanitizes snapshot (strips internal UUIDs, GPS coords)
    → schemaVersion: 1.3 (or 1)
  → createPublicationToken() → 32 random bytes → base64url
  → hashPublicationToken() → HMAC-SHA256 → token_hash
  → encryptPublicationToken() → AES-256-GCM → encrypted_token
  → replace_project_publication procedure (batch: revoke old + insert new)
  → recordPublisherAuditEvent
  → revalidatePublicationRoutes
  → return {ok, clientLinkPath: /share/<token>}
```

### D.2 Recipient view flow

```text
GET /share/[token]
  → resolveProjectPublicationAccessByToken(token) [React.cache'd per request]
    → isPublicationTokenShape(token)
    → getPublicationAccessByTokenHash(hashPublicationToken(token))
    → isActivePublication? (published + not revoked + not expired)
  → if passwordRequired + no valid access cookie → PasswordGate
  → if ?recipient= → redirect to /api/share/[token]/session
  → resolveProjectPublicationSnapshotByToken(token) [React.cache'd]
    → getPublicationSnapshotByTokenHash
    → sanitizeProjectPublicationSnapshotForPublicRead (opaque ID maps)
  → createPublicationViewToken (HMAC signed snapshot version)
  → after(): record "open" event (bot-filtered, rate-limited)
  → render ProjectPublicationView
```

### D.3 Comment/decision submit flow (recipient)

```text
POST /api/share/[token]/comment
  → assertSameOriginPublicPost (Origin + double-submit CSRF)
  → parse session cookie → verifySharedLinkSessionCookieValue (crypto)
  → readPublicationViewSnapshotVersion(viewToken) → 409 if stale
  → rate limit (5/min, 20/hr per recipient)
  → sanitizeSharedLinkRecipientText (strip tags, truncate 1000)
  → insertSharedLinkComment
    → resolve publication context by token hash (SEC-06)
    → validate review target belongs to publication
    → expectedSnapshotVersion optimistic-concurrency guard
  → after(): owner digest email (throttled 15min)
  → 201 {id, comment, created: true}
```

## E. Security Architecture (current)

| Layer | Mechanism | Location |
|---|---|---|
| Token | 32 random bytes → base64url; HMAC-SHA256 hash stored; AES-256-GCM encrypted for link recovery | `security.ts` |
| Password | scrypt + per-hash salt + constant-time compare; NFC normalize; 5/hr rate limit + exponential delay (1-30s) | `security.ts`, `public-repository.ts` |
| Access cookie | `ae_publication_access_<suffix>` HMAC-signed, HttpOnly, SameSite=Lax, 24h, Secure(prod) | `security.ts:343-359` |
| Session cookie | `shared_link_session_<suffix>` HMAC-signed, HttpOnly, SameSite=Lax, 24h; binds `{token, publicationId, credentialVersion, recipientId}` | `security.ts:540-547` |
| Credential version | Changes only when password changes → invalidates all cookies | `security.ts:189-197` |
| CSRF | Double-submit `ae_publication_csrf` cookie + `x-archestimator-csrf` header on all public POST/DELETE | `security.ts`, `client-csrf.ts` |
| Origin | `assertSameOriginPublicPost` (strict) on mutations; `assertSameOrigin` (lenient, allows missing) on GET activity | `security.ts` |
| Rate limiting | Durable D1-backed per scope (snapshot 60/min, session 10/min+50/hr, password 5/hr, comment 5/min+20/hr, decision 5/min) | `public-repository.ts` |
| Circuit breaker | In-memory per-instance on comment POST only (4 consecutive 5xx or >50% over 4 samples → 503 for 2min) | `comment/route.ts:26-74` |
| PII | IP/UA HMAC-hashed with pepper; no raw IP/GPS/password stored; country from `cf-ipcountry` only | `public-repository.ts:180-183` |
| Public ID obfuscation | All internal UUIDs → opaque `proj_/est_/row_/node_/tab_` hashed IDs in public snapshot | `snapshot.ts:137-189` |
| Error echo suppression | SEC-15: raw RPC/DB errors never reach public client | `comment/route.ts:423-429` |
| Snapshot version lock | `expectedSnapshotVersion` on comment/decision writes → 409 on stale | `d1-store.ts:598-610` |

## F. Performance Characteristics (current)

| Concern | Current state | Evidence |
|---|---|---|
| Roster query | Up to 100 pubs + 4×1000 child rows pulled, then JS-filtered/sorted/paginated | `roster-repository.ts:19-20, 561-606` |
| Recipient/comment/response counts | Row-scan (up to 1000 rows shipped) then JS count, not `GROUP BY` | `roster-repository.ts:477-559` |
| Post-mutation refresh | Every publish/rotate/revoke triggers full `router.refresh()` (page RSC re-render) | `usePublisherDrawer.ts:36-40` |
| Snapshot sanitization | Module-global mutable `currentSanitizeIdMaps` — not reentrant-safe | `snapshot.ts:282` |
| Activity feed | 5 parallel queries over up to 250 pubs each + recipient/actor lookups | `activity-repository.ts` |
| Search debounce | None — every keystroke triggers `router.replace` in `startTransition` | `PublisherRosterClient.tsx:149-152` |
| React.cache | Per-request memoization of access + snapshot rows (avoids re-query on page + metadata) | `public-repository.ts:92-115` |
| Deferred telemetry | `after()` for open events, password attempts, owner digest | various |
| Bot filtering | Open count only incremented for non-bot visitors | `public-repository.ts:771-773` |

## G. Comprehensive Gap Inventory

### G.1 UX/UI gaps — Publisher (manager side)

| ID | Gap | Severity | Evidence |
|---|---|---|---|
| UX-PUB-01 | **No primary CTA / "Share" button anywhere.** Publishing is a side-effect of saving sheet scope in a buried tab. | Critical | No "New share" button in roster or drawer |
| UX-PUB-02 | **Terminology is product-internal.** "Publisher," "Publication," "Sheet scope," "Scope outline" — none are client/user words. | High | `MainSidebar.tsx:59`, throughout |
| UX-PUB-03 | **Desktop-only (<768px blocked).** Mobile users see "Publisher needs more width." No responsive fallback. | High | `PublisherRosterClient.tsx:224-226` |
| UX-PUB-04 | **No publish wizard / step flow.** User must: find row → click gear icon → Sheets tab → select sheets → click changing-label button → manually go to Recipients tab. No guidance. | Critical | Entire drawer flow |
| UX-PUB-05 | **No success/celebration after publishing.** "Shared link ready." in 9px text. No "copy your link," no "send to recipients," no "preview as client." | High | `actions.ts:847` |
| UX-PUB-06 | **No link preview/copy prominence.** URL never shown as selectable text; only Copy button (which fails silently if Clipboard API blocked). | Medium | `PublisherRosterClient.tsx:154-163` |
| UX-PUB-07 | **No "preview as recipient" mode.** Opening `/share/<token>` shows anonymous read-only view — manager can't see the interactive recipient experience. | High | No preview feature exists |
| UX-PUB-08 | **Three tiny unlabeled icon buttons per row** (copy/open/manage). Must hover for tooltip. | Medium | `PublisherRosterRow.tsx` |
| UX-PUB-09 | **No pagination control rendered.** Filter parses `page`/`pageSize` but UI never emits page controls. Users on >25-item workspaces can't reach later pages. | Medium | `PublisherRosterClient.tsx:174-182` |
| UX-PUB-10 | **"Access" tab shows project members, NOT share recipients.** Naming collision with "Recipients" tab and "Settings → Require password." Three concepts of "who can see." | High | `PublisherProjectMembersPanel.tsx` |
| UX-PUB-11 | **Search has no debounce.** Every keystroke triggers `router.replace`. | Medium | `PublisherRosterClient.tsx:149-152` |
| UX-PUB-12 | **`PublisherDisabledEmptyState` is dead code.** Feature flag never wired; always-on nav item. | Low | `PublisherEmptyState.tsx:9-20` |
| UX-PUB-13 | **Tiny typography throughout** (9-11px workshop px-cap). Brutal for occasional users. | Medium | All publisher components |
| UX-PUB-14 | **Dashboard has no "publish" CTA for unpublished projects.** `PublishedProjectLinks` only shows published projects. | Medium | `WorkshopDashboard.tsx:36-86` |
| UX-PUB-15 | **Copy-state aria-live announces all publications' states** as concatenated string. Noisy for SR. | Low | `PublisherRosterClient.tsx:269-273` |
| UX-PUB-16 | **`rowToSummary` fallback hardcodes `locationVisibility: "locality"`** — drawer's first paint shows wrong setting until query resolves. | Low | `PublisherDrawer.tsx:90-112` |
| UX-PUB-17 | **Child-scan truncation (1000 rows) is silent.** Only the 100-pub cap sets `truncated`. | Low | `roster-repository.ts:19-20` |

### G.2 UX/UI gaps — Shared link (recipient side)

| ID | Gap | Severity | Evidence |
|---|---|---|---|
| UX-SHR-01 | **Session banner "Sign in as a recipient" is non-actionable text.** No button/link. Recipient can't act on it from the page. | Critical | `SharePageSessionBanner.tsx` |
| UX-SHR-02 | **Header always says "Awaiting your review"** even after decision submitted. Contradicts the decision state at the bottom. | High | `SharePageProposalHeader.tsx` |
| UX-SHR-03 | **Decision buttons at the very bottom** — must scroll past entire proposal. No sticky/floating CTA on desktop. | High | `SharePageDecision.tsx` |
| UX-SHR-04 | **Inconsistent decision language.** Button "Approve proposal" → badge "Accepted." Button "Request changes" → badge "Revision requested." Mapping not obvious. | Medium | `SharePageDecision.tsx` |
| UX-SHR-05 | **"Ask about item" button on every row** — 250 rows = 250 buttons. Visual noise, conflates "question" with row selection. | High | `SharePageTabs.tsx:730-842` |
| UX-SHR-06 | **No totals/summary at bottom of collated table.** Sheet total only at top. | Medium | `SharePageTabs.tsx` |
| UX-SHR-07 | **Tree sidebar vanishes below `lg` (1024px).** "Scope outline" mode on mobile shows no nav. Inconsistent with desktop. | Medium | `SharePageTabs.tsx:844-859` |
| UX-SHR-08 | **COLLATED_ROW_LIMIT = 250 with no "show all."** Client can't browse rows 251+ without guessing filter terms. | Medium | `SharePageTabs.tsx` |
| UX-SHR-09 | **"Scope outline" / "Line item table" are internal jargon.** Clients don't know what "scope outline" means. | Medium | `SharePageTabs.tsx` |
| UX-SHR-10 | **No "show password" toggle** on password gate. | Low | `ProjectPublicationPasswordForm.tsx` |
| UX-SHR-11 | **No "contact sender / request password" on password gate dead-end.** | Medium | `ProjectPublicationPasswordForm.tsx` |
| UX-SHR-12 | **No expiry date shown to recipient** even though publication has `expiresAt`. | Medium | `SharePageSummaryCard.tsx` |
| UX-SHR-13 | **Missing cover image silently disappears** — no placeholder, no project initials. | Low | `SharePageHero.tsx` |
| UX-SHR-14 | **Comments are flat, no threading, no edit/delete.** Author type (owner vs recipient) has no visual distinction. | Medium | `SharePageComments.tsx` |
| UX-SHR-15 | **No dates on comments** — only `toLocaleTimeString` (hour:minute). | Medium | `SharePageComments.tsx` |
| UX-SHR-16 | **Nested scroll** — `max-h-[420px]` comment list inside already-scrolling page. | Low | `SharePageComments.tsx` |
| UX-SHR-17 | **No sender branding/logo.** Hero is project cover, not sender's brand. Trust gap. | Medium | `SharePageProposalHeader.tsx` |
| UX-SHR-18 | **Triple repetition of "Applies to {target}"** in comments section. | Low | `SharePageComments.tsx` |
| UX-SHR-19 | **Mobile bottom nav has no scroll-spy** — no active section indicator. | Low | `ShareReviewWorkspace.tsx` |
| UX-SHR-20 | **"Approve" requires signer name but Decline/Revision don't** — asymmetric for audit trail. | Medium | `decision/route.ts:306-310` |
| UX-SHR-21 | **No real-time updates.** Comments refresh only on window focus (30s staleTime). No polling, no SSE. | Medium | `SharePageComments.tsx:287-291` |
| UX-SHR-22 | **Session validity not reactive.** Cookie expiry mid-session not detected until 401. | Low | `use-shared-link-session.ts:21-22` |
| UX-SHR-23 | **No download PDF button** — only browser Print→Save as PDF path. `download_attempt_blocked` event declared but unused. | Medium | `events/route.ts:14`, `print.css` |
| UX-SHR-24 | **Cost donut hardcodes PHP/USD symbols.** Other currencies render as "EUR 1.2M" with space. | Low | `CostDonutChart.tsx` |

### G.3 UX/UI gaps — Recipient proposals inbox

| ID | Gap | Severity | Evidence |
|---|---|---|---|
| UX-PROP-01 | **"Review" button disabled for expired/revoked proposals** — no "request re-send" or "contact sender" path. Dead end. | High | `ProposalRow.tsx:77` |
| UX-PROP-02 | **All-or-nothing failure model.** One bad row → entire inbox returns `{ok:false, error:"unknown"}`. | Medium | `recipient-proposals-repository.ts:157` |
| UX-PROP-03 | **Inbox is dead surface for pure managers** — always shows "No proposals yet" with no explanation it's recipient-only. | Low | `ProposalsEmptyState.tsx` |
| UX-PROP-04 | **Email-bound, not account-bound.** If signed-in email ≠ invited email → `not-a-recipient` with no in-page fix. | Medium | `actions.ts:304-380` |

### G.4 Functional/technical gaps

| ID | Gap | Severity | Evidence |
|---|---|---|---|
| FN-01 | **`events/route.ts` is entirely unused** — POST-only telemetry, no consumer. Misleading name implies SSE. | Medium | `events/route.ts`, no `fetch` calls |
| FN-02 | **`download_attempt_blocked` event is dead** — declared but never emitted. | Low | `events/route.ts:14` |
| FN-03 | **No explicit body-size limits** on password/comment/decision/session POSTs — rely on platform defaults. | Medium | Multiple routes |
| FN-04 | **Status-code inconsistency: 401 vs 423 for password-required.** Comment GET and decision GET use 401; other routes use 423. | Low | `comment/route.ts:193`, `decision/route.ts:150` |
| FN-05 | **Circuit breaker only on comment POST, not decision POST.** Asymmetric protection. | Medium | `comment/route.ts:26-74` vs `decision/route.ts` |
| FN-06 | **Snapshot GET has no origin check** while activity GET does. Inconsistent (low risk, token-gated). | Low | `route.ts` vs `activity/route.ts:80` |
| FN-07 | **`loadSharedLinkPublicComments` caps at 200** with no pagination on comment GET. >200 comments silently truncate. | Medium | `public-repository.ts:876` |
| FN-08 | **Snapshot ID map uses module-global mutable state** — not reentrant-safe under concurrent sanitization. | Low | `snapshot.ts:282` |
| FN-09 | **No FOREIGN KEYs** on any publication/shared-link table. Integrity is app-layer only. Orphaned rows on project/workspace deletion. | Medium | `migrations/0014_*.sql` |
| FN-10 | **Per-instance circuit-breaker state** resets on cold start, not shared across instances. | Low | `comment/route.ts:31-34` |
| FN-11 | **No startup validation for publication secrets** — production throws at request time, not boot. | Low | `security.ts:103,110` |
| FN-12 | **`createPublicationEventRequest`** uses `x-forwarded-proto`/`host` with hardcoded fallbacks. Analytics fidelity risk. | Low | `page.tsx:100-104` |
| FN-13 | **Unsubscribe success echoes recipient email** in plaintext. Intentional but privacy note. | Low | `unsubscribe/route.ts:124` |

### G.5 Facets not yet included (new capability gaps)

| ID | Gap | Category |
|---|---|---|
| NEW-01 | **No PDF export** (server-generated, branded, downloadable) | Feature |
| NEW-02 | **No real-time collaboration / live updates** for comments and decisions | Feature |
| NEW-03 | **No comment threading or @mentions** | Feature |
| NEW-04 | **No proposal versioning / revision history** visible to recipient | Feature |
| NEW-05 | **No recipient analytics dashboard** (who opened, when, from where — beyond open count) | Feature |
| NEW-06 | **No multi-language / i18n** on share page (hardcoded `en-PH` formatting) | Feature |
| NEW-07 | **No custom branding / white-label** on share page (firm logo, colors, footer) | Feature |
| NEW-08 | **No proposal expiration notifications** (upcoming expiry warnings to recipients) | Feature |
| NEW-09 | **No "request changes" structured feedback** (just free-text note; no itemized change requests) | Feature |
| NEW-10 | **No e-signature / formal approval** (just a signer name + hash; no legal-grade signature) | Feature |
| NEW-11 | **No shareable comparison view** (compare two proposals/snapshots side-by-side) | Feature |
| NEW-12 | **No bulk publish / template** (publish multiple projects with same settings) | Feature |
| NEW-13 | **No audit trail export** for compliance (GDPR/contract records) | Feature |
| NEW-14 | **No mobile publisher experience** at all | Feature |
| NEW-15 | **No deep-link from estimate sheet editor to publisher** (must navigate via sidebar or project header) | Feature |

## H. Known-Red Baseline

No known-red tests or pre-existing failures were found in the publisher/publication
test surface. The existing test `tests/vitest/recipient-proposals-route-gate.test.ts`
passes and guards auth-before-list ordering. No TODO/FIXME/HACK comments exist in
`src/components/workshop/publisher` or `src/lib/publisher`; the codebase uses
acceptance-criteria tags (AC-MOD-xx, SEC-xx, OPT-n) in comments instead.

## I. Cross-Feature Touchpoints

| Touchpoint | Location | Impact |
|---|---|---|
| Sidebar nav | `src/components/sidebar/MainSidebar.tsx:59` | "Publisher" (⌘5), always visible |
| Project header | `src/components/workshop/ProjectChromeAsync.tsx:20-122` | Deep-link to publisher drawer |
| Dashboard | `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx` | Copy/preview/rotate/revoke |
| Live project card | `src/components/workshop/LiveProjectCard.tsx:484-514` | Published vitals |
| Recipient inbox | `src/lib/repositories/recipient-proposals-repository.ts` | Bridge to `/share/<token>` |
| Route revalidation | `actions.ts:738-748` | Publish mutations refresh dashboard/publisher/proposals/share |
| Middleware | `src/lib/auth/request-proxy.ts` | `/workshop` protected, `/share` public |
| Auth roles | `src/lib/auth/roles.ts:11-16` | `PublicShareRecipientAuthority` type |
| Email client | `src/lib/email/transactional-email-client.ts` | Invitation + digest emails via Cloudflare Email |
