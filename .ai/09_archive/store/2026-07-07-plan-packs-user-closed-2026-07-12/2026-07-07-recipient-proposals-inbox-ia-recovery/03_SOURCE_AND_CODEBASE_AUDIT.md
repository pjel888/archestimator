# 03 — Source and Codebase Audit

This document records the systematic repository inventory performed by three read-only `Explore` subagent lanes plus lead synthesis. Every entry is repo-relative with line numbers where stable. Evidence is labeled; inferences are flagged.

## 3.1 Recipient inbox surface (signed-in)

### Route and page

| Path | Symbol | Responsibility | Impact |
|---|---|---|---|
| `src/app/workshop/proposals/page.tsx` | `ProposalsPage` (default), `ProposalsData` (async server component) | Mounts the inbox. `ProposalsData` runs inside `withPerfTraceRequest("workshop.proposals.data", …)`, calls `requireCurrentUserContext()` and `listRecipientProposals()`, renders `<ProposalsPageClient userEmail initialResult/>` inside `<Suspense fallback={<ProposalsListSkeleton/>}>`. | Required change (IA/loading). |
| `src/app/workshop/proposals/loading.tsx` | default | Renders `StaticWorkshopLoadingShell` + `ProposalsListSkeleton`. | Verification only. |

### Client orchestrator

| Path | Symbol | Lines | Responsibility | State | Impact |
|---|---|---|---|---|---|
| `src/components/workshop/proposals-page-client.tsx` | `ProposalsPageClient`, `ProposalsPageClientProps` | 1–~180 | `"use client"`. Orchestrates the inbox via TanStack Query. | `queryKey: ["recipient-proposals", userEmail]`; `queryFn: fetchRecipientProposals` → server action `loadRecipientProposals`; `initialData` from SSR; `staleTime: 30_000`; `refetchOnWindowFocus: false`; `retry: false`. Manual `refresh()` with in-flight guard + debounced (150ms) focus/visibility listeners. Three render branches: full-bleed error, soft-error banner, body (list or empty). | Required change (wrong-account interstitial, empty-state fork, decision-history affordance). |

> **Note:** `RecipientProposalsQueryError` (lines 21–29) carries `code: "unauthorized" \| "unknown"`. `readQueryErrorCode` normalizes any non-custom error to `"unknown"`. The soft-error label `readRefreshErrorLabel` (lines 42–45) maps `"unauthorized"` → "Sign in with the email address that received the proposal." — this is the only wrong-account-adjacent string today, and it fires on a *failed refresh*, not on a proactive mismatch detection.

### Sub-components (`src/components/workshop/proposals-page/`)

| Path | Symbol | `"use client"`? | Responsibility | Impact |
|---|---|---|---|---|
| `ProposalsList.tsx` | `ProposalsList` | yes | Renders the header + maps rows → `ProposalRow`. | Required change (decision-history affordance, status chips). |
| `ProposalRow.tsx` | `ProposalRow`, `ProposalRowProps` | yes | Single row. `useActionState` bound to `openRecipientProposalAction`; `useEffect` forwards action errors to parent. `getProposalState` priority cascade (revoked → expired → decision → opened → new). `decisionLabels` map for accepted/declined/revision_requested chips. "Review" `<form action={formAction}>` with hidden `publicationId`. `readActionErrorMessage` maps `not-a-recipient`/`unavailable`/`invalid`. | Required change (wrong-account recovery CTA, decision-history popover, status differentiation). |
| `ProposalsEmptyState.tsx` | `ProposalsEmptyState` | no | Dashed-border card: "No proposals yet" + "Proposals sent to your signed-in email address will appear here." | Required change (fork "no proposals" vs "wrong email"). |
| `ProposalsErrorState.tsx` | `ProposalsErrorState` | no | Error card with Retry. Maps `"unauthorized"` → "Sign in with the email address that received the proposal." | Verification only (or minor copy alignment). |
| `ProposalsListSkeleton.tsx` | `ProposalsListSkeleton` | no | 6 fake rows. | Verification only. |

### Sidebar entry

| Path | Symbol | Lines | Responsibility | Impact |
|---|---|---|---|---|
| `src/components/sidebar/MainSidebar.tsx` | nav item `proposals` | ~58 | `{ id: "proposals", href: "/workshop/proposals", label: "Proposals", icon: Presentation, shortcut: "⌘4" }`. Item 4 of 5. **No badge count** (verified by `main-sidebar-proposals-item.test.tsx`). | Possible change (badge when notification dispatch lands — V2, OPEN-IA-04). |

