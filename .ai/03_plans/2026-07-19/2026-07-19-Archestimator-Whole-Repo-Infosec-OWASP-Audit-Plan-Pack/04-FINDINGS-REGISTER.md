# 04 — Findings Register

> **Historical audit provenance.** Current-source dispositions and execution
> authority belong to `.ai/03_plans/2026-07-31/Code-Improvement/`. This register
> preserves July 19 evidence and does not claim remediation implementation.

Canonical human-readable source. `artifacts/findings.json` is the machine-readable mirror. Severity is calibrated per master prompt §14 and reconciled against the independent adversarial verifier (`08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md`).

Severity counts (post-adjudication): **Critical 0 · High 1 · Medium 26 · Low/Informational 11 (+ ~29 informational no-unit) · Rejected/Refuted/Duplicate 3 (+ 2 sweep candidates downgraded to Low/Informational during overcall assessment)**. These counts are reconciled to `artifacts/findings.json` `findings[]` (authoritative) and `severity_counts` (now derived from the array).

Each accepted finding maps to a remediation unit (or to an existing active plan — none in this case) per master prompt §13.6 and §16.

> Format per finding: `finding_id`, `title`, `primary_class`, `severity`, `confidence`, `affected_paths_and_exact_lines`, `entrypoint`, `attacker → victim`, `source_to_sink_trace`, `missing/insufficient_control`, `current_compensating_controls`, `why_insufficient`, `runtime_reachability`, `evidence_class`, `owasp_top10_2025`, `owasp_api_2023`, `cwe`, `smallest_coherent_fix_direction`, `unit`.

---

## High

### `SEC-COLLAB-003` — Membership revocation does not invalidate already-issued HMAC realtime room tokens (up to 5-min privilege retention)

- **primary_class:** `EXPLOITABLE_VULNERABILITY`
- **severity:** High · **confidence:** HIGH (independently confirmed by adversarial verifier)
- **affected_paths_and_exact_lines:** `src/lib/collaboration/realtime-room-token.ts:1` (`DEFAULT_ROOM_TOKEN_TTL_SECONDS = 300`), `:158-185` (`verifyRealtimeRoomToken` checks signature + topic + `exp` only — no revocation list); `src/lib/cloudflare/collaboration-room.ts:378-427` (`authorizeSocket` calls only `verifyRealtimeRoomToken`); `src/lib/cloudflare/collaboration-room-revocation.ts:33-74` (revocation iterates only currently-open sockets and closes them — does not write any persistent denylist); `src/lib/collaboration/actions.ts:1622-1624,1682,1824,1913` (revocation invoked after role change / removal).
- **entrypoint:** WebSocket reconnect to `CollaborationRoom` after administrative removal or role downgrade.
- **attacker → victim:** Newly-removed or demoted project/estimate member → still-private collaboration room (and all other members of that room).
- **source_to_sink_trace:**
  1. Manager calls `removeProjectCollaborator` → `actions.ts:1824` calls `revokeCollaborationRoomSubject({topic, subject})`.
  2. `revokeCollaborationRoomSubject` POSTs `{type:"revoke-subject", sub}` to the DO with the control secret (`collaboration-room-revocation.ts:48-59`).
  3. DO iterates currently-open sockets and closes those whose `claims.sub === payload.sub` (`collaboration-room.ts:531-537`).
  4. **The attacker still holds the original HMAC token** (TTL 300s). They open a fresh WS and send `{type:"authorize", token}`. `authorizeSocket` re-verifies only signature + topic + exp (`collaboration-room.ts:387-395`). They are re-admitted for up to 5 minutes after removal.
- **missing_or_insufficient_control:** No revocation list, no token `jti`, no single-use enforcement, no DO-side denied-subject set persisted to the DO's SQLite storage. The `CollaborationRoom` DO has SQLite storage provisioned (`wrangler.jsonc:64-67`) but does not use it for revocation.
- **current_compensating_controls:** 5-minute TTL bounds the window; tokens are HMAC-SHA256 with `timingSafeEqual`; capabilities are scoped per-token (a viewer token cannot escalate to editor even if reused); the DO does close currently-open sockets immediately on revocation.
- **why_insufficient:** 5 minutes is too long for "user just removed"; for role-downgrade (e.g., manager → viewer), the demoted user retains `broadcast:row-update` for 5 minutes — a real privilege-boundary crossing.
- **runtime_reachability:** `REACHABILITY_CONFIRMED` (the verifier re-traced end-to-end).
- **evidence_class:** `CURRENT_SOURCE_CONFIRMED`
- **owasp_top10_2025:** A01 Broken Access Control
- **owasp_api_2023:** API1 BOLA (post-revocation); API5 BFLA (role downgrade)
- **asvs_5:** v5.0.0-3.5.3 (invalidate session after privilege change); v5.0.0-7.1.3
- **cwe:** CWE-613 (Insufficient Session Expiration); CWE-294 (Authentication Bypass by Capture-replay); CWE-302
- **smallest_coherent_fix_direction:** Maintain a `revoked_subjects` table in the DO SQLite and consult it in `authorizeSocket` (TTL keyed off revocation time); OR shorten TTL to ≤60s AND treat revocation as best-effort. Recommended: DO-SQLite denylist using the already-provisioned storage.
- **unit:** `UNIT-001`

---

## Medium

### `SEC-AUTH-001` — Raw Better-Auth session tokens stored at rest in D1 (`session.token` cleartext)

