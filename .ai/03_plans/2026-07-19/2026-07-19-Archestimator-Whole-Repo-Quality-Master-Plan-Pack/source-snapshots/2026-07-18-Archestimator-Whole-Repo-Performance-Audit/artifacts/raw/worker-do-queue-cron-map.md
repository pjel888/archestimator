# Worker / DO / Queue / Cron Surface Map

Source: dispatched agent recon against `HEAD = a41a07d0143abf72289a97cd8bd023cfa9986361`.

## Worker Pre-Routing Chain (`worker.ts:141-199`)

Order of branches (each short-circuits or returns null to fall through):

1. `resolveRequestId` — reads `x-request-id`, generates `req_<uuid>`, AsyncLocalStorage context wrap.
2. `routeCanonicalHostRedirect` (`worker.ts:146`; impl `worker-route-optimizations.ts:141-151`). One `new URL()` + `Map.get`. No IO.
3. `routeAuthStateMismatchRetry` (`worker.ts:149`; impl `:236-248`). On match: up to **60 Set-Cookie headers** per response (4 names × 5 paths × 3 domains).
4. `routeAuthCallbackStateMismatchRetry` (`worker.ts:152`; impl `:250-261`).
5. `routeAuthStateResetLoginCompletion` (`worker.ts:155`; impl `:263-283`).
6. `routeCloudflareFastHealthRequest` (`worker.ts:158`; impl `:127-139`).
7. `routeMalformedShareTokenRequest` (`worker.ts:161`; impl `:302-318`).
8. `routeCloudflareProtectedProofRequest` (`worker.ts:164`; impl `protected-proof-routes.ts:23-60`). Pathname parse on every request; 6 pathname checks.
9. `routeCollaborationRoomRequest` (`worker.ts:167`; impl `collaboration-room-router.ts:29-43`). DO subrequest when matched.
10. `routeGlobalPresenceRequest` (`worker.ts:173`; impl `global-presence-router.ts:22-32`).
11. `routeSupportInboxRequest` (`worker.ts:179`; impl `support-inbox-router.ts:29-43`).
12. `routeStaticPublicPageThroughCache` (`worker.ts:185-190`; impl `:320-360`). GET + no cookie/auth + 10 marketing paths only.
13. `openNextWorker.fetch` (`worker.ts:192`). Response post-processed by `normalizeAuthStateMismatchRedirectResponse`.

**Per-request cost**: every request pays up to ~6 `new URL()` parses. WS upgrade responses bypass `responseWithRequestId` wrapper.

## Durable Objects

### CollaborationRoom (`src/lib/cloudflare/collaboration-room.ts`)
- **Hibernatable WS**: yes (`acceptWebSocket` at `:206`, with `webSocketMessage/Close/Error` + `alarm` hibernation handlers).
- **Capacity**: 100 connections/room (429 `room_capacity_exceeded` at `:184-189`). Source: `capacity-contract.ts:7`.
- **Broadcast**: O(N) over `this.ctx.getWebSockets()` per message + per-peer `isSocketAuthorized` re-check (`:343-358`). Worst case `30 fps × 99 peers = 2,970 outbound/s/room`.
- **Presence**: full-room broadcast on every `presence-track`/`untrack`/close/error. Per-connection `{ "connection:<index>": [presence] }` where index is enumerate position (shifts on connect/disconnect).
- **Backpressure**: **none**. `sendJson` (`:84-90`) fire-and-forget `ws.send`; on throw close with 1011.
- **Alarm**: one per room at nearest 10 s auth deadline.

### GlobalPresence (`src/lib/cloudflare/global-presence.ts`)
- **Singleton DO**: all clients via `idFromName("global")` (`global-presence-router.ts:30`). **Global hot DO**.
- **Hibernatable WS**: yes (`:105`).
- **Capacity**: **none** (no `getWebSockets().length` check in `fetch`).
- **Broadcast**: O(N) over `getWebSockets()` (`:195-202`). Presence is just `{ count }`.
- **Debounce**: 1 s (`PRESENCE_BROADCAST_DEBOUNCE_MS = 1000`, `:11`) via `setTimeout`.
- **Backpressure**: none (`sendJson` fire-and-forget).
- **CRITICAL**: `broadcastTimer` (`:75`) is NOT cleared in `webSocketClose`/`webSocketError` — pending timer **prevents hibernation** until it fires.

### SupportInbox (`src/lib/cloudflare/support-inbox.ts`)
- Per-conversation DO (`support-inbox-router.ts:41`).
- **Hibernatable WS**: yes (`:121`).
- **Capacity**: none.
- **Backpressure**: none.
- Accepts POST fanout (`handleFanoutPost`, `:182-211`) — buffers body up to 8 KB then iterates every WS.

## Queues

### UPLOAD_JOBS_QUEUE — `archestimator-upload-jobs` (`wrangler.jsonc:94-100`)
- `max_batch_size: 5`, `max_batch_timeout: 30`, `max_retries: 3`, DLQ `archestimator-upload-jobs-dlq`. **`max_concurrency` unset**.
- **Producer**: effectively only `/__cloudflare/jobs-proof` POST (`jobs-proof-router.ts:231`). The cron path **bypasses the queue** — `worker.ts:240-244` calls `runCloudflareScheduledUploadJobs({fetcher})` which POSTs directly to `/api/internal/upload-cleanup|scan`.
- **Consumer**: `runCloudflareUploadJobQueueBatch` (`upload-job-queue.ts:329-410`). 0 D1 writes in the consumer itself; work delegated to Next route via `fetcher`.
- **Idempotency**: per-batch `Set` only (`:338`); minute-granularity keys (`:119-122`). **Not cross-batch.**

