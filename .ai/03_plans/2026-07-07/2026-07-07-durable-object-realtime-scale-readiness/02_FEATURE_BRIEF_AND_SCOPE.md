# 02 — Feature Brief and Scope

## Source brief (verbatim, from `PROMPT.md`)

> Date: 2026-07-07. Target folder: `.ai/03_plans/2026-07-07-durable-object-realtime-scale-readiness`.
> Mode: planning only. Create the plan pack in this folder; do not change application code.
>
> **Goal:** Create a plan pack for Durable Object collaboration readiness: fanout behavior,
> presence, reconnects, latency, failure recovery, and storage lifecycle.
>
> **Evidence To Start From:**
> - `wrangler.jsonc` binds `COLLAB_ROOMS` to `CollaborationRoom`.
> - `src/lib/cloudflare/collaboration-room.ts` and collaboration client code implement realtime behavior.
> - Tests such as `tests/vitest/project-collaboration-realtime.test.ts` exist, but scale, reconnect, and hosted latency proof are not fully specified.
> - Broadcast and presence behavior may scale with connected sockets.
>
> **Required Plan Pack:** Include room lifecycle, socket caps, message fanout budgets,
> reconnect semantics, stale presence cleanup, storage limits, tests, synthetic load proof,
> hosted smoke proof, and degradation behavior.
>
> **Constraints:** Stay within free-tier limits and current DO binding. Do not require
> browser automation unless the proof cannot be done with smaller tests or scripts.
>
> **Stop Condition:** The pack enables an executor to prove realtime collaboration is safe
> for first-user load and failure cases.

## Scope model

| Topic | In scope | Out of scope (non-goal) |
|---|---|---|
| Room lifecycle | Connection accept, authorize, presence, broadcast, close, error, hibernation eviction/rehydrate, deploy-disconnect | New room types; cross-room fan-out (parent/child DO, Queues pub-sub) — deferred unless a cap forces it |
| Socket caps | Per-DO connection cap, reject-above-cap close code, free-tier budget | Paid-tier raise, dedicated egress, Smart Placement paid |
| Message fanout budgets | O(n) broadcast cost, per-sender rate cap + backoff, batching budget, message-size enforcement (4096 B / 80-char event) | Message-level E2E encryption, application-level CRDT merge (use existing contract v2) |
| Reconnect semantics | Client backoff, re-authorize-on-reconnect, token refresh before expiry, deploy-disconnect recovery | Server-driven draining (platform does not support it); offline-first local edits |
| Stale presence cleanup | Heartbeat/auto-response, prune-on-alarm, hibernation-safe rehydrate, stable per-user keying | Persistent presence history; presence-based analytics |
| Storage limits | Decision: keep DO storage-free for presence (ephemeral); SQLite reserved for future audit/seat feature | Persisting presence/cursors in D1 or R2 |
| Tests | Real DO runtime tests, untested branches, reconnect/token-expiry tests | Rewriting the existing identity/authz unit tests |
| Synthetic load proof | N-client fanout timer, presence churn, broadcast rate soak (Miniflare) | Production load injection against unrelated accounts/projects |
| Hosted smoke proof | Presence + reconnect + token-expiry (extend existing 2-client cursor script) | Browser automation for claims provable by unit/DOM tests |
| Latency | p50/p95 end-to-end delivery budget, evaluator harness | Core Web Vitals for realtime (cursors are not LCP/INP-critical) |
| Degradation behavior | Transport disabled, DO cold-start, partial network loss, token-secret missing | Graceful degradation of unrelated features |

## Decomposition into work areas (maps to `11_IMPLEMENTATION_PLAN.md` phases)

1. **Real DO test runtime** — add `@cloudflare/vitest-pool-workers`/Miniflare pool, port the
   existing DO unit tests to run against the real DO lifecycle.
2. **DO branch coverage** — assert `message_too_large`, `binary_not_supported`,
   `invalid_event`, `invalid_json`, `unsupported_message`, `webSocketClose`,
   `webSocketError`, `426` upgrade.
