# Source and Codebase Audit

**Authority:** Read-only evidence gathered by four parallel `Explore` lanes (L1 invite source, L2 origin/CSRF/cookie, L3 auth/membership/email/D1, L4 sibling-pack shape) plus targeted lead reads of the actual route handlers and `invite-entry.ts`/`invite-origin.ts`. Every claim below is sourced to a repo-relative file:line. **No raw token values appear anywhere in this document.**

## 1. Invite token lifecycle source map

### 1.1 Creation (generation + storage + invitation upsert)
- `src/lib/collaboration/actions.ts`
  - `INVITE_EXPIRATION_DAYS = 14` (L93). `managerRank = 30`.
  - `inviteProjectCollaborator` (L936–1053), `inviteEstimateSheetCollaborator` (L1055–1175): assert manager access (`assertProjectAccessManager`/`assertEstimateAccessManager`, L218–318), `assertAssignableRole` (cannot assign above own rank, L115–118), `normalizeEmail`, `checkInviteCreateRateLimit`. Branch: if invite-entry enabled → `upsertInvitation` then `issueInviteEntryLink`; elif a `profiles` row exists for that email → **direct-grant** (`upsertProjectMemberInD1`/`upsertEstimateSheetMemberInD1` + `markDirectGrantedInvitationInD1`); else → `sendCloudflareInviteEmail` (L614–644) building `/invite/<token>`.
  - `upsertInvitation` (L386–481): find existing pending invitation by `(project_id, email, scope, estimate_id)`; refresh (`expires_at`, `role`, reset acceptance fields) OR insert new `collaboration_invitations` row. `expiresAt = now + 14 days`.
  - `issueInviteEntryLink` (L503–612): `createInviteToken()`; **`revokeExisting=true`** marks all currently-active tokens for that invitation as revoked (`UPDATE collaboration_invitation_tokens SET revoked_at, revoked_by WHERE invitation_id=? AND used_at IS NULL AND revoked_at IS NULL`, L532–546) — **this implicit-revoke-on-reissue is the only token revocation path in app code**. Inserts new `collaboration_invitation_tokens` row, `collaboration_invite_token_issued` audit (with `token_hint`, no raw token). Builds URL via `resolveInviteOrigin` (L483–501) → `resolveAllowedAuthOrigin` (`src/lib/auth/redirects.ts`).
  - `copyProjectInviteLink` (L1177–1223): re-issues token with `delivery_method='copy_url'`, `checkInviteResendRateLimit`, `collaboration_invite_link_copied` audit.
  - `resendProjectInviteEmail` (L1225–1289): rejects if not `lifecycle_state='pending'`, rejects if `expires_at <= now`, manager check, `checkInviteResendRateLimit`, `issueInviteEntryLink(deliveryMethod:'email')`, sends email, `collaboration_invite_email_sent` audit.
- `src/lib/collaboration/invite-entry.ts`
  - `readInviteEntryConfig`/`isProjectInviteEntryEnabled` (L26–52): gate on `PROJECT_INVITE_ENTRY_ENABLED === "true"` AND `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` matching `^[a-f0-9]{64}$`. Returns disabled reasons.
  - `hashInviteToken` (L54–64): `sha256("v1:" + pepper + ":" + rawToken)` hex → `"v1:<hex>"`. Version `INVITE_TOKEN_HASH_VERSION = "v1"`; raw length `INVITE_TOKEN_BYTE_LENGTH = 32` (L14).
  - `createInviteToken` (L66–76): `randomBytes(32).toString("base64url")` → `{ rawToken, tokenHash, tokenHint: last 6 chars }`.
  - `buildInviteEntryUrl` (L78–80): `${origin}/invite/${encodeURIComponent(rawToken)}`.

**Finding (creation):** No explicit `revokeInvitation` Server Action exists. Revocation is a side-effect of re-issuing. → SEC-07, DEC-03.

