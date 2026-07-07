# 07 — Data, Database, API, and Network Plan

## Data ownership and storage

| Data | Store | Owner | Notes |
|---|---|---|---|
| Room admission HMAC token | ephemeral (issued by Server Action, held in client memory, verified by DO) | `realtime-room-token.ts` | 300s TTL, not persisted |
| Ed25519 identity envelope | ephemeral (client memory) | `realtime-identity-server.ts` | 300s TTL, not persisted |
| Per-socket attachment | DO WebSocket attachment (**≤2,048 bytes serialized**; official limit — [DO WebSockets API](https://developers.cloudflare.com/durable-objects/api/websockets/), `serializeAttachment`) | `CollaborationRoom` | survives hibernation, lost on close |
| Presence snapshot | derived (not stored) | `CollaborationRoom` | rebuilt from attachments |
| DO SQLite | **unused** (provisioned by `new_sqlite_classes`) | reserved | FR-08 keeps it unused |
| D1 `collaboration_audit_events` | D1 (`ARCH_DB`) | retention cron (`30 3`) | **not** the realtime path; unaffected |

**No D1 schema change, no migration, no R2, no Queue change is required by this plan.** This
is a DO + client hardening plan. The Database Change Blueprint section is therefore `not
applicable with reason: no database change in scope`.

## Access-path matrix (mandatory — every planned source × runtime path × authz × proof)

| Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| HMAC room token (admission credential) | `issueRealtimeRoomToken` (SA) → client memory → DO `verifyRealtimeRoomToken` | client→DO; SA issues, DO verifies | SA: `canAccessProjectInD1`/`canAccessEstimateInD1` before issue; DO: timing-safe HMAC + `topic` match + `exp` re-check per message | 300s TTL, `v:1`; no DB row; no rotation API | existing `cloudflare-collaboration-room-auth.test.ts` (round-trip) + `test:do` (post-FR-01) | kill-switch `NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT=off` |
| Ed25519 identity envelope | `issueRealtimeIdentityEnvelope` (`"server-only"`) → client → peer `verifyRealtimeIdentity` | server signs; client verifies | SA authz probe (above) gates issuance; receiver binds `topic`+`sub`+`exp` | 300s TTL, Ed25519, `kid` rotation tag | existing `realtime-identity.test.ts` spoof matrix | peers drop on verify-fail; no fallback (intended) |
| D1 authz probe (project/estimate membership) | `getCloudflareD1Database(env.ARCH_DB)` → `canAccessProjectInD1`/`canAccessEstimateInD1` (`src/lib/authz/d1-access.ts`) | SA (issuance only; DO never reads D1) | membership/admin per the existing helpers; respects restricted-sheet mode | active D1; migration-clean; no RLS parity debt (post-Cloudflare migration) | existing `realtime-identity-actions-authz.test.ts` | **D1 unavailable → SA returns null → client does not subscribe** (fail-closed, existing) |
| `COLLAB_ROOMS` DO binding | `env.COLLAB_ROOMS.idFromName(topic).get(id).fetch(request)` (`worker.ts:83-84`) | Worker→DO | none at the binding; authz is the HMAC token inside the DO | `new_sqlite_classes:["CollaborationRoom"]` tag v1 (`wrangler.jsonc:53-58`) | `cloudflare-collaboration-room-router.test.ts` (binding-present + 503-missing) | binding missing → 503 `collaboration_room_binding_missing` |
| DO SQLite storage | (none — code never reads/writes) | n/a | n/a | **unused** (FR-08 decision); reserved for a future audit/seat feature | grep: zero `ctx.storage`/`sql.exec` calls in `collaboration-room.ts` | n/a |
| D1 `collaboration_audit_events` | retention cron `30 3 * * *` → `runRetentionPassInD1` (`worker.ts:109-115`, `retention-core.ts:31`) | scheduled Worker | `UPLOAD_CLEANUP_JOB_SECRET`/`CRON_SECRET` | retention target, batch-deletes >cutoff rows | retention tests | **NOT the realtime path** — unaffected by this plan |
| Per-sender rate window (FR-05, future) | DO in-memory `Map<verified-sub, {count,windowStart}>` | DO only | keyed by `attachment.authorized.sub` (verified) | absent in code today; T-4.1.1 future work | `test:do` rate (AQ-06/07/07b) | resets on DO wake (acceptable soft guard) |
| Connection cap (FR-04, future) | `getWebSockets().length` vs `env.ARCH_REALTIME_ROOM_CAP` | DO `fetch` (pre-handshake) | enforced before authz (SEC-02) | `vars` entry absent today; T-3.3.1 future work | `test:do` cap flood (AC-SEC-02) | cap unset → use documented default (ASSUMP-04) |

No chosen runtime path is blocked by current D1 migrations, app-authz, or object policies:
the only D1 touch (authz probe) is active and migration-clean; the DO SQLite is intentionally
unused; no R2/Queue/Email/KV involvement. If FR-04/FR-05 vars are not added, the fallback
(documented default cap/budget in code) keeps the path working — not a P0 blocker.

## API / network contracts

### WebSocket upgrade
- **URL:** `wss://<host>/__cloudflare/collaboration-room/<topic>` where `topic` matches
  `^(project|estimate):[0-9a-f-]{36}$` (server-action gate) and the room-name regex
  `^[a-zA-Z0-9:_-]{3,200}$` (router gate).
- **Upgrade:** `Upgrade: websocket` required; else `426` (FR-02).
- **Cap (FR-04/SEC-02):** if `getWebSockets().length >= cap`, reject with close `1013`
  (Try Again Later) **before** authz.

### Client → DO message schema (JSON, ≤4096 bytes)
| `type` | Fields | Behavior |
|---|---|---|
| `authorize` | `token: string` (HMAC) | verify; on success `{type:"authorized"}`; else `{type:"error",code:"auth_failed"}` |
| `broadcast` | `event: string (≤80)`, `payload?: unknown` | fan out to authorized peers |
| `presence-track` | `payload: ProjectPresencePayload` | store in attachment; broadcast presence snapshot |
| `presence-untrack` | (none) | clear presence from attachment; broadcast snapshot |
| (ping) | fixed string (FR-07 auto-response) | auto-replied without waking DO |

### DO → client message schema
| `type` | Fields |
|---|---|
| `authorized` | (none) |
| `broadcast` | `event`, `payload` |
| `presence-state` | `state: Record<userId, [ProjectPresencePayload]>` (FR-03: keyed by userId) |
| `error` | `code: "auth_required"|"auth_failed"|"message_too_large"|"invalid_event"|"invalid_json"|"binary_not_supported"|"unsupported_message"|"rate_limited"|"cap_exceeded"` |

### Versioning
- Wire contract is unversioned at the transport layer (the estimate-tree payload has its own
  `schemaVersion: 2`). Hardening does not change the transport schema; FR-03 changes the
  **key** of `presence-state.state` from `connection:${index}` to `userId`. **Backward
  compatibility note:** the client `presenceState()` consumer in
  `collaboration-room-client.ts` reads `state` into `currentPresenceState` generically; the
  presence hook iterates `Object.values(state)`, so a key change is transparent to it. No
  client co-deploy is required for FR-03, but the future impl should verify by test.

## Idempotency / retries / timeouts

| Path | Idempotency | Retry | Timeout |
|---|---|---|---|
| `authorize` | re-authorize is idempotent | client retries on reconnect (FR-06) | 10s subscribe timeout (existing) |
| `broadcast` | app events should be idempotent (estimate-tree contract v2) | not retried by transport (FR-05 may drop) | n/a |
| `presence-track` | re-track refreshes timestamp | retried on reconnect + visibility | n/a |
| `issueRealtimeIdentity` (Server Action) | idempotent per session | client refreshes before expiry (FR-06) | Next action default |

## Rate limits / abuse

- **Per-DO connection cap (FR-04):** value per OPEN-01; rejects above.
- **Per-sender broadcast cap (FR-05):** value per OPEN-01; `rate_limited` on excess.
- **Server-action authz probe:** unchanged (`canAccessProjectInD1`/`canAccessEstimateInD1`).
- **No Cloudflare WAF/rate-limit rule change** in this plan (front-door rate limiting is a
  separate concern; the DO-level cap is the realtime guard).

## Network behavior

- **Latency budget (PERF-01):** see `19_…` evaluator. p95 end-to-end delivery target to be
  set per OPEN-01; default assumption <500ms at the chosen cap on free-tier Workers.
- **Reconnect (FR-06):** jittered linear backoff, cap 5s, 3 retries (existing) — extend with
  re-authz + refresh.
- **Deploy-disconnect (F7):** platform closes all sockets on deploy; client reconnects.

## Partial-failure behavior

| Partial failure | Behavior |
|---|---|
| DO binding present but DO errors | Worker returns DO error; client `CHANNEL_ERROR` → backoff |
| Token secret missing on DO | `auth_failed` for all; client retries then stops |
| D1 unavailable (authz probe) | Server Action returns null; client does not subscribe |
| One peer's send fails | DO closes that socket (1011); presence corrected on close |
| Client network half-open | auto-response ping stops; prune-on-alarm removes (FR-07) |

## Shadow path note

See `04_…` Flow A–E matrices for the full nil/empty/invalid/auth-denied/concurrency/retry
coverage. No additional database/API shadow paths apply (no DB change).

## Provider-proof boundary

- **Local static/automated:** all unit/DOM/workers-pool tests, synthetic load harness.
- **Provider-backed:** a hosted Worker probe (TEST-02) is the only provider-backed proof,
  gated on OPEN-02. Without it, scale/hosted claims are `inferred` from Miniflare + source
  review and labelled as such.
- **Hosted/production:** none claimed from local checks.
