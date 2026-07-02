# 07 — Data, Database, API, and Network Plan

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Active runtime data graph

| Binding | Role | Source | Notes |
|---|---|---|---|
| `ARCH_DB` (D1) | System of record | `wrangler.jsonc:d1_databases[]` | Database id `9bdb29bb-...`, preview `363c756a-...`. SQLite — no RLS. Application code owns row-level access scoping. |
| `ARCH_UPLOADS_R2` (R2) | Object storage | `wrangler.jsonc:r2_buckets[]` | Bucket `archestimator-proof-uploads`, preview `-dev`. Used for attachments + images. |
| `COLLAB_ROOMS` (DurableObjectNamespace) | Realtime | `wrangler.jsonc:durable_objects.bindings[]` | SQLite-backed DO. |
| `UPLOAD_JOBS_QUEUE` (Queue) | Background jobs | `wrangler.jsonc:queues[]` | At-least-once, batch 5, max_retries 3, DLQ `archestimator-upload-jobs-dlq`. |
| `EMAIL` (SendEmail) | Outbound transactional email | `wrangler.jsonc:send_email[]` | |
| `IMAGES` (ImagesBinding) | Image processing | `wrangler.jsonc:images[]` | Cloudflare Images. |

## D1 access-path matrix (RLS-equivalent)

D1 has no RLS. Row-level access is enforced in app code. The audit requires a per-table access-path matrix to verify every read/write carries the correct `workspace_id`/`owner_id` WHERE clause.

The canonical source for the matrix is the output of `bun run cf:d1-authz-matrix` (script `scripts/generate-cloudflare-d1-authz-access-matrix.ts`) and `bun run cf:d1-rpc-map` (script `scripts/generate-cloudflare-d1-rpc-rewrite-map.ts`). The audit grounds its matrix in those artifacts (located in `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/` per SRC-019).