### 1.2 Lookup / resolution
- `src/lib/collaboration/invitation-d1-store.ts` ("server-only")
  - `readInvitationByTokenHash` (L160–197): joins `collaboration_invitation_tokens t` → `collaboration_invitations i` → `projects`/`estimates`/`profiles inviter`, `WHERE t.token_hash = ?`. **Looks up by hash only, never raw token.**
  - `readInvitationById` (L199–235): same shape, by invitation id (cookie path).
  - `materializeExpiredInvitations` (L144–158): sweeps `lifecycle_state='pending'` → `'expired'` where `expires_at <= now`. Called at start of resolve and accept.
  - `resolveCollaborationInvitationFromD1` (L281–336): orchestrates resolve. Materializes expired, reads by hash, updates `last_opened_at` on token + invitation (batched), inserts `collaboration_invite_opened` audit, returns `InviteResolutionRow` via `resolveState`.
  - `resolveState` (L116–123): revoked → already_used → expired → active.
  - `toResolutionRow` (L78–114): for **revoked** state **nulls every detail field** (no info leak); others include project/role/inviter/expiry.
  - Wrappers `resolveCollaborationInvitationFromCloudflareD1` (L338–341).

**Finding (resolution):** Hash-only lookup is correct. Revoked-state detail nulling is correct. No raw token reaches the DB layer.

### 1.3 Route page (preview + state machine)
- `src/app/invite/[token]/page.tsx` (Server Component). Token regex `TOKEN_SHAPE_PATTERN = /^[A-Za-z0-9_-]{32,256}$/` (L22).
  - `resolveInviteEntryState` (L64–92): gate → shape check → `checkInviteResolutionRateLimit` → `hashInviteToken` → `resolveCollaborationInvitationFromCloudflareD1`. Maps states: `invalid | rate-limited | expired | revoked | already-used | signed-out-preview | wrong-account | signed-in-preview`.
  - `readInviteCurrentBetterAuthEmail` (L94–106): reads signed-in Better Auth email without consuming session → wrong-account vs signed-in preview.
  - Wrong-account branch (L215–239): "This invite is for another account" + form POST to `/invite/<token>/sign-out`.
  - Signed-in preview: form POST to `/invite/<token>/accept`. Signed-out preview: link to `/invite/<token>/continue`.
  - Terminal states (L173–198): recovery copy + inviter email + `/contact`. **No raw tokens rendered.**

### 1.4 Accept (POST → membership)
- `src/app/invite/[token]/accept/route.ts`
  - GET (L77–81): redirects to `/invite/<token>`.
  - POST `acceptInvite` (L83–133): **order:** `isAllowedInviteOrigin` → `readAcceptedInviteDisplayContext` (form data) → config gate → `getCurrentUserContext` → `checkInviteAcceptRateLimit` (userId-keyed) → `acceptInvitationTokenForUser({ invitationTokenHash: hashInviteToken(rawToken, pepper) })`. On `accepted`/`already_member` → redirect `/workshop?invite=accepted&...`; else → back to `/invite/<token>`. Comment at L87–90 documents the origin check as the fix for "finding (5 §6 LOW) / gap G5".
- `src/lib/collaboration/invitation-acceptance.ts` ("server-only")
  - `normalizeActor` (L17–24): requires valid UUID userId + normalized email, else `invalid`.
  - `acceptInvitationTokenForUser` (L41–59) → `acceptCollaborationInvitationTokenInCloudflareD1`.
  - `acceptInvitationByIdForUser` (L61–79) → `acceptCollaborationInvitationByIdInCloudflareD1` (cookie path).
- `invitation-d1-store.ts` `acceptInvitationInD1` (L453–583) — the membership RPC:
  1. `materializeExpiredInvitations`, read row (by hash or id).
  2. `{state:'revoked'}` if revoked (L466).
  3. Expiry `isExpired` (L74–76, `value <= now`): token or invitation expired, or lifecycle expired → `{state:'expired'}` (L469).
  4. `acceptedState` (L125–131): `already_member` if actor is the invited user and lifecycle is `accepted_by_recipient`/`direct_granted_existing_user`; `already_used` if `token_used_at` set and actor differs. Logs `collaboration_invite_replay_blocked` (L476–481).
  5. **Wrong-account check** (L493–501): `normalizeEmail(row.invited_email) !== actorEmail` → `collaboration_invite_wrong_account` audit (metadata = invited email), return `{state:'wrong_account', invited_email}`. **No membership created.**
  6. Membership creation (L503–511): `acceptProjectInvitation` (L373–411, upsert `project_members` highest-role-wins `ON CONFLICT`); `acceptEstimateInvitation` (L413–451, upsert `estimate_sheet_members`); `hasProjectMembership`/`hasEstimateMembership` detect `already_member`.
  7. Finalization (L513–573): set `token.used_at`, invitation `accepted_at`/`invited_user_id`/`accepted_via`/`lifecycle_state='accepted_by_recipient'`, `collaboration_invite_accepted` (or `collaboration_invite_already_member_confirmed`) audit.