- **class:** `LATENT_SECURITY_DEFECT` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/auth/better-auth-cloudflare.ts:24-31` (comment acknowledges this), `:199-204` (no `tokenHashing` option supplied); D1 schema `session.token text not null unique` (raw).
- **trace:** Better Auth 1.6.23 mints a session, persists `session.token` cleartext. The token is the same value placed in the `better-auth.session_token` cookie, so a D1 read compromise yields reusable bearer tokens for all active 7-day sessions.
- **compensating:** `cookieCache.enabled:false` + route-gate `disableCookieCache:true` (`better-auth-cloudflare.ts:317-319`) so revocation takes effect on next request; 7-day TTL.
- **why insufficient:** Compensating controls reduce cookie-cache staleness but do not protect against read-side DB disclosure (D1 snapshot, SQL-injection read, backup disclosure).
- **owasp:** A04 Cryptographic Failures; API2 Broken Authentication · **cwe:** CWE-312, CWE-522
- **fix direction:** Hash `session.token` at rest (SHA-256 + app pepper) and look up by hash; or upgrade Better Auth once it exposes `session.tokenHashing` and migrate existing rows.
- **unit:** `UNIT-013` (folded into the "data-layer hardening" unit alongside `SEC-AUTHZ-001` — same blast radius, same touch surface).

### `SEC-AUTHZ-001` — `support-conversations-repository` performs no caller-binding authz at the data layer (latent)

- **class:** `LATENT_SECURITY_DEFECT` · **severity:** Medium · **confidence:** HIGH (verified latent — all current callers admin-gated)
- **affected:** `src/lib/repositories/support-conversations-repository.ts` — `listSupportMessages`, `getSupportConversationInD1`, `listSupportConversations`, `createSupportConversation` (takes `userId` as input param) have no membership predicate. Helper `canAccessSupportConversationInD1` exists but is opt-in.
- **trace:** All current callers route through `requireAdminContext` (admin support routes) or `getCurrentUserContext` + explicit `canAccessSupportConversationInD1`. **No non-admin caller reaches the write functions.** Latent.
- **compensating:** `"server-only"` import; admin-only callers.
- **why insufficient:** Safety lives in callers, not the data layer. Any future non-admin caller without re-establishing the check introduces a live IDOR.
- **owasp:** A01; API1 · **asvs:** v5.0.0-4.1.1, 4.1.3, 13.4.1 · **cwe:** CWE-285, CWE-639
- **fix direction:** Require a `UserContext` arg and have repo functions perform `EXISTS (SELECT 1 FROM support_conversation_participants WHERE conversation_id = ? AND user_id = ?)` internally, throwing on miss.
- **unit:** `UNIT-013`

### `SEC-UPLOAD-001` — Malware scanner is effectively disabled in production default config (fail-stopped, not fail-open)

- **class:** `SECURITY_HARDENING` (downgraded from `EXPLOITABLE` per verifier) · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/uploads/clamd-scanner.ts:158-169` (returns policy-scanner unless `UPLOAD_SCAN_PROVIDER=clamd`); `src/lib/uploads/policy-scanner.ts:39-91` (only checks EICAR, macro MIME, supported content-type); `src/lib/cloudflare/scheduled-upload-jobs.ts:63-65` (dry-run unless `UPLOAD_JOBS_ENABLED=1` AND `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`); `src/app/api/internal/upload-scan/route.ts:85` (503 unless enabled).
- **trace:** Scheduler defaults to dry-run → scan_status never advances → component-binding accepts pending (`SEC-UPLOAD-002`) → download fails-closed for pending (`scanning.ts:73-75`). Net behavior today: **attachments are uploadable and bindable but un-downloadable** until operator enables scanning. This is a functionality defect for first users, not "infected files served."
- **compensating:** Download path strictly fails-closed for non-clean scan states; content-type allowlist + 20MB cap + magic-byte + `X-Content-Type-Options: nosniff` + audit row on every download-issued.
- **why insufficient:** Once an operator flips scanning on with the default policy-scanner, pending assets flip to `clean` without real inspection. And first users cannot download any attachment until scanning is wired.
- **owasp:** A05, A08 · **cwe:** CWE-693, CWE-1188
- **fix direction:** Either wire a real scanner (clamd sidecar or external service — `AUTH-003`), OR document the policy-scanner as the control AND require `scan_status='clean'` (not `'pending'`) at component-bind (`SEC-UPLOAD-002` fix). Flip dry-run default once secrets are configured.
- **unit:** `UNIT-005`

### `SEC-UPLOAD-002` — `scan_status='pending'` is bindable to a published component variant

- **class:** `SECURE_DESIGN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/component-library/component-mutation-d1.ts:1233-1239` (accepts `pending` or `clean` or active override); `:1169-1175` (same gate for re-linking existing attachments).
- **trace:** Editor uploads → asset stored `pending` → bind to variant → guard accepts pending → variant persists reference to unscreened attachment → download blocked today, but the moment scanning ever flips pending→clean the link goes live without human review.
- **owasp:** A01; API5 · **cwe:** CWE-284, CWE-668
- **fix direction:** Tighten the guard to require `scan_status='clean'` (or active `override_approved`) at both `:1234` and `:1170`.
- **unit:** `UNIT-005`

### `SEC-UPLOAD-003` — Direct-upload finalize accepts a client-declared checksum that is never verified against R2 object bytes

- **class:** `LATENT_SECURITY_DEFECT` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/app/api/component-library/attachments/direct-upload/route.ts:510-531` (finalize calls `headObject`/`downloadObject` + `validateProviderObjectHead`); `src/lib/uploads/provider-portability.ts:124-143` (only verifies R2-stored `checksumSha256` against `constraints.checksumSha256` when both sides present; falls back to "any non-empty ETag" otherwise).
- **trace:** Client supplies `checksumSha256` (optional) at create → PUT arbitrary bytes (matched only by declared size and content-type) → finalize accepts if R2-stored checksum matches OR if any ETag is present.
- **compensating:** Object-key workspace/project binding prevents cross-tenant attacks; download path independently verifies `storage_path`/`workspace_id`.
- **owasp:** A08 · **cwe:** CWE-345, CWE-1236
- **fix direction:** In finalize, recompute `sha256(downloadedBytes)` from a single `downloadObject` and require equality with `session.checksum_sha256` before recording the asset.
- **unit:** `UNIT-006`

### `SEC-UPLOAD-004` — Direct-upload finalize never re-runs magic-byte validation on the stored R2 object

- **class:** `SECURE_DESIGN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/app/api/component-library/attachments/direct-upload/route.ts:510-531` (validates only `object.contentType` from R2 httpMetadata, which the client set via PUT `Content-Type`); `:596-604` (PUT validates only `requestContentType === session.content_type`).
- **trace:** Client reserves a PDF session → PUTs HTML/EXE bytes with `Content-Type: application/pdf` → finalize validates only that R2-stored content-type matches session content-type → object finalized as "PDF" but contains arbitrary bytes.
- **compensating:** Download sets `Content-Type: application/pdf` + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` so direct in-browser execution as a different type is mitigated.
- **owasp:** A04 Insecure Design · **cwe:** CWE-434, CWE-345
- **fix direction:** In finalize, download first 64 bytes (or whole object for sizes ≤ single-part cap) and re-run `readMagicMime` against the stored bytes.
- **unit:** `UNIT-006`

