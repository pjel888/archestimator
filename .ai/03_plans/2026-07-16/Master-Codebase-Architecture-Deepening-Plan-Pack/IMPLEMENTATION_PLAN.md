# Master Codebase Architecture Deepening Implementation Plan

## 1. Execution Contract

1. Start with `bun run supermemory:ensure`, the `FAST PATH` block in `.ai/10_state/current-state.md`, and `git status --short --branch`.
2. Read this file, `plan-pack.json`, and the unit's owned paths immediately before editing.
3. Execute only `next_unit`. The advertised ready slice is fallback inventory, not permission to skip. If `next_unit` is stale or blocked, record the evidence and explicitly update `next_unit` in `plan-pack.json` and `LOOP_LEDGER.md` before editing another ready unit.
4. Run this architecture program in a standalone write window with no other write-capable codebase agent active. Do not overwrite unfamiliar changes. A dirty owned path or newly active writer pauses the affected unit and requires a refreshed baseline; it is not permission to stash, reset, revert, or fork a competing implementation.
5. Use GitNexus impact before editing each named symbol. Treat the current graph as directional until its index is current; verify every decision in source.
6. Keep domain behavior in one deep implementation. Do not introduce generic factories, compatibility re-exports, or pass-through wrappers.
7. Product tests are user-controlled. Commands below are `TEST_PROPOSAL` only. A unit that requires test-source edits stays `PLANNED` until those exact edits are explicitly authorized; import maintenance never authorizes test execution or unrelated assertion expansion. Static source, scoped lint/type evidence, `git diff --check`, and plan/manifest validators are allowed.
8. Record one sanitized receipt per unit under this pack's future `evidence/` directory, then update the manifest/ledger without claiming unrun tests.
9. When a criterion says static evidence is insufficient, implementation without an authorized fresh test receipt is source-complete but not verified: keep the unit `IN_PROGRESS` and its criterion `FAIL`. Do not promote the unit or package from static validators alone.

## 2. Unit DAG

```text
UNIT-001  component category resolver                 READY   ┐
UNIT-002  internal Bearer boundary                    READY   ├─ SLICE-001
UNIT-005  component-library D1 mutation modules       READY   ┘

UNIT-003  Estimate-tree D1 read module                PLANNED (test-source edit authorization)
UNIT-004  component-folder move coordinator           PLANNED (test-source edit authorization)
UNIT-006  durable public rate-limit modules           PLANNED (test-source edit authorization)
UNIT-007  typed Estimate D1 intent modules             PLANNED (test-source edit authorization)
UNIT-008  provider-owned Estimate row editing          PLANNED (test-source edit authorization)
UNIT-009  per-asset upload-removal results             PLANNED (test-source edit authorization; core correctness)
```

`UNIT-001`, `UNIT-002`, and `UNIT-005` are mutually independent and are the only advertised ready units. No technical dependency edge is invented between the planned units; their remaining gates are exact test-source authorization boundaries. `UNIT-001` remains the sole exact start.

## 3. Receipt Contract

Each unit receipt records:

- unit ID and source revision;
- pre-edit scoped status/diff hashes;
- exact changed, added, and deleted paths;
- named symbols moved or retired;
- static commands actually run and their exit codes;
- product-test proposal status (`NOT_AUTHORIZED`, `AUTHORIZED_NOT_RUN`, or an actual receipt if separately authorized);
- no-residual searches;
- GitNexus directional impact and post-change `detect_changes` output;
- recovery applied, if any; and
- resulting next unit/status.

Never store secrets, authorization headers, private URLs, raw provider output, or customer data.

## UNIT-001 — Compile the Component Category Resolver Once

**Status:** `READY`
**Depends on:** none  
**Requirement:** `REQ-001`  
**Risk:** `RISK-001`

### Owned paths

- `src/lib/component-library/category-folders.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/ai/package-builder/read-tools.ts`
- `src/lib/ai/package-builder/apply.ts`

### Exact change

1. Add `createComponentCategoryResolver(folders)` to `category-folders.ts`. It builds one `Map<string, ComponentCategoryFolder>` and one duplicate-ID validity flag, then returns a resolver `(folderId, fallbackCategory?) => ResolvedComponentCategory`.
2. Move the existing synthetic-folder, missing-leaf, duplicate-ID, cross-workspace, missing-parent, cycle, fallback-label, path-label, and path-ID behavior into the returned resolver without changing outputs.
3. Keep `resolveComponentCategory(folders, folderId, fallbackCategory)` as the isolated-call convenience wrapper; it delegates to `createComponentCategoryResolver(folders)` and invokes the result once.
4. Change `normalizeComponentLibraryItem` to accept the compiled resolver instead of the folder array. Create one resolver before the `itemRows.map` call.
5. In both package-builder files, create one resolver immediately after the folder query and reuse it inside every item/component loop. Do not add caching beyond the current in-memory dataset lifetime.

### Acceptance evidence

- `rg -n "new Map\(folders|resolveComponentCategory\(folders"` shows only the convenience wrapper or isolated non-batch use.
- Batch loops construct exactly one resolver per loaded folder set.
- Output types and fallback strings are unchanged.
- Changed-file static type/lint evidence is recorded if available without invoking a build or product-test gate.
- `git diff --check` is clean for the four owned paths.