### 1.5 Pending-invite bridge cookie (set / read / clear)
- `src/lib/collaboration/pending-invite.ts` ("server-only")
  - `PENDING_INVITE_COOKIE = "archestimator_pending_invite"` (L11).
  - `PENDING_INVITE_MAX_AGE_SECONDS = 30 * 60` = 30 minutes (L12).
  - Bridge payload `{ version:1, tokenHash, createdAt }` — **stores the hash, not the raw token** (L19–23, 39–55).
  - `createPendingInviteBridge` (L39–55): base64url(JSON payload) + HMAC-SHA256 sig using the token pepper → `v1.<payload>.<sig>`.
  - `readPendingInviteBridge` (L57–75): verifies HMAC with `timingSafeEqual`, checks version, presence of tokenHash/createdAt, **enforces the 30-min TTL**. Returns null on any tamper/failure.
- **SET** — `src/app/invite/[token]/continue/route.ts` (L39–72). GET/POST. `checkInviteContinueRateLimit` → `createPendingInviteBridge` → redirect `${LOGIN_PATH}?next=/workshop/pending-invite`. Cookie attrs (L64–70): `httpOnly:true, sameSite:"lax", secure: NODE_ENV==='production', maxAge: 1800, path:"/"`. **No Domain** (host-only). **No `isAllowedInviteOrigin` call.**
- **READ** — `src/app/workshop/pending-invite/route.ts` (L70–86). GET. Reads cookie, `readPendingInviteBridge`. If valid → `acceptPendingInviteBridge`. HTML interstitial meta-refresh + `window.location.replace`. `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- **CLEAR** — same file, `clearPendingInviteCookie` (L9–17): re-sets cookie with `maxAge:0` + same attrs. **Only cleared when `banner.kind !== 'wrong-account'`** (L84) — wrong-account deliberately keeps the cookie for retry.
- Workshop redirect on cookie presence — `src/app/workshop/page.tsx:98-99`: if cookie exists and no invite banner in URL, `redirect("/workshop/pending-invite")`.
- `src/lib/collaboration/pending-invite-actions.ts` ("use server"):
  - `acceptPendingInvitationById` (L53–88): `requireAuth`, validates `invitationId` UUID, `acceptInvitationByIdForUser`, maps states to `/workshop?invite=...`. Wrong-account → `/workshop?invite=wrong-account&email=<invitedEmail>`.
  - `signOutForPendingInvite` (L34–51): internal POST to `/api/auth/sign-out`, clears `better-auth.session_token` and `__Secure-...` cookies (`maxAge:0, path:"/"`), redirects to login.
- `src/lib/collaboration/workshop-pending-invite.ts` ("server-only"). `acceptPendingInviteBridge` (L29–69) reads current user context, calls `acceptInvitationTokenForUser({ invitationTokenHash: bridge.tokenHash })`, returns `WorkshopInviteBannerState` (`none | accepted | wrong-account | unavailable`).

**Finding (bridge cookie):** Hash-only payload + HMAC + TTL is cryptographically sound. The gap is the **missing origin check on the SET path** (`continue/route.ts`). → SEC-02, DEC-02.

### 1.6 Resend / revoke
- **Resend** — `resendProjectInviteEmail` (actions.ts L1225–1289) as above. Confirmed UI call site: `PublisherProjectMembersPanel.tsx` (estimate invite). `copyProjectInviteLink`/`resendProjectInviteEmail` exported but no in-tree component import located for the project-scope resend/copy UI.
- **Revoke** — **No dedicated `revokeInvitation` Server Action, no revoke button.** Tokens revoked only implicitly inside `issueInviteEntryLink` (`revokeExisting=true`, L532–546). → SEC-07, DEC-03.

### 1.7 Membership writers (all paths)
- Accept: `acceptProjectInvitation` → `project_members`; `acceptEstimateInvitation` → `estimate_sheet_members` (L373–451). Promotion-only `ON CONFLICT`.
- Direct grant: `upsertProjectMemberInD1` (L785–815), `upsertEstimateSheetMemberInD1` (L817–852), `markDirectGrantedInvitationInD1` (L854–903). **Overwrite roles, no promotion guard.**
- `workspace_members` referenced in `readProjectActorRank` (L185–197), backfilled by migration 0030.
- Role-change/remove: `updateProjectCollaboratorRole` (L1291–1340), `removeProjectCollaborator` (L1375–1451), `removeEstimateSheetCollaborator` (L1453–1509) — include "at least one owner/admin" guards.

**Finding (role-write asymmetry):** Direct grant can downgrade; accept cannot. → SEC-10, DEC-07.

### 1.8 Expiry (all sites)
- Creation: `expires_at = now + 14 days` (actions.ts L399).
- Resolve: `materializeExpiredInvitations` + `isExpired(token_expires_at) || isExpired(invitation_expires_at)` (invitation-d1-store.ts L74–76, L119, L286, L458, L469).
- Accept: same (L469).
- Resend: rejects `expires_at <= Date.now()` (actions.ts L1247).
- Cookie bridge: 30-min TTL on read (pending-invite.ts L70).

### 1.9 Rate limits (abuse resistance)
- `src/lib/collaboration/invite-entry.ts`:
  - Scopes: `collaboration_invite_create` 20/1h; `collaboration_invite_resend` 5/1h; `collaboration_invite_resolve` 30/60s; `collaboration_invite_continue` 10/60s; `collaboration_invite_accept` 5/60s (key includes userId).
  - **L184–185: `if (!config.enabled) return { allowed: true }`** — all invite rate limits bypass when entry disabled.
  - IP-hashed via `cf-connecting-ip` → HMAC-SHA256 with `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` (falls back to token pepper). Key hash = SHA-256 of `scope \u001f parts`.
  - Backed by D1 audit store (`getAiAuditD1Database` → `security_rate_limit_events`).

**Finding (rate limits):** Fail-open under disabled flag. → SEC-05, DEC-04.

### 1.10 Pepper reuse
- `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` reused as: (a) invite token hash pepper; (b) fallback rate-limit IP-hash pepper (`invite-entry.ts:108-118`); (c) fallback Ed25519 seed for realtime identity (`src/lib/collaboration/realtime-identity-server.ts:41-55`, `realtime-room-token.ts:7`).
- `readInviteRateLimitHashPepper` prefers `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` but falls back to the token pepper.

**Finding (pepper reuse):** Key-separation hygiene gap. → SEC-09, DEC-06.

---

## 2. Auth boundary (intersects, not rewritten)

- `src/lib/auth/session.ts` — `getCurrentUserContext` (L89, `React.cache`-memoized): dev bypass; if Better Auth enabled → `getCloudflareBetterAuthIdentityFromRequest` (L56–61) → closed-beta gate (L64–72, redirect `/access-required` on denial); resolve D1 `profiles` by email via `getProfileByEmailFromCloudflareD1`, **synthetic-profile fallback** (L77). `requireCurrentUserContext`/`requireAuth` (L100–108) redirect `/login`.
- Session always read server-side via `auth.api.getSession({ headers, query: { disableCookieCache: true } })` (`getBetterAuthRouteGateSession`, `better-auth-cloudflare.ts:260-267`). **Cookie cache disabled everywhere** (DB-backed).
- `src/lib/auth/account-membership.ts` — `readFirstAccountWorkspaceMembership` (L44) walks `workspace_members` → `project_members` → `estimate_sheet_members`. `isMissingOptionalCollaborationTable` (L13–39).
- `src/lib/auth/account-actions.ts` — `completeOnboarding` (L48), `getAccountSetupState` (L152), `resolveWritableWorkspaceId` (L220). Branches on `invitedCollaborator` = no `default_workspace_id` but has membership row (L53).
- `src/lib/auth/account-setup.ts` — `resolvePostAuthDestination` (L7) **explicitly allows `/workshop/pending-invite` next-path** so the invite bridge survives the auth round-trip.
- `src/lib/auth/cloudflare-better-auth-runtime.ts` — `resolveTrustedOrigins` (L91) builds `trustedOrigins` from baseURL, request URL, host-derived origin, `BETTER_AUTH_TRUSTED_ORIGINS`, `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`. `originFromHeaders` (L75–80) derives origin from `host`+`x-forwarded-proto` and adds to trustedOrigins every request.
- `src/lib/auth/better-auth-cloudflare.ts` — `createCloudflareBetterAuthOptions` (L158–186): `appName`, `basePath:"/api/auth"`, `baseURL` via `resolveBaseURL`, `secret:BETTER_AUTH_SECRET`, `session.cookieCache.enabled:false`, `advanced` only `backgroundTasks.handler=waitUntil`. **No `advanced.csrf`, `cookiePrefix`, `secondaryCookie`, `crossSubDomainCookies`, `useSecureCookies`.**
- `src/lib/auth/request-proxy.ts` — the proxy (matcher `"/((?!_next/static|_next/image|favicon.ico).*)"`). `/invite` in `PUBLIC_ROUTE_PREFIXES` (L18) → **proxy never auth-gates invite routes**. Performs NO Origin/Referer/CSRF checks. All invite protection lives in route handlers.
- `src/lib/auth/redirects.ts` — `getAllowedAppOrigins` (L21–35) from `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`. `resolveAuthOrigin` (L37–74). **Not wired to the invite guard.**
- `src/app/auth/callback/route.ts` — legacy OAuth callback **intentionally disabled** (`auth_callback_legacy_disabled`, redirect `/login?error=callback_exchange_failed`). Better Auth handles callbacks internally.

**Finding (auth join):** Email-only join + synthetic-profile fallback is an account-linking risk if invitee signs up with a differently-cased/aliased email. → SEC-08 (documented; mitigation is email normalization which is already applied at invite creation).

---

## 3. Origin / CSRF / cookie infrastructure (the fail-open surface)

### 3.1 The invite origin guard (the permissive one)
- `src/lib/collaboration/invite-origin.ts` — `isAllowedInviteOrigin(request)` (L22–40):
  - `readAppHost` (L10–20): `x-forwarded-host` (first comma-split) → `host` → `new URL(request.url).host`.
  - **L27: `if (!appHost) return true;`** — undeterminable host → ALLOW.
  - L29–32: Origin host present → must equal appHost.
  - L34–37: Referer host present → must equal appHost.
  - **L39: `return true;`** — both Origin AND Referer missing → **ALLOW**.
- Callers: `accept/route.ts:91`, `sign-out/route.ts:25`. **NOT** `continue/route.ts`, **NOT** the workshop pending-invite GET, **NOT** the pending-invite Server Action.

**Finding (origin):** This is the brief's confirmed claim. → SEC-01, DEC-01; SEC-02, DEC-02.

### 3.2 CSRF infrastructure
- **No global CSRF middleware.** Better Auth CSRF is library-default (scoped to `/api/auth`).
- Publication/share CSRF (reference impl, **not** wired to invites): `src/lib/publication/security.ts`
  - `createPublicPostCsrfToken` (L168–174), `createPublicFormCsrfToken` (L176–182).
  - `assertSameOrigin` (L361–371) — **also permissive**: `if (!origin) return { ok: true };`.
  - `assertSameOriginPublicPost` (L373–387) — **strict**: requires Origin present AND matching AND `x-archestimator-csrf` header == `ae_publication_csrf` cookie.
  - Cookie `ae_publication_csrf`, client-set via `document.cookie` `Path=/; SameSite=Lax; Max-Age=3600` (no Secure, no HttpOnly — intentionally readable). `src/lib/publication/client-csrf.ts:10`.
- Sec-Fetch-*: only `src/app/api/internal/client-error/route.ts:33-36` `passesFetchMetadata` (`!site` short-circuit = missing treated as passing). No invite route uses Sec-Fetch-*.

### 3.3 Cookie-setting utilities (defaults across the repo)
There is **no canonical `src/lib/cookies.ts` helper**. Cookie setting is decentralized:

| Location | Cookie | HttpOnly | Secure | SameSite | Path | MaxAge | Notes |
|---|---|---|---|---|---|---|---|
| `continue/route.ts:64-70` | `archestimator_pending_invite` | yes | prod-only | lax | `/` | 1800 | Bridge cookie |
| `workshop/pending-invite/route.ts:10-16` | (clear) | yes | prod-only | lax | `/` | 0 | Mirror |
| `sign-out/route.ts:42-43` | `better-auth.session_token`, `__Secure-…` | **unset** | **unset** | **unset** | `/` | 0 | **Attribute gap** |
| `request-proxy.ts:111` | OAuth state clear | yes | **always true** | lax | `/` | 0 | Hardcoded secure |
| `pending-invite-actions.ts:42-51` | session cookies clear | unset | unset | unset | `/` | 0 | Same gap as sign-out |
| `terms-gate-cookie.ts:60-67` | `ae_terms_gate` | yes | prod-only | lax | `/workshop` | 900 | Scoped path |
| `publication/security.ts:343,510,540` | publication/session | yes | prod-only | lax | `/` | 86400 | |
| `share/[token]/unsubscribe/route.ts:57` | `ae_publication_csrf` | **no** | prod-only | lax | `/` | 600 | Intentionally readable |

Conventions: `HttpOnly:true` for all session/auth/bridge cookies; `Secure: prod-only` dominant (exception: request-proxy OAuth clear hardcodes `secure:true`); `SameSite:"lax"` everywhere (no strict/none); `Path:/` mostly (`/workshop` for terms gate); `Domain` never set except `.archestimator.com` cleanup in `set-cookie-forwarding.ts:128-130`; `partitioned` never set.

**Finding (cookie attrs):** The sign-out route (and `signOutForPendingInvite`) omit security attributes on cookie clear. → SEC-04, DEC-05.

### 3.4 CSP configuration
- `next.config.ts` `headers()` (L154–288). Two CSP values: `landingReportOnlyCsp` (L20–31), `workshopReportOnlyCsp` (L33–47).
- `/invite/:path*` (L248–257, `appAndInviteHardening`): `Content-Security-Policy-Report-Only` = `landingReportOnlyCsp` + `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Robots-Tag: noindex,nofollow`.
- **`form-action 'self'` is Report-Only** → zero enforcement today. The accept/sign-out forms post same-origin so a tightened enforced `form-action 'self'` would not block them; the actual cross-origin block must come from `isAllowedInviteOrigin`.
- `/share/:path*` page is the only **enforced** CSP (L191–206).
- Deferred CSP-nonce pipeline documented L177–179, L230–236 — not yet implemented.

**Finding (CSP):** Report-Only on `/invite` provides defense-in-depth signal but no enforcement. Out of scope to change to enforced here (sibling CSP plan owns that), but noted as residual risk.

---

## 4. Email delivery

- `src/lib/collaboration/actions.ts:614-644` `sendCloudflareInviteEmail` — builds invite email **inline** (no separate template): subject `You're invited to ${projectName} on Archestimator`; text/html contain `inviteEntryUrl`, role, scope label, project name; tags `archestimator_surface=project_collaboration`, `collaboration_event=invite_email`. Wrapped try/catch, degrades to "share link manually" on failure (L1030–1042).
- `src/lib/email/transactional-email-client.ts` — `sendEmail` (L98) + **in-process circuit breaker** (L59–96): opens 10 min after >50% failure rate over ≥4 attempts in 5-min; returns `code:"CIRCUIT_OPEN"`. `readEmailDeliveryConfig` (L45): `configured = enabled && provider is cloudflare && cloudflareFrom set`.
- `src/lib/email/cloudflare-email-client.ts` — `sendCloudflareEmail` (L121). Resolves `EMAIL` binding via `getCloudflareContext({ async:true })` (L78–85). Provider check accepts `cloudflare`/`cloudflare-email`/`cloudflare-email-service` (L74–76). Errors: `EMAIL_NOT_CONFIGURED`, `EMAIL_BINDING_MISSING`, `CLOUDFLARE_EMAIL_SEND_ERROR`.
- Provider config: `wrangler.jsonc` L25–29 `send_email` binding `EMAIL` (**no `destination_address`/`allowed_destination_addresses`** — unverified recipient domain). Env: `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` (default `false`), `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`, `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO`.
- `readProjectInviteDeliveryReadiness` (actions.ts L917) — UI readiness combining `isProjectInviteEntryEnabled()` + `readEmailDeliveryConfig()`.
- Delivery audit: `collaboration_invite_email_sent` / `collaboration_invite_link_copied` via `recordCollaborationInvitationDelivery` (L646); `invite_email_attempted` via `recordCollaborationAuditEvent` (L708).

