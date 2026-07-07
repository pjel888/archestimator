# 01 — Executive Summary

## What this plan is

A planning-only package that prepares the Cloudflare Durable Object realtime collaboration
surface (`COLLAB_ROOMS` → `CollaborationRoom`) for **first-user load and documented failure
cases**, within free-tier limits and the current DO binding. It does not implement anything.

The realtime path is wired and unit-tested at the contract/identity/authz layer, but it is
**unproven at scale and under failure**: there is no real Durable Object runtime in the test
suite, no fanout/load/latency harness, no hosted presence or reconnect proof, no
token-expiry-mid-session handling, several DO code branches are untested, and the DO uses
zero durable storage (presence is reconstructed from live socket attachments only).

## Current-state architecture (one paragraph)

A Next.js 16 / React 19 app on OpenNext-Cloudflare-Workers. Realtime is a single Cloudflare
Durable Object class `CollaborationRoom` (`src/lib/cloudflare/collaboration-room.ts`),
bound as `COLLAB_ROOMS`, routed from `worker.ts` via
`routeCollaborationRoomRequest` on the path `/__cloudflare/collaboration-room/<room>`. It
uses the **WebSocket Hibernation API** (`ctx.acceptWebSocket`/`getWebSockets`,
`webSocketMessage`/`webSocketClose`/`webSocketError`, `serializeAttachment`/
`deserializeAttachment`). The browser opens a `WebSocket` via
`src/lib/cloudflare/collaboration-room-client.ts`; React hooks
(`use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`,
`use-estimate-row-update-broadcast.ts`) drive presence, cursors, and row updates. Two
cryptographics run in parallel: an HMAC **room-admission token** (5-min TTL, verified by the
DO on `{type:"authorize"}`) and an Ed25519 **sender-bound identity envelope** (5-min TTL,
verified by receivers client-side). The `project:{id}` channel carries only a coarse
`activeSurface` enum (never raw route/estimate/tab/cell); sheet-granular state rides
`estimate:{id}`.

## Target-state architecture (one paragraph)

Same user-facing behavior, hardened: (1) a real DO runtime in tests (`@cloudflare/vitest-
pool-workers`/Miniflare) exercising the actual hibernation lifecycle, close/error branches,
and message-size limits; (2) presence keyed by a **stable per-user id** (not
`connection:${index}`), with **hibernation-safe rehydration** so presence survives DO
eviction; (3) bounded fanout (per-message O(n) with a documented socket cap and a broadcast
batching budget); (4) reconnect that **survives token expiry mid-session** (re-authorize on
reconnect, not just resubscribe); (5) stale-presence cleanup (heartbeat/auto-response +
prune) and a connection/room cap; (6) an optional but defined SQLite-backed room lifecycle
only if persistence is justified; (7) synthetic load proof, hosted smoke proof (presence +
reconnect + token-expiry, not just cursors), and explicit degradation behavior (transport
disabled, DO cold-start, deploy-disconnect, partial network loss).

## Headline findings

1. **F1 — No real DO runtime in tests.** The `CollaborationRoom` DO is never instantiated by
   Miniflare/workerd. `acceptWebSocket`, `webSocketClose`, `webSocketError`, hibernation
   eviction/rehydrate, and SQLite storage are entirely unexercised. The "real" DO runs only
   against a fake `ctx` with `vi.fn()` stubs.
   (`src/lib/cloudflare/collaboration-room.ts`; `tests/vitest/cloudflare-collaboration-room-auth.test.ts`)
2. **F2 — Untested DO branches.** `message_too_large` (4096-byte limit),
   `binary_not_supported`, `invalid_event` (>80 chars), `invalid_json`,
   `unsupported_message`, `webSocketClose`, `webSocketError`, and the `426
   websocket_upgrade_required` response are not asserted anywhere.
   (`collaboration-room.ts:7-8, 102-167`)
3. **F3 — Presence keying is fragile.** Presence is keyed `connection:${index}` from the
   `getWebSockets()` iteration order, which can shift on any connect/disconnect and is
   wiped on hibernation. Stale or duplicate presence rows can appear under churn.
   (`collaboration-room.ts:186-202`)
4. **F4 — No proactive token refresh.** Both the HMAC room token and the Ed25519 envelope
   expire after 300s. There is no background refresh; surface-change re-tracks reuse the
   cached (possibly stale) envelope. A session >5 min will hit `auth_failed`/envelope-reject
   with no recovery path other than a full resubscribe.
   (`realtime-room-token.ts`; `realtime-identity-server.ts`; `use-project-presence.ts:310-318`)
