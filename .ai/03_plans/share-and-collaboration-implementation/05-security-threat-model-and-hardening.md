# 05 — Security Threat Model & Hardening

**Date:** 2026-05-30
**Purpose:** Formal threat model for both collaboration invite and shared link systems. Includes attack vectors, controls, rate limiting matrix, token lifecycle, cookie policy, audit event matrix, and acceptance criteria.

---

## Scope

This document covers:
- Collaboration invite tokens (`/invite/[token]`, `collaboration_invitation_tokens`)
- Shared link tokens (`/share/[token]`, `project_publications.token_hash`)
- Recipient tokens (`/share/[token]?recipient=`, `shared_link_recipients.recipient_token_hash`)
- Session cookies (publication-access, shared-link-session, pending-invite bridge)
- All API routes under `/api/share/[token]/*`
- All server actions in `src/lib/collaboration/actions.ts` and `src/lib/publication/actions.ts`

Out of scope:
- Supabase Auth session management (handled by Supabase)
- Workspace/project-level RLS policies (separate audit)
- Database-level encryption at rest (Supabase managed)

---

## Assets to Protect

| Asset | Risk if compromised |
|-------|-------------------|
| Raw invite token (32 bytes, base64url) | Attacker can accept invite in victim's place, gaining workshop access |
| Raw shared-link token (32 bytes, base64url) | Attacker can view confidential estimate data |
| Raw recipient token (32 bytes, base64url) | Attacker can comment/decide as the recipient |
| Password (shared link) | Attacker bypasses password gate |
| Publication access cookie | Attacker accesses password-protected content without knowing password |
| Shared-link session cookie | Attacker can comment/decide as the recipient |
| Pending-invite bridge cookie | Attacker can accept invite as another user |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | All invite tokens become forgeable |
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access; all RLS bypassed |
| Publication token hash/encryption secrets | All shared link tokens become forgeable/decryptable |

---

## Threat Vectors & Controls

### T1: Token Guessing / Brute-Force

**Risk:** Attacker attempts random token values to find valid invite or share links.

**Controls:**
- Tokens are 32 random bytes (256-bit entropy) — cryptographically infeasible to brute-force
- Rate limit token resolution endpoints (see rate limit matrix)
- Rate limit password attempts with progressive lockout (5 attempts → 15-min cooldown) — **already implemented for shared link only**
- Share-link password uses scrypt (slow hash) — already implemented

**Acceptance criteria:**
- [ ] Rate limiting on `/invite/[token]` resolution (IP + token hash)
- [ ] Rate limiting on `/invite/[token]/accept` (IP + authenticated user + token hash)
- [ ] Rate limiting on `/api/share/[token]/password` (IP + token hash) — already implemented ✅
- [ ] Durable rate limiting for password attempts (current: in-memory) — **gap**

### T2: Token Leakage via URL/Logs/Referrer

**Risk:** Raw token exposed in browser history, server logs, analytics, or Referrer header.

**Controls:**
- Raw token in URL only on initial page load; subsequent navigation uses cookie-based auth
- `no-store` cache headers on all share API responses — already implemented ✅
- CSP prevents loading analytics/tracking on `/share/[token]` pages — already implemented ✅
- No raw tokens in audit events or RPC parameters (hashes only)

**Acceptance criteria:**
- [ ] Verify no raw token in any server-side `console.log` or error message
- [ ] Verify `Referrer-Policy: no-referrer-when-downgrade` on all share pages — already implemented ✅
- [ ] Verify `noindex` meta tag or `X-Robots-Tag` on invite and share pages
- [ ] Audit: search codebase for raw token appearing in log statements

### T3: CSRF on Mutation Endpoints

**Risk:** Attacker tricks authenticated user into submitting a form that accepts an invite or posts a comment.

**Controls:**
- Password form: client-generated CSRF token in cookie + custom header — already implemented ✅
- Comment/decision routes: same-origin check via `assertSameOriginPublicPost()` — already implemented ✅
- Accept route: currently accepts GET requests — **gap**

**Acceptance criteria:**
- [ ] `/invite/[token]/accept` must be POST-only; GET must not mutate
- [ ] All mutation endpoints check Origin or use CSRF tokens
- [ ] CSRF token is per-request, not reusable

### T4: Privilege Escalation via Role Manipulation

**Risk:** Inviter assigns a role higher than their own, or invitee tampers with role in the accept flow.

