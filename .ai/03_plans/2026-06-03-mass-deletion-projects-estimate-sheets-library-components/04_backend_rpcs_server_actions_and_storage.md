# 04 Backend RPCs Server Actions And Storage

## Purpose

This is the backend implementation contract. It does not contain production migrations. SQL shown here is SQL-shape pseudocode to remove ambiguity before implementation.

## Shared Server Action Rules

Every action must:

- be exported from an existing `"use server"` action module;
- call `requireCurrentUserContext()` or use an existing helper that does so;
- resolve workspace through `ensureDefaultWorkspace()` when the target is workspace-scoped;
- validate every id with `isUuid` from `@/lib/ids`;
- trim, dedupe, and cap id arrays before calling RPC;
- never trust client-supplied role/access data;
- call exactly one preview or execution RPC per request;
- return typed result objects for business conflicts rather than throwing generic errors;
- revalidate only affected routes;
- return storage cleanup warnings separately from database success.

## Structured Error Model

Use a consistent result shape:

```ts
type BulkActionErrorCode =
  | "invalid_input"
  | "empty_selection"
  | "too_many_ids"
  | "not_found"
  | "permission_denied"
  | "active_publication_blocked"
  | "referenced_component_blocked"
  | "actor_mismatch"
  | "concurrency_conflict"
  | "storage_cleanup_failed"
  | "unexpected_failure";

type BulkActionIssue = {
  code: BulkActionErrorCode;
  message: string;
  ids?: string[];
  retryable?: boolean;
};
```

Execution actions return `{ ok: true, result, warnings }` or `{ ok: false, issues }`.

## Batch Limits

| Target | Preview cap | Execute cap | Rationale |
|---|---:|---:|---|
| Projects | 50 | 50 | Wide dependency surface; storage cleanup and route churn. |
| Estimate sheets | 100 | 100 | Medium dependency surface; user-selected table rows. |
| Library archive | 500 | 500 | Set-based update, no storage deletion. |
| Library hard delete | 100 | 100 | Storage cleanup and reference checks. |

Caps must be enforced in TypeScript and SQL.

## Proposed Server Actions

### `src/lib/projects/actions.ts`

```ts
export type BulkDeleteProjectsPreviewInput = {
  projectIds: string[];
};

export type BulkDeleteProjectsPreview = {
  targetType: "projects";
  projectCount: number;
  projectNames: Array<{ id: string; name: string; projectCode: string | null }>;
  estimateCount: number;
  nodeCount: number;
  rowItemCount: number;
  activityEventCount: number;
  versionCount: number;
  favoriteCount: number;
  collaborationMemberCount: number;
  collaborationInvitationCount: number;
  activePublicationCount: number;
  blockedPublicationIds: string[];
  storageObjectCount: number;
  storagePaths: string[];
};

export async function previewBulkDeleteProjects(
  input: BulkDeleteProjectsPreviewInput,
): Promise<BulkPreviewResult<BulkDeleteProjectsPreview>>;

export async function executeBulkDeleteProjects(input: {
  projectIds: string[];
  correlationId: string;
  expectedPreviewHash: string;
}): Promise<BulkExecutionResult<{
  deletedProjectCount: number;
  deletedEstimateCount: number;
  deletedNodeCount: number;
  deletedRowItemCount: number;
  auditEventId: string;
  storageCleanupResult: StorageCleanupResult;
}>>;
```

Project delete authorization:

- preview may allow any `can_access_project` project ids but must report ids the actor cannot execute;
- execution must require `can_manage_project_access(project_id)` or platform admin for every target;
- do not rely only on current RLS `can_edit_project`, because current `can_edit_project` includes workspace `member` and is broader than project deletion should be.

Existing `deleteProject(formData)` must be refactored to either:

- open the preview-first modal and call the new actions; or
- wrap the new execution RPC with a single-id path and remove `window.confirm`.

### `src/lib/estimates/actions.ts`

```ts
export type BulkDeleteEstimateSheetsPreviewInput = {
  projectId: string;
  estimateIds: string[];
};

export type BulkDeleteEstimateSheetsPreview = {
  targetType: "estimate_sheets";
  projectId: string;
  estimateCount: number;
  estimates: Array<{ id: string; name: string; sheetCode: string }>;
  nodeCount: number;
  rowItemCount: number;
  activityEventCount: number;
  versionCount: number;
  favoriteCount: number;
  memberCount: number;
  invitationCount: number;
  affectedActivePublicationCount: number;
  blockedPublicationIds: string[];
};

export async function previewBulkDeleteEstimateSheets(
  input: BulkDeleteEstimateSheetsPreviewInput,
): Promise<BulkPreviewResult<BulkDeleteEstimateSheetsPreview>>;

export async function executeBulkDeleteEstimateSheets(input: {
  projectId: string;
  estimateIds: string[];
  correlationId: string;
  expectedPreviewHash: string;
}): Promise<BulkExecutionResult<{
  deletedEstimateCount: number;
  deletedNodeCount: number;
  deletedRowItemCount: number;
  auditEventId: string;
}>>;

export async function deleteEstimateSheet(input: {
  projectId: string;
  estimateId: string;
  correlationId: string;
  expectedPreviewHash: string;
}): Promise<BulkExecutionResult<{ deletedEstimateCount: 1; auditEventId: string }>>;
```

