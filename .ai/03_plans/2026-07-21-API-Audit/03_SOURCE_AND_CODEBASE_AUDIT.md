# 03 — Source and Codebase Audit

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`
> Inventory gathered: 2026-07-01 by lead author (Sisyphus) via direct fact-stated Bash/Glob/Read; dispatched exploration lanes L1–L4 timed out at 30-min inactivity cap.

## Method

Direct enumeration from three sources of truth:

1. **`wrangler.jsonc`** (read in full) — the canonical active-runtime binding manifest.
2. **`cloudflare-env.d.ts`** (read in full) — generated `Cloudflare.Env` and `CloudflareEnv` interfaces; declares every binding type the Worker sees.
3. **`worker.ts`** (read in full) — the Worker fetch/scheduled/queue entrypoint; OpenNext hand-off list; Durable Object exports.

Plus a filesystem scan of:

- All `route.ts` / `route.tsx` under `src/app/**`.
- All files containing `"use server"` under `src/**`.
- All `actions.ts` files under `src/**`.
- All `auth*.ts` files under `src/**`.
- All `better-auth` importers under `src/**`.
- All Durable Object / WebSocket / storage references under `src/**`.
- All Cron / scheduled / queue / R2 / Email references under `src/**`.
- All D1 migration files under `migrations/`.
- `package.json` scripts that invoke Cloudflare / test / lint / build gates.

This is the inventory that drives every downstream plan doc.

## 1. Active Runtime Binding Surface

Authoritative binding list (from `wrangler.jsonc` + `cloudflare-env.d.ts` `__BaseEnv_CloudflareEnv`):

| Binding | Type | Identifier | Notes |
|---|---|---|---|
| `ARCH_UPLOADS_R2` | `R2Bucket` | R2 storage | Bucket `archestimator-proof-uploads` (preview `-dev`). Object store for upload attachments / images. |
| `ARCH_DB` | `D1Database` | D1 SQLite | Database `archestimator-proof-db` (id `9bdb29bb-...`, preview `363c756a-...`). System of record. D1 has **no RLS** — row-level access enforced in app code. |
| `COLLAB_ROOMS` | `DurableObjectNamespace<CollaborationRoom>` | DO | SQLite-backed DO. Realtime collaboration room per estimate sheet. Migration tag `v1`. |
| `UPLOAD_JOBS_QUEUE` | `Queue` | Queue | `archestimator-upload-jobs`. Producer + Consumer. Batch size 5, timeout 30s, max retries 3, DLQ `archestimator-upload-jobs-dlq`. At-least-once delivery. |
| `EMAIL` | `SendEmail` | Email Service | Outbound transactional email. |
| `IMAGES` | `ImagesBinding` | Images | Cloudflare Images for resize/optimize. |
| `ASSETS` | `Fetcher` | OpenNext assets | Static assets from `.open-next/assets`. |

Secrets (names only — values NEVER read):

- Runtime job secrets: `CRON_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`, `UPLOAD_JOBS_ENABLED`, `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN`, `CLOUDFLARE_UPLOAD_JOBS_ORIGIN`.
- Publication / share-link secrets: `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`.
- Provider selection secrets: `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER`, `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER`.
- Auth secrets: `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_SECRET`.

> **Audit observation SRC-001**: `PUBLICATION_TOKEN_ENCRYPTION_SECRET` and `PUBLICATION_TOKEN_HASH_SECRET` exist as distinct bindings — strong signal that share tokens are BOTH encrypted (for raw recovery when needed) AND hashed (for storage comparison). The audit MUST verify which surface uses which material, and confirm the raw encrypted form is never exposed client-side. See `08_*.md` credential-material taxonomy.

> **Audit observation SRC-002**: `BETTER_AUTH_TRUSTED_ORIGINS` exists as a single string — must verify whether it's space- or comma-separated and whether it accepts wildcard or exact origins. CSRF posture depends on this parsing.

## 2. Worker Entrypoint (`worker.ts`)

The Worker's `fetch` handler routes through this ordered chain before OpenNext:

1. `routeCloudflareFastHealthRequest(request)` → short-circuits `/health` style requests.
2. `routeMalformedShareTokenRequest(request)` → short-circuits malformed `/share/[token]` paths (fail-closed).
3. `routeCloudflareProtectedProofRequest(request, env)` → routes proof URLs for release-gate verification.
4. `routeCollaborationRoomRequest(request, env)` → DurableObject upgrade for collaboration Realtime.
5. `routeStaticPublicPageThroughCache(request, ctx, downstream)` → static public-page cache.
6. Fallback: `openNextWorker.fetch(request, env, ctx)` → Next.js / OpenNext.

The `scheduled` handler delegates to `runCloudflareScheduledUploadJobs({cron, env, fetcher})` — note that **two crons map to the same handler** (`0 3 * * *` and `15 3 * * *`). The audit MUST verify the handler dispatches on the cron string, since both fire upload-cleanup-style jobs and Cloudflare Cron Triggers have no native overlap protection.

The `queue` handler delegates to `runCloudflareUploadJobQueueBatch`.

> **Audit observation SRC-003**: The `scheduled` handler uses `console.log` — there's no structured-logger abstraction visible. The audit MUST verify whether Workers Observability's 0.1 logs sampling rate catches the rare Cron failure path. If not, `OPEN-002` is locked.

> **Audit observation SRC-004**: Both crons hit the same handler. If the handler doesn't branch on `controller.cron`, both crons perform the same work twice per day. Confirm in `src/lib/cloudflare/scheduled-upload-jobs.ts`.

> **Audit observation SRC-005**: `routeStaticPublicPageThroughCache` exists. OpenNext 3 supports incremental cache; this is the public-page revalidation path. The audit MUST verify cache invalidation: which surface mints cache tags, which surface calls `revalidateTag` / `revalidatePath`, and whether tenant isolation is preserved (public pages are by definition tenant-agnostic).

## 3. Route Handler Inventory (29 total)

Every Route Handler under `src/app/**`. Categorized by responsibility for the audit:

### Public / unauthenticated
- `src/app/api/health/route.ts` — health probe.
- `src/app/api/share/[token]/route.ts` — publication view (anonymous-accessible; password-gated when set).
- `src/app/api/share/[token]/password/route.ts` — publication password gate.
- `src/app/api/share/[token]/session/route.ts` — publication session.
- `src/app/api/share/[token]/activity/route.ts` — publication activity (anonymous-readable).
- `src/app/api/share/[token]/comment/route.ts` — publication comment (anonymous-writable when token valid).
- `src/app/api/share/[token]/decision/route.ts` — publication decision (anonymous-writable when token valid).
- `src/app/api/share/[token]/events/route.ts` — publication events (likely SSE).
- `src/app/api/share/[token]/unsubscribe/route.ts` — publication unsubscribe.

### Authenticated user
- `src/app/api/projects/[projectId]/activity/route.ts` — activity feed.
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — Excel export.
- `src/app/api/projects/images/route.ts` — project cover images.
- `src/app/api/component-library/attachments/route.ts` — attachments ingest.
- `src/app/api/component-library/attachments/direct-upload/route.ts` — direct R2 upload mint.
- `src/app/api/component-library/attachments/scan-override/route.ts` — scan override.
- `src/app/api/component-library/images/route.ts` — component images.
- `src/app/api/estimate-row-images/route.ts` — estimate row images.

### Auth callback / invite
- `src/app/auth/callback/route.ts` — OAuth callback.
- `src/app/invite/[token]/accept/route.ts` — invite accept.
- `src/app/invite/[token]/continue/route.ts` — invite continue (signed-in user landing on invite with existing session).
- `src/app/invite/[token]/sign-out/route.ts` — invite sign-out.
- `src/app/workshop/pending-invite/route.ts` — pending-invite bridge.

### Better Auth catch-all
- `src/app/api/auth/[...all]/route.ts` — Better Auth mount (sign-in / sign-up / OAuth / magic-link / session / verify-email / etc.). Direct POST reachable.

### AI (deferred / feature-flagged)
- `src/app/api/ai/ask/route.ts` — "Ask Flip" AI assistant. Reachable when `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true`.
- `src/app/api/ai/package-builder/route.ts` — AI Package Builder. Reachable when `ARCHESTIMATOR_AI_ENABLED=true`.

### Internal (cron-invoked, secret-gated)
- `src/app/api/internal/client-error/route.ts` — client error ingest.
- `src/app/api/internal/upload-cleanup/route.ts` — upload cleanup (cron calls).
- `src/app/api/internal/upload-runtime/route.ts` — upload runtime.
- `src/app/api/internal/upload-scan/route.ts` — upload scan.

> **Audit observation SRC-006**: The four `/api/internal/*` routes are invoked by the Worker's `scheduled` and `queue` handlers via `fetcher(request) => openNextWorker.fetch(...)`. They MUST be authenticated by `CRON_SECRET` or `UPLOAD_*_JOB_SECRET`, NOT anonymous. The audit MUST verify they reject unauthenticated direct hits (e.g., a PIR drive).

> **Audit observation SRC-007**: `/api/share/[token]/*` mutates state (comment, decision, unsubscribe) for an anonymous caller with only a token. The audit MUST verify: (a) token is hashed at rest (`PUBLICATION_TOKEN_HASH_SECRET`), (b) tokens have expiry/revocation, (c) password gate is required for sensitive mutations when set, (d) rate limiting prevents token-enumeration, (e) unsubscribe is idempotent.

## 4. Server Action Inventory (30 files containing `"use server"`)

All Server Actions are DIRECTLY reachable as POST endpoints from any page (Next.js fingerprinting does not gate them — they are public POST handlers per Next 16 docs).

### Auth
- `src/lib/auth/account-actions.ts` — account mutations (delete, name, etc.).
- `src/lib/auth/actions.ts` — sign-in, sign-up, sign-out actions.
- `src/lib/auth/beta-allowlist-admin-actions.ts` — closed-beta admin actions.

### Estimates
- `src/lib/estimates/actions.ts` — estimate CRUD, row CRUD.
- `src/lib/estimates/express-promotion-actions.ts` — express promotion.
- `src/lib/estimates/subtree-actions.ts` — subtree ops (move, copy).

### Collaboration
- `src/lib/collaboration/actions.ts` — invite members, remove, role change. (Also responsible for email send via `EMAIL` binding.)
- `src/lib/collaboration/pending-invite-actions.ts` — pending-invite ops.
- `src/lib/collaboration/realtime-identity-actions.ts` — realtime identity (cursor color, display name).
- `src/lib/collaboration/summary-actions.ts` — summary ops.

### Component library
- `src/lib/component-library/actions.ts` — component CRUD.
- `src/lib/component-library/action-errors.ts` — error helpers.
- `src/lib/component-library/template-editor-actions.ts` — template editor mutations.

### Estimate sheet
- `src/lib/estimate-sheet/user-preferences-actions.ts` — per-user UI prefs (selection, expansion).

### Projects
- `src/lib/projects/actions.ts` — project CRUD, archive, delete.
- `src/lib/projects/location-actions.ts` — project location (Google Maps integration).
- `src/lib/favorites/sidebar-favorites-actions.ts` — sidebar favorites.

### Publication / share / recipient
- `src/lib/publication/actions.ts` — publication / share link creation, password set, recipient add/remove. (Email-dependent.)
- `src/lib/publisher/activity-actions.ts` — publisher activity.
- `src/lib/publisher/drawer-actions.ts` — publisher drawer ops.
- `src/lib/recipient-proposals/actions.ts` — recipient proposal ops.

### Reusable sources
- `src/lib/reusable-sources/actions.ts` — reusable sources ops.

### Workshop / groups / beta / notifications / legal
- `src/lib/workshop/actions.ts` — workshop-level actions.
- `src/lib/workshop/beta-feedback-actions.ts` — beta feedback submit.
- `src/lib/workshop/beta-feedback-review-actions.ts` — beta feedback review (admin).
- `src/lib/workshop/group-actions.ts` — project groups.
- `src/lib/workshop/group-action-types.ts` — type defs for groups (likely not directly exported as actions).
- `src/lib/workshop/group-constants.ts` — constants for groups.
- `src/lib/notifications/actions.ts` — notification prefs / dismiss.
- `src/lib/legal/actions.ts` — legal terms acceptance.

> **Audit observation SRC-008**: Every Server Action MUST verify (a) Better Auth session, (b) ownership of the resource (project, estimate, library item, publication), (c) zod validation at top, (d) idempotency for mutations. The audit builds a 30-row verdict table in `08_*.md` with PASS/WARN/FAIL per surface.

> **Audit observation SRC-009**: `src/lib/collaboration/actions.ts` and `src/lib/publication/actions.ts` send email via `EMAIL` binding. The audit MUST verify: (a) rate-limit per recipient, (b) bounce / DMARC posture (per FAST PATH, DMARC `p=none` is observed publicly), (c) no PII in email subject, (d) unsubscribe header.

> **Audit observation SRC-010**: Google Maps is integrated via `src/lib/google-maps/` and `src/lib/projects/location-actions.ts`. If the location action performs an outbound fetch to Google Maps API, SSRF posture must be verified (caller-controllable URL).

## 5. Better Auth Setup

- Mount: `src/app/api/auth/[...all]/route.ts` (catch-all).
- Adapter: `src/lib/auth/better-auth-cloudflare.ts` — D1-backed storage adapter.
- Runtime: `src/lib/auth/cloudflare-better-auth-runtime.ts`.
- Session: `src/lib/auth/session.ts`.
- Provider selection: `src/lib/auth/auth-provider-selection.ts` (Google OAuth + magic link).
- Proof router: `src/lib/cloudflare/better-auth-proof-router.ts`.
- Request proxy: `src/lib/auth/request-proxy.ts`.

> **Audit observation SRC-011**: Better Auth on D1 is a custom storage adapter. Verify the adapter implements (a) session table schema per Better Auth spec, (b) rate limiter storage backed by D1 (not KV — `KV is eventually consistent and not suitable for rate limiting` per Cloudflare guidance), (c) trusted-origins parsing of `BETTER_AUTH_TRUSTED_ORIGINS` (exact-match list, not wildcard), (d) `secret` rotation posture.

## 6. Durable Object: CollaborationRoom

- Class: `src/lib/cloudflare/collaboration-room.ts`.
- Router: `src/lib/cloudflare/collaboration-room-router.ts`.
- Client: `src/lib/cloudflare/collaboration-room-client.ts`.
- Migration tag: `v1` with `new_sqlite_classes: ["CollaborationRoom"]`.

> **Audit observation SRC-012**: The DO uses SQLite-backed storage. Verify (a) `alarm()` hibernation usage to avoid WS-keep-alive billing, (b) message format validation on incoming WS frames, (c) WebSocket ticket minting surface (where does the WS upgrade route get its signed ticket?), (d) presence/cursor event rate limit per connection, (e) cross-room isolation (Room A cannot message Room B), (f) RPC handler for non-WS RPC messages (`fetch` handler on the DO), (g) idempotency of cursor updates (best-effort, not transactional).

## 7. Cron / Queue / Email

- Scheduled: `src/lib/cloudflare/scheduled-upload-jobs.ts` — runs at `0 3 * * *` and `15 3 * * *`. Calls `/api/internal/upload-cleanup`, `/api/internal/upload-runtime`, `/api/internal/upload-scan` with `CRON_SECRET` / `UPLOAD_*_JOB_SECRET`.
- Queue consumer: `src/lib/cloudflare/upload-job-queue.ts` — at-least-once delivery, batch 5, max retries 3, DLQ `archestimator-upload-jobs-dlq`.
- Email: `src/lib/email/transactional-email-client.ts` — uses `EMAIL` SendEmail binding.

> **Audit observation SRC-013**: The audit MUST verify Cron overlap protection — Worker scheduled handlers DO NOT have native overlap protection. If `0 3 * * *` and `15 3 * * *` invocation overlap (e.g., long-running cleanup), state corruption is possible. Confirm in `scheduled-upload-jobs.ts`.

> **Audit observation SRC-014**: The audit MUST verify Queue idempotency per message — at-least-once means duplicates WILL happen. Confirm in `upload-job-queue.ts`.

> **Audit observation SRC-015**: The audit MUST verify DLQ visibility — there's no automatic alert if messages reach `archestimator-upload-jobs-dlq`. Workers Observability sampling at 0.1 may miss this. Confirm DLQ alert posture in `13_*.md`.

## 8. D1 Migrations (29 files)

Migrations applied (in order):

0001 closed_beta_feedback → 0002 legal_terms_acceptance → 0003 profiles → 0004 account_security_events → 0005 account_settings → 0006 ai_audit_rate_limits → 0007 collaboration_invitations → 0008 estimate_sheet_user_preferences → 0009 notifications → 0010 upload_metadata → 0011 component_library_preferences_telemetry → 0012 project_audit_sidecars → 0013 collaboration_management_sidecars → 0014 publication_shared_links → 0015 publication_admin_sidecars → 0016 project_locations → 0017 estimate_sheet_summary_fields → 0018 estimate_favorites → 0019 ai_package_builder_memory → 0020 project_groups → 0021 estimate_row_projection_fields → 0022 component_attachment_metadata → 0023 mass_deletion_events → 0024 estimate_templates → 0025 reusable_source_insert_support → 0026 component_promotion_support → 0027 ai_package_apply_commands → 0028 component_library_action_support → 0029 estimate_actions_d1_support

> **Audit observation SRC-016**: D1 has its own migration system separate from the historical Supabase migrations (which were under `supabase/migrations/`). The audit takes the `migrations/` folder (29 files) as the active D1 source of truth. Historical `supabase/migrations/` rows are migration archaeology (see appendix below) — they are READ-ONLY references, not audit targets unless they're still on the runtime path (which the FAST PATH says they are not).

> **Audit observation SRC-017**: The audit MUST verify that every table created by these 29 migrations has the matching `workspace_id`/`owner_id` column where appropriate, AND that every app-code access path filters by it. This is the D1 RLS-equivalent audit. Output is in `07_*.md` per-table access-path matrix.

## 9. Test Inventory (preview — full matrix in 12_*.md)

- Vitest DOM (`tests/vitest/`): ~115 files covering route handlers, server actions, RPC contracts, components, security contracts, AI audit trails.
- Bun unit (`tests/unit/`): 2 files (red-first migration guard + UI baseline regression).
- Playwright E2E (`e2e/`): 7 specs (landing audit, auth smoke, tree DnD, AI package builder live, invite entry, teamspace collaboration, shared link receiver).

> **Audit observation SRC-018**: Per FAST PATH, ~131 `test:dom` tests are pre-existing red on `main` across 36 files in auth/beta, project groups/favorites, publication, library, agent-payload/tooling, upload-proof, and project-list contract areas. The audit's `12_*.md` Test Execution Matrix MUST mark these as "pre-existing red, not audit-introduced, owner TBD".

## 10. Migration Archaeology (READ-ONLY appendix)

The following surfaces are NOT on the active runtime path. They are preserved in the repo as migration-archaeology evidence and rollback aids. They are OUT OF AUDIT SCOPE except where they share stable IDs with active surfaces:

- `supabase/migrations/` (historical Supabase migrations — replaced by `migrations/` D1).
- `src/lib/supabase/` (browser + server clients, generated types — replaced by `src/lib/cloudflare/` D1 access layer).
- `src/lib/ai/` DeepSeek integration modules that targeted Supabase RPCs — replaced by D1-prepared-statement access where applicable.
- `resend` package references — replaced by Cloudflare Email Service.
- `@supabase/*`, `@vercel/*`, `resend` historical dependencies — confirmed removed from `package.json` per FAST PATH 2026-07-01 06:52 UTC entry.

## 11. `package.json` Scripts (relevant to the audit)

| Script | Purpose | Audit relevance |
|---|---|---|
| `bun run type-check` | `tsc --noEmit` | API boundary type strictness gate |
| `bun run lint` | `eslint` | API-boundary lint (no `any`, no `as any`, error-contract regex) |
| `bun run lint:design-system` | `node scripts/enforce-app-design-system.mjs` | UI gate (not API-specific) |
| `bun run test` | `bun test tests/unit` | API-bearing unit tests |
| `bun run test:dom` | `vitest run --maxWorkers=1` | API-bearing DOM tests — known pre-existing reds |
| `bun run test:e2e` | `playwright test` | API-bearing E2E |
| `bun run build` | `next build` | production build gate |
| `bun run cf:typegen` | `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` | regenerates the binding types the audit grounds itself in |
| `bun run cf:d1-rpc-map` | `bun run scripts/generate-cloudflare-d1-rpc-rewrite-map.ts` | D1 RPC rewrite map — direct source for `07_*.md` per-RPC matrix |
| `bun run cf:d1-authz-matrix` | `bun run scripts/generate-cloudflare-d1-authz-access-matrix.ts` | D1 authz matrix — direct source for `07_*.md` per-table access-path matrix |
| `bun run cf:d1-rpc-proof` | `bun run scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` | D1 transaction proof — directly cited in `09_*.md` |
| `bun run validate:agents` | `node scripts/validate-ai-workflow-adapters.mjs` | validates `.ai/12_agents/payloads` + tool adapters — relevant to AI surfaces audit |
| `bun run graph:reindex` | `node .gitnexus/run.cjs analyze && node scripts/neutralize-graph-mandate.mjs` | re-indexes graph (used by audit not at runtime) |

> **Audit observation SRC-019**: `cf:d1-authz-matrix` and `cf:d1-rpc-map` packages exist. The audit will cite the OUTPUT of these scripts (their generated `.json`/`.md` artifacts in `2026-06-29-Cloudflare-Migration-Codex/evidence/`) as the canonical D1 access-path evidence, not re-derive it from scratch. Discovered names from the sibling plan pack: `workspace_homebase_summary`, `project_estimate_list_summaries`, `library_overview_summary`, `can_edit_project`, `estimate_row_mutation`.

## 12. SRC-* ID Ledger (emitted in this doc)

| SRC ID | Surface | File:line | Audit use |
|---|---|---|---|
| SRC-001 | Publication token secrets (encryption + hash) | `cloudflare-env.d.ts` | Credential material taxonomy anchor |
| SRC-002 | BETTER_AUTH_TRUSTED_ORIGINS single-string | `cloudflare-env.d.ts` | CSRF posture anchor |
| SRC-003 | `console.log` in `scheduled` handler | `worker.ts` (scheduled block) | Observability sampling concern |
| SRC-004 | Two crons same handler | `worker.ts` (scheduled), `wrangler.jsonc` triggers.crons | Cron overlap protection |
| SRC-005 | `routeStaticPublicPageThroughCache` | `worker.ts` (fetch chain) | Cache invalidation + tenant isolation |
| SRC-006 | Internal `/api/internal/*` routes | `src/app/api/internal/*/route.ts` (4 files) | Anonymous-vs-secret-gated verification |
| SRC-007 | `/api/share/[token]/*` mutations | `src/app/api/share/[token]/*` (8 files) | Anonymous-writable token-gated verifier |
| SRC-008 | All `"use server"` actions | `src/lib/**/actions*.ts` (30 files) | Per-action auth/owner/validator/idempotency verdict |
| SRC-009 | Email-sending Server Actions | `src/lib/collaboration/actions.ts`, `src/lib/publication/actions.ts` | Rate-limit + bounce + PII + unsubscribe |
| SRC-010 | Google Maps outbound fetch location action | `src/lib/projects/location-actions.ts` | SSRF posture |
| SRC-011 | Better Auth adapter / config | `src/lib/auth/better-auth-cloudflare.ts` | D1 storage adapter + ratelimiter + trusted-origins |
| SRC-012 | CollaborationRoom Durable Object | `src/lib/cloudflare/collaboration-room.ts` | Hibernation + WS ticket + presence rate limit + cross-room isolation |
| SRC-013 | Cron overlap (no native protection) | `src/lib/cloudflare/scheduled-upload-jobs.ts` | Verify dispatch on `controller.cron` |
| SRC-014 | Queue idempotency (at-least-once) | `src/lib/cloudflare/upload-job-queue.ts` | Verify dedup key + retry cap |
| SRC-015 | DLQ visibility | `archestimator-upload-jobs-dlq` | Alert posture |
| SRC-016 | D1 migrations dir = `migrations/` (29 files) | `migrations/0001-0029` | Active D1 source of truth |
| SRC-017 | D1 RLS-equivalent audit | all 29 migrations + all app-code access | Per-table `workspace_id`/`owner_id` scoping |
| SRC-018 | Pre-existing RED `test:dom` (~131 / 36 files) | `tests/vitest/` | Mark as pre-existing in test matrix |
| SRC-019 | `cf:d1-authz-matrix` + `cf:d1-rpc-map` scripts | `scripts/generate-cloudflare-*.ts` | Canonical D1 access-path evidence sources |

This ledger is the authoritative source for every downstream `SRC-*` reference.