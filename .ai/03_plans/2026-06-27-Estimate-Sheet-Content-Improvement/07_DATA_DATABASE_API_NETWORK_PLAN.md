# Data Database API Network Plan

## Current Data Surfaces

| Surface | Current Evidence |
|---|---|
| Row tables | `estimate_row_items`, `estimate_nodes`, `estimate_tabs`, `estimate_sheet_adjustments` |
| Event/version history | `estimate_sheet_events`, `estimate_sheet_versions` |
| Row mutation RPCs | `insert_estimate_row_item_with_history`, `update_estimate_row_item_with_history`, `replace_estimate_row_item_with_history`, `delete_estimate_row_item_with_history`, `move_estimate_row_component_with_history`, `move_estimate_row_item_with_history`, `delete_estimate_row_items_bulk_with_history`, `restore_deleted_estimate_rows_with_history` |
| Tab lifecycle RPCs | `create_estimate_tab_with_history`, `rename_estimate_tab_with_history`, `reorder_estimate_tabs_with_history`, `duplicate_estimate_tab_with_history`, `delete_estimate_tab_with_history` |
| Tree node RPCs | `create_estimate_node_with_history`, `rename_estimate_node_with_history`, `reorder_estimate_nodes_with_history`, `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`, `restore_deleted_estimate_nodes_with_history` |
| Server actions | `src/lib/estimates/actions.ts:2883-3345` |
| Route-context cache | `src/lib/repositories/workspace-repository.ts:3492-3591` |
| Legacy browser repository | `src/lib/repositories/estimate-repository.ts:232-268` |
| Public/share/comment/activity routes | `/share`, `/api/share/[token]/*`, proposal/export route handlers |
| Private and row image routes | `/api/projects/images`, `/api/estimate-row-images` |

## Required Persistence Contracts

| Contract | Plan |
|---|---|
| Stable idempotency | Every mutation receives a stable client mutation ID. Server fallback `gen_random_uuid()` is acceptable only for non-retryable internal one-offs, not user actions. |
| DB edit enforcement | Every mutation RPC granted to `authenticated` calls `assert_can_edit_estimate_for_history` or equivalent internally. |
| Expected revisions | Row and sheet mutations use expected row/sheet revisions and return typed conflicts. |
| Dense ordering | Row move and tree reorder normalize sort order server-side and return authoritative affected rows/nodes. |
| Shared finalization | Every successful content mutation clears or invalidates route/query caches consistently. |
| Typed adapters | RPC `Json` results are parsed through app-side adapters with contract tests. |
| Browser direct writes | Direct `estimate_row_items` browser upsert/insert/delete paths are removed, test-only, or hard-gated. |
| Safe DTOs | Server Actions, RPC adapters, route handlers, public snapshots, activity/history, and export builders return allowlisted DTOs only. |
| Direct-POST Server Action defense | Every exported mutation action validates authn/authz, ownership, input, rate/abuse posture, return DTO, and cache behavior independent of the UI caller. |
| Abuse/rate controls | High-write/high-cost paths define per-actor limits, backoff, retry caps, and alert thresholds before release. |

## Mutation ID Coverage

| Action | Current Gap / Target |
|---|---|
| Insert row | Current hook can create mutation ID; require it for all inserts. |
| Update row | Current hook creates mutation ID and expected revision; keep and expose to coordinator. |
| Replace/detach/promote | Current per-row queue creates IDs; keep and test retry/idempotency. |
| Component move | Current creates mutation ID but is not per-row queued; coordinate across source/target rows. |
| Row move | Current creates mutation ID and sends updates; coordinate per source/target node and moved row. |
| Bulk delete | Current creates mutation ID and expected revisions; add partial-failure/idempotent retry proof. |
| Restore | Current creates mutation ID; define full-event vs row-set restore idempotency. |
| Sheet adjustment | Current direct table path has no correlation ID; replace with or wrap in history-aware/idempotent RPC. |
| Tree/tab actions | Inventory and add stable IDs where missing. |