Estimate delete authorization:

- project id must resolve through `getCurrentWorkspaceProject(projectId)`;
- each estimate id must belong to the resolved project;
- execution must require `can_edit_estimate(estimate_id)` for every target;
- if estimates include the current route's sheet, client must redirect after success.

### `src/lib/component-library/actions.ts`

```ts
export type BulkArchiveLibraryComponentsPreviewInput = {
  itemIds: string[];
};

export type BulkArchiveLibraryComponentsPreview = {
  targetType: "library_components";
  componentCount: number;
  components: Array<{ id: string; name: string; lifecycleState: string }>;
  alreadyArchivedCount: number;
  linkedEstimateRowCount: number;
  linkedTemplateRowCount: number;
  variantCount: number;
  attachmentCount: number;
  versionCount: number;
  priceHistoryCount: number;
  stateHistoryCount: number;
};

export async function previewBulkArchiveLibraryComponents(
  input: BulkArchiveLibraryComponentsPreviewInput,
): Promise<BulkPreviewResult<BulkArchiveLibraryComponentsPreview>>;

export async function executeBulkArchiveLibraryComponents(input: {
  itemIds: string[];
  correlationId: string;
  changeReason: string;
  expectedPreviewHash: string;
}): Promise<BulkExecutionResult<{
  archivedComponentCount: number;
  skippedAlreadyArchivedCount: number;
  auditEventId: string;
}>>;
```

Archive authorization:

- preview may allow workspace readers but must identify non-manageable ids;
- execution must require `is_workspace_editor(workspace.id)` or equivalent existing RPC policy;
- state change must be set-based and must append state history for every changed item.

Optional Phase 6:

```ts
export async function previewHardDeleteLibraryComponents(input: {
  itemIds: string[];
}): Promise<BulkPreviewResult<{
  componentCount: number;
  blockedIds: string[];
  linkedEstimateRowCount: number;
  linkedTemplateRowCount: number;
  storagePaths: Array<{ bucket: "component-images" | "component-attachments"; path: string }>;
}>>;

export async function executeHardDeleteLibraryComponents(input: {
  itemIds: string[];
  correlationId: string;
  expectedPreviewHash: string;
}): Promise<BulkExecutionResult<{
  deletedComponentCount: number;
  auditEventId: string;
  storageCleanupResult: StorageCleanupResult;
}>>;
```

Hard delete requires workspace owner/admin or platform admin and zero references.

## Proposed Supabase RPCs

### Preview RPC Responsibilities

Preview RPCs must:

- validate `auth.uid()` is present unless local dev bypass is explicitly active through existing helpers;
- validate actor has read access to each id without leaking cross-workspace existence;
- return `eligibleIds`, `notFoundIds`, `forbiddenIds`, and `blockedIds`;
- compute dependency counts with aggregates;
- return storage paths derived from database rows only;
- compute a deterministic `previewHash` over target ids, dependency blockers, and counts.

SQL shape:

```sql
create or replace function public.preview_bulk_delete_estimate_sheets(
  target_project_id uuid,
  target_estimate_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate batch cap.
  -- Lock no rows for preview.
  -- Split ids into eligible / not_found / forbidden without leaking other workspace existence.
  -- Count nodes, rows, events, versions, favorites, members, invitations.
  -- Count active publications where selected_estimate_ids overlaps target ids.
  -- Return jsonb contract plus previewHash.
end;
$$;
```

### Execution RPC Responsibilities

Execution RPCs must:

- rerun preview inside the transaction;
- compare preview hash or enough blocker state to prevent stale confirmations;
- validate `acting_user_id = auth.uid()`;
- take an advisory transaction lock scoped by workspace and target type;
- use set-based statements only;
- create one audit row with original preview and result;
- return counts and DB-derived storage paths for post-commit cleanup.

SQL shape:

```sql
create or replace function public.execute_bulk_archive_library_components(
  target_workspace_id uuid,
  target_item_ids uuid[],
  acting_user_id uuid,
  correlation_id uuid,
  expected_preview_hash text,
  change_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if acting_user_id is distinct from auth.uid() then
    raise exception 'actor_mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_workspace_id::text || ':bulk-archive-components', 0));

  -- rerun preview; compare hash; abort on forbidden/not_found/blockers
  -- update cost_library_items set lifecycle_state = 'archived' where id = any(...)
  -- insert cost_library_item_state_history from changed rows
  -- insert mass_deletion_events row
  -- return summary
end;
$$;
```

