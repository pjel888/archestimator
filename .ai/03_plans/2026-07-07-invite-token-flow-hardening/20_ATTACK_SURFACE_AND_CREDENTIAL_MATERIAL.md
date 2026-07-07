# Attack Surface Inventory and Credential Material Taxonomy

**Authority:** Required by the Improve directive (credential-material taxonomy for token/cookie/hash flows) and Multi-Agent Execution Directive §7. This plan does **not** change any auth/data/security code — it records the existing posture so the hardening cannot weaken it. Evidence read from `src/lib/collaboration/**`, `src/lib/auth/**`, `src/app/invite/[token]/**`, `src/app/workshop/pending-invite/**`, `migrations/0007_collaboration_invitations.sql`. **No raw token values appear below.**

## 1. Credential-material taxonomy (invite-relevant)

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof (file:line) |
|---|---|---|---|---|---|---|---|---|
| **Invite raw token** (32 random bytes, base64url, ~43 chars) | **Raw bearer (URL path segment)** | `createInviteToken` | **NOT stored raw** | URL `/invite/[token]` → hashed for lookup | **Yes** (URL) | URL only | `revoked_at`/`used_at`/`expires_at`; **explicit revoke (SEC-07, new)** | `invite-entry.ts:66-76`; `buildInviteEntryUrl:78-80` |
| Invite token **digest** (`v1:<sha256hex>`) | Derived (**peppered SHA-256**, pepper=`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`, 64-hex) | `hashInviteToken` | D1 `collaboration_invitation_tokens.token_hash` UNIQUE | `readInvitationByTokenHash WHERE token_hash=?` | No | Lookup key | Re-derives on pepper change; `v1` version prefix | `invite-entry.ts:54-64`; `invitation-d1-store.ts:160-197` |
| Invite token **hint** (last 6 chars of raw) | Derived (truncation; **not** a credential) | `createInviteToken` | D1 `collaboration_invitation_tokens.token_hint` | audit events only | No | Audit/forensics only | rotates with token | `invite-entry.ts:74` |
| **Pending-invite bridge cookie** `archestimator_pending_invite` | Derived/signed (`v1.<base64url payload>.<hmac-sha256>`, payload = `{version, tokenHash, createdAt}` — **hash only, never raw**) | `createPendingInviteBridge` | Client cookie HttpOnly/Secure-prod/SameSite=Lax/Max-Age=1800/Path=/ | `readPendingInviteBridge` (HMAC `timingSafeEqual` + 30-min TTL) | Name only | Cookie (cross-auth-roundtrip bridge) | 30-min TTL; cleared on accept (except wrong-account) | `pending-invite.ts:11-12,19-23,39-75`; `continue/route.ts:64-70` |
| **Better Auth session cookie** `better-auth.session_token` (prod `__Secure-…`) | Opaque signed (Better Auth managed) | Better Auth | Client cookie HttpOnly/Secure-prod/SameSite=Lax | `auth.api.getSession({headers, query:{disableCookieCache:true}})` → **DB-backed** (cookieCache disabled) | Name only | Session | DB-backed (always DB); logout/sign-out clears both variants | `better-auth-cloudflare.ts:167-171`; `request-proxy.ts:24-34`; `sign-out/route.ts:42-43` |
| Rate-limit **key hash** | Derived (SHA-256 of `scope \u001f parts`; IP HMAC'd with `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` fallback token pepper) | `hashRateLimitKey` / `hashIp` | D1 `security_rate_limit_events.key_hash` (TTL) | `countSecurityRateLimitEvents WHERE scope AND key_hash AND occurred_at>=?` | No | Storage key | TTL cleanup via `deleteExpiredSecurityRateLimitEventsInD1` | `invite-entry.ts:102-122,147-152`; `ai/audit-d1-store.ts` |
| **Invite pepper** `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | **Secret (server env, 64-hex)** | operator-provisioned | server env / Workers secret | `hashInviteToken`, `createPendingInviteBridge` (HMAC), fallback rate-limit IP-hash, **fallback realtime Ed25519 seed (SEC-09 gap)** | Never | Key for hash/HMAC | rotate (re-derive token hashes; bridge cookies invalidated) | `invite-entry.ts:11-15,108-118`; `realtime-identity-server.ts:41-55` |

**Raw-vs-hash verdict (load-bearing):** the URL invite token is a **raw bearer presented to a public route**, but the server **never compares it raw** — it is **peppered-SHA-256-hashed** (`v1:sha256(pepper:token)`) before any DB lookup. The bridge cookie carries only the hash, HMAC-signed. The session cookie is Better-Auth-managed and DB-backed. The token hint is a forensics-only truncation, not a credential. **The hardening preserves all of this** (SEC-03/06 non-regression). The one new credential-adjacent surface is the `revoked_reason` audit field (optional text, manager-provided, no secret value).

**Implication for the hardening:** no change may log, render, beacon, or persist the raw token. The revoke audit event (`collaboration_invite_revoked`) carries `revoked_reason` (manager text) + invitation metadata — no raw token, no `token_hash` beyond what existing audit events already store.

## 2. Attack Surface Inventory (invite entry points)

Directive columns: `Entry point | Actor | Authn/authz & ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`.

| Entry point | Actor | Authn/authz + ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `GET /invite/[token]` (RSC) | Anonymous public | `PROJECT_INVITE_ENTRY_ENABLED` + pepper gate; token regex `^[A-Za-z0-9_-]{32,256}$`; state machine | token shape | InviteResolutionRow (sanitized; revoked → nulled) | `no-store` (proxy `/invite`); `Referrer-Policy: no-referrer`; CSP Report-Only | `collaboration_invite_resolve` 30/60s | `project-invite-entry-route.test.ts`; denial |
| `POST /invite/[token]/accept` | **Authenticated** | `getCurrentUserContext`; **`isAllowedInviteOrigin` (SEC-01 tightens)**; invited_email match; RPC membership mutation | token+session+form display ctx | redirect `/workshop?invite=accepted` (no cred cookie) | redirect headers; `no-store` | `collaboration_invite_accept` 5/60s (IP+userId+tokenHash) | accept happy+wrong-account+already-used; **origin denial (SEC-01)** |
| `GET/POST /invite/[token]/continue` | Anonymous (pre-auth) | **`isAllowedInviteOrigin` (SEC-02 new)** + rate-limit | token | sets `archestimator_pending_invite` (hash-only HMAC) cookie; redirect to login | cookie; `no-store` | `collaboration_invite_continue` 10/60s | **origin denial (SEC-02)**; bridge TTL/tamper |
| `POST /invite/[token]/sign-out` | Authenticated | **`isAllowedInviteOrigin` (SEC-01)**; Better Auth sign-out; **full cookie attrs (SEC-04)** | — | redirect to `/invite/[token]` | clears both session cookie variants (full attrs post-SEC-04) | — | sign-out; **origin denial; cookie attrs (SEC-04)** |
| `GET /workshop/pending-invite` | Authenticated (proxy-gated) | session via proxy; reads bridge cookie | cookie | HTML interstitial + redirect; banner state | `no-store`; `Referrer-Policy: no-referrer` | — | `workshop-pending-invite.test.tsx` |
| `acceptPendingInvitationById` (Server Action) | Authenticated | `requireAuth`; invitationId UUID | UUID | redirect `/workshop?invite=...` | revalidatePath | — | `workshop-pending-invite.test.tsx` |
| `signOutForPendingInvite` (Server Action) | Authenticated | session; **full cookie attrs (SEC-04)** | — | redirect `/login` | clears session cookies | — | `workshop-pending-invite.test.tsx` |
| **`revokeProjectInvitation` / `revokeEstimateSheetInvitation` (NEW Server Action, SEC-07)** | Authenticated manager | `assertProjectAccessManager`/`assertEstimateAccessManager`; invitation `workspace_id`/`project_id` scope (SEC-15) | invitationId UUID; revokedReason? | `{ ok } | { ok:false, error }` | revalidatePath | manager-only (low abuse) | **revoke test (new); IDOR denial (SEC-15)** |
| `inviteProjectCollaborator` / `inviteEstimateSheetCollaborator` (Server Action) | Authenticated manager | manager access; `assertAssignableRole` | email normalize, role | invite path / direct grant | revalidatePath | `collaboration_invite_create` 20/hr | `project-collaboration-actions.test.ts` |
| `resendProjectInviteEmail` / `copyProjectInviteLink` (Server Action) | Authenticated manager | manager access; pending+not-expired | invitationId | email/copy | revalidatePath | `collaboration_invite_resend` 5/hr | `project-collaboration-actions.test.ts` |
| `POST /api/internal/collaboration-invitation-proof` | bearer `CRON_SECRET` | CRON_SECRET | harness | proof JSON (**no raw tokens**) | `no-store` | n/a (internal) | proof-script tests |

## 3. Rate-limit posture (per invite surface)

Backing store: D1 `security_rate_limit_events` via `getAiAuditD1Database()`. Keys SHA-256 of `scope \u001f parts`; IP HMAC'd (never raw IP). **Fail-open when flag disabled (SEC-05 gap → DEC-04 fail-closed).**

| Surface | Scope | Limit/window | Key | Proof |
|---|---|---|---|---|
| Invite resolve | `collaboration_invite_resolve` | 30/60s | IP + tokenHash | `invite-entry.ts:257-265` |
| Invite continue | `collaboration_invite_continue` | 10/60s | IP + tokenHash | `:267-275` |
| Invite accept | `collaboration_invite_accept` | 5/60s | IP + userId + tokenHash | `:277-293` |
| Invite create | `collaboration_invite_create` | 20/1h | IP + userId + projectId | `:221-237` |
| Invite resend | `collaboration_invite_resend` | 5/1h | IP + userId + invitationId | `:239-255` |
| Revoke (new) | (manager-only; optional limit) | n/a | — | SEC-07 |

## 4. Security findings that change the plan

- **SEC-01 (confirmed):** origin guard fails open on missing Origin+Referer → DEC-01 deny-on-missing in prod.
- **SEC-02:** continue route has no origin check → DEC-02 add it.
- **SEC-04:** sign-out cookie clear missing attrs → DEC-05.
- **SEC-05:** rate limits fail-open on disabled flag → DEC-04.
- **SEC-07:** no explicit revoke → DEC-03.
- **SEC-09:** pepper reused for realtime → DEC-06.
- **SEC-10:** direct-grant can downgrade → DEC-07.
- **SEC-11:** `auth_trigger` dead enum → OPEN-SEC-01.
- No change to the token/session/cookie cryptographic model. The plan does not weaken any control; it tightens fail-open gaps and adds the missing revoke surface.
