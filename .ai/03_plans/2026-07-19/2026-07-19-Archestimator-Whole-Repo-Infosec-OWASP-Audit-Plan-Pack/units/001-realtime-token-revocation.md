# 001 — Realtime Token Revocation via DO SQLite Denylist + ≤60s TTL

> **Historical provenance only.** `UNIT-001` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Originally proposed to close the only accepted **High**: `SEC-COLLAB-003`.

## unit_id
`UNIT-001`

## title
Realtime token revocation via DO SQLite denylist + ≤60s TTL.

## status
`SUPERSEDED`

## priority
`P0` (launch blocker for realtime collaboration with external users)

## severity_of_findings
High (`SEC-COLLAB-003`)

## effort
Small (~half-day). Single DO class edit + one constant change.

## implementation_risk
`LOW` — DO SQLite storage is already provisioned for `CollaborationRoom` (`wrangler.jsonc:64-67`); revocation list is additive (read on every authorize); TTL shortening has no migration.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED` — no hosted proof needed for the local edit; TEST_PROPOSAL only.

## requirements
`SEC-001`

## findings
`SEC-COLLAB-003`

## existing_plan_links
None. No existing active plan covers this.

## goal
After administrative removal or role downgrade of a collaboration member, that member cannot reconnect to the `CollaborationRoom` Durable Object with their previously-issued HMAC room token. Maximum residual realtime privilege after revocation: ≤60 seconds.

## security_invariants
1. `authorizeSocket` rejects any token whose `claims.sub` is in the DO's revoked-subjects set.
2. Revoked-subject entries expire from the set after `2 × TTL` (so a denylist entry outlives the longest-lived still-valid token).
3. TTL is shortened from 300s to ≤60s to bound worst-case revocation latency even if the denylist write races the reconnect.
4. The denylist write is durable across DO eviction (persists in DO SQLite, not in-memory).

## current_source_evidence
- `src/lib/collaboration/realtime-room-token.ts:1` — `DEFAULT_ROOM_TOKEN_TTL_SECONDS = 300`.
- `src/lib/collaboration/realtime-room-token.ts:158-185` — `verifyRealtimeRoomToken` checks signature + topic + `exp` only.
- `src/lib/cloudflare/collaboration-room.ts:378-427` — `authorizeSocket` calls `verifyRealtimeRoomToken` and topic-binds but does not consult any revocation list.
- `src/lib/cloudflare/collaboration-room.ts:519-538` — `handleControlRequest` for `revoke-subject` iterates open sockets and closes matching ones; does not persist a denylist.
- `src/lib/cloudflare/collaboration-room-revocation.ts:33-74` — `revokeCollaborationRoomSubject` POSTs the revoke command (used by `actions.ts:1622-1624,1682,1824,1913`).
- `wrangler.jsonc:64-67` — DO SQLite storage is provisioned for `CollaborationRoom` (tag `v1`).

## affected_paths_and_resources
- `src/lib/collaboration/realtime-room-token.ts` (constant change).
- `src/lib/cloudflare/collaboration-room.ts` (DO SQLite schema init, denylist read in `authorizeSocket`, denylist write in `handleControlRequest`).
- (No migration file needed — DO SQLite state is managed by the DO class itself, not by `migrations/`.)

## owned_paths
- `src/lib/collaboration/realtime-room-token.ts`
- `src/lib/cloudflare/collaboration-room.ts`

## dependencies
None.

## preconditions
- `CollaborationRoom` DO must have SQLite storage enabled (already true; `wrangler.jsonc:64-67`).
- The DO `migration` tag must include `CollaborationRoom` (already true; no schema change needed for an append-only `revoked_subjects` table created lazily by the DO).

## non_goals
- Single-use tokens (`jti` + spent-jti tracking) — over-engineering for the current threat model. Reuse within the shortened TTL is acceptable.
- Cross-DO global revocation broadcast — not needed; each `CollaborationRoom` instance tracks its own subject space.
- Revoking `GlobalPresence` or `SupportInbox` tokens — those DOs have different (narrower) capability scopes and are addressed in `UNIT-013` if at all.

## implementation_sequence
1. In `realtime-room-token.ts`, change `DEFAULT_ROOM_TOKEN_TTL_SECONDS` from `300` to `60`. Re-run the file's existing tests (if any reference the constant) — none found in the audit; safe to change.
2. In `collaboration-room.ts`:
   - Add a lazy-init `ensureRevokedSubjectsSchema()` that runs `CREATE TABLE IF NOT EXISTS revoked_subjects (sub TEXT PRIMARY KEY, revoked_at INTEGER NOT NULL)` on DO construction (or first use).
   - Add `isSubjectRevoked(sub)` that runs `SELECT 1 FROM revoked_subjects WHERE sub = ? AND revoked_at > ?` with the cutoff `(Date.now() - 2 * TTL * 1000)`.
   - In `authorizeSocket` (line 378-415), after the existing `verifyRealtimeRoomToken` check, call `isSubjectRevoked(payload.sub)`; on true, close the socket with reason `subject_revoked` and return.
   - In `handleControlRequest` `revoke-subject` branch (line 519-538), in addition to iterating open sockets, run `INSERT OR REPLACE INTO revoked_subjects (sub, revoked_at) VALUES (?, ?)` with the current timestamp.
   - Add a periodic cleanup (e.g., on each `alarm()` fire) that runs `DELETE FROM revoked_subjects WHERE revoked_at < ?` to bound table growth.
3. Run `bun run type-check` to confirm no type errors.
4. (Optional, not authorized by this pack) Run the proposed regression test.

## data_or_schema_changes
None at the D1 level. DO SQLite table `revoked_subjects(sub TEXT PRIMARY KEY, revoked_at INTEGER NOT NULL)` is created lazily by the DO. No D1 migration needed.

## authz_and_tenant_implications
Strengthens the existing per-estimate authorization model. No new authz surface introduced. The denylist is scoped to the DO instance (= scoped to the estimate collaboration room).

## failure_and_exception_behavior
- If `isSubjectRevoked` throws (DO SQLite error), `authorizeSocket` MUST fail-closed: close the socket with reason `revocation_check_failed` and log via the structured redactor. Do not fail-open.
- If `INSERT OR REPLACE` into `revoked_subjects` throws in `handleControlRequest`, return a 5xx to the caller (which is the revocation-triggering server action in `actions.ts`) so the user sees the revocation did not complete, rather than silently succeeding at the open-socket-close step only.

## acceptance_criteria
1. `DEFAULT_ROOM_TOKEN_TTL_SECONDS === 60` in `realtime-room-token.ts`.
2. `authorizeSocket` consults `revoked_subjects` and rejects revoked subjects (source inspection).
3. `handleControlRequest` `revoke-subject` writes to `revoked_subjects` (source inspection).
4. `isSubjectRevoked` is bounded by `2 * TTL` cutoff (source inspection).
5. `bun run type-check` passes.

## acceptance_evidence
- Source/diff inspection confirming all five criteria.
- `bun run type-check` exit 0.
- Static confirmation that DO SQLite storage is provisioned (`wrangler.jsonc:64-67`).

## test_decision
`TEST_PROPOSAL` (not authorized by this pack).

## exact_test_proposal_if_any
- **Risk:** After revoking a member, that member can reconnect within 60s with the old token and broadcast `row-update` / `presence:write`.
- **Cheapest decisive test:** `bun x vitest run tests/vitest/cloudflare/collaboration-room-revocation.test.ts` (new file). Test: issue token for `sub=A` with `broadcast:row-update`; revoke A; within the same second, open a new WS and send `{type:"authorize", token}` then `{type:"broadcast", event:"row-update", payload}`; assert the broadcast is rejected and the socket is closed with reason `subject_revoked`.
- This is `MVP_CRITICAL_INVARIANT` (revocation is a critical security invariant; cheaper evidence — source inspection — cannot prove runtime behavior because the DO SQLite round-trip and the alarm/cleanup interaction are runtime concerns).

## authorization_boundaries
None. The local edit is fully executable. Hosted verification (running the test against a deployed Worker) is optional and not authorized by this pack.

## observability_or_audit_requirements
Log `subject_revoked` close events via the structured redactor (already imported in `worker.ts:13`). Record `revoked_subjects` row count in the DO alarm for operational visibility (optional).

## recovery_or_fix_forward
If the denylist table causes DO SQLite errors in production, the fail-closed behavior means sockets are closed (loss of realtime for that room) rather than allowing revoked subjects through. Fix-forward: drop the table from DO state and re-deploy. No D1 migration to roll back.

## conflict_and_concurrency_notes
The `CollaborationRoom` DO is single-threaded per instance; concurrent revoke + authorize serialize through the DO event loop. No additional locking needed.

## completion_signal
The original completion proposal required all five acceptance criteria. This
predecessor did not execute or complete the unit.

## historical_next_unit_on_success
The original proposal recommended `UNIT-005`. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