### CLIENT_PORTAL_NOTIFICATIONS_QUEUE — `archestimator-client-portal-notifications` (`wrangler.jsonc:101-107`)
- `max_batch_size: 20`, `max_batch_timeout: 30`, `max_retries: 10`, DLQ. **`max_concurrency` unset**.
- **Producer**: `enqueuePendingClientPortalNotifications` (`client-portal-notification-queue.ts:96-106`) from both 5-min and `30 3 * * *` crons. SELECT LIMIT 100 → `queue.sendBatch`.
- **Consumer**: `runClientPortalNotificationQueueBatch` (`:141-152`).
- **Per-message D1 cost**: up to 5 statements (claim UPDATE, JOIN SELECT, then dead/delivered/retry UPDATE).
- **Idempotency**: proper cross-batch via `lease_token` + `lease_expires_at` 5-min lease.
- **Two parallel dead-letter channels**: in-code `state='dead'` at `:136` AND Wrangler DLQ after 10 retries (`wrangler.jsonc:106`). Both trip at attempt 10.

## Cron / Scheduled (`wrangler.jsonc:74-81` declares FOUR crons; prompt mentioned only 3)

`recordCronRunEvent` writes one D1 INSERT per cron outcome — **even on no-op runs**.

### `*/5 * * * *` — five-minute drain (`worker.ts:205-237`)
Runs three tasks in parallel via `Promise.all`:
1. `enqueuePendingClientPortalNotifications(env)` — SELECT LIMIT 100 + queue.sendBatch.
2. `reconcileExpiredTemplateMutationIntents(env.ARCH_DB)` — single UPDATE … WHERE intent_id IN (SELECT … LIMIT 100).
3. `reconcileTemplatePropagationJobs(env.ARCH_DB)` — SELECT + per-row claim UPDATE + apply/fail (default `limit: 25`).

**Cost on no work**: ≥3 D1 statements + 1 cron-run INSERT = ~1,152 D1 rows/day from empty sweeps (288 invocations × 4).

### `0 3 * * *` — upload cleanup (`scheduled-upload-jobs.ts:42-46`)
Falls through to generic `runCloudflareScheduledUploadJobs` (`worker.ts:239-266`). One Next subrequest if secret present. Dry-run unless `UPLOAD_JOBS_ENABLED=1` AND `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`.

### `15 3 * * *` — upload scan (`scheduled-upload-jobs.ts:47-52`)
Same generic branch.

### `30 3 * * *` — upload cleanup + retention pass (`worker.ts:269-303`)
Runs upload-jobs branch AND retention branch in parallel. Retention runs 5 tasks in parallel:
1. `runRetentionPassInD1` — per-rule SELECT + apply + INSERT; ~4-8 statements/rule.
2. `reconcileActivityOutbox` — SELECT LIMIT 100 + per-row 2-3 statements (N+1, see PERF-D1 finding).
3. `reconcileActivationOutbox`.
4. `enqueuePendingClientPortalNotifications`.
5. `purgeExpiredActivationData` — 3 batched DELETEs.

**Cost on no work**: ~15-20 D1 statements + 1 Next subrequest + 2 cron-run INSERTs (one per branch).

## OpenNext Config (`open-next.config.ts`)
Accepts all defaults. `worker.ts:58` re-exports `BucketCachePurge`, `DOQueueHandler`, `DOShardedTagCache` from `.open-next/worker.js` — these are the default cache DOs.

## Static-Confirmed Observations
1. COLLAB_ROOMS cap of 100 enforced (`collaboration-room.ts:184-189`).
2. GlobalPresence singleton with **no cap** (`global-presence-router.ts:30` + `global-presence.ts:81-112`).
3. GlobalPresence `broadcastTimer` prevents hibernation when pending.
4. No `bufferedAmount`/backpressure anywhere in DOs.
5. Static-page in-memory cache `staticPublicPageMemoryCache` (`worker-route-optimizations.ts:57`) has no eviction/TTL — but keys bounded to 10 marketing paths.
6. Every fetch pays ~6 `new URL()` parses before OpenNext.
7. UPLOAD_JOBS_QUEUE bypassed by cron — only `/__cloudflare/jobs-proof` produces.
8. Upload-job idempotency is per-batch only (`upload-job-queue.ts:338`).
9. Client Portal notifications: proper lease-based cross-batch idempotency, but two parallel dead-letter channels.
10. 5-min cron always inserts `cron_run_events` row.
11. 30 3 * * * cron writes two `cron_run_events` rows per invocation.
12. Retention pass costs D1 even when zero rows qualify.
13. `max_concurrency` unset on both queue consumers.
14. WS upgrades bypass `responseWithRequestId` header stamping.
15. Auth-state retry emits up to 60 Set-Cookie headers per response.
16. SupportInbox buffers full POST bodies for fanout (≤8 KB).
