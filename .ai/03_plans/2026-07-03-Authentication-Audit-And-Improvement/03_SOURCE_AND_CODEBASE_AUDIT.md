# 03 — Source and Codebase Audit

**Audit window:** 2026-07-03, PHT. Read-only. No files were modified during this audit.

**Verification mode:** `independent-assisted` after the 2026-07-03 refresh. This audit seed was originally lead-written; the current pack now also includes separate read-only repo, UX, security, and standards lanes summarized in `00_AGENT_COORDINATION.md` and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

**Scope confirmed via direct inspection:** `src/lib/auth/`, `src/lib/collaboration/`, `src/lib/publication/`, `src/lib/share/`, `src/app/login/`, `src/app/signup/`, `src/app/api/auth/`, `src/app/auth/callback/`, `src/app/invite/[token]/`, `src/app/share/[token]/`, `src/app/api/share/[token]/`, `src/components/auth/`, `src/middleware.ts`, `src/app/layout.tsx`, plus `package.json`, `.env.example`, and migration inventories under `./migrations/` and `./supabase/migrations/`.

**2026-07-03 refresh note:** The detailed inventory below remains useful as source-audit seed material. Later docs in this pack are authoritative for readiness, risk, threat model, provider cleanup, and credential taxonomy. Stale findings corrected in this refresh are called out inline instead of silently removed.

---

## 1. Active stack (confirmed from source)

| Layer | Version / value | Source |
|---|---|---|
| Next.js | 16.2.6 (App Router, RSC) | `package.json` |
| React | 19.2.6 | `package.json` |
| Runtime | Bun (package manager + test runner) | `package.json` |
| TypeScript | strict, ES2017 target | `package.json` |
| Styling | Tailwind CSS v4 (CSS-first config) | `package.json` |
| Auth provider | Better Auth 1.6.22 on Cloudflare Workers + D1 | `package.json`, `src/lib/auth/better-auth-cloudflare.ts` |
| Active auth selector env | `ARCHESTIMATOR_AUTH_PROVIDER=better-auth` | `.env.local`, `.env.example` |
| Database | Cloudflare D1 (active); Supabase/Postgres retained as rollback/comparison surface | `./migrations/`, `./supabase/migrations/` |
| Realtime | Durable Objects / WebSockets (planned); Supabase Realtime retained | cloudflare-migration pack |
| Email | Cloudflare Email binding present in `wrangler.jsonc`; Resend references require active-vs-legacy classification | `wrangler.jsonc`, provider cleanup worksheet |
| State (client) | TanStack Query 5, Zustand 5 | `package.json` |
| Test surfaces | Vitest (jsdom) ~115 files, Bun test 2 files, Playwright 7 specs | `package.json` scripts |

The README and project docs still describe Supabase Auth as active. **The README is stale.** Auth has been migrated to Better Auth; only the legacy `/auth/callback` route file remains and is fully disabled (`src/app/auth/callback/route.ts` always emits `callback_exchange_failed` + audit event `auth_callback_legacy_disabled`).

---

## 2. Authentication surfaces — file inventory

### 2.1 Core authentication files (`src/lib/auth/`)

