# 03 — Source and Codebase Audit: Endpoint Inventory + Authorization Decision Table

This is the **load-bearing artifact** of the pack. Every route handler and Server
Action in the live runtime is inventoried with file:line evidence and an explicit
verdict on auth, authz/ownership, input validation, rate limit, and test coverage.

**Legend:** ✅ present & verified · ⚠️ present but weak/inconsistent · ❌ absent · N/A

## A. Authentication & authorization helper index (referenced by all tables)

### AuthN (session resolution)
| Helper | Location | Notes |
|---|---|---|
| `getCurrentUserContext` | `src/lib/auth/session.ts:89` | React `cache`-wrapped; returns null silently. Order: dev-bypass → Better-Auth (`disableCookieCache:true`) → closed-beta gate → D1 `profiles` lookup. |
| `requireCurrentUserContext` / `requireAuth` | `src/lib/auth/session.ts:100,106` | `redirect("/login")` on null session. |
| `getAiRequestUserContext` | `src/lib/ai/auth.ts:24` | AI-specific; rejects dev-admin-bypass; requires provider-backed Better-Auth workspace user. |
| Better Auth handler | `createCloudflareBetterAuthNextHandlersForRequest` `src/lib/auth/cloudflare-better-auth-runtime.ts:156` | `toNextJsHandler(auth.handler)`. |
| `auth.api.getSession` | via `getBetterAuthRouteGateSession` `src/lib/auth/better-auth-cloudflare.ts:260` | Reads `better-auth.session_token` / `__Secure-` cookie; checks `session.expiresAt` against D1. |

### AuthZ (D1 application-authorization layer — `src/lib/authz/d1-access.ts`)
| Predicate | Line | Checks | Admin bypass |
|---|---|---|---|
| `canAccessProjectInD1` | 99 | `workspace_members` OR `project_members` OR `estimate_sheet_members` (broadest) | `isPlatformAdmin` |
| `canAccessWholeProjectInD1` | 140 | `workspace_members` OR `project_members` only (**excludes estimate-only sheet members**) | yes |
| `canEditProjectInD1` | 175 | role-gated (`owner/admin/member` ws, `owner/admin/editor` project) | yes |
| `canAccessEstimateInD1` | 212 | `estimate_sheet_members` OR (if `inherit_project_access=1`) ws/project members | yes |
| `canEditEstimateInD1` | 261 | role-gated sheet + inherited project members | yes |
| `isWorkspaceEditorInD1` | 313 | ws role `owner/admin/member` | yes |
| `isWorkspaceMemberInD1` | 336 | ws role `owner/admin/member/viewer` | yes |

**All probes fail closed** (`runAllowedProbe` returns `false` on any D1 error). Read
helpers `readProjectFromD1`/`readEstimateInProjectFromD1` are context lookups only,
never the sole gate.

### Other authz gates
| Gate | Location | Purpose |
|---|---|---|
| `assertProjectPublicationManager` | `src/lib/publication/actions.ts:394` | Publication owner RBAC (manager rank). |
| `assertCanManageLibrary` / `assertCanManageLibraryFolders` | `src/lib/component-library/actions.ts:339,322` | Workspace editor gate for library. |
| `requireWorkspaceTemplate` | `src/lib/component-library/template-editor-actions.ts:276` | SQL `WHERE id=? AND workspace_id=?` template scoping. |
| `assertProjectAccessManager` / `assertEstimateAccessManager` | `src/lib/collaboration/actions.ts:218,288` | Manager-rank gate for invites. |
| `assertAssignableRole`, `hasOtherProjectManager` | `src/lib/collaboration/actions.ts` | Cannot assign above own rank; last-manager protection. |
| `canManageClosedBetaAllowlist` / `canReviewBetaFeedback` | `src/lib/auth/beta-allowlist-admin.ts:30`, `src/lib/workshop/beta-feedback-review.ts` | Platform-admin (`ceo`/`admin`) gate. |
| `canApproveUploadScanOverride` | `src/lib/uploads/scan-override.ts:44` | Platform-admin scan-override gate. |
| Publication token/password/recipient gates | `src/lib/publication/security.ts` + `public-repository.ts` | See Section C. |

### Rate-limit helpers
| Helper | Location | Scope |
|---|---|---|
| Durable `security_rate_limit_events` (publication) | `src/lib/publication/public-repository.ts:357-617` | 11 publication scopes |
| Durable `security_rate_limit_events` (AI) | `src/lib/ai/rate-limit.ts:37` | `ai_ask` 10/min, 60/hr |
| Durable atomic reserve+rollback (privacy) | `src/app/api/compliance/privacy-requests/route.ts:206-280` | `privacy_request_email` 3/hr, `privacy_request_ip` 5/hr |
| Durable (invite) | `src/lib/collaboration/invite-entry.ts:221-277` | create/resend/resolve/accept/continue |
| **In-memory** upload admission | `src/lib/uploads/admission-control.ts:70` | per-isolate; **not a security boundary** |
| **In-memory** estimate action | `src/lib/estimates/action-rate-limit.ts:38` | per-isolate; **SEC-03** |
| **In-memory** client-error | `src/app/api/internal/client-error/route.ts` | per-isolate |

