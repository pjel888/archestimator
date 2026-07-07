# 11 — Implementation Plan

This is the authoritative execution guide for the future implementation AI. Planning
only — no code is changed by this pack.

**Entrypoint for executors:** this file. **Phase order:** P0 launch-blockers first,
then P1, then P2 hardening. Each task has exact paths/symbols, validation, and rollback.

> **Branch/worktree policy:** stay on the current shared branch/worktree. Do NOT auto-
> create branches/worktrees. Coordinate with fresh `git status`, file-scope ownership,
> small diffs, and re-reading touched files immediately before edits (AGENTS.md policy).

## Phase 0 — P0 launch-blockers (parallel-safe across disjoint files)

### Task WP-01 — Close invite-origin fail-open (SEC-01 / REQ-CSRF-01)
- **Requirement IDs:** REQ-CSRF-01.
- **Objective:** `isAllowedInviteOrigin` must fail closed for state-changing POST when
  both `Origin` and `Referer` are absent.
- **Target file:** `src/lib/collaboration/invite-origin.ts:39`.
- **Target symbol:** `isAllowedInviteOrigin`.
- **Why:** documented CSRF defense for `/invite/<token>/accept` POST and `/sign-out`
  currently returns `true` on stripped headers.
- **Instructions:** Change the terminal `return true` (line 39) to `return false` **for
  POST requests** (pass method or split into `isAllowedInviteOriginPost`). GET (redirect)
  may remain permissive. Preserve the `!appHost → true` local-dev escape. Alternative
  (owner decision): document reliance on SameSite=Lax + session and record the dependency.
- **Tests to update:** `tests/vitest/invite-accept-origin.test.ts:66` (currently asserts
  `true` on absent — flip to assert denial for POST).
- **Validation:** `bunx vitest run tests/vitest/invite-accept-origin.test.ts
  tests/vitest/project-invite-entry-route.test.ts --maxWorkers=1`; `bun run type-check`.
- **Acceptance:** POST with no Origin+Referer → denied; GET unchanged; existing same-origin
  cases pass.
- **Rollback:** revert single-file change.
- **Complexity:** Small.
- **Parallelization:** parallel-safe (disjoint file).
- **Status:** DISCOVERY-REQUIRED → now fully specified; implementation-ready.

### Task WP-02 — Durable estimate mutation rate limit (SEC-03 / REQ-RATE-02)
- **Requirement IDs:** REQ-RATE-02.
- **Objective:** Replace/augment the in-memory `assertEstimateActionRateLimit` with a
  globally-effective cap.
- **Target files:** `src/lib/estimates/action-rate-limit.ts:38`; consumers in
  `src/lib/estimates/d1-action-client.ts` and `actions.ts`.
- **Target symbol:** `assertEstimateActionRateLimit` / `checkEstimateActionRateLimit`.
- **Why:** in-memory `Map` is per-Worker-isolate; no real abuse throttle on the
  highest-volume authenticated mutation surface.
- **Instructions:** Reuse the durable `security_rate_limit_events` pattern (see
  `src/app/api/compliance/privacy-requests/route.ts:206-280` for the atomic
  reserve pattern, or `src/lib/publication/public-repository.ts:357` for record/count).
  Add scope `estimate_action` keyed by `userId` (and optionally `estimateId`). Keep
  existing limits (40/10s, 120/60s) or owner-approved equivalents. Preserve fail-closed
  semantics (on D1 error, allow the action — availability over throttling — but log).
  **Alternative:** add a free-tier Cloudflare WAF rate-limit rule for `/workshop` mutation
  endpoints (cheaper, but less granular).
- **Tests to add:** new test simulating two "isolates" (two limiter instances) proving
  the combined count enforces the cap. Extend `estimate-sheet-actions-authz.test.ts`.
- **Validation:** focused vitest; `bun run type-check`.
- **Acceptance:** cross-isolate cap enforced; existing per-user edit semantics preserved.
- **Rollback:** revert to in-memory limiter (no migration since scope is append-only).
- **Complexity:** Medium.
- **Parallelization:** parallel-safe (disjoint from WP-01/03/04).
- **Status:** implementation-ready (no external decision needed if D1 limiter chosen).

### Task WP-03 — CollaborationRoom WebSocket upgrade rate limit (SEC-04 / REQ-DO-01)
- **Requirement IDs:** REQ-DO-01.
- **Objective:** Mitigate unauthenticated socket-upgrade exhaustion.
- **Target file:** `src/lib/cloudflare/collaboration-room.ts` (`fetch()` upgrade path ~line 95).
- **Why:** upgrade accepts socket before `authorizeSocket`; no per-IP upgrade cap.
- **Instructions:** Add a per-IP upgrade rate limit (in-memory in the DO is acceptable
  since a single DO instance handles a room; or use the D1 limiter keyed by IP+room).
  **Alternative (stronger):** require a valid realtime-room token in the upgrade query
  string before accepting the socket (the token is already issued by
  `issueRealtimeRoomToken` with `canAccessProjectInD1`/`canAccessEstimateInD1`).
