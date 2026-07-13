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
- **Unit ID:** WP-01.
- **Requirement IDs:** REQ-CSRF-01.
- **Goal:** `isAllowedInviteOrigin` must fail closed for state-changing POST when both
  `Origin` and `Referer` are absent.
- **User/system outcome:** a cross-site request with stripped headers can no longer pass
  the invite same-origin guard for POST mutations.
- **Scope:** the terminal `return true` at `src/lib/collaboration/invite-origin.ts:39`.
- **Non-goals:** do NOT change GET (redirect) behavior; do NOT remove the `!appHost → true`
  local-dev escape (line 27); do NOT change `assertSameOriginPublicPost` (share surface,
  already correct).
- **Files (repo-relative):** modify `src/lib/collaboration/invite-origin.ts`; update test
  `tests/vitest/invite-accept-origin.test.ts`. Callers
  (`src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/sign-out/route.ts`)
  pass through unchanged.
- **Target symbol:** `isAllowedInviteOrigin` (split into `isAllowedInviteOriginPost` or
  accept a method argument).
- **Existing patterns to follow:** `assertSameOriginPublicPost`
  (`src/lib/publication/security.ts:373`) is the model — it denies on missing Origin.
- **Dependencies/sequencing:** none (disjoint file). Parallel-safe with WP-02/03.
- **Data/API/security/perf implications:** security-positive (closes defense-in-depth gap);
  no data change; no perf impact (header read).
- **Instructions:** Change the terminal `return true` (line 39) to `return false` **for
  POST requests**. Preserve `!appHost → true`. Alternative (owner decision): document
  reliance on SameSite=Lax + session and record the dependency as an accepted residual.
- **Detailed test scenarios:** (1) POST, no Origin, no Referer → **denied** (flip current
  assertion at `invite-accept-origin.test.ts:66`); (2) POST, same-origin Origin → allowed;
  (3) POST, same-origin Referer fallback → allowed; (4) GET, no Origin → allowed
  (unchanged); (5) `!appHost` environment → allowed (local-dev escape preserved); (6)
  cross-origin Origin → denied.
- **Verification command:** `bunx vitest run tests/vitest/invite-accept-origin.test.ts
  tests/vitest/project-invite-entry-route.test.ts --maxWorkers=1`; `bun run type-check`.
- **Manual/browser/provider proof:** not required — header logic is unit-provable.
- **Acceptance / Done criteria:** POST with no Origin+Referer → denied; GET unchanged; all
  6 scenarios green; type-check clean.
- **Rollback:** revert single-file change.
- **Stop/blocker condition:** none — fully specified, implementation-ready.
- **Complexity:** Small.

### Task WP-02 — Durable estimate mutation rate limit (SEC-03 / REQ-RATE-02)
- **Unit ID:** WP-02.
- **Requirement IDs:** REQ-RATE-02.
- **Goal:** replace/augment the in-memory `assertEstimateActionRateLimit` with a
  globally-effective cap across Worker isolates.
- **User/system outcome:** high-frequency estimate edits are throttled globally, not just
  per-isolate, reducing authenticated abuse surface.
- **Scope:** `src/lib/estimates/action-rate-limit.ts` (the in-memory `Map` at line 20 and
  `checkEstimateActionRateLimit`/`assertEstimateActionRateLimit` at line 38); consumers in
  `src/lib/estimates/d1-action-client.ts` and `actions.ts`.
- **Non-goals:** do NOT change estimate authz (`assertCanEditEstimate`); do NOT add a
  migration (reuse `security_rate_limit_events` with a new append-only scope); do NOT
  throttle reads.
- **Files:** `src/lib/estimates/action-rate-limit.ts`; possibly a shared durable helper
  extracted alongside `src/lib/publication/public-repository.ts` rate-limit core.
- **Existing patterns to follow:** durable record/count in
  `src/lib/publication/public-repository.ts:357` (`checkRecordedRateLimit`); atomic
  reserve+rollback in `src/app/api/compliance/privacy-requests/route.ts:206-280`
  (`reserveRateLimitSlots`).
- **Dependencies/sequencing:** none (disjoint). Parallel-safe with WP-01/03.
- **Data/API/security/perf implications:** one D1 insert+count per estimate mutation
  (cheap; index `(scope,key_hash,occurred_at)`); fail-open on D1 error (availability over
  throttling) with logging, OR fail-closed if owner prefers security (decision point).
- **Instructions:** add scope `estimate_action` keyed by `userId` (optionally
  `estimateId`); keep limits 40/10s, 120/60s or owner-approved equivalents.
- **Detailed test scenarios:** (1) single isolate: 41st action in 10s → 429; (2) **two
  limiter instances** (simulating two isolates) combined count enforces the cap (the
  declared SEC-03 evaluator); (3) window expiry allows resumption; (4) D1-error path
  behaves per chosen fail mode; (5) existing `estimate-sheet-actions-authz.test.ts` still
  passes.
- **Verification command:** new `tests/vitest/estimate-action-rate-limit-durable.test.ts`;
  `bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts`; `bun run type-check`.
- **Manual/browser/provider proof:** not required — limiter logic is unit-provable;
  cross-isolate behavior is simulated by two instances in one process.
- **Acceptance / Done criteria:** cross-isolate cap enforced; existing edit semantics
  preserved; fail mode documented.
- **Rollback:** revert to in-memory limiter (scope is append-only ⇒ no data cleanup).
- **Stop/blocker condition:** owner must pick fail-open vs fail-closed on D1 error (a
  documented decision point, not a blocker — default fail-open with logging).
