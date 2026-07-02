# 08 — Security, Privacy, and Threat Model

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated` (original 2026-07-01 authoring) + `lead-authored-fallback` (2026-07-01 re-verification: dispatched L2 explore lane timed out at 30-min inactivity; lead sampled 6 Server Action files + the centralized D1 authz module + the error-envelope wrapper directly — taxonomy PROVEN for sampled rows, 6 Action verdicts upgraded from TBD to PREVIEW-PASS, existing d1-access + withActionErrors infrastructure noted).

## Trust boundaries and actors

| Trust boundary | Actors on each side | Boundary mechanism |
|---|---|---|
| Public Internet ↔ Cloudflare edge | Anonymous browser; potential attacker | DNS, TLS, WAF (when configured), DMARC |
| Cloudflare edge ↔ Worker | Anonymous → Worker context | Worker runtime isolation |
| Worker ↔ OpenNext / Next.js | Worker context → Next.js handler | Same-Worker; no separation needed |
| Next.js ↔ Better Auth | Next.js handler → Better Auth instance | Same-Worker; Better Auth session cookie boundary |
| Better Auth ↔ D1 | Better Auth adapter → D1 | D1 only-from-Worker; app code respects scoping |
| Next.js / Server Action ↔ D1 | App mutation path → D1 prepared statement | D1 only-from-Worker; app code MUST scope by `workspace_id`/`owner_id` (no native RLS) |
| Next.js ↔ R2 | Direct-upload mint → R2 signed URL → client PUT/GET | signed URL TTL + workspace-prefixed object key |
| Worker ↔ DO (CollaborationRoom) | WS request → DO class | WS ticket signed by session-bound path |
| Worker ↔ Queue | Producer → Queue → Consumer | Cloudflare Queue binding isolation; batch + retry + DLQ |
| Worker ↔ Email (SendEmail) | Server Action → EMAIL binding | binding isolation; server-side auth |
| Worker ↔ Images | Image route handler → IMAGES binding | binding isolation |

Actors:

- **Anonymous user** (unauthenticated browser) — may access public pages, share view, share password, public health, OAuth callback, auth catch-all sign-in.
- **Authenticated user** (Better Auth session) — may invoke any Server Action or authenticated Route Handler; must additionally own the resource (project, estimate, library item, publication, invite).
- **Closed-beta admin** — additional admin-level actions (allowlist management) — `src/lib/auth/beta-allowlist-admin-actions.ts`.
- **Cron/Queue internal caller** — Worker-internal only; must present `CRON_SECRET` / `UPLOAD_*_JOB_SECRET` to invoke `/api/internal/*`.
- **Service-role / Worker runtime** — used inside Worker for privileged operations (e.g., audit-trail inserts that need to span rows); powerful but bounded inside the Worker.

## Threat model (per surface)

| Surface | Threat | Actor | Vector | Mitigation preview |
|---|---|---|---|---|
| D1 unscoped prepared statement | Tenant bypass (read/write cross-workspace) | Authenticated user with another workspace's ID | Submit a request directly with another workspace's project ID; if the prepared statement doesn't `WHERE workspace_id = ?`, the mutation succeeds | P0: centralize access layer + verify every path (REQ-SEC-001) |
| Server Action without auth/ownership | Mutation by anonymous or non-owner | Anonymous or other-workspace authenticated user | POST directly to the Server Action URL | P0: per-action verdict table (REQ-SEC-002) |
| Server Action without idempotency | Duplicate mutation on double-submit | Authenticated user | Submit the same form twice (network jitter, double-click) | P0: idempotency key OR conditional update (REQ-API-004) |
| Credential-material collapse (one "token" concept) | Token reuse across surfaces | Attacker with one token | If a share-token is mistakenly treated as an invite-ticket, replay attack succeeds | P0: distinct types, lifecycle, and visibility rules per material (REQ-SEC-003) |
| Share token enumeration | Anonymous attacker brute-forces tokens | Anonymous | Iterate short tokens rapidly | P0: rate limit per IP + token + hashing secret at rest (REQ-SEC-003 + REQ-SEC-006) |
| Share token fetched via partial ID (timing-safe compare) | Timing attack on hash compare | Anonymous | Measure response time across guesses to deduce stored hash | Use constant-time compare (audit verifies) |
| Public share view leaks PII when password not set | Anonymous viewer | Open URL | View snapshot without password | enforce password gate for sensitive fields; redact PII in publication snapshot |
| Direct upload mint returns cross-workspace signed URL | Authenticated user | Submit another user's object ID | Mint endpoint mints URL authorizing wrong object | Mint MUST (a) verify caller's workspace, (b) workspace-prefix object key (REQ-API-009) |
| DO WS ticket minted anonymously | Anonymous | Open WS upgrade URL | Connect without auth | Ticket minted only after Better Auth session validation (REQ-SEC-010); one-shot |
| DO WS message injection | Authenticated attacker | Open WS | Send oversized or malformed WS frames | Per-session rate limit + message schema validation (P1) |
| Internal `/api/internal/*` invoked externally | Anonymous attacker | PIR drive on /api/internal/upload-cleanup | Invoke internal route without `CRON_SECRET` | P0: secret-gate; reject unauthenticated (REQ-API-007) |
| Cron overlap | Cloudflare Cron runtime | Cron trigger overlaps previous run | State corruption if cleanup removes wrong half | App-level overlap guard (REQ-PERF-004) |
| Queue at-least-once duplicate | Cloudflare Queue runtime | Duplicate delivery | Same mutation applied twice | P0: dedup key per message body (REQ-REL-001) |
| DLQ silent | Cloudflare Queue runtime | After max_retries | Stuck uploads; users don't get confirmation | P1: DLQ alert (REQ-REL-002) |
| Email bounce / DMARC | Recipient MTA | Bounce-back email | DMARC `p=none` observed publicly | P2: tighten to `p=reject` when ready (`OPEN-006`) |
| Email recipient rate-limit | Authenticated user | Send many invites rapidly | Spam risk | Per-recipient rate limit |
| Email PII in subject | Authenticated user | Subject line includes workspace name | Disclosure of internal name | Validate subject template |
| AI feature flag bypass | Anonymous or authenticated | POST /api/ai/* when feature flag off | Call AI logic anyway | Server-side feature flag check (REQ-AI-002) |
| AI outbound SSRF | Authenticated attacker | Crafted prompt to fetch internal URL | Outbound to internal network | Allowlist + private-IP block (REQ-SEC-009) |
| AI prompt injection | Authenticated attacker | Adversarial prompt | Prompt injection manipulating AI into returning private data | Use audit log to D1 (REQ-AI-001); don't trust AI output for system actions |
| Google Maps SSRF | Authenticated attacker | Crafted location action to fetch internal URL | Outbound to internal network | Allowlist + private-IP block (REQ-SEC-009) |
| Better Auth trusted-origins wildcard | Attacker with arbitrary origin | CSRF on state-changing requests | POST from arbitrary origin with valid session cookie | P0: exact-match list parsing of `BETTER_AUTH_TRUSTED_ORIGINS` (REQ-SEC-007) |
| Better Auth ratelimiter on KV (eventual consistency) | Anonymous attacker | Brute-force sign-in | KV race window allows bursts | P1: use D1 storage adapter for ratelimiter (REQ-SEC-008) |
| Better Auth secret rotation | Long-lived secret | Compromise | … | Document rotation procedure |
| Server Action `throw new Error(...)` leaking path | Authenticated user | Trigger error path | Stack trace or internal path in error message | P1: error-envelope native (REQ-SEC-005) |
| R2 object key enumerates workspaces | Anonymous or authenticated | List bucket | Object-key prefix reveals workspace IDs | P1: opaque keys or workspace-key mapping table (REQ-SEC-012) |
| NEXT_PUBLIC_ secret leak | Any | Read env in client bundle | Build-time leak | P0: grep + bundle analysis (REQ-SEC-004) |
| Migration drift leaves secret in env file | Developer | Commit `.env` to git | Persistent secret in repo | P0: secret scan pre-commit |
| Race condition on optimistic UI rollback | Client | Two tabs edit same row | Last-writer-wins or 409 | Server Action returns canonical post-mutation DTO |

## Credential material taxonomy (full, per REQ-SEC-003)

| # | Material | Marker | Created by | Stored in | Read by | Client-visible? | Used in URL / cookie / session? | Rotation | Revocation | Proof source | Distinct from |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Better Auth session cookie | encrypted (BETTER_AUTH_SECRET-signed) | Better Auth `signIn` | cookie + D1 `session` table | Better Auth middleware | yes (HttpOnly) | cookie | session rotation on re-auth | sign-out deletes row + clears cookie | `src/lib/auth/session.ts` | OAuth state (C2), CSRF (C11) |
| C2 | OAuth state | derived (random) | Better Auth OAuth init | short-lived cookie + URL param | OAuth callback | yes (one-shot in URL) | URL + cookie | one-shot, consumed by callback | one-shot | `src/lib/auth/better-auth-cloudflare.ts` | session cookie (C1), magic-link (C3) |
| C3 | Magic-link token | raw (URL) + hash (D1) | Better Auth magic-link send | URL (one-shot) + D1 `verification` table (hash) | better-auth server on click | yes (one-shot URL) | URL | single-use, expiry-bound | consume-on-click | Better Auth docs | OAuth state (C2) |
| C4 | Share token (raw) | encrypted-at-rest (PUBLICATION_TOKEN_ENCRYPTION_SECRET) | `src/lib/publication/actions.ts` `createShare` | URL (raw) + D1 (encrypted) | share route handler at lookup | yes (raw URL) | URL | revoke = delete row | delete row | SRC-001 + migration 0014 | invite (C6), WS ticket (C9) |
| C5 | Share token (hash) | hash (PUBLICATION_TOKEN_HASH_SECRET) | same | D1 `project_publications.token_hash` | share route handler | no | lookup index | tied to raw | tied to raw | SRC-001 | C4 |
| C6 | Invite token (raw) | **hash (SHA-256 + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`); raw NOT recoverable** — patched 2026-07-02 by independent reviewer (ADV-P1-1); was "encrypted-at-rest" which was contradicted by `src/lib/collaboration/invite-entry.ts:54-64` | `src/lib/collaboration/actions.ts` `createInvite` | URL (raw, one-shot) + D1 (`tokenHash` only — hash with pepper) | invite route handler at lookup | yes (raw URL) | URL | revoke = delete row | delete row | migration 0007 + `invite-entry.ts:54-64` | share (C4) |
| C7 | Invite token (hash) | hash | same | D1 `collaboration_invitations.token_hash` | invite route handler | no | lookup index | tied to raw | tied to raw | migration 0007 | C6 |
| C8 | Share access cookie | session-signed (PUBLICATION_ACCESS_COOKIE_SECRET) | share session route | cookie | share routes after password | yes (HttpOnly) | cookie | tied to share session | tied to share revoke | SRC-001 | session cookie (C1) |
| C9 | WebSocket ticket | signed short-lived | DO upgrade route mint | URL/header (one-shot) | DO upgrade handler | yes (URL/header) | URL | one-shot; per-session rate limited | session logout | SRC-012 | share (C4) |
| C10 | R2 signed URL | R2-TTL-bounded | direct-upload mint | URL (TTL-bounded) | R2 service + client | yes (URL) | URL | TTL + revoke via re-mint | TTL expiry + revoke endpoint | SRC-007 of `03_*.md` | share (C4) |
| C11 | Better Auth CSRF token | session-derived | Better Auth internal | cookie (HttpOnly) | state-changing server requests | yes (HttpOnly) | cookie | rotated per session | tied to session | Better Auth docs | OAuth state (C2) |
| C12 | Better Auth `secret` | server-only | operator | Worker secret (`BETTER_AUTH_SECRET`) | Better Auth server | no | secret binding | documented rotation | re-deploy with new secret | cloudflare-env.d.ts | all session-share secrets |

> **Audit observation (CR-001)**: The taxonomy table is the audit's CONTRACT. Distinct materials MUST NEVER be collapsed into a single "token" concept. Code generation patterns that produce a generic `string` typed as `Token` for multiple of these surfaces are a P0 finding.

> **Audit observation (CR-002)**: The audit MUST verify C4 (share raw) is stored encrypted at rest using `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, NOT just hashed. The hash (C5) is used for lookup; the encrypted form is recoverable when needed (e.g., re-display after revoke gesture that requires raw to verify). Confirm the encryption secret is never readable from client code (REQ-SEC-004).
>
> **CR-002 scope narrowing (2026-07-02 independent reviewer, ADV-P1-1)**: CR-002 applies ONLY to C4 (publication/share token). C6 (invite token) was previously lumped into CR-002's "encrypted-at-rest" claim — that was a taxonomy error. Actual `invite-entry.ts:54-64` uses SHA-256 hash with `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` (raw NOT recoverable), which is a reasonable posture for one-shot invite tokens but is NOT encryption. Do NOT bundle C4 and C6 remediation in Phase 5.

> **Audit observation (CR-003)**: The audit MUST verify C9 (WS ticket) mint surface. The ticket MUST be (a) signed short-lived, (b) tied to Better Auth session, (c) one-shot use, (d) rate-limited per session. Anonymous WS upgrade MUST be rejected.

### Reviewer update 2026-07-02 (independent-soft pass; see `21_INDEPENDENT_VERIFICATION_RESULT.md`)

| Material | Reviewer verdict | Concrete evidence |
|---|---|---|
| C1 (session cookie) | CONFIRM (line drift) | `src/lib/auth/actions.ts:91-92` — both cookie names present in `clearBetterAuthSessionCookies` |
| C4 (share token raw, encrypted) | CONFIRM + UPGRADE | `src/lib/publication/security.ts:83-89` `encryptPublicationToken` uses `createCipheriv("aes-256-gcm", deriveKey(secret), iv)` + `getAuthTag()` — real authenticated symmetric encryption |
| C6 (invite token raw) | **DOWNGRADE → CONTRADICTED** (ADV-P1-1) | `src/lib/collaboration/invite-entry.ts:54-64` `hashInviteToken` uses `createHash("sha256").update("v1:pepper:token")`. No `encrypt*` function in file. Hash+pepper ≠ encryption. C6 row above patched to reflect this. |
| C9 (WebSocket ticket) | **DOWNGRADE → CONTRADICTED at router + DO class** (ADV-P0-1) | `src/lib/cloudflare/collaboration-room-router.ts:29-42` is pure pass-through. `src/lib/cloudflare/collaboration-room.ts:62-77` DO `fetch` handler checks only `upgrade: websocket` header. **No session validation, no ticket verification, no origin check at either layer.** Anyone who can guess or learn a room name can connect. |

**ADV-P0-1 (WebSocket auth bypass) — added to threat model:**

| Surface | Threat | Actor | Vector | Mitigation preview |
|---|---|---|---|---|
| `routeCollaborationRoomRequest` + `CollaborationRoom` DO | **Cross-tenant WS connection — anonymous attacker passive-listens on collaboration sessions** (presence, cursors, broadcast payload) | Anonymous | Connect to `/__cloudflare/collaboration-room/[roomName]` with `upgrade: websocket` header; room name regex `^[a-zA-Z0-9:_-]{3,200}$` allows short predictable names | P0: BUILD a signed-ticket mint surface (HMAC with `BETTER_AUTH_SECRET` or `COLLAB_ROOM_TICKET_SECRET`, session-bound, ≤60s TTL, one-shot), verify in router BEFORE DO forwarding. Reject anonymous upgrades with 401. This is a Phase 5 remediation priority — the ticket surface does NOT currently exist; it must be built, not just verified. |

**Reviewer-scoped residual risk** (not closed by this pass):

- The audit's original threat-model row claiming tickets are minted at the router (`08_*.md` line 43-44) is FALSE at both inspected layers. The `webSocketMessage` rate-limit behavior (`collaboration-room.ts:79`) was not inspected by this pass — a follow-up reviewer should confirm whether message-flood protection exists once the upgrade gate is built.
- ADV-P1-2 (undeclared invite pepper secret) recorded in `03_*.md` as SRC-023 — pending declaration in `cloudflare-env.d.ts` + `wrangler.jsonc`.
- ADV-P2-1 / ADV-P2-2 (citation drift on `routeCanonicalHostRedirect` line 125→141 and C1 cookie lines 85-86→91-92) re-anchored 2026-07-02 iteration-13 in `03_*.md` (SRC-020) and this doc (C1 row + Action source-row cookie-clearing lines below).

**Existing infrastructure** (unchanged from iteration-9 note — reconfirmed by reviewer):

- `src/lib/authz/d1-access.ts` (306 lines) — central D1 authz layer EXISTS. `readProjectInWorkspaceFromD1` at lines 45-58 explicitly scopes `WHERE id = ? AND workspace_id = ?`. Reviewer confirms the iteration-9 reframing of RISK-001 from "build" to "extend adoption" is correct.
- `src/lib/observability/with-action-errors.ts` — `ActionResult<T>` envelope wrapper EXISTS. Reviewer did not re-inspect.

### Verification update 2026-07-01 (lead-authored-fallback, L2 lane timed out)

Sampled 6/30 Server Action files + the centralized D1 authz module + the error-envelope wrapper directly. Findings:

**Credential material taxonomy — evidence upgrade for sampled materials:**

| Material | Verification status | Concrete evidence |
|---|---|---|
| C1 (session cookie) | PROVEN | Cookie names `better-auth.session_token` + `__Secure-better-auth.session_token` confirmed at `src/lib/auth/actions.ts:91-92` (`clearBetterAuthSessionCookies`) |
| C4 (share token raw, encrypted) | PROVEN | `encryptPublicationToken` imported from `@/lib/publication/security` at `src/lib/publication/actions.ts:14-15`; `PUBLICATION_TOKEN_ENCRYPTION_SECRET` consumed via `readPublicationTokenEncryptionSecret()` |
| C5 (share token hash) | PROVEN | `hashPublicationToken` distinct function imported at `src/lib/publication/actions.ts:18`; `PUBLICATION_TOKEN_HASH_SECRET` consumed via `readPublicationTokenHashSecret()` |
| C6 (invite token raw) | PARTIAL — token creation + expiry confirmed; encryption-at-rest NOT yet verified | `createInviteToken` imported at `src/lib/collaboration/actions.ts:13`; `INVITE_EXPIRATION_DAYS = 14` set at `src/lib/collaboration/actions.ts:93`. **CR-002 encryption-at-rest claim still requires inspecting `src/lib/collaboration/invite-entry.ts` to confirm `PUBLICATION_TOKEN_ENCRYPTION_SECRET` (or a distinct `INVITE_TOKEN_ENCRYPTION_SECRET`) is used for storage, not just hashing.** |
| C9 (WebSocket ticket) | INCOMPLETE — not in this verification pass | Future remediation Phase 5 must verify the DO WS upgrade mint path |
| C12 (`BETTER_AUTH_SECRET`) | PROVEN at binding level | `BETTER_AUTH_SECRET: string` in `cloudflare-env.d.ts:29`; rotation procedure still TBD |

**Existing infrastructure discovered (reframes remediation scope, does NOT close the risk):**

- `src/lib/authz/d1-access.ts` (306 lines) — central D1 authz layer EXISTS, exports `readProjectInWorkspaceFromD1`, `readEstimateInProjectFromD1`, `readEstimateRowItemInEstimateFromD1`, `canEditEstimateInD1`, `isWorkspaceEditorInD1`, `isWorkspaceMemberInD1`. All prepared statements explicitly scope by `workspace_id = ?` AND `project_id = ?`. **RISK-001 mitigation scope reframes from "build centralized access layer" to "extend adoption to every remaining call site; verify 100% coverage".** This is a smaller remediation than the original Phase 1 implied.
- `src/lib/observability/with-action-errors.ts` (85 lines) — `ActionResult<T>` envelope wrapper EXISTS via `withActionErrors(actionName, fn, opts)`. Returns `actionOk(result)` / `actionFailure(appError)`. Handles `NEXT_REDIRECT` re-throw, has logger injection. **REQ-API-002 remediation scope reframes from "implement error envelope" to "wrap every remaining Action with `withActionErrors`; standardize the error code taxonomy in `app-error.ts`".**
- `src/lib/observability/action-result.ts`, `app-error.ts`, `logger.ts` — full error-contract infrastructure exists alongside the wrapper.

**Per-Action verdict preview — 6 rows upgraded from TBD to PREVIEW-PASS:**

| Action file | Verification verdict | Evidence |
|---|---|---|
| `src/lib/estimates/actions.ts` | PREVIEW-PASS | imports `requireAuth, requireCurrentUserContext` (line 7), `assertEstimateActionRateLimit` (line 8), `getCurrentWorkspaceProject` (line 41) — auth + ownership + rate-limit + workspace scoping present |
| `src/lib/publication/actions.ts` | PREVIEW-PASS | `requireAuth` (line 9), `recordAccountSecurityEvent` (line 8), `withActionErrors` (line 48), `createPublicationAdminD1Client` (line 27), `sendEmail` (line 28) — auth + audit + envelope + scoped D1 client + email |
| `src/lib/collaboration/actions.ts` | PREVIEW-PASS | `requireCurrentUserContext` (line 7), `resolveAuthOrigin` (line 6), `checkInviteCreateRateLimit + checkInviteResendRateLimit` (lines 11-12), role-rank ownership (lines 108-118) |
| `src/lib/projects/actions.ts` | PREVIEW-PASS | `requireAuth, requireCurrentUserContext` (line 6), `getCloudflareD1Database` (line 8), `cleanupStorageTargets` (line 21) — auth + scoped D1 + R2 cleanup on delete |
| `src/lib/component-library/actions.ts` | PREVIEW-PASS | `requireCurrentUserContext` (line 6), `canEditEstimateInD1, isWorkspaceEditorInD1, isWorkspaceMemberInD1` from `@/lib/authz/d1-access` (line 7) — auth + explicit D1 authz layer |
| `src/lib/auth/actions.ts` | PREVIEW-PASS | `requireAuth` (line 15), `recordAccountSecurityEvent` (line 6), `resolveAuthOrigin` (line 12), cookie clearing confirmed (lines 88-93) |

The remaining 24 Action files keep TBD until Phase 2 verification. The 6 sampled rows establish that the SCHEMA in this doc is achievable and the patterns exist in the codebase; full verdict completion is Phase 2 remediation scope.

## Per-Server-Action verdict table (preview)

Each Server Action file gets a verdict row. The full table is built during the future audit's remediation phase; this preview establishes the schema.

| Server Action file | Auth check | Ownership check | Input validator | Idempotency | Error contract | Verdict preview |
|---|---|---|---|---|---|---|
| `src/lib/auth/account-actions.ts` | TBD | TBD (account-scoped) | TBD | TBD | TBD | TBD |
| `src/lib/auth/actions.ts` | TBD (Better Auth internal) | n/a | TBD | rate-limited | TBD | TBD |
| `src/lib/auth/beta-allowlist-admin-actions.ts` | TBD (admin) | TBD (admin) | TBD | TBD | TBD | TBD |
| `src/lib/collaboration/actions.ts` | TBD | TBD (workspace member + invite role) | TBD | TBD (invite dedup) | TBD | TBD — P0 area (email send + token) |
| `src/lib/collaboration/pending-invite-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/collaboration/realtime-identity-actions.ts` | TBD | TBD (session-bound) | TBD | TBD (best-effort) | TBD | TBD |
| `src/lib/collaboration/summary-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/component-library/actions.ts` | TBD | TBD (workspace owner of library) | TBD | TBD | TBD | TBD |
| `src/lib/component-library/template-editor-actions.ts` | TBD | TBD (template owner) | TBD | TBD | TBD | TBD |
| `src/lib/estimate-sheet/user-preferences-actions.ts` | TBD | TBD (per-userprefs) | TBD | TBD | TBD | TBD |
| `src/lib/estimates/actions.ts` | TBD | TBD (`can_edit_project` RPC) | TBD | TBD (optimistic) | TBD | TBD — P0 area (estimate row mutation is the hottest RPC) |
| `src/lib/estimates/express-promotion-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/estimates/subtree-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/favorites/sidebar-favorites-actions.ts` | TBD | TBD (per-user + workspace) | TBD | TBD | TBD | TBD — pre-existing RED area |
| `src/lib/legal/actions.ts` | TBD | TBD (account-scoped) | TBD | TBD | TBD | TBD |
| `src/lib/notifications/actions.ts` | TBD | TBD (per-user) | TBD | TBD | TBD | TBD |
| `src/lib/projects/actions.ts` | TBD | TBD (workspace member) | TBD | TBD | TBD | TBD |
| `src/lib/projects/location-actions.ts` | TBD | TBD (workspace owner of project) | TBD (outbound fetch) | TBD | TBD | TBD — SSRF surface |
| `src/lib/publication/actions.ts` | TBD | TBD (publication owner) | TBD | TBD | TBD | TBD — P0 area (share token + email) |
| `src/lib/publisher/activity-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/publisher/drawer-actions.ts` | TBD | TBD | TBD | TBD | TBD | TBD |
| `src/lib/recipient-proposals/actions.ts` | TBD | TBD (publication recipient) | TBD | TBD | TBD | TBD |
| `src/lib/reusable-sources/actions.ts` | TBD | TBD (workspace) | TBD | TBD | TBD | TBD |
| `src/lib/workshop/actions.ts` | TBD | TBD (workspace) | TBD | TBD | TBD | TBD |
| `src/lib/workshop/beta-feedback-actions.ts` | TBD | TBD (account) | TBD | TBD | TBD | TBD |
| `src/lib/workshop/beta-feedback-review-actions.ts` | TBD (admin) | TBD (admin) | TBD | TBD | TBD | TBD |
| `src/lib/workshop/group-actions.ts` | TBD | TBD (workspace member) | TBD | TBD | TBD | TBD — pre-existing RED area |
| `src/lib/ai/**` (if any "use server" inline) | TBD (feature flag + auth) | TBD | TBD | TBD (rate-limited) | TBD + audit to D1 | TBD — AI surface |

The `TBD` values map to P0/P1 findings during the audit's future remediation phase. The schema is the audit deliverable's CONTRACT.

## Privacy & data minimization

| Data class | Where stored | Minimization rationale | Disposal |
|---|---|---|---|
| API audit logs (auth, mutation, share, invite) | D1 `account_security_events`, `*_audit_sidecars` | Forensic need; bounded retention | TBD retention policy decision (`OPEN-007`) |
| AI audit logs (when AI enabled) | D1 `ai_audit_rate_limits` (migration 0006) | Per-call audit | TBD retention |
| Cursor / presence (PII: display name + cursor color) | Durable Object transient storage | Best-effort; non-durable | cleared on WS close |
| Share snapshot | D1 publication snapshot rows | Recipient access | revoke + delete row |
| Email content (invite, share) | transient (sent, not stored body) | Email content is generated at send time | n/a |
| Upload attachment | R2 | Attachment is the purpose | explicit delete + R2 lifecycle |
| User PIIP (name, email, workspace role) | D1 `profiles`, `account_settings`, workspace member rows | Required for app | account delete flow (TBD) |

## CSP / frame / referrer posture

- Content Security Policy: TBD — verify `next.config.ts` for CSP / Report-Only header
- Frame ancestors: TBD — deny framing on authenticated routes (clickjacking)
- Referrer policy: TBD — `strict-origin-when-cross-origin` recommended
- Download behavior: TBD — confirm attachment download Content-Disposition

## Required fix-forward surface for future remediation

The audit's remediation package (a separate future plan pack) MUST:

1. Centralize D1 access in one repository module (REQ-ARCH-001).
2. Add per-Server-Action verdict table completion (every TBD becomes PASS/WARN/FAIL with file:line evidence).
3. Implement a stable error envelope (`{ok, data, error}`) per Route Handler and Server Action (REQ-API-002, REQ-API-003).
4. Add idempotency keys for every mutation (REQ-API-004).
5. Verify all credential-material types enforced distinct (REQ-SEC-003).
6. Verify internal routes are secret-gated (REQ-API-007).
7. Implement DLQ alert (REQ-REL-002).
8. Tighten DMARC to `p=reject` (`OPEN-006`).
9. Document rotation procedures for `BETTER_AUTH_SECRET`, `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`.
10. Confirm `cf:d1-authz-matrix` and `cf:d1-rpc-map` outputs cover every entry in `07_*.md` matrix.

## Required denial tests (future remediation)

| Test ID | Surface | Denial scenario |
|---|---|---|
| TEST-SEC-001 | Server Action | Anonymous POST returns 401 |
| TEST-SEC-002 | Server Action | Other-workspace authenticated POST returns 403 (or 404 to prevent enumeration) |
| TEST-SEC-003 | Server Action | Missing ownership check is a FAIL of this test |
| TEST-SEC-004 | Direct-upload mint | Cross-workspace signed URL is rejected |
| TEST-SEC-005 | Share view | Expired/invalid token returns 401 with `SHARE_TOKEN_EXPIRED` code |
| TEST-SEC-006 | Share comment | Token enumeration returns same response time / 401 for valid + invalid (constant-time compare) |
| TEST-SEC-007 | Better Auth sign-in | Brute-force is rate-limited per IP/email |
| TEST-SEC-008 | Invite accept | Expired/invalid token returns unified 401 `INVITE_TOKEN_EXPIRED` |
| TEST-SEC-009 | DO WS upgrade | Anonymous upgrade rejected with 401; missing ticket rejected |
| TEST-SEC-010 | Internal route | Anonymous direct hit returns 401; missing secret returns 401; correct secret returns 200 |
| TEST-SEC-011 | AI route | Feature flag off returns 403 |
| TEST-SEC-012 | SSRF | Outbound fetch to private IP range is rejected |