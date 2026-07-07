# Data, Database, API, and Network Plan

**Authority boundary:** All database work is inside the bound Cloudflare D1 resource `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`) per `wrangler.jsonc`. Standing owner authorization covers D1 schema/migration/index/RPC changes. No unrelated provider projects touched. No raw token values appear below.

## 1. Current D1 schema (invite-relevant)

From `migrations/0007_collaboration_invitations.sql` + `0013_collaboration_management_sidecars.sql`:

### `collaboration_invitations`
- `id` TEXT PK
- `workspace_id` TEXT FK → `workspaces(id)` ON DELETE CASCADE
- `project_id` TEXT, `estimate_id` TEXT
- `scope` TEXT CHECK `IN ('project','estimate')` default `'project'`; CHECK scope↔estimate_id consistency (`migrations/0007:88-91`)
- `email` TEXT NOT NULL CHECK `email = lower(trim(email))`
- `role` TEXT CHECK `IN ('owner','admin','editor','viewer')` default `'viewer'`
- `invited_by` TEXT, `invited_user_id` TEXT
- `lifecycle_state` TEXT CHECK `IN ('pending','direct_granted_existing_user','accepted_by_recipient','revoked','expired')` default `'pending'`
- `accepted_at`, `direct_granted_at`, `direct_granted_user_id`, `revoked_at`, `last_opened_at`, `expires_at` NOT NULL, `created_at`, `updated_at`
- `accepted_via` TEXT CHECK `IN ('invite_route','pending_invite','auth_trigger','manager_direct_grant')` OR NULL — **`auth_trigger` never written (SEC-11)**

### `collaboration_invitation_tokens`
- `id` TEXT PK
- `invitation_id` TEXT FK CASCADE
- `token_hash` TEXT UNIQUE NOT NULL CHECK `length(trim(token_hash)) > 0`
- `token_hint` TEXT
- `delivery_method` TEXT CHECK `IN ('email','copy_url')`
- `created_by` TEXT NOT NULL
- `created_at`, `expires_at` NOT NULL, `last_opened_at`, `used_at`, `revoked_at`, `revoked_by`

### `collaboration_audit_events`
- `id` TEXT PK
- `invitation_id`, `project_id`, `estimate_id`, `actor_user_id`
- `event_type` TEXT
- `metadata_json` TEXT CHECK `json_valid(metadata_json) AND json_type(metadata_json)='object'`
- `created_at`

### `workspace_members` (from `0013`)
- PK `(workspace_id, user_id)`, FK `workspace_id` CASCADE, role CHECK `owner/admin/member/viewer` default `member`

### `project_members` / `estimate_sheet_members` (from `0007`)
- `project_members` PK `(project_id, user_id)`, role `owner/admin/editor/viewer` default `editor`
- `estimate_sheet_members` PK `(estimate_id, user_id)`, role default `viewer`

### Indexes (relevant)
- `idx_collaboration_invitation_tokens_active_by_invitation` — **partial UNIQUE** on `(invitation_id) WHERE used_at IS NULL AND revoked_at IS NULL` (one active token per invitation).
- `idx_collaboration_invitations_email_project_scope_lifecycle`, `idx_collaboration_invitations_project_lifecycle`, `idx_collaboration_invitations_estimate_lifecycle`, `idx_collaboration_audit_events_invitation_created_at`, `idx_collaboration_audit_events_project_created_at`.

### `security_rate_limit_events` (from `0006`)
- Backs the invite rate limiter. `scope`, `key_hash`, `metadata_json`, `occurred_at`, `expires_at`. TTL cleanup via `deleteExpiredSecurityRateLimitEventsInD1`.

## 2. Database change blueprint (the only schema change in this pack)

Full SQL blueprint in `21_DATABASE_CHANGE_BLUEPRINTS.md`. Summary:

