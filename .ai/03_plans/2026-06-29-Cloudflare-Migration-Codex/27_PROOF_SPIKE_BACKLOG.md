---
title: Proof Spike Backlog
plan_id: 2026-06-29-cloudflare-migration-codex
document: 27
---

# Proof Spike Backlog

This backlog is the execution order before production migration. Each spike must be reversible and must preserve current providers as fallback.

## P0: Inventory, Cost, And Baseline

Goal: know what exists before moving it.

Pass criteria:

- `26_INVENTORY_WORKSHEETS.md` has completed rows for the first selected slice.
- Current Vercel/Supabase/Resend cost and usage data is captured.
- Baseline speed measurements exist for public, share, workshop, estimate, upload, realtime, and email paths.
- Official Cloudflare docs, Wrangler schema, Workers types, and installed Cloudflare skills are refreshed.

Fail criteria:

- Provider dashboard data is unavailable.
- Route/provider ownership is unknown for the chosen slice.

Local inventory status on 2026-06-30:

- `scripts/generate-cloudflare-migration-inventory.ts` and `bun run cf:inventory` now generate a repeatable local migration inventory without reading env files or printing secret values.
- Evidence in `evidence/2026-06-30-cloudflare-migration-inventory.json` and `.md` captures the current route/provider/RPC/script/SQL surface: `71` App Router route entries, `93` provider-coupled source files, `80` distinct app-code RPC names, `92` package scripts including `29` Cloudflare scripts and `8` provider-readiness scripts, `108` script files, `181` applied SQL migrations, `13` pending-review SQL files, `346` SQL function declaration/update matches, and `684` RLS/policy/storage/auth SQL matches.
- This satisfies the repeatable local inventory artifact for selecting a first slice; it does not complete per-route/per-RPC worksheet rows, cost capture, provider-dashboard usage data, baseline speed measurements, or the full official-doc/Wrangler-schema/Workers-types refresh.

Local cost/performance workbook status on 2026-06-30:

- `scripts/generate-cloudflare-cost-performance-workbook.ts` and `bun run cf:workbook` now generate a repeatable workbook scaffold from the local inventory plus the local Worker route probe.
- `scripts/verify-cloudflare-hosted-performance.ts` and `bun run cf:verify-hosted-performance` now provide a repeatable hosted Worker timing harness for credential-free routes. It requires `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL` to be an HTTPS non-local deployed Worker URL, rejects localhost/private-network URLs, does not call provider APIs or read secrets, and writes JSON/Markdown only when an output path is supplied.
- `scripts/generate-cloudflare-pricing-snapshot.ts` and `bun run cf:pricing` now validate a dated official Cloudflare pricing source and generate a repeatable pricing snapshot.
- Evidence in `evidence/2026-06-30-cloudflare-official-pricing-source.json`, `evidence/2026-06-30-cloudflare-official-pricing-snapshot.json`, and `.md` covers `13` required Cloudflare product surfaces from official Cloudflare URLs with `officialCloudflarePricingRefreshed=true` and `productionCostDecisionReady=false`.
- Evidence in `evidence/2026-06-30-cloudflare-cost-performance-workbook.json` and `.md` keeps `currentProviderCostsReady=false`, `cloudflarePricingRefreshed=true`, `cloudflareUsageCostsReady=false`, `hostedCredentialFreePerformanceCaptured=false`, `hostedPerformanceReady=false`, and `productionCostDecisionReady=false`.
- The scaffold records local-only Worker preview duration rows for public home (`168.47ms` p95), pricing/features (`13.68ms` p95), login (`13.07ms` p95), invalid share (`327.35ms` p95), and signed-out workshop (`4.03ms` p95). These are not current-provider baselines, hosted Cloudflare TTFB, Worker CPU, provider logs, or production speed proof.

Local platform toolchain status on 2026-06-30:

- `scripts/check-cloudflare-platform-toolchain.ts` and `bun run cf:check-toolchain` now snapshot the local Cloudflare toolchain without provider API calls, env-file reads, or secret values.
- Evidence in `evidence/2026-06-30-cloudflare-platform-toolchain.json` and `.md` shows `localToolchainSnapshotReady=true`, Wrangler `4.105.0`, `@opennextjs/cloudflare` `1.20.1`, Next.js `16.2.6`, TypeScript `6.0.3`, compatibility date `2026-06-29`, `nodejs_compat` enabled, configured binding names `ARCH_DB`/`ARCH_UPLOADS_R2`/`ASSETS`/`COLLAB_ROOMS`/`IMAGES`/`UPLOAD_JOBS_QUEUE` typed in `cloudflare-env.d.ts`, Workers Observability configured in `wrangler.jsonc` with 10% logs/invocation-log sampling and 5% traces sampling, and `productionDeployReady=false`.
- Remaining local/tooling gaps: direct `@cloudflare/workers-types` is not installed as a standalone package, Wrangler/API authentication is not proven, no hosted Worker/custom-domain deployment proof exists, and no Cloudflare dashboard observability receipt has been captured.

Local Wrangler deploy dry-run status on 2026-06-30:

- `scripts/check-cloudflare-wrangler-deploy-dry-run.ts` and `bun run cf:check-deploy-dry-run` now run `wrangler deploy --dry-run` into `.wrangler/tmp`, sanitize the log, parse required binding evidence, and write repeatable no-upload evidence.
- Evidence in `evidence/2026-06-30-cloudflare-wrangler-deploy-dry-run.json` and `.md` shows `localWranglerDryRunReady=true`, `productionDeployReady=false`, dry-run exit code `0`, dry-run no-upload marker present, `302` asset files read, total upload `20431.97 KiB` / gzip `4432.50 KiB`, required bindings `ARCH_DB`/`ARCH_UPLOADS_R2`/`ASSETS`/`COLLAB_ROOMS`/`IMAGES`/`UPLOAD_JOBS_QUEUE` present, metafile output bytes `50292260`, and no Wrangler dry-run warnings.
- This is compile/bundle/binding evidence only. It does not prove Wrangler/API auth, hosted request handling, custom domains, remote binding resources, Workers Paid, observability receipt, DNS cutover, or rollback.

Local Wrangler/API auth status on 2026-06-30:

- `scripts/check-cloudflare-wrangler-auth.ts` and `bun run cf:check-wrangler-auth` now run a read-only `wrangler whoami` check, sanitize output, and write repeatable CLI auth evidence without reading env files, printing tokens/secrets, creating resources, deploying, changing DNS, purchasing plans, or mutating providers.
- Evidence in `evidence/2026-06-30-cloudflare-wrangler-auth.json` and `.md` shows Wrangler `4.105.0`, `wranglerCliAvailable=true`, `wranglerAuthCheckCompleted=true`, but `wranglerApiAuthenticated=false`, `providerReadbackReady=false`, and `productionDeployReady=false`.
- Earlier local Wrangler-auth blocker is superseded: Wrangler OAuth/provider readback is now authenticated for account `7f6229cfea61b59f6f48b517fde86039`. Current provider blockers are narrower: DNS is still delegated to Namecheap, Cloudflare Email Sending has no onboarded active-zone domain, Better Auth Google OAuth secret names are missing on `archestimator-proof`, and legacy Supabase/Resend runtime references remain.

Local provider readiness status on 2026-06-30:

- `scripts/check-cloudflare-provider-readiness.ts` and `bun run cf:check-provider` now evaluate sanitized Cloudflare dashboard facts without calling provider APIs, reading env files, printing secret values, or mutating DNS/resources/billing.
- `scripts/check-cloudflare-dns-delegation.ts` and `bun run cf:check-dns-delegation` now add a public DNS delegation/cutover preflight for `archestimator.com` without Cloudflare API calls, env reads, secret printing, provider mutation, deployment, billing, or DNS changes.
- Evidence in `evidence/2026-06-30-cloudflare-dns-delegation.json` and `.md` shows public DNS is still `dns1.registrar-servers.com` / `dns2.registrar-servers.com`, not Cloudflare's assigned `carl.ns.cloudflare.com` / `ziggy.ns.cloudflare.com`; it also snapshots public apex/www/MX/TXT records and captures the Cloudflare DNS table: apex/www Worker records point to `archestimator-proof`, while MX/SPF/DMARC preserve the current Namecheap forwarding records.
- Evidence in `evidence/2026-06-30-cloudflare-provider-readiness-source.json`, `evidence/2026-06-30-cloudflare-provider-readiness.json`, and `.md` now folds in the public DNS and Wrangler auth artifacts when present. Dashboard inventory is ready, but Workers deployment, storage/media, jobs, analytics receipt, and production cutover are not ready.
- Current blockers remain: public DNS nameservers still do not point at Cloudflare, Better Auth Google OAuth secret names are missing, Cloudflare Email Sending cannot onboard while the zone is inactive, Supabase/Resend runtime references remain, Cloudflare Images provider proof is missing, and Web Analytics receipt is not provider-proven.

