# 003 — Constant-Time Bearer Compares + Collapse Legacy Realtime-Token Secret Fallback

> **Historical provenance only.** `UNIT-003` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-CRYPTO-001`, `SEC-CRYPTO-002`, `SEC-CRYPTO-003`.

## unit_id
`UNIT-003` · **status:** `SUPERSEDED` · **priority:** P2 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-002`.
- Findings: `SEC-CRYPTO-001`, `SEC-CRYPTO-002`, `SEC-CRYPTO-003`.

## goal
Every bearer-secret comparison in the worker uses the existing `authorizeBearerRequest` (constant-time SHA-256 + `timingSafeEqual`). The legacy realtime-room-token secret fallback chain (`realtime-room-token.ts:4-9`) is collapsed to a single source.

## security_invariants
1. No `=== \`Bearer ${secret}\`` remains in `src/lib/cloudflare/*-proof-router.ts`.
2. The `CollaborationRoom` control-secret check uses constant-time compare.
3. `readRealtimeRoomTokenSecret` reads only `REALTIME_ROOM_TOKEN_SECRET` (no fallback to `REALTIME_IDENTITY_SIGNING_KEY` / `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` / `COLLABORATION_INVITE_PEPPER`).

## current_source_evidence
- 8 proof routers use plain `===` (see `04-FINDINGS-REGISTER.md` `SEC-CRYPTO-001`).
- `src/lib/cloudflare/collaboration-room.ts:496-500` — control-secret `!==` compare.
- `src/lib/collaboration/realtime-room-token.ts:4-9,38` — fallback chain.
- `src/lib/security/bearer-auth.ts:30-37` — the correct constant-time pattern.

## affected_paths_and_resources
- `src/lib/cloudflare/{better-auth,collaboration-invitation,observability,upload-lifecycle,d1-performance,estimate-history,jobs,provider}-proof-router.ts` (8 files).
- `src/lib/cloudflare/collaboration-room.ts`.
- `src/lib/collaboration/realtime-room-token.ts`.
- `src/lib/cloudflare/{support-inbox,global-presence}.ts` and `realtime-identity-actions.ts:158` (callers of `readRealtimeRoomTokenSecret` — must now require `REALTIME_ROOM_TOKEN_SECRET`).

## owned_paths
As above.

## dependencies
None.

## preconditions
`REALTIME_ROOM_TOKEN_SECRET` must be set in every deployed environment (the env examples already document it). If only the legacy pepper is set, the operator must add `REALTIME_ROOM_TOKEN_SECRET` before deploying this unit.

## non_goals
- Rotating existing secrets (operator decision).
- Replacing `CRON_SECRET` with per-route secrets (separate follow-up).

## implementation_sequence
1. In each proof router's `isAuthorized`, replace `request.headers.get("authorization") === \`Bearer ${secret}\`` with `authorizeBearerRequest(request, [env.CRON_SECRET])` (import from `src/lib/security/bearer-auth.ts`). For routers that accept a route-specific secret, pass both: `[env.CRON_SECRET, env.UPLOAD_SCAN_JOB_SECRET]` etc.
2. In `collaboration-room.ts:496-500`, replace the `!==` check with a constant-time compare helper (digest both sides with SHA-256, `timingSafeEqual`).
3. In `realtime-room-token.ts:4-9`, reduce `TOKEN_SECRET_ENVS` to `["REALTIME_ROOM_TOKEN_SECRET"]`. Update `readRealtimeRoomTokenSecret` to read only that env var.
4. Verify callers (`support-inbox.ts`, `global-presence.ts`, `realtime-identity-actions.ts`) handle the new fail-closed behavior — they already check for `null` return.
5. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None (no authz logic changes; only comparison semantics).

## failure_and_exception_behavior
Missing `REALTIME_ROOM_TOKEN_SECRET` → `readRealtimeRoomTokenSecret` returns `null` → DO returns 401. Fail-closed. Document this in `.env.example`.

## acceptance_criteria
1. `grep -r '=== \`Bearer' src/lib/cloudflare/` returns zero matches.
2. `collaboration-room.ts` control-secret check uses `timingSafeEqual`.
3. `realtime-room-token.ts` `TOKEN_SECRET_ENVS` has exactly one entry.
4. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + grep + `type-check` exit 0.

## test_decision
`NOT_REQUIRED` (static evidence is decisive for constant-time compare replacement).

## exact_test_proposal_if_any
None.

## authorization_boundaries
None.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
If an environment lacks `REALTIME_ROOM_TOKEN_SECRET`, support-inbox/global-presence WS auth fails-closed (401). Fix-forward: add the env var. No rollback needed.

## conflict_and_concurrency_notes
None.

## completion_signal
All four acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