### CSRF / origin helpers
| Helper | Location |
|---|---|
| `assertSameOrigin` (read, allows missing Origin) | `src/lib/publication/security.ts:361` |
| `assertSameOriginPublicPost` / `Delete` / `FormPost` | `:373,389,393` (double-submit CSRF `ae_publication_csrf` ↔ `x-archestimator-csrf`) |
| `isAllowedInviteOrigin` | `src/lib/collaboration/invite-origin.ts:22` (**SEC-01** — returns `true` when Origin+Referer both absent) |
| `sameOrigin` / `passesFetchMetadata` | `src/app/api/internal/client-error/route.ts:27,33` |

---

## B. API + non-API route handler decision table

Format: `METHOD path | file:line | AuthN | AuthZ/ownership | Validation | Rate-limit | Test coverage`

### `/api/auth` — Better Auth (delegated)
| `*` `/api/auth/[...all]` | `src/app/api/auth/[...all]/route.ts:65-83` | Better Auth `handlers` | Better Auth `trustedOrigins` (from `BETTER_AUTH_TRUSTED_ORIGINS`) | none (Better Auth internal) | Better Auth internal | `cloudflare-better-auth-route.test.ts` etc. | `runtime="nodejs"`, `force-dynamic`, `Cache-Control: no-store`; OAuth state-cookie normalization.

### `/api/ai`
| `POST` `/api/ai/ask` | `src/app/api/ai/ask/handler.ts:105` | `getAiRequestUserContext` | workspace-scoped read context | manual `typeof string` + 8000-char cap | ✅ D1 `checkAiAskQuota` 10/min 60/hr | `ai-auth-guard.test.ts` | 401/403/503 gating; feature-flagged `isAiRoutesEnabled`.
| `POST` `/api/ai/package-builder` | `src/app/api/ai/package-builder/handler.ts:176` | `getAiRequestUserContext` | ✅ `verifyPackageDraftToken` (HMAC, user-bound) + `recordAiPackageApplyAuthorization` | manual schema validators | ❌ no quota on this route | `ai-package-builder-security-contract.test.ts` | Apply gated by explicit confirmation + draftHash match.

### `/api/compliance`
| `POST` `/api/compliance/privacy-requests` | `route.ts:305` | ❌ NONE (public intake) | ❌ NONE (intentional) | ✅ 16 KiB stream cap `readRequestBodyBytesWithSizeLimit`, allow-list kinds, `sanitizeMetadataForIntake` strips token/secret/password/cookie/authorization keys | ✅ D1 atomic `reserveRateLimitSlots` (email 3/hr + IP 5/hr, rollback) | `compliance-privacy-request-route.test.ts` | Trusts only `cf-connecting-ip`; opaque errors.

### `/api/component-library`
| `GET` attachments | `route.ts:360` | ✅ `requireCurrentUserContext` | ✅ `isWorkspaceEditorInD1` + `readAttachmentDownloadRecord` (ws-bound) + `decideUploadScanGate` + audit | `isUuid` | ❌ none (download) | `auth-sensitive-api-boundaries.test.ts:591,613` | Opaque 404; 409 if scan not approved.
| `POST` attachments | `route.ts:407` | ✅ | ✅ `isWorkspaceEditorInD1` | magic-byte pdf/xls/xlsx, 20 MiB | ⚠️ in-memory `reserveUploadAdmission` | same | Server-mediated.
| `DELETE` attachments | `route.ts:500` | ✅ | ✅ `isWorkspaceEditorInD1` + `isOwnedAttachmentPath` (ws+user prefix) + blocks reviewed | `readStoragePaths` | ❌ | same | Reviewed attachments can't be deleted (409).
| `POST` attachments/direct-upload | `direct-upload/route.ts:466` | ✅ | ✅ profile.id===userId + `recordPendingUploadSession` capacity | sha256, MIME, size, strategy | ⚠️ in-memory + D1 capacity (3/actor, 6/ws) | `upload-signed-route.test.ts` | `action=create|finalize`.
| `PUT` attachments/direct-upload | `direct-upload/route.ts:479` | ✅ | ✅ `readUploadSessionForFinalize` (ws+actor bound) + content-type & size match | session validation | ❌ | same | Raw R2 PUT; signed single-part ≤64 MiB.
| `POST` attachments/scan-override | `scan-override/route.ts:16` | ✅ | ✅ `canApproveUploadScanOverride` (**platform-admin only**) | `parseUploadScanOverrideRequest` | ❌ | — | Admin override of ClamAV scan.
| `GET` images | `images/route.ts:167` | ✅ | ✅ workspace match + `ensureDefaultWorkspace` | `parseComponentImageStoragePath` | ❌ | — | WebP fetch.
| `POST` images | `images/route.ts:188` | ✅ | ✅ `isWorkspaceEditorInD1` | magic-byte, 12 MiB, sharp re-encode | ⚠️ in-memory | `auth-sensitive-api-boundaries.test.ts` | WebP upload.
| `DELETE` images | `images/route.ts:305` | ✅ | ✅ `isWorkspaceEditorInD1` + `isOwnedUploadPath` | `readStoragePaths` | ❌ | — | |

### `/api/estimate-row-images`
| `POST` | `route.ts:138` | ✅ | ✅ `canEditProjectInD1` OR `canEditEstimateInD1`; row belongs to estimate | magic-byte, 12 MiB | ⚠️ in-memory (pre-body synthetic ws, then real) | `auth-sensitive-api-boundaries.test.ts:652` | No GET/DELETE (served via `/api/projects/images`).

### `/api/health`
| `GET` | `route.ts:7` | ❌ NONE | ❌ NONE | ❌ | ❌ | — | Public; service+timestamp only.