Local D1/Auth/Realtime readiness status on 2026-06-30:

- `scripts/generate-cloudflare-d1-authz-access-matrix.ts` and `bun run cf:d1-authz-matrix` now generate an executable local app-layer authorization matrix tying current Supabase/RLS/RPC access paths to future D1 guard requirements and positive/denial/cross-workspace test references.
- Evidence in `evidence/2026-06-30-cloudflare-d1-authz-access-matrix.json` and `.md` currently records `47` DB-backed authorization-relevant access paths, `47` rows with positive test references, `47` rows with denial/fail-closed references, `41` rows with cross-workspace denial references, `allProtectedAccessPathsCovered=true`, `routeActionCoverageReady=true`, and `crossWorkspaceDenialsReady=true`.
- `scripts/generate-cloudflare-d1-rpc-rewrite-map.ts` and `bun run cf:d1-rpc-map` now generate a per-RPC D1 rewrite map from the sanitized migration inventory plus Vitest references without reading env files or calling providers.
- Evidence in `evidence/2026-06-30-cloudflare-d1-rpc-rewrite-map.json` and `.md` currently records `80` total RPC names, `80` mapped RPC names, `80` golden fixture references, `54` transaction-sensitive RPCs, `44` idempotency-sensitive RPCs, `goldenFixturesReady=true`, `transactionProofReady=true`, `rollbackProofReady=true`, `idempotencyProofReady=true`, and no local rewrite-map blockers. Stable read-model, authorization, list, preview, summary, seed, and route-context RPCs are not counted as write-proof blockers; the final local mutation proof references are covered by contract assertions for `record_mass_deletion_storage_cleanup_result` and `ensure_current_user_profile`.
- `scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` and `bun run cf:d1-rpc-proof` now generate a local-only D1 RPC transaction/rollback/idempotency mechanics proof from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.json` and `.md` currently records `localTransactionMechanicsReady=true`, `localRollbackMechanicsReady=true`, `localIdempotencyMechanicsReady=true`, `localRpcMechanicsProofReady=true`, `productionRpcRewriteReady=false`, `localOnly=true`, `providerBacked=false`, `4` covered proof patterns, `0` rollback residue rows, and `0` duplicate side effects across representative activity-audit, bulk-delete, collaboration, component-library, estimate-history, publication, and upload domains. This clears reusable local mechanics only; `cf:d1-rpc-map` remains the production per-RPC gate.
- `scripts/generate-cloudflare-d1-restore-rehearsal.ts` and `bun run cf:d1-restore-rehearsal` now generate a local-only D1 restore rehearsal artifact from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-restore-rehearsal.json` and `.md` currently records `d1ExportReady=true`, `d1ImportReady=true`, `restoreRehearsalReady=true`, `destructiveRestoreDocumented=true`, `localOnly=true`, `providerBacked=false`, `11` source/restored rows, matching checksums, and zero foreign-key violations. This clears the local restore-rehearsal gate only; hosted D1 restore proof is still unproven.
- `scripts/generate-cloudflare-d1-performance-proof.ts` and `bun run cf:d1-performance-proof` now generate a local-only D1 performance scaffold from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-performance-proof.json` and `.md` currently records `queryCountBudgetsReady=true`, `p95RouteProofReady=true`, `hostedWorkerD1PerformanceReady=false`, `localOnly=true`, `providerBacked=false`, `132` seeded fixture rows, and four indexed query surfaces passing local p95 budgets. This clears local query-count/p95 mechanics only; hosted Worker+D1 performance proof is still unproven.
- `scripts/generate-cloudflare-d1-beta-feedback-proof.ts` and `bun run cf:d1-beta-feedback-proof` now generate a local-only D1 beta-feedback domain proof from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, live Server Action replacement, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-beta-feedback-proof.json` and `.md` currently records `schemaReady=true`, `enumParityReady=true`, `appLayerAuthzReady=true`, `localBetaFeedbackD1SliceReady=true`, `productionBetaFeedbackD1Ready=false`, one authorized feedback row, `0` forged workspace rows, `0` mismatched project rows, `0` rollback residue rows, `0` duplicate status-audit rows, review queue index proof through `idx_beta_feedback_status_created_at`, and three local query surfaces passing p95 budgets. This clears a low-risk local D1 domain-slice proof only; hosted Worker+D1 beta-feedback proof and Better Auth production identity handoff are still unproven.
- `scripts/generate-cloudflare-d1-collaboration-invitation-proof.ts` and `bun run cf:d1-collaboration-invitation-proof` now generate a local-only D1 collaboration-invitation domain proof for the invitation token issue/delivery/resolve/accept RPC cluster from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, live invitation route/action replacement, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json` and `.md` currently records `localCollaborationInvitationD1SliceReady=true`, `productionCollaborationInvitationD1Ready=false`, `5` affected RPC names, token issue/revoke-existing proof, delivery/open/accept/replay audit proof, revoked terminal states with sensitive IDs nulled, wrong-account denial with `0` membership rows, rollback residue `0`, duplicate accept audit rows `0`, and four local query surfaces passing p95 budgets. The RPC map now uses this proof artifact as transaction/rollback/idempotency evidence for `issue_collaboration_invitation_token`, `record_collaboration_invitation_delivery`, `resolve_collaboration_invitation`, `accept_collaboration_invitation`, and `accept_collaboration_invitation_by_id`. Hosted Worker+D1 invitation proof and Better Auth production identity handoff are still unproven.
- `scripts/generate-cloudflare-d1-closed-beta-proof.ts` and `bun run cf:d1-closed-beta-proof` now generate a local-only D1 closed-beta allowlist domain proof for the beta access/read/create/update RPC cluster from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, live auth-gate replacement, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-closed-beta-proof.json` and `.md` currently records `localClosedBetaD1SliceReady=true`, `productionClosedBetaD1Ready=false`, `4` affected RPC names, invited/active/revoked/missing/wrong-email access proof, admin queue proof, create/update proof, non-admin denial with `0` non-admin rows, invalid status denial, rollback residue `0`, duplicate create rows `0`, and four local query surfaces passing p95 budgets. The RPC map now uses this proof artifact as transaction/rollback evidence for `create_closed_beta_allowlist_entry` and `update_closed_beta_allowlist_entry`; hosted Worker+D1 closed-beta proof and Better Auth production identity handoff are still unproven.
- `scripts/generate-cloudflare-d1-component-library-proof.ts` and `bun run cf:d1-component-library-proof` now generate a local-only D1 component-library domain proof for folder deletion/reordering, component update/versioning, lifecycle mutation, price-option upsert, and bulk archive RPCs from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, live library replacement, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-component-library-proof.json` and `.md` currently records `localComponentLibraryD1SliceReady=true`, `productionComponentLibraryD1Ready=false`, `6` affected RPC names, editor guard proof, folder delete/reparent/item detach proof, reorder duplicate/cycle fail-closed proof, component update/version rows, lifecycle history dedupe, price-option idempotency, bulk-archive correlation idempotency, stale preview rollback, local indexed query p95 budgets, and restored fixture rows. The RPC map now uses this proof artifact as transaction/rollback/idempotency evidence for the six component-library mutation RPCs; hosted Worker+D1 component-library proof and Better Auth production identity handoff are still unproven.
- `scripts/generate-cloudflare-d1-estimate-history-proof.ts` and `bun run cf:d1-estimate-history-proof` now generate a local-only D1 estimate-history domain proof for tab create/rename/archive/delete/duplicate/reorder, subtree insert, row move, sheet adjustment, AI package apply, and row-to-library promotion RPCs from sanitized temporary SQLite data without env reads, provider calls, D1 creation, deployment, DNS mutation, billing, live estimate replacement, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-d1-estimate-history-proof.json` and `.md` currently records `localEstimateHistoryD1SliceReady=true`, `productionEstimateHistoryD1Ready=false`, `12` affected RPC names, editor guard proof, tab mutation proof, subtree idempotency, row move history, sheet adjustment history, project/library package command idempotency, promote-to-library linkage, rollback residue rows `0`, local indexed query p95 budgets, and restored estimate/history fixture rows. The RPC map now uses this proof artifact as transaction/rollback/idempotency evidence for the twelve estimate-history mutation RPCs; hosted Worker+D1 estimate-history proof and Better Auth production identity handoff are still unproven.
- `better-auth@1.6.22`, `src/lib/auth/better-auth-cloudflare.ts`, `src/app/api/auth/[...all]/route.ts`, `scripts/generate-cloudflare-better-auth-proof.ts`, and `bun run cf:better-auth-proof` now provide a local-only Better Auth/D1 route-gate scaffold plus a fail-closed Next route mount without env-file reads, provider calls, D1 creation, deployment, DNS mutation, billing, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-better-auth-route-gate-proof.json` and `.md` currently records `localBetterAuthRouteGateProofReady=true`, `actualNextRouteMounted=true`, `productionBetterAuthReady=false`, `betterAuthDependencyPresent=true`, D1 binding `ARCH_DB` typed, secure `auth.api.getSession({ headers, query: { disableCookieCache: true } })` route-gate pattern present, migration compilation helper present, `routeGateHelperTestCoverageReady=true`, `routeGateD1SessionFixtureReady=true`, `betterAuthD1SchemaSqlGenerated=true`, `betterAuthD1SchemaSqlReviewReady=true`, `7` route-gate parity rows mapped/deferred, current Supabase gate preserved, `localOnly=true`, and `providerBacked=false`. Generated schema SQL in `evidence/2026-06-30-cloudflare-better-auth-d1-schema.sql` contains the Better Auth `user`, `session`, `account`, and `verification` tables plus `session_userId_idx`, `account_userId_idx`, and `verification_identifier_idx`. This clears the local Better Auth route-gate scaffold, guarded route mount, helper denial/success coverage, D1-backed signed-cookie session fixture coverage, and local schema SQL review only; production auth cutover is still unproven.
- `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` and `bun run cf:check-d1-auth-realtime` now evaluate the current Supabase-to-D1/Auth/Realtime replacement surface without provider API calls, env-file reads, secret printing, D1 creation, provider mutation, deployment, DNS mutation, billing, or provider removal.
- `wrangler.jsonc`, `worker.ts`, and `src/lib/cloudflare/collaboration-room.ts` now provide local Durable Objects/WebSockets scaffold proof through binding `COLLAB_ROOMS`, class `CollaborationRoom`, and a fail-closed Worker route at `/__cloudflare/collaboration-room/:roomName`; this is not a production Supabase Realtime replacement.
- Evidence in `evidence/2026-06-30-cloudflare-d1-auth-realtime-readiness.json` and `.md` shows `databaseInventoryReady=true`, `d1BindingReady=true`, `betterAuthLocalProofReady=true`, `appLayerAuthzSpecReady=true`, `localRpcTransactionMechanicsReady=true`, `localBetaFeedbackD1SliceReady=true`, `localCollaborationInvitationD1SliceReady=true`, `localClosedBetaD1SliceReady=true`, `localComponentLibraryD1SliceReady=true`, `localEstimateHistoryD1SliceReady=true`, `realtimeReplacementReady=true`, `restoreProofReady=true`, local D1 performance query/p95 evidence present, `rpcRewritePlanReady=true`, and `localRedesignReadinessReportReady=true`, but `authReplacementReady=false`, `performanceProofReady=false`, and `productionD1AuthRealtimeReady=false`.
- Current blockers remain: Better Auth hosted D1 schema apply/restore proof, provider-secret/OAuth-magic/provider-backed callback-session/Supabase-removal cutover proof, and no hosted Worker+D1 performance proof.

Local release-gate aggregation status on 2026-06-30:

- `scripts/check-cloudflare-release-gates.ts` and `bun run cf:release-gates` now aggregate the current inventory, pricing, workbook, D1/Auth/Realtime readiness, Worker readiness, local Worker route probe, toolchain, Wrangler auth, Wrangler deploy dry-run, and sanitized provider-readiness artifacts without provider API calls, env-file reads, secret printing, deployment, DNS mutation, billing, or provider removal.
- Evidence in `evidence/2026-06-30-cloudflare-release-gates.json` and `.md` shows `planningInputsReady=true`, `localRuntimeProofReady=true`, `providerDashboardInventoryReady=true`, and `localReleaseGateReportReady=true`.
- The same artifact deliberately keeps `dataAuthRealtimeProofReady=false`, `providerProofReady=false`, `costPerformanceProofReady=false`, and `productionCutoverReady=false` until D1/Auth/Realtime production proof, Wrangler/API auth readback, hosted Worker/custom-domain proof, provider R2/Images/Cron/Queues/analytics proof, current-provider cost inputs, hosted Cloudflare usage, hosted performance, and production cost decision evidence exist.

## P1: Workers/OpenNext Runtime Proof

Goal: prove the app can run on Cloudflare Workers without runtime surprises.

Local groundwork status on 2026-06-29:

- `scripts/verify-cloudflare-worker-preview-routes.ts` and `bun run cf:verify-preview-routes` now provide a credential-free local Worker route matrix for health, public pages, signed-out protected route behavior, invalid share-link behavior, and private image fail-closed behavior.
- `.dev.vars.example` now lists the publication secret bindings needed for local/deployed Worker proof, and the ignored local `.dev.vars` carries placeholder preview values for local route proof only.
- Local `opennextjs-cloudflare preview` evidence is recorded in `evidence/2026-06-29-cloudflare-worker-preview-route-probe.json` and `.md`. Probes passed for `/api/health`, public/signed-out pages (`/`, `/login`, `/pricing`, `/features`, `/about`, `/contact`, `/trust`, `/privacy`, `/terms`, `/signup`, `/access-required`), signed-out `/workshop`, invalid `/share/[token]`, invalid `/api/share/[token]`, and missing-path `/api/projects/images`.
- `scripts/check-cloudflare-worker-readiness.ts` and `bun run cf:check-readiness` now check Cloudflare manifest/env-name alignment plus required `wrangler.jsonc` observability sampling without printing secret values. Evidence in `evidence/2026-06-29-cloudflare-worker-readiness.json` and `.md` shows `.env.example`, `.dev.vars.example`, `wrangler.jsonc` bindings/crons/observability, package scripts, and ignored local `.dev.vars` preview controls are aligned; deployment readiness remains false until a sanitized Cloudflare Worker secret-list/provider proof is supplied.

Pass criteria:

- App Router, RSC, Server Actions, route handlers, proxy/middleware, cookies/headers, image config, CSP, env/bindings, error routes, and cache behavior match current expectations.
- `wrangler.jsonc`, generated `Env` types, compatibility flags, secrets, and observability config are present in the proof artifact.
- Worker startup, CPU, duration, memory, and subrequest evidence is captured.

Fail criteria:

- Protected-route auth or Server Actions cannot be proven.
- Required Next.js behavior is unsupported or unstable.

## P2: Better Auth Route-Gate Proof

Goal: replace Supabase Auth in the smallest realistic slice.

Pass criteria:

- OAuth/magic/session/logout/refresh work on Workers.
- Closed-beta, terms, invite, and admin/service-equivalent paths are represented.
- Unauthorized direct route/action access fails closed.
- Identity feeds the D1 authorization layer.

Fail criteria:

- Session cookies or proxy route gates are weaker than current behavior.

## P3: D1 Domain Proof

Goal: prove one critical D1 domain before attempting broad migration.

Recommended first domains:

1. Upload metadata or beta feedback if looking for lower risk.
2. Library read paths if looking for medium risk.
3. Estimate mutations only after auth and lower-risk domains pass.

Pass criteria:

- Schema, indexes, query plans, authz, RPC rewrite, transaction boundaries, type strategy, and restore rehearsal pass.
- Query count and p95 route/action latency meet budget.
- Cross-workspace denial tests pass.

Fail criteria:

- D1 query pattern is too slow.
- App-layer authz cannot match RLS guarantees.
- Restore path is unacceptable.

## P4: R2 Upload And Asset Proof

Goal: replace one private object class.

Local groundwork status on 2026-06-29:

- `wrangler.jsonc` declares the `ARCH_UPLOADS_R2` binding with proof bucket `archestimator-proof-uploads` and preview bucket `archestimator-proof-uploads-dev`.
- `src/lib/uploads/r2-storage-provider.ts` adapts the existing upload storage provider contract to Cloudflare R2 Worker bindings. It maps logical app buckets plus storage paths into private R2 keys, uses R2 `put`/`get`/`delete`, and rejects unsafe bucket/path identifiers before calling R2.
- `src/lib/uploads/runtime-storage-provider.ts` now selects Supabase by default and R2 only when `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2` is set. If R2 is selected without the `ARCH_UPLOADS_R2` Worker binding, it fails closed.
- `wrangler.jsonc` declares a Cloudflare Images binding as `IMAGES`, and `src/lib/uploads/server-image-processing.ts` now has an opt-in `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images` path for proof builds. It reads image metadata through the Images binding, creates optimized and thumbnail WebP outputs from raw bytes, and keeps the existing 501 fail-closed route behavior when the provider flag or binding is absent.
- Component, project, and estimate-row image routes now use the provider-neutral storage path for object upload/download/delete while keeping Supabase database/RPC records as the source of truth.
- The server-mediated component attachment route now uses the provider-neutral storage path for object upload, approved private download brokering, and draft cleanup delete while keeping Supabase database/RPC/audit records as the source of truth. New direct signed/TUS component attachment session creation fails closed in R2 mode before any Supabase direct-upload signer or session RPC is used; existing Supabase sessions remain finalizable. A real R2 direct-upload signer/replacement remains a blocker.
- Internal upload cleanup and scan jobs now adapt their existing job storage interfaces from the same runtime upload storage provider. In R2 proof mode, cleanup deletes and scan downloads go through `ARCH_UPLOADS_R2` while Supabase service-role queries, scan-result RPCs, and cleanup audit events remain the source of truth.
- Signed-read and public URL operations intentionally fail closed unless a future app-owned signer/read route or explicit public base URL is injected. This avoids treating private R2 objects as public or claiming presigned URL parity without R2 API credentials and signing proof.
- Local proof passed: `tests/vitest/cloudflare-image-processing.test.ts`, `tests/vitest/upload-runtime-storage-provider.test.ts`, `tests/vitest/cloudflare-r2-storage-provider.test.ts`, `tests/vitest/upload-storage-provider.test.ts`, `tests/vitest/auth-sensitive-api-boundaries.test.ts`, and `tests/vitest/project-creation-ui.test.ts` (6 files / 93 tests), including mocked OpenNext `ARCH_UPLOADS_R2` component-image route POST/GET proof and mocked `IMAGES` processor proof. Additional lifecycle proof passed through `tests/vitest/upload-cleanup-route.test.ts`, `tests/vitest/upload-scan-route.test.ts`, `tests/vitest/upload-runtime-storage-provider.test.ts`, and `tests/vitest/cloudflare-r2-storage-provider.test.ts` (4 files / 22 tests), proving mocked R2 cleanup delete and scan download route paths. Attachment private-read proof passed through `tests/vitest/auth-sensitive-api-boundaries.test.ts`, `tests/vitest/component-library-attachment-lifecycle.test.ts`, `tests/vitest/upload-attachment-scan-freeze.test.ts`, `tests/vitest/upload-runtime-storage-provider.test.ts`, and `tests/vitest/cloudflare-r2-storage-provider.test.ts` (5 files / 82 tests), proving mocked R2 server-mediated attachment upload, approved private download, and draft cleanup delete paths. Direct-upload fail-closed proof passed through `tests/vitest/upload-signed-route.test.ts` and `tests/vitest/upload-runtime-storage-provider.test.ts` (2 files / 19 tests), proving R2 mode does not mint Supabase signed/TUS credentials while existing Supabase sessions can still finalize. `bunx tsc --noEmit --pretty false`, `bun run cf:typegen`, `bun run cf:build`, and `git diff --check` pass.
- Remaining gates are provider bucket creation, paid/enabled Cloudflare Images binding proof, hosted Worker binding proof, real R2 upload/readback run, direct signed/TUS R2 signer/replacement proof, provider-backed scan/cleanup lifecycle proof, image display proof, D1/R2 metadata reconciliation, and rollback/readback proof.

Pass criteria:

- Upload, signed access, private denial, delete, scan, cleanup, image display, CSP, and rollback pass.
- D1 metadata and R2 object state reconcile.

Fail criteria:

- Private object access cannot be proven.
- Cleanup or scan lifecycle is weaker.

## P5: Queues And Cron Proof

Goal: replace one scheduled/retryable job.

Local groundwork status on 2026-06-30:

- `worker.ts` wraps the generated OpenNext Worker and adds a Cloudflare `scheduled()` handler.
- `wrangler.jsonc` mirrors the current Vercel upload cleanup and scan cron expressions: `0 3 * * *` and `15 3 * * *`.
- `src/lib/cloudflare/scheduled-upload-jobs.ts` dispatches matched cron events to the existing internal upload routes with bearer auth, defaults to `dryRun=1`, and skips matched jobs when no cron secret is configured.
- Local preview proof hit Cloudflare's scheduled-handler test endpoint for both cron expressions and observed fail-closed `missing_secret` logs. This is local Worker runtime proof only.
- `wrangler.jsonc` now declares Queue producer binding `UPLOAD_JOBS_QUEUE`, consumer queue `archestimator-upload-jobs`, `max_retries=3`, and dead-letter queue `archestimator-upload-jobs-dlq`.
- `src/lib/cloudflare/upload-job-queue.ts` provides the local queue message shape, deterministic idempotency keys, producer helper, and consumer helper that acks successful work, acks duplicate idempotency keys, acks malformed poison messages without side effects, retries failed jobs, and marks final retries as DLQ-eligible under the configured retry budget.
- `worker.ts` now exposes a Cloudflare `queue()` handler that reuses the OpenNext fetcher and the upload queue consumer.
- `scripts/generate-cloudflare-queues-cron-proof.ts` and `bun run cf:queues-cron-proof` generate local evidence in `evidence/2026-06-30-cloudflare-queues-cron-proof.{json,md}`. The latest proof records `localQueuesCronProofReady=true`, `providerBacked=false`, `productionJobsMessagingReady=false`, `3` acked messages, `1` retried message, `1` duplicate ack, `1` invalid-message ack, and `1` DLQ-expected final retry.

Pass criteria:

- Producer, consumer, retries, duplicate delivery, dead-letter handling, job IDs, and operator visibility are proven.
- Current cron route remains fallback until queue proof passes.
- For the current local cron/queue groundwork, the remaining provider gates are: Cloudflare-deployed Worker schedule proof, real Cloudflare secret configuration, non-dry-run execution decision, actual Cloudflare Queue and DLQ resource proof, provider-visible retry/DLQ execution evidence, and operator visibility in Cloudflare logs/observability.

Fail criteria:

- Duplicate messages corrupt data or emit duplicate emails.
- Failures are not visible.

## P6: Durable Objects/WebSockets Realtime Proof

Goal: replace Supabase Realtime for one room type.

Pass criteria:

- Room ownership, connection authorization, presence/cursor payloads, reconnect, backpressure, rate limits, and latency are proven.
- Durable business state remains in D1/R2.

Fail criteria:

- Cross-room leakage, poor reconnect behavior, or unacceptable latency.

## P7: Email Service Proof

Goal: prove Cloudflare Email Service can replace Resend.

Pass criteria:

- Domain setup, outbound send, arbitrary-recipient eligibility, bounce/failure handling, event/webhook equivalent, retry behavior, and local/test mode are proven.

Fail criteria:

- Deliverability or event parity is weaker than Resend.

## P8: WAF, Rate Limiting, DDoS, Turnstile Proof

Goal: protect the app without blocking legitimate beta users or provider callbacks.

Pass criteria:

- Public, auth, share, upload, webhook, OAuth, and API routes have explicit allow/bypass/challenge behavior.
- False positives are visible and rollback is rehearsed.

Fail criteria:

- Auth callbacks, webhooks, or share routes are blocked unexpectedly.

## P9: Cutover Readiness Review

Goal: decide whether to proceed, fall back to hybrid, or reject the slice.

Pass criteria:

- Scorecard red items are resolved.
- Cost workbook shows acceptable savings or strategic value.
- Performance budgets pass.
- Rollback has been rehearsed.
- Provider proof is attached.

Fail criteria:

- Any critical data/auth/realtime/speed risk remains unresolved.
