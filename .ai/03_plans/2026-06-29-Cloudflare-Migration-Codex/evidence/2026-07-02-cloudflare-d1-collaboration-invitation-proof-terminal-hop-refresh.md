# Cloudflare D1 Collaboration Invitation Proof

Generated: 2026-07-01T21:58:27.522Z

Local-only D1 collaboration-invitation domain proof. It uses sanitized temporary SQLite tables to model token issue/revoke-existing, delivery audit, invite resolution, revoked/expired/used terminal states, wrong-account denial, token and by-id acceptance, replay handling, rollback, idempotency, query-budget, index-plan, and export/restore behavior. It does not read env files, call provider APIs, create hosted D1 databases, deploy Workers, replace Supabase-backed live invitation routes/actions, change DNS, bill, or make production D1/Auth/Realtime ready.

## Summary

| Gate | Ready |
| --- | --- |
| Schema ready | yes |
| Token issue ready | yes |
| Delivery audit ready | yes |
| Resolve state ready | yes |
| Resolve audit ready | yes |
| Accept by token ready | yes |
| Accept by id ready | yes |
| Wrong account denied | yes |
| Replay denied | yes |
| Revoked terminal nulled | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local collaboration-invitation D1 slice ready | yes |
| Production collaboration-invitation D1 ready | no |
| Local-only proof | yes |
| Provider-backed D1 proof | no |

## Affected RPCs

- `issue_collaboration_invitation_token`
- `record_collaboration_invitation_delivery`
- `resolve_collaboration_invitation`
- `accept_collaboration_invitation`
- `accept_collaboration_invitation_by_id`
- `accept_collaboration_invitation_for_actor`
- `accept_collaboration_invitation_by_id_for_actor`

## Local Fixture

| Item | Value |
| --- | ---: |
| SQLite version | 3.54.0 |
| Fixture tables | 9 |
| Seed rows | 21 |
| Issued token rows | 1 |
| Active tokens after issue | 1 |
| Revoked existing token rows | 1 |
| Token issue audit rows | 1 |
| Duplicate token retry rows | 0 |
| Delivery audit rows | 1 |
| Duplicate delivery audit rows | 0 |
| Resolve active state | active |
| Resolve invalid state | invalid |
| Resolve revoked state | revoked |
| Resolve revoked project id | (null) |
| Resolve expired state | expired |
| Resolve already-used state | already_member |
| Resolve open audit rows | 1 |
| Active token opened rows | 1 |
| Active invitation opened rows | 1 |
| Accept by token state | accepted |
| Accept by token replay state | already_member |
| Accept by token membership rows | 1 |
| Wrong account state | wrong_account |
| Wrong account membership rows | 0 |
| Wrong account audit rows | 1 |
| Already-used different-user state | already_used |
| Replay blocked audit rows | 1 |
| Accept by id state | accepted |
| Accept by id replay state | already_member |
| Accept by id membership rows | 1 |
| Duplicate accept audit rows | 0 |
| Rollback command failed | yes |
| Rollback residue rows | 0 |
| Restored invitation rows | 6 |
| Restored token rows | 7 |
| Restored audit rows | 7 |
| Temp artifacts removed | yes |

## Query Proof

| Surface | Queries | Local p95 | Rows | Status | Notes |
| --- | ---: | ---: | ---: | --- | --- |
| resolve_collaboration_invitation_token_lookup | 1/2 | 5.96ms/100ms | 0 | local-pass | Token resolution stays as one indexed token-hash lookup plus invitation join before the open audit write. |
| issue_collaboration_invitation_active_token_guard | 1/2 | 8.41ms/100ms | 0 | local-pass | Active-token uniqueness is enforced by a partial unique index and queried directly by invitation id. |
| list_pending_collaboration_invitations_for_account | 1/2 | 7.26ms/100ms | 3 | local-pass | Pending-invite account lookup uses the email/lifecycle/created-at index and stays explicit in the D1 repository. |
| accept_collaboration_invitation_membership_guard | 1/2 | 8.44ms/100ms | 1 | local-pass | Accept replay checks natural membership uniqueness before reporting already_member without duplicate side effects. |

## Index Plans

- |--SEARCH t USING INDEX sqlite_autoindex_collaboration_invitation_tokens_2 (token_hash=?)
- `--SEARCH i USING COVERING INDEX sqlite_autoindex_collaboration_invitations_1 (id=?)
- `--SEARCH collaboration_invitation_tokens USING INDEX idx_collaboration_invitation_tokens_active_by_invitation (invitation_id=?)
- `--SEARCH collaboration_invitations USING INDEX idx_collaboration_invitations_email_lifecycle (email=? AND lifecycle_state=?)
- `--SEARCH project_members USING INDEX sqlite_autoindex_project_members_1 (project_id=? AND user_id=?)

## D1 Rewrite Strategy

Typed D1 repository return models should mirror the current invitation terminal-state union while SQLite CHECK constraints enforce lifecycle, scope, role, and token uniqueness until a broader D1 type-generation strategy lands.

- `UPDATE collaboration_invitation_tokens SET revoked_at = ?, revoked_by = ? WHERE invitation_id = ? AND used_at IS NULL AND revoked_at IS NULL`
- `INSERT INTO collaboration_invitation_tokens (...) SELECT ... FROM collaboration_invitations JOIN project_members ... ON CONFLICT(token_hash) DO NOTHING`
- `SELECT ... FROM collaboration_invitation_tokens JOIN collaboration_invitations WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL`
- `INSERT INTO project_members (...) SELECT ... ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role`
- `UPDATE collaboration_invitations SET lifecycle_state = ?, accepted_at = COALESCE(accepted_at, ?), accepted_via = COALESCE(accepted_via, ?), invited_user_id = COALESCE(invited_user_id, ?) WHERE id = ?`
- `INSERT INTO collaboration_audit_events (...) SELECT ... ON CONFLICT(invitation_id, event_type, actor_user_id, metadata_json) DO NOTHING`

## Sources

- src/app/invite/[token]/page.tsx
- src/app/invite/[token]/accept/route.ts
- src/lib/collaboration/actions.ts
- src/lib/collaboration/pending-invite-actions.ts
- src/lib/collaboration/workshop-pending-invite.ts
- supabase/migrations/20260527115342_project_invite_entry_tokens.sql
- supabase/migrations/20260531164227_collaboration_invitation_accept_by_id.sql
- supabase/migrations/20260603195154_harden_revoked_invite_resolution.sql

## Production Proof Requirements

- Implement the collaboration-invitation D1 repository against a real Cloudflare D1 binding with prepared statements and typed terminal-state models.
- Wire the repository behind invite entry pages/actions only after Better Auth identity handoff and app-layer authorization are production-proven.
- Run token issue, delivery, resolve, wrong-account, revoked, expired, replay, accept-by-token, accept-by-id, rollback, and idempotency tests inside the Worker runtime.
- Capture hosted Worker+D1 query count, p95 duration, rows read/written, and failure telemetry for invite entry GET/POST and pending-invite acceptance paths.
- Run a provider-backed D1 export/restore rehearsal for invitation tokens, memberships, and audit rows before treating D1 as the source of truth.

## Blockers

- Hosted Worker+D1 collaboration-invitation proof is still missing.
- Better Auth production identity handoff is still missing; keep current Supabase-backed invitation routes/actions live.
