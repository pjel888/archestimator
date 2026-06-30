---
title: Owner Cloudflare Setup And Analytics Runbook
plan_id: 2026-06-29-cloudflare-migration-codex
document: 31
created: 2026-06-29
---

# Owner Cloudflare Setup And Analytics Runbook

## Current Status

Goal: move Archestimator to a full Cloudflare-native target so Vercel can be disabled after proof.

Current repo status:

- Initial Workers/OpenNext proof scaffolding exists: `wrangler.jsonc`, `open-next.config.ts`, Cloudflare build/preview/deploy scripts, ignored `.open-next`/Wrangler outputs, and a Cloudflare build flag for image-loader behavior.
- `wrangler` is installed as a repo dev dependency; no global install is required for repo scripts.
- Bun is available locally at version `1.3.14`.
- `vercel.json` still owns the live cron fallback for `/api/internal/upload-cleanup` and `/api/internal/upload-scan`. `wrangler.jsonc` now mirrors those schedules and declares local Queue/DLQ proof config, but provider-backed Cloudflare Cron/Queues/DLQ execution has not been proven.
- Vercel Analytics and Speed Insights are still globally loaded in `src/app/layout.tsx`.
- Google Analytics, Microsoft Clarity, and Cloudflare Web Analytics are optional, public-page-only, and consent-gated by `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, and `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`.
- `src/middleware.ts` now exposes the auth proxy in the Edge-compatible convention required by the current Cloudflare/OpenNext adapter, while `src/proxy/index.ts` preserves existing test imports.
- `worker.ts` wraps the generated OpenNext Worker, preserves generated Durable Object exports, and adds Cloudflare `scheduled()` and `queue()` handlers for upload cleanup/scan local proof.
- `wrangler.jsonc` declares an R2 binding named `ARCH_UPLOADS_R2` for proof bucket `archestimator-proof-uploads` and preview bucket `archestimator-proof-uploads-dev`; the provider buckets still need to be created before hosted proof.
- `wrangler.jsonc` also declares local Durable Object binding `COLLAB_ROOMS` for `CollaborationRoom`; `worker.ts` exposes a fail-closed local proof route at `/__cloudflare/collaboration-room/:roomName`.
- `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER` defaults to `supabase`; set it to `cloudflare-r2` only for R2 proof runs where the `ARCH_UPLOADS_R2` binding exists.

Current local proof:

- `bun run cf:typegen` passes.
- Focused proxy/auth Vitest matrix passed: `tests/vitest/auth-proxy.test.ts`, `tests/vitest/proxy-sensitive-cache-headers.test.ts`, `tests/vitest/security-findings-auth-contracts.test.ts`, and `tests/vitest/auth-magic-link.test.ts`.
- `bun run type-check` passes.
- `bun run cf:build` now passes and writes `.open-next/worker.js`.
- Local Cloudflare preview smoke passed through `opennextjs-cloudflare preview` on `http://localhost:8787`: `/api/health` returned 200 JSON with `x-opennext: 1`; `/`, `/login`, and `/pricing` returned 200.
- A reusable local route matrix now exists: `bun run cf:verify-preview-routes` runs `scripts/verify-cloudflare-worker-preview-routes.ts` against `CLOUDFLARE_WORKER_PREVIEW_BASE_URL` or `http://localhost:8787`. `.dev.vars.example` lists the publication secret bindings needed by local/deployed Worker proof, and the ignored local `.dev.vars` carries placeholder preview values. Evidence in `evidence/2026-06-29-cloudflare-worker-preview-route-probe.json` and `.md` passed local Worker probes for `/api/health`, public/signed-out pages (`/`, `/login`, `/pricing`, `/features`, `/about`, `/contact`, `/trust`, `/privacy`, `/terms`, `/signup`, `/access-required`), signed-out `/workshop`, invalid `/share/[token]`, invalid `/api/share/[token]`, and missing-path `/api/projects/images`.
- A reusable hosted route matrix now exists: `bun run cf:verify-hosted-routes` runs `scripts/verify-cloudflare-hosted-routes.ts` only against an HTTPS non-local deployed Worker URL supplied through `CLOUDFLARE_HOSTED_ROUTE_BASE_URL` or `CLOUDFLARE_HOSTED_WORKER_BASE_URL`. It rejects localhost/private URLs, does not call provider APIs or mutate resources, and currently writes `evidence/2026-06-30-cloudflare-hosted-route-proof.json` / `.md` with `configured=false` because no deployed Worker URL exists yet.
- A reusable Worker readiness preflight now exists: `bun run cf:check-readiness` runs `scripts/check-cloudflare-worker-readiness.ts` and checks `.env.example`, `.dev.vars.example`, `wrangler.jsonc` bindings/crons/observability sampling, package scripts, optional ignored local `.dev.vars` preview controls, and optional sanitized Cloudflare Worker secret-list transcripts without printing secret values. Evidence in `evidence/2026-06-29-cloudflare-worker-readiness.json` and `.md` passed local manifest/preview readiness and correctly kept hosted `deploymentReady=false` until Cloudflare provider secret-list/deployment evidence exists.
- A reusable Wrangler deploy dry-run preflight now exists: `bun run cf:check-deploy-dry-run` runs `scripts/check-cloudflare-wrangler-deploy-dry-run.ts`, executes `wrangler deploy --dry-run` without upload, sanitizes the log, and records local bundle/binding evidence. Evidence in `evidence/2026-06-30-cloudflare-wrangler-deploy-dry-run.json` and `.md` passed local dry-run readiness with required bindings present, including `COLLAB_ROOMS` and `UPLOAD_JOBS_QUEUE`, while keeping `productionDeployReady=false`.
- A reusable Wrangler/API auth preflight now exists: `bun run cf:check-wrangler-auth` runs `scripts/check-cloudflare-wrangler-auth.ts`, executes read-only `wrangler whoami --json`, sanitizes output, and records local CLI auth evidence without reading env files, printing tokens/secrets, creating resources, deploying, changing DNS, purchasing plans, or mutating providers. Evidence in `evidence/2026-06-30-cloudflare-wrangler-auth.json` and `.md` shows CLI/auth check completed, OAuth authenticated for account `7f6229cfea61b59f6f48b517fde86039`, `wranglerApiAuthenticated=true`, `providerReadbackReady=true`, and `productionDeployReady=false`.
- A reusable provider resource readback preflight now exists: `bun run cf:check-provider-resources` reads the local Wrangler config plus auth/readiness artifacts, then runs read-only Wrangler list/status commands for Worker deployments, D1, R2, Queues, and Worker secret names only after Wrangler/API auth is proven. Evidence in `evidence/2026-06-30-cloudflare-provider-resource-readback.json` and `.md` currently records `wranglerAuthenticated=true`, `providerReadbackAttempted=true`, D1/R2/Queues readback ready, and Worker deployment/secret-name readback not ready because the hosted Worker and sanitized secret-name proof do not exist yet.
- A reusable migration inventory now exists: `bun run cf:inventory` runs `scripts/generate-cloudflare-migration-inventory.ts` and writes route, provider-coupling, RPC, script, and SQL/RLS counts without reading env files or printing secret values. Evidence in `evidence/2026-06-30-cloudflare-migration-inventory.json` and `.md` captures `71` App Router route entries, `93` provider-coupled source files, `80` distinct app-code RPC names, `31` Cloudflare package scripts, and the current SQL/RLS counts for slice selection.
- A reusable local Queues/Cron proof now exists: `bun run cf:queues-cron-proof` runs `scripts/generate-cloudflare-queues-cron-proof.ts` against `wrangler.jsonc`, `worker.ts`, and `src/lib/cloudflare/upload-job-queue.ts`. Evidence in `evidence/2026-06-30-cloudflare-queues-cron-proof.json` and `.md` shows `localQueuesCronProofReady=true`, Queue binding `UPLOAD_JOBS_QUEUE`, queue `archestimator-upload-jobs`, DLQ `archestimator-upload-jobs-dlq`, `maxRetries=3`, `3` acked messages, `1` retried message, `1` duplicate ack, `1` invalid-message ack, and `1` DLQ-expected final retry. It intentionally keeps `providerBacked=false` and `productionJobsMessagingReady=false`.
- A reusable cost/performance workbook scaffold now exists: `bun run cf:workbook` runs `scripts/generate-cloudflare-cost-performance-workbook.ts` and writes missing provider-cost rows, inventory-derived Cloudflare planning rows, local-only Worker preview duration rows, and optional hosted credential-free timing rows. `bun run cf:verify-hosted-performance` runs `scripts/verify-cloudflare-hosted-performance.ts` only against an HTTPS non-local deployed Worker URL supplied through `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL`; it rejects localhost/private URLs and does not call provider APIs, read secrets, deploy, change DNS, or mutate billing/resources. Evidence in `evidence/2026-06-30-cloudflare-cost-performance-workbook.json` and `.md` keeps production cost decisions closed until sanitized Vercel/Supabase/Resend usage, refreshed Cloudflare pricing, hosted Worker metrics, current-provider baselines, authenticated/data-backed hosted proof, and provider logs exist.
- A reusable public DNS delegation preflight now exists: `bun run cf:check-dns-delegation` runs `scripts/check-cloudflare-dns-delegation.ts` and resolves public NS records for `archestimator.com` without provider APIs, env reads, secret printing, deployment, DNS mutation, billing, or provider removal. Evidence in `evidence/2026-06-30-cloudflare-dns-delegation.json` and `.md` shows public DNS still resolves to `dns1.registrar-servers.com` / `dns2.registrar-servers.com`, not Cloudflare's assigned nameservers.
- A reusable provider-readiness preflight now exists: `bun run cf:check-provider` runs `scripts/check-cloudflare-provider-readiness.ts` against sanitized dashboard facts plus the public DNS and Wrangler auth artifacts when present. Evidence in `evidence/2026-06-30-cloudflare-provider-readiness-source.json`, `evidence/2026-06-30-cloudflare-provider-readiness.json`, and `.md` shows account/zone/DNS import inventory is present, but API/Wrangler auth, Workers deployment, storage/media, jobs, analytics receipt, and production cutover remain false.
- A reusable D1 app-layer authorization matrix now exists: `bun run cf:d1-authz-matrix` runs `scripts/generate-cloudflare-d1-authz-access-matrix.ts` and maps current Supabase/RLS/RPC access paths to future D1 guard requirements plus positive/denial/cross-workspace test references. Evidence in `evidence/2026-06-30-cloudflare-d1-authz-access-matrix.json` and `.md` records `47` access paths with `47` positive tests, `47` denial tests, `41` required cross-workspace denial tests, route/action coverage ready, and no current matrix blockers.
- A reusable D1 RPC rewrite map now exists: `bun run cf:d1-rpc-map` runs `scripts/generate-cloudflare-d1-rpc-rewrite-map.ts` and maps each inventory RPC to a D1 rewrite strategy, golden fixture references, transaction needs, rollback/fail-closed gaps, and idempotency gaps. Evidence in `evidence/2026-06-30-cloudflare-d1-rpc-rewrite-map.json` and `.md` maps `80` of `80` RPCs with golden fixtures ready, while transaction, rollback, and idempotency proof gaps remain.
- A reusable D1 RPC transaction mechanics proof now exists: `bun run cf:d1-rpc-proof` runs `scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` and proves local all-or-nothing mutation, rollback-without-residue, and uniqueness/correlation-key idempotency mechanics with sanitized temporary SQLite data. Evidence in `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.json` and `.md` shows local transaction, rollback, and idempotency mechanics ready, while production RPC rewrite remains false until the per-RPC gaps in `cf:d1-rpc-map` close and hosted Worker+D1 mutation proof exists.
- A reusable D1 restore rehearsal now exists: `bun run cf:d1-restore-rehearsal` runs `scripts/generate-cloudflare-d1-restore-rehearsal.ts` and performs a local-only sanitized SQLite dump/import rehearsal. Evidence in `evidence/2026-06-30-cloudflare-d1-restore-rehearsal.json` and `.md` shows export/import/rehearsal/destructive-restore documentation ready with `localOnly=true`, `providerBacked=false`, matching source/restored checksums, and zero foreign-key violations.
- A reusable D1 performance scaffold now exists: `bun run cf:d1-performance-proof` runs `scripts/generate-cloudflare-d1-performance-proof.ts` and performs a local-only sanitized SQLite benchmark for representative indexed D1 read-model and authorization queries. Evidence in `evidence/2026-06-30-cloudflare-d1-performance-proof.json` and `.md` shows query-count budgets and local p95 proof ready with `localOnly=true`, `providerBacked=false`, while hosted Worker+D1 performance remains false.
- A reusable Better Auth local route-gate proof now exists: `bun run cf:better-auth-proof` runs `scripts/generate-cloudflare-better-auth-proof.ts` against `better-auth@1.6.22`, `src/lib/auth/better-auth-cloudflare.ts`, the fail-closed `src/app/api/auth/[...all]/route.ts` mount, the Wrangler D1 binding, generated types, and current Supabase auth gate files. Evidence in `evidence/2026-06-30-cloudflare-better-auth-route-gate-proof.json` and `.md` plus schema SQL in `evidence/2026-06-30-cloudflare-better-auth-d1-schema.sql` shows the local Better Auth/D1 route-gate scaffold ready with secure server-session checking, generated/statically reviewed D1 schema SQL, D1-backed signed-cookie session fixture coverage, and current Supabase gate preservation, while production Better Auth remains false because hosted D1 schema apply/restore, provider-secret/OAuth/magic-link/provider-backed callback-session cutover proof, and Supabase auth removal are incomplete.
- A reusable D1/Auth/Realtime readiness preflight now exists: `bun run cf:check-d1-auth-realtime` runs `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` and converts the current Supabase database/RLS/RPC/Auth/Realtime replacement blockers into a repeatable local report. Evidence in `evidence/2026-06-30-cloudflare-d1-auth-realtime-readiness.json` and `.md` shows database inventory, D1 binding, local Better Auth route-gate proof, app-layer authz coverage, local RPC transaction mechanics, local Durable Objects/WebSockets scaffold, local restore proof, local D1 query/p95 proof, and local reporting are ready, while production Better Auth replacement, per-RPC RPC rewrite, hosted Worker+D1 performance proof, and production D1/Auth/Realtime readiness remain false.
- A reusable release-gate aggregator now exists: `bun run cf:release-gates` runs `scripts/check-cloudflare-release-gates.ts` and combines the current inventory, pricing, workbook, D1/Auth/Realtime readiness, Worker readiness, preview route, hosted route, toolchain, Wrangler auth, provider resource readback, deploy dry-run, local Queues/Cron proof, and sanitized provider-readiness artifacts. Evidence in `evidence/2026-06-30-cloudflare-release-gates.json` and `.md` shows planning inputs, local runtime proof, provider dashboard inventory, and the local release-gate report are ready, while D1/Auth/Realtime proof, hosted route matrix proof, Wrangler/API auth readback, provider resource readback, provider proof, cost/performance proof, and production cutover remain false.
- Native `sharp` is isolated behind `src/lib/uploads/server-image-processing.ts` with a Cloudflare-only Turbopack alias to `src/lib/uploads/sharp-cloudflare-stub.ts`. Cloudflare proof builds now have an opt-in `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images` path that uses `env.IMAGES` for raw-byte WebP resize/thumbnail processing and keeps the existing 501 fail-closed route behavior when that provider flag or binding is absent. This clears the local Workers build blocker without claiming hosted uploads are production-ready on Workers.
- Cloudflare Web Analytics now has opt-in app wiring: `src/components/landing/CloudflareWebAnalytics.tsx` loads `https://static.cloudflareinsights.com/beacon.min.js` only after public-page analytics consent and only when `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is set. CSP source lists include the Cloudflare beacon script and RUM endpoints. The discovered dashboard token is intentionally not hard-coded.
- Cloudflare Cron Trigger local groundwork now passes:
  - `wrangler.jsonc` points at `worker.ts` and includes `0 3 * * *` / `15 3 * * *` triggers matching `vercel.json`.
  - `wrangler.jsonc` also declares Queue binding `UPLOAD_JOBS_QUEUE`, consumer queue `archestimator-upload-jobs`, `max_retries=3`, and dead-letter queue `archestimator-upload-jobs-dlq` for local retry/DLQ proof.
  - `src/lib/cloudflare/scheduled-upload-jobs.ts` dispatches matched cron events to the existing internal upload cleanup/scan routes, defaults to `dryRun=1`, and fails closed without `CRON_SECRET` or a route-specific job secret.
  - `src/lib/cloudflare/upload-job-queue.ts` and Worker `queue()` wiring provide the local queue message/consumer proof surface, including idempotency-key duplicate ack, poison-message ack, failed-job retry, and DLQ-expected final retry handling.
  - Focused cron/queue tests passed: `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts`, `tests/vitest/cloudflare-upload-job-queue.test.ts`, `tests/vitest/cloudflare-queues-cron-proof-script.test.ts`, and `tests/vitest/upload-cleanup-cron-config.test.ts`.
  - Focused upload cron/route matrix passed: `tests/vitest/upload-cleanup-route.test.ts`, `tests/vitest/upload-scan-route.test.ts`, `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts`, and `tests/vitest/upload-cleanup-cron-config.test.ts` (4 files / 21 tests).
  - `bunx tsc --noEmit --pretty false`, `bun run cf:typegen`, `bun run cf:build`, and `git diff --check` passed.
  - Local Worker preview proof hit `/api/health` successfully and manually hit `/cdn-cgi/handler/scheduled?cron=0+3+*+*+*` plus `/cdn-cgi/handler/scheduled?cron=15+3+*+*+*`; both scheduled calls returned `200 ok` and logged matched-job skips because no local cron secret was loaded. Wrangler warns that scheduled Workers are not automatically triggered during local development, so this proves the manual scheduled-handler path only.
- Cloudflare R2 upload/storage local groundwork now passes:
  - `src/lib/uploads/r2-storage-provider.ts` adapts the existing `UploadStorageProvider` contract to R2 Worker bindings with safe app bucket/path key mapping and R2 `put`/`get`/`delete` operations.
  - `src/lib/uploads/runtime-storage-provider.ts` selects Supabase by default and selects R2 only when `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2`; it fails closed if that mode is selected without `ARCH_UPLOADS_R2`.
  - Component, project, and estimate-row image routes now use provider-neutral storage upload/download/delete calls while leaving Supabase database/RPC records unchanged.
  - The server-mediated component attachment route now uses provider-neutral storage upload/download/delete calls for standard uploads, approved private download brokering, and draft cleanup delete while leaving Supabase database/RPC/audit records unchanged.
  - The direct signed/TUS component attachment route now fails closed for new session creation when `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2`, before any Supabase direct-upload signer or session RPC is used; existing Supabase direct-upload sessions can still finalize.
  - Internal upload cleanup and scan routes now create their job storage adapters from the same runtime provider, so R2 proof mode uses `ARCH_UPLOADS_R2` for cleanup deletes and scan downloads while Supabase still owns database reads, audit writes, and scan result RPCs.
  - Signed-read and public URL operations fail closed unless a future signer/read route or explicit public base URL is injected.
  - Focused tests passed: `tests/vitest/upload-runtime-storage-provider.test.ts`, `tests/vitest/cloudflare-r2-storage-provider.test.ts`, `tests/vitest/upload-storage-provider.test.ts`, `tests/vitest/auth-sensitive-api-boundaries.test.ts`, and `tests/vitest/project-creation-ui.test.ts` (5 files / 88 tests), including mocked OpenNext `ARCH_UPLOADS_R2` component-image route POST/GET proof.
  - Focused lifecycle route tests passed: `tests/vitest/upload-cleanup-route.test.ts`, `tests/vitest/upload-scan-route.test.ts`, `tests/vitest/upload-runtime-storage-provider.test.ts`, and `tests/vitest/cloudflare-r2-storage-provider.test.ts` (4 files / 22 tests), including mocked R2 cleanup delete and scan download proof.
  - Focused attachment private-read tests passed: `tests/vitest/auth-sensitive-api-boundaries.test.ts`, `tests/vitest/component-library-attachment-lifecycle.test.ts`, `tests/vitest/upload-attachment-scan-freeze.test.ts`, `tests/vitest/upload-runtime-storage-provider.test.ts`, and `tests/vitest/cloudflare-r2-storage-provider.test.ts` (5 files / 82 tests), including mocked R2 component attachment upload, approved private download, and draft cleanup delete proof.
  - Focused direct-upload fail-closed tests passed: `tests/vitest/upload-signed-route.test.ts` and `tests/vitest/upload-runtime-storage-provider.test.ts` (2 files / 19 tests), including signed single-part and TUS-size create requests in R2 mode without Supabase signer/session RPC use.
  - `bunx tsc --noEmit --pretty false`, `bun run cf:typegen`, and `bun run cf:build` passed with `ARCH_UPLOADS_R2: R2Bucket` in generated runtime types.
- Cloudflare Images processing local groundwork now passes:
  - `wrangler.jsonc` declares `images: { binding: "IMAGES" }`.
  - `src/lib/uploads/server-image-processing.ts` keeps Node deploys on Sharp by default and uses Cloudflare Images only when `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images` is selected.
  - The Cloudflare path validates format/dimensions with `IMAGES.info()`, outputs optimized and thumbnail WebP images via `IMAGES.input(...).transform(...).output(...)`, and fails closed if `IMAGES` is missing.
  - Focused tests passed: `tests/vitest/cloudflare-image-processing.test.ts` plus the upload route/storage matrix (6 files / 93 tests).
  - `bunx tsc --noEmit --pretty false`, `bun run cf:typegen`, `bun run cf:build`, and `git diff --check` passed with `IMAGES: ImagesBinding` in generated runtime types.

Current migration verdict:

- The app is not Vercel-cancelable yet.
- The next blockers are Wrangler/API authentication, read-only provider resource readback, provider-backed Workers project/deploy proof, custom-domain smoke proof, hosted runtime route matrix proof, Cloudflare env/secret configuration with sanitized secret-list evidence, provider-backed Cloudflare Cron/Queues execution proof, provider-visible analytics proof, provider-backed R2 upload/private-object proof, direct signed/TUS R2 signer/replacement proof, provider-backed upload cleanup/scan lifecycle proof, paid/enabled Cloudflare Images binding proof, and end-to-end hosted upload proof.
- Do not deploy or cut over production DNS until a Workers preview/custom-domain smoke test passes with rollback notes and route coverage beyond the local smoke above.

Automation status:

- Earlier macOS automation attempts failed, but a later Computer Use/Chrome pass succeeded for bounded dashboard setup and read-only evidence capture.
- Browser pass stayed inside safety gates: no paid checkout, no API token, no live DNS edit, no registrar nameserver change, and no provider cancellation.

## Dashboard Evidence Update

Checked: 2026-06-29 22:04 PST / 2026-06-29T14:04:58Z
Follow-up browser read: 2026-06-30 Manila / 2026-06-29T23:43Z opened `https://dash.cloudflare.com/` in the Codex in-app browser and reached Cloudflare login only. No credentials were entered and no new dashboard/provider readback was captured.