### `SEC-UPLOAD-005` — No decompression/size-inflation cap on PDF/XLSX scanning

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH (verifier notes Low due to 20MB ingress cap, but retained at Medium for the scan-job code-path risk if scan is enabled on existing large objects)
- **affected:** `src/lib/uploads/scan-job.ts:93-111` (`bytesFromDownload` → `.arrayBuffer()`, full object into memory); `:359-379` (no per-object byte ceiling; no `MAX_UPLOAD_SCAN_BYTES` constant anywhere); `policy-scanner.ts:35-37` (TextDecoder across all bytes).
- **compensating:** Upload route caps at 20MB; Cloudflare Worker hard 128MB memory ceiling; queue `max_batch_size=5`, `max_retries=3`, DLQ.
- **owasp:** A04 Unrestricted Resource Consumption; API4 · **cwe:** CWE-409, CWE-770
- **fix direction:** Cap total bytes scanned per run, per-record processing time; reject high compressed/uncompressed ratio.
- **unit:** `UNIT-007`

### `SEC-COLLAB-001` — CollaborationRoom WS upgrade is anonymous for 10s; no Origin check; unauthorized sockets count toward `MAX_ROOM_CONNECTIONS`

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/collaboration-room.ts:173-213` (upgrade accepted before auth; `authorizationDeadlineAt` scheduled); `worker.ts:167-171` (worker routes WS before OpenNext, no origin gate).
- **trace:** Anonymous client opens WS → upgrade accepted → socket counts toward `MAX_ROOM_CONNECTIONS=100` immediately → auth only if/when client sends `{type:"authorize", token}`. No Origin/Sec-Fetch-Site check. A single attacker opening 100 anonymous sockets per room can wedge "room full" for legitimate users.
- **compensating:** `MAX_ROOM_CONNECTIONS=100` per DO + 10s auth-deadline alarm.
- **owasp:** A01, A04; API4 · **cwe:** CWE-306, CWE-942, CWE-770
- **fix direction:** Add pre-upgrade Origin/Sec-Fetch-Site check; prefer verifying bearer/`?token=` on HTTP upgrade (as `GlobalPresence`/`SupportInbox` do); do not let unauthenticated sockets count toward `MAX_ROOM_CONNECTIONS`.
- **unit:** `UNIT-013`

### `SEC-COLLAB-002` — `MAX_ROOM_CONNECTIONS` is per-DO-instance, not per-subject; authorized user can seat-flood the room

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/collaboration-room.ts:184-189` (cap check); `:343-376` (broadcast is O(N²) fan-out).
- **trace:** Authorized user opens many browser tabs / headless clients. Each socket counts toward cap; each cursor frame fans out to all peers. 100 sockets × 30 fps × 99 peers ≈ 297K sends/sec.
- **compensating:** 30 fps cap + 100-conn cap (per-connection input). Capacity contract acknowledges hosted proof remains required.
- **owasp:** A04; API4 · **cwe:** CWE-770, CWE-400
- **fix direction:** Track `Map<sub, Set<ws>>`; reject new upgrades from a subject already at N (e.g. 3) connections; bound broadcast fan-out by closing slow consumers on first `send` failure.
- **unit:** `UNIT-013`

### `SEC-COLLAB-004` — `broadcastMessage` in `SupportInbox` emits attacker-supplied object verbatim (no schema, no sender binding)

- **class:** `SECURE_DESIGN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/support-inbox.ts:162-172` (validates only `isRecord(parsed.message)`); `:182-218` (POST fanout + WS broadcast); `:213-218` (no field whitelist). Contrast `CollaborationRoom` cursor path which stamps `userId: claims.sub` (`collaboration-room.ts:275-278`).
- **trace:** Authorized participant sends `{type:"message", message: <any record>}` → DO broadcasts to all authorized peers with no field filter, no size cap on inner object, no `from` binding to `claims.sub`.
- **compensating:** Outer `MAX_MESSAGE_BYTES=8192`; topic-bound authorization sound.
- **owasp:** A03 Injection; API8 · **cwe:** CWE-20, CWE-79, CWE-346
- **fix direction:** Require typed schema per `event_type`; stamp `from: claims.sub` server-side; reject if `message.from` exists and ≠ `claims.sub`.
- **unit:** `UNIT-013`

### `SEC-OPS-001` — Internal upload-cleanup/scan routes are reachable from the public internet; only a static bearer secret guards them

