# Exports / Uploads / Auth / Observability Surface Map

Source: dispatched agent recon against `HEAD = a41a07d0143abf72289a97cd8bd023cfa9986361`.

## Export Pipeline (XLSX/PDF)

### Entry point
`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` (466 lines).
- `export const dynamic = "force-dynamic"` (line 18).
- `createXlsxResponse` at `:128-130` allocates `new ArrayBuffer(buffer.byteLength)` and copies via `new Uint8Array(body).set(buffer)` — **full second in-memory copy of the entire XLSX bytes**.
- Dynamic import for bundle isolation at `:166`.

### Workbook builder — NOT ExcelJS
- Custom hand-rolled OOXML writer at `src/lib/proposal-export/xlsx-workbook.ts`.
- Uses **STORE-mode (no-compression) ZIP** at `:230, 613, 662, 684` — payload is uncompressed.
- `create-proposal-workbook.ts` (779 lines) builds the model.
- `createProposalWorkbookBuffer(input)` returns `Promise<Uint8Array>` via `workbook.xlsx.writeBuffer()` at `xlsx-workbook.ts:775-778`. (Note: `workbook.xlsx.writeBuffer()` is the custom writer's API, not ExcelJS.)

### D1 load pattern
- Parallel via two `Promise.all` rounds in `estimate-tree-read-repository.ts:960-984` — not serial.
- All-tabs export fans out across tabs (up to 50 documented).

### Documented limits
- 50 tabs, 1,200 nodes, 3,000 row items, 60-second route ceiling.

## Uploads / R2 / Images

### Direct vs proxied upload paths
- Direct-upload finalize at `src/app/api/.../direct-upload/route.ts`.
- Direct-upload finalize **binds reserved SHA-256 against R2 HEAD checksum** at `:516-531`.
- Concurrent upload limits in `wrangler.jsonc` vars: `ARCH_UPLOAD_HOSTED_MEMORY_MB=128`, `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES=4194304` (4 MB), `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000`, `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS=3`.

### Malware scan flow
- **clamd-instream over TCP `127.0.0.1:3310`** at `src/lib/uploads/clamd-scanner.ts:9-13`.
- 5 s timeout, 1 MB chunks at `:94-136`.
- Gated by `UPLOAD_SCAN_PROVIDER=clamd` (`:158-166`).
- Scan job out-of-band at `/api/internal/upload-scan/route.ts:74` — cron/secret-gated.
- **Scan-override** at `src/app/api/component-library/attachments/scan-override/route.ts:17-21` — platform-admin-only.

### R2 operations
- `removeObjects` is **N parallel single-key deletes** at `r2-storage-provider.ts:74-77` — chunked to 100 by `cleanup-job.ts:22`.

### Image handling
- Cloudflare Images binding `IMAGES` (wrangler.jsonc:25-27).
- Custom loader at `image-loader.ts` when `isCloudflareWorkersProofBuild`.

## Authentication Overhead

### Critical: `disableCookieCache: true`
- Passed to `auth.api.getSession` at `src/lib/auth/better-auth-cloudflare.ts:317-319`.
- **Forces a D1 session lookup on EVERY authenticated request** — bypasses Better Auth's cookie cache.

### Per-request D1 cost (authenticated)
- Session lookup (above) + 2 more sequential D1 reads at `src/lib/auth/session.ts:65-77` (closed-beta + profile).
- React `cache()` at `session.ts:98` collapses duplicate calls within a single request but not across requests.

### Dev bypass
- Fully production-gated at `src/lib/auth/dev-auth-gate.ts:12-51`.

## Observability / Telemetry

### Web-vitals write amplification
- See react map: LCP/CLS/INP can each fire multiple POSTs per page view.
- Endpoint accepts 1 POST = 1 D1 INSERT via `recordWebVitalEvent`.
- Per page view minimum: 5-7 D1 writes; doubles to 9-11 on mobile tab-switch.
- `pagehide` listener leaked (anonymously added at `web-vitals-collector.tsx:157`, never removed in cleanup at `:162-168`).

### Client error route (compare)
- Rate-limited at 10/60s/IP at `src/app/api/internal/client-error/route.ts:9-10, 46-57`.
- Web-vitals route has NO rate limit (same volume concern).

### Cloudflare Workers log sampling (wrangler.jsonc)
- `head_sampling_rate = 1` (line 112) — full sampling.
- `logs.head_sampling_rate = 1` (line 115) — full log sampling.
- `logs.invocation_logs = true` (line 116).
- `logs.persist = true` (line 117).
- `traces.enabled = false` (lines 119-123).

### `consoleAppLogger` (dev-only concern)
- Synchronous `appendFileSync` on the hot path in dev at `src/lib/observability/logger.ts:83-86, 155-161`.

## Cost / Configuration Summary
- Upload limits: 128 MB memory, 4 MB body, 30 s duration, 3 concurrent.
- 4 crons including `*/5 * * * *` (~288 invocations/day).
- Queue observability: `max_concurrency` unset on both consumers.
