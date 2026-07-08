# 03 — Source and Codebase Audit

All paths are repo-relative. Line numbers reference the current `main` HEAD at planning
time. "Modify/Extend/Reuse/Unchanged" is the expected impact classification for the **future
implementation**, not this plan (this plan touches no application code).

## A. Cloudflare DO core

| Path | Symbol | Responsibility | Relevance | Expected impact |
|---|---|---|---|---|
| `src/lib/cloudflare/collaboration-room.ts` | `class CollaborationRoom` | The DO. `fetch` upgrades WS; `webSocketMessage` dispatches authorize/broadcast/presence-track/presence-untrack; `webSocketClose`/`webSocketError` broadcast presence; `broadcast`/`broadcastPresenceState`/`readPresenceState` iterate `getWebSockets()`; `authorizeSocket` verifies HMAC room token; `isSocketAuthorized` checks topic+exp on every message. | Central. F1–F10 all live here. | **Modify** (presence keying, cap, rate-limit, heartbeat, reconnect hooks, storage decision). |
| `src/lib/cloudflare/collaboration-room.ts:7-8` | `MAX_MESSAGE_BYTES=4096`, `MAX_EVENT_NAME_LENGTH=80` | In-DO message limits. | F2 (untested). | Reuse; add tests. |
| `src/lib/cloudflare/collaboration-room.ts:186-202` | `readPresenceState` | Builds `state[`connection:${index}`]` from socket attachments. | F3 (fragile keying). | **Modify** (stable per-user key). |
| `src/lib/cloudflare/collaboration-room.ts:159-167` | `webSocketClose`/`webSocketError` | Calls `broadcastPresenceState(ws)` then `ws.close(...)`. | F1/F2 (untested lifecycle). | Reuse; add tests; consider hibernation-safe rehydrate. |
| `src/lib/cloudflare/collaboration-room-router.ts` | `parseCollaborationRoomName`, `routeCollaborationRoomRequest`, `CloudflareCollaborationRoomEnv` | Worker→DO routing; room-name regex `^[a-zA-Z0-9:_-]{3,200}$`; 503 on missing binding. | Routing contract (well-tested). | Unchanged (cap enforcement belongs in the DO, not the router). |
| `worker.ts:11-14, 35, 83-84` | imports + `export { CollaborationRoom }` + `routeCollaborationRoomRequest(request, env)` call | Worker entry; binds the DO class and routes the room path. | Wiring. | Unchanged unless cap needs a Worker-level knob (prefer DO-level). |

## B. Browser client + hooks

| Path | Symbol | Responsibility | Relevance | Expected impact |
|---|---|---|---|---|
| `src/lib/cloudflare/collaboration-room-client.ts` | `CollaborationRoomBrowserSocket`, `createCloudflareCollaborationRoomClient`, `buildCollaborationRoomUrl`, `SUBSCRIBE_TIMEOUT_MS=10_000` | Browser WebSocket wrapper; `authorize`/`send`/`track`/`untrack`; single subscribe timeout; `close()` sends `presence-untrack`. | F4 (no re-authorize on reconnect), F7. | **Modify** (reconnect path; the hook owns retry, the client owns the socket lifecycle). |
| `src/hooks/use-project-presence.ts` | `useProjectPresence`, `MAX_PRESENCE_RESUBSCRIBE_RETRIES=3`, `scheduleResubscribe`, `provisionIdentity`, `syncPresence`, `buildPayload`/`buildSurfacePayload` | Presence hook: subscribe→authorize→track; verify peer envelopes (cached); linear backoff `min(1000*retries,5000)`; visibility re-track. | F4 (no token refresh; surface-change reuses stale envelope), F7 (retry tested once). | **Modify** (refresh-before-expiry; re-authorize-on-reconnect; fresh envelope on re-track). |
| `src/hooks/use-estimate-cursor-broadcast.ts` | `useEstimateCursorBroadcast`, `ESTIMATE_COLLABORATION_CHANNEL_PREFIX`, `CURSOR_BROADCAST_MIN_DISTANCE_PX` | Estimate-channel cursor broadcaster (80ms throttle, 6px min-distance). | F4/F7 (shares the auth path). | **Modify** (same reconnect/refresh treatment as presence). |
| `src/hooks/use-estimate-row-update-broadcast.ts` | row-update broadcaster | Estimate-channel row updates; 30s max-age validation. | F4/F7. | **Modify** (same). |
| `src/components/realtime-auth-bridge.tsx` | `<RealtimeAuthBridge>` | **Retired stub** returning `null`. | None (regression-guarded). | Unchanged. |