5. **F5 — Zero load/fanout/latency proof.** No "N clients join, one broadcasts, all N
   receive within X ms" harness exists. The only load harness is HTTP route-transition
   (`perf:profile-peak-load`). Hosted realtime proof is a single 2-client cursor scenario
   with no presence, reconnect, or token-expiry coverage.
6. **F6 — DO uses zero durable storage.** `new_sqlite_classes` provisions SQLite, but the
   code never reads/writes it. Presence is ephemeral; room state resets on eviction. This is
   acceptable for presence but must be an explicit decision, not an accident.
7. **F7 — Deploy disconnects all sockets, no draining.** Cloudflare DO code deploys restart
   every DO and drop all WebSockets; reconnect is entirely client-side. The client retry
   (3 attempts, linear backoff capped at 5s) is tested with a single retry tick only.
8. **F8 — Telemetry silently drops in production.** `reportRealtimeEvent` no-ops in prod
   unless a sink is registered; none is wired. `channel_error`/`auth_refresh_failed`/
   `closed` are invisible in prod today.
9. **F9 — Server-side realtime rate limit is an open owner decision.** The Teamspace plan
   (D-1) deferred the project-wide page-cursor layer behind a 500 msg/s Supabase-tier
   assumption that no longer applies (we are on a DO now). The free-tier DO has no
   per-message rate limit; abuse/throttle posture is undefined.
10. **F10 — DO eviction/cold-start is unmodeled.** No test or runbook covers "DO hibernated,
    first message wakes it, constructor reruns, presence rehydrates" — the documented
    behavior that in-memory state is wiped on hibernation.

## Major decisions (preview — full rationale in `15_…`)

- **DEC-DO-01:** Adopt `@cloudflare/vitest-pool-workers` (Miniflare/workerd) to exercise the
  real DO lifecycle in tests. (Rejected: keep mocking; insufficient — F1.)
- **DEC-DO-02:** Key presence by a stable per-user id from the verified envelope `sub`, not
  `connection:${index}`, and rehydrate presence from `getWebSockets()`+attachments on every
  change (hibernation-safe). (Rejected: persist presence in SQLite — unnecessary for an
  ephemeral signal; revisit if F6 is reversed.)
- **DEC-DO-03:** Add proactive token refresh before expiry with a re-authorize-on-reconnect
  path so sessions >5 min survive. (Rejected: extend TTL to 24h — weakens the
  short-lived-credential security property.)
- **DEC-DO-04:** Add a per-DO **connection cap** (e.g. 256/room, well under the 32,768
  platform max) and per-sender **broadcast rate cap** with backoff, all configurable via
  env/vars. Reject new connections with a documented close code above the cap.
- **DEC-DO-05:** Add a heartbeat/auto-response (`ctx.setWebSocketAutoResponse`) + prune loop
  for stale presence, scheduled via the single DO alarm (at-least-once, ≤15-min wall budget).
- **DEC-DO-06:** Keep the DO storage-free for presence (ephemeral by design) but make the
  decision explicit; DO SQLite is reserved for a future audit/seat-count feature if needed.
- **DEC-DO-07:** Wire a production telemetry sink (Cloudflare Workers Observability logs +
   `console.*` structured JSON — already enabled at `head_sampling_rate: 0.1`) for the six
   realtime event types; no new paid sink.
- **DEC-DO-08:** Resolve F9 (server-side rate limit) as an owner-delegated planning decision:
  enforce the cap inside the DO (DEC-DO-04) rather than a separate limiter, since the DO is
  the single sharded authority per room. Requires owner sign-off (D-1 lineage).

## Remaining external decisions (BLOCKED-EXTERNAL)

- **OPEN-01 (D-1 lineage):** Owner confirms the per-DO/per-sender caps' numeric values and
  whether the project-wide page-cursor layer (`NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS`,
  currently OFF) may be enabled for closed beta.
- **OPEN-02:** Owner confirms whether a hosted soak against the production Worker (real DO,
  multiple browser/WS clients) is in scope for closed-beta readiness, or whether the
  synthetic Miniflare load + a lighter hosted presence smoke is sufficient.
- **OPEN-03:** Owner confirms the production telemetry sink choice (Workers Observability
  logs vs. a future Clarity/Sentry integration) for F8.

## Readiness scores (initial → target; final in `17_…`)

See `17_FINAL_READINESS_REVIEW.md` for the full table. Targeting overall ≥95 with no
internally-resolvable blocker; the score is capped by `verification_mode` and by OPEN-01/02/03.

## Plan status

See `README.md` for the canonical suite label. This plan is `CONDITIONALLY READY`: the
internally-resolvable slices (DEC-DO-01..07, test/proof harness) are implementation-ready;
the numeric caps (OPEN-01) and hosted-soak scope (OPEN-02) are owner-gated and isolated.