- Cloudflare account name: `Philipjonlewis@gmail.com's Account`
- Account ID: `7f6229cfea61b59f6f48b517fde86039`
- Zone `archestimator.com` exists: yes
- Zone ID: `3c6fcddb743342bfe8b0097ba5ba7c19`
- Zone plan: Free
- Nameserver status: waiting for registrar propagation; Cloudflare assigned `carl.ns.cloudflare.com` and `ziggy.ns.cloudflare.com`; current registrar/public DNS nameservers remain `dns1.registrar-servers.com` and `dns2.registrar-servers.com`.
- Imported DNS records reviewed: yes, 9 imported records were visible: apex A to `216.150.1.1`, `www` CNAME to `bb7ab57cfa50fcad.vercel-dns-017.com`, 5 Namecheap email-forwarding MX records, SPF TXT, and `_dmarc` TXT.
- Workers plan: Free current plan; no Workers & Pages projects exist yet; account subdomain is `philipjonlewis.workers.dev`.
- Workers Paid checkout status: viewed but not purchased.
- Web Analytics status: property created for `archestimator.com`; dashboard confirmed setup complete; app has opt-in public-page wiring but no provider metrics receipt proof yet.
- Public Web Analytics token/snippet: token `0e1181131e76497d9d75a03cfcc461b4`; snippet source `https://static.cloudflareinsights.com/beacon.min.js`.
- Local Wrangler auth check: `bun run cf:check-wrangler-auth` completed read-only and authenticated through OAuth (`wranglerApiAuthenticated=true`, `providerReadbackReady=true`).
- Proof resource names created: Cloudflare zone, Web Analytics property, D1 `archestimator-proof-db`, preview D1 `archestimator-proof-db-dev`, R2 buckets `archestimator-proof-uploads` / `archestimator-proof-uploads-dev`, and Queues `archestimator-upload-jobs` / `archestimator-upload-jobs-dlq`.
- Actions intentionally not taken: API token creation, live DNS edits, registrar nameserver changes, Worker secret value upload, hosted Worker deployment, Vercel/Supabase/Resend cancellation, and provider resource deletion.