### `/api/internal/*` (service/secret-gated via `Bearer CRON_SECRET` or job-specific secret)
| `POST` client-error | `route.ts:110` | ❌ NONE (anonymous) | ❌ NONE | `normalizePayload` + `redactForLog` + 16 KiB | ⚠️ in-memory 10/min/IP | — | ✅ **`sameOrigin` + `passesFetchMetadata`** CSRF/origin. Hashes UA, redacts PII.
| `*` upload-cleanup | `route.ts:139,143` | ✅ `isAuthorized` Bearer | N/A (job secret) | `readLimit`/`isDryRun` | ❌ | — | Storage cleanup.
| `*` upload-scan | `route.ts:118,122` | ✅ Bearer | N/A | bounds | ❌ | — | ClamAV scan.
| `*` upload-runtime | `route.ts:233,237` | ✅ Bearer | N/A | 4 MiB probe | ❌ | — | Runtime/storage proof.
| `*` upload-lifecycle-proof | `route.ts:40,44` | ✅ Bearer (router-internal) | N/A | router-internal | ❌ | — | Hosted proof; synthetic fixtures only.
| `*` collaboration-invitation-proof | `route.ts:26,30` | ✅ Bearer | N/A | router-internal | ❌ | — | Hosted proof.
| `*` estimate-history-proof | `route.ts:26,30` | ✅ Bearer | N/A | router-internal | ❌ | — | Hosted proof.

### `/api/projects`
| `GET` `[projectId]/activity` | `activity/route.ts:42` | ✅ `requireCurrentUserContext` | ✅ `getCurrentWorkspaceProject` + `canEditProjectInD1` (403 if not editor) | `isUuid`, limit clamp 1–50 | ❌ | — | Editors only.
| `GET` `[projectId]/estimates/[estimateId]/export/proposal.xlsx` | `export/proposal.xlsx/route.ts:372` | ✅ `getCurrentUserContext` (401 JSON, no redirect) | ✅ `resolveExportAudience` → `isWorkspaceMemberInD1` | `parseExportSettings` finite bounds | ✅ D1 `checkProposalExportRateLimit` | `proposal-export-route.test.ts` | `maxDuration=60`, node/row caps.
| `GET` images | `images/route.ts:209` | ✅ + terms acceptance | ✅ `readProjectFromD1` (ws match) + `canAccessProjectInD1` OR `canAccessEstimateInD1` | `parseProjectImageStoragePath` | ❌ | `auth-sensitive-api-boundaries.test.ts:631` | Opaque 404 on all failures.
| `POST` images | `images/route.ts:270` | ✅ | ✅ `readProjectFromD1` + `canEditProjectInD1` | magic-byte, 12 MiB | ⚠️ in-memory (pre+post) | same | |
| `DELETE` images | `images/route.ts:440` | ✅ | ✅ `isUserOwnedUploadPath` + `canEditProjectInD1`/`canEditEstimateInD1` | `readStoragePaths` | ❌ | same | |

### `/api/share/[token]/*` — public surface (full detail in Section C)
| `GET` `/api/share/[token]` | `route.ts:19` | ❌ public; password cookie if required | ✅ token-bound resolve + active-state | none | ✅ D1 snapshot 60/min | `share-snapshot-redaction.test.tsx` | Records open event.
| `*` `/api/share/[token]/session` | `session/route.ts:135,146,163` | ❌ public recipient flow | ✅ `resolveProjectPublicationAccessByToken` + `verifySharedLinkRecipientToken` (publicationId match) | recipientToken | ✅ D1 10/min 50/hr | `share/get-routes-contract` | ✅ CSRF POST/DELETE. HMAC session cookie.
| `POST` `/api/share/[token]/password` | `password/route.ts:46` | ❌ public | ✅ `verifyProjectPublicationPasswordByToken` (scrypt) | manual string | ✅ D1 5/hr lockout + escalating delays | `project-publication-password-lockout-route.test.ts` | ✅ CSRF. Clears failures on success.
| `GET/POST` comment | `comment/route.ts:161,213` | recipient session cookie (+ password) | ✅ access + session + viewToken snapshot | `sanitizeSharedLinkRecipientText` 1000 chars, review-target regex | ✅ D1 5/min 20/hr (POST), 60/min (GET) + **circuit breaker** | `project-publication-comments.test.tsx` | ✅ CSRF POST. Internal-filtered.
| `GET/POST` decision | `decision/route.ts:117,173` | recipient session | ✅ as comment + `submitSharedLinkDecision` | `isDecisionType`, signerName for accepted | ✅ D1 5/min + read 60/min | `project-publication-decision.test.tsx` | ✅ CSRF. Unique-per-recipient (409 dup).
| `GET` activity | `activity/route.ts:79` | optional recipient session | ✅ token lookup + active + password cookie | cursor, limit 1–100 | ✅ D1 60/min | `project-publication-activity.test.tsx` | ✅ `assertSameOrigin` (allows missing). Filters internal.
| `POST` events | `events/route.ts:65` | ❌ public | ✅ `resolveProjectPublicationAccessByToken` | event allow-list, metadata ≤512 bytes, ≤6 keys | ✅ D1 60/min | — | ✅ CSRF. Analytics only.
| `GET/POST` unsubscribe | `unsubscribe/route.ts:67,82` | recipient token | ✅ `unsubscribeSharedLinkRecipientByToken` | `readRecipientToken` | ✅ D1 5/min 20/hr (token+IP+recipient-hash) | `share-unsubscribe-interstitial.test.ts` | ✅ GET read-only (SEC-14); POST CSRF form.