3. **Presence hardening** — stable per-user keying, hibernation-safe rehydrate, prune loop,
   heartbeat/auto-response.
4. **Connection cap + fanout budget** — per-DO cap with reject close code, per-sender rate
   cap + backoff, configurable via env.
5. **Reconnect + token refresh** — re-authorize-on-reconnect, proactive refresh before
   5-min expiry, surface-change re-track must use a fresh envelope.
6. **Telemetry sink** — wire production sink (Workers Observability logs) for the six event types.
7. **Synthetic load harness** — N-client fanout/presence/broadcast soak under Miniflare.
8. **Hosted smoke (if OPEN-02 approved)** — extend the existing 2-client cursor script with
   presence + reconnect + token-expiry scenarios; else document the gap.
9. **Latency evaluator** — p50/p95 end-to-end delivery harness + budget.
10. **Runbook + observability** — cold-start, deploy-disconnect, cap-exceeded, telemetry
    thresholds, rollback.

## Success metrics (for the future implementation, not this plan)

- All `FR-*`/`REL-*`/`PERF-*` acceptance criteria pass (see `04_…`).
- `bun run test:dom` realtime subset is green with the real DO runtime.
- Synthetic fanout: N clients receive a broadcast within the p95 budget at the chosen cap.
- Hosted smoke (if approved): presence, reconnect-after-close, and survive-token-expiry
  pass against the production Worker.
- No P0/P1 adversarial finding unresolved (see `19_…`).

## Failure metrics (what would block first-user readiness)

- Any unauthenticated or unauthorized socket can broadcast or read presence (regression of
  the existing authz — must be preserved).
- Presence leaks raw route/estimate/tab/cell (regression of the coarse-surface contract).
- A session >5 min silently degrades (token-expiry wedge, F4).
- DO eviction produces stuck/ghost presence (F3/F10).
- Fanout cost causes DO CPU/GB-s blow-through on free tier (F5/F9).

## Constraints (carried from brief + repo policy)

- Free-tier Cloudflare only; no paid add-ons without owner approval (`AGENTS.md`).
- Stay inside the bound resources: Worker `archestimator-proof`, DO `COLLAB_ROOMS`,
  D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images
  `IMAGES`. Never touch the historical Supabase project `ebxxqidacheyapmmzavr` or the
  unrelated `archestimator` provider project.
- Browser automation is opt-in evidence, not a default gate (`AGENTS.md` verification
  policy). Use it only where the claim cannot be proven by smaller tests/scripts.
- Shared-worktree branch policy: no auto-branch/worktree/commit/push.

## Assumptions (labelled, validated against repo evidence)

- **ASSUMP-01 (validated):** The DO is the only realtime transport. No Supabase Realtime is
  active (the `RealtimeAuthBridge` is a retired stub; `realtime-telemetry.ts` confirms).
- **ASSUMP-02 (validated):** Free-tier DO is sufficient for closed-beta (400K GB-s + 1M
  requests/month included since 2025-04-07). First-user load is "a handful of workspaces,"
  not thousands of concurrent sockets per room.
- **ASSUMP-03 (validated):** Cursors ride `estimate:{id}` (sheet-RLS-bounded); presence
  rides `project:{id}` (coarse surface). Both channels use the same DO with different room
  names.
- **ASSUMP-04 (assumption, needs owner confirmation via OPEN-01):** A per-DO cap of ~256
  concurrent sockets is far below the 32,768 platform max and comfortably within the 128 MB
  memory budget for presence-only traffic.
- **ASSUMP-05 (validated):** The existing `feature-flags.ts` kill-switches
  (`NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT`, `_CURSOR_BROADCAST`, `_PROJECT_CURSORS`,
  `_FOLLOW_MODE`) are the rollback knobs; they are build-time (NEXT_PUBLIC_*), so a cap or
  rate-limit change that needs runtime toggling requires a new env/`vars` knob.
