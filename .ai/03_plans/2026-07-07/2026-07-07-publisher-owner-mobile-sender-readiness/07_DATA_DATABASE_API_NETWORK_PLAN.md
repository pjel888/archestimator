# 07 — Data, Database, API, and Network Plan

---

## Database scope

**This pack proposes NO migration, NO schema change, NO new binding, NO `cf:typegen`.** Rationale: the owner-side data needed for sender clarity (delivery metadata, owner message, `responded` status) is owned by the sibling `client-ready-proposal-package-workflow` pack's migration `0037`. This pack **consumes** those columns when landed and **coordinates** the shared repository files. Any D1 change this pack would otherwise need is delegated to that pack to avoid a conflicting migration number.

### Tables audited (read-only; `migrations/0014`, `0006`)

| Table | Why relevant | Change in this pack |
|---|---|---|
| `project_publications` | generate/rotate/revoke backing (`token_hash`, `encrypted_token`, `password_hash`, `status`, partial UNIQUE one-published-per-project) | none |
| `shared_link_recipients` | email/resend/remove backing (`recipient_token_hash`, `delivery_status`, UNIQUE `(publication_id, lower(email))`) | none (honest-label columns → workflow pack `0037`) |
| `project_publication_events` | audit/proof (open/password telemetry; peppered `ip_hash`/`user_agent_hash`) | none |
| `security_rate_limit_events` | resend rate limit backing | none |
| `publication_digest_log` | owner digest audit | none |

### App-authorization (audit; unchanged)
- `assertProjectPublicationManager(projectId)` (`actions.ts:394-441`): `requireCurrentUserContext` → platform `ceo`/`admin` bypass OR `max(workspaceRank, projectRank) ≥ 30`. UI-side `canManagePublisherRosterProject` (`permissions.ts:7`) hides affordances; viewer `clientLinkPath` redacted (`drawer-actions.ts:27-37`).
- **Note (evidence):** the publication flow rolls its own membership probe and does **not** use `src/lib/authz/d1-access.ts`. This pack does not unify them (out of scope; would be a separate refactor).

### Access-path matrix

| Source | Chosen path | Runtime role | Authorization check | Latest schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Roster (owner) | `readWorkspacePublicationsRoster` (RSC) | authenticated owner/editor | `requireCurrentUserContext` + UI `canReadPublisherRosterProject` | `0014` | repo evidence | error boundary |
| Drawer (owner) | `readPublisherPublicationDrawerData` (Server Action) | owner/editor; viewer redacted | `requireAuth` + `canRead/canManage` | `0014` | repo evidence | redaction |
| Generate/rotate/revoke | `actions.ts` mutations | manager (rank ≥ 30) | `assertProjectPublicationManager` | `0014` | repo evidence + tests | error toast |
| Recipient add/resend/remove | `actions.ts` mutations | manager | `assertProjectPublicationManager` + resend rate limit + 50 cap | `0014` | repo evidence + tests | per-recipient `failed` chip |
| Activity/proof (owner) | `loadSharedLinkActivity` | manager (re-resolves from `token_hash`) | `assertProjectPublicationManager` | `0014` | repo evidence | empty state |

No path in this plan reads/writes a source it cannot reach after current D1 migrations + app-authz → no P0 access defect.

## API / network behavior (audit; unchanged contracts)
- Sender actions are Server Actions (POST-equivalent). They already: validate input, enforce authz, handle idempotency (resend rate limit; revoke idempotent), return typed DTOs, and batch-abort on unresolvable link (`addSharedLinkRecipients` `actions.ts:1436-1449`).
- Cloudflare Email send: `sendEmail` → circuit breaker (5min/50%/10min) → `sendCloudflareEmail` → `EMAIL` binding `.send()`. Test env returns `{ok:true, mocked:true}`.
- Rate limits (public surface) are out of scope here (owned by share/activity packs). The **owner-side resend rate limit** (`shared_link_recipient_resend`, 1/5min, `actions.ts:261-262`) is surfaced in REQ-FR-04.

## Credential material taxonomy (audit; no change)

| Material | Type | Created by | Stored in | Read by | Client-visible? | URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Publication token (raw) | raw (32B base64url, 43 chars) | `createPublicationToken` `security.ts:63` | **never stored raw**; rides `/share/<token>` | owner copy via decrypted `encrypted_token` | yes (in copied link) | URL path | rotate → new raw + new hash + new encrypted; old hash gone | `security.test.ts` |
| Publication `token_hash` | HMAC `hmac-sha256-v1` | `hashPublicationToken` | `project_publications.token_hash` UNIQUE | public route SELECT | no | lookup only | overwritten on rotate | repo evidence |
| Publication `encrypted_token` | AES-GCM `aes-256-gcm-v1` | `encryptPublicationToken` | `project_publications.encrypted_token` | `readClientLinkPath` decrypt (owner copy) | no (server-only) | — | overwritten on rotate | repo evidence |
| Recipient token (raw) | raw (32B base64url) | on add/resend | **never stored raw**; rides `?recipient=` | recipient only | yes (in email link) | URL query | resend → new raw + new hash; rotate → hash overwritten `revoked:...` | repo evidence |
| Recipient `recipient_token_hash` | HMAC | on add/resend | `shared_link_recipients.recipient_token_hash` UNIQUE | session route SELECT | no | lookup only | rotate/resend | repo evidence |
| Password | scrypt `scrypt-sha256-v1` | owner set | `password_hash` | `verifyPublicationPassword` constant-time | no | `ae_publication_access_<suffix>` cookie (credentialVersion-bound) | change → invalidates access cookie | repo evidence |
| Session cookie | signed HMAC payload | session route | client cookie `shared_link_session_<suffix>` | public routes | no (HttpOnly) | cookie | rotate/credentialVersion | repo evidence |
| CSRF | cookie + header | public POST | `ae_publication_csrf` + `x-archestimator-csrf` | `assertSameOriginPublicPost` | header yes | cookie+header | per-session | repo evidence |

**No raw token is SELECT-able.** Owner "copy link" reconstructs `/share/<token>` by decrypting `encrypted_token` server-side (`readClientLinkPath`), never by storing raw. This is sound; this pack does not change it.

## Database change blueprint
**Not applicable** — no migration in this pack. (If implementation discovers a need, it must be filed against the workflow pack's `0037` to avoid migration-number collision; see `10`.)

## Provider-proof boundary
- D1: local proof via existing vitest suite (`project-publication-*`, `publisher-*`). Remote D1 proof (migration apply) is the workflow pack's responsibility (`0037`).
- Email: standing Cloudflare mandate covers a real recipient send smoke (workflow pack's external-proof list); this pack's tests assert owner-side surfacing, not delivery.
- No provider mutation in this planning-only task.