### Test decision

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/component-category-folders.test.ts`. It is not authorized by this plan-pack task and must not run unless the implementation task grants test scope.

### Recovery

Revert only the four owned-path edits. Because the public convenience signature remains unchanged, recovery restores the prior per-call construction without data migration or compatibility work.

### Completion and next state

After the source change and static checks, keep `UNIT-001` `IN_PROGRESS` until an explicitly authorized fresh `TEST-001` receipt proves `AC-001`; its criterion states static evidence is insufficient. Once verified, set `next_unit` to `UNIT-002` if it remains eligible. If it is stale or blocked, explicitly select another advertised ready unit in the manifest and ledger before editing.

## UNIT-002 — Centralize Production Upload Bearer Authorization

**Status:** `READY`  
**Depends on:** none  
**Requirement:** `SEC-001` (auxiliary)  
**Risk:** `RISK-002`

### Owned paths

- new `src/lib/security/bearer-auth.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`

### Exact change

1. Create a server-only helper exporting `authorizeBearerRequest(request, configuredSecrets)` and the discriminated result `authorized | missing-secret | invalid-secret`.
2. Trim, remove empty values, and deduplicate configured secrets inside the helper.
3. Preserve the current exact `Bearer ` scheme and header shape. Hash the supplied token and every configured secret to equal-length SHA-256 buffers, compare with `timingSafeEqual`, and complete all configured comparisons before returning.
4. Replace each route's local `read*Secrets`/`isAuthorized` pair with the shared result while preserving its environment variables, `503` configuration message, `401` unauthorized message, no-store headers, and method behavior.
5. Do not migrate proof routers, change secret names, log credential material, or change authentication policy in this unit.

### Acceptance evidence

- The three route-local `isAuthorized` functions are absent.
- The helper has no secret/header logging and returns `missing-secret` separately from `invalid-secret`.
- Route response messages/status codes are source-identical for missing and invalid credentials.
- `git diff --check` is clean for the four owned paths.

### Test decision

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/upload-cleanup-route.test.ts tests/vitest/upload-scan-route.test.ts tests/vitest/upload-runtime-route.test.ts`. The critical invariant is unchanged route denial/configuration behavior; cheaper source inspection cannot prove every response branch.

### Recovery

Restore the three local helpers and delete the new shared file. No stored credential or provider state changes.

### Completion and next state

This auxiliary unit does not block core architecture completion. After the source change and static checks, keep it `IN_PROGRESS` until an explicitly authorized fresh `TEST-002` receipt proves `AC-002`. If it is deferred instead, record the accepted risk. In either case, advance only after the manifest/ledger explicitly records the next advertised ready unit.

## UNIT-009 — Make Upload Removal Per-Asset and Truthful

**Status:** `PLANNED`
**Depends on:** none  
**Requirement:** `DATA-001` (core correctness)
**Risk:** `RISK-009`

### Test-source authorization gate

The existing `tests/vitest/upload-removal-claims.test.ts` asserts the current collapsed result/status contract and must change with the production result type. Promote this unit only when the implementation task explicitly authorizes that one-file contract update. The authorization does not allow route-test expansion or test execution.

### Owned paths

- `src/lib/uploads/removal-claims.ts`
- `src/app/api/projects/images/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/images/route.ts`
- `tests/vitest/upload-removal-claims.test.ts` (result-contract update only, under explicit test-source authorization)

### Exact change

1. Replace the whole-matched-set reference guard with a correlated per-asset guard: each candidate row is claimable only when that row is unreferenced. Preserve the existing workspace, actor, surface, bucket, status, purge-state, delay, claim-ID, and cleanup semantics.
2. Replace the collapsed result with exact sets: `claimedAssetIds`/`claimedPaths`, `blockedAssetIds`/`blockedPaths`, and `alreadyRemovedAssetIds`/`alreadyRemovedPaths`. Keep `not_found` only for zero matched assets.
3. Derive one deterministic status from those sets: `claimed` when at least one asset is claimed and no blocked/already-removed asset remains; `partial` when at least one is claimed and another is blocked or already removed; `referenced` when none is claimed and at least one is blocked; `already_claimed` when matched assets are already removed and none is claimed or blocked; otherwise `not_found`.
4. After the atomic claim, classify only the unmatched rows in one diagnostic query. Do not report a path in more than one result set.
5. In all three route handlers, return `409` only for a zero-claim `referenced` result and `404` only for `not_found`. For `claimed`, `partial`, or `already_claimed`, return `200` with `{ removedPaths: claimedPaths, blockedPaths, alreadyRemovedPaths }`; never substitute the requested paths for `removedPaths`.
6. Keep the cleanup job's final reference re-check unchanged. Do not add the predecessor's speculative composite index or reference-tracking table in this unit.

### Acceptance evidence

- The claim `UPDATE` correlates the reference predicate to the row being updated; no referenced candidate blocks an unrelated free candidate.
- Mixed input produces disjoint claimed, blocked, and already-removed path sets with a deterministic `partial` status.
- All three routes derive `removedPaths` only from `claimedPaths`.
- The result contract and every route branch use the same status/set vocabulary.
- No migration, index, cleanup-job, or storage deletion behavior changes.
- `git diff --check` is clean for the five owned paths when the gated test-source edit is authorized.

### Test decision

`TEST_PROPOSAL`: under separate edit authorization, update `tests/vitest/upload-removal-claims.test.ts` for mixed `[referenced, free, already removed]`, all-referenced, all-free, and zero-match inputs. Run that file only under separate execution authorization. Route response assertions are outside this unit unless separately authorized.

