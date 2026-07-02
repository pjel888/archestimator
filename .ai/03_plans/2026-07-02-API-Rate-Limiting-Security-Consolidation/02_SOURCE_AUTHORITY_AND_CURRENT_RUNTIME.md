# Source Authority And Current Runtime

## Purpose

This document reconciles the two source packs against current repository evidence. It prevents stale assumptions from entering implementation.

## Current Runtime Ledger

Current source and state indicate:

- App runtime: Next.js 16 + React 19 through OpenNext on Cloudflare Workers.
- Database: Cloudflare D1.
- Object storage: Cloudflare R2.
- Realtime: Cloudflare Durable Objects.
- Auth: Better Auth.
- Edge controls: Cloudflare WAF, Rate Limiting Rules, Turnstile, Workers runtime APIs, and observability when configured.
- Historical artifacts: Supabase/Postgres files and references may remain, but they are not active runtime authority unless a future source read proves an active path.

Implementation agents must refresh this ledger before editing because the repo is actively changing.

## API Route Surface Snapshot

Targeted source inventory found route handlers including:

- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/package-builder/route.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/scan-override/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/estimate-row-images/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/internal/client-error/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`
- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/projects/[projectId]/activity/route.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- `src/app/api/projects/images/route.ts`
- `src/app/api/share/[token]/*`
- `src/app/auth/callback/route.ts`
- `src/app/invite/[token]/*`
- `src/app/workshop/pending-invite/route.ts`

Implementation agents must re-run route inventory before editing. This list is a planning snapshot.

## Server Action Surface Snapshot

Targeted source inventory found Server Action files including:

- `src/lib/auth/account-actions.ts`
- `src/lib/auth/actions.ts`
- `src/lib/auth/beta-allowlist-admin-actions.ts`
- `src/lib/collaboration/actions.ts`
- `src/lib/collaboration/pending-invite-actions.ts`
- `src/lib/collaboration/realtime-identity-actions.ts`
- `src/lib/collaboration/summary-actions.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/estimate-sheet/user-preferences-actions.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/express-promotion-actions.ts`
- `src/lib/estimates/subtree-actions.ts`
- `src/lib/favorites/sidebar-favorites-actions.ts`
- `src/lib/legal/actions.ts`
- `src/lib/notifications/actions.ts`
- `src/lib/projects/actions.ts`
- `src/lib/projects/location-actions.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publisher/activity-actions.ts`
- `src/lib/publisher/drawer-actions.ts`
- `src/lib/recipient-proposals/actions.ts`
- `src/lib/reusable-sources/actions.ts`
- `src/lib/workshop/actions.ts`
- `src/lib/workshop/beta-feedback-actions.ts`
- `src/lib/workshop/beta-feedback-review-actions.ts`
- `src/lib/workshop/group-actions.ts`

Server Actions are API surface for this plan. Do not exempt them from authentication, authorization, validation, idempotency, CSRF/origin, rate limit, error-envelope, privacy, or observability review.

## Existing Limiter Assets

The source already has durable controls that should be preserved and consolidated:

- Public publication/share rate checks in `src/lib/publication/public-repository.ts`.
- Invite create/resend/resolve/continue/accept controls in `src/lib/collaboration/invite-entry.ts`.
- AI request controls in `src/lib/ai/rate-limit.ts`.
- Upload admission controls under `src/lib/uploads/**` and relevant API routes.
- Proposal export controls on the heavy Excel export route.
- In-memory estimate mutation limits in `src/lib/estimates/action-rate-limit.ts`.
- Better Auth limiter configuration/proof surfaces.

The plan should prefer consolidating and proving these controls over replacing them wholesale.

## Existing Idempotency, Retry, Queue, And Error Assets

Targeted source review found reusable primitives that should be preserved and standardized:

- `src/lib/estimates/d1-action-client.ts` uses `correlation_id` and existing-event reads in estimate mutation history paths. This is a strong local precedent for retry-safe D1 mutation effects, but it is not yet a universal HTTP idempotency contract.
- `src/lib/ai/package-builder/apply.ts`, `src/app/api/ai/package-builder/handler.ts`, and `src/components/workshop/EstimateCopilotFloatingButton.tsx` use idempotency or deterministic correlation keys for AI package application flows. Future API work should standardize key scope, request fingerprint, replay, and mismatch behavior instead of leaving each route to invent its own contract.
- `wrangler.jsonc`, `worker.ts`, and `src/lib/cloudflare/upload-job-queue.ts` show Cloudflare queue bindings, retries, dead-letter configuration, batch-level duplicate detection, and ack/retry handling. The plan must still assume at-least-once delivery and require durable cross-batch dedupe proof for side effects.
- `src/lib/observability/with-action-errors.ts` gives Server Actions a local error pattern, while Route Handlers commonly return `{ error: ... }` or `{ ok: false, error: ... }`. The plan should normalize external error fields without forcing every Server Action to abandon the existing local wrapper.
- Several public/share/invite/upload/AI routes already emit no-store or `Retry-After`, but the behavior is uneven enough to need a cross-surface response contract.
- HTTP-native conditional request semantics such as `If-Match` and `If-None-Match` were not consistently present in scanned mutation paths. Implementation must either add them for Route Handler resources where they fit or use explicit expected-revision fields for Server Actions.

## Known Gaps And Conflicts

### Realtime

`worker.ts` exports `CollaborationRoom` and calls `routeCollaborationRoomRequest`. `src/lib/cloudflare/collaboration-room-router.ts` parses a room name, gets a Durable Object ID from `COLLAB_ROOMS.idFromName`, and forwards the request. `src/lib/cloudflare/collaboration-room.ts` accepts WebSocket upgrades.

Merged implication: anonymous or unauthorized room access cannot be treated as already solved. A signed ticket flow is required before forwarding to Durable Objects.

### D1 Authorization

`src/lib/authz/d1-access.ts` exists and should be extended/adopted where appropriate. But D1 has no native RLS. The release gate is 100% access-path proof, not "helper exists."

### Store Authority

The old Rate Limiting P0A language referred to "Existing Postgres/security-event behavior only." This is superseded by current Cloudflare-only state. The merged plan must name actual storage per surface:

- D1 limiter/audit tables.
- D1 auth/account/profile/workspace/project tables.
- Durable Object room state.
- Better Auth storage and limiter storage.
- R2 object metadata.
- Cloudflare Security Events and Workers Observability.
- Historical Supabase/Postgres artifacts, if any, as inactive unless proven active.

### Idempotency And Retry Semantics

The earlier consolidated pack mentioned idempotency and replay posture, but it did not provide enough source-backed implementation shape for unsafe POST/Server Action/public-token mutations, retries after network timeout, concurrent duplicate requests, same idempotency key with different intent, or partial provider failures.

Merged implication: WP-I must classify every touched unsafe mutation and async path before broad implementation. Correlation IDs are observability aids unless they are scoped, fingerprinted, persisted, and enforced as idempotency keys.

### Async At-Least-Once Delivery

Cloudflare Queues and Durable Object alarms must be treated as at-least-once execution surfaces. Existing upload-job queue code has useful retry and duplicate handling assets, but the release gate is durable duplicate side-effect proof across batches/retries, not helper existence.

Merged implication: queue consumers, cron/internal jobs, email dispatch, upload processing, scan/cleanup, and Durable Object alarms need idempotent side-effect tests, poison-message behavior, and DLQ/operator evidence.

### Token Semantics

The API audit source had older text implying invite raw tokens were encrypted-at-rest, while later verification corrected this to hash plus server pepper. This pack standardizes the posture:

- Raw bearer tokens must not be stored in cleartext.
- Hash plus pepper is still sensitive metadata, not encryption.
- Constant-time compare, no-store responses, referrer controls, expiry, revocation, and non-enumerating errors are required for token-bearing surfaces.
- Invite/token limiter secrets require declaration proof, not only source reads. Implementation must inventory `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`, confirm env typing/config or secret-sync coverage, prove fail-closed behavior when missing, and state what deployed readback can and cannot prove without exposing secret values.

### Path Drift

Several API audit source docs and tracked git state referenced `2026-07-21-API-Audit`, while the user-provided workspace source folder for this task was `2026-07-01-API-Audit`. This pack supersedes both API-audit identifiers and the older split-pack structure.

## Source Preservation Rules

Preserve and carry forward:

- Rate Limiting policy and limit matrix reasoning.
- Public-share limiter inventory and public endpoint threat modeling.
- Better Auth coordination.
- Cloudflare-native observe-first posture.
- API audit current-runtime contract.
- D1 app-authorization concerns.
- Realtime WebSocket ticket correction.
- Upload/R2 and AI/SSRF concerns.
- Final independent verification corrections.

Supersede:

- Postgres/Supabase as active limiter/audit store without fresh proof.
- Assumed realtime signed ticket existence.
- Invite token "encrypted-at-rest" wording.
- API audit folder path drift.
- Any "implementation ready" reading that bypasses P0 gates.

## Handoff Checklist

Before implementation:

- Re-run route and Server Action inventory.
- Re-read `src/lib/cloudflare/collaboration-room-router.ts` and `src/lib/cloudflare/collaboration-room.ts`.
- Re-read `src/lib/publication/public-repository.ts`, `src/lib/collaboration/invite-entry.ts`, `src/lib/ai/rate-limit.ts`, and `src/lib/estimates/action-rate-limit.ts`.
- Re-read `src/lib/estimates/d1-action-client.ts`, `src/lib/ai/package-builder/apply.ts`, `src/lib/cloudflare/upload-job-queue.ts`, and `src/lib/observability/with-action-errors.ts`.
- Re-read `src/lib/authz/d1-access.ts`.
- Re-check `wrangler.jsonc`, `cloudflare-env.d.ts`, and current deployed/proof state if provider behavior is in scope.
