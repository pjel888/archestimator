# Durable Object Operations — O-08

## Class / binding / migration parity — CURRENT_SOURCE_CONFIRMED

| Binding | Class | Migration tag | Storage | Source location |
|---|---|---|---|---|
| `COLLAB_ROOMS` | `CollaborationRoom` | `v1` (`new_sqlite_classes`) | SQLite-backed | `src/lib/cloudflare/collaboration-room.ts:164` |
| `GLOBAL_PRESENCE` | `GlobalPresence` | `v2-admin-dashboard` (`new_sqlite_classes`) | SQLite-backed | `src/lib/cloudflare/global-presence.ts:71` |
| `SUPPORT_INBOX` | `SupportInbox` | `v2-admin-dashboard` (`new_sqlite_classes`) | SQLite-backed | `src/lib/cloudflare/support-inbox.ts:86` |

Parity confirmed — class names match bindings; both migration tags use `new_sqlite_classes`; no `new_classes`/`deleted_classes`/`renamed_classes` drift.

## Actual storage use (counter-intuitive)

All three classes are declared SQLite-backed via `new_sqlite_classes` but **in practice use only the Hibernatable WebSocket API**:

- **CollaborationRoom**: uses `ctx.storage.setAlarm` for the authorization deadline (`collaboration-room.ts:23-25, 460-471`). **No `ctx.storage.sql` or `transaction` calls.** State is held in WebSocket hibernation attachments.
- **GlobalPresence**: **no storage calls at all** (no alarms, no SQL).
- **SupportInbox**: **no storage calls at all**.

> Implication: the SQLite backing is provisioned but unused for current attachments. Infosec UNIT-001 plans to introduce a SQLite-backed denylist in `CollaborationRoom` — that will be the first active SQLite use.

## Object / room ID derivation — CURRENT_SOURCE_CONFIRMED

- `CollaborationRoom`: `COLLAB_ROOMS.idFromName(roomName)` where `roomName` is URL path `/__cloudflare/collaboration-room/<room>` validated against `/^[a-zA-Z0-9:_-]{3,200}$/` (`collaboration-room-router.ts:2,41`).
- `GlobalPresence`: single global instance `GLOBAL_PRESENCE.idFromName("global")` (`global-presence-router.ts:30`).
- `SupportInbox`: per-conversation `SUPPORT_INBOX.idFromName(conversationId)` from path `/__cloudflare/support-inbox/<conversationId>` with the same pattern (`support-inbox-router.ts:2,41`).

## Hibernation

All three use the Hibernatable WebSocket API (`acceptWebSocket`/`getWebSockets`), so they hibernate between messages. This is the recommended cost pattern. Confirmed by `webSocketMessage`/`webSocketClose`/`webSocketError` handlers in each class.

## Alarms / timers — CURRENT_SOURCE_CONFIRMED

- `CollaborationRoom`: alarm fires at `Math.min(...authorizationDeadlines)` (10s deadline per socket). Closes unauthorized sockets with code `4401 authorization_timeout` (`collaboration-room.ts:324-340, 460-471`).
- `GlobalPresence`: uses **JS `setTimeout`** (`PRESENCE_BROADCAST_DEBOUNCE_MS = 1000`) — NOT a DO alarm (`global-presence.ts:10, 187-193`). The timer only fires while the DO is awake; reset on each new join. **Operational risk**: presence-count broadcast may be lost if the DO evicts before the timer fires.
- `SupportInbox`: no alarm, no timer.

## Reconnect

Client-driven; no DO-side session resume or backoff. Each class closes the socket on error (`webSocketClose`/`webSocketError` → `ws.close`).

## Slow-consumer / backpressure — CROSS_REFERENCE_ACTIVE_PACK

- `CollaborationRoom`: rate-limit `MAX_INBOUND_FRAMES_PER_SECOND` per connection over a 1-second sliding window (`collaboration-room.ts:473-490`); over-rate → close `4408 rate_limited`. Capacity `MAX_ROOM_CONNECTIONS` (`:11`) → 429 `room_capacity_exceeded` on `fetch` (`:184-189`). Send failures close `1011, "collaboration_room_send_failed"` (`:84-90`).
- Quality Master UNIT-033 owns **message-specific backpressure** (current behavior is uniform).
- Infosec `SEC-COLLAB-001/002` owns the WS-upgrade anonymity + per-subject capacity defenses (UNIT-013).

## Token expiry / revocation — CROSS_REFERENCE_ACTIVE_PACK

- `CollaborationRoom`: every message re-checks `authorized.exp * 1000 > Date.now()` (`collaboration-room.ts:417-427`). Control endpoint `POST /__cloudflare/collaboration-room/<room>` with `x-collaboration-room-control-secret` and body `{type:"revoke-subject", sub}` closes sockets matching `sub` with code `4403 subject_revoked` (`:492-539`).
- **Infosec `SEC-COLLAB-003`** (High) owns the residual gap: already-issued HMAC realtime room tokens remain valid up to 5 minutes because the DO has no SQLite denylist today. **Infosec UNIT-001** adds the denylist. **This audit (OPS-DO-STORAGE-013)** owns the *hosted proof* that the denylist state is durable and effective.

## Membership removal — CURRENT_SOURCE_CONFIRMED

- `CollaborationRoom`: `webSocketClose`/`webSocketError` broadcasts presence to remaining peers and `ws.close(code, reason)` (`:314-322`).
- `GlobalPresence`: `webSocketClose`/`webSocketError` broadcast count then close (`:144-152`).
- `SupportInbox`: just `ws.close` — no broadcast, no removal bookkeeping (`:174-180`).

## Object state corruption / recovery — NEW_OWNER_HERE (finding OPS-DO-STORAGE-013)

- No operator-quarantine or DO reset runbook exists today.
- DO state is per-object; SQLite-backed DOs support `ctx.storage.sql` but no admin surface exposes a delete/reset.
- Catastrophic corruption path: a new DO migration with `deleted_classes` (destructive — separate authorization).

## Version compatibility across Worker deployments — CURRENT_SOURCE_CONFIRMED + OPERATOR_RISK

- DO class names are stable; `worker.ts:58-61` re-exports them.
- The OpenNext DO exports (`BucketCachePurge`, `DOQueueHandler`, `DOShardedTagCache`) must remain exported for deploy.
- **Risk**: if a deploy renames or removes a DO class without a migration tag, in-flight DOs can fail. Pre-deploy check: confirm `durable_objects.migrations` covers any class-name change.

## Logging

- Each DO closes sockets with a defined close code and reason string (e.g. `4403 subject_revoked`).
- Send failures emit `console.log`/`console.error` (routed through Workers Logs).
- No structured event emission from DO state itself (the cron-run-event pattern is not used for DO events).

## Capacity / cost

- `CollaborationRoom` `MAX_ROOM_CONNECTIONS` from `COLLABORATION_CAPACITY_CONTRACT.maxRoomConnections` (`:11`).
- `MAX_MESSAGE_BYTES` enforced per class (CollaborationRoom, GlobalPresence 2048, SupportInbox 8192).
- Cost is per-DO-instance wall time + requests + SQLite rows (when used).

## Safe operational reset / quarantine — NEW_OWNER_HERE

- **No documented procedure today.** Finding `OPS-DO-STORAGE-013` calls for:
  - Read-only inspection: `bunx wrangler deployments tail` or DO list (AUTH-001).
  - Documented quarantine: tag-based deletion via a new DO migration (destructive).
  - Per-room evict: trigger `revoke-subject` via control secret (existing path for CollaborationRoom).