**Controls:**
- `assertAssignableRole()` prevents assigning above actor rank — already implemented ✅
- `accept_collaboration_invitation` RPC uses the invitation's stored role, not client input — already implemented ✅
- Role on acceptance cannot be escalated above the invitation's role — already implemented ✅

**Acceptance criteria:**
- [ ] Verify role escalation blocked: editor cannot invite as admin
- [ ] Verify acceptance uses server-stored role, not client-supplied

### T5: Replay Attacks on Token Acceptance

**Risk:** Valid token is reused after acceptance or revocation.

**Controls:**
- Tokens marked `used_at` on acceptance — already implemented ✅
- RPC checks `used_at IS NOT NULL` — already implemented ✅
- "Already used" state returned by `resolve_collaboration_invitation` — already implemented ✅
- Publication rotation revokes previous publication — already implemented ✅

**Acceptance criteria:**
- [ ] Verify used token cannot be accepted again (returns "already_used")
- [ ] Verify revoked publication returns 404
- [ ] Verify rotated link invalidates old link

### T6: Cookie Theft / Session Hijacking

**Risk:** Attacker steals session/access cookie via XSS or MITM.

**Controls:**
- Publication access cookie: HttpOnly, signed, expiry-bounded — already implemented ✅
- Shared-link session cookie: HttpOnly, signed, 24h expiry — already implemented ✅
- Pending-invite bridge cookie: HttpOnly, HMAC-signed, 30-min expiry — already implemented ✅

**Acceptance criteria:**
- [ ] Verify all auth cookies are HttpOnly
- [ ] Verify all auth cookies are `Secure` in production
- [ ] Verify HMAC signature checked on every cookie read
- [ ] Verify expiry enforced on every cookie read

### T7: Email Spoofing / Unauthorized Invites

**Risk:** Attacker sends fake invite emails or sends invites on behalf of another user.

**Controls:**
- Invite sender is derived from `auth.uid()` server-side — already implemented ✅
- Shared-link email sender resolved from authenticated user context — partially implemented (uses "A team member" placeholder)
- Email originates from verified Resend domain (or Supabase Auth domain)

**Acceptance criteria:**
- [ ] Verify sender identity derived server-side, never from client input
- [ ] Replace "A team member" with real sender display name — **gap**
- [ ] Verify email From address matches verified domain

### T8: Rate Limiting Bypass (In-Memory)

**Risk:** In-memory rate limits reset on server restart. In serverless/distributed deployments, each instance has independent limits.

**Controls:**
- Comment rate limiter: in-memory LRU with TTL — implemented but **not durable**
- Password lockout: in-memory with progressive delay — implemented but **not durable**
- Circuit breaker: in-memory — acceptable (best-effort protection)
- Email circuit breaker: in-memory — acceptable (best-effort protection)

**Acceptance criteria:**
- [ ] Migrate comment rate limiter to durable storage (Redis, Upstash, or Supabase table)
- [ ] Migrate password lockout to durable storage
- [ ] Add cleanup job for expired rate-limit records if using DB
- [ ] Document why circuit breakers can remain in-memory

### T9: Missing Audit Trail

**Risk:** Security incidents (brute-force attempts, privilege escalation) not detected because events aren't recorded.

**Controls:**
- `collaboration_audit_events` table exists but only written by security-definer RPCs — partially implemented
- `shared_link_events` table exists and records opens + password attempts — already implemented ✅
- No audit for: invite resend, invite opened by invitee, role change, removal — **gap**
- No alerting/thresholds for anomalous activity — **gap**

**Acceptance criteria:**
- [ ] Record audit events for all actions listed in audit event matrix (below)
- [ ] Include IP hash, timestamp, user/recipient context
- [ ] Never log raw tokens in audit events
- [ ] Define alerting thresholds for anomaly detection

---

## Rate Limiting Matrix