### Recovery

Restore the previous claim result type, whole-set query, and three route response branches together. No migration or stored-data rollback is involved; already-created removal claims retain their existing cleanup delay and final reference re-check.

### Completion and next state

This core correctness unit blocks architecture completion. After the source change and static checks, keep it `IN_PROGRESS` until an explicitly authorized fresh `TEST-009` receipt proves mixed-batch classification and truthful route results. It cannot be deferred while preserving the package outcome.

## UNIT-003 — Extract the Concrete Estimate-Tree D1 Read Module

**Status:** `PLANNED`
**Depends on:** none  
**Requirement:** `REQ-002`  
**Risk:** `RISK-003`

### Authorization gate

The extraction requires import-only maintenance in two focused tests and source-contract maintenance in two more. The current plan authoring task did not authorize test-source edits. Promote this unit to `READY` only when the implementation task explicitly authorizes those four narrow maintenance edits; that authorization does not imply permission to run tests or expand assertions.

### Owned paths

- new `src/lib/estimates/estimate-tree-read-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/workspace-repository-estimate-tree.test.ts` (import retarget only)
- `tests/vitest/proposal-export-tab-grouping.test.ts` (import retarget only)
- `tests/vitest/estimate-tabs-domain.test.ts` (source-contract retarget only)
- `tests/vitest/live-estimate-node-route.test.ts` (source-contract retarget only)

### Exact change

1. Create a concrete D1 read module. It owns the current Estimate tab/node/row query helpers, load-limit normalization, legacy-tab normalization, optional adjustment read, tree/subtree construction, and batched tab grouping.
2. Export only the D1-level operations required by `workspace-repository.ts` plus the pure `buildEstimateTree` and `groupEstimateTabTrees` utilities used directly by focused consumers/tests.
3. Keep current workspace/project lookup, current-user context, edit/access decisions, and public route orchestration in `workspace-repository.ts`. The new module must not import `workspace-repository.ts`.
4. Under explicit test-source edit authorization, retarget the two pure-builder/type imports to the new module and retarget the two source-contract assertions to the new ownership boundary. Do not expand test behavior or re-export the builders from `workspace-repository.ts`.
5. Preserve all public orchestration signatures and legacy-fallback conditions. Do not remove `clearEstimateRouteContextProcessCache` or `readEstimateNodeRouteContextD1FastPath` in this unit; their current source-contract tests make that a separate cleanup decision.
6. Do not change query columns, ordering, limits, access checks, trace labels, tab fallback semantics, selected-node behavior, or row-total calculations.

### Acceptance evidence

- The new module has no import from `workspace-repository.ts`.
- `workspace-repository.ts` no longer owns the moved D1 SQL/build implementation.
- `rg` finds no import of `buildEstimateTree` or `groupEstimateTabTrees` from `workspace-repository.ts`.
- Public orchestration exports and their caller set are unchanged.
- GitNexus impact is rerun on `getEstimateTabTree` and `groupEstimateTabTrees`; directional HIGH/CRITICAL effects are reconciled in the receipt.
- `git diff --check` is clean for owned paths.

### Test decision

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/proposal-export-tab-grouping.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/live-estimate-node-route.test.ts`. The critical invariant is byte-equivalent tree/tab output and legacy fallback; import/type inspection alone cannot prove it.

### Recovery

Move the extracted implementation back into `workspace-repository.ts` and restore direct imports. No schema, migration, or data change is involved.

### Completion and next state

After extraction and static checks, keep the unit `IN_PROGRESS` until an explicitly authorized fresh `TEST-003` receipt proves tree/tab/legacy-output parity. Record the separate test-source authorization receipt and refresh the package baseline. The package remains `CONDITIONALLY_READY` until every planned unit's test-source gate is truthfully resolved.

## UNIT-004 — Deepen the Component-Folder Move Coordinator

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-003`  
**Risk:** `RISK-004`

### Pre-edit exclusivity check

The earlier Component/Workshop Library owner is finished and both adapters are clean at baseline. Immediately before editing, confirm the standalone write window, re-read both adapters, and refresh scoped hashes. New contention or behavior drift pauses and invalidates only this unit.

### Test-source authorization gate

Retargeting `tests/vitest/per-item-mutation-queue.test.ts` is required source maintenance, but the current plan-only task did not authorize test-source edits. Promote this unit only when the implementation task explicitly authorizes that one-file contract/import retarget. Test-source edit authorization does not authorize executing the test or expanding its assertions.

### Owned paths