## Safety Rule

Do not cancel Vercel, remove Vercel DNS, remove Supabase, disable Resend, change production nameservers, or delete provider resources until the matching Cloudflare replacement has provider proof and rollback proof.

Vercel is cancelable only after:

- A Cloudflare Workers custom domain is serving the app.
- Workers/OpenNext route proof passes for public, auth, workshop, share, upload, and error routes.
- Vercel cron is replaced by Queues/Cron Triggers or deliberately retired.
- Vercel Analytics/Speed Insights are replaced by Cloudflare Web Analytics, Workers Observability, logs, or another approved analytics path.
- Vercel env vars are copied into Cloudflare build/runtime variables and secrets.
- Rollback is rehearsed or explicitly accepted as no longer needed.

## Required Cloudflare Subscriptions

Use these as execution-date guidance and re-check Cloudflare docs before purchase:

| Need | Current Cloudflare requirement | Owner action |
| --- | --- | --- |
| Workers/OpenNext app hosting with serious proof capacity | Workers Paid recommended. Current docs list a $5/month account minimum for Workers Paid and higher included usage than Workers Free. | Subscribe to Workers Paid when ready to create proof resources. |
| D1 | Available on Workers Free and Workers Paid, but production proof should use Workers Paid because the final stack also needs paid Workers capacity. | Create proof/staging D1 after Workers Paid is active. |
| R2 | Usage-billed storage/product, no Vercel dependency. | Create `archestimator-proof-uploads` and `archestimator-proof-uploads-dev` before hosted upload proof; the local binding and adapter are staged but not provider-proven. |
| Queues/Cron | Included in Workers plans with usage limits. | Create proof queue and dead-letter queue when cron/job slice starts. |
| Durable Objects/WebSockets | Included under Workers plans; proof likely needs Workers Paid. | Create only when realtime slice starts. |
| Email Service outbound sending | Current docs say arbitrary-recipient outbound sending requires Workers Paid; verified destination sends are free. | Keep Resend until Email Service proof passes. |
| Web Analytics | Current docs say available on all plans. | Enable for the production domain and proof domain. |
| Zaraz | Current docs say available on all plans. | Optional if moving GA4/Clarity tags out of app code. |
| Cloudflare Images transformations | Current docs say transformations are available on Free and Paid Images plans, with 5,000 unique transformations/month included on Free and paid usage beyond that on Images Paid. | Use for hosted upload/image-processing proof; monitor cost before launch. |
| WAF/rate limiting | Cloudflare zone Free is enough to start; Pro/Business may be useful later for managed rule depth/support/limits. | Start with Free zone unless a specific WAF feature requires upgrade. |