### Data layer

| Path | Symbol | Lines | Responsibility | Impact |
|---|---|---|---|---|
| `src/lib/recipient-proposals/actions.ts` | `loadRecipientProposals` | 1–~11 | `"use server"`. Delegates to `listRecipientProposals()`. | Verification only (trivial wrapper). |
| `src/lib/repositories/recipient-proposals-repository.ts` | `listRecipientProposals`, `RecipientProposalStatus`, `RecipientProposalDecision`, `RecipientProposalRow`, `RecipientProposalsResult`, `RecipientProposalD1Row` | 1–~163 | `"server-only"`. Direct D1 query over `shared_link_recipients` → `project_publications` → `projects` → `workspaces` (+ LEFT JOINs to `profiles sender` and `shared_link_responses`). **Filter:** `WHERE lower(recipient.email) = ? AND publication.status IN ('published','expired','revoked')`. **Status derivation** in SQL CASE. **Decision** = latest `shared_link_responses` row (correlated subquery `ORDER BY created_at DESC LIMIT 1`). **Sort:** `ORDER BY last_activity_at DESC, published_at DESC, id DESC`. **Limit 50.** Returns `{ok:false,error:"unauthorized"}` if no email; `{ok:false,error:"unknown"}` on any row-normalization failure or thrown error. | Required change (none for V1 listing; possibly expose `decisionCreatedAt`/`decisionNote` for history affordance — V1 keeps single latest). |