- **class:** `SECURE_DESIGN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `worker.ts:142-199` (no `/api/internal/*` block before OpenNext); `src/app/api/internal/upload-cleanup/route.ts:99-104`; `upload-scan/route.ts:75-80`; `upload-runtime/route.ts:188-193`.
- **trace:** Worker fast path does not short-circuit `/api/internal/*`. Requests reach Next handlers. Auth is `authorizeBearerRequest` against `CRON_SECRET` or job-specific secret. With `dryRun=0` and `UPLOAD_JOBS_ENABLED=1`, the route performs real R2 deletes and AV scans. No IP allowlist, no Cloudflare Access, no mTLS.
- **compensating:** `bearer-auth.ts` uses constant-time SHA-256 compare; `UPLOAD_JOBS_ENABLED` defaults to off.
- **why insufficient:** `CRON_SECRET` is reused across ≥7 internal routes + proof routers (large blast radius). One leaked CI log of `CRON_SECRET` is sufficient.
- **owasp:** A01; API1, API6 · **cwe:** CWE-306, CWE-285, CWE-420
- **fix direction:** In `worker.ts`, route `/api/internal/*` (except public client-error/web-vitals sinks) only when the request is from the `scheduled` invocation OR via an internal-origin marker header; OR move to a `/__internal/*` path mapped to a Cloudflare Access gate. At minimum: require `x-archestimator-internal: 1` header set by the scheduler.
- **unit:** `UNIT-002` (bundled with the worker-edge-seam unit)

### `SEC-OPS-004` — Upload queue message provenance: no HMAC signature; idempotency key attacker-controllable

- **class:** `SECURE_DESIGN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/upload-job-queue.ts:178-191` (validates only `version/jobName/source/cron/enqueuedAt/idempotencyKey` strings); `:189-191` (`matchingJobExists` static-schedule check); `:338-352` (idempotency dedupe); `scheduled-upload-jobs.ts:71-85` (URL built from constants).
- **trace:** `source: "cloudflare-cron"` is just a string the producer types. Anyone with the binding can forge a message. The attacker-controllable `idempotencyKey` can poison legitimate messages' dedupe. Today only `worker.ts` scheduled handler + jobs-proof-router can `sendBatch` (verified by grep) — hence Medium not High.
- **compensating:** Queue bindings not exposed to public routes today; `writeProviderProofReceipt` regex-validates `providerProof.id`.
- **owasp:** A08; API8 · **cwe:** CWE-345, CWE-302
- **fix direction:** HMAC-sign each message over `(jobName, cron, enqueuedAt, idempotencyKey)`; verify in `isUploadJobQueueMessage`. Make `idempotencyKey` server-derived only.
- **unit:** `UNIT-008`

### `SEC-WORKER-002` — `workers_dev: true` exposes production Worker + all bindings at `*.workers.dev`; proof routes reachable from secondary origin

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH (downgraded from High by verifier — bearer-gated, industry-standard scaffolding, but residual risk)
- **affected:** `wrangler.jsonc:10` (`workers_dev: true`); `worker.ts:141-198` (full route table reachable); `src/lib/cloudflare/worker-route-optimizations.ts:35-38,145` (canonical-host map treats `*.workers.dev` as redirect source with `keepProofRoutes: true`, so `/api/health` and `/__cloudflare/*` bypass canonical redirect).
- **trace:** Every proof route is reachable at `https://archestimator-proof.philipjonlewis.workers.dev/__cloudflare/*` and performs DDL/INSERT/DELETE on production D1, R2 put/get/delete, Queue sendBatch — gated only by shared `CRON_SECRET`.
- **compensating:** Bearer-secret gating on `/__cloudflare/*`; canonical-host redirect for everything else; D1 statement checksum verification on proof results; fixtures clean themselves up.
- **why insufficient:** Single shared bearer = admin-equivalent surface on a secondary origin with no IP allowlist / Cloudflare Access / mTLS.
- **owasp:** A05, A07; API8 · **cwe:** CWE-668, CWE-306
- **fix direction:** Set `workers_dev: false` for production Worker (custom-domain routes are already wired); OR gate `/__cloudflare/*` behind Cloudflare Access AND give proof routes a dedicated secret (not shared with `CRON_SECRET`).
- **unit:** `UNIT-002`

### `SEC-WORKER-004` — `routeStaticPublicPageThroughCache` writes responses into isolate-global `Map` + default Cloudflare cache with URL-only key

- **class:** `LATENT_SECURITY_DEFECT` · **severity:** Medium · **confidence:** HIGH (latent — currently safe)
- **affected:** `src/lib/cloudflare/worker-route-optimizations.ts:57` (module-level `staticPublicPageMemoryCache = new Map`), `:81-88` (cache key = URL only), `:115-120` (cacheable if 200/text-html/no-Set-Cookie/no-no-store), `:320-360`.
- **trace:** Cache key is URL only, no Vary, no Surrogate-Key purge. Memory cache persists across users on the isolate. `isCacheablePublicPageResponse` is conservative today (path allow-list narrow, requires no Set-Cookie/no-store). Latent: if any path in the allow-list ever returns cookie-driven 200 content, the first hit is replayed to everyone.
- **compensating:** Cookie/Authorization presence bypasses cache (`:71-73`); path allow-list narrow; `url.search === ""` check.
- **owasp:** A05 · **cwe:** CWE-525, CWE-1021
- **fix direction:** Drop the isolate memory cache (Cloudflare default cache suffices); OR bound it (LRU + size limit) + comment-invariant that no allow-listed path may produce cookie-driven content.
- **unit:** `UNIT-013` (folded into the worker-edge-seam hardening backlog)

### `SEC-BROWSER-001` — CSP enforced only on `/share/*` and even there ships `'unsafe-inline'+'unsafe-eval'`; `/workshop/*` and `/invite/*` are Report-Only with no `report-to`

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH (downgraded from High by verifier — no reachable XSS sink in share/workshop; `dangerouslySetInnerHTML` grep returns zero)
- **affected:** `next.config.ts:20-47` (policy definitions), `:166-299` (header application). `/share/:path*` is the only enforced policy (`:212-214`, uses `landingReportOnlyCsp` with `'unsafe-inline'+'unsafe-eval'` at `:26`). `/workshop/:path*` (`:254`) and `/invite/:path*` (`:264`) are Report-Only. No `report-uri`/`report-to` in any policy.
- **trace:** Any successful HTML injection on a share page executes arbitrary script (CSP provides no mitigation). On workshop/invite, injection is reported-but-executed. The workshop CSP allows `blob:` + wide Google host wildcards.
- **compensating:** `X-Frame-Options: DENY` everywhere; `frame-ancestors 'none'` on share; `Referrer-Policy: no-referrer`; no `dangerouslySetInnerHTML` in share/workshop; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` set.
- **owasp:** A05, A03 · **cwe:** CWE-79, CWE-1021, CWE-693
- **fix direction:** Add per-request nonce pipeline; remove `'unsafe-inline'`/`'unsafe-eval'` from share policy; promote workshop+invite to enforced; add `report-to` endpoint.
- **unit:** `UNIT-009`

### `SEC-BROWSER-003` — `/invite/:token` carries raw invite token in URL path; missing `Cache-Control: no-store`

- **class:** `LATENT_SECURITY_DEFECT` · **severity:** Medium · **confidence:** HIGH
- **affected:** `next.config.ts:260-269` (the `/invite/:path*` block sets CSP-RO + `shareHardeningHeaders` = X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy no-referrer, HSTS, X-Robots-Tag — but **not** `Cache-Control: no-store`). Contrast `:203-217` which sets `Cache-Control: no-store` for `/share/:path*`.
- **trace:** Invite token in URL path; `no-referrer` blocks leakage via Referer; but response has no `no-store` → browser bfcache, disk cache, corporate proxy caches can store the token-bearing URL.
- **compensating:** `no-referrer` set; X-Robots-Tag blocks indexing.
- **owasp:** A05, A07 · **cwe:** CWE-200, CWE-525, CWE-615
- **fix direction:** Add `Cache-Control: no-store, private` to `/invite/:path*` header block, mirroring `/share/:path*`.
- **unit:** `UNIT-009`

### `SEC-BROWSER-005` — `__Secure-` cookie `Secure` flag is NODE_ENV-conditional rather than request-derived

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/publication/security.ts:370,539,558-559`; `src/app/api/share/[token]/session/route.ts:27`; `src/app/invite/[token]/sign-out/route.ts:42-43`.
- **trace:** `secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : ""`. In non-production deploys (preview Workers, misconfigured env), cookies travel without `Secure`; any plaintext-HTTP fetch the browser makes leaks them.
- **compensating:** HSTS protects canonical domain; preview/staging on workers.dev is HTTPS.
- **owasp:** A05 · **cwe:** CWE-614, CWE-1004
- **fix direction:** Set `Secure` whenever `request.url` is `https:` (derive from request, not `NODE_ENV`).
- **unit:** `UNIT-009`

### `SEC-CRYPTO-001` — Non-constant-time (`===`) Bearer compare for `CRON_SECRET` in 8 Cloudflare proof routers

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/{better-auth,collaboration-invitation,observability,upload-lifecycle,d1-performance,estimate-history,jobs,provider}-proof-router.ts` (each uses `request.headers.get("authorization") === \`Bearer ${secret}\``); contrast `src/lib/security/bearer-auth.ts:30-37` (constant-time SHA-256 + `timingSafeEqual`).
- **trace:** JS `===` short-circuits byte-by-byte. Practical timing attack over the internet is noisy, but `CRON_SECRET` is shared with the more-dangerous routes in `SEC-OPS-001`.
- **owasp:** A02; API2 · **cwe:** CWE-208
- **fix direction:** Route every proof-router `isAuthorized` through `authorizeBearerRequest`.
- **unit:** `UNIT-003`

### `SEC-CRYPTO-002` — Non-constant-time `===` for `COLLABORATION_ROOM_CONTROL_SECRET` (DO control path)

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/cloudflare/collaboration-room.ts:496-500` (`request.headers.get(CONTROL_SECRET_HEADER) !== configuredSecret`).
- **trace:** DO `handleControlRequest` accepts `revoke-subject` commands (force-disconnect a user). Header compared via `!==`.
- **compensating:** `isValidInput` validates topic/subject shape; exact-match required.
- **owasp:** A02 · **cwe:** CWE-208
- **fix direction:** Apply sha256-digest + `timingSafeEqual` pattern from `bearer-auth.ts`.
- **unit:** `UNIT-003`

### `SEC-CRYPTO-003` — Legacy realtime-room-token fallback reuses invite/identity-signing secrets across subsystems

- **class:** `SECURITY_HARDENING` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/collaboration/realtime-room-token.ts:4-9` (`TOKEN_SECRET_ENVS = ["REALTIME_ROOM_TOKEN_SECRET", "REALTIME_IDENTITY_SIGNING_KEY", "ARCHESTIMATOR_INVITE_TOKEN_PEPPER", "COLLABORATION_INVITE_PEPPER"]`); `:38` (`readRealtimeRoomTokenSecret` iterates them as fallback). Callers: `support-inbox.ts:102,183,223`, `global-presence.ts:90`, `realtime-identity-actions.ts:158`.
- **trace:** `.env.example:38-43` explicitly warns "Do not reuse invite or identity signing material" — but the code does exactly that as a fallback when `REALTIME_ROOM_TOKEN_SECRET` is absent. Compromise of the more-broadly-exposed invite pepper → attacker can mint valid room tokens for support-inbox/presence.
- **compensating:** The v2 path (`readCollaborationRoomTokenSecret`) is correctly single-source and used by `CollaborationRoom` DO. Missing-secret fail-closed.
- **owasp:** A02 · **cwe:** CWE-326, CWE-1188
- **fix direction:** Remove the legacy fallback chain so `readRealtimeRoomTokenSecret` only reads `REALTIME_ROOM_TOKEN_SECRET`; migrate support-inbox/global-presence to require it.
- **unit:** `UNIT-003`

### `SEC-CI-001` — All CI/CD workflows are disabled; no branch protection evidence; no required checks (AUXILIARY)

- **class:** `SECURE_SDLC_OR_SUPPLY_CHAIN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `.github/workflows/` is empty; all workflows in `.github/workflows-disabled/` (ci, codeql, dependency-review, dependabot, release, react-doctor). `.github/CODEOWNERS` header states "Platform enforcement is pending GitHub branch-protection capability; keep this file advisory."
- **trace:** With no active workflows, PRs to `main` get no enforced type-check, lint, test, build, CodeQL, dependency-review, or release-candidate verification.
- **compensating:** Disabled workflows are SHA-pinned + narrow `permissions:`; `bun run validate` exists locally but not enforced.
- **owasp:** A06 (Vulnerable Components — no automated gate) · **cwe:** CWE-1357
- **fix direction:** Re-enable `ci.yml` (2026-07-13 variant), `codeql.yml`, `dependency-review.yml`, `dependabot.yml`; configure branch protection requiring them.
- **AUTH note:** Branch-protection / required-checks state is `GITHUB_HOSTED_EVIDENCE_BLOCKED` (`AUTH-001`).
- **unit:** `UNIT-012` (AUXILIARY)

### `SEC-CI-002` — Dependabot and dependency-review-action disabled; no automated dependency-vulnerability gate on PRs (AUXILIARY)

- **class:** `SECURE_SDLC_OR_SUPPLY_CHAIN_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `.github/workflows-disabled/dependabot.yml` (Dependabot config exists only in disabled form — no version-update PRs are opened); `.github/workflows-disabled/codeql.yml` and the `2026-07-13/` dependency-review workflow are disabled, so no `dependency-review-action` runs on PR open/update. Distinct from `SEC-CI-001` (which covers the build/test/SAST gate): this finding covers the *dependency-vulnerability advisory* gate specifically.
- **trace:** With Dependabot disabled and no `dependency-review-action`, a PR that bumps a dependency to a known-vulnerable version (or introduces a new transitive CVE) merges with no automated GitHub Advisory/OSV check. `bun.lock` is tracked, but no PR-time gate rejects vulnerable locks.
- **compensating:** `bun.lock` is sha512-verified via `patchedDependencies`; narrow `trustedDependencies` + `ignoreScripts`; transitive overrides pin CVE-prone packages (see `02` §9 #12). Manual `bun audit`/OSV-Scanner is available but not enforced (recorded as `RISK-005`).
- **owasp:** A06 (Vulnerable and Outdated Components — no automated dependency-vuln gate) · **cwe:** CWE-1357, CWE-1104
- **fix direction:** Re-enable `dependabot.yml` (version updates + security updates) and `dependency-review-action` on PR open/update; require it as a status check before merge (pairs with `SEC-CI-001` branch-protection work).
- **AUTH note:** Branch-protection / required-checks state is `GITHUB_HOSTED_EVIDENCE_BLOCKED` (`AUTH-001`).
- **unit:** `UNIT-012` (AUXILIARY)

### `SEC-LOG-001` — `console.error("…failed", error)` bypasses `redactForLog` on 3 Worker cron paths; Workers Logs persists at 100%

- **class:** `OBSERVABILITY_OR_RESPONSE_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `worker.ts:225` (`"Five-minute scheduled drain failed"`); `:256` (`"Cloudflare scheduled upload jobs failed"`); `:292` (`"Retention pass failed"`). Plus `src/lib/admin/observability-repository.ts:75-83` (`message: error`). Contrast `worker.ts:97-114` (`logWorkerFetchError` correctly uses `redactMessage`).
- **trace:** Rejected promise from cron task → `.catch((error) => console.error("…failed", error))`. The `error` object is serialized by the Workers runtime without going through `redactForLog`. Workers Logs is `head_sampling_rate: 1`, `persist: true` → every error persisted.
- **compensating:** `redact.ts` is comprehensive for code paths that use `emitLogRecord`.
- **owasp:** A09 · **cwe:** CWE-532, CWE-209
- **fix direction:** Replace the three `console.error("…failed", error)` with `logAppError(error, { event, action })` or `emitLogRecord` with redacted fields.
- **unit:** `UNIT-010`

### `SEC-PRIV-001` — `admin_audit_events.actor_email` and `privacy_requests.requester_name` stored plaintext; admin observability exposes `user_agent`

- **class:** `PRIVACY_OR_DATA_GOVERNANCE_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/admin/audit-repository.ts:65-106` (`actor_email` plaintext, SELECTed back at `:146`); `src/lib/admin/observability-repository.ts:22-31,101-127` (`client_error_events.user_agent` up to 500 chars plaintext); `src/lib/compliance/privacy-request-repository.ts:47-60,174-203` (`requester_name`, `description` up to 4000 chars, `metadata_json` plaintext).
- **trace:** `writeAdminAuditEvent` → `INSERT INTO admin_audit_events (… actor_email …)`. No hashing (contrast `account_security_events` HMACs `ip_hash`/`user_agent_hash`).
- **compensating:** D1 bound to Worker only; app-enforced access.
- **why insufficient:** D1 backups (`scripts/generate-cloudflare-d1-restore-rehearsal.ts`) mean plaintext exists across restore points. Retention rules do not cover `admin_audit_events` at all → admin emails accumulate indefinitely.
- **owasp:** A04 Insecure Design · **cwe:** CWE-200, CWE-359
- **fix direction:** Hash `actor_email` with `AUTH_AUDIT_HASH_PEPPER`; truncate/hash `user_agent`; add retention rule for `admin_audit_events`.
- **unit:** `UNIT-010`

### `SEC-PRIV-002` — Retention registry omits several PII/security event tables

- **class:** `PRIVACY_OR_DATA_GOVERNANCE_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/lib/compliance/retention-core.ts:87-221` (`DEFAULT_RETENTION_RULES`). Missing: `admin_audit_events`, `client_error_events`, `web_vital_events`, `ops_run_events`, `cron_run_events`, `data_retention_events`.
- **trace:** `runRetentionPassInD1` iterates only `DEFAULT_RETENTION_RULES`; tables not in registry are never purged. DSAR/GDPR erasure cannot guarantee these tables.
- **compensating:** `estimate_sheet_events` correctly honors legal holds; `beta_activation_*` honors retention holds.
- **owasp:** A04; API10 · **cwe:** CWE-1300, CWE-223
- **fix direction:** Add retention rules for each D1 event table with documented TTL; have the cron verify a superset list (fail-closed if expected table count drops).
- **AUTH note:** Backup-side purge cadence is hosted evidence (`AUTH-002`).
- **unit:** `UNIT-011`

### `SEC-SHARE-002` — `GET /api/share/[token]` reveals publication existence + whether it is password-protected (404 vs 423 vs 200)

- **class:** `OBSERVABILITY_OR_RESPONSE_GAP` · **severity:** Medium · **confidence:** HIGH
- **affected:** `src/app/api/share/[token]/route.ts:36-62` (unknown → 404; active no-password → 200; active passworded → 423 with `{passwordRequired:true}` *before* checking access cookie).
- **trace:** Anonymous caller with a token candidate can distinguish unknown / known-no-password / known-passworded. Token entropy (256-bit) makes blind enumeration infeasible, but a token leaked via any other channel reveals "this is a live, password-protected proposal."
- **compensating:** 256-bit CSPRNG tokens; `passwordRequired:bool` is the only metadata leaked.
- **owasp:** A05; API8 · **cwe:** CWE-204, CWE-209
- **fix direction:** Return the same `sharedLinkUnavailableErrorBody()` (404) for both "not found" and "found but password-required without cookie." The page-route password gate already derives state without surfacing it to a cookie-less JSON caller.
- **unit:** `UNIT-013`

---

## Low / Informational

(For brevity in this register, Low/Informational findings are summarized. Full fields in `artifacts/findings.json`.)

- `SEC-AUTH-002` — Hardcoded dev-only default platform-admin email (`roles.ts:30-51`). Production fail-closed; dev-only fallback is control-drift bait. **Informational.** No unit — minor hardening recommendation (`SEC-011` wave).
- `SEC-AUTH-003` — `?error=state_mismatch` on any path triggers `Clear-Site-Data` (attacker-induced logout/cache-wipe via crafted link). `worker.ts:149-150` + `worker-route-optimizations.ts:228-248`. **Low.** Fix: gate to OAuth callback paths or to requests carrying a `state`/`oauth_state` cookie. **Unit:** `UNIT-013`.
- `SEC-AUTH-004` — Closed-beta gate is fully disabled when `CLOSED_BETA_ACCESS_ENABLED !== "true"` (opt-in rather than fail-closed). `closed-beta-access.ts:32-34,56-58`. **Low.** No unit — operator-config advisory.
- `SEC-AUTH-005` — Trusted-origins list augmented with request-derived `Host`/`x-forwarded-proto`. `cloudflare-better-auth-runtime.ts:75-80,91-103`. **Informational.** No unit.
- `SEC-SHARE-001` — Publication password verify is timing-distinguishable between "token exists" and "token does not exist" (no dummy scrypt on null branch). `publication/public-repository.ts:295-306`. **Low.** Fix: throwaway scrypt on null branch. **Unit:** `UNIT-013`.
- `SEC-SHARE-003` — Client Portal manifest leaks internal D1 primary keys (`portal.id`, `issue.id`). `client-portal/public-repository.ts:245`. **Low.** No unit — field-minimization advisory (token holders are already authorized).
- `SEC-SHARE-004` — Brand-asset fetch for password-protected portal after password solved (intentional). `client-portal/public-repository.ts:248-253`. **Informational (verified clean).** No unit.
- `SEC-SHARE-005` — PATCH/DELETE on client-portal messages rely on `assertSameOriginPublicPost` reused for non-POST methods (no explicit method whitelist). `client-portal/public-thread-handlers.ts:23-32`. **Low.** No unit (Origin check blocks genuine CSRF).
- `SEC-SHARE-007` — `legacy_password_hash` reused verbatim as Client Portal password hash during migration (authz-equivalent). `legacy-migration-service.ts:330-331`. **Informational (verified clean).** No unit.
- `SEC-COLLAB-005` — `GlobalPresence` accepts token via `?token=` query string (URL leakage). `global-presence.ts:38-50`. **Low.** **Unit:** `UNIT-013`.
- `SEC-COLLAB-006` — `recordInboundFrame` rate-limit state lives in WS attachment; reconnect resets window. `collaboration-room.ts:473-490`. **Low.** **Unit:** `UNIT-013`.
- `SEC-COLLAB-007` — Presence state carries arbitrary attacker-controlled JSON (no field cap). `collaboration-room.ts:283-309,351-376`. **Low.** **Unit:** `UNIT-013`.
- `SEC-COLLAB-008` — Alarm-driven auth-timeout loop is informational (single alarm slot pinned to auth-deadline). **Informational.** No unit.
- `SEC-OPS-002` — `CRON_SECRET` reuse + plain `===` in proof routers — **DUPLICATE** of `SEC-CRYPTO-001` + `SEC-OPS-001`. Merged.
- `SEC-OPS-003` — Upload-scan queue downloads full R2 objects into memory (downgraded to **Low** by verifier — bounded by 20MB ingress + 128MB Worker + DLQ). `scan-job.ts:93-111,329-398`. **Unit:** `UNIT-007`.
- `SEC-OPS-005` — Client Portal notification queue has no per-message idempotency; redelivery can double-send emails. `client-portal-notification-queue.ts:96-152`. **Low.** **Unit:** `UNIT-013`.
- `SEC-OPS-006` — Cron overlap: `*/5` drain and `30 3 * * *` retention both call `enqueuePendingClientPortalNotifications` without a run-lock. `worker.ts:201-237,269-303`. **Low.** **Unit:** `UNIT-013`.
- `SEC-OPS-007` — Cron error paths use `.catch(() => undefined)` on `recordCronRunEvent` — security-relevant failures fail open silently. `worker.ts:224-234,255-265,291-301`. **Low.** **Unit:** `UNIT-010`.
- `SEC-OPS-008` — Queue `waitUntil` swallows unhandled exceptions in consumer. `worker.ts:306-320`. **Informational.** No unit.
- `SEC-WORKER-005` — WebSocket upgrade responses skip request-id wrap and auth-state normalization. `worker.ts:167-183`. **Low.** **Unit:** `UNIT-013`.
- `SEC-WORKER-006` — D1-perf proof router interpolates table-name strings (bounded by constant tuple today). `d1-performance-proof-router.ts:319,391`. **Informational (latent).** No unit.
- `SEC-WORKER-007` — Inbound `X-Request-Id` echoed with `[A-Za-z0-9._:-]{7,127}` pattern; log-spoofing surface (no CRLF, so no header-splitting). `observability/request-id.ts:14,24-37,54-63`. **Informational.** No unit.
- `SEC-WORKER-008` — `next.config.ts:84-86` sets `typescript.ignoreBuildErrors: true` for Cloudflare proof build (real errors still caught by separate `bun run type-check`). **Informational.** No unit.
- `SEC-BROWSER-002` — `Cache-Control: s-maxage=31536000` on marketing pages with no `private` defense if a route ever serves a logged-in variant. `request-proxy.ts:45,201-203`. **Low (latent — currently safe; pages static, authenticated users routed away).** Fix: add `Cache-Tag` + purge, cap `s-maxage` to 1 day. **Unit:** `UNIT-013`. (Reclassified from Medium per verifier latent treatment; matches `findings.json` severity.)
- `SEC-BROWSER-004` — Recipient session `_ok` mirror cookie is `httpOnly: false` (intentional for client polling). `share/[token]/session/route.ts:113-119`. **Informational.** No unit.
- `SEC-BROWSER-006` — `SameSite=Lax` on publication-access/session cookies allows cross-site top-level navigation (consistent with link-possession = access model). `publication/security.ts:371,559`. **Informational.** No unit.
- `SEC-BROWSER-007` — No `Permissions-Policy`/`COOP`/`COEP`/`CORP` headers anywhere. `next.config.ts:166-300`. **Low (hardening).** **Unit:** `UNIT-013`.
- `SEC-BROWSER-008` — `sessionStorage` stores share comment drafts (XSS-exfiltratable if CSP bypassed). `SharePageComments.tsx:285-331`. **Low.** No unit (depends on `SEC-BROWSER-001` fix).
- `SEC-AI-001` — Package-builder sub-feature-flags fail-open by default (apply-tiers default `true` when master flag flips). `ai/package-builder/feature-flags.ts:18-27`. **Low.** **Unit:** `UNIT-013`.
- `SEC-AI-002` — `/api/ai/package-builder` has no quota/rate-limit (only `/api/ai/ask` does). `ai/rate-limit.ts:22-25`. **Low.** **Unit:** `UNIT-013`.
- `SEC-AI-003` — DeepSeek error response body can reach thrown Error (replaced before responding today). `ai/deepseek.ts:65-67`. **Informational.** No unit.
- `SEC-EXT-001/002/003` amalgam — Email subject CRLF + unescaped HTML in collaboration invites + email client no chokepoint validation. **Low** (downgraded from Medium by verifier — Cloudflare Email binding uses structured `MimeMessage`; HTML renders in webmail sandbox; inputs are workspace-author/admin-controlled). `collaboration/actions.ts:768-772`, `admin/support-actions.ts:78`, `email/cloudflare-email-client.ts:130-158`. **Unit:** `UNIT-004`.
- `SEC-EXT-004` (informational) — Google Maps `apiKey` in URL query (referer-restricted at GCP by design). **Informational.** No unit.
- `SEC-SUPPLY-001` — `npx -y skills@1.5.16` + mutable-tag `omx update`/`codex plugin marketplace upgrade` in dev-only `skills:update` script. `package.json:70`. **Low (dev-only).** **Unit:** `UNIT-012`.
- `SEC-CRYPTO-004` (informational) — `BETTER_AUTH_SECRET` rotation invalidates all sessions (7-day TTL acknowledged); publication token encryption secret has no key versioning in `aes-256-gcm-v1` envelope prefix. **Informational.** No unit.
- `SEC-LOG-002` — `listRecentRows` passes raw `error` object into `LogRecord.message`. `admin/observability-repository.ts:75-83`. **Low.** **Unit:** `UNIT-010`.
- `SEC-LOG-003` — Workers Logs persists at 100% sampling with no per-event platform redaction guarantee. `wrangler.jsonc:110-124`. **Low.** **Unit:** `UNIT-010`.
- `SEC-UPLOAD-006` — Attachment download serves user-controlled `file_name` in `Content-Disposition` (CR/LF stripped; residual cosmetic). `attachments/route.ts:60-66,511-519`. **Low.** No unit.
- `SEC-EXPORT-001/002` — (verified strengths, not findings) XLSX inline-string serializer + filename sanitization confirmed effective.

---

## Rejected / Refuted / Duplicate

`artifacts/rejected-refuted-findings.json` contains the full record. Summary:

- `SEC-WORKER-001` — "Canonical-host redirect trusts client Host header → open redirect/cache poisoning." **REFUTED on-platform** by the verifier: the canonical-host map is a hard-coded two-entry allowlist (`worker-route-optimizations.ts:35-38`); only path/query is preserved into the redirect, not host/scheme/userinfo; Cloudflare normalizes Host at the zone. Theoretical only.
- `SEC-WORKER-003` — "Proof routers mutate production D1 from public-internet-reachable endpoints." **DUPLICATE** of `SEC-WORKER-002` (same evidence, same surface).
- `SEC-OPS-002` — "`CRON_SECRET` reuse + non-constant-time compare in proof routers." **DUPLICATE** of `SEC-CRYPTO-001` + `SEC-OPS-001`.
- Two overcalled candidates from sweeps (one "missing Permissions-Policy as Medium", one "no COOP as Medium") were downgraded to Low/Informational per the verifier's overcall assessment — recorded as Low findings above, not rejected.

## Coverage note

No finding in this register rests on `STATIC_PATTERN_ONLY` evidence for severity ≥ Medium. Every Medium+ finding has `CURRENT_SOURCE_CONFIRMED` or `CALL_FLOW_CONFIRMED` evidence with exact `file:start-end` references that the verifier independently re-read at HEAD `7f9a484b4`.