- **Tests to add:** extend `cloudflare-collaboration-room-auth.test.ts` to assert upgrade
  is rejected without a token / after N upgrades.
- **Validation:** `bunx vitest run tests/vitest/cloudflare-collaboration-room-auth.test.ts`.
- **Acceptance:** unauthenticated upgrade is rate-limited or token-gated.
- **Rollback:** revert DO change.
- **Complexity:** Medium.
- **Parallelization:** parallel-safe (disjoint file).
- **Status:** implementation-ready.

## Phase 1 — P1 broad-launch hardening

### Task WP-04 — Edge/WAF abuse protection decision (SEC-02 / REQ-RATE-03)
- **Requirement IDs:** REQ-RATE-03.
- **Objective:** Owner decision on Cloudflare WAF/rate-limiting (free-tier) in front of
  auth-sensitive routes.
- **Status:** **BLOCKED-EXTERNAL** (owner decision; free-tier scope). Options: (a) add
  free-tier WAF rate-limit rules for `/api/share/*`, `/api/compliance/*`, `/api/auth/*`;
  (b) defer to post-launch. Recommend (a) before broad launch. Impact: reduces T-02 risk.
- **Target (if approved):** `wrangler.jsonc` `rules`/WAF config + provider proof.

### Task WP-05 — Pre-parse body cap on public JSON POSTs (SEC-06 / REQ-BODY-01)
- **Requirement IDs:** REQ-BODY-01.
- **Objective:** Apply a size cap before `request.json()` on share POST routes.
- **Target files:** `src/app/api/share/[token]/{comment,decision,events}/route.ts`.
- **Instructions:** Mirror `readRequestBodyBytesWithSizeLimit` from the privacy intake
  route; cap at e.g. 64 KiB (well above legitimate comment/decision/event payloads).
- **Tests:** extend `project-publication-comments.test.tsx` / `decision.test.tsx`.
- **Complexity:** Small. **Parallelization:** parallel-safe.

### Task WP-06 — Read-repository cross-tenant denial tests (REQ-NEG-02)
- **Requirement IDs:** REQ-NEG-02.
- **Objective:** Behavioral cross-workspace denial tests for project activity, project
  charts, publisher activity, notifications repository.
- **Target:** new test files under `tests/vitest/`.
- **Complexity:** Small–Medium. **Parallelization:** parallel-safe.

### Task WP-07 — Action-boundary authz consistency (SEC-05 / REQ-DEFENSE-01)
- **Requirement IDs:** REQ-DEFENSE-01.
- **Objective:** Add `requireAuth`/`requireCurrentUserContext` at the action boundary for
  actions that currently rely on repo-layer auth (e.g. `loadRecipientProposals`); audit
  all `"use server"` exports for the same pattern.
- **Target:** `src/lib/recipient-proposals/actions.ts:8` + audit pass.
- **Complexity:** Small. **Parallelization:** parallel-safe after audit.

### Task WP-08 — CSP hardening roadmap (SEC-07 / REQ-CSP-01)
- **Status:** **BLOCKED-EXTERNAL** (broad-launch scope; owner decision on nonce pipeline).
  Options + recommendation recorded; not a closed-beta blocker.

### Task WP-09 — Mark June audit superseded (REQ-DOCS-02)
- **Target:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/README.md` (add
  supersession pointer to this refresh).
- **Complexity:** Small. **Parallelization:** parallel-safe.

## Phase 2 — P2 hardening

### Task WP-10 — Centralized validation decision (SEC-06 / REQ-VALID-01)
- **Status:** **BLOCKED-EXTERNAL** (owner decision: zod vs documented hand-rolled standard).

### Task WP-11 — Idempotency on replayable creates (REQ-IDEMP-01)
- **Objective:** Add client `mutationId` or unique constraint to project/component/invite
  creates, OR document acceptable replay semantics.
- **Complexity:** Medium. Lower priority.

### Task WP-12 — Cleanup dead config (SEC-08/09)
- **Target:** `.env.example` (remove or wire `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`);
  document `signedReadUrlFactory` invariant in `r2-storage-provider.ts`.
- **Complexity:** Small.

## Durable-goal ledger (per phase)

Each phase must record: goal ID, objective, scope, requirements covered, required
evidence, completion audit, checkpoint artifacts, stop condition, blocker condition,
review gate, QA gate.

| Phase | Goal ID | Stop condition | QA gate |
|---|---|---|---|
| 0 | GOAL-P0 | WP-01/02/03 pass focused tests + type-check | adversarial denial tests green |
| 1 | GOAL-P1 | WP-04..09 done or owner-deferred | REQ-NEG-02 tests green |
| 2 | GOAL-P2 | WP-10..12 done or deferred | owner sign-off |

## Files explicitly off-limits during implementation
- `supabase/migrations/**` (migration archaeology — never extend).
- `.ai/10_state/current-state.md` (append-only; do not rewrite history).
- Any file outside the named target paths per task.

## Files intentionally unaffected
- Marketing pages, health endpoint, design-system tokens, Storybook config.
- Better Auth core tables schema (no migration needed).