## C. Token / identity / telemetry / surface / flags

| Path | Symbol | Responsibility | Relevance | Expected impact |
|---|---|---|---|---|
| `src/lib/collaboration/realtime-room-token.ts` | `RealtimeRoomTokenClaims`, `readRealtimeRoomTokenSecret`, `issueRealtimeRoomToken`, `verifyRealtimeRoomToken`, `DEFAULT_ROOM_TOKEN_TTL_SECONDS=300`, `CLOCK_SKEW_MS=30_000` | HMAC room-admission token (5-min TTL); secret read order: `REALTIME_ROOM_TOKEN_SECRET`→`REALTIME_IDENTITY_SIGNING_KEY`→`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`→`COLLABORATION_INVITE_PEPPER`. | F4 (TTL). | Reuse (do not weaken); future impl may add a refresh endpoint. |
| `src/lib/collaboration/realtime-identity.ts` | `RealtimeIdentityEnvelope`, `verifyRealtimeIdentity`, `importVerifyKey`, `canonicalEnvelopeMessage` | Isomorphic Ed25519 verify half (browser-safe). | F4 (envelope 300s TTL). | Reuse; tests already strong. |
| `src/lib/collaboration/realtime-identity-server.ts` | `getRealtimeSigningKey`, `issueRealtimeIdentityEnvelope` (`"server-only"`) | Ed25519 signing half; private key never reaches client. | F4. | Reuse. |
| `src/lib/collaboration/realtime-identity-actions.ts` | `issueRealtimeIdentity` (`"use server"`) | Server action: authz→terms→D1 probe (`canAccessProjectInD1`/`canAccessEstimateInD1`)→issue envelope+room token. | Authz boundary. | Reuse (potentially extend to support a refresh call). |
| `src/lib/collaboration/realtime-telemetry.ts` | `reportRealtimeEvent`, `setRealtimeTelemetrySink`, `RealtimeTelemetryType` | 6 event types; **silently drops in prod** unless sink registered. | F8. | **Modify** (wire a prod sink; or document the gap). |
| `src/lib/collaboration/presence-surface.ts` | `ActiveSurface`, `routeToActiveSurface`, `readCurrentActiveSurface`, `isActiveSurface` | Coarse surface allowlist; **never** raw route/estimate/tab/cell. | Contract law (F-security). | Unchanged (preserve). |
| `src/lib/collaboration/feature-flags.ts` | `isRealtimeTransportEnabled`, `isCursorBroadcastEnabled`, `isProjectPageCursorsEnabled`, `readTeamspaceFeatureFlags` | Build-time kill-switches; default OFF in `next dev`. | Rollback knobs. | Reuse; a runtime cap knob is a new `vars` entry in `wrangler.jsonc` (not NEXT_PUBLIC). |
| `src/lib/collaboration/estimate-tree-realtime-contract.ts` | `ESTIMATE_TREE_REALTIME_CONTRACT_VERSION=2`, `isEstimateTreeRealtimeEvent` | Wire contract for estimate-tree events. | Contract (tested). | Unchanged. |
| `src/lib/collaboration/types.ts` | `ProjectCollaboratorSummary`, `realtime` block | DTOs; `realtime.privateChannels:true`, `projectChannel:"project:${string}"`, `estimateChannelPrefix:"estimate:"`, `presenceTransport:"presence"`, `cursorTransport:"broadcast"`. | Type contract. | Unchanged. |

## D. Tests (realtime subset) — current coverage