| Table (from migration) | Containing migration | workspace_id col? | Owner col? | Access surface(s) (route handlers / server actions / DO) | WHERE scoping evidence | Verdict preview |
|---|---|---|---|---|---|---|
| `closed_beta_feedback` | 0001 | likely workspace_id (per tenant) | user_id (submitter) | `src/lib/workshop/beta-feedback-actions.ts`, `beta-feedback-review-actions.ts` | needs verification vs script output | TBD |
| `legal_terms_acceptance` | 0002 | account-scoped | user_id | `src/lib/legal/actions.ts` | needs verification | TBD |
| `profiles` | 0003 | account-scoped | user_id | `src/lib/auth/account-actions.ts`, Better Auth adapter | needs verification | TBD |
| `account_security_events` | 0004 | account-scoped | user_id | auth internal | needs verification | TBD |
| `account_settings` | 0005 | account-scoped | user_id | settings UI | needs verification | TBD |
| `ai_audit_rate_limits` | 0006 | account-scoped + workspace | user_id | `/api/ai/ask`, `/api/ai/package-builder` | needs verification | TBD |
| `collaboration_invitations` | 0007 | workspace + project (hashed token) | token | `src/lib/collaboration/actions.ts`, `/invite/[token]/*` routes | needs verification (hashed-token invariant) | TBD |
| `estimate_sheet_user_preferences` | 0008 | per-user | user_id | `src/lib/estimate-sheet/user-preferences-actions.ts` | needs verification | TBD |
| `notifications` | 0009 | per-user | user_id | `src/lib/notifications/actions.ts` | needs verification | TBD |
| `upload_metadata` | 0010 | workspace + upload | uploader_id | `src/lib/uploads/**`, `/api/internal/upload-*` | needs verification | TBD |
| `component_library_preferences_telemetry` | 0011 | workspace | telemetry | `src/lib/component-library/actions.ts` | needs verification | TBD |
| `project_audit_sidecars` | 0012 | workspace + project | audit | `src/lib/projects/actions.ts` | needs verification | TBD |
| `collaboration_management_sidecars` | 0013 | workspace + project + estimate | audit | `src/lib/collaboration/actions.ts` | needs verification | TBD |
| `project_publications` (shared_links) | 0014 | workspace + project | hashed_token | `src/lib/publication/actions.ts`, `/api/share/[token]/*` | needs verification (hashed-token invariant) | TBD |
| `publication_admin_sidecars` | 0015 | workspace + publication | audit | `src/lib/publication/actions.ts` | needs verification | TBD |
| `project_locations` | 0016 | workspace + project | location | `src/lib/projects/location-actions.ts` | needs verification | TBD |
| `estimate_sheet_summary_fields` | 0017 | workspace + project + estimate | estimate | `src/lib/estimates/actions.ts` | needs verification | TBD |
| `estimate_favorites` | 0018 | workspace + project + estimate + user | user_id | `src/lib/favorites/sidebar-favorites-actions.ts` | needs verification; pre-existing RED test area | TBD — RED |
| `ai_package_builder_memory` | 0019 | workspace + project + user | user_id | `src/lib/ai/**`, `/api/ai/package-builder` (feature-flagged) | needs verification | TBD |
| `project_groups` | 0020 | workspace + project + group | group_id | `src/lib/workshop/group-actions.ts` | needs verification; pre-existing RED test area | TBD — RED |
| `estimate_row_projection_fields` | 0021 | workspace + project + estimate + row | row_id | `src/lib/estimates/actions.ts` | needs verification | TBD |
| `component_attachment_metadata` | 0022 | workspace + component | component_id | `src/lib/component-library/actions.ts`, `/api/component-library/attachments/*` | needs verification | TBD |
| `mass_deletion_events` | 0023 | workspace + scope | audit | `src/lib/mass-deletion/**` (if exists) | needs verification | TBD |
| `estimate_templates` | 0024 | workspace + template | template_id | `src/lib/component-library/template-editor-actions.ts` | needs verification | TBD |
| `reusable_source_insert_support` | 0025 | workspace | source | `src/lib/reusable-sources/actions.ts` | needs verification | TBD |
| `component_promotion_support` | 0026 | workspace + component | promoted | `src/lib/component-library/actions.ts` | needs verification | TBD |
| `ai_package_apply_commands` | 0027 | workspace + project | apply | `src/lib/ai/**`, `/api/ai/package-builder` | needs verification | TBD |
| `component_library_action_support` | 0028 | workspace + component | action | `src/lib/component-library/actions.ts` | needs verification | TBD |
| `estimate_actions_d1_support` | 0029 | workspace + project + estimate | action | `src/lib/estimates/actions.ts` | needs verification | TBD |

> Verdict `TBD` means the audit must complete per-table verification against `cf:d1-authz-matrix` output. Verdict `TBD — RED` means the table is in a pre-existing RED test area (estimate_favorites, project_groups) and is therefore at higher risk.

> **Audit observation (DATA-001)**: The audit MUST confirm every entry in this matrix shows positive `WHERE workspace_id = ?` (or `owner_id = ?`) scoping on EVERY app-code access path. Any access path that fails to scope is a P0 finding (REQ-SEC-001).

## D1 prepared statement inventory (canonical RPC-equivalents)

Per SRC-019, the canonical D1 RPC names discovered from the sibling plan pack are:

- `workspace_homebase_summary` (p95 ~65ms — workspace dashboard aggregation)
- `project_estimate_list_summaries` (p95 ~39ms — project estimate list)
- `library_overview_summary` (p95 ~31ms — component library overview)
- `can_edit_project` (p95 ~51ms — authorization check RPC)
- `estimate_row_mutation` (p95 ~57ms — single-row mutation)

The audit confirms these RPCs are active and proven. For each, the audit builds:

| RPC name | Inputs | Outputs | Tenant-scope input? | Owner/role check? | Verdict preview |
|---|---|---|---|---|---|
| `workspace_homebase_summary` | `workspace_id` | aggregates | YES | TBD | TBD |
| `project_estimate_list_summaries` | `workspace_id`, `project_id` | list | YES | TBD | TBD |
| `library_overview_summary` | `workspace_id` | aggregates | YES | TBD | TBD |
| `can_edit_project` | `user_id`, `project_id` | bool | YES (via user_id→membership) | YES | PASS preview |
| `estimate_row_mutation` | `user_id`, `project_id`, `estimate_id`, `row_id`, mutation | result | YES | TBD | TBD |

