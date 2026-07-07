# 07 — Data, Database, API, and Network Plan

This plan is IA/UX-focused. Data/database/API/network changes are **minimal and explicitly scoped**. See `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`.

## Data ownership & lifecycle (unchanged)

| Entity | Owner store | Lifecycle |
|---|---|---|
| `projects` | D1 `ARCH_DB` (workspace-scoped) | created via `createProjectRecord`; status `ongoing` default (migration `0039`); soft transitions via `updateProjectStatus` |
| `estimates` | D1 (project-scoped, transitive workspace) | created via `createEstimateSheetDraft` / `createEstimate`; inherits `currency_code` from project |
| `estimate_tabs` | D1 | default "Main" tab auto-created |
| `estimate_templates*` | D1 (`estimate_templates`, `_nodes`, `_row_items`, migration `0024`) + 3 fixture fallbacks | inserted into estimates via `insertEstimateTemplateIntoEstimate` |
| Workspace | D1 (`ensureDefaultWorkspace`) | bootstrapped for new users; re-adopted for returning |

No lifecycle changes. No retention/deletion changes. No audit-history changes.

## Schema (no change)

- `ProjectRow`: `id, workspace_id, created_by, name, client_name, location, project_code, currency_code, metadata, status, created_at, updated_at`.
- `EstimateRow`: `id, project_id, created_by, name, sheet_code, notes, currency_code, metadata, project_budget, created_at, updated_at`. **No `status`, no `template` column.**
- No migration added/modified (DATA-01).
- **Precondition/risk:** base `projects`/`estimates` `CREATE TABLE` not in `migrations/` (pre-provisioned). Not changed here; flagged for awareness only.

## API / network (no new contracts)

- No new Server Actions, Route Handlers, or RPCs.
- Existing start mutations (all already auth + workspace-scoped):
  - `createProjectRecord(formData)` — `lib/projects/actions.ts:781`.
  - `createEstimateSheetDraft(projectId, input?)` — `lib/estimates/actions.ts:2336`.
  - `insertEstimateTemplateIntoEstimate(...)` / `insertEstimateTemplatesIntoEstimate(...)` — `lib/estimates/actions.ts:3143`/`:3185`.
  - `insertEstimateRowItemFromLibrary(...)` (via `useEstimateRowMutations`).
- Revalidation: `revalidatePath("/workshop/projects")`, `revalidateProjectEstimatePaths(projectId)` — unchanged.
- No new pagination, rate limits, retries, or idempotency keys. Existing optimistic + reconcile + rollback model preserved.

## Access-path matrix (no new sources)

| Source | Chosen API/repository | Runtime role | Authorization check | Schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Projects list | `listCurrentWorkspaceProjects` (`workspace-repository.ts:1453`) | Server Component read | workspace membership (default workspace) | `projects.workspace_id` indexed w/ status | `perf/projects-page-rpc-contract.test.ts` | app-path fallback in repo |
| Project dashboard counts | `countProjectEstimateSheetsForProject`, `listRecentProjectEstimateSheets` | Server Component read | `getCurrentWorkspaceProject` | project→workspace | existing tests | n/a |
| Estimates list | `listProjectEstimates(projectId)` (`:3010`) | Server Component read | `getCurrentWorkspaceProject` | estimate→project→workspace | existing tests | n/a |
| Estimate create | `createEstimateSheetDraft` | Server Action (client-invoked) | `assertCanEditProject` | same | `estimate-sheet-create-empty-tree.test` | rollback optimistic row |
| Template insert | `insertEstimateTemplateIntoEstimate` | Server Action | `assertCanEditProject` | template→workspace | `estimate-mutations.test.ts` | rollback |

No P0 access-path defect: every chosen path already reads/writes through the current D1 app-authz checks.

## Query-count / cost posture (no regression)

- Empty states must not add server round-trips (ARCH-01). Verified by `perf/projects-page-rpc-contract.test.ts`.
- Estimates empty state derives from the already-fetched `estimates` array — no extra query.
- Dashboard nudge derives from `estimateCount` (already fetched) — no extra query.

## Concurrency, transactions, idempotency (unchanged)

- `createProjectRecord` / `createEstimateSheetDraft` are single-row inserts within the existing D1 transaction model; no new concurrency surface.
- Optimistic UI dedupes by `clientId` (projects) and `pendingStatus` (estimates); rollback on failure.
- Template/row inserts use existing revision-conflict guards (`ESTIMATE_ROW_REVISION_CONFLICT_CODE`).

## Rollback / recovery (data)

- No data migration → no data rollback needed for this plan.
- UI rollback = revert the component/empty-state edits (git). No data repair.