**Finding (email):** **No bounce webhook, no delivery-receipt, no per-invite retry.** Synchronous send + circuit breaker only. → REL-02, DEC-10, OPEN-REL-01. **No queue/cron handoff** for invites (`UPLOAD_JOBS_QUEUE` is the only queue; crons are upload + retention).

---

## 5. Data / D1

- Latest migration at planning time: `migrations/0037_remove_preloaded_component_categories.sql` (created by concurrent work at 2026-07-07 09:40 during this planning session -- see `00` Concurrent-repository safety). **Next available: `0038`** (re-verify before authoring). At session start `0036_cost_library_component_drafts.sql` was latest; the L3 lane's "next `0037`" finding was overtaken by concurrent work -- exactly the high-concurrency scenario the stale-plan revalidation checklist guards against.
- `migrations/0007_collaboration_invitations.sql` (foundational):
  - `workspaces` (L1–8), `projects` (L10–19), `estimates` (L21–29).
  - `project_members` (L31–41): PK `(project_id,user_id)`, role `owner/admin/editor/viewer` default `editor`.
  - `estimate_sheet_members` (L43–53): PK `(estimate_id,user_id)`, role default `viewer`.
  - `collaboration_invitations` (L55–92): id, workspace_id, project_id, estimate_id, scope `project/estimate` (CHECK scope↔estimate_id L88–91), email (CHECK `email = lower(trim(email))`), role, invited_by, invited_user_id, lifecycle_state `pending/direct_granted_existing_user/accepted_by_recipient/revoked/expired` default `pending`, accepted_at, **accepted_via `NULL/invite_route/pending_invite/auth_trigger/manager_direct_grant`** (L74–78 — **`auth_trigger` never written**), direct_granted_at, direct_granted_user_id, revoked_at, last_opened_at, expires_at NOT NULL, created_at, updated_at.
  - `collaboration_invitation_tokens` (L94–107): id, invitation_id, **token_hash UNIQUE** (`length(trim)>0`), token_hint, delivery_method `email/copy_url`, created_by NOT NULL, created_at, expires_at NOT NULL, last_opened_at, used_at, revoked_at, revoked_by. **No raw-token column.**
  - `collaboration_audit_events` (L109–121): id, invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata_json (CHECK json_valid + object), created_at.
  - Indexes (L123–158): membership lookups, **`idx_collaboration_invitation_tokens_active_by_invitation` (partial UNIQUE on `invitation_id WHERE used_at IS NULL AND revoked_at IS NULL` — one active token per invitation)**, invitations-by-email/project/estimate-lifecycle, audit-by-invitation/project-created_at.