Official docs checked on 2026-06-29:

- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Email Service pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Web Analytics: https://developers.cloudflare.com/web-analytics/
- Zaraz: https://developers.cloudflare.com/zaraz/
- Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Vercel to Workers migration: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/
- OpenNext custom Worker wrapper: https://opennext.js.org/cloudflare/howtos/custom-worker
- Workers scheduled handlers: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- R2 Workers API reference: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Wrangler R2 bucket binding config: https://developers.cloudflare.com/workers/wrangler/configuration/#r2-buckets
- OpenNext Cloudflare bindings: https://opennext.js.org/cloudflare/bindings
- Workers Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare Images Workers binding: https://developers.cloudflare.com/images/optimization/binding/
- Cloudflare user-uploaded image to R2 tutorial: https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/

## Owner Dashboard Steps

### Step 1: Prepare Cloudflare Account

1. Log in to Cloudflare or create a Cloudflare account.
2. Do not create production DNS changes yet.
3. Confirm the account email, organization name, and billing profile.
4. Enable two-factor authentication.
5. Record the Cloudflare account name in the cost workbook.

Agent can continue after this with read-only setup guidance, but cannot finish paid setup without owner action.

### Step 2: Add The Domain Zone

Production domain assumption: `archestimator.com`. This is still marked gated in code as the assumed canonical origin, so confirm before production cutover.