### `0038_collaboration_invitation_revoke_reason.sql` (additive)
- **Change:** `ALTER TABLE collaboration_invitations ADD COLUMN revoked_reason TEXT;` (nullable, default NULL).
- **Purpose:** support SEC-07 audit context (why a manager revoked) — optional but recommended for abuse forensics.
- **Backfill:** none (nullable).
- **Concurrency:** no lock contention (DDL ADD COLUMN on SQLite is metadata-only for nullable columns).
- **Cardinality:** 1 row per revoked invitation; negligible.
- **Rollback:** `ALTER TABLE collaboration_invitations DROP COLUMN revoked_reason;` — **DISCOVERY-REQUIRED** to confirm D1's SQLite version supports DROP COLUMN (3.35.0+). If unsupported, rollback = fix-forward (leave the column; it's harmless).
- **Provider proof:** `bun run cf:d1:read` (or equivalent) against `ARCH_DB` after applying locally; confirm column present.
- **Generated types:** repository row type picks up the new optional field; no `cf:typegen` (no Worker Env change).

### Optional follow-up migration (SEC-11, OPEN-SEC-01-gated)
- If the owner picks "remove `auth_trigger`": a forward-only migration `0038` would rebuild the CHECK constraint without the value. SQLite CHECK changes require table rebuild — heavier; only if the owner confirms removal. **Deferred until OPEN-SEC-01 resolves.**

## 3. Repository / query helpers (target changes)

### `src/lib/collaboration/invitation-d1-store.ts`
- **New:** `revokeInvitationInD1({ invitationId, revokedBy, revokedReason })` — manager-revoke RPC. Sequence: load invitation; if not `pending` return `{ ok:false, reason:'already-terminal' }`; else `UPDATE invitations SET lifecycle_state='revoked', revoked_at=now, revoked_reason=?`, `UPDATE tokens SET revoked_at=now, revoked_by=? WHERE invitation_id=? AND used_at IS NULL AND revoked_at IS NULL`, insert audit. Run inside a D1 batch (existing `db.batch([...])` pattern).
- **Unchanged:** `readInvitationByTokenHash`, `acceptInvitationInD1`, `materializeExpiredInvitations`, `resolveState`, `toResolutionRow` (SEC-03/FR-02/FR-04/FR-05 non-regression).

### `src/lib/collaboration/actions.ts`
- **New:** `revokeProjectInvitation`, `revokeEstimateSheetInvitation` Server Actions wrapping `revokeInvitationInD1` behind `assertProjectAccessManager`/`assertEstimateAccessManager`.
- **Changed (SEC-10):** `upsertProjectMemberInD1`/`upsertEstimateSheetMemberInD1` adopt promotion-only `ON CONFLICT` CASE (match `acceptProjectInvitation`).

### `src/lib/repositories/workspace-repository.ts`
- **Unchanged** for this hardening (invite summary reads already exist; revoke just changes `lifecycle_state`, which the summary already filters on).

## 4. API / network contracts

### Route handlers (target)
| Route | Method | Auth | Body | Success | Error |
|---|---|---|---|---|---|
| `/invite/[token]/accept` | POST | session (authenticated) | form-data (display context) | 303 redirect `/workshop?invite=accepted` | 403 (origin), 429 (rate limit), 303 back to `/invite/<token>` (bad state) |
| `/invite/[token]/continue` | GET, POST | anonymous | none | 303 redirect `/login?next=...` + Set-Cookie | 403 (origin, new), 429, 303 back to invite |
| `/invite/[token]/sign-out` | POST | session | none | 303 redirect `/invite/<token>` + clear session cookies | 403 (origin) |
| `/workshop/pending-invite` | GET | session (proxy-gated) | none | HTML interstitial + redirect | banner state in URL |
| `/api/internal/collaboration-invitation-proof` | GET, POST | bearer `CRON_SECRET` | proof harness | proof JSON (no raw tokens) | 401 |

### Server Actions (target)
| Action | Input | Output |
|---|---|---|
| `acceptPendingInvitationById` | `{ invitationId }` | redirect `/workshop?invite=...` |
| `signOutForPendingInvite` | none | redirect `/login` + clear cookies |
| `revokeProjectInvitation` (NEW) | `{ projectId, invitationId }` | `{ ok: true } | { ok: false, error }` |
| `revokeEstimateSheetInvitation` (NEW) | `{ estimateId, invitationId }` | `{ ok: true } | { ok: false, error }` |

