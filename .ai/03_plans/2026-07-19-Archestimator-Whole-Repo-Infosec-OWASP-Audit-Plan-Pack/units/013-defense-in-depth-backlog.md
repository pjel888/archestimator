# 013 — Defense-in-Depth Backlog (Latent Data-Layer, Realtime, Worker-Edge, Browser, AI)

> Closes the folded Low/Medium-Latent findings: `SEC-AUTH-001`, `SEC-AUTHZ-001`, `SEC-AUTH-003`, `SEC-COLLAB-001`, `SEC-COLLAB-002`, `SEC-COLLAB-004`, `SEC-COLLAB-005`, `SEC-COLLAB-006`, `SEC-COLLAB-007`, `SEC-WORKER-004`, `SEC-WORKER-005`, `SEC-SHARE-001`, `SEC-SHARE-002`, `SEC-OPS-005`, `SEC-OPS-006`, `SEC-BROWSER-002`, `SEC-BROWSER-007`, `SEC-AI-001`, `SEC-AI-002`.

## unit_id
`UNIT-013` · **status:** `READY` · **priority:** P3 · **effort:** M–L (multi-surface) · **implementation_risk:** LOW (each sub-fix is independent and small) · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-001` (residual hardening beyond `UNIT-001`), `SEC-006`, `SEC-009`, `SEC-010`.
- Findings: as listed above (19 folded Low/Latent findings).

## goal
Close the long tail of Low/Latent findings in coherent sub-batches. This unit is intentionally a backlog umbrella: each sub-fix can be its own PR; together they complete the audit's defense-in-depth wave.

## security_invariants (per sub-fix)
1. **`SEC-AUTH-001`** — `session.token` hashed at rest in D1 (or upgraded via Better Auth when supported).
2. **`SEC-AUTHZ-001`** — `support-conversations-repository` requires a `UserContext` and performs membership predicate internally.
3. **`SEC-AUTH-003`** — `?error=state_mismatch` `Clear-Site-Data` gated to OAuth callback paths or to requests carrying an oauth state cookie.
4. **`SEC-COLLAB-001`** — CollaborationRoom upgrade rejects cross-Origin; pre-upgrade token preferred; unauthorized sockets don't count toward `MAX_ROOM_CONNECTIONS`.
5. **`SEC-COLLAB-002`** — Per-subject connection cap; slow-consumer close on first send failure.
6. **`SEC-COLLAB-004`** — SupportInbox message schema + `from: claims.sub` stamping.
7. **`SEC-COLLAB-005`** — Drop `?token=` query branch in `GlobalPresence` and `SupportInbox`; require header-based auth.
8. **`SEC-COLLAB-006`** — Per-subject sliding-window rate counter in `CollaborationRoom`.
9. **`SEC-COLLAB-007`** — Presence schema validation; reject identity-looking keys.
10. **`SEC-WORKER-004`** — Drop isolate memory cache OR bound it (LRU + size limit) + comment-invariant.
11. **`SEC-WORKER-005`** — Propagate request-id to WS handshake responses; assert router-level auth.
12. **`SEC-SHARE-001`** — Dummy scrypt on null publication/portal password branch to equalize timing.
13. **`SEC-SHARE-002`** — `GET /api/share/[token]` returns 404 (not 423) for password-required-without-cookie.
14. **`SEC-OPS-005`** — Client Portal notification idempotency via stable `email_message_id`.
15. **`SEC-OPS-006`** — Cron overlap prevention (atomic enqueue-time claim).
16. **`SEC-BROWSER-002`** — Marketing-page cache: add `Cache-Tag` + purge integration; shorter `s-maxage`.
17. **`SEC-BROWSER-007`** — Add `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin` on authenticated image/attachment routes.
18. **`SEC-AI-001`** — Package-builder apply-tier sub-flags default `false`.
19. **`SEC-AI-002`** — `checkAiPackageBuilderQuota` added.

## current_source_evidence
Per-finding file:line in `04-FINDINGS-REGISTER.md`.

## affected_paths_and_resources
Per sub-fix. Major touch surfaces: `src/lib/repositories/support-conversations-repository.ts`, `src/lib/cloudflare/collaboration-room.ts`, `src/lib/cloudflare/support-inbox.ts`, `src/lib/cloudflare/global-presence.ts`, `src/lib/cloudflare/worker-route-optimizations.ts`, `src/lib/publication/public-repository.ts`, `src/lib/cloudflare/client-portal-notification-queue.ts`, `next.config.ts`, `src/lib/ai/package-builder/feature-flags.ts`, `src/lib/ai/rate-limit.ts`, `src/lib/auth/better-auth-cloudflare.ts`.

## owned_paths
Per sub-fix (split across PRs).

## dependencies
None locally.

## preconditions
None.

## non_goals
- Refactoring the realtime architecture (the DO model is sound; only invariants are tightened).
- Replacing the share token URL-path model with fragment-identifier tokens (architectural; future work).

## implementation_sequence
Each sub-fix is independent. Recommended PR ordering:
- PR1 (data-layer hardening): `SEC-AUTHZ-001` + `SEC-AUTH-003` + `SEC-SHARE-002`.
- PR2 (realtime hardening): `SEC-COLLAB-001/002/004/005/006/007`.
- PR3 (worker-edge + browser): `SEC-WORKER-004/005` + `SEC-BROWSER-002/007`.
- PR4 (AI): `SEC-AI-001/002`.
- PR5 (misc): `SEC-AUTH-001` (when Better Auth supports `tokenHashing`), `SEC-OPS-005/006`, `SEC-SHARE-001`.

## data_or_schema_changes
- `SEC-AUTH-001` (when implemented): migration to hash existing `session.token` values.
- Others: none.

## authz_and_tenant_implications
`SEC-AUTHZ-001` strengthens data-layer authz (defense-in-depth).

## failure_and_exception_behavior
Per sub-fix. Each fail-closed where applicable.

## acceptance_criteria
1. Each sub-fix's specific invariant (per the list above) is present at the named file:line.
2. `bun run type-check` passes after each PR.

## acceptance_evidence
Source/diff inspection per PR + `type-check` exit 0.

## test_decision
`TEST_PROPOSAL` for selected sub-fixes where the runtime invariant is critical:
- `SEC-COLLAB-001/002` — WS origin + per-subject cap test.
- `SEC-SHARE-002` — share token status-code uniformity test.
- `SEC-AI-002` — package-builder quota test.

## exact_test_proposal_if_any
(Per sub-fix; see PRs.)

## authorization_boundaries
None for local edits.

## observability_or_audit_requirements
Per sub-fix.

## recovery_or_fix_forward
Each sub-fix is independent; revert the PR if it breaks.

## conflict_and_concurrency_notes
Coordinate across PRs to avoid merge conflicts on `collaboration-room.ts`.

## completion_signal
When all 19 sub-fixes are landed and evidenced. `DONE`.

## next_unit_on_success
Pack completion (`implementation_status` advances toward `COMPLETE`).