## Transaction Boundaries

| Work | Boundary |
|---|---|
| Preview | read-only RPC; no transaction locks beyond normal statement snapshot. |
| Execute DB changes | single RPC transaction. |
| Storage cleanup | after RPC commit in server action. |
| Route revalidation | after RPC commit and after storage cleanup attempt. |
| Client query invalidation | after action success response. |

## Advisory Lock Strategy

Use `pg_advisory_xact_lock` per workspace and target operation:

- project delete: `workspace_id + ':bulk-delete-projects'`;
- estimate delete: `project_id + ':bulk-delete-estimates'`;
- component archive/delete: `workspace_id + ':bulk-component-lifecycle'`.

This prevents two destructive operations from racing on the same dependency graph without globally locking the app.

## Security Definer Requirements

Every new RPC must:

- use `SECURITY DEFINER` only because cross-table counts and set-based deletes need controlled RLS bypass;
- `SET search_path = public`;
- schema-qualify table/function calls where practical;
- revoke execute from `public` and `anon`;
- grant execute only to `authenticated`;
- compare `acting_user_id` with `auth.uid()`;
- check existing ACL functions inside the RPC;
- return safe grouped ids, not raw rows from inaccessible workspaces.

## Audit Event Creation

Recommended table: `mass_deletion_events`.

Event fields:

- `id`
- `workspace_id`
- `actor_user_id`
- `correlation_id`
- `target_type`: `projects | estimate_sheets | library_components | component_hard_delete`
- `target_ids`
- `preview_hash`
- `preview_summary`
- `result_summary`
- `storage_cleanup_result`
- `status`: `executed | storage_warning | failed`
- `created_at`

Do not store raw tokens, invite tokens, password hashes, service-role details, or raw user prompts.

## Storage Cleanup Design

```ts
type StorageCleanupTarget = {
  bucket: "component-images" | "component-attachments";
  path: string;
};

type StorageCleanupResult = {
  attempted: number;
  deleted: number;
  failed: Array<{ bucket: string; path: string; message: string }>;
};
```

### Allow-List Rules

Project image paths:

- bucket must be `component-images`;
- path must end in `.webp`;
- path must contain `/project-images/`;
- path must not contain `..` or `//`.

Component image paths:

- bucket must be `component-images`;
- path must end in `.webp`;
- path must have workspace id as first segment;
- path must not contain `..` or `//`.

Component attachment paths:

- bucket must be `component-attachments`;
- path must have workspace id as first segment;
- content type is verified from attachment rows before deletion planning;
- path must not contain `..` or `//`.

### Cleanup Failure Behavior

- Do not roll back DB transaction after commit.
- Store failed cleanup paths in audit event.
- Return warning toast text to client: "Deleted records, but N storage files need retry."
- Add a future admin-only retry action only if storage cleanup failures appear in beta.

## Route Revalidation Plan

| Action | Revalidate |
|---|---|
| Project delete | `/workshop/projects`; each deleted `/workshop/projects/{id}`; each `/estimates`; each `/charts`; `/workshop` homebase if favorites changed. |
| Estimate delete | `revalidateProjectEstimatePaths(projectId)`; open estimate routes for deleted ids/nodes when known. |
| Component archive | `/workshop/library`; `/workshop/components`; estimate routes only if archived-source badges are implemented. |
| Component hard delete | `/workshop/library`; `/workshop/components`; estimate routes not required if zero references. |

## TanStack Query Invalidation Notes

Client mutations should invalidate:

- estimate list/table queries after sheet delete;
- `estimateQueryKeys.areaTree(estimateId)` for deleted estimates only if any cache exists;
- project charts queries after estimate/project delete;
- component library dataset query after archive/hard delete.

Do not manually mutate complex area trees after sheet delete; route refresh/invalidation is safer.

## Idempotency Strategy

- Require UUID `correlationId` from client.
- Execution RPC checks for an existing `mass_deletion_events` row with same `correlation_id`, `actor_user_id`, and target type.
- If found with matching target ids, return existing result as idempotent success.
- If found with different target ids, return `concurrency_conflict`.

## No Row-By-Row Deletion Rule

Forbidden:

- client loops calling `deleteProject` or `deleteEstimateRowItem`;
- server action loops calling single delete RPCs;
- SQL procedural loops that delete one id at a time.

Allowed:

- set-based `DELETE ... WHERE id = ANY(target_ids)`;
- `INSERT ... SELECT` for audit/state history rows;
- chunked storage cleanup after DB commit because storage API is not SQL-set-based.