| File | Lines | Responsibility | Security-relevant behavior |
|---|---|---|---|
| `actions.ts` | 236 | Server actions: `signInWithEmail`, `signInWithGoogle`, `signOut` | Builds origin from request headers; calls Better Auth `/api/auth/sign-in/social` and `/sign-in/magic-link`; clears OAuth state cookies via `clearBetterAuthOAuthStateCookies`; forwards Set-Cookie from Better Auth via `forwardSetCookieHeaders`; records audit events |
| `session.ts` | 108 | `getCurrentUserContext()` (cached), `requireAuth`, `requireCurrentUserContext` | Wrapped in React `cache()`. Order: dev-auth bypass → Better Auth identity → closed-beta gate → D1 profile lookup. Redirects to `/access-required` on beta denial |
| `request-proxy.ts` | 227 | Next.js middleware (`proxy`) | Protected-route gate; `redirectStateMismatchToCleanLogin` on `?error=state_mismatch`; localhost bypass when session cookie present; trusted-origin checks |
| `redirects.ts` | 172 | Origin resolution, path sanitization, `LOGIN_PATH`, `DEFAULT_AUTH_DESTINATION`, `buildLoginRedirectUrl`, `sanitizeNextPath` | Localhost origin trust only in non-production; rejects callback-path next values, nested unsafe next, control chars |
| `set-cookie-forwarding.ts` | 211 | Parse + forward Set-Cookie; `clearBetterAuthOAuthStateCookies`; `normalizeBetterAuthOAuthStateCookieHeader` | Clears 4 state-cookie name variants (with/without `__Secure-` prefix × `state`/`oauth_state`); sec-flag = `!origin || origin.startsWith("https://")` |
| `better-auth-cloudflare.ts` | 290 | Better Auth config builder; Google + magic-link provider resolver; `BETTER_AUTH_ROUTE_GATE_PARITY_MATRIX` | Google provider currently returns `{ clientId, clientSecret }` only — **no `prompt` set** (root cause of bug A in §5 below) |
| `cloudflare-better-auth-runtime.ts` | 172 | Resolves Better Auth options from Cloudflare context (`@opennextjs/cloudflare`); loads `ARCH_DB` D1 binding; resolves baseURL/trustedOrigins | baseURL fallback chain: `BETTER_AUTH_URL` → `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_SITE_URL` → requestUrl → headers → `http://localhost:3000` |
| `auth-provider-selection.ts` | 15 | `isCloudflareBetterAuthProviderEnabled` | Reads `ARCHESTIMATOR_AUTH_PROVIDER` env; accepts `better-auth`, `cloudflare-better-auth`, `d1-better-auth` |
| `account-setup.ts` | (read by lane 2) | Post-auth destination resolution, redirect after sign-in | — |
| `account-audit.ts` | (read by lane 2) | `recordAccountSecurityEvent` | Writes to `account_security_events` D1 table |
| `account-data.ts` | 400 | Form parsers for onboarding/profile/workspace settings; `AccountSecurityEventType` enum; `sanitizeAccountSecurityMetadata` | Regex-drops secret-looking keys (`token`, `code`, `magic`, `cookie`, `session`, etc.) from audit metadata |
| `account-actions.ts` | 358 | Server actions: `completeOnboarding`, `updateProfileSettings`, `updateWorkspaceSettings`, `getAccountSetupState` | `requireCurrentUserContext` at top; `canManageWorkspaceAccountSettings(role)` enforces owner/admin for workspace mutations; raw SQL via D1 |
| `account-membership.ts` | 113 | `readFirstAccountWorkspaceMembership(userId)` | **Cascades workspace ← project ← estimate**: tries `workspace_members` first, then `project_members.workspace_id`, then `estimate_sheet_members → projects.workspace_id`. Critical for users without direct workspace membership |
| `account-audit-d1-store.ts` | (D1 store) | D1 query helpers for `account_security_events` | — |
| `account-settings-d1-store.ts` | (D1 store) | D1 query helpers for onboarding/workspace settings | — |
| `profile-d1-store.ts` | (D1 store) | `getProfileByEmailFromCloudflareD1`; `AppRole`, `CurrentUserProfile` types | Defines `AppRole` (includes `ceo`) |
| `closed-beta-access.ts` | 86 | `getClosedBetaAccessForEmail`, `buildClosedBetaAccessPath` | `CLOSED_BETA_ACCESS_ENABLED` env gate; returns `{allowed, status, normalizedEmail}` |
| `closed-beta-d1-store.ts` | (D1 store) | `getClosedBetaAccessFromCloudflareD1` | Reads `closed_beta_allowed_emails`-equivalent D1 table |
| `beta-allowlist-admin.ts` | 82 | `canManageClosedBetaAllowlist(role)` — accepts `ceo` OR `admin`; `parseClosedBetaAllowlistCreate/Update`; `readClosedBetaAllowlistQueue` | Role enum used here is distinct from `WorkspaceAccountRole` |
| `beta-allowlist-admin-actions.ts` | 61 | Server actions: `createClosedBetaAllowlistEntry`, `updateClosedBetaAllowlistEntry` | `requireCurrentUserContext` + `canManageClosedBetaAllowlist` at top |
| `dev-auth-gate.ts` | 51 | Dev-bypass credential check | Three env vars: `ARCHESTIMATOR_DEV_AUTH_BYPASS`, `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB`, `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET` (must be ≥32 chars). Restricted to local-dev hostnames. Disabled in production via `NODE_ENV` check |
| `dev-auth.ts` | 52 | `getDevCurrentUserContext` | Reads email from `ARCHESTIMATOR_DEV_AUTH_EMAIL`; loads profile from D1; throws if not found |
| `error-mapping.ts` | 68 | `getPublicAuthError`, `mapAuthErrorToCode`, `mapAuthCodeToAppError` | 7 canonical codes: `email_required`, `auth_request_failed`, `google_request_failed`, `callback_missing_code`, `callback_exchange_failed`, `invalid_redirect`, `state_mismatch` |
| `protected-route-gate.ts` | 39 | `markProtectedRouteGateRequestHeaders`, `isProtectedRouteGateSatisfied` | Headers `x-archestimator-auth-verified` and `x-archestimator-terms-accepted` carry middleware-decided state downstream |