**RecipientProposalRow shape** (the recipient's DTO — no credential fields):
```
{ publicationId, projectId, projectName, projectCode, workspaceId, workspaceName,
  senderDisplayName, status: "published"|"expired"|"revoked", hasOpened,
  decision: "accepted"|"declined"|"revision_requested"|null, lastActivityAt,
  publishedAt, expiresAt, revokedAt, snapshotVersion }
```

### Open-proposal action (inbox → share bridge)

| Path | Symbol | Lines | Responsibility | Impact |
|---|---|---|---|---|
| `src/lib/publication/actions.ts` | `openRecipientProposalAction`, `OpenRecipientProposalActionState` | 304–380, 246–248 | `"use server"`. (1) `requireCurrentUserContext()`. (2) Validate `publicationId` UUID else `error:"invalid"`. (3) D1 RPC `authorize_recipient_publication_for_current_user({p_publication_id, p_current_user_email})` — returns `recipient_id` only if `lower(recipient.email)=lower(auth.email())` matches, else `error:"not-a-recipient"`. (4) Load publication; `isRecipientProposalPublicationAvailable` (status published, not revoked, not expired) else `error:"unavailable"`. (5) Decrypt token. (6) **If no password:** mint both `shared_link_session_*` cookies server-side (`getSharedLinkSessionCookieParts`). (7) `redirect("/share/<token>")`. | Required change (wrong-account branch: offer "sign in as the right email" instead of a bare error; possibly a pending-proposal bridge cookie analogous to `archestimator_pending_invite`). |

## 3.2 Share surface (public link entry)

### Route and page

| Path | Symbol | Responsibility | Impact |
|---|---|---|---|
| `src/app/share/[token]/page.tsx` | `SharePage` (default), `ProjectPublicationView`, `SharePageRecipientSessionAlert`, `ProjectPublicationPasswordGate`, `generateMetadata` | `dynamic="force-dynamic"`. Token trim/canonicalize; reads `?recipient=`/`?rt=` and `?recipientSession=invalid`; `resolveProjectPublicationAccessByToken(token)` → null ⇒ `notFound()`; password gate; recipient-token redirect to `/api/share/<token>/session`; validates `shared_link_session_<token>` cookie; parallel snapshot + recipient-identity read; builds `viewToken`; defers analytics + open event; renders `<ProjectPublicationView>`. | Required change (none to core; the wrong-account detection is absent here by design — public page ignores app-auth; recovery is inbox-side). |
| `src/app/share/[token]/loading.tsx` | default | Skeleton with `role="status" aria-live="polite"`. | Verification only. |
| `src/app/share/[token]/not-found.tsx` | default | Renders `SHARED_LINK_UNAVAILABLE_COPY`. **No differentiation** between invalid/expired/revoked. | Required change (differentiated copy — OPEN-IA-02). |
| `src/app/share/[token]/error.tsx` | — | **Does not exist.** Server errors fall through to `src/app/global-error.tsx`. | Required change (add share-level error boundary — see FR-10, UX-06). |

### Decision component and supporting UI (`src/components/share/`)

| Path | Symbol | Responsibility | Impact |
|---|---|---|---|
| `SharePageDecision.tsx` | `SharePageDecision`, `DecisionUiState`, `decisionUiReducer` | `useReducer` + `useQuery(["share-decision", token], fetchPersistedDecision, {enabled: isValid})`. Three render branches: anonymous (read-only, `data-testid="decision-anonymous-state"`), already-decided (locked badge `data-testid="decision-locked-badge"`), pending (Approve / Request changes / Decline → confirm dialog). 409 "already submitted" reloads and locks. 409 snapshot-stale shows "page was updated while you were deciding". | Required change (finality copy alignment with OPEN-IA-03; decision-history link to inbox — optional V1). |
| `SharePageDecisionConfirmDialog.tsx` | `SharePageDecisionConfirmDialog` | Native `<dialog>`, focus-trap + Escape, optional note + (accept-only) signer name. | Verification only. |
| `SharePageSessionBanner.tsx` | `SharePageSessionBanner` | "You are reviewing as {email}" + **"Not you?"** button (DELETE session). Anonymous variant: dismissible "Sign in as a recipient to comment and respond." | Required change (add "View all your proposals" link to inbox when session valid — email-link continuity FR-02). |
| `SharePageRecipientSessionAlert` (in `page.tsx` lines 84–97) | inline component | Amber banner: "We could not verify this personalized review link… commenting and response actions need a fresh link." | Verification only (copy may align with OPEN-IA-02). |
| `ProjectPublicationPasswordForm.tsx` | `ProjectPublicationPasswordForm` | Password gate; 429 lockout state. | Verification only. |
| `ShareReviewWorkspace.tsx`, `SharePageTabs.tsx`, `SharePageComments.tsx`, `SharePageSummaryCard.tsx`, `SharePageHero.tsx`, `SharePageProposalHeader.tsx`, `ShareContainer.tsx`, `ShareEstimateTreeView.tsx`, `ShareEstimateTreePanel.tsx` | various | Read-only review surface. | **Explicitly unaffected** (no IA change needed). |
| `SharedLinkActivityFeed.tsx` | `SharedLinkActivityFeed` | **Owner-facing** paginated activity feed (not on recipient page). | Explicitly unaffected (owned by public-share-activity-minimization). |
| `share-review-target.ts` | `ShareReviewTarget`, `normalizeShareReviewTarget`, `serializeShareReviewTarget`, `shareReviewTargetDisplay`, `PROPOSAL_REVIEW_TARGET` | Pure helpers. | Verification only. |

### API routes (`src/app/api/share/[token]/`)

| Path | Method | Auth model | Key contract | Impact |
|---|---|---|---|---|
| `decision/route.ts` | GET, POST | **Anonymous via P5 session cookie** (`verifySharedLinkSessionCookieValue`); no app-auth. CSRF via `assertSameOriginPublicPost`. | GET 200 `{decision\|null}`; POST 201 `{id,decision,signerName,created:true}` then `scheduleOwnerDigest(...,"decision")`. Errors: 400 invalid decision/note/signer/target; 401 no session; 404 unavailable; 423 password_required; 409 snapshot-stale (`currentSnapshotVersion`) or "Decision already submitted."; 403 recipient mismatch; 429 rate-limited; 500 generic. **Never echoes raw RPC/DB text** (SEC-15). | Verification only (contract is stable; this pack does not change it). |
| `session/route.ts` | GET, POST, DELETE | GET = redirect entry from email link (`?recipient=`); verifies `verifySharedLinkRecipientToken`, sets both cookies, redirects to clean `/share/<token>` or `?recipientSession=invalid`. POST = JSON mode. DELETE = clears both cookies ("Not you?"). Rate-limited; records `recipient_session_started`. | Required change (none; but the wrong-account gap is here — the session route binds identity to the recipient token, not to the signed-in app email). |
| `password/route.ts` | POST | Sets access cookie on 204; 401 on wrong; 429 lockout. | Explicitly unaffected. |
| `activity/route.ts` | GET | Owner-facing; no recipient consumer today. | Explicitly unaffected (owned by public-share-activity-minimization). |

### Security primitives (`src/lib/publication/security.ts`)

| Symbol | Lines | Responsibility |
|---|---|---|
| `createPublicationToken` | 63–71 | 32 random bytes, base64url, 43 chars. |
| `hashPublicationToken` | 78–81 | HMAC-SHA256, prefix `hmac-sha256-v1:`. |
| `encryptPublicationToken` / `decryptPublicationToken` | 83–98 | AES-256-GCM, prefix `aes-256-gcm-v1:`. |
| `createPublicationAccessCookie` | 343–359 | Password access cookie; HttpOnly; 24h. |
| `getSharedLinkSessionCookieParts`, `verifySharedLinkSessionCookieValue`, `readSharedLinkSessionCookieRecipientId` | 419–547, 482, 500–508 | P5 recipient session cookie; HttpOnly; 24h; carries optional `recipientId`. |
| `createPublicationViewToken`, `readPublicationViewSnapshotVersion` | 259, 268 | Snapshot-binding view token. |
| `assertSameOriginPublicPost` | 373–387 | CSRF: origin + CSRF token + cookie match. |

**This pack does not change any security primitive.** They are coordinated with `invite-token-flow-hardening` and confirmed sound.

## 3.3 Data model (D1 migrations)

Latest migration at planning time: `migrations/0039_project_status.sql`. The recipient/publication schema lives in `migrations/0014_publication_shared_links.sql` (plus later hardening migrations). **No V1 schema change is required for this pack** (confirmed by audit — the IA work is UI/copy/routing).

| Table | Key columns | Key indexes | Relevance |
|---|---|---|---|
| `project_publications` | `id`, `workspace_id`, `project_id`, `token_hash` (UNIQUE), `encrypted_token`, `password_hash`, `status` CHECK `('published','expired','revoked')`, `snapshot_version`, `published_by`, `published_at`, `expires_at`, `revoked_at`, `open_count`, `latest_opened_at` | partial UNIQUE `idx_project_publications_one_published_per_project ON (project_id) WHERE status='published'`; `(project_id,status,published_at DESC)`; `token_hash` | One active publication per project; status drives availability. |
| `shared_link_recipients` | `id`, `publication_id`, `email`, `display_name`, `invited_by`, `invited_at`, `recipient_token_hash` (UNIQUE), `delivery_status` CHECK `('pending','sent','bounced','opened','responded')`, `last_opened_at`, `email_unsubscribed_at` | UNIQUE `(publication_id, lower(email))`; `recipient_token_hash`; `(publication_id, created_at DESC)`; `lower(email)` | One recipient per email per publication; `lower(email)` index is what the inbox query uses. |
| `shared_link_responses` | `id`, `publication_id`, `recipient_id`, `decision` CHECK `('accepted','declined','revision_requested')`, `note` (≤2000), `snapshot_version_at_decision`, `estimate_id`, `row_id`, `target_kind`, `target_label`, `signer_name` (≤120), `signature_intent_hash`, `created_at` | **partial UNIQUE `idx_shared_link_responses_recipient_publication ON (recipient_id, publication_id) WHERE recipient_id IS NOT NULL`**; `(publication_id, created_at DESC)`; estimate; row | **One immutable decision per recipient per publication.** This is the load-bearing constraint for FR-12 / OPEN-IA-03. |
| `shared_link_comments`, `shared_link_events`, `project_publication_events`, `publication_digest_log` | — | — | Supporting tables; not directly changed by this pack. |

> The historical Supabase migrations in `supabase/migrations/` (e.g. `20260629000000_recipient_proposals_rpc.sql`) are migration archaeology only — do not run, apply, or extend. The active store is D1 `ARCH_DB`.

## 3.4 Test coverage

| Path | Covers | Existing/new | Gaps |
|---|---|---|---|
| `tests/vitest/recipient-proposals-repository.test.ts` | 3 tests: safe D1 shape (no credential fields), unauthorized/unknown branches, RPC migration contract. | Existing | No expired/revoked/decision-state row fixtures in the DTO test; no history (only latest). |
| `tests/vitest/recipient-proposals-action.test.ts` | 6 tests for `openRecipientProposalAction`: invalid id, not-a-recipient, unavailable, mint-session-no-password, no-mint-with-password, source-ordering contract. | Existing | No wrong-account recovery CTA test (feature doesn't exist yet). |
| `tests/vitest/recipient-proposals-page.test.tsx` | 5 tests for `ProposalsPageClient`: row states (published/opened/accepted/expired/revoked), stale+retry-focus, full error, debounced refresh, empty state. | Existing | No wrong-account empty-state fork; no decision-history affordance; sub-components only transitively covered. |
| `tests/vitest/share/share-page-decision-anonymous.test.tsx` | 2 tests: anonymous read-only + valid-session actions. | Existing | — |
| `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` | 2 tests: three actions + modal copy; asserts copy does NOT say "final and cannot be changed". | Existing | Conflict with OPEN-IA-03 (finality) — must reconcile. |
| `tests/vitest/project-publication-decision.test.tsx` | 9 tests in `describe("SharePageDecision component")`: lock, buttons, prior-decision load, modal, focus trap, POST+lock, 409 reload-lock, failure announcements, comments-after-lock. | Existing | — |
| `e2e/shared-link-receiver.spec.ts` | **5 tests, ALL skipped** without `ARCHESTIMATOR_E2E_SHARED_LINK=1` + missing `tests/fixtures/shared-link.ts`. | Existing | Covers none of: expired, revoked, wrong-account, empty-state, decision-history, decline/revision, reload persistence, snapshot-stale, session expiry, unsubscribe, error pages. |

## 3.5 Sibling plan packs (coordination map)

| Pack | Status | Overlap | Coordination note |
|---|---|---|---|
| `2026-07-07-invite-token-flow-hardening` | CONDITIONALLY READY (emulated, 93) | Wrong-account pattern, bridge cookie, origin validation | This pack mirrors the invite wrong-account recovery pattern but on the publication surface. Invite pack owns `src/lib/collaboration/*`; this pack owns `src/lib/recipient-proposals/*` + `src/components/workshop/proposals-page*`. |
| `2026-07-07-public-share-activity-minimization` | CONDITIONALLY READY | Public activity route (owner-facing) | Owns `activity/route.ts` + `activity-composer.ts`; this pack does not touch it. |
| `2026-07-07-public-to-beta-trust-onboarding-continuity` | CONDITIONALLY READY | Post-auth handoff (login → terms → workshop) | Owns the trust/onboarding gate; this pack assumes that gate is intact and references it for the "sign in as correct email" continuation. |
| `2026-07-07-owasp-api-authz-matrix-refresh` | CONDITIONALLY READY | Authz matrix for share/publication routes | Authoritative authz reference; this pack's new/changed routes must satisfy SEC-05/11 (authz at the boundary, not only repository). |
| `2026-07-07-client-ready-proposal-package-workflow` | CONDITIONALLY READY (96) | Owner publisher workflow | Defers recipient read/unread to this pack; fences `proposals-page/*` and `recipient-proposals/*` as off-limits to itself. |
| `2026-07-07-proposal-export-and-immutable-deliverable-trust` | CONDITIONALLY READY | Immutable deliverable trust (content hashing, staleness) | Owns crypto primitives in `security.ts`; this pack does not change them. |

## 3.6 Project state and decisions

From `.ai/10_state/current-state.md` FAST PATH + targeted greps and `.ai/10_state/decisions.md`:

- **Stage:** pre-launch closed-beta MVP; no external users yet; bias to fast iteration.
- **Recipient inbox moved off Supabase RPC** to a direct D1 query in `recipient-proposals-repository.ts` (current-state.md:3277–3283). Credential columns never selected.
- **Share decision flow P7 complete** (current-state.md:9192): POST decision with CSRF + P5 session + snapshot locking + 409 handling. Foundation for owner notifications (not yet built).
- **Public-share authority ≠ app authority** (roles.ts:11–16; current-state.md:564–567): a workshop session does not confer recipient authority and vice versa.
- **Decision `:793`** (canonical publication decision): published content is a whitelisted snapshot DTO, not live workspace authorization; locked pages must not render metadata until access proven.
- **Decision `:931`**: "Treat the public share receiver as a proposal review portal, not a workshop-style technical viewer." — the canonical UX framing for the inbox.
- **Email delivery OFF by default** (`ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`); bounce/complaint ingestion BLOCKED-EXTERNAL.

## 3.7 Document-impact matrix

| Document | Affected by this pack? | Reason |
|---|---|---|
| `AGENTS.md` | No | Stack baseline unchanged. |
| `.ai/10_state/current-state.md` | Yes (after implementation) | Record the recipient IA + recovery states. |
| `.ai/10_state/decisions.md` | Yes (after OPEN-IA-01..04 resolve) | Record the four decisions. |
| `DESIGN.md` | No | Alpha-stage guide; no new tokens required for V1 (reuse existing chips/badges). |
| User-facing copy (TBD home) | Yes | Differentiated recovery copy (OPEN-IA-02). |
