---
title: Implementation Contract Worksheet
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Implementation Contract Worksheet

This worksheet closes the implementation-contract gap without changing source. It records the route/action/provider surface observed on 2026-06-30 and identifies the exact contract fields that P0 must complete before enforcement code starts.

## Route Contract Inventory

| ID | Entry | Methods / branch | Actor and resource | Current gate | Rate-limit decision | Required proof |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | `src/app/api/ai/ask/route.ts` | POST | Authenticated workspace user, AI ask cost | AI user context plus existing AI limiter | Preserve AI ask quota; add policy ID and cost dimensions. | Ask loop denies before provider spend; 503 contract on store failure. |
| RC-002 | `src/app/api/ai/package-builder/route.ts` | POST draft/refine/feedback/apply | Authenticated workspace user, package draft/apply | Handler auth at `handler.ts:194-201`; draft token for feedback/apply | Add separate draft/refine/feedback/apply decisions; apply needs mutation/cost classification. | Provider stub and Apply authorization tests; no limiter decision exists today. |
| RC-003 | `src/app/api/auth/[...all]/route.ts` | GET, POST, PATCH, PUT, DELETE | Auth/session/email/client | Auth provider/app route | Coordinate with provider; avoid duplicate lockout. | Provider contract review and beta-user recovery tests. |
| RC-004 | `src/app/api/component-library/attachments/direct-upload/route.ts` | POST | Authenticated workspace user, attachment/upload session | Auth plus upload/session checks | Storage request/concurrency policy; durable source of truth required. | Concurrent upload and crash-before-release tests. |
| RC-005 | `src/app/api/component-library/attachments/route.ts` | GET, POST, DELETE | Authenticated workspace user, attachment | Auth/data access | POST/DELETE storage mutation policy; GET likely normal auth read. | Mutation burst tests and no-policy rationale for low-cost reads. |
| RC-006 | `src/app/api/component-library/attachments/scan-override/route.ts` | POST | Authenticated privileged user, scan override | Auth/authorization required | Admin/storage override policy or explicit no-policy with audit. | Authorization and audit test. |
| RC-007 | `src/app/api/component-library/images/route.ts` | GET, POST, DELETE | Authenticated workspace user, component image | Auth/data access | Image storage request/byte policy for POST/DELETE; GET soft only. | Upload/delete cost tests and no-store sensitive responses. |
| RC-008 | `src/app/api/estimate-row-images/route.ts` | POST | Authenticated user, estimate row image | Auth/data access | Image upload policy tied to workspace/user/estimate. | Upload size/type/concurrency tests. |
| RC-009 | `src/app/api/health/route.ts` | GET | Public or infrastructure health | Health route | No app limiter unless infrastructure abuse appears; WAF coarse only. | No-policy rationale and monitoring. |
| RC-010 | `src/app/api/internal/client-error/route.ts` | POST | Browser telemetry client | Same-origin/fetch metadata/body size plus local IP map | Telemetry limiter may fail soft/drop; normalize client hash. | Flood test proves core app unaffected and no raw client data stored. |
| RC-011 | `src/app/api/internal/upload-cleanup/route.ts` | GET, POST | Cron/internal job | Secret/config gate | Signature/secret/idempotency first; rate limit secondary. | Replay/idempotency and secret-missing tests. |
| RC-012 | `src/app/api/internal/upload-runtime/route.ts` | GET, POST | Internal upload runtime | Secret/config gate | Same as internal job; classify per operation. | Replay/idempotency and queue-safety tests. |
| RC-013 | `src/app/api/internal/upload-scan/route.ts` | GET, POST | Cron/internal scan | Secret/config gate | Same as internal job; rate limit is secondary. | Duplicate scan prevention proof. |
| RC-014 | `src/app/api/projects/[projectId]/activity/route.ts` | GET | Authenticated project user, activity feed | Auth/project access | Low-cost read; likely no app limiter beyond auth unless polling pressure appears. | No-policy rationale or soft read limit if metrics justify. |
| RC-015 | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | GET | Authenticated user, project/estimate export | Auth/project access plus existing export limiter | Preserve 12/min and 120/hour before workbook generation. | 429/Retry-After before workbook work; p95/export cost telemetry. |
| RC-016 | `src/app/api/projects/images/route.ts` | GET, POST, DELETE | Authenticated project image user | Auth/project access | Storage policy for POST/DELETE; GET soft/no-policy rationale. | Size/type/concurrency and delete tests. |
| RC-017 | `src/app/api/share/[token]/activity/route.ts` | GET | Public share token/session | Token/session helpers plus durable 60/min | Preserve current durable read limit. | Route test for 429/Retry-After and no token leak. |
| RC-018 | `src/app/api/share/[token]/comment/route.ts` | GET, POST | Public reviewer/recipient/publication | Token/session/recipient helpers plus durable read/write limits | Preserve current read/write windows; protect reviewer UX. | Office-NAT reviewer scenario and comment spam test. |
| RC-019 | `src/app/api/share/[token]/decision/route.ts` | GET, POST | Public reviewer/recipient/publication | Token/session/recipient helpers plus durable limits | Preserve durable write limit; add idempotency/false-positive path. | Repeated decision and retry tests. |
| RC-020 | `src/app/api/share/[token]/events/route.ts` | POST | Public share event client | Same-origin plus durable 60/min | Preserve event limiter and no-store behavior. | Event flood test. |
| RC-021 | `src/app/api/share/[token]/password/route.ts` | POST | Public token/client | Durable password failure plus local lockout | Make durable counter authoritative; local lockout supplemental only. | Brute force, delay, success-clear, no-existence-leak tests. |
| RC-022 | `src/app/api/share/[token]/route.ts` | GET | Public share token/client | Token helper plus durable 60/min | Preserve root/snapshot limiter. | Token root repeated load test. |
| RC-023 | `src/app/api/share/[token]/session/route.ts` | GET, POST, DELETE | Public share session/token/client | Token/session helpers plus durable 10/min and 50/hour | Preserve current session controls. | Session start/delete retry/no-store tests. |
| RC-024 | `src/app/api/share/[token]/unsubscribe/route.ts` | GET, POST | Public recipient/token | Token/recipient helper plus durable 5/min and 20/hour | Preserve limit but keep unsubscribe recovery. | Unsubscribe retry and support scenario. |
| RC-025 | `src/app/api/webhooks/resend/route.ts` | POST | Resend webhook event | Signature/config/body-size gate | No generic quota first; signature/replay/idempotency is primary. | Replay and invalid signature tests. |
| RC-026 | `src/app/auth/callback/route.ts` | GET | OAuth/magic callback | Auth provider/session | Coordinate with provider; avoid broad IP lockout. | Callback retry and invalid-state tests. |
| RC-027 | `src/app/invite/[token]/accept/route.ts` | POST, GET | Invite token/user/client | Invite token/user gate plus durable invite limiter | Preserve invite accept limiter and no enumeration. | Accept loop and token probing tests. |
| RC-028 | `src/app/invite/[token]/continue/route.ts` | POST, GET | Invite token/user/client | Invite token/user gate plus durable continue limiter | Preserve continue limiter and UX. | Continue loop test. |
| RC-029 | `src/app/invite/[token]/sign-out/route.ts` | POST | Invite token/client/session | Same-origin check at `route.ts:25-29`, then Supabase sign-out | P0 must choose explicit no-policy or light token/client limiter. | Same-origin rejection and sign-out abuse/no-policy proof. |
| RC-030 | `src/app/workshop/pending-invite/route.ts` | GET | Pending invite/workshop user | Route-specific access gate | Low-cost read unless polling/abuse appears. | No-policy rationale or soft read test. |

