# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for this plan. Active baseline: Next.js 16,
React 19, Bun, TypeScript, Tailwind v4, OpenNext-Cloudflare Workers, D1, R2, Durable
Objects/WebSockets, Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand,
repository boundaries.

## Next.js / React (App Router)
- Realtime is client-side (hooks use `"use client"`). No Server Component renders realtime
  content. No route change. No cache/revalidation impact.
- The only Server Action surface is `issueRealtimeIdentity` (existing) and possibly a refresh
  entrypoint (FR-06) that **must reuse the existing authz probe** (R-SEC-02). Treated as a
  directly-reachable POST endpoint: auth + authz + ownership + idempotency.
- No `"use client"` boundary expansion. No bundle/RSC payload impact (hooks already client).

## TypeScript / validation
- Typed `SocketAttachment`, `RealtimeRoomTokenClaims`, `RealtimeIdentityEnvelope` already
  exist. New fields (cap, rate window, lastPong) must be typed on the attachment (≤2,048
  bytes serialized — the `durable-objects` skill hard limit).
- No `any`. Exhaustive handling of error codes (`auth_required`/`auth_failed`/`message_too_large`/
  `invalid_event`/`invalid_json`/`binary_not_supported`/`unsupported_message`/`rate_limited`/`cap_exceeded`).
- `cloudflare-env.d.ts` must be regenerated (`bun run cf:typegen`) if a new `vars` binding is
  added to `wrangler.jsonc` (FR-04/FR-05 knobs).

## Cloudflare Durable Objects (the heart of this plan)
- **Hibernatable WebSockets only** (`ctx.acceptWebSocket`/`getWebSockets`/
  `webSocketMessage`/`webSocketClose`/`webSocketError`). Never call `ws.accept()` after
  `acceptWebSocket`. Messages route to `webSocketMessage`, not `addEventListener`.
- **Attachments ≤2,048 bytes serialized** (`serializeAttachment`; official limit —
  [DO WebSockets API](https://developers.cloudflare.com/durable-objects/api/websockets/)).
  Keep per-socket state small (authorized claims + presence payload + lastPong). If a future
  feature needs more, use the Storage API and pass the key via the attachment.
- **In-memory state is wiped on hibernation** → rehydrate from `getWebSockets()`+
  attachments (FR-03). Do not keep presence in a JS `Map` alone.
- **`setTimeout`/`setInterval` prevent hibernation** → use the DO alarm (FR-07), cleared
  when the room empties.
- **Single alarm per DO** → the prune alarm is the only alarm; reschedule only while sockets
  exist.
- **`blockConcurrencyWhile` 30s timeout** → not needed (no schema init; SQL unused).
- **Deploy disconnects all sockets** → FR-06 reconnect is mandatory.
- **Cap (32,768 sockets/DO documented max)** → FR-04 cap is far below this and below the
  128MB memory practical limit. Source: [Durable Objects State API — WebSocket Hibernation]
  (https://developers.cloudflare.com/durable-objects/api/state/) ("maximum of 32,768 WebSocket
  connections per Durable Object"). Verified 2026-07-07.
- **`setWebSocketAutoResponse`** for cheap ping (`request`/`response` each ≤2,048 chars;
  official limit — [DO WebSockets API](https://developers.cloudflare.com/durable-objects/api/websockets/)).
  Use `getWebSocketAutoResponseTimestamp(ws)` to read the last pong time for the prune
  decision (FR-07), rather than storing it on the attachment.
- **`web_socket_auto_reply_to_close`** is default-on for compat date ≥2026-04-07 (ours is
  2026-06-29) → faster CLOSING→CLOSED. Source: [Workers compatibility flags —
  web_socket_auto_reply_to_close](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#websocket-auto-reply-to-close).
  Verified 2026-07-07.

## Cloudflare Workers (free-tier posture)
- No paid add-on (DEC-DO-07 uses already-enabled Workers Logs).
- Observability already enabled (`head_sampling_rate` logs 0.1, traces 0.05).
- Compat date `2026-06-29`, flag `nodejs_compat`.
- Bound resources only: `COLLAB_ROOMS`, `ARCH_DB`, `ARCH_UPLOADS_R2`,
  `UPLOAD_JOBS_QUEUE`, `EMAIL`, `IMAGES`. No touch to unrelated provider projects.

## Cloudflare D1 / R2 / Queues / Cron
- **No D1/R2/Queue change.** FR-08 keeps DO SQLite unused. Authz probe unchanged.
- Cron triggers unaffected; prune uses the DO alarm, not a cron.

## Better Auth / security
- Session/auth unchanged. The realtime authz boundary is the Server Action's D1 membership
  probe, not Better Auth session inspection. Preserved (SEC-01).
- Credential material taxonomy (unchanged):
  - HMAC room token: raw (client→DO), 300s, not stored, used for admission only.
  - Ed25519 envelope: signed (server-private key), 300s, verified client-side, `sig` is the
    only wire secret-ish value (public-key signature).
  - Neither is a session cookie, OAuth state, or password. No new credential material is
    introduced. The refresh path (FR-06) reissues the same materials via the same probe.

## TanStack Query / Zustand
- `useProjectCollaborationQuery` (TanStack) unchanged. Realtime presence is local React
  state (hook refs), not server-state cache. No invalidation interaction.

## Tailwind v4 / design-system
- No UI change. `DESIGN.md` (alpha) not engaged.

## Performance / reliability bar
- PERF-01 evaluator contract in `19_…`. Free-tier budgets in `09_…`.

## Testing bar
- `test:do` (new, workers-pool) + `test:dom` (existing, jsdom). Known-red `type-check` needs
  the heap flag. Respect the flake-budget sibling pack.

## Operations bar
- Rollback knobs in `13_…`. No destructive operations.

## Provider-proof boundary
- Local automated: unit/DOM/workers-pool + synthetic harness.
- Provider-backed: only TEST-02 (gated OPEN-02).
- Hosted/production: none claimed from local checks.