1. In Cloudflare dashboard, choose **Add a domain**.
2. Enter the production domain.
3. Choose the Free website/zone plan at first unless a specific WAF/rate-limit feature requires Pro.
4. Let Cloudflare scan DNS records.
5. Compare imported DNS with current DNS, Vercel, Resend, Google Workspace/email, support inbox, and any verification records.
6. Do not change registrar nameservers yet unless the DNS record review is complete.

Stop condition:

- The zone can exist in Cloudflare as a reviewed staging/control surface.
- Production traffic still uses the current provider path until cutover proof.

### Step 3: Subscribe To Workers Paid

This is a paid subscription action and must be done by Philip.

1. In Cloudflare dashboard, open **Workers & Pages**.
2. Open billing/plan settings for Workers.
3. Select **Workers Paid**.
4. Confirm the current minimum monthly charge and overage pricing in Cloudflare's checkout.
5. Complete checkout only if the displayed price matches the current cost posture.

Expected reason:

- Workers Paid is the minimum practical path for the desired all-Cloudflare target because it unlocks serious Workers capacity, better logs, Durable Objects usage posture, and arbitrary-recipient Email Service sending.

### Step 4: Create Proof Resources, Not Production Resources

Use proof names first:

- Worker: `archestimator-proof`
- D1 database: `archestimator-proof-db`
- R2 bucket: `archestimator-proof-uploads`
- Queue: `archestimator-upload-jobs`
- Dead-letter queue: `archestimator-upload-jobs-dlq`
- Web Analytics site: `archestimator.com` and any proof/custom domain used for testing
- Turnstile widget: `archestimator-proof`