## Server Action File Inventory

P0 must expand high-risk file rows to function-level contracts before source edits. File-level classification is enough for this planning package because implementation is not authorized here.

| ID | File | Observed action set | Class | Rate-limit decision | Required proof |
| --- | --- | --- | --- | --- | --- |
| AC-001 | `src/lib/auth/account-actions.ts` | `updateProfileSettings`, `updateWorkspaceSettings`, `getAccountSetupState` | Auth account mutation/read | Mutation policy for updates; no-policy rationale for setup read. | Auth/action tests. |
| AC-002 | `src/lib/auth/actions.ts` | `signInWithEmail`, `signInWithGoogle`, `signOut` | Auth/provider | Email/client limiter coordinated with provider; sign-out no-policy rationale. | Provider recovery and enumeration tests. |
| AC-003 | `src/lib/auth/beta-allowlist-admin-actions.ts` | `createClosedBetaAllowlistEntry`, `updateClosedBetaAllowlistEntry` | Admin mutation | Admin-only mutation policy or audit-only no-policy. | Authorization and audit tests. |
| AC-004 | `src/lib/collaboration/actions.ts` | Invite/collaborator/link/resend/access-mode actions | Invite/email/collaboration mutation | Preserve invite create/resend durable limits; classify collaborator mutations. | Invite/email reputation tests. |
| AC-005 | `src/lib/collaboration/pending-invite-actions.ts` | `signOutForPendingInvite`, `acceptPendingInvitationById` | Invite/session | Accept limiter; sign-out no-policy or light limiter rationale. | Pending invite accept/sign-out tests. |
| AC-006 | `src/lib/collaboration/realtime-identity-actions.ts` | `issueRealtimeIdentity` | Realtime/provider credential | Room/user/client join quota and token issuance guard. | Realtime token issuance tests. |
| AC-007 | `src/lib/collaboration/summary-actions.ts` | `fetchProjectCollaborationSummary` | Auth read | No-policy or soft read limiter only if polling metrics justify. | No-policy rationale. |
| AC-008 | `src/lib/component-library/actions.ts` | Component library reads, preferences, component/folder/template mutations, bulk archive/search | Storage/library mutation and search | Function-level classification required; bulk/archive/search need cost windows. | Mutation burst and bulk archive tests. |
| AC-009 | `src/lib/component-library/template-editor-actions.ts` | Template node/row/create/update/remove/reorder/insert actions | High-frequency authenticated mutation | Lenient burst/workspace policy; avoid blocking normal editing. | Editing profile and multi-tab tests. |
| AC-010 | `src/lib/estimate-sheet/user-preferences-actions.ts` | Load/save estimate sheet preferences | Preference read/write | Low-risk save limiter or no-policy rationale. | Preference action tests. |
| AC-011 | `src/lib/estimates/actions.ts` | Estimate reads plus create/duplicate/delete/update/reorder/row mutations | High-frequency estimate mutation | Existing local limiter is not distributed; function-level policy required. | Normal editing, runaway loop, multi-tab tests. |
| AC-012 | `src/lib/estimates/express-promotion-actions.ts` | Promote estimate/express row to library component | Provider/storage mutation | Authenticated mutation policy plus idempotency. | Promotion duplicate test. |
| AC-013 | `src/lib/estimates/subtree-actions.ts` | `fetchEstimateNodeSubtree` | Auth read | No-policy or soft read limiter if polling pressure appears. | No-policy rationale. |
| AC-014 | `src/lib/favorites/sidebar-favorites-actions.ts` | `fetchSidebarFavoriteProjects` | Auth read | No-policy rationale. | No-policy rationale. |
| AC-015 | `src/lib/legal/actions.ts` | `acceptCurrentTermsAction` | Legal/account mutation | No broad limiter; idempotency and auth. | Idempotent accept test. |
| AC-016 | `src/lib/notifications/actions.ts` | Notification load/mark/dismiss/acknowledge actions | Auth read/mutation | Soft read/no-policy for load; mutation burst guard if needed. | Notification action tests. |
| AC-017 | `src/lib/projects/actions.ts` | Project create/delete/bulk/update/image metadata actions | Project mutation/storage | Authenticated mutation and bulk delete policy. | Bulk delete preview/execute tests. |
| AC-018 | `src/lib/projects/location-actions.ts` | Save/clear project location | Project mutation | Low-risk mutation limiter or no-policy rationale. | Mutation tests. |
| AC-019 | `src/lib/publication/actions.ts` | Publication create/republish/rotate/revoke/recipient/email/activity/digest actions | Public-link/email/provider mutation | Preserve public/share UX; email/provider and link rotation policies. | Recipient email/digest and rotate/revoke tests. |
| AC-020 | `src/lib/publisher/activity-actions.ts` | `loadPublisherWorkspaceActivity` | Auth read | No-policy or soft read. | No-policy rationale. |
| AC-021 | `src/lib/publisher/drawer-actions.ts` | `readPublisherPublicationDrawerData` | Auth read | No-policy or soft read. | No-policy rationale. |
| AC-022 | `src/lib/recipient-proposals/actions.ts` | `loadRecipientProposals` | Recipient/public read | Soft read with reviewer-friendly false-positive path if needed. | Reviewer scenario. |
| AC-023 | `src/lib/reusable-sources/actions.ts` | List/search source projects/estimates, outline, insert source | Search/read plus estimate mutation | Search/cost soft limit; insert mutation policy. | Search pressure and insert tests. |
| AC-024 | `src/lib/workshop/actions.ts` | Favorite project/estimate actions | Low-risk mutation | No-policy or lenient mutation guard. | Favorite burst test if enforced. |
| AC-025 | `src/lib/workshop/beta-feedback-actions.ts` | `submitBetaFeedback`, `submitBetaFeedbackInline` | Public/beta feedback write | Spam limiter and optional Turnstile if public. | Feedback spam test. |
| AC-026 | `src/lib/workshop/beta-feedback-review-actions.ts` | `updateBetaFeedbackReviewStatus` | Admin/review mutation | Admin-only audit/no-policy or low limiter. | Authorization test. |
| AC-027 | `src/lib/workshop/group-actions.ts` | Create/rename/recolor/delete/reorder/move/bulk group actions | Project organization mutation | Lenient workspace mutation policy. | Bulk assignment and reorder tests. |

