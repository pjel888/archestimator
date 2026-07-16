# Master Codebase Architecture Deepening Implementation Plan

## 1. Execution Contract

1. Start with `bun run supermemory:ensure`, the `FAST PATH` block in `.ai/10_state/current-state.md`, and `git status --short --branch`.
2. Read this file, `plan-pack.json`, and the unit's owned paths immediately before editing.
3. Execute only `next_unit` or another unit in the advertised ready slice whose owned paths are still clean and unleased.
4. Do not overwrite unfamiliar changes. A dirty owned path means refresh the unit baseline and coordinate a single writer; it is not permission to stash, reset, revert, or fork a competing implementation.
5. Use GitNexus impact before editing each named symbol. Treat the current graph as directional until its index is current; verify every decision in source.
6. Keep domain behavior in one deep implementation. Do not introduce generic factories, compatibility re-exports, or pass-through wrappers.
7. Product tests are user-controlled. Commands below are `TEST_PROPOSAL` only. Static source, scoped lint/type evidence, `git diff --check`, and plan/manifest validators are allowed.
8. Record one sanitized receipt per unit under this pack's future `evidence/` directory, then update the manifest/ledger without claiming unrun tests.

## 2. Unit DAG

```text
UNIT-001  component category resolver                 READY   ┐
UNIT-002  internal Bearer boundary                    READY   ├─ SLICE-001
UNIT-003  Estimate-tree D1 read module                READY   ┘

UNIT-004  component-folder move coordinator           PLANNED (component UI lease)
UNIT-005  component-library D1 mutation modules       PLANNED (component action lease)
UNIT-006  durable public rate-limit modules           PLANNED (security single-writer lease)
UNIT-007  typed Estimate D1 intent modules             PLANNED (active Estimate lease)
UNIT-008  provider-owned Estimate row editing          PLANNED (depends on UNIT-007)
```

`UNIT-001`, `UNIT-002`, and `UNIT-003` are mutually independent. `UNIT-008` depends on `UNIT-007`; all other relationships are lease scheduling rather than invented technical dependencies.

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

Mark `UNIT-001` `VERIFIED` only from fresh source/static evidence and any separately authorized test receipt. Set `next_unit` to `UNIT-002` if it remains clean; otherwise `UNIT-003` may become next within `SLICE-001`.

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

This auxiliary unit does not block core architecture completion. If verified, advance to the remaining clean ready unit. If deferred, record the reason and keep core package state truthful.

## UNIT-003 — Extract the Concrete Estimate-Tree D1 Read Module

**Status:** `READY`  
**Depends on:** none  
**Requirement:** `REQ-002`  
**Risk:** `RISK-003`

### Owned paths

- new `src/lib/estimates/estimate-tree-read-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- direct non-workspace imports of `buildEstimateTree`, `groupEstimateTabTrees`, and their row/node query types

### Exact change

1. Create a concrete D1 read module. It owns the current Estimate tab/node/row query helpers, load-limit normalization, legacy-tab normalization, optional adjustment read, tree/subtree construction, and batched tab grouping.
2. Export only the D1-level operations required by `workspace-repository.ts` plus the pure `buildEstimateTree` and `groupEstimateTabTrees` utilities used directly by focused consumers/tests.
3. Keep current workspace/project lookup, current-user context, edit/access decisions, and public route orchestration in `workspace-repository.ts`. The new module must not import `workspace-repository.ts`.
4. Update all direct imports of the two pure builders/types to the new module. Do not re-export them from `workspace-repository.ts` after every in-repo caller moves.
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

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/proposal-export-tab-grouping.test.ts tests/vitest/estimate-tabs-domain.test.ts`. The critical invariant is byte-equivalent tree/tab output and legacy fallback; import/type inspection alone cannot prove it.

### Recovery

Move the extracted implementation back into `workspace-repository.ts` and restore direct imports. No schema, migration, or data change is involved.

### Completion and next state

When verified, close `SLICE-001` if `UNIT-001` and `UNIT-002` are also resolved. The package remains `CONDITIONALLY_READY` until a planned unit's lease clears and is promoted to `READY` with a refreshed baseline.

## UNIT-004 — Deepen the Component-Folder Move Coordinator

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-003`  
**Risk:** `RISK-004`

### Lease gate

Do not start while `src/components/workshop/component-library/index.tsx` is dirty or another Component/Workshop Library owner is active on either adapter. Re-read both adapters after the lease clears and refresh the scoped hashes; behavior drift invalidates this unit.

### Owned paths

- replace `src/components/workshop/component-library/per-item-mutation-queue.ts` with `component-folder-move-coordinator.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- focused queue/coordinator contract imports

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