- **Complexity:** Medium.

### Task WP-03 — CollaborationRoom WebSocket upgrade rate limit (SEC-04 / REQ-DO-01)
- **Unit ID:** WP-03.
- **Requirement IDs:** REQ-DO-01.
- **Goal:** mitigate unauthenticated socket-upgrade exhaustion in `CollaborationRoom`.
- **User/system outcome:** an attacker cannot open many unauthenticated sockets to drain
  DO resources; legitimate collaboration unaffected.
- **Scope:** `src/lib/cloudflare/collaboration-room.ts` `fetch()` upgrade path (accepts
  socket at ~line 94 before `authorizeSocket`).
- **Non-goals:** do NOT change per-message authz (`authorizeSocket`/`isSocketAuthorized` —
  already correct); do NOT change token issuance (`issueRealtimeRoomToken`).
- **Files:** `src/lib/cloudflare/collaboration-room.ts`; test
  `tests/vitest/cloudflare-collaboration-room-auth.test.ts`.
- **Existing patterns to follow:** per-message `authorizeSocket` token verify
  (`verifyRealtimeRoomToken`, HMAC + topic + exp).
- **Dependencies/sequencing:** none (disjoint). Parallel-safe with WP-01/02.
- **Data/API/security/perf implications:** reduces DO memory/connection pressure; no data
  change; per-IP state in the DO (single instance per room) or D1 limiter.
- **Instructions:** Option A — per-IP upgrade rate limit in the DO (single-instance ⇒
  in-memory acceptable). Option B (stronger) — require a valid realtime-room token in the
  upgrade query string before `acceptWebSocket`. Recommend B if token-in-upgrade is
  feasible without breaking the client handshake.
- **Detailed test scenarios:** (1) upgrade without token → rejected (Option B) OR N+1th
  upgrade from same IP → rejected (Option A); (2) valid token → upgrade accepted +
  subsequent authorize succeeds; (3) token for wrong topic → rejected; (4) existing
  per-message authz tests still pass.
- **Verification command:** `bunx vitest run tests/vitest/cloudflare-collaboration-room-auth.test.ts
  tests/vitest/cloudflare-collaboration-room-router.test.ts --maxWorkers=1`.
- **Manual/browser/provider proof:** not required — DO logic is unit-provable; real WS
  behavior is covered by existing tests.
- **Acceptance / Done criteria:** unauthenticated upgrade is rate-limited or token-gated;
  legitimate collaboration unaffected.
- **Rollback:** revert DO change.
- **Stop/blocker condition:** none — implementation-ready.
- **Complexity:** Medium.

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

### Task WP-12 — R2 signed-URL invariant doc + origin-source reconciliation (SEC-09/10)
- **Requirement IDs:** REQ-DOC-03 (new, LOW).
- **Objective:** (a) Document the `signedReadUrlFactory` invariant in
  `src/lib/uploads/r2-storage-provider.ts` (must run app-authz before minting any
  presigned URL if ever wired). (b) Document why per-request share/invite origin checks
  derive from `request.url` while `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` feeds
  `trustedOrigins`/redirects/email links, so multi-origin deployments don't drift.
- **Target:** code comments / a short note in `.ai/` or `DESIGN.md`; **DO NOT remove**
  `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` from `.env.example` (it is actively consumed — see
  retracted SEC-08 / Doc 20 ADV-01).
- **Complexity:** Small. **Parallelization:** parallel-safe.

### Task WP-13 — Audit caller-authorized Server Actions (SEC-05/11 / REQ-DEFENSE-01)
- **Requirement IDs:** REQ-DEFENSE-01.
- **Objective:** Audit `"use server"` exports that rely on caller-layer auth rather than
  action-layer auth. Confirmed instance: `maybeTriggerSharedLinkActivityDigest`
  (`src/lib/publication/actions.ts:1968`). Either (a) add an internal guard that verifies
  the publication token before sending the digest, or (b) document explicitly that this
  is an internal-only helper whose callers (comment/decision routes) authorize, and add a
  contract test asserting direct POST without a valid publication context is a no-op.
- **Target:** `src/lib/publication/actions.ts:1968` + audit pass over other `"use server"`
  exports for the same pattern (extend the SEC-05 audit).
- **Tests:** new contract test; extend `security-findings-publication-contracts.test.ts`.
- **Complexity:** Small–Medium. **Parallelization:** parallel-safe after audit.

## Durable-goal ledger (per phase)

Each phase must record: goal ID, objective, scope, requirements covered, required
evidence, completion audit, checkpoint artifacts, stop condition, blocker condition,
review gate, QA gate.

| Phase | Goal ID | Stop condition | QA gate |
|---|---|---|---|
| 0 | GOAL-P0 | WP-01/02/03 pass focused tests + type-check | adversarial denial tests green |
| 1 | GOAL-P1 | WP-04..09 + WP-13 done or owner-deferred | REQ-NEG-02 + SEC-05/11 tests green |
| 2 | GOAL-P2 | WP-10/11/12 done or deferred | owner sign-off |

## Files explicitly off-limits during implementation
- `supabase/migrations/**` (migration archaeology — never extend).
- `.ai/10_state/current-state.md` (append-only; do not rewrite history).
- Any file outside the named target paths per task.

## Files intentionally unaffected
- Marketing pages, health endpoint, design-system tokens, Storybook config.
- Better Auth core tables schema (no migration needed).

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