## Cloudflare Provider Contract Rows

| ID | Slice | Exact config/proof required | Rollback | Evidence class | Decision |
| --- | --- | --- | --- | --- | --- |
| CP-001 | WAF observe-only public paths | Rule expression, threshold, mitigation timeout, log/readback artifact, app-origin comparison. | Disable by rule ID. | Provider readback plus hosted/origin logs. | OPEN. |
| CP-002 | WAF challenge/block | Owner-approved expression, false-positive threshold, support path, rollback drill. | Revert to observe-only or disabled. | Provider readback plus support metrics. | OPEN; no production block yet. |
| CP-003 | Turnstile | Widget surface, secret binding, server-side validation, token replay/expiry proof, accessibility fallback. | Feature flag off, app limiter still active. | Route tests plus provider validation. | OPEN; adaptive only. |
| CP-004 | Workers Rate Limiting binding | Wrangler binding, `namespace_id`, `period`, key basis, per-location overshoot test. | Remove soft check, keep app limiter. | Hosted Worker proof. | OPEN; not exact. |
| CP-005 | Durable Object exact counter | Partition key, binding/migration, transaction/concurrency tests, cleanup/expiry. | Keep Postgres/RPC as source of truth. | Hosted Worker/DO proof. | OPEN; exact candidate. |
| CP-006 | D1 limiter metadata | Schema, query budget, backup/restore, hot-counter rejection/mitigation. | Keep Postgres events. | Hosted Worker plus provider readback. | OPEN; not hot-counter default. |
| CP-007 | Observability | Logs/traces receipt, redaction sample, retention/sampling config, dashboard fields. | App-side events only. | Provider receipt plus dashboard/runbook. | OPEN. |

## Evidence Classes

| Class | Meaning | Allowed claim |
| --- | --- | --- |
| Local static | Source/doc/config inspection only. | Plan/source-grounding claim. |
| Local automated | Unit/route/action/store test in local CI/dev. | Local behavior claim for tested code path. |
| Distributed simulation | Multi-instance/concurrent local test. | Race/overshoot risk evidence, not hosted proof. |
| Browser/manual | Human/browser workflow proof. | UX/accessibility/manual claim only for tested flow. |
| Provider readback | Cloudflare/Supabase/provider API or console readback. | Provider config exists/disabled/enabled as read. |
| Hosted runtime | Deployed Worker/origin/provider traffic proof. | Runtime behavior for the tested environment. |
| Inferred | Reasoned from docs or source without execution. | Planning hypothesis only. |