## Cache Finalization Plan

Create one shared server-side helper and one client-side policy. The helper must be route-specific enough that implementers know whether a mutation only needs client cache patching or also needs RSC route/process-cache invalidation.

Server finalization:

- clear `estimateRouteContextProcessCache` for the project,
- revalidate project estimate paths only when RSC route freshness needs it: tab/node identity changes, route-level selected-node fallback, public/share/export snapshots, or other server-rendered DTO changes,
- avoid full route reload for normal client-side row edits.

Client finalization:

- patch known query data first,
- invalidate stale query keys with correct `refetchType`,
- actively refetch only on conflicts, missing result rows, or route-critical changes,
- record metric fields: mutation kind, duration, pending age, retry count, stale conflict, rollback.

Route-specific finalization matrix:

| Mutation Class | Client Cache Patch | TanStack Invalidate/Refetch | Route Process Cache | `revalidatePath` Candidate | Proof |
|---|---|---|---|---|---|
| Row scalar/quantity/source edit | Patch row and totals locally; reject stale success | Invalidate/refetch on failure, conflict, or missing returned row | Usually no | No for routine edit | DOM/cache freshness test |
| Row insert/delete/restore/bulk delete | Patch node row list and totals | Refetch selected node/tree on partial failure or restore ambiguity | Yes when route context counts/selected fallback can change | Only if server route context or public/export snapshot depends on it | Insert/delete/reload proof |
| Row same-node reorder | Patch row order | Refetch on missing/partial move result | No unless route context stores order | No for routine reorder | Reorder then reload proof |
| Row cross-node move/tree drop | Patch source and target node rows | Refetch if returned rows absent from current cache | Yes when selected node fallback or route tree context can be stale | Conditional | Content-to-tree then target reorder proof |
| Tree/tab create/rename/reorder/delete | Patch tree/tab query | Refetch affected tab/tree | Yes | Conditional, especially tab/node route identity | Tree/tab route reload proof |
| Sheet adjustment | Patch totals/sheet summary | Refetch sheet summary on conflict | Yes if route summary changes | Conditional | Adjustment reload proof |
| Public/share/proposal/export snapshot | No client-only assumption | Rebuild/refetch safe public DTO | Yes | Yes when public route output changes | Public/export route test |

Missing or ambiguous rows in this matrix block implementation-readiness for the corresponding mutation class.

## Attack Surface Inventory

| Entry Point | Actor | Required Authz/Ownership | Input Validation | Output DTO | Rate/Abuse Posture | Required Proof |
|---|---|---|---|---|---|---|
| Estimate row/tree/tab/sheet Server Actions in `actions.ts` | Authenticated browser or direct POST caller | Session plus project/estimate edit/access check inside action and DB/RPC where applicable | Typed schema or explicit field allowlist; expected revision/mutation ID | Safe mutation result DTO, no raw DB rows unless allowlisted | Per-user/project mutation limits, retry caps, direct-POST denial metrics | Server-action direct-call tests for owner/editor/viewer/workspace-only/unrelated actors |
| Direct Supabase RPC/PostgREST | Authenticated Supabase user | DB function/RLS-level edit/read enforcement | SQL function argument checks, same-estimate/tab/node validation | Function result strips unsafe snapshots | Provider rate/abuse monitoring, duplicate correlation handling | Direct RPC integration/provider tests |
| Private image read/upload routes | Authenticated app user | Project/estimate/row image access; ACL precedence decision for project editor vs estimate collaborator | Storage path, file type, size, source snapshot fields | Signed/private paths not returned to unauthorized callers | Upload/read rate limits and suspicious path alerts | Unauthorized route tests and upload validation tests |
| Public share/comment/activity/decision routes | Token recipient, public share visitor, authenticated collaborator | Share token/session/recipient scope and revocation | Comment/decision payload schemas, token format, pagination | Redacted public DTO only; no private history/source fields | Existing or planned rate limits, no-store headers, abuse metrics | Route handler tests for revoked/expired/wrong-recipient/unrelated actor |
| Proposal/export route handlers | Authorized estimate user or scoped recipient | Estimate/project/share authorization and export permission | Format parameters, estimate ID, recipient/token | Redacted export model; no raw signed URLs/private storage keys | Export rate limits and file-size/time thresholds | Export route auth/redaction/cache-header tests |
| Activity/history dialogs | Authorized estimate/project user | History read access matches estimate access | Pagination/filter bounds | Redacted event DTO; no sensitive source URLs unless allowed | Pagination/rate limits | History RLS and DTO contract tests |