| Test file | Type | Real DO? | Covers | Gap |
|---|---|---|---|---|
| `tests/vitest/cloudflare-collaboration-room-router.test.ts` | unit + source-string contract | No (inline stub) | routing, 400/503, next-dev-no-DO guard | no live DO |
| `tests/vitest/cloudflare-collaboration-room-auth.test.ts` | unit (real `CollaborationRoom` class, fake ctx + fake sockets) | No runtime, real class | auth/token, fanout-to-1-peer, presence withheld from unauthorized | F1 (no hibernation/close/error), F2 (size/branch), F3 (keying), F5 (scale) |
| `tests/vitest/project-collaboration-realtime.test.ts` | DOM (`renderHook`) + source-string contract | No (fake client) | presence payload scope, roster-from-sync, StrictMode, **1 CLOSED→reopen** | F4 (no token refresh), F7 (single retry tick only) |
| `tests/vitest/realtime-identity.test.ts` | unit (crypto round-trip) | No | envelope spoof-resistance (B-claims-A, expired, wrong-topic, tampered) | none for its scope |
| `tests/vitest/realtime-identity-actions-authz.test.ts` | unit (mocked D1/auth) | No | authz probe per topic, fail-closed on D1-missing | none for its scope |
| `tests/vitest/project-collaboration-tree-contract.test.ts` | contract | No | v2 estimate-tree event discriminator | none for its scope |
| `tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts` | proof-script unit | No (string asserts) | aggregates declarations | **never executes the DO** |
| `tests/vitest/cloudflare-hosted-collaboration-ui-proof-script.test.ts` | proof-script unit | No (canned input) | hosted readiness reducer | live drive is a separate Playwright script |
| `tests/vitest/cloudflare-hosted-collaboration-invitation-proof-script.test.ts` | proof-script unit | No | D1 invitation accept-state | not realtime |
| `tests/vitest/cloudflare-d1-collaboration-invitation-proof-script.test.ts` | proof-script unit | No | invitation token lifecycle | not realtime |
| `tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx` | DOM | No | **Supabase-realtime-removed** regression guard | not realtime-path |

## E. Hosted proof + scripts

| Path | Responsibility | Relevance |
|---|---|---|
| `scripts/verify-cloudflare-hosted-collaboration-ui-proof.ts` (`cf:verify-hosted-collaboration-ui`) | **Only live-DO smoke**: Playwright, 2 contexts, asserts `data-estimate-cursor-channel==="subscribed"`, 10 pointermoves, remote cursor renders. | F5/F-hosted: extend with presence + reconnect + token-expiry. |
| `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` (`cf:check-d1-auth-realtime`) | Readiness aggregator (string checks). | Augment to assert the new cap/refresh actually exist in source. |
| `scripts/benchmark-estimate-cursor-broadcast.ts` | **Local guard benchmark** only (cursor-distance queue gate, synthetic pointer arrays). Explicitly not a realtime-path load test. | Reference for a future fanout timer harness. |

## F. Config / package / cron

| Path | Relevant content | Relevance |
|---|---|---|
| `wrangler.jsonc` | `COLLAB_ROOMS`→`CollaborationRoom`; `new_sqlite_classes:["CollaborationRoom"]` (tag v1); compat date `2026-06-29`; flag `nodejs_compat`; observability enabled (logs 0.1, traces 0.05); crons `0 3`, `15 3`, `30 3`; `vars` (upload memory/limits). | Binding + free-tier posture + telemetry sink surface. |
| `wrangler.next-dev.jsonc` | Deliberately omits DO/migrations/observability (realtime OFF in plain `next dev`). | Test-runtime decision: do not rely on next-dev for DO proof. |
| `package.json` | `test:dom`=`vitest run --maxWorkers=1`; `vitest ^4.1.9`; `wrangler ^4.105.0`; `@playwright/test ^1.60.0`; **no** `@cloudflare/vitest-pool-workers`; **no** direct `miniflare`. | DEC-DO-01 adds the pool-workers devDep. |
| `vitest.config.ts` | `environment:"jsdom"`, `fileParallelism:false`, `testTimeout:30_000`. | Pool-workers needs a separate project/config; jsdom stays for DOM tests. |
| `worker.ts:97-116` (`scheduled`) | Crons: `0 3`→upload-cleanup, `15 3`→upload-scan, `30 3`→retention pass (`runRetentionPassInD1`). | **No cron touches the DO.** Stale-presence prune must use the DO alarm, not a cron. |
| `src/lib/compliance/retention-core.ts:31,99-105` | `"collaboration_audit_events"` is a D1 retention target (D1 audit, not realtime). | Confirms DO is untouched by retention. |