### Non-API route handlers
| `GET` `/auth/callback` | `src/app/auth/callback/route.ts:10` | N/A (legacy disabled) | `resolveAuthOrigin`, `sanitizeNextPath` | code/next parse | ❌ | — | Always redirects to login with error; records audit.
| `GET/POST` `/invite/[token]/accept` | `accept/route.ts:77,73` | `getCurrentUserContext` (nullable) | ✅ `acceptInvitationTokenForUser` (token-hash bound); ⚠️ **`isAllowedInviteOrigin` (SEC-01) on POST** | display text caps | ✅ D1 `checkInviteAcceptRateLimit` | `invite-accept-origin.test.ts`, `project-invite-entry-route.test.ts` | Membership via RPC.
| `GET/POST` `/invite/[token]/continue` | `continue/route.ts:35,31` | ❌ NONE (public bridge) | `createPendingInviteBridge` (signed cookie) | none | ✅ D1 `checkInviteContinueRateLimit` | `pending-invite-cookie.test.ts` | Sets `PENDING_INVITE_COOKIE`, redirect.
| `POST` `/invite/[token]/sign-out` | `sign-out/route.ts:18` | Better Auth sign-out | N/A | none | ❌ | — | ✅ `isAllowedInviteOrigin` (SEC-01 caveat). Clears cookies.
| `GET` `/workshop/pending-invite` | `pending-invite/route.ts:70` | ❌ NONE (cookie-driven) | ✅ `readPendingInviteBridge` + `acceptPendingInviteBridge` (HMAC cookie) | none | ❌ | — | Renders interstitial; clears cookie.

---

## C. Public share / publication surface — credential material taxonomy

The single most important table for this surface. Distinguishes raw/hash/encrypted/
cookie materials.

| Material | Form | Stored | Read/verified by | Secret |
|---|---|---|---|---|
| Publication token (raw, 32B base64url, 43 chars) | **Never stored** | URL `/share/<token>` only | `isPublicationTokenShape` `security.ts:73` → HMAC lookup | — |
| `token_hash` | HMAC-SHA256 `hmac-sha256-v1:` | `project_publications.token_hash` UNIQUE | `hashPublicationToken` `:78` → `getPublicationAccessByTokenHash` | `PUBLICATION_TOKEN_HASH_SECRET` |
| `encrypted_token` | AES-256-GCM `aes-256-gcm-v1:` | `project_publications.encrypted_token` | owner-only `decryptPublicationToken` `:91` (not on public path) | `PUBLICATION_TOKEN_ENCRYPTION_SECRET` |
| Password (raw) | **Never stored** | — | `verifyPublicationPassword` `:157` scrypt + `timingSafeEqual` | — |
| `password_hash` | scrypt `scrypt-sha256-v1:<salt>:<hash>` | `project_publications.password_hash` | `verifyProjectPublicationPasswordByToken` | per-row 16B salt |
| Recipient token (raw, 32B base64url) | **Never stored** | URL `?recipient=` only | `verifySharedLinkRecipientToken` HMAC → `recipient_token_hash` | same hash secret |
| `recipient_token_hash` | HMAC-SHA256 | `shared_link_recipients.recipient_token_hash` UNIQUE | `getRecipientByTokenHash` | same |
| Access cookie `ae_publication_access_<sha256(token)[:20]>` | HMAC-signed JSON `publication-access-v1:` | set on unlock `password/route.ts:114` | `verifyPublicationAccessCookieValue`/`hasPublicationAccessCookie` `:317,334` | `PUBLICATION_ACCESS_COOKIE_SECRET` |
| Session cookie `shared_link_session_<suffix>` | HMAC-signed JSON `shared-link-session-v1:` (binds publicationId+credentialVersion+tokenDigest+recipientId) | `session/route.ts:110` | `verifySharedLinkSessionCookieValue` `:482` | same |
| Session `_ok` marker | non-secret, non-HttpOnly | `:111` | client `useSharedLinkSession` regex | none |
| CSRF token | random base64url, header `x-archestimator-csrf` ↔ cookie `ae_publication_csrf` | cookie Max-Age 600–3600 | `assertSameOriginPublicPost` `:373` | none |
| View token (stale-snapshot guard) `publication-view-v1:` | HMAC-signed JSON | server `createPublicationViewToken` `:259` | `readPublicationViewSnapshotVersion` `:268` | same access-cookie secret |
| `credentialVersion` | derived `"open"` or `sha256(password_hash)[:22]` | derived | binds access+session cookies; rotation invalidates them | — |
| IP/UA telemetry | keyed-HMAC (NOT bare sha256) | `project_publication_events.ip_hash`/`user_agent_hash` | `hashRequestValue` | `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` |

**No public marker ID in the URL** — the URL token IS the credential. Internal UUIDs
remapped to opaque public IDs (`est_…`, `row_…`) via `createPublicationSnapshotIdMaps`
`snapshot.ts:145`; GPS stripped; `location_visibility` enforced.

---

## D. Server Action decision table (grouped by domain)

Full per-action detail is voluminous (30 `"use server"` modules, ~162 exports); this table groups by domain and
records the **authz gate pattern** and any flag. Individual action file:line references
are in the exploration evidence and consolidated in `11_IMPLEMENTATION_PLAN.md` task
list where remediation is needed.

