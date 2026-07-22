# Support System — External Research Baseline

**Research date:** 2026-07-22. **Request type:** comprehensive current-platform and UI reference lookup. This document is planning evidence only; it proposes no provider mutation, dependency installation, or product implementation.

## Direct recommendation

Keep **D1 as the authoritative support ledger**, R2 as private object storage referenced by that ledger, and the existing per-conversation `SUPPORT_INBOX` Durable Object as an **ephemeral invalidation fan-out**, never as message storage. Persist the message and its state transition before publishing an invalidation; a failed or missed WebSocket notification only causes the client to refetch D1-backed data.

For the initial attachment scope, keep the authenticated Worker relay only if the product limit is reduced to the declared hosted request-body ceiling (currently 4 MiB). The current support configuration allows 5 MB attachments and the route buffers each `File` with `arrayBuffer()`, so the plan must choose one of these two coherent designs:

1. **Small-file MVP (recommended unless larger files are an explicit requirement):** cap each support attachment below the hosted 4 MiB body limit and retain the current server-authorized, private R2 write/read path.
2. **Direct-upload expansion:** create a D1 upload-intent row after authorization, issue a short-lived, single-key R2 presigned `PUT`, then have a server-side completion endpoint `HEAD`/verify the object and atomically associate it with the draft/message. This needs server-held R2 S3 credentials plus a signing implementation (Cloudflare documents `aws4fetch`); it is not a browser-side credential pattern.

Do not expose a bucket publicly. Download and image preview continue through an authenticated application route that rechecks ownership/role and returns `Content-Disposition: attachment` plus `X-Content-Type-Options: nosniff` for non-preview content.

## Current local context that constrains the plan

- `wrangler.jsonc` (compatibility date `2026-06-29`) already binds `ARCH_DB`, `ARCH_UPLOADS_R2`, `SUPPORT_INBOX`, `EMAIL`, and two existing queues. It does **not** bind a dedicated support-notification queue or R2 S3 signing credentials.
- Support persistence already has D1 conversation/message tables, uniqueness on `(conversation_id, client_message_id)`, and draft-attachment rows keyed to R2. Existing inbound email also uses an `ingest_key` dedupe path.
- `SupportInbox` already uses `DurableObjectState.acceptWebSocket`, serialized per-socket authorization data, and a server action that grants a room token only after support-conversation access is checked. Preserve that division: application authz issues a short-lived capability; the DO verifies it on admission and before fan-out.
- Current admin upload handling authorizes the draft, allowlists/normalizes attachment metadata, hashes bytes, writes private R2, then inserts a D1 attachment row; the admin attachment route reauthorizes before streaming R2. The main gap is the 5 MB configured per-file maximum versus the Worker’s 4 MiB hosted body limit, not a missing attachment model.

## Platform decisions and evidence

### Durable Objects and realtime