## Secrets And Environment Posture

No new env var is currently required by this plan. If implementation adds one, it must update `.ai/00_corpus/feature-flag-and-env-inventory.md` and include rollout/rollback notes.

| Secret / Env Class | Rule |
|---|---|
| Supabase service role or provider admin keys | Server-only; never passed to Client Components or public route DTOs. |
| Storage signing credentials / signed URLs | Server-only generation; snapshots/history/public exports store stable references or redacted DTOs, not raw signed URLs. |
| Provider tokens for email/maps/analytics/export | Server-only unless explicitly `NEXT_PUBLIC_*` and documented as public by design. |
| `NEXT_PUBLIC_*` values | Treat as browser-exposed; justify each use and never include secrets or tenant-private IDs. |
| Feature flags | Default, owner, rollout, rollback, and kill-switch behavior documented before use. |

## DB Hardening Tasks

| Task | Details |
|---|---|
| DATA-DB-001 | Audit duplicate `estimate_sheet_events` by `(estimate_id, correlation_id)` before adding uniqueness. |
| DATA-DB-002 | Add a unique index or constraint on `(estimate_id, correlation_id)` if duplicate audit is clean or after dedupe plan. |
| DATA-DB-003 | Patch `update_estimate_row_item_with_history` and `replace_estimate_row_item_with_history` to enforce DB edit checks. |
| DATA-DB-004 | Audit every authenticated `*_with_history` RPC for DB-level authz, revision, same-estimate/same-tab scoping, limits, and idempotency. |
| DATA-DB-005 | Replace direct `estimate_sheet_adjustments` writes with history-aware RPC or explicitly document why adjustments are outside history. |
| DATA-DB-006 | Define restore idempotency semantics for full-event restore and partial row-set restore. |
| DATA-DB-007 | Regenerate Supabase types after migration changes and add adapter contract tests. |

## API And Network Plan

| Surface | Requirement |
|---|---|
| Server actions | Remain the only UI mutation entry point for row/tree/tab/sheet content. |
| Server action direct POST | Treated as externally reachable: authn, authz, validation, rate/abuse, DTO, and cache finalization are tested without relying on the UI. |
| Direct Supabase RPC | Must fail for users lacking edit access even if called outside app actions. |
| Private image routes | Must require project/estimate/row access, not just authentication and path validity. |
| Row image upload | Define whether project editors override estimate-specific ACL; test the chosen policy. |
| Public share/export routes | Return redacted DTOs, no-store/cache-safe headers, token-scope checks, and revocation behavior. |
| Network retries | Retried client actions reuse mutation ID and never create duplicate row/content events. |
| Offline/degraded | Local draft queue preserves inputs and drains in order; unrecoverable failures are explicit. |

## Validation

- Static SQL tests for DB-level edit assertions in every authenticated mutation RPC.
- Direct RPC integration tests for every authenticated row, tab, and tree RPC named in Current Data Surfaces, using viewer, workspace-only member, estimate collaborator, and unrelated authenticated user actors.
- Server-action/route authorization tests for any mutation path that is not directly exposed as a DB RPC.
- Contract tests for RPC JSON parsers in `actions.ts`.
- Cache freshness tests for row insert/update/delete/move, component move, restore, sheet adjustment, tree/tab actions after reload/navigation.
- Network tests that duplicate/retry requests return idempotent prior result or typed conflict.