| Domain | Module(s) | AuthN | AuthZ gate | Validation | Rate-limit | Idempotency | Test coverage | Flag |
|---|---|---|---|---|---|---|---|---|
| Estimates (read) | `src/lib/estimates/actions.ts` | `requireAuth` | `getCurrentWorkspaceProjectForEstimate` → `canAccessEstimateInD1` | typed args | ❌ | N/A | extensive | — |
| Estimates (edit) | same | `requireAuth`/`requireCurrentUserContext` | ✅ `assertCanEditEstimate` (RPC `can_edit_estimate` + rate limit) | typed + bulk normalize | ⚠️ **in-memory** `assertEstimateActionRateLimit` (SEC-03) | bulk: `expectedPreviewHash`; row: `expectedRowRevision`+`mutationId` | `estimate-sheet-actions-authz.test.ts`, `estimate-insert-target-authz.test.tsx` | SEC-03 |
| Estimates (express promotion) | `express-promotion-actions.ts` | `requireCurrentUserContext`/`requireAuth` | ✅ `assertCanManageLibrary` | typed | ❌ | ❌ | — | — |
| Projects | `src/lib/projects/actions.ts`, `location-actions.ts` | `requireAuth`/`requireCurrentUserContext` | ✅ `canEditProjectInD1` (image/location explicit) / `getCurrentWorkspaceProject` (member) | manual formData | ❌ | bulk: `expectedPreviewHash`+`correlationId` | `project-location-actions.test.ts`, `project-bulk-delete-d1-actions.test.ts` | — |
| Project groups | `src/lib/workshop/group-actions.ts` | `requireAuth` only | ✅ **per-query `WHERE workspace_id=? AND user_id=?`** (personal groupings; no RLS needed) | typed; ⚠️ some `string[]` without UUID assert at boundary | ❌ | ❌ | — | minor: assert UUIDs at boundary (LOW) |
| Workshop favorites | `src/lib/workshop/actions.ts` | `requireCurrentUserContext` | RLS row policy (favorites) | typed | ❌ | ❌ | `workspace-repository-authz-behavior.test.ts` | — |
| Component library | `src/lib/component-library/actions.ts` | `requireCurrentUserContext` + `ensureDefaultWorkspace` | ✅ `assertCanManageLibrary`/`assertCanManageLibraryFolders` (`isWorkspaceEditorInD1`) | typed | ❌ | ❌ | `library-viewer-authz.test.tsx`, `template-editor-actions-authz.test.ts` | — |
| Template editor | `template-editor-actions.ts` | `requireCurrentUserContext` | ✅ `requireWorkspaceTemplate` (SQL ws-scope) + `isWorkspaceEditorInD1` | typed | ❌ | ❌ | `template-editor-actions-authz.test.ts` | — |
| Collaboration (invites) | `src/lib/collaboration/actions.ts` | `requireCurrentUserContext` | ✅ `assertProjectAccessManager`/`assertEstimateAccessManager` (manager rank) + `assertAssignableRole` + last-manager | `normalizeEmail`, `assertUuid` | ✅ Durable `checkInviteCreateRateLimit`/`checkInviteResendRateLimit` | ❌ | `workspace-collaboration-summary-authz.test.ts` | — |
| Collaboration (pending invite) | `pending-invite-actions.ts` | `requireAuth` | `acceptInvitationByIdForUser` (verifies addressee) | `isUuid` | ❌ | idempotent logout | `project-invite-entry-schema.test.ts` | — |
| Realtime identity | `realtime-identity-actions.ts` | `getCurrentUserContext` (nullable) | ✅ `canAccessProjectInD1`/`canAccessEstimateInD1` on topic objectId | `TOPIC_PATTERN` regex | ❌ | ❌ | `realtime-identity-actions-authz.test.ts` | Binds `sub` to userId server-side (good) |
| Publication (owner) | `src/lib/publication/actions.ts` | `requireAuth`/`requireCurrentUserContext` | ✅ `assertProjectPublicationManager` (manager RBAC) | typed | ✅ Durable resend/digest | ❌ | `project-publication-actions.test.ts`, `security-findings-publication-contracts.test.ts` | — |
| Recipient proposals | `src/lib/recipient-proposals/actions.ts` | ❌ **NONE at action** | ⚠️ `getCurrentUserContext` **at repository** (`recipient-proposals-repository.ts:89`) | N/A | ❌ | N/A | `recipient-proposals-action.test.ts`, `recipient-proposals-route-gate.test.ts` | **SEC-05** (defense-in-depth weakness) |
| Beta feedback | `beta-feedback-actions.ts` | `requireAuth` | self-scope | manual formData | ❌ | ❌ | — | — |
| Beta feedback review | `beta-feedback-review-actions.ts` | `requireCurrentUserContext` | ✅ `canReviewBetaFeedback(context.role)` (platform-admin) | manual | ❌ | ❌ | `beta-admin-action-boundaries.test.ts` | — |
| Legal (terms) | `src/lib/legal/actions.ts` | `requireCurrentUserContext` | self-scope | version match + responsibility flag | ❌ | re-accept overwrites | `legal-terms-gate.test.ts` | open-redirect mitigated by `sanitizeNextPath` |
| Auth (sign-in/out) | `src/lib/auth/actions.ts` | pre-auth / `requireAuth` (signOut) | self | email normalize, `sanitizeNextPath` | ❌ | idempotent signOut | `auth-magic-link.test.ts` | — |
| Account | `account-actions.ts` | `requireCurrentUserContext` | self / ws membership | manual | ❌ | ❌ | — | — |
| Beta allowlist admin | `beta-allowlist-admin-actions.ts` | `requireCurrentUserContext` | ✅ `canManageClosedBetaAllowlist(context.role)` (platform-admin) | manual | ❌ | ❌ | `beta-admin-action-boundaries.test.ts`, `closed-beta-allowlist-admin.test.ts` | — |
| Notifications | `src/lib/notifications/actions.ts` | `requireCurrentUserContext` | RLS (delivery scoped to user) | deliveryId (⚠️ no UUID assert at boundary) | ❌ | ❌ | — | minor (LOW) |
| Publisher reads | `src/lib/publisher/*.ts` | `requireAuth`/`requireCurrentUserContext` | ws-scoped reads | typed | ❌ | N/A | `publisher-rbac.test.ts` | — |
| Sidebar favorites | `sidebar-favorites-actions.ts` | `requireAuth` | self-scoped | typed | ❌ | N/A | — | — |
| Estimate-sheet prefs | `user-preferences-actions.ts` | `requireCurrentUserContext` | self (per-user) | typed | ❌ | ❌ | — | — |
| Reusable sources | `src/lib/reusable-sources/actions.ts` | `requireCurrentUserContext` | reads ws-scoped; `insertProjectSourceIntoEstimate` via estimate edit | typed | ❌ | ❌ | — | verify `assertCanEditEstimate` inside insert (LOW) |