### 2.2 Auth route handlers

| File | Lines | Responsibility | Notes |
|---|---|---|---|
| `src/middleware.ts` | 7 | Re-exports `proxy` from `request-proxy.ts` | Minimal entrypoint |
| `src/app/api/auth/[...all]/route.ts` | 83 | Better Auth catch-all handler (GET/POST/PATCH/PUT/DELETE) | `normalizeOAuthCallbackRequest` for `/callback/google` paths — trims Cookie header to matching state cookie only |
| `src/app/auth/callback/route.ts` | 58 | **LEGACY Supabase callback — disabled** | Always emits `callback_exchange_failed` + audit `auth_callback_legacy_disabled`; never exchanges a code |
| `src/app/login/page.tsx` | 41 | Login route (Server Component) | Renders `AuthLayout` + `LoginForm` in Suspense |
| `src/app/signup/page.tsx` | 38 | Signup route — **closed-beta-gated** | Renders `ClosedBetaGate` (no live self-serve signup; "L-FUN-2 GATED" future flag) |
| `src/app/invite/[token]/page.tsx` | 271 | Invite entry page (Server Component) | Resolves invite state (invalid/expired/revoked/already-used/wrong-account/signed-in-preview/signed-out-preview/rate-limited); uses Better Auth identity for current-email check |
| `src/app/invite/[token]/accept/route.ts` | 133 | Accept invite (POST) | Origin check first → `getCurrentUserContext` → rate limit → `acceptInvitationTokenForUser` |
| `src/app/invite/[token]/continue/route.ts` | 72 | Bridge to auth (POST/GET) | Sets `PENDING_INVITE_COOKIE` (HMAC'd), redirects to `/login?next=/workshop/pending-invite` |
| `src/app/invite/[token]/sign-out/route.ts` | 45 | Sign out from wrong-account invite state | Clears session cookies, redirects back to invite |
| `src/app/layout.tsx` | 42 | Root layout | Mounts `AuthStateMismatchRecoveryScript` globally |

### 2.3 Auth components (`src/components/auth/`)

| File | Lines | Purpose |
|---|---|---|
| `LoginForm.tsx` | 127 | Client component; two `<form action>`s (Google + magic-link) with honeypot |
| `GoogleButton.tsx` | 53 | Submit button with Google "G" SVG mark |
| `MagicLinkButton.tsx` | 26 | Submit button, `variant="brand"` |
| `AuthLayout.tsx` | 69 | Two-column brand shell; right column has `AuthStatusBanner` (aria-live) + form |
| `AuthStatusBanner.tsx` | 44 | Renders mapped error message from `?error=` search param |
| `AuthSearchParamsState.tsx` | 33 | Client wrappers reading `useSearchParams` for `next`, `error`, `sent` |
| `AuthStateMismatchRecoveryScript.tsx` | 39 | `beforeInteractive` Script; runs when `?error=state_mismatch` OR `?oauth_state_reset=1`; clears caches; bounces to `/login?...&oauth_state_reset=1(+done=1)` |
| `AuthGlassPanel.tsx` | 80 | Decorative left-column brand panel; aria-hidden |
| `ClosedBetaGate.tsx` | 91 | "Start free" gate; posts to `/contact?intent=beta-request` (not a live signup) |

---

## 3. Multi-tenant authorization surfaces

### 3.1 Role taxonomy (multi-layered — handle with care)

| Surface | Roles | Source |
|---|---|---|
| Workspace members | `owner` / `admin` / `member` / `viewer` | `src/lib/auth/account-data.ts:60` (`WorkspaceAccountRole`) |
| Project members | `owner` / `admin` / `editor` / `viewer` | `src/lib/collaboration/invitation-d1-store.ts:393-397, 429-433` (role precedence: owner=4, admin=3, editor=2, else=1) |
| Estimate sheet members | `owner` / `admin` / `editor` / `viewer` (same precedence) | `src/lib/collaboration/invitation-d1-store.ts:425-447` |
| App-wide profile role (`AppRole`) | includes `ceo`, `admin`, others (full enum in `profile-d1-store.ts`) | `src/lib/auth/beta-allowlist-admin.ts:30` |
| Closed-beta allowlist admin | `ceo` OR `admin` only | `src/lib/auth/beta-allowlist-admin.ts:29-31` |

**Audit note**: The `editor` role appears in DB-level role precedence and acceptance SQL but NOT in the `WorkspaceAccountRole` TypeScript type. Confirm whether `editor` is allowed at the workspace level — likely NOT, but the type system does not currently enforce this distinction cleanly.

### 3.2 Authorization helpers

| Helper | Location | Rule |
|---|---|---|
| `canManageWorkspaceAccountSettings(role)` | `account-data.ts:335` | `role === "owner" \|\| role === "admin"` |
| `canManageClosedBetaAllowlist(role)` | `beta-allowlist-admin.ts:29` | `role === "ceo" \|\| role === "admin"` |
| `readFirstAccountWorkspaceMembership(userId)` | `account-membership.ts:44` | Cascades: workspace_members → project_members → estimate_sheet_members |

### 3.3 Workspace membership cascade (critical)

A user without a direct `workspace_members` row can still resolve a workspace via:
1. `workspace_members` (direct) — primary
2. `project_members.workspace_id` (project membership implies workspace)
3. `estimate_sheet_members → projects.workspace_id` (estimate access implies workspace via project)

This cascade is used by `account-actions.ts:getAccountSetupState` to compute `defaultWorkspaceId` for onboarding. Any authz check that only queries `workspace_members` will **under-authorize** users who gained access via project or estimate membership. The cascade must be applied consistently.

### 3.4 Invite token lifecycle

**Token format** (`invite-entry.ts`):
- Raw token: 32 random bytes, base64url-encoded (~43 chars)
- Hash: `v1:sha256(${ARCHESTIMATOR_INVITE_TOKEN_PEPPER}:${rawToken})` — pepper must be 64-char hex
- URL: `/invite/${encodeURIComponent(rawToken)}` — **raw bearer token in URL** (by design)
- Stored: only the hash reaches the DB (`collaboration_invitation_tokens.token_hash`)

**Acceptance flow** (`invitation-d1-store.ts:acceptInvitationInD1`):
1. Materialize expired invitations (sweep)
2. Lookup invitation by token hash or invitation ID
3. Check revoked/expired/used state machine
4. **Email match check** (`normalizeEmail(row.invited_email) !== actorEmail` → reject with audit `collaboration_invite_wrong_account`)
5. Insert `project_members` OR `estimate_sheet_members` row with role escalation prevention (CASE WHEN excluded.role > current role)
6. Mark token used + invitation accepted; insert `collaboration_audit_events`

**Rate limiting** (5 scopes via D1 audit store):
- `collaboration_invite_create` — 20/hour per (userId, projectId)
- `collaboration_invite_resend` — 5/hour per (userId, invitationId)
- `collaboration_invite_resolve` — 30/min per (ipHash, userId, tokenHash) — opens the page
- `collaboration_invite_continue` — 10/min per (ipHash, userId, tokenHash)
- `collaboration_invite_accept` — 5/min per (ipHash, userId, tokenHash)

Rate-limit key uses `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` (falls back to `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`). **2026-07-03 correction**: current `.env.example` documents this optional env var, so the original env-doc gap is closed as stale.

### 3.5 Origin check (CSRF defense)

`isAllowedInviteOrigin(request)` (`invite-origin.ts`):
- Compares request `Origin` (or `Referer` fallback) host to the request's `Host` header
- **DEFAULTS TO ALLOW** when neither Origin nor Referer is present (comment: "preserve local/test behavior")
- Used in `accept/route.ts` as the first gate before any state mutation

This is defense-in-depth, NOT a primary CSRF barrier. The CSRF primary barrier is the SameSite=Lax cookie + the fact that the accept flow requires a signed-in session cookie.

---

## 4. Publication / share-link auth surface

### 4.1 Credential-material taxonomy

| Material | Form | Created by | Stored in | Client-visible? | Used for URL/cookie/session? | Rotation/revocation |
|---|---|---|---|---|---|---|
| Publication token (raw) | 32 random bytes, base64url (43 chars) | `publication/security.ts:createPublicationToken` | NOT stored raw | YES (URL path `/share/[token]`) | URL | Rotate via republish; revoke via `status='revoked'` |
| Publication token hash | `hmac-sha256-v1:<base64>` | `hashPublicationToken` | `project_publications.token_hash` (D1) | NO | DB lookup | Replaced on rotation |
| Publication token (encrypted) | `aes-256-gcm-v1:<iv>:<tag>:<encrypted>` | `encryptPublicationToken` | D1 (recoverable for URL dispatch) | NO | Server-side recovery | Re-encrypted on rotation |
| Publication password (raw) | User-supplied, NFC-normalized, min 4 chars | Modal input | NEVER stored raw | NO (transient) | Verify only | Replaced via password change → `credentialVersion` rotates |
| Publication password hash | `scrypt-sha256-v1:<salt>:<hash>` (16-byte salt) | `hashPublicationPassword` | `project_publications.password_hash` (D1) | NO | Verify only | Cleared/rotated via password change |
| Access cookie (password unlock) | `publication-access-v1:<base64-payload>:<signature>` | `createPublicationAccessCookie` | Cookie: `ae_publication_access_<sha256(token)[:20]>` | YES (cookie) | Cookie (24h, HttpOnly, SameSite=Lax, Secure-in-prod) | Expires; rotated when `credentialVersion` changes |
| Session cookie (recipient) | `shared-link-session-v1:<base64-payload>:<signature>` | `getSharedLinkSessionCookieParts` | Cookie: `shared_link_session_<sha256(token)[:20]>` | YES (cookie) | Cookie (24h, HttpOnly, SameSite=Lax, Secure-in-prod) | Expires; rotated when `credentialVersion` or recipient changes |
| Session `_ok` companion | `"1"` (non-secret marker) | `session/route.ts:111` | Cookie: `shared_link_session_<suffix>_ok` | YES (cookie, HttpOnly=false) | Client hook `useSharedLinkSession` | Expires with session cookie |
| CSRF token | 16 random bytes base64url | `createPublicFormCsrfToken` / `createPublicPostCsrfToken` | Cookie: `ae_publication_csrf` + header `x-archestimator-csrf` | YES (both) | Required for all public POST/DELETE | Per-session |
| View token | `publication-view-v1:<base64-payload>:<signature>` | `createPublicationViewToken` | Transient (passed client→server on comment/decision) | YES (request body) | Snapshot version pinning | Single-use per snapshot |

### 4.2 P10 password lockout (audit finding — serverless-brittle)

`publication/security.ts:560-625`:
- Storage: **in-memory `Map<string, PasswordAttemptRecord>`**
- Threshold: 5 failures per 1-hour window → 15-minute lock
- Progressive delays: 1s, 2s, 4s, 8s, 16s, 30s
- Key: `${ip}:${token}`

**Audit finding P0-PUB-1**: In-memory state is **not durable across Cloudflare Workers isolates**. Each isolate has its own Map; cold starts lose state; an attacker rotating across isolates bypasses the lockout. The companion D1-backed `checkProjectPublicationPasswordRateLimit` (called in `password/route.ts:62`) provides durable rate-limiting and partially mitigates this, but the in-memory lockout gives a false sense of security.

**Recommendation**: Move P10 to a Durable Object (per-token singleton) or extend the D1 rate-limit to enforce the hard lock.

### 4.3 Viewer-session isolation proof

**Question**: Can a viewer session cookie be replayed against `/workshop` routes?

**Answer**: **NO.** The middleware (`request-proxy.ts`) checks for `better-auth.session_token` / `__Secure-better-auth.session_token` for protected routes. The publication session cookie name (`shared_link_session_<suffix>`) does not match. A viewer session cookie alone cannot satisfy the middleware's `hasBetterAuthSessionCookie` check.

**Question**: Can an authenticated workspace session bypass the share-link password?

**Answer**: **NO.** The share API routes (`password/route.ts`, `comment/route.ts`, etc.) check `hasPublicationAccessCookie` independently. A workspace session cookie does not satisfy the publication-access cookie verification (`verifyPublicationAccessCookieValue` checks tokenDigest + publicationId + credentialVersion match).

**Question**: Can a viewer escalate to workspace member?

**Answer**: **NO direct path identified.** The publication routes only mutate `shared_link_comments`, `shared_link_responses`, `shared_link_events` tables. None of them touch `workspace_members` or `project_members`. The publication `actions.ts` server actions (workspace-side) all call `requireCurrentUserContext` first, which requires a Better Auth session, which a viewer does not have.

### 4.4 CSRF protection chain (publication POST/DELETE)

`assertSameOriginPublicPost` (`publication/security.ts:373`):
1. **Origin header MUST be present** AND match request URL origin (stricter than invite flow)
2. **CSRF double-submit**: `x-archestimator-csrf` header must equal `ae_publication_csrf` cookie

`assertSameOriginPublicDelete` and `assertSameOriginPublicFormPost` reuse this stricter check.

**Contrast**: The invite accept flow uses the weaker `isAllowedInviteOrigin` (allows missing Origin). The publication flow uses the stricter `assertSameOriginPublicPost` (requires Origin match). This asymmetry is justified — publication is unauthenticated, invite accept requires a session cookie (SameSite=Lax provides primary CSRF defense).

---

## 5. Bug findings (root cause confirmed)

### Bug A — Missing Google account picker (root cause confirmed)

**File:line**: `src/lib/auth/better-auth-cloudflare.ts:188-199` (`resolveCloudflareBetterAuthSocialProviders`)

**Current code** returns:
```ts
{ google: { clientId, clientSecret } }
```

**Missing**: `prompt: "select_account"` (or `"select_account consent"`).

**Verified via installed source**:
- `node_modules/@better-auth/core/dist/oauth2/oauth-provider.d.mts:178` — `prompt?: ("select_account" | "consent" | "login" | "none" | "select_account consent")`
- `node_modules/@better-auth/core/dist/social-providers/google.mjs:66` — Google's `createAuthorizationURL` passes `prompt: options.prompt`
- `node_modules/@better-auth/core/dist/oauth2/create-authorization-url.mjs` — `prompt && url.searchParams.set("prompt", prompt)`

**Live confirmation** (prior browser evidence, redacted): the OAuth URL captured was `https://accounts.google.com/v3/signin/identifier?...&state=[REDACTED_STATE]&...` with **no `prompt=` parameter** in the query string. Future artifacts must redact OAuth state, codes, cookies, session IDs, invite/share URLs, and raw emails.

**Effect**: Google's default behavior skips the account picker when the user has a single active Google session + prior consent. The user can never switch accounts.

**Confirmed non-conflict**: `requestSignUp: true` in the server action body is only used for new-user gating (`node_modules/better-auth/dist/plugins/oauth-proxy/index.mjs:245`) — it does NOT add `prompt=consent`.

### Bug B — signOut does not touch Google

**File:line**: `src/lib/auth/actions.ts:223-236` (`signOut`)

**Current behavior**:
1. `requireAuth()` — must have a session
2. POST to Better Auth `/api/auth/sign-out` (revokes session server-side in D1)
3. `clearBetterAuthSessionCookies` — clears `better-auth.session_token` and `__Secure-better-auth.session_token` locally
4. `redirect("/login")`

**What it does NOT do**:
- Does not revoke the Google OAuth grant server-side
- Does not redirect to Google's logout endpoint (`https://accounts.google.com/Logout`)
- Does not pass `prompt=consent` or `prompt=login` for the next sign-in

**Effect**: After local sign-out, the user's Google session is still active. The next click on Google sign-in silently re-authenticates the same account.

**Compounded with Bug A**: Even if the user wanted to switch accounts, neither signOut nor the next sign-in forces the picker. The user is locked into whichever Google account they last used.

**Note**: Fixing Bug A (`prompt=select_account`) solves the account-picker UX. It does **not** by itself define local-session invalidation, all-session logout, Google OAuth grant revocation, or reauthentication policy; those remain explicit Phase 1 decisions.

### Bug C — First-click state_mismatch (recovery infra is symptomatic, not preventive)

**Files**:
- `src/components/auth/AuthStateMismatchRecoveryScript.tsx:1-39`
- `src/lib/auth/request-proxy.ts:99-120` (`redirectStateMismatchToClearLogin`)

**Behavior**: When a state-mismatch error reaches the user (via `?error=state_mismatch`), the middleware redirects with `Clear-Site-Data: "cache", "cookies", "storage"` and the recovery script bounces through `/login?...&oauth_state_reset=1`. After cookies are cleared, the next sign-in attempt succeeds.

**Audit observation**: This is reactive, not preventive. The recovery works (the user reports being able to sign in eventually), but the FIRST click is wasted. The root cause of the original mismatch is likely:
- Stale `__Secure-better-auth.state` cookie from a previous attempt (with `Secure` attribute that the localhost `clearBetterAuthOAuthStateCookies` cannot clear because clear runs with `secure=false` on HTTP origin)
- OR a previously-aborted OAuth flow that left a half-consumed state cookie

**Note**: This bug is intermittent and the recovery infrastructure self-heals within one cycle. Not P0 for the picker fix; worth capturing telemetry next time it happens.

---

## 6. D1 schema (auth-relevant tables, from migration filenames)

### Active D1 migrations (`./migrations/`)

| # | Migration | Purpose |
|---|---|---|
| 0001 | closed_beta_feedback | Closed-beta feedback storage |
| 0002 | legal_terms_acceptance | Terms-of-service acceptance tracking |
| 0003 | profiles | User profiles (id, email, role, default_workspace_id, display_name, avatar_url) |
| 0004 | account_security_events | Audit log (event_type, user_id, workspace_id, ip_hash, user_agent_hash, metadata_json) |
| 0005 | account_settings | Onboarding + workspace settings |
| 0006 | ai_audit_rate_limits | Rate-limit counter storage (used by invite + publication flows) |
| 0007 | collaboration_invitations | Invite lifecycle (id, workspace_id, project_id, estimate_id, email, role, scope, expires_at, lifecycle_state, invited_user_id, invited_by, accepted_via, ...) |
| 0008 | estimate_sheet_user_preferences | Per-user estimate UI prefs |
| 0009 | notifications | User notifications |
| 0010 | upload_metadata | File upload tracking |

**Note**: The D1 migration set is partial — it covers auth/collaboration/notification core but additional migrations are needed for the full publication subsystem (publication tokens, recipient sessions, comments, decisions, events). These may live in `./supabase/migrations/` and require porting; confirm with the cloudflare-migration pack.

### Supabase migrations retained (`./supabase/migrations/`, 20+ files)

Used as **rollback/comparison surface** per cloudflare-migration pack's `01_EXECUTIVE_SUMMARY.md`. Includes auth-critical schemas like:
- `20260518100000_auth_profiles_ceo_access.sql` (CEO role grant)
- `20260527115342_project_invite_entry_tokens.sql`
- `20260527120000_project_client_publication.sql`
- `20260528220000_project_shared_link_overhaul.sql`
- `20260531175141_shared_link_recipient_unsubscribe.sql`
- `20260601145000_lock_down_shared_link_recipient_credentials.sql`
- `20260614144712_narrow_private_rls_policies_to_authenticated.sql` (Postgres RLS — D1 has no equivalent; app-layer enforcement required)

**Critical**: D1 does NOT support Postgres RLS. The Supabase RLS policies being ported must be enforced at the **app layer** (server actions + repositories) for D1. The current code does this via explicit `WHERE workspace_id = ?` filters in D1 queries — see `invitation-d1-store.ts` for examples.

---

## 7. Test coverage inventory

### Vitest DOM (`tests/vitest/`, auth-related)

30+ files identified via filename match. Key files for auth-audit:

| File | Surface |
|---|---|
| `auth-callback-route.test.ts` | Legacy `/auth/callback` route (disabled) |
| `auth-magic-link.test.ts` | Magic-link sign-in flow |
| `auth-proxy.test.ts` | Middleware (`request-proxy.ts`) |
| `auth-redirect-sanitizer.test.ts` | `sanitizeNextPath`/`buildLoginRedirectUrl` |
| `auth-session-closed-beta.test.ts` | Closed-beta gate inside `getCurrentUserContext` |
| `auth-set-cookie-forwarding.test.ts` | OAuth state cookie clearing/forwarding |
| `auth-error-mapping.test.ts` | Public error code mapping |
| `auth-sensitive-api-boundaries.test.ts` | Auth-sensitive API surface |
| `auth-account-data-*.test.ts` (4 files) | Account form parsing + schema |
| `cloudflare-better-auth-proof-*.test.ts` (3 files) | Better Auth route gate + proof router |
| `cloudflare-d1-authz-access-matrix-script.test.ts` | **D1 authz matrix enforcement** (primary tool for finding gaps) |
| `cloudflare-d1-closed-beta-proof-script.test.ts` | Closed-beta D1 proof |
| `closed-beta-access.test.ts`, `closed-beta-allowlist-admin.test.ts` | Closed-beta logic |

### Playwright E2E (`e2e/`)

| File | Surface | Env-gated? |
|---|---|---|
| `auth.spec.ts` | Login/signup smoke | No |
| `project-invite-entry.spec.ts` | Invite accept flow | `ARCHESTIMATOR_E2E_INVITE_ENTRY=1` |
| `shared-link-receiver.spec.ts` | Publication viewer flow | `ARCHESTIMATOR_E2E_SHARED_LINK=1` |

### Coverage gaps (from filename-level review)

- **No dedicated test** for `prompt=select_account` absence (Bug A)
- **No dedicated test** for signOut not revoking Google (Bug B)
- **No test** confirming viewer-session cookie cannot satisfy middleware's `hasBetterAuthSessionCookie` check (relies on string-name mismatch — fragile if cookie naming convention changes)
- **P10 in-memory lockout** likely tested in `project-publication-security.test.ts` (filename pattern) — confirm whether the test mocks the in-memory store or exercises real isolate behavior

---

## 8. Cloudflare-migration sibling pack — status

**Status**: `CONDITIONALLY READY for full-native redesign planning and reversible proof spikes. NOT READY for production cutover.` (per their `01_EXECUTIVE_SUMMARY.md`)

**In-flight work** (per `git status` dirty files):
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md`
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md`
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md`

**Conflict surface**: No intended write collision for this planning pass. The wider worktree contains unrelated source/doc changes from other agents; this auth-audit pack is confined to its own plan directory and must not revert or rewrite unrelated work.

**Doc-drift findings in the cloudflare-migration pack** (out of scope to fix here, flagged for cross-pack coordination):
- Their `01_EXECUTIVE_SUMMARY.md` references `src/proxy.ts:165-183` and `src/lib/supabase/server.ts:31-56` — both are stale (auth has since migrated to `src/lib/auth/request-proxy.ts` and Better Auth).
- Their README still describes Supabase Auth as active in places.

---

## 9. Surprises / smells / open questions

1. **`AppRole` enum is not centrally defined**. `profile-d1-store.ts` exports the type, `beta-allowlist-admin.ts` ad-hocs `ceo`/`admin`, `account-data.ts` defines `WorkspaceAccountRole`. There is no single source of truth that says "these are all the roles in the system and where each is valid." This is a refactoring opportunity.

2. **Editor role appears in DB precedence but not in TS types**. The acceptance SQL in `invitation-d1-store.ts:387-403` handles `owner/admin/editor/else` for both project and estimate members, but `WorkspaceAccountRole` does not include `editor`. Confirm: is `editor` only valid at the project/estimate level? If so, this should be encoded as a separate `ProjectMemberRole` type.

3. **`PENDING_INVITE_COOKIE` HMAC secret** — not yet inspected. `continue/route.ts` uses `createPendingInviteBridge(rawToken)` from `pending-invite.ts`. Audit needed: what's the signing secret, what's the Max-Age, can it be replayed across users?

4. **`ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` env var** was previously flagged as missing from `.env.example`. 2026-07-03 source evidence shows it is now documented, so this is closed as a stale finding. Keep it in Phase 0 revalidation.

5. **In-memory rate-limit stores** in `publication/security.ts:569` (`passwordAttemptStore`) — serverless-brittle. See finding P0-PUB-1 in §4.2.

6. **Public form CSRF tokens** — `createPublicFormCsrfToken` and `createPublicPostCsrfToken` are functionally identical (both: 16 random bytes base64url). Two functions for the same shape — candidate for consolidation.

7. **Origin-check asymmetry** between invite accept (`isAllowedInviteOrigin` — allows missing Origin) and publication POST (`assertSameOriginPublicPost` — requires Origin match). Justified by authentication asymmetry (invite requires session cookie, publication does not), but should be documented as a deliberate decision.

8. **`account-data.ts:103` `AccountSecurityEventType` enum** has 10 events but the actual codebase records events of other types too (e.g. `collaboration_invite_opened`, `collaboration_invite_accepted` in `invitation-d1-store.ts`). The enum is local to account security events; the collaboration events have their own table. This is fine — but a cross-subsystem event taxonomy would help observability.

---

## 10. External evidence completed in refresh

The previously pending Better Auth/plugin/security research is now summarized in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`, and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

Current architectural posture:
- Better Auth organization/access-control features are relevant, but adoption is deferred until Archestimator's workspace/project/estimate role taxonomy and authz matrix are explicit.
- Publication recipient sessions remain separate from Better Auth app sessions.
- Revocation and logout semantics remain a Phase 1 decision rather than an implicit side effect of the account-picker fix.