`TEST_PROPOSAL`: retarget `tests/vitest/per-item-mutation-queue.test.ts` to the coordinator contract and run that one focused file. No browser/render suite is proposed.

### Recovery

Restore the two adapter-local protocols and the original queue. The action API and stored data are unchanged.

### Completion and next state

Mark verified only after both real adapters use the coordinator. Do not expand this unit into folder CRUD, archive dialogs, or a universal mutation hook.

## UNIT-005 — Extract Concrete Component-Library D1 Mutation Modules

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-004`  
**Risk:** `RISK-005`

### Lease gate

Obtain a single writer for `src/lib/component-library/actions.ts` after the active Component Variant/Workshop Library write-path owner closes. Refresh the current action inventory and GitNexus impacts before editing.

### Owned paths

- new `src/lib/component-library/component-mutation-d1.ts`
- new `src/lib/component-library/folder-mutation-d1.ts`
- `src/lib/component-library/actions.ts`
- direct server-side imports required by the moved implementation

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

The unit completes only when both aggregate modules are deep and all relocated helpers are deleted from `actions.ts`. A partial “new module plus old implementation” state remains `IN_PROGRESS`, never `VERIFIED`.

## UNIT-006 — Extract Durable Public Rate-Limit Infrastructure

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `SEC-002`  
**Risk:** `RISK-006`

### Lease gate

Confirm no active security, Client Portal, Publisher, or compliance owner is changing `security_rate_limit_events` behavior or the named files. Refresh current consumers before editing.

### Owned paths

- new `src/lib/security/durable-rate-limit-d1.ts`
- new `src/lib/security/durable-rate-limits.ts`
- new `src/lib/publication/public-rate-limits.ts`
- new `src/lib/client-portal/public-rate-limits.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/d1-store.ts`
- current publication/share/proposal/Client Portal rate-limit importers

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

`TEST_PROPOSAL`: `bunx vitest run tests/vitest/client-portal-public-rate-limit.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts`. The critical invariant is identical durable lockout and clearing behavior; static import proof cannot establish it.

### Recovery

Move the engine, store methods, and policy wrappers back to their original modules and restore imports. No migration or table change is part of this unit.

### Completion and next state

Verify only after the original blocks are deleted and behavior is unchanged. Semantic convergence with other domain limiters requires a new measured unit, not follow-on improvisation here.

## UNIT-007 — Replace the Stringly Estimate D1 Façade with Typed Intent Modules

**Status:** `PLANNED`  
**Depends on:** none  
**Requirement:** `REQ-005`  
**Risk:** `RISK-007`

### Lease gate

Do not start until the active Estimate/Component Variant unit is terminal and `src/lib/estimates/d1-action-client.ts` is no longer dirty under another owner. Re-read the final projection and receipt contracts, refresh GitNexus impact, and freeze new scoped hashes.

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
- delete `src/lib/estimates/d1-action-client.ts` after zero callers remain

### Exact change

1. Create concrete, intent-named functions grouped by the ten operation families above. Functions accept the current D1 database/actor inputs and return typed domain results; do not create interfaces or classes for a hypothetical second store.
2. `database.ts` owns only shared D1 execution/row-normalization primitives used by at least two family modules. It may not expose `.from`, table strings, projection strings, or action-name dispatch.
3. `access.ts` owns edit/project checks, image-asset validation, and activity-retention metrics. `estimate-records.ts` owns estimate create/duplicate/details. The other modules own their named mutation families, including their transaction-coupled history, publication revision, receipts, guards, and authoritative return rows.
4. Preserve `src/lib/estimates/mutation-receipts.ts` as the existing receipt module; import it where needed and do not duplicate it.
5. Migrate in four fixed checkpoints within this unit: access/record calls; tab/node/template/bulk-sheet calls; row/component/history calls; proof-router and reusable-source calls. At each checkpoint, delete the retired façade branch before proceeding.
6. Replace every `dataStore.from(...)`, `.select(...)`, `.call(...)`, `new EstimateActionsD1Client`, and `createEstimateActionsD1Client` use with a typed intent function.
7. Update the proof router to call the exact row-history intent directly with its injected D1/actor context.
8. Delete `EstimateActionD1Query`, `EstimateActionsD1Client`, the string dispatcher, unused query-emulation types/helpers, and finally `d1-action-client.ts`. Do not leave a re-export or compatibility façade.
9. Preserve all SQL, statement ordering, atomicity, revision/history/outbox/receipt behavior, projection fields, error names, actor rules, statement-limit assertions, and returned shapes during the move.

### Acceptance evidence

- `rg -n "EstimateActionD1Query|EstimateActionsD1Client|createEstimateActionsD1Client|\.call\(|dataStore\.from\("` is empty on the Estimate action consumers.
- `d1-action-client.ts` is absent and all new modules are concrete intent implementations.
- No module exposes raw table/action/projection strings as a public API.
- A before/after action inventory accounts for every old dispatcher name and direct-table operation exactly once.
- History, receipts, publication revision, guards, and primary writes remain transaction-coupled.
- GitNexus `detect_changes` matches the intended Estimate action/history/reusable-source flows only, subject to shared-worktree contamination being separately identified.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: a focused command over the existing Estimate D1 action, reorder/history, row restore, template insert, authz, and current library-source projection contract files. The exact file list must be refreshed after the active owner lands; this plan does not authorize running or rewriting tests.

### Recovery

Recover at the last completed checkpoint by restoring the old family branch and its direct callers together. Do not keep both the old string dispatcher and new typed family active for the same operation.

### Completion and next state

The unit is verified only when the old file and every shallow call surface are gone. On verification, refresh `UNIT-008` against the stable typed row intents and promote it to `READY` if its UI lease is clear.

## UNIT-008 — Deepen the Existing Estimate Row Editing Store

**Status:** `PLANNED`  
**Depends on:** `UNIT-007`  
**Requirement:** `REQ-006`  
**Risk:** `RISK-008`

### Lease gate

`UNIT-007` must be verified. `EstimateSheetContent.tsx`, `editable-row-store.ts`, `use-estimate-row-handlers.ts`, row table/branch files, and their current active owner must be clean or explicitly single-writer leased. Refresh the prop/store inventory after the backend intent interface stabilizes.

### Owned paths

- new `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts`
- `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`

### Exact change

1. Add four explicit discriminated commit intents in `row-commit-intent.ts`: ordinary row field update, selected-variant update, linked shared-component definition update, and make-project-specific/detach update.
2. Preserve routing exactly: quantity and selected variant are row-owned; variant-definition edits are shared; the linked mutation path remains conditioned on the current linked-shared-component identity and update capability.
3. Deepen the existing per-`EstimateSheetContent` vanilla-Zustand `EditableRowStore`. It owns editable values, dirty/clean state, pending/error status, current optimistic snapshot, authoritative snapshot, commit intent dispatch, and rollback for each row.
4. Inject the typed row intent functions from `UNIT-007` when creating the per-sheet store. Do not create a global store, a second context, or `RowMutationCoordinator`.
5. Keep insert, delete, restore, move, picker, promotion, and toast orchestration in `use-estimate-row-handlers` unless it is directly required by a row commit. Narrow the hook input only by removing state/handlers now owned by the store.
6. Make row table/branch components select their own row values/status/actions from the store. Retain structural node/row identity and layout props.
7. Remove handler prop drilling and memo-comparator clauses only after the corresponding selector owns the dependency. Do not delete comparators merely to reduce line count.
8. Preserve focus, keyboard commit, optimistic editing, failed persistence rollback, duplicate-row behavior, source snapshot, linked-row impact, and the current in-row editing model.

### Acceptance evidence

- One per-sheet `EditableRowStore` is the only row-editing context/store.
- `row-table.tsx` contains no server-routing decision for the four commit intents.
- `use-estimate-row-handlers` no longer receives or forwards store-owned editable/dirty/status/commit dependencies.
- Branch props contain structural data and non-store operations only.
- The selected-variant/shared-definition rule is named in source and the unit receipt.
- Any removed comparator entry has a corresponding selector subscription.
- `git diff --check` is clean.

### Test decision

`TEST_PROPOSAL`: one focused row-editing contract covering the four commit intents, failed rollback, selector isolation, and linked-versus-row-owned routing. A render-count probe is proposal-only and cannot become a mandatory gate without explicit user authorization.

### Recovery

Restore the prior hook/table routing and the earlier editable-row store together. Do not leave two stores or dual commit paths active.

### Completion and next state

After verification, reconcile all unit receipts, close or accept residual risks, rerun static plan/manifest/reference/hash checks, and promote the package only if every core requirement has a verified unit. Archive the master only after truthful `COMPLETE / ACHIEVED` status.

## 4. Closeout Verification

The implementation closeout must prove:

- every core unit is `VERIFIED` and every auxiliary outcome is explicit;
- all old imports/classes/string dispatchers/pass-through seams named by the units are absent;
- no concurrent unrelated changes entered a unit receipt;
- no mandatory test/build/browser/hosted claim was made without authorization and a fresh receipt;
- `bun run validate:planning-prompts` and `bun run validate:plan-pack -- <this-pack>` pass;
- `git diff --check` passes for the implementation scope; and
- GitNexus `detect_changes` plus scoped source diff agree on the affected execution flows.