### Progressive-enhancement / form wiring
Wired to `<form action={...}>` (works without JS): `updateWorkspaceSettings`,
`updateProfileSettings`, `updateBetaFeedbackReviewStatus`, `createClosedBetaAllowlistEntry`,
`updateClosedBetaAllowlistEntry`, `signInWithEmail`, `signInWithGoogle`, `signOut`,
`acceptCurrentTermsAction`, `acceptPendingInvitationById`, `signOutForPendingInvite`.
`useActionState` hybrid: `submitBetaFeedbackInline`, `openRecipientProposalAction`.
Everything else is **client-event-handler only** (TanStack Query mutations) — still
resolves to POST endpoints at runtime but not progressively enhanced.

---

## E. Cross-cutting control inventory

### Rate limiting (consolidated)
- **Durable D1 `security_rate_limit_events`** — the canonical limiter. Used by:
  publication (11 scopes), AI (`ai_ask`), privacy intake (atomic reserve+rollback),
  invite (create/resend/resolve/accept/continue), proposal export, digest.
- **In-memory (per-isolate, NOT a security boundary):** upload admission
  (`reserveUploadAdmission`), estimate action (`assertEstimateActionRateLimit` —
  **SEC-03**), client-error.
- **Edge/WAF:** ❌ **NONE** (`wrangler.jsonc` has no `waf`/`rate_limit` binding) — **SEC-02**.

### Body-size
- Privacy intake: 16 KiB stream cap (`readRequestBodyBytesWithSizeLimit`, cancels
  mid-stream) + Content-Length pre-check.
- Uploads: 12 MiB images, 20 MiB attachments, ≤64 MiB signed single-part direct-upload,
  byte-exact match on PUT.
- Public share POSTs: raw `request.json()` reads have **no pre-parse cap** (post-parse
  length clamps apply) — LOW risk given Worker limits, noted in SEC-06.
- Collab room: `MAX_MESSAGE_BYTES=4096`.
- ❌ No global Next.js body cap; each handler reads its own.

### CSP / headers (`next.config.ts` `headers()`)
- CSP: **enforced** only on `/share/:path*`; **Report-Only** elsewhere. Retains
  `'unsafe-inline'`+`'unsafe-eval'` (nonce deferred) — **SEC-07**. `frame-ancestors
  'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` everywhere.