- replace `src/components/workshop/component-library/per-item-mutation-queue.ts` with `component-folder-move-coordinator.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `tests/vitest/per-item-mutation-queue.test.ts` (contract/import retarget only, under explicit test-source authorization)

### Exact change

1. Replace the promise-only queue with `createComponentFolderMoveCoordinator()`.
2. The coordinator owns, per component ID: serialization, monotonic generation, last confirmed folder, latest-intent detection, stale-success classification, stale-failure classification, and state cleanup.
3. Its `move` call accepts `componentId`, `currentConfirmedFolderId`, `targetFolderId`, and a persistence callback. It returns a discriminated outcome containing attempted target, authoritative confirmed target, and whether the caller should keep or roll back its optimistic view.
4. Seed confirmed state on the first pending move only. A successful stale generation advances confirmed state but cannot overwrite the UI's newer optimistic target. Only the newest failed generation requests rollback to the authoritative confirmed target.
5. Each adapter keeps local cache writes, selection, pending display, toast wording, and permission handling. Delete its generation/confirmed/queue refs and duplicated stale-result branches.

### Acceptance evidence

- Both adapters call the same coordinator and contain no local generation or confirmed-folder maps.
- The coordinator contains no React, toast, cache, folder-tree, or server-action imports.
- Latest intent survives an older success; newest failure rolls back; an older failure does not roll back a newer intent.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: after separate test-source edit authorization retargets `tests/vitest/per-item-mutation-queue.test.ts`, run that one focused file only if test execution is also explicitly authorized. No browser/render suite is proposed.

### Recovery

Restore the two adapter-local protocols and the original queue. The action API and stored data are unchanged.

### Completion and next state

After both real adapters use the coordinator and static checks pass, keep the unit `IN_PROGRESS` until an explicitly authorized fresh `TEST-004` receipt proves the racing latest-intent invariant. Do not expand this unit into folder CRUD, archive dialogs, or a universal mutation hook.

## UNIT-005 — Extract Concrete Component-Library D1 Mutation Modules

**Status:** `READY`
**Depends on:** none  
**Requirement:** `REQ-004`  
**Risk:** `RISK-005`

### Pre-edit exclusivity check

The Component Variant/Workshop Library write-path owner is finished and `actions.ts` is clean at baseline. Immediately before editing, confirm the standalone write window, refresh the action inventory, and rerun GitNexus impact on the named entrypoints. New contention or material source drift pauses and invalidates this unit.

### Owned paths

- new `src/lib/component-library/component-mutation-d1.ts`
- new `src/lib/component-library/folder-mutation-d1.ts`
- `src/lib/component-library/actions.ts`

Existing imported helper/type modules are read-only inputs to this unit. If the move proves that an existing helper must change, stop before editing it, add that exact path and rationale to this pack, refresh hashes, and revalidate the unit; “direct server-side imports required” is not an open-ended ownership grant.

### Exact change

1. `component-mutation-d1.ts` owns component, variant, price-option, attachment, version, linked-row fanout, receipt, and authoritative-return D1 statement graphs for create, update, duplicate, archive, restore, and permanent delete.
2. `folder-mutation-d1.ts` owns folder create, rename, delete, reorder, and component-to-folder move D1 statement graphs and authoritative folder/component assignment returns.
3. Both modules are concrete functions accepting the current D1 database type. Do not add repository interfaces, factories, classes, dependency containers, or compatibility re-exports.
4. Move SQL and atomic statement ordering first without semantic change. Keep auth, permission checks, input parsing, public error translation, action names, telemetry initiation, and revalidation in `actions.ts`.
5. Keep transaction-coupled history/receipts/fanout inside the D1 modules. Do not split them into post-write callbacks.
6. Keep existing template mutation modules untouched. Do not combine the two new modules into another large `write-repository.ts`.
7. After all calls move, delete the relocated private SQL planners/helpers from `actions.ts`; no pass-through wrapper may remain there.

### Acceptance evidence

- `actions.ts` contains no raw D1 statement graph for the moved operations.
- Every server action still owns auth, parsing, public errors, and revalidation.
- Linked-row propagation, revision/history, attachments, receipts, and authoritative return rows remain in the same atomic boundary as their primary mutation.
- No new generic interface/factory exists.
- GitNexus impacts for `createCostLibraryComponent` and update/delete entrypoints reconcile all callers.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/component-library-update-atomicity.test.ts tests/vitest/component-library-folder-actions.test.ts tests/vitest/component-library-actions-revalidation.test.ts`. The critical invariant is atomic write/fanout plus unchanged action revalidation; source relocation evidence is insufficient.

### Recovery

Move the D1 implementations back into `actions.ts` and delete the two new modules. Do not create adapters to preserve a partially migrated state.

### Completion and next state

The source move is complete only when both aggregate modules are deep and all relocated helpers are deleted from `actions.ts`. A partial “new module plus old implementation” state remains `IN_PROGRESS`. Because `AC-005` says static relocation evidence is insufficient, the completed source move remains `IN_PROGRESS` until an explicitly authorized fresh `TEST-005` receipt proves atomic fanout/revalidation parity; only then may it become `VERIFIED`.

## UNIT-006 — Extract Durable Public Rate-Limit Infrastructure

**Status:** `PLANNED`
**Depends on:** none  
**Requirement:** `SEC-002`  
**Risk:** `RISK-006`

### Pre-edit coordination check

No security, Client Portal, Publisher, or compliance contention exists at the current freeze, and the named owned paths are clean. Immediately before editing, confirm the standalone write window and recheck consumers and owned-path status. New contention or behavior drift requires a refreshed unit baseline.

### Test-source authorization gate

Deleting the old `public-repository.ts` rate-limit exports and moving route/handler imports requires the exact mock/import/source-contract retargets listed below. Promote this unit only when those maintenance edits are explicitly authorized. That authorization does not permit test execution or assertion expansion.

### Owned paths