> **Audit observation (DATA-002)**: `can_edit_project` is the canonical authorization RPC. Every Server Action that mutates a project / estimate / library row MUST call it BEFORE mutation. The audit checks every mutation path for this call.

## R2 storage matrix

| Operation | Surface | Authorization posture | Audit verdict preview |
|---|---|---|---|
| Put object (direct upload) | `/api/component-library/attachments/direct-upload` mints signed URL; client uploads via signed URL | Mint must be (a) auth, (b) workspace-scoped, (c) object-key workspace-prefixed | P0 — must verify |
| Get object (signed URL) | `/api/component-library/attachments/route.ts`, `/api/component-library/images/route.ts`, `/api/estimate-row-images/route.ts`, `/api/projects/images/route.ts` | Mint must verify caller can access that object (workspace/owner identity check) | P0 — must verify |
| List objects | none direct (audit doesn't expect raw list) | n/a | TBD |
| Delete object (cleanup) | `/api/internal/upload-cleanup` (cron-invoked) | CRON_SECRET-gated; deletes orphaned objects by workspace-prefixed pattern | P0 — must verify CRON_SECRET gate + scoped prefix |

> **Audit observation (R2-001)**: The audit MUST verify the object-key design — keys MUST NOT embed PII (REQ-SEC-012) and MUST be workspace-prefixed or use a workspace→object-key mapping table. Otherwise an unscoped `list()` could leak object keys across workspaces.

> **Audit observation (R2-002)**: Images binding (`IMAGES`) is also in use for image processing. The audit MUST clarify when R2 vs Images is the data path for each surface.

## Durable Object: CollaborationRoom

| Operation | Surface | Authorization posture | Sid-effects | Audit verdict preview |
|---|---|---|---|---|
| WebSocket upgrade | `routeCollaborationRoomRequest` in `worker.ts` → DO | requires WS ticket signed by session-bound path | cursor / presence events | P0 — verify ticket mint |
| Cursor update (WS message) | WS frame → DO `webSocketMessage` | per-session rate limit | none (best-effort) | P1 — verify rate limit |
| Presence join / leave | WS open / close | session-bound | none | OK |
| State load | DO `fetch` RPC | session-bound | read-only | OK |
| Alarm (hibernation) | DO `alarm` | runtime | schedule wake | verify hibernation tuning |
| RPC (non-WS) | DO `fetch` from `routeCollaborationRoomRequest` | session-bound | depends on RPC | verify each RPC |

## Queue / Cron

| Item | Surface | Schedule / Trigger | Idempotency | Audit verdict preview |
|---|---|---|---|---|
| Queue producer | Server Action enqueue, `src/lib/cloudflare/upload-job-queue.ts` | on user upload | n/a (producer) | OK |
| Queue consumer | `worker.ts queue()` → `runCloudflareUploadJobQueueBatch` | batch 5 / 30s / max_retries 3 | dedup key per message body | P0 — verify dedup |
| DLQ | `archestimator-upload-jobs-dlq` | after max_retries | n/a | P1 — verify alert |
| Cron `0 3 * * *` | worker.ts `scheduled` → runCloudflareScheduledUploadJobs | daily 0300 | dispatch on `controller.cron` | P0 — verify dispatch |
| Cron `15 3 * * *` | worker.ts `scheduled` → runCloudflareScheduledUploadJobs | daily 0315 | dispatch on `controller.cron` | P0 — verify dispatch |
| Cron overlap | none native; app-code | n/a | overlap guard in app | P1 — verify overlap guard |

## Email service

| Operation | Surface | Authorization posture | Failure mode | Audit verdict preview |
|---|---|---|---|---|
| Send transactional | `src/lib/email/transactional-email-client.ts` via `EMAIL` binding | auth concern is in the CALLER (Server Action must auth) | bounce handling? | P0 — verify bounce |
| Send invite | `src/lib/collaboration/actions.ts` → EMAIL binding | auth + workspace member role + recipient-valid | retry on transient + per-recipient rate limit | P0 — verify rate limit |
| Send share | `src/lib/publication/actions.ts` → EMAIL binding | auth + token-bound | retry + per-recipient rate limit | P0 — verify rate limit |
| DMARC posture | DNS | depends on recipient domain | p=none observed; p=reject recommended | P2 — OPEN-006 |

## API / network contract matrix

| Surface | Method | Path | Auth | Validation | Response envelope | Idempotent | Timeout | Retry | Rate limit |
|---|---|---|---|---|---|---|---|---|---|
| health | GET | /api/health | anonymous | n/a | `{ok:true}` | yes | n/a | none | none |
| Better Auth | GET/POST | /api/auth/[...all] | session / anonymous | Better Auth internal | Better Auth JSON | session-cookie path yes; sign-in path rate-limited | Better Auth default | Better Auth default | Better Auth ratelimiter (D1) |
| share view | GET | /api/share/[token] | token + optional password | none at view | `{ok,data}` | yes (snapshot) | n/a | none | token-enumeration limit |
| share password | POST | /api/share/[token]/password | token | zod | `{ok,data}` | no | n/a | none | token-enumeration limit |
| share comment | POST | /api/share/[token]/comment | token | zod | `{ok,data}` | idempotency key | n/a | none | per-recipient limit |
| share decision | POST | /api/share/[token]/decision | token | zod | `{ok,data}` | idempotent re-decide | n/a | none | per-recipient limit |
| share events | GET (SSE) | /api/share/[token]/events | token | none | SSE stream | n/a | long-poll | n/a | connection limit |
| share unsubscribe | POST | /api/share/[token]/unsubscribe | token | zod | `{ok,data}` | idempotent | n/a | none | per-recipient limit |
| internal upload-cleanup | POST | /api/internal/upload-cleanup | CRON_SECRET | secret match | `{ok,data}` | idempotent | 60s | none | n/a (internal) |
| internal upload-runtime | POST | /api/internal/upload-runtime | UPLOAD_JOB_SECRET | secret match | `{ok,data}` | idempotent | 60s | none | n/a |
| internal upload-scan | POST | /api/internal/upload-scan | UPLOAD_SCAN_JOB_SECRET | secret match | `{ok,data}` | idempotent | 60s | none | n/a |
| internal client-error | POST | /api/internal/client-error | ? | zod | `{ok,data}` | idempotent | n/a | none | per-IP limit |
| direct-upload mint | POST | /api/component-library/attachments/direct-upload | session | zod | `{ok,data:{signedUrl}}` | NOT idempotent (TTL-bounded) | n/a | none | per-session limit |
| attachments | GET/POST/DELETE | /api/component-library/attachments | session + owner | zod | `{ok,data}` | idempotency key | n/a | bounded | per-session limit |
| component-library images | POST / DELETE | /api/component-library/images | session + owner | zod | `{ok,data}` | idempotency key | n/a | bounded | per-session limit |
| project images | GET/POST/DELETE | /api/projects/images | session + owner | zod | `{ok,data}` | idempotency key | n/a | bounded | per-session limit |
| estimate-row images | POST / DELETE | /api/estimate-row-images | session + owner | zod | `{ok,data}` | idempotency key | n/a | bounded | per-session limit |
| activity | GET | /api/projects/[projectId]/activity | session + workspace member | none | `{ok,data}` | yes | n/a | none | per-session limit |
| Excel export | GET | /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx | session + workspace member | none | binary .xlsx | single-flight | 60s | none | per-session limit |
| auth callback | GET | /auth/callback | OAuth state | state | redirect | one-shot | 10s | none | per-IP limit |
| invite accept | POST | /invite/[token]/accept | token | zod | `{ok,data}` | idempotent | n/a | none | per-token limit |
| invite continue | GET | /invite/[token]/continue | token | none | redirect | yes | n/a | none | per-token limit |
| invite sign-out | POST | /invite/[token]/sign-out | token | none | `{ok,data}` | yes | n/a | none | per-token limit |
| pending-invite | GET | /workshop/pending-invite | session | none | redirect | yes | n/a | none | per-session limit |
| AI ask | POST | /api/ai/ask | session + feature flag | zod | `{ok,data}` | no | 30s | none | per-session limit |
| AI package builder | POST | /api/ai/package-builder | session + feature flag | zod | `{ok,data}` | no | 60s | none | per-session limit |

> Each `TBD` in this matrix will be filled in `08_*.md` and `11_*.md` during the audit's future remediation. The matrix is the audit deliverable's CONTRACT for what future remediation must verify.

## Credential material taxonomy (preview; full in `08_*.md`)

| Material | Created by | Stored in (raw / hash / encrypted) | Read by | Client-visible? | URL/cookie/session? | Rotation / revocation |
|---|---|---|---|---|---|---|
| Better Auth session cookie | Better Auth sign-in | cookie (encrypted/session-signed via `BETTER_AUTH_SECRET`) | Better Auth middleware + session table | yes (HttpOnly cookie) | cookie | session rotation on re-auth |
| OAuth state | Better Auth OAuth init | short-lived cookie + URL param | Better Auth OAuth callback | yes (one-shot in URL) | URL+cookie | one-shot; consumed by callback |
| Magic-link token | Better Auth magic-link send | token in URL ONE-TIME; hash in `verification` table | better-auth server on click | yes (one-shot in URL) | URL | single-use, expiry-bound |
| Share token raw | `src/lib/publication/actions.ts` createShare | encrypted-at-rest via `PUBLICATION_TOKEN_ENCRYPTION_SECRET`; hash-at-rest via `PUBLICATION_TOKEN_HASH_SECRET` | share route handler | yes (raw in URL) | URL | revoke = delete row |
| Share token hash | ditto | hash column in `project_publications` | share route handler at lookup | no | lookup index | tied to raw |
| Invite token raw | `src/lib/collaboration/actions.ts` createInvite | encrypted at rest; hash at rest | invite route handler | yes (raw in URL) | URL | revoke = delete row |
| Invite token hash | ditto | hash column in `collaboration_invitations` | invite route handler at lookup | no | lookup index | tied to raw |
| Share access cookie | share session route | `PUBLICATION_ACCESS_COOKIE_SECRET`-signed | share routes after password | yes (HttpOnly) | cookie | tied to share session |
| WebSocket ticket | DO upgrade route (where minted TBD; verify) | short-lived signed; verifiable by DO class | DO upgrade handler | yes (one-shot in URL/header) | WS upgrade | one-shot; per-session rate limited |
| R2 signed URL | direct-upload mint | R2 minted; TTL-bounded | client + R2 service | yes (TTL-bounded) | URL | TTL; revoked by mint endpoint when needed |
| CSRF token | Better Auth (built-in) | per-session cookie | Better Auth server on state-changing requests | yes (HttpOnly) | cookie | rotated per session |

> **Audit observation (CR-001)**: This taxonomy is the audit's CONTRACT — distinct materials MUST NEVER be collapsed. The audit confirms the taxonomy in `08_*.md` audit pass and rejects any code-generation pattern that produces a generic "token" type.

## Network topology (live)

- Client → Cloudflare edge (CDN, WAF when configured)
- Cloudflare edge → Worker (`archestimator-proof`) → fetch chain: optimization routers → OpenNext
- Worker → D1 (`ARCH_DB`) — only from inside Worker
- Worker → R2 (`ARCH_UPLOADS_R2`) — only from inside Worker
- Worker → DO (`COLLAB_ROOMS`) — only from inside Worker; WS upgrade via `routeCollaborationRoomRequest`
- Worker → Queue (`UPLOAD_JOBS_QUEUE`) — only from inside Worker
- Worker → Email (`EMAIL`) — only from inside Worker
- Worker → Images (`IMAGES`) — only from inside Worker

No outbound calls are expected except:
- Better Auth Google OAuth → Google
- DeepSeek (when AI enabled) → DeepSeek
- Google Maps (when used) → Google Maps API

> **Audit observation (NET-001)**: All three outbound-call surfaces MUST have SSRF guards (allowlist + private-IP block). See `08_*.md` REQ-SEC-009.