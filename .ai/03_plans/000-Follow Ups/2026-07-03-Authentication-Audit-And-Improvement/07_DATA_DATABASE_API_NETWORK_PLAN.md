# 07 - Data, Database, API, And Network Plan

## Data Stores

| Store | Auth-relevant use | Planning requirement |
|---|---|---|
| D1 `ARCH_DB` | Better Auth tables, profiles, security events, invites, collaboration data, publication/share tables from migrations, and rate-limit/event storage | Scope every query by user/workspace/project/estimate/publication token as applicable; verify applied schema before Phase 2 or Phase 4 edits and plan durable hard-lock state explicitly |
| R2 | Project/component assets | Signed URL and metadata access must be scoped to authorized project/library context |
| Durable Objects | Collaboration/realtime and possible lockout singleton | Persist important state; no security-critical memory-only locks |
| Cookies | Better Auth session, OAuth state, invite bridge, publication access/session/CSRF | HttpOnly/Secure/SameSite policy documented per cookie type |
| Provider secrets | Google, Better Auth, Cloudflare, old provider keys | Bind via platform secrets/env; never store in docs/evidence |

## API Surface Classes

| Class | Examples | Control |
|---|---|---|
| Auth routes | `/api/auth/[...all]`, Google callback | Better Auth handler, dynamic/no-store, state normalization |
| Protected app routes | `/workshop/*` | proxy/session/closed-beta/terms gates |
| Server actions | account, workspace, beta allowlist, publication owner actions | `requireCurrentUserContext` plus object-role checks |
| Invite routes | `/invite/[token]/*` | token hash, account email match, origin posture, rate limit |
| Public share routes | `/share/[token]`, `/api/share/[token]/*` | token/password/session/CSRF/no-store |
| Provider webhooks | email/event hooks if active | signature verification, size cap, replay/timeout handling |

## Authorization Matrix Shape

Every protected mutation/read must be documented as:

| Surface | Actor | Object key | Required authority | Check location | Fail-closed test |
|---|---|---|---|---|---|
| Example | Primary App User | workspaceId/projectId | owner/admin/member/viewer as applicable | server action + repository SQL | denied user gets no data/mutation |

Phase 3 local WP1-WP6 evidence in `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` now records the current filled matrix, role taxonomy, and fail-closed tests. Hosted Worker/D1, Durable Object, browser, and two-client realtime proof remain separate final-readiness gates.

## Network And Cache Rules

- Auth and share-sensitive routes must be dynamic/no-store.
- OAuth callbacks must not be cached.
- Public share pages may render public shell data only through token-scoped reads with no-store when recipient/session state is involved.
- Provider errors must be sanitized before logging or returning.
- Raw tokens in paths are unavoidable for invites/share links; logs, analytics, and evidence must redact those path segments.

## Retention And Deletion Data Classes

| Class | Examples | Default posture |
|---|---|---|
| Account PII | email, display name, profile fields | Minimize, export/delete on DSAR where legally allowed |
| Credential material | session IDs, OAuth state/code, invite/share raw token, peppers | Never log raw; rotate/revoke; shortest useful retention |
| Security audit | event type, hashed IP/UA/email, sanitized metadata | Keep long enough for abuse/security investigations; define exact retention before launch |
| Project commercial data | estimates, proposal/publication contents | Tenant scoped; deletion/export governed by account/project policy |
| Recipient data | shared-link recipient email/session/action | Token/publication scoped; minimize and support unsubscribe/delete workflows |