| Endpoint / Action | Key | Window | Limit | Storage | Status |
|---|---|---|---|---|---|
| `POST /invite/create` (server action) | user_id + project_id | 1 hour | 20 | Durable (TODO) | Not implemented |
| `POST /invite/resend` | user_id + invitation_id | 1 hour | 5 | Durable (TODO) | Not implemented |
| `GET /invite/[token]` (resolve) | IP + token_hash | 1 min | 30 | Durable (TODO) | Not implemented |
| `POST /invite/[token]/accept` | IP + user_id + token_hash | 1 min | 5 | Durable (TODO) | Not implemented |
| `POST /invite/[token]/continue` | IP + token_hash | 1 min | 10 | Durable (TODO) | Not implemented |
| `POST /api/share/[token]/password` | IP + token_hash | 1 min / lifetime | 5/min, 5/15min lockout | Durable (TODO) | In-memory ✅, not durable ❌ |
| `POST /api/share/[token]/comment` | publication_id + recipient_id | 1 min / 1 hour | 5/min, 20/hour | Durable (TODO) | In-memory ✅, not durable ❌ |
| `POST /api/share/[token]/decision` | publication_id + recipient_id | lifetime | 1 (409 on duplicate) | Durable (TODO) | Not rate-limited |
| `POST /api/share/[token]/events` | IP + token_hash | 1 min | 60 | Durable (TODO) | Not implemented |
| `GET /api/share/[token]` (snapshot) | IP + token_hash | 1 min | 60 | Durable (TODO) | Not implemented |
| Recipient email send | user_id + email | 1 hour | 5 per email | Durable (TODO) | Not rate-limited |
| Owner digest email | publication_id | 15 min | 1 | In-memory | Implemented ✅ (acceptable in-memory) |

---

## Token Lifecycle

### Collaboration Invite Token

```
createInviteToken() → raw 32 bytes → hash with pepper → store hash in collaboration_invitation_tokens
  │
  ├─ resolve: hash incoming token → lookup → update last_opened_at
  ├─ accept: hash incoming token → lookup → match JWT email → mark used_at + accepted
  ├─ revoke: set revoked_at on token + invitation
  ├─ expire: expires_at check OR materialize_expired_collaboration_invitations()
  └─ rotate/reissue: revoke existing active tokens → create new token
```

### Shared Link Token

```
createPublicationToken() → raw 32 bytes → base64url → hash with secret → store hash
  │                                              └─ encrypt with AES-256-GCM → store encrypted
  │
  ├─ resolve: hash incoming token → lookup → check status/expiry → load snapshot
  ├─ revoke: set status = "revoked", revoked_at = now()
  ├─ rotate: revoke old → create new token → new hash + encrypted
  └─ expire: expires_at check
```

### Recipient Token

```
createPublicationToken() → raw 32 bytes → base64url → hash with secret → store in shared_link_recipients.recipient_token_hash
  │
  ├─ verify: hash incoming token → lookup → return publication_id + recipient_id
  └─ session: set signed shared_link_session cookie (24h)
```

---

## Cookie Policy

| Cookie | HttpOnly | Secure (prod) | SameSite | Signed/Verified | Max Age |
|--------|----------|---------------|----------|-----------------|---------|
| `publication-access-v1_<hash>` | ✅ Yes | ✅ Yes | Lax | ✅ HMAC + expiry check | 24h |
| `shared_link_session_<token>` | ✅ Yes | ✅ Yes | Lax | ✅ HMAC + context match | 24h |
| `shared_link_session_*_ok` | ❌ No | ✅ Yes | Lax | ❌ Flag only | 24h |
| `archestimator_pending_invite` | ✅ Yes | ✅ Yes | Lax | ✅ HMAC + expiry | 30 min |
| `ae_publication_csrf` | ❌ No | ✅ Yes | Lax | ❌ | 1h |

---

## Audit Event Matrix

### Collaboration Invite Events

| Event | When | Severity | Table | Implemented? |
|-------|------|----------|-------|-------------|
| `collaboration_invite_created` | Invitation row inserted | Info | `collaboration_audit_events` | ❌ (via RPC only, not direct insert by app) |
| `collaboration_invite_email_attempted` | `sendSupabaseInviteEmail()` called | Info | `collaboration_audit_events` | ❌ |
| `collaboration_invite_email_sent` | Email API returned success | Info | `collaboration_audit_events` | ❌ |
| `collaboration_invite_link_copied` | Manager copies invite link | Info | `collaboration_audit_events` | ✅ |
| `collaboration_invite_token_issued` | Token created via RPC | Info | `collaboration_audit_events` | ✅ |
| `collaboration_invite_opened` | Invitee opens invite page | Info | `collaboration_audit_events` | ❌ (last_opened_at set but no audit row) |
| `collaboration_invite_accepted` | Invitee accepts via RPC | High | `collaboration_audit_events` | ✅ |
| `collaboration_invite_wrong_account` | Wrong email attempts accept | Medium | `collaboration_audit_events` | ✅ |
| `collaboration_invite_replay_blocked` | Used token replayed | High | `collaboration_audit_events` | ✅ |
| `collaboration_invite_expired` | Invitation expired | Info | `collaboration_audit_events` | ❌ (state change by RPC but no audit row) |
| `collaboration_invite_revoked` | Manager revokes | Medium | `collaboration_audit_events` | ✅ |
| `collaboration_role_changed` | Role updated by manager | Medium | `collaboration_audit_events` | ❌ |
| `collaboration_member_removed` | Member removed by manager | Medium | `collaboration_audit_events` | ❌ |