These can be created through dashboard or later through Wrangler after account authentication is available. Do not bind them to production traffic until proof passes.

### Step 5: Give The Agent Non-Secret Identifiers

Safe to share in the repo or chat:

- Cloudflare account ID.
- Cloudflare zone ID.
- Proof resource names.
- Public Turnstile site key.
- Public Web Analytics beacon/token if Cloudflare treats it as public snippet data.

Do not paste secrets into chat:

- Cloudflare API token.
- Turnstile secret key.
- Email Service secret/binding secret.
- OAuth client secrets.
- Supabase service role.
- Resend API key.

For agent deployment work, use one of these:

1. Run `wrangler login` locally in a terminal you control.
2. Create a narrowly scoped Cloudflare API token in the dashboard and store it in local shell secrets or Cloudflare build secrets, not in the repo.

Creating persistent API tokens is an action-time confirmation step.

## Analytics Migration Decision

Current analytics state:

- `@vercel/analytics` and `@vercel/speed-insights` are loaded globally in production.
- The app redacts Vercel analytics events for `/share`, `/invite`, and `/workshop`.
- GA4 and Clarity are loaded only after landing-page analytics consent.
- A/B tracking sends experiment and conversion events to `window.gtag` and `window.clarity` when those tools exist.
- CSP already allows Google Analytics, Google Tag Manager, and Microsoft Clarity endpoints.