- Keep the deterministic **one Durable Object per conversation** routing model (`idFromName(conversationId)`). Durable Objects are a single coordination point, and their hibernation WebSocket API is the recommended API for persistent client connections. [Use WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [Durable Objects overview](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)
- Use `ctx.acceptWebSocket()` with `webSocketMessage`, `webSocketClose`, and `webSocketError` handlers, not the standard `addEventListener` WebSocket API. Hibernation keeps clients connected while resetting in-memory state; `serializeAttachment`/`deserializeAttachment` is the supported way to restore per-connection authorization state. Attachments are limited to 16,384 bytes and disappear when the socket closes, so store only immutable claims/topic metadata there—never message content or durable authorization. [Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [DurableObjectState API](https://developers.cloudflare.com/durable-objects/api/state/)
- Admission must be **server-authorized before connection**: authenticate the app session, check that the caller is the conversation owner or a platform admin, and mint a short-lived, audience/topic-bound capability. The DO then validates the capability’s topic, expiry, and subject. This is a plan inference from the hibernation persistence model and the existing repository pattern; Cloudflare’s WebSocket docs do not prescribe one application-token format.
- A browser WebSocket cannot set arbitrary request headers. If the current query-token fallback remains, make it short lived, never log it, avoid including it in telemetry/error strings, and reconnect with a newly minted token. Better still, use the existing server-authenticated same-origin token issuance and ensure the token cannot be reused for another conversation. Do not send support message bodies over the socket: publish only `{ type, conversationId, messageId }`, then refetch the D1 record.
- Hibernating DOs lose in-memory state and are currently eligible after a short idle period (documented as 10 seconds); alarms, timers, incoming requests, and pending work inhibit hibernation. This makes invalidations—not in-DO polling/timers—the appropriate support use. [DO lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
- A hibernation-enabled object has an upper bound of 32,768 WebSockets, but practical capacity is lower for CPU/memory-heavy work. Support traffic should be sparse and one conversation per DO, avoiding a global inbox singleton. [DurableObjectState `acceptWebSocket`](https://developers.cloudflare.com/durable-objects/api/state/)

### D1 ledger, atomicity, and idempotency

- Treat D1 as the durable source of truth for conversation, message, attachment, read state, and notification/outbox state. The DO and client cache are derived/recoverable layers.
- For an all-D1 state change—such as inserting a support message, updating conversation timestamps/unread counts, recording an outbox row, and binding completed upload intents—use `D1Database.batch()` when the repository’s D1 abstraction is extended for it. Cloudflare documents `batch()` as sequential, non-concurrent statements in a transaction; a failure rolls back the sequence. [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- Preserve and extend the existing idempotency keys: client send uses a client-generated `client_message_id`; inbound email uses a stable provider-derived `ingest_key`; upload completion needs an immutable `upload_intent_id` plus a unique attachment/object key. Insert-or-select must return the original result on retry, rather than create another message or attachment.
- Do not claim distributed exactly-once delivery across D1, R2, Queues, and Email. Use a **D1 transactional outbox**: commit the support state and an effect record first; a worker/consumer claims it idempotently, performs the side effect, then records a terminal/retryable result. This is the necessary application pattern because D1 transaction guarantees cover D1 statements only.
- R2 writes cannot join a D1 transaction. Direct uploads therefore use an explicit lifecycle (`authorized` → `uploaded_unverified` → `stored`/`quarantined`/`failed`) and a completion check. Relay uploads retain compensating cleanup: if the D1 insert fails after an R2 write, delete the newly written object; never expose an object not represented by an authorized D1 row.

### R2 uploads and private attachments

- A presigned R2 URL grants exactly one S3 operation on one object (`GET`, `HEAD`, `PUT`, or `DELETE`) for 1 second to 7 days. It is a bearer credential; use a short TTL and a random, server-generated object key. HTML-form `POST` uploads are not supported. [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- Bind `Content-Type` into the signed `PUT` and configure the bucket’s browser CORS narrowly for the application origins, exact `PUT` method, signed headers, and (if used) `ETag` exposure. CORS is still required even when the URL is valid. [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- Cloudflare’s Worker example generates a presigned `PUT` with `aws4fetch` and R2 access-key credentials held in the Worker. Add this only if direct upload is selected; the repository currently has neither this dependency nor the required signing credentials. [Upload objects with R2](https://developers.cloudflare.com/r2/objects/upload-objects/)
- At upload authorization, validate conversation/draft ownership, state, max count, allowed extension and claimed MIME type, per-file and aggregate size, and generate a non-guessable key. At completion, re-read object metadata/bytes as appropriate, verify expected size and checksum, rerun server-side type policy, attach it to the exact authorized draft/message, and delete/quarantine orphaned or unsafe objects. Client MIME, filename, and preview are user-controlled hints—not authorization evidence.
- Keep the bucket private. A browser must obtain an authenticated application download/preview response after D1 authorization; a presigned `GET` is appropriate only for a deliberately time-bounded download link and must be treated as an equivalent bearer capability. The R2 Worker binding remains the right server-side API for private reads/writes. [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- Screenshot/image preview can use `URL.createObjectURL(file)` locally before upload. Revoke the object URL when the preview is discarded/unmounted; do not make local preview a proof of server acceptance. The File API defines `File`/`Blob` object URLs. [File API](https://w3c.github.io/FileAPI/)

### Queues, Email, and Workers execution limits

- Do not make a user-visible support message wait for email delivery, thumbnailing, malware scanning, or admin notification. Commit the D1 message/outbox first and dispatch asynchronous work. Queues provides at-least-once delivery and explicitly does not preserve publish order, so every consumer must be idempotent by the D1 effect/message ID. [How Queues works](https://developers.cloudflare.com/queues/reference/how-queues-works/)
- A failed item in a batch can cause the whole batch to retry unless successes are explicitly acknowledged. Existing queue consumers already define retries/DLQs; a support effect should use a dedicated queue and DLQ rather than mix different retry/latency semantics into `CLIENT_PORTAL_NOTIFICATIONS_QUEUE`. [Batching, retries, and delays](https://developers.cloudflare.com/queues/configuration/batching-retries/) and [Dead Letter Queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/)
- Queue payloads are limited to 128 KB, batches to 100 messages, and retry/timeout/concurrency are bounded. Queue only stable identifiers and small metadata, never body HTML or attachment bytes. [Queues limits](https://developers.cloudflare.com/queues/platform/limits/)
- Cloudflare’s outbound Email Service is currently **Beta** and runs through the configured `send_email` binding. For new code Cloudflare prefers the structured `env.EMAIL.send()` API; the raw `EmailMessage` API remains for backward compatibility. Keep the outbound-effect status independent of message persistence and make retry/reconciliation visible to admins. [Email Service overview](https://developers.cloudflare.com/email-service/) and [send email from Workers](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- Inbound Email Workers receive a raw `ReadableStream` plus `rawSize`; size-check before parsing and retain current fail-closed inbound enablement. A direct `message.reply()` is restricted (valid DMARC, one reply per event, matching sender/domain, and a 100-reference loop guard), so admin-authored follow-up should remain the independently persisted outbound path rather than depend on automatic reply semantics. [Inbound Email Worker API](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/)
- Worker post-response `waitUntil()` has at most 30 seconds after response/disconnect. Queue consumers and cron handlers may run up to 15 minutes wall time but have Worker CPU limits. This supports queues for slow/variable work and forbids an unbounded attachment-processing loop in the request path. [Queues/Worker limits](https://developers.cloudflare.com/queues/platform/limits/)

## UI and package decision

The current stack is Next `16.2.10`, React `19.2.7`, Tailwind v4, TanStack Query, and Tiptap. It already has individual Radix Context Menu and Dropdown Menu packages, but not Radix Dialog/Sheet, React Hook Form, or a client image-compression library. Next’s App Router requires browser events, WebSockets, drag/drop, clipboard, object URLs, and screen capture to live behind a small `'use client'` boundary; keep route data/authz server-side and pass serializable view data to that component. [Next Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) and [`'use client'`](https://nextjs.org/docs/app/api-reference/directives/use-client)

**Local reconciliation:** repository inspection after external research found that
`src/components/ui/overlays/dialog.tsx` and `sheet-drawer.tsx` already implement
the required portal, focus, Escape, inert-background, title/description, and
focus-return behavior. The selected plan therefore adds no Dialog dependency.
The Radix recommendation below is retained only as a fallback if a future audit
proves an unrepairable local accessibility defect.

| Surface | Recommendation | Package consequence |
| --- | --- | --- |
| Modal / mobile detail sheet | Reuse the repository Dialog/Modal/Sheet. Consider `@radix-ui/react-dialog` only if a future audit proves a concrete local defect that cannot be repaired. | No dependency in this plan. Radix remains the fallback reference. [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) |
| shadcn option | Use shadcn only when copying a component into this repository is desired. It is a code-distribution system, not a runtime component dependency; current docs provide Dialog/Sheet/Textarea/Field compositions and can target Radix. | No `shadcn` runtime dependency. Its generated Dialog still requires the selected primitive. [shadcn introduction](https://ui.shadcn.com/docs), [Dialog](https://ui.shadcn.com/docs/components/base/dialog), and [Field](https://ui.shadcn.com/docs/components/base/field) |
| Composer / form | Use native `<textarea>`, labels, `aria-describedby`, native `FormData`, controlled local state, and current server-action/route validation. Do not add React Hook Form or a schema package for one support composer unless the planned form genuinely becomes multi-step and cross-field complex. | No new dependency. |
| Paste and drag/drop screenshots | Handle `ClipboardEvent.clipboardData.files/items` and `DragEvent.dataTransfer.files`, normalize into the same `File` intake/validation path as the file picker, and prevent default only when the target accepts files. | No new dependency. Clipboard and drag/drop are standardized browser APIs. [Clipboard API](https://www.w3.org/TR/clipboard-apis/) and [HTML drag and drop](https://html.spec.whatwg.org/multipage/dnd.html) |
| Image preview/compression | Preview with `URL.createObjectURL`. Do not add image compression for the first pass: it changes evidence bytes and can conceal the original screenshot. If UX data later proves upload failures/latency, add a bounded optional client transform that preserves the original choice, revalidates the resulting `File`, and never bypasses server limits. | No dependency initially. |
| Screen capture | Do not add a capture library. Paste/drop/file-picker already covers screenshots. If explicit in-app capture becomes a requirement, use browser `getDisplayMedia()` in the client component; it requires user activation and user consent, then feeds the same File pipeline. | No dependency. [Screen Capture spec](https://www.w3.org/TR/screen-capture/) |
| Realtime and notifications | Use browser `WebSocket` solely as a D1-invalidating signal and TanStack Query to refetch/invalidate the affected conversation/list. In-app toasts/badges are app state; email notification is an outbox/queue effect. Avoid browser Notification permission until product explicitly needs OS-level alerts. | No new dependency. |

Radix is an accessibility-preserving choice when a modal is justified: it traps focus, closes with Escape, and supplies screen-reader title/description semantics. It supports incremental adoption and tree-shaking; its current release notes include React 19 fixes, reducing compatibility concern for the repository’s React 19.2 baseline. [Radix introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), and [July 2026 releases](https://www.radix-ui.com/primitives/docs/overview/releases)

## Secure message/attachment pipeline to place in the implementation plan

1. Server-authenticate and authorize the actor for the support conversation/draft. Generate a client idempotency key once per send and persist it with the message.
2. For relay uploads, enforce the lower of application/provider request limits before reading bytes. For presigned uploads, create a D1 upload intent and return only a short-lived one-object `PUT` capability.
3. Normalize filename; allowlist types; enforce count/per-file/aggregate limits; reject active content; generate a random R2 key independent of user filename. Preview only selected image types and force downloads for all other types.
4. Verify the uploaded object server-side, calculate/validate integrity data, bind the D1 attachment row to its message/draft, and make it available only when storage status is `stored`. Sweep expired intents/orphan objects asynchronously.
5. In one D1 transaction, create/update the durable message/conversation state plus an outbox event. Return the durable result to the user; never use a WebSocket/queue/email completion as the send acknowledgement.
6. Publish the minimal invalidation after commit. The client refetches authoritative D1 data; reconnection refetches rather than assumes no events were missed.
7. Queue external notifications/email/scanning by stable effect ID. Claim effects idempotently, record failures, retry boundedly, route exhausted failures to a DLQ, and surface a retryable administrative state.

## Version and uncertainty flags

- Source pages above were retrieved 2026-07-22. Cloudflare platform pages were last updated between April and June 2026; limits and Email Service’s Beta status are mutable and must be reread immediately before implementation/deploy.
- `wrangler.jsonc` currently uses `compatibility_date: 2026-06-29`, after the documented 2026-04-07 WebSocket close-handshake behavior change. Do not add a compatibility flag merely to duplicate the current default.
- No source was found that turns a browser-provided filename/MIME declaration into trusted file classification. The plan must retain server policy and, if threat requirements expand, explicitly choose a malware/content-scanning service instead of implying R2 scans uploads.
- This research does not decide whether the product needs files larger than 4 MiB, automated malware scanning, OS notifications, or in-app screen capture. Those are product boundaries that determine whether direct upload, a scanning queue, or capture work is justified.

## Retrieval sufficiency

Official Cloudflare documentation is sufficient for DO hibernation, D1 batch semantics, R2 access patterns, Queues, Email, and limits. Official Next, Radix, shadcn, and web-standard documentation is sufficient for the client/UI decision. No third-party tutorial, unpinned upstream code, or external OSS example was used.