- new `src/lib/security/durable-rate-limit-d1.ts`
- new `src/lib/security/durable-rate-limits.ts`
- new `src/lib/publication/public-rate-limits.ts`
- new `src/lib/client-portal/public-rate-limits.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/d1-store.ts`
- production import retargets:
  - `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
  - `src/app/api/share/[token]/activity/route.ts`
  - `src/app/api/share/[token]/assets/[assetId]/route.ts`
  - `src/app/api/share/[token]/comment/route.ts`
  - `src/app/api/share/[token]/decision/route.ts`
  - `src/app/api/share/[token]/password/route.ts`
  - `src/app/api/share/[token]/route.ts`
  - `src/app/api/share/[token]/session/route.ts`
  - `src/app/api/share/[token]/unsubscribe/route.ts`
  - `src/app/share/[token]/page.tsx`
  - `src/lib/client-portal/public-decision-handlers.ts`
  - `src/lib/client-portal/public-password-handler.ts`
  - `src/lib/client-portal/public-route-handlers.ts`
  - `src/lib/client-portal/public-session-handler.ts`
  - `src/lib/client-portal/public-thread-handlers.ts`
- test-source maintenance, under explicit authorization:
  - `tests/vitest/client-portal-public-rate-limit.test.ts`
  - `tests/vitest/project-publication-activity.test.tsx`
  - `tests/vitest/project-publication-comments.test.tsx`
  - `tests/vitest/project-publication-decision.test.tsx`
  - `tests/vitest/project-publication-page.test.tsx`
  - `tests/vitest/project-publication-password-lockout-route.test.ts`
  - `tests/vitest/project-publication-public-repository.test.ts`
  - `tests/vitest/project-publication-route.test.ts`
  - `tests/vitest/proposal-export-route-workbook.test.ts`
  - `tests/vitest/proposal-export-route.test.ts`
  - `tests/vitest/share-unsubscribe-interstitial.test.ts`
  - `tests/vitest/share/share-page-get-routes-contract.test.ts`

### Exact change

1. Move rate-limit table insert/count/delete/cleanup into `durable-rate-limit-d1.ts` with the current SQL, indexes, TTL fields, and active-at behavior unchanged.
2. Move key hashing, cleanup debounce, record-and-check, existing-check, clear, window evaluation, and result types into `durable-rate-limits.ts`.
3. Move project-publication, proposal-export, and shared-link policy wrappers into `publication/public-rate-limits.ts`.
4. Move Client Portal policy wrappers into `client-portal/public-rate-limits.ts`.
5. Update all direct callers to the owning policy module; Client Portal must no longer import a rate limiter from `publication/public-repository.ts`.
6. Remove the relocated rate-limit methods from `publication/d1-store.ts` and the engine/policy block from `publication/public-repository.ts` after zero references remain.
7. Preserve scope strings, key parts, hashes, metadata, thresholds, messages, cleanup cadence, record-before-count versus check-existing semantics, password-success clearing, status codes, and retry-after behavior exactly.
8. Do not migrate or unify invite, AI, privacy, admin, upload-admission, or Estimate rate-limit algorithms in this unit.

### Acceptance evidence

- Client Portal and publication policy imports are domain-owned.
- The shared engine has no publication, Client Portal, route, password, cookie, or UI dependency.
- Old rate-limit implementation blocks are absent from `public-repository.ts` and `publication/d1-store.ts`.
- A source-level before/after policy matrix shows every scope, key, window, threshold, message, and consumption mode unchanged.
- GitNexus directional CRITICAL impact is reconciled for all direct callers.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: after separately authorized mock/import retargets, run `bunx vitest run tests/vitest/client-portal-public-rate-limit.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts` only under explicit execution authorization. The critical invariant is identical durable lockout and clearing behavior; static import proof cannot establish it.

### Recovery

Move the engine, store methods, and policy wrappers back to their original modules and restore imports. No migration or table change is part of this unit.

### Completion and next state

After the original blocks are deleted and static checks pass, keep the unit `IN_PROGRESS` until an explicitly authorized fresh `TEST-006` receipt proves lockout/count/clear parity. Advance only to the manifest's already-recorded `next_unit`. Semantic convergence with other domain limiters requires a new measured unit, not follow-on improvisation here.

## UNIT-007 — Replace the Stringly Estimate D1 Façade with Typed Intent Modules

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-005`  
**Risk:** `RISK-007`

### Pre-edit exclusivity check

The Estimate/Component Variant and Admin programs are terminal, and every owned production path is clean at baseline. Immediately before editing, confirm the standalone write window, re-read the final projection/receipt contracts and Admin pointer, refresh GitNexus impact, and freeze new scoped hashes. New contention or material drift pauses and invalidates this unit.

### Test-source authorization gate

Deleting `d1-action-client.ts` requires the exact import/mock/source-contract retargets listed below. Promote this unit only when the implementation task explicitly authorizes those maintenance edits. Test-source authorization does not authorize execution or unrelated assertion expansion.

### Admin map scope boundary

`src/lib/admin/estimate-system-knowledge-data.ts` is uncontested at baseline, and its `sources.persistence` entry points at the façade this unit deletes. Change only that entry to `src/lib/estimates/d1-intents/database.ts` and update only its note to say that the file owns shared execution primitives while sibling typed-intent modules own guarded mutations, history, cascades, and template materialization. Do not change any node, relation, operation, page, feature, or other source entry.

### Owned paths