Recommended analytics target:

1. Replace Vercel Analytics with Cloudflare Web Analytics for public page and Web Vitals visibility.
2. Replace Vercel Speed Insights with Cloudflare Web Analytics, Workers Observability, Workers Logs, and route timing metrics.
3. Keep GA4 and Microsoft Clarity initially, because they are separate from Vercel and are already consent-gated.
4. Decide later whether to move GA4/Clarity to Cloudflare Zaraz.

Do not treat Cloudflare Web Analytics as a full replacement for Clarity session replay or GA4 marketing attribution. It is a strong Vercel Analytics/Speed Insights replacement, not necessarily a complete marketing analytics replacement.

### Analytics Option A: Keep GA4 And Clarity In App Code

Best first choice.

Tasks:

- Keep `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- Keep `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
- Keep the landing consent banner.
- Keep CSP allowances for GA4/Clarity.
- Add Cloudflare Web Analytics separately.
- Remove Vercel Analytics and Speed Insights only after Cloudflare analytics proof passes.

Pros:

- Fastest path off Vercel.
- No marketing analytics regression.
- Keeps current A/B experiment tracking behavior.

Cons:

- Third-party scripts still load in the browser after consent.

### Analytics Option B: Move GA4 And Clarity To Zaraz

Good later optimization.