- `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (critical for `/invite` raw
  token + `/share` `?recipient=` token), `Strict-Transport-Security: max-age=63072000;
  includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag:
  noindex,nofollow` (share/workshop/invite).

### Secrets / env
- `NEXT_PUBLIC_*` (none are secrets): `APP_URL`, `SITE_URL`, feature flags, Google Maps,
  GA, Clarify, Cloudflare Web Analytics.
- Server-only: `DEEPSEEK_API_KEY` (`src/lib/ai/deepseek.ts:38`), `BETTER_AUTH_SECRET`
  (≥32 chars), publication secrets (`PUBLICATION_TOKEN_*`), collab room secret,
  invite pepper (`ARCHESTIMATOR_INVITE_TOKEN_PEPPER` 64-hex), job secrets (`CRON_SECRET`,
  `UPLOAD_*_JOB_SECRET`).
- Bindings (`wrangler.jsonc`): `ARCH_DB`, `ARCH_UPLOADS_R2`, `COLLAB_ROOMS`,
  `UPLOAD_JOBS_QUEUE`, `EMAIL`, `IMAGES`.
- **SEC-09:** `signedReadUrlFactory` option exists but unused; must not bypass authz if wired.
- **SEC-10 (consistency, refiled from retracted SEC-08):** `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`
  **is consumed** in four sites — `src/lib/publication/email-links.ts:37`,
  `src/lib/auth/redirects.ts:26`, `src/lib/auth/cloudflare-better-auth-runtime.ts:101`
  (Better Auth `trustedOrigins`), and the type at `:22`. It is **not** dead config. The
  legitimate consistency note: per-request share/invite origin checks derive the allowed
  origin from `request.url` rather than this env list; both patterns are valid but
  unreconciled. (The earlier "dead config / remove from `.env.example`" finding was false
  and is retracted — see Doc 20 ADV-01.)

### R2 object-key authz
- **No presigned URLs** — all R2 reads server-mediated and app-authorized.
- Key design `{workspaceId}/{userId}/...` enforces tenant+actor partition
  (`src/lib/uploads/object-keys.ts`).
- DELETE re-validates ownership prefix (`isOwnedAttachmentPath`/`isOwnedUploadPath`).
- **SEC-09:** `signedReadUrlFactory` option exists but unused; must not bypass authz if wired.

---

## F. D1 app-authz + tenant isolation summary (full detail in Doc 08)

- `workspaceId` always from `profile.default_workspace_id` (session-derived) via
  `ensureDefaultWorkspace()` — **never** from path/body for tenant scoping (except the
  unauthenticated privacy intake, where it is stored as optional metadata only).
- Every `canAccess*`/`canEdit*` embeds `workspace_members.workspace_id = ... AND user_id = ?`.
- Platform admin (`ceo`/`admin`) bypasses all probes at JS layer (`isPlatformAdmin`).
- **Two access predicates are the crux:** `canAccessProjectInD1` (includes sheet members)
  vs `canAccessWholeProjectInD1` (excludes them). Misusing the former where the latter
  is needed is the documented vulnerability class (commit `9d5880e20`).
- **Fail-closed** throughout: probe errors → deny; missing env → disabled.

## G. Blast-radius snapshot (full detail in Doc 10)

- **Highest blast radius:** the public share surface (8 routes, no auth, durable rate
  limits + CSRF + crypto are the only barriers); the D1 app-authz layer (one file,
  `src/lib/authz/d1-access.ts`, gates every authenticated read/write); Better Auth
  config (one factory, gates every session).
- **Cross-cutting:** rate-limit table `security_rate_limit_events` (shared by 5 domains);
  `next.config.ts` headers block (one file, all CSP/HSTS); the proxy (`request-proxy.ts`).
- **Unaffected (intentionally):** marketing pages, health endpoint, Supabase archaeology.

---

## H. Attack Surface Inventory (Improve-Plan-Prompt mandated schema)

Columns: `Entry point | Actor | Authn/authz & ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`. Rows are grouped by access tier. This consolidates Section B/E into the mandated shape.

### Public (no session)

| Entry point | Actor | Authn/authz & ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `GET /api/health` | anon | none (intentional) | none | `{service,timestamp}` | no-store | none | — |
| `POST /api/compliance/privacy-requests` | anon | none (anonymous intake) | 16 KiB stream cap `readRequestBodyBytesWithSizeLimit`; `PRIVACY_REQUEST_KINDS` allowlist; `sanitizeMetadataForIntake` strips token/secret/password/cookie/authorization | opaque `{received}` / error | no-store | D1 atomic reserve+rollback: email 3/hr, IP 5/hr | `compliance-privacy-request-route.test.ts` |
| `* /api/share/[token]` (8 routes) | publication recipient / anon | token-shape → HMAC-hash lookup; `resolveProjectPublicationAccessByToken` (active/expiry/revoked); optional scrypt password + `ae_publication_access_*` HMAC cookie; recipient `verifySharedLinkRecipientToken` (publicationId-bound) + `shared_link_session_*` HMAC cookie; `assertSameOriginPublicPost` + double-submit CSRF (`ae_publication_csrf` ↔ `x-archestimator-csrf`) on all mutations; snapshot-view-token stale guard | token-shape regex; `sanitizeSharedLinkRecipientText` 1000 chars; review-target UUID/`est_|row_` regex; event/metadata allowlists ≤512B; cursor+limit clamps | public-sanitized snapshot (UUIDs→opaque IDs, GPS stripped, `location_visibility`); never echoes RPC/DB errors | **enforced** CSP + `frame-ancestors none` + `no-store` + `Referrer-Policy no-referrer` + HSTS + `X-Frame-Options DENY` | D1 durable: snapshot 60/min, password 5/hr lockout+delays, session 10/min+50/hr, comment 5/min+20/hr, decision 5/min, event 60/min, activity 60/min, unsubscribe 5/min+20/hr; + in-memory circuit breaker (comment) | `project-publication-password-lockout-route`, `csrf-origin-denial`, `comments/decision.test.tsx`, `security-hardening`, `unsubscribe-interstitial` |
| `POST /api/internal/client-error` | anon (browser) | none; **`sameOrigin` + `passesFetchMetadata`** CSRF/origin | `normalizePayload`+`redactForLog`+16 KiB | opaque ack | no-store | in-memory 10/min/IP | — |
| `GET/POST /invite/[token]/continue` | anon (invite bridge) | `createPendingInviteBridge` (HMAC-signed cookie) | token decode | redirect / cookie | no-store | D1 `checkInviteContinueRateLimit` | `pending-invite-cookie.test.ts` |
| `GET /workshop/pending-invite` | cookie holder | `readPendingInviteBridge`+`acceptPendingInviteBridge` (HMAC cookie) | none | HTML interstitial | no-store | none | — |
| `GET /auth/callback` | anon | legacy disabled; `resolveAuthOrigin`+`sanitizeNextPath` | code/next parse | redirect to login | no-store | none | — |

### Authenticated (Better-Auth session)

| Entry point | Actor | Authn/authz & ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `* /api/auth/[...all]` | session / pre-auth | Better Auth `handlers` + `trustedOrigins`; OAuth state-cookie edge validation | Better Auth internal | Better Auth DTOs | `no-store` (forced) | Better Auth internal | `cloudflare-better-auth-route*` |
| `POST /api/ai/ask` | ws user | `getAiRequestUserContext` (rejects dev-bypass; provider-backed) | `typeof string` + 8000 cap | `{reply,…}` / 401/403/503 | no-store | D1 `checkAiAskQuota` 10/min 60/hr (ws+user+IP) | `ai-auth-guard.test.ts` |
| `POST /api/ai/package-builder` | ws user | `getAiRequestUserContext` + `verifyPackageDraftToken` (HMAC user-bound) + apply confirmation | manual schema validators | draft/apply DTO | no-store | **none on this route** (gap note) | `ai-package-builder-security-contract` |
| `GET /api/projects/[projectId]/activity` | editor | `requireCurrentUserContext` + `getCurrentWorkspaceProject` + `canEditProjectInD1` | `isUuid`, limit 1–50 | activity items | no-store | none | — |
| `GET .../export/proposal.xlsx` | ws member | `getCurrentUserContext` + `resolveExportAudience`→`isWorkspaceMemberInD1` | `parseExportSettings` finite | xlsx binary (node/row capped) | no-store; `maxDuration=60` | D1 `checkProposalExportRateLimit` 12/min 120/hr | `proposal-export-route.test.ts` |
| `* /api/projects/images`, `estimate-row-images`, `component-library/{images,attachments}` | ws editor / project editor | `requireCurrentUserContext` + `canEditProjectInD1`/`canEditEstimateInD1`/`isWorkspaceEditorInD1` + ownership-prefix on DELETE + scan-gate on attachment GET | magic-byte + size cap (12/20 MiB) + sharp re-encode | image/attachment bytes or opaque 404 | no-store | **in-memory** `reserveUploadAdmission` (per-isolate; SEC-02/03 caveat) | `auth-sensitive-api-boundaries.test.ts` |
| `* /api/component-library/attachments/{direct-upload,scan-override}` | ws editor / **platform-admin** (scan-override) | as above; `canApproveUploadScanOverride` for scan-override | sha256/MIME/size/session | session/create/finalize DTO | no-store | in-memory + D1 capacity (3/actor, 6/ws) | `upload-signed-route.test.ts` |
| `GET/POST/DELETE /invite/[token]/{accept,sign-out}` | session (nullable) | `getCurrentUserContext`; `acceptInvitationTokenForUser` (token-hash bound); **`isAllowedInviteOrigin` (SEC-01 — fails open on stripped headers)** | display text caps | redirect / cookie | no-store | D1 `checkInviteAcceptRateLimit` | `invite-accept-origin`, `project-invite-entry-route` |
| Server Actions (15 modules, ~162 exports — see Section D + Appendix I) | session / ws member / editor / admin / manager | per-domain: `requireAuth`/`requireCurrentUserContext` + `canAccess*`/`canEdit*`/`assertCanManageLibrary`/`assertProjectPublicationManager`/`assertProjectAccessManager`/`canManageClosedBetaAllowlist`/`canReviewBetaFeedback` | hand-rolled (`readRequiredText`,`isUuid`,regex,length); **no zod** (SEC-06) | typed DTOs; opaque 404 on deny | `revalidatePath` + TanStack invalidate (no `revalidateTag`) | estimate: **in-memory** (SEC-03); invite/publication: D1 durable; most: none | extensive per-domain (Doc 12) |

### Service / job (Bearer secret)

| Entry point | Actor | Authn/authz & ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `* /api/internal/{upload-cleanup,upload-scan,upload-runtime,upload-lifecycle-proof,collaboration-invitation-proof,estimate-history-proof}` | job secret | `isAuthorized` Bearer = `CRON_SECRET` or job-specific secret | `readLimit`/`isDryRun`/router-internal | proof/job result | no-store | none (secret-gated) | proof-script tests |

### Ownership tier note
- Platform admin (`ceo`/`admin`) bypasses all D1 membership probes at the JS layer
  (`isPlatformAdmin` short-circuit). Scan-override is the only route *restricted* to admin.
- Workspace roles (`owner/admin/member/viewer`) and project/estimate collaboration roles
  (`owner/admin/editor/viewer`) are enforced inside the `canEdit*` SQL predicates.

---

## I. Per-action coverage scope (honest correction of REQ-MATRIX-01)

The earlier draft claimed "every Server Action (~90 across 12 domains) inventoried with
file:line." **Improvement-audit correction (ADV-07):** there are **30 `"use server"`
modules across 15 lib subdirectories exporting ~162 functions** (many are non-action
helpers/type re-exports). Section D groups by **domain** (~22 rows) with authz-gate
*patterns*, not per-export file:line verdicts. Therefore:

- **Routes (33):** fully inventoried per-route with file:line in Section B/H — **proven**.
- **Server Actions:** inventoried at the **domain + authz-pattern** level in Section D,
  with per-action file:line detail only where a finding or task requires it (estimates,
  publication, recipient-proposals). A full per-export appendix is **out of scope** for
  this refresh (it would be a separate deliverable) but the **authz pattern coverage is
  complete**: every domain's gate (`assertCanEditEstimate`, `assertCanManageLibrary`,
  `assertProjectPublicationManager`, `assertProjectAccessManager`, `canManageClosedBetaAllowlist`,
  workspace+user SQL scoping for groups) is identified and tested. REQ-MATRIX-01 is
  corrected to "⚠️ partial" accordingly (Doc 04/16).

**Note on `action-rate-limit.ts` line refs (ADV-12):** the in-memory `Map` is at
**line 20**; `checkEstimateActionRateLimit` is at line 38. Both are correct citations for
SEC-03 (the mechanism is the Map; the function is the call site).