- new concrete modules under `src/lib/estimates/d1-intents/`:
  - `database.ts`
  - `access.ts`
  - `estimate-records.ts`
  - `tabs.ts`
  - `nodes.ts`
  - `rows.ts`
  - `templates.ts`
  - `bulk-sheets.ts`
  - `component-impact.ts`
  - `history-events.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/reusable-sources/actions.ts`
- `src/lib/cloudflare/estimate-history-proof-router.ts`
- `src/lib/admin/estimate-system-knowledge-data.ts` — exact `sources.persistence` entry retarget only
- delete `src/lib/estimates/d1-action-client.ts` after zero callers remain
- test-source maintenance, under explicit authorization:
  - `tests/vitest/activity-durable-write.test.ts`
  - `tests/vitest/activity-history-lifecycle-contract.test.ts`
  - `tests/vitest/activity-variant-propagation.test.ts`
  - `tests/vitest/d1-access-created-by.test.ts`
  - `tests/vitest/estimate-action-d1-library-source-projection.test.ts`
  - `tests/vitest/estimate-actions-d1-reorder-history.test.ts`
  - `tests/vitest/estimate-actions-d1-row-restore-history.test.ts`
  - `tests/vitest/estimate-area-activation-batch.test.ts`
  - `tests/vitest/estimate-insert-target-authz.test.tsx`
  - `tests/vitest/estimate-node-reorder-action.test.ts`
  - `tests/vitest/estimate-revision-fact-producers.test.ts`
  - `tests/vitest/estimate-row-activation-batch.test.ts`
  - `tests/vitest/estimate-row-atomic-d1-contracts.test.ts`
  - `tests/vitest/estimate-sheet-actions-authz.test.ts`
  - `tests/vitest/estimate-sheet-create-empty-tree.test.ts`
  - `tests/vitest/estimate-sheet-version-control-actions.test.ts`
  - `tests/vitest/estimate-template-trusted-insert.test.ts`
  - `tests/vitest/mass-deletion-contract.test.ts`
  - `tests/vitest/upload-domain-contracts.test.ts`

### Exact change

1. Create concrete, intent-named functions grouped by the ten operation families above. Functions accept the current D1 database/actor inputs and return typed domain results; do not create interfaces or classes for a hypothetical second store.
2. `database.ts` owns only shared D1 execution/row-normalization primitives used by at least two family modules. It may not expose `.from`, table strings, projection strings, or action-name dispatch.
3. `access.ts` owns edit/project checks, image-asset validation, and activity-retention metrics. `estimate-records.ts` owns estimate create/duplicate/details. The other modules own their named mutation families, including their transaction-coupled history, publication revision, receipts, guards, and authoritative return rows.

The dispatcher-to-export mapping is fixed; the executor may use private helpers inside each target module but may not rename, regroup, or leave any string-dispatched compatibility entry:

| Retired action name | Target exported function |
|---|---|
| `can_edit_estimate` | `access.ts:canEditEstimate` |
| `can_edit_project` | `access.ts:canEditProject` |
| `validate_estimate_row_image_asset` | `access.ts:validateEstimateRowImageAsset` |
| `get_estimate_activity_retention_metrics` | `access.ts:getEstimateActivityRetentionMetrics` |
| `preview_estimate_component_edit_impact` | `component-impact.ts:previewEstimateComponentEditImpact` |
| `update_estimate_details_with_history` | `estimate-records.ts:updateEstimateDetailsWithHistory` |
| `update_estimate_sheet_adjustment_with_history` | `estimate-records.ts:updateEstimateSheetAdjustmentWithHistory` |
| `create_estimate_tab_with_history` | `tabs.ts:createEstimateTabWithHistory` |
| `rename_estimate_tab_with_history` | `tabs.ts:renameEstimateTabWithHistory` |
| `reorder_estimate_tabs_with_history` | `tabs.ts:reorderEstimateTabsWithHistory` |
| `duplicate_estimate_tab_with_history` | `tabs.ts:duplicateEstimateTabWithHistory` |
| `archive_estimate_tab_with_history` | `tabs.ts:archiveEstimateTabWithHistory` |
| `delete_estimate_tab_with_history` | `tabs.ts:deleteEstimateTabWithHistory` |
| `create_estimate_node_with_history` | `nodes.ts:createEstimateNodeWithHistory` |
| `rename_estimate_node_with_history` | `nodes.ts:renameEstimateNodeWithHistory` |
| `reorder_estimate_nodes_with_history` | `nodes.ts:reorderEstimateNodesWithHistory` |
| `delete_estimate_node_with_history` and `delete_estimate_nodes_bulk_with_history` | `nodes.ts:deleteEstimateNodesWithHistory` |
| `restore_deleted_estimate_nodes_with_history` | `nodes.ts:restoreDeletedEstimateNodesWithHistory` |
| `insert_estimate_row_item_with_history` | `rows.ts:insertEstimateRowItemWithHistory` |
| `duplicate_estimate_row_item_with_history` | `rows.ts:duplicateEstimateRowItemWithHistory` |
| `update_estimate_row_item_with_history` | `rows.ts:updateEstimateRowItemWithHistory` |
| `replace_estimate_row_item_with_history` | `rows.ts:replaceEstimateRowItemWithHistory` |
| `delete_estimate_row_item_with_history` | `rows.ts:deleteEstimateRowItemWithHistory` |
| `delete_estimate_row_items_bulk_with_history` | `rows.ts:deleteEstimateRowItemsBulkWithHistory` |
| `move_estimate_row_item_with_history` | `rows.ts:moveEstimateRowItemWithHistory` |
| `move_estimate_row_component_with_history` | `rows.ts:moveEstimateRowComponentWithHistory` |
| `restore_deleted_estimate_rows_with_history` | `rows.ts:restoreDeletedEstimateRowsWithHistory` |
| `insert_estimate_template_into_estimate_with_history` | `templates.ts:insertEstimateTemplateIntoEstimateWithHistory` |
| `insert_estimate_templates_into_estimate_with_history` | `templates.ts:insertEstimateTemplatesIntoEstimateWithHistory` |
| `insert_estimate_template_node_into_estimate_with_history` | `templates.ts:insertEstimateTemplateNodeIntoEstimateWithHistory` |
| `preview_bulk_delete_estimate_sheets` | `bulk-sheets.ts:previewBulkDeleteEstimateSheets` |
| `execute_bulk_delete_estimate_sheets` | `bulk-sheets.ts:executeBulkDeleteEstimateSheets` |