- Other membership migrations: `0013_collaboration_management_sidecars.sql` (`workspace_members` PK `(workspace_id,user_id)`, role `owner/admin/member/viewer` default `member`), `0030_workspace_owner_membership_backfill.sql`, `0032_project_group_membership_positions.sql`.
- `0035_account_security_events_hmac_checks.sql` — tightens `ip_hash`/`user_agent_hash` CHECK to HMAC shape.
- Better Auth tables (`user`/`session`/`account`/`verification`) **not** in `./migrations/`; generated by `better-auth/db` (`compileCloudflareBetterAuthD1Migrations`). Reference schema at `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-better-auth-d1-schema.sql`.

**Finding (schema):** `auth_trigger` dead enum value (L77) → SEC-11, DEC-08/OPEN-SEC-01. No `revoked_reason` column → DEC-09 (migration `0038`).

---

## 6. Observability / hosted proof

- `src/app/api/internal/collaboration-invitation-proof/route.ts` + `src/lib/cloudflare/collaboration-invitation-proof-router.ts` — bearer-`CRON_SECRET` end-to-end D1 proof harness. Seeds `codex-collab-proof-*` fixtures, exercises resolve/accept/replay/wrong-account/accept-by-id/cleanup. **Explicitly does not return raw tokens** (note L448). Documents security invariants.
- `src/lib/observability/redact.ts` redacts invite tokens from logs.
- Audit event types: `collaboration_invite_opened`, `_token_issued`, `_email_sent`, `_link_copied`, `_accepted`, `_already_member_confirmed`, `_replay_blocked`, `_wrong_account`, plus `invite_email_attempted`, `role_changed`, `member_removed`.