## G. Decisions / specs / prior plans (authority, not source)

| Path | Status | Load-bearing for this plan |
|---|---|---|
| `.ai/10_state/decisions.md` → "2026-06-14 Teamspace Improvement Plan implemented" | ACTIVE | D-1 (project-cursors build-but-hold), D-4 (viewer cursors: no), D-6 (follow mode: defer), identity trust model, coarse-surface contract, T1.3 (server-side rate limit deferred). |
| `.ai/06_specs/teamspaces-collaboration-spec.md` | ACTIVE (MVP slice; transport language partially superseded by DO) | Access model, role hierarchy, channel design. |
| `.ai/09_archive/2026-06-14-Teamspace-Improvement-Plan/` | ARCHIVED but ACTIVE design authority | `06_LIVE_PRESENCE_AND_CURSORS_DESIGN.md`, `10_MEASUREMENT_AND_QA.md` (capacity-smoke methodology). |
| `.ai/09_archive/2026-06-19-Launch-Readiness-Audit/Realtime-Collaboration-Presence/` | ACTIVE triage input | REALTIME-01 (server-side rate limit), REALTIME-02 (presence-spoof residual). |
| `.ai/00_system/VALIDATION_MATRIX.md` | ACTIVE | Proportional gating; proof-label conventions. |
| `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/22_PROOF_CONTRACTS_AND_KNOWN_RED_LEDGER.md` | ACTIVE convention | Known-red ledger: `bun run type-check` needs `NODE_OPTIONS=--max-old-space-size=8192`. |

## H. Systematic repository inventory (claim basis)

The four dispatched subagents performed: (1) full realtime test/script inventory
(11 files + 4 scripts + dep grep); (2) official Cloudflare DO/WS doc retrieval with
citations; (3) full `src/lib/collaboration/**` + hooks + worker.ts trace; (4) full `.ai/`
tree scan (decisions, specs, all 51 plan packs, roadmap, current-state Fast Path). This
constitutes a systematic inventory of the realtime surface, its tests, its config, and its
authority docs — not a whole-repo dump (out of scope: unrelated features).

## Call-chain summary (request → delivery)

```
Browser hook (use-project-presence / use-estimate-*-broadcast)
  → issueRealtimeIdentity({topic})                 [Server Action; authz + D1 probe]
      → issueRealtimeIdentityEnvelope (Ed25519)    [server-only]
      → issueRealtimeRoomToken (HMAC, 300s)        [shared secret]
  → createCloudflareCollaborationRoomClient().openRoom(topic)
      → new WebSocket("wss://…/__cloudflare/collaboration-room/<topic>")
  → worker.ts routeCollaborationRoomRequest(request, env)
      → COLLAB_ROOMS.idFromName(topic).get(id).fetch(request)
          → CollaborationRoom.fetch (upgrade) → ctx.acceptWebSocket(server)
  → client sends {type:"authorize", token}
      → CollaborationRoom.webSocketMessage → authorizeSocket → verifyRealtimeRoomToken
  → client sends {type:"broadcast"/"presence-track"/"presence-untrack"}
      → CollaborationRoom.webSocketMessage → broadcast / broadcastPresenceState
          (O(n) over ctx.getWebSockets(); authorized peers only)
  → peers' hooks verifyRealtimeIdentity(envelope) client-side
```

Failure/edge points marked ⚠ are the ones this plan addresses (hibernation eviction,
deploy-disconnect, token expiry, cap exceedance, stale presence, untested branches).