The faux-query table families are fixed as well: `estimates` reads/inserts move to `estimate-records.ts`; `estimate_tabs` to `tabs.ts`; `estimate_nodes` to `nodes.ts`; `estimate_row_items` to `rows.ts`; `estimate_sheet_events` to `history-events.ts`; and the `cost_library_items`, price-option, and cost-entry reads used only to validate or materialize an Estimate row move to private `rows.ts` helpers. Cross-estimate component-impact projections belong only to `component-impact.ts`. Preserve the existing exported `prepareHistoryEventInsert`, `insertHistoryEvent`, and `runMutationWithHistory` names when moving them to `history-events.ts` so direct consumers do not invent another vocabulary.

4. Preserve `src/lib/estimates/mutation-receipts.ts` as the existing receipt module; import it where needed and do not duplicate it.
5. Migrate in four fixed checkpoints within this unit: access/record calls; tab/node/template/bulk-sheet calls; row/component/history calls; proof-router and reusable-source calls. At each checkpoint, delete the retired façade branch before proceeding.
6. Replace every `dataStore.from(...)`, `.select(...)`, `.call(...)`, `new EstimateActionsD1Client`, and `createEstimateActionsD1Client` use with a typed intent function.
7. Update the proof router to call the exact row-history intent directly with its injected D1/actor context.
8. After `database.ts` exists, retarget only `sources.persistence` in `src/lib/admin/estimate-system-knowledge-data.ts` from `d1-action-client.ts` to `src/lib/estimates/d1-intents/database.ts`; update only that entry's note with the sibling-module ownership wording above.
9. Delete `EstimateActionD1Query`, `EstimateActionsD1Client`, the string dispatcher, unused query-emulation types/helpers, and finally `d1-action-client.ts`. Do not leave a re-export or compatibility façade, and do not delete the file before the Admin map retarget lands.
10. Preserve all SQL, statement ordering, atomicity, revision/history/outbox/receipt behavior, projection fields, error names, actor rules, statement-limit assertions, and returned shapes during the move.

### Acceptance evidence

- `rg -n "EstimateActionD1Query|EstimateActionsD1Client|createEstimateActionsD1Client|dataStore\.(call|from|select)\(" src/lib/estimates/actions.ts src/lib/reusable-sources/actions.ts src/lib/estimates` is empty.
- `rg -n "EstimateActionsD1Client|(client|viewerClient|strangerClient)\.call\(" src/lib/cloudflare/estimate-history-proof-router.ts` is empty; unrelated uses such as `hasOwnProperty.call` are outside the façade residue check.
- `rg -n "d1-action-client|EstimateActionD1Query|EstimateActionsD1Client" src/lib/admin/estimate-system-knowledge-data.ts` is empty, the `sources.persistence` entry names the existing `src/lib/estimates/d1-intents/database.ts`, and its note names sibling typed-intent ownership.
- `git diff -- src/lib/admin/estimate-system-knowledge-data.ts` changes only the `sources.persistence` entry.
- `d1-action-client.ts` is absent and all new modules are concrete intent implementations.
- No module exposes raw table/action/projection strings as a public API.
- A before/after action inventory accounts for every old dispatcher name and direct-table operation exactly once.
- History, receipts, publication revision, guards, and primary writes remain transaction-coupled.
- GitNexus `detect_changes` matches the intended Estimate action/history/reusable-source flows only, subject to shared-worktree contamination being separately identified.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: after separately authorized import/mock/source-contract retargets, run exactly the nineteen listed files only under explicit execution authorization. They cover access, projections, statement batching, atomic row/history/revision behavior, templates, authz, mass deletion, and upload-domain coupling; no broader suite is proposed.

### Recovery

Recover at the last completed checkpoint by restoring the old family branch and its direct callers together. Do not keep both the old string dispatcher and new typed family active for the same operation.

### Completion and next state

After the old file and every shallow call surface are gone, the Admin map points to the new concrete persistence boundary, and static checks pass, keep the unit `IN_PROGRESS` until an explicitly authorized fresh `TEST-007` receipt proves the Estimate write/history/revision invariants. On verification, refresh `UNIT-008` against the stable client-callable Server Action adapters; it still requires its own exact test-source authorization.