Tasks:

- Enable Zaraz for the Cloudflare zone.
- Add Google Analytics and Microsoft Clarity tools in Zaraz.
- Map consent rules to existing analytics consent.
- Replace direct `GoogleAnalytics` and `ClarityScript` loading.
- Rewire A/B events to Zaraz Web API or keep a compatibility bridge.

Pros:

- Less third-party script cost in app code.
- Centralized tool management in Cloudflare.

Cons:

- Needs event parity proof.
- Some GA/Clarity features may differ through Zaraz.

### Analytics Option C: Cloudflare-Only Analytics

Cleanest privacy/performance model, but not equivalent.

Tasks:

- Remove GA4 and Clarity env vars/scripts.
- Keep Cloudflare Web Analytics.
- Add Workers/custom event metrics for funnel and conversion events.
- Update privacy notice and consent copy.

Pros:

- Fewer third-party tools.
- Cleaner privacy posture.

Cons:

- Loses Clarity replay/heatmaps.
- Loses GA4 marketing attribution unless rebuilt.

## First Implementation Slice After Owner Setup

Do not start with D1/Auth/Realtime replacement. The first local slice has already started:

1. `wrangler` and `@opennextjs/cloudflare` are installed as repo dependencies.
2. A manual `wrangler.jsonc` proof config and `open-next.config.ts` exist.
3. Cloudflare build/preview/deploy scripts exist.
4. Auth proxy/middleware compatibility proof passed.
5. Workers/OpenNext build proof passed after native `sharp` was isolated from the Cloudflare bundle.

Next local implementation slice:

1. Create a provider-backed Workers project/deployment only after env/secret strategy and rollback path are clear.
2. Run the hosted Workers runtime route matrix with `bun run cf:verify-hosted-routes` after a deployed HTTPS Worker URL exists, then extend the matrix to auth redirects, share routes, workshop route denial, upload/image/CSP behavior, and Server Actions.
3. Run the Cloudflare Images/R2 upload route through hosted provider proof with `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images` and `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2`.
4. Prove Cloudflare Web Analytics receives events from a deployed/proof domain; the app wiring now exists, but provider metrics receipt proof is still open. Keep GA4/Clarity consent-gated and Vercel Analytics/Speed Insights active until equivalent metrics are visible.
5. Replace Vercel cron with Cloudflare Queues/Cron proof.

Only after this passes should the team move to:

- R2 upload proof.
- Queues/Cron proof.
- Better Auth proof.
- D1 proof.
- Durable Objects provider-backed realtime proof beyond the local `COLLAB_ROOMS` scaffold.
- Email Service proof.

## Immediate Blockers

- Workers Paid is not active; current Workers plan is Free.
- No Cloudflare API authentication is available to the local CLI.
- The Cloudflare zone is waiting for nameserver propagation; registrar nameservers were intentionally not changed and fresh public DNS still resolves to Namecheap nameservers.
- No Workers & Pages project/deployment exists yet.
- No provider cost/dashboard export exists yet.
- Web Analytics exists in Cloudflare dashboard and is wired behind `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`, but no deployed-provider metrics receipt proof exists yet.
- Cloudflare Images processing is locally wired but not provider-proven; no paid/enabled Images binding or hosted upload proof exists yet.

## What Philip Needs To Do Next

1. Review the imported DNS records before any registrar nameserver change.
2. Subscribe to Workers Paid only when ready for the proof program and after checkout pricing is acceptable.
3. Decide analytics path: keep GA4/Clarity for now, move them to Zaraz, or remove them later; set `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` in the target Cloudflare/Vercel environment only when ready to collect public-page analytics.
4. Either run `wrangler login` locally or create a scoped API token and store it outside the repo.
5. Export or screenshot current Vercel/Supabase/Resend usage and billing for the cost workbook.
6. Keep Vercel active until Cloudflare custom-domain proof, cron/job proof, analytics proof, env/secret proof, and rollback proof pass.

Once those are done, the agent can start the provider-backed Workers deployment and broader runtime proof slice.