---

## 7. Existing test coverage (regression baseline)

`tests/vitest/` invite-specific:
- `invite-accept-origin.test.ts` — pins `isAllowedInviteOrigin` (cross-origin blocked, same/forwarded allowed, missing-origin-with-same-referer allowed, cross-referer blocked). **Documents the LOW CSRF finding — must be updated when DEC-01 lands.**
- `pending-invite-cookie.test.ts` — bridge cookie hash-only storage, HMAC tamper rejection, TTL, disabled-when-flag-off.
- `project-invite-entry-route.test.ts` — `/invite/[token]` route contract (terminal states, signed-out preview, signed-in accept, wrong-account recovery, rate limits, pepper-keyed IP hashing).
- `project-invite-entry-schema.test.ts` — schema invariants (no raw-token column, one active token per invitation, materialized expiry, wrong-account metadata without accepting, browser-role denial, audit events without browser writes).
- `project-invite-feature-flag.test.ts` — flag/pepper gating, token hashing, resolve/accept/create rate limits.
- `project-invite-sign-out-route.test.ts` — sign-out route CSRF.
- `collaboration-invitation-d1-store.test.ts` — resolve, accept-by-token, wrong-account denial, Supabase-independence.
- `project-collaboration-actions.test.ts` — invite email, resend, copy-link, rate limits, direct grant vs invite-route acceptance, audit events.
- `workshop-pending-invite.test.tsx` — bridge consumption, banners, wrong-account retry, accept-by-id.
- Cloudflare proof-script tests: `cloudflare-d1-collaboration-invitation-proof-script.test.ts`, `cloudflare-hosted-collaboration-invitation-proof-script.test.ts`, `cloudflare-hosted-collaboration-ui-proof-script.test.ts`, `cloudflare-collaboration-room-auth.test.ts`, `cloudflare-collaboration-room-router.test.ts`.
- Schema/authz: `project-collaboration-schema.test.ts`, `project-collaboration-summary.test.ts`, `workspace-collaboration-summary-authz.test.ts`, `project-collaboration-realtime.test.ts`, `project-collaboration-tree-contract.test.ts`, `account-membership-d1.test.ts`, `workspace-owner-membership-backfill-migration.test.ts`, `infosec-db-pending-review-contract.test.ts`.

**No dedicated invite e2e spec.** `e2e/shared-link-receiver.spec.ts`, `e2e/landing-audit.spec.ts` mention invite/pending only tangentially.

---

## 8. Sibling plan-pack shape (conventions matched)

The 2026-07-07 packs (`upload-production-proof-closure`, `bundle-and-route-performance-gate-hardening`, `client-ready-proposal-package-workflow`) and the deep `2026-07-06-Transition-And-Loading-UX-And-UI` pack establish the canonical exhaustive shape: 21 core docs (00–19 + README + PROMPT) + optional deepening docs (`20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`, `21_DATABASE_CHANGE_BLUEPRINTS.md`). `verification_mode` appears in README, `00`, and `17`. ID namespaces: requirements `SEC/UX/A11Y/ARCH/PERF/REL/TEST/DOC-##`; phases `P#`; tasks `P#-T##`; AC `AC-<CAT>-##<letter>`; risks `RISK-##`; decisions `DEC-##`; open `OPEN-<CAT>-##`; lanes `L##`. This pack matches those conventions.