## UNIT-008 — Deepen the Existing Estimate Row Editing Store

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-006`  
**Risk:** `RISK-008`

### Pre-edit exclusivity check

The previous Estimate-row owner is finished and every owned path is clean at baseline. Immediately before editing, confirm the standalone write window and refresh the prop/store, client-mutation-adapter, and duplicate-retry inventories. `UNIT-007` is useful prior context but is not a technical dependency because the client store must never import server-only D1 intents.

### Test-source authorization gate

`tests/vitest/estimate-sheet-unit-003-contracts.test.ts` asserts the comparator and reconciliation source shape that this unit deliberately changes. Promote this unit only when the implementation task explicitly authorizes retargeting that exact source-contract test to selector/store ownership. The edit may remove superseded source-string assertions and add equivalent intent/store assertions; it does not authorize executing tests or unrelated assertion expansion.

### Owned paths

- new `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts`
- `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-unit-003-contracts.test.ts` (comparator/reconciliation contract retarget only, under explicit test-source authorization)

### Exact change

1. Add four explicit discriminated commit intents in `row-commit-intent.ts`: ordinary row field update, selected-variant update, shared-component-definition update, and make-project-specific/detach update. The shared-definition intent is further discriminated by component kind/scope so it covers both linked Library component updates and shared project component/variant-definition updates.
2. Preserve routing exactly: quantity and selected variant are row-owned; shared component/variant-definition edits are shared. Route the shared-definition intent through the existing mutation path selected by component kind/scope, authoritative shared identity, and update capability.
3. Deepen the existing per-`EstimateSheetContent` vanilla-Zustand `EditableRowStore`. It owns editable values, dirty/clean state, pending/error status, current optimistic snapshot, authoritative snapshot, commit intent dispatch, and rollback for each row.
4. Inject client-safe commit adapters built from the existing client mutation hook and server-action callbacks when creating the per-sheet store. Those adapters may call server actions whose internals use `UNIT-007`, but no `"use client"` module may import a D1 intent, database handle, or actor-context function. Do not create a global store, a second context, or `RowMutationCoordinator`.
5. Keep insert, delete, restore, move, picker, promotion, and toast orchestration in `use-estimate-row-handlers` unless it is directly required by a row commit. Narrow the hook input only by removing state/handlers now owned by the store.
6. Make row table/branch components select their own row values/status/actions from the store. Retain structural node/row identity and layout props.
7. Remove handler prop drilling and memo-comparator clauses only after the corresponding selector owns the dependency. Do not delete comparators merely to reduce line count.
8. Preserve focus, keyboard commit, optimistic editing, failed persistence rollback, source snapshot, linked-row impact, and the current in-row editing model.
9. Preserve the landed duplicate-row convergence contract exactly: an ambiguous retry reuses the same mutation ID, source row revision, target node ID, active tab ID, and optimistic row; repeated activation cannot insert a second optimistic copy; explicit rejection releases the retained identity; and rollback removes only the failed duplicate without reverting an unrelated row edit.

### Acceptance evidence

- One per-sheet `EditableRowStore` is the only row-editing context/store.
- `row-table.tsx` contains no server-routing decision for the four commit intents.
- `use-estimate-row-handlers` no longer receives or forwards store-owned editable/dirty/status/commit dependencies.
- Branch props contain structural data and non-store operations only.
- The selected-variant/shared-definition rule and both Library/shared-project definition scopes are named in source and the unit receipt.
- Client modules import only client-safe action adapters; server-only D1 intent modules remain below the Server Action boundary.
- Any removed comparator entry has a corresponding selector subscription.
- The duplicate-row receipt accounts for retained mutation identity, source revision, target node/tab, optimistic item, ambiguity classification, explicit-release behavior, and isolated rollback.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: after the separately authorized source-contract retarget, run `tests/vitest/estimate-sheet-unit-003-contracts.test.ts` and `tests/vitest/estimate-sheet-library-insert.test.tsx` only under explicit execution authorization. Together they must cover the four commit intents, failed rollback, selector isolation, linked-versus-row-owned routing, and the retained duplicate retry/rollback invariants. A render-count probe remains proposal-only and cannot become a mandatory gate without explicit user authorization.

### Recovery

Restore the prior hook/table routing and the earlier editable-row store together. Do not leave two stores or dual commit paths active.

### Completion and next state

After the source change and static checks, keep the unit `IN_PROGRESS` until an explicitly authorized fresh `TEST-008` receipt proves the interaction and duplicate-retry invariants. After verification, reconcile all unit receipts, close or accept residual risks, rerun static plan/manifest/reference/hash checks, and promote the package only if every core requirement has a verified unit. Archive the master only after truthful `COMPLETE / ACHIEVED` status.

## 4. Closeout Verification

The implementation closeout must prove:

- every core unit is `VERIFIED` and every auxiliary outcome is explicit;
- every `MVP_CRITICAL_INVARIANT` criterion has an explicitly authorized fresh test receipt; source-complete units with unrun proposals remain `IN_PROGRESS`/`FAIL`;
- all old imports/classes/string dispatchers/pass-through seams named by the units are absent;
- no concurrent unrelated changes entered a unit receipt;
- no mandatory test/build/browser/hosted claim was made without authorization and a fresh receipt;
- `bun run validate:planning-prompts` and `bun run validate:plan-pack -- <this-pack>` pass;
- `git diff --check` passes for the implementation scope; and
- GitNexus `detect_changes` plus scoped source diff agree on the affected execution flows.