### Shared Link Events

| Event | When | Severity | Table | Implemented? |
|-------|------|----------|-------|-------------|
| `shared_link_created` | Publication row inserted | Info | `shared_link_events` | ❌ |
| `shared_link_republished` | Snapshot updated | Info | `shared_link_events` | ❌ |
| `shared_link_rotated` | New token generated, old revoked | Medium | `shared_link_events` | ❌ |
| `shared_link_revoked` | Publication revoked | Medium | `shared_link_events` | ❌ |
| `shared_link_opened` | Recipient opens link | Info | `shared_link_events` | ✅ |
| `shared_link_password_failed` | Wrong password submitted | Medium | `shared_link_events` | ❌ (recorded as `password_attempt` but not distinguished) |
| `shared_link_password_unlocked` | Correct password submitted | Info | `shared_link_events` | ❌ |
| `shared_link_comment_created` | Recipient posts comment | Info | `shared_link_events` | ✅ (via `shared_link_comments` table) |
| `shared_link_decision_submitted` | Recipient submits decision | High | `shared_link_events` | ✅ (via `shared_link_responses` table) |
| `shared_link_email_sent` | Email dispatched via Resend | Info | `shared_link_events` | ❌ |
| `shared_link_email_bounced` | Email bounced (webhook) | Medium | `shared_link_events` | ❌ |

---

## Configuration Fail-Closed Behaviour

When configuration is missing or invalid:

| Missing Config | System Behaviour (Required) | Current Behaviour |
|---------------|---------------------------|-------------------|
| `PROJECT_INVITE_ENTRY_ENABLED !== "true"` | Disable `/invite/[token]` routes; inform inviter link-based invites are unavailable | ✅ Correct — routes return "invalid" |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` missing | Same as above; no token generation possible | ✅ Correct — `isProjectInviteEntryEnabled()` returns false |
| `SUPABASE_SERVICE_ROLE_KEY` missing | Throw on any invite action; inform user "invitations unavailable" | ✅ Correct — `createCollaborationAdminClient()` throws |
| Supabase email not configured | Do NOT show "Invite email sent." Show "Invitation created. Copy invite link and share it manually." | ❌ False positive — shows "Invite email sent." even when no email delivered |
| `RESEND_API_KEY` missing | Fall back to mocked success; log warning; no email sent | ✅ Correct — returns `{ ok: true, mocked: true }` |
| `NEXT_PUBLIC_SUPABASE_URL` missing | Throw on any DB operation | ✅ Correct — client creation throws |

---

## Security-Specific Acceptance Criteria

### AC-SEC-01: Token Entropy
- [ ] All tokens generated with `randomBytes(32)` (256-bit)
- [ ] Token encoded as base64url, never hex or UUID
- [ ] No predictable patterns in token generation

### AC-SEC-02: Token Storage
- [ ] Only HMAC-SHA256 hash stored for lookup
- [ ] AES-256-GCM encrypted copy stored only where UX requires token recovery
- [ ] Encryption key separate from hashing key
- [ ] Pepper/secrets read from env vars, never hardcoded

### AC-SEC-03: POST-Only Mutations
- [ ] `/invite/[token]/accept` only mutates on POST
- [ ] All comment/decision/event endpoints are POST-only
- [ ] GET requests to mutation endpoints return 405 or render confirmation only

### AC-SEC-04: Rate Limiting
- [ ] All public endpoints rate-limited
- [ ] Password and comment rate limiters durable (survive restart)
- [ ] Rate limit exceeded returns 429 with Retry-After header
- [ ] Rate limit key includes context (IP, user, token) appropriate to endpoint

### AC-SEC-05: Audit Completeness
- [ ] All events in audit event matrix recorded
- [ ] Audit events include actor context (user_id or recipient_id)
- [ ] No raw tokens in audit event metadata
- [ ] Audit tables not writable by browser roles (security definer only)

### AC-SEC-06: Fail-Closed
- [ ] Missing env var → feature disabled, not silently weakened
- [ ] Missing email config → messaging reflects uncertainty
- [ ] Missing pepper → token generation disabled, not using weak hash