### Idempotency
- `revokeCollaborationInvitation`: idempotent on already-revoked (returns `already-terminal` no-op).
- `acceptInvitationTokenForUser`: idempotent on same-actor (`already_member`).
- `createPendingInviteBridge`: each call mints a fresh cookie (rate-limited).

### Rate limits (unchanged limits; SEC-05 changes fail-mode)
| Scope | Limit/window | Key |
|---|---|---|
| `collaboration_invite_resolve` | 30/60s | IP + tokenHash |
| `collaboration_invite_continue` | 10/60s | IP + tokenHash |
| `collaboration_invite_accept` | 5/60s | IP + userId + tokenHash |
| `collaboration_invite_create` | 20/1h | IP + userId + projectId |
| `collaboration_invite_resend` | 5/1h | IP + userId + invitationId |

## 5. Transaction boundaries and concurrency

- **Revoke:** batched D1 statements (invitations UPDATE + tokens UPDATE + audit INSERT) in a single `db.batch([...])`. D1 batch is atomic per-request. If any statement fails, the batch fails and the invitation stays pending.
- **Accept:** existing batched finalization (token `used_at` + invitation lifecycle + audit). Unchanged.
- **One-active-token invariant:** enforced by the partial UNIQUE index; implicit revoke-on-reissue and explicit revoke both respect it.
- **Concurrency on revoke vs accept:** if a user accepts in the same window a manager revokes, the token `used_at` (set by accept) excludes it from the revoke UPDATE's `WHERE used_at IS NULL` — so revoke won't touch an already-used token. The invitation lifecycle: if accept set `accepted_by_recipient` first, revoke's `WHERE lifecycle_state='pending'` guard returns `already-terminal`. Safe.

## 6. Query count / cost expectations (D1 free-tier)

| Operation | Queries | Notes |
|---|---|---|
| `/invite/[token]` resolve | 3-4 (materialize expired sweep, read, update last_opened, audit) | Unchanged |
| `/invite/[token]/accept` | 5-7 (rate limit record+count, accept read+upsert+finalize+audit) | Unchanged |
| `/invite/[token]/continue` | 2 (rate limit record+count) + cookie set | +0 with origin check (header-only) |
| `/invite/[token]/sign-out` | 0-1 (Better Auth sign-out) | Unchanged |
| `revokeCollaborationInvitation` (NEW) | 3-4 (manager auth read, load invitation, batched update+tokens+audit) | Manager-only, off hot path |

Origin check (SEC-01/02) adds **zero** queries (pure header parse). Rate-limit fail-closed (SEC-05) adds zero queries. All within free-tier daily read/write limits at current volume.

## 7. Data retention and recovery

- **Invitations:** retained indefinitely (lifecycle state tracks pending/accepted/revoked/expired). No retention cron for invitations (only upload + general retention crons exist).
- **Tokens:** retained (hash only) for audit; revoked/used tokens remain for forensics.
- **Audit events:** retained indefinitely (forensic value).
- **Bridge cookie:** 30-min TTL (client-side); never persisted server-side.
- **Recovery:** revoked/expired invitations are not recoverable to `pending` (by design). A manager can re-invite (creates a new invitation).

## 8. Rollback / fix-forward

- **Migration `0038`:** additive; rollback via DROP COLUMN (if D1 supports) or fix-forward (leave column). See blueprint.
- **Revoke action/UI:** revert the action + UI; the migration column is harmless if left.
- **Origin tightening:** revert `invite-origin.ts` + route edits.
- **SEC-09 pepper separation:** restore the fallback in `realtime-identity-server.ts`.
- **SEC-10 promotion-only:** revert the CASE.

## 9. Linked-provider proof boundary

- Local D1 proof: `bun run cf:d1:migrate:local` (or project equivalent) + focused repository test.
- Preview D1 proof: apply migration to preview, run the hosted `collaboration-invitation-proof` harness (`/api/internal/collaboration-invitation-proof` with `CRON_SECRET`) — covers resolve/accept/replay/wrong-account/accept-by-id; **extend to cover revoke** in Phase 3.
- Production: apply migration via `bun run cf:d1:migrate` (or `wrangler d1 migrations apply`); confirm via readback.
