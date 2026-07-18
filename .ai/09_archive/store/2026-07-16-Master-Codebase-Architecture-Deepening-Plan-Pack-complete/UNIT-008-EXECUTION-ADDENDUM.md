# UNIT-008 Execution Addendum

This addendum is the current execution source for `UNIT-008`, `AC-008`, and `TEST-008`. It closes four executor-choice gaps found during current-source preflight: adapter installation ordering, authoritative-versus-optimistic synchronization, non-commit mutation status ownership, and duplicate-row exclusion. Where this addendum conflicts with `IMPLEMENTATION_PLAN.md`, this addendum controls; the canonical owned-path list and all unrelated unit contracts remain unchanged.

## Standalone start gate

Start product edits only after every other codebase writer is idle, the complete UNIT-008 owned-path set is clean relative to this goal, `src/lib/component-library/actions.ts` and the UNIT-007 Estimate persistence boundary are stable, no overlapping file lease exists, and GitNexus has been refreshed before rerunning impact. The preflight index was approximately 68 commits behind and reported HIGH advisory blast radius for `createEditableRowStore`, `useEstimateRowHandlers`, and `EstimateSheetContent`; disclose fresh HIGH or CRITICAL results before edits.

## Exact intent model and routing

`row-commit-intent.ts` owns the existing field/scope classifier and defines exactly four intent kinds:

- `row-field-update`
- `selected-variant-update`
- `shared-component-definition-update`
- `make-project-specific`

The shared-definition intent further discriminates exactly three targets:

- `linked-library-component`
- `project-component`
- `project-variant`

The table invokes semantic store actions and never chooses Library versus project persistence. Preserve routing exactly:

| Intent | Existing persistence path |
| --- | --- |
| Ordinary row fields | `updateRowItem` |
| Project selected variant | `updateRowItem` with `componentMutationIntent: "variant-selection"` |
| Linked-Library selected variant | existing replacement mutation |
| Shared Library definition | impact check, confirmation when required, then `updateCostLibraryComponentWithPriceOptions` |
| Shared project component or variant definition | impact check, confirmation when required, then `updateRowItem` with the existing fingerprint contract |
| Make project specific | confirmation, then `updateRowItem(..., { makeProjectSpecific: true })` |

Quantity and selected variant remain row-owned. Shared component and variant-definition edits remain shared. No client module imports a D1 handle, actor-context helper, or server-only UNIT-007 intent.

## Single-store contract

Use the existing one-per-`EstimateSheetContent` vanilla `EditableRowStore`; do not add a global store, second context, or coordinator. It owns:

- `rows`, the current display and optimistic values;
- `authoritativeRows`, the last confirmed values;
- per-row phase, error, active commit token, and pending intent;
- `stageRow`;
- `commitRowFields`;
- `commitSelectedVariant`;
- `requestMakeProjectSpecific`;
- `commitMakeProjectSpecific`;
- `syncAuthoritativeRows`;
- `syncExternalMutationStatuses`; and
- `setCommitAdapters`.

Create the store with fail-closed adapters, then install stable real adapters after the row handlers and shared-component callbacks exist. Store actions read the current adapter slot at dispatch time and never capture a placeholder adapter. Install adapters through a layout effect (or an equivalently ordering-safe existing layout-effect seam) so no render-time mutation or circular construction is introduced.

`syncAuthoritativeRows` updates the confirmed snapshot without replacing a newer optimistic value for a row with an active token or retained dirty draft. A committed result supplies authoritative snapshots for every affected linked row, not only the initiating row. Every success and rollback is guarded by a per-row commit token so a late response cannot overwrite a newer edit.

Commit adapters report lifecycle outcomes that cover awaiting confirmation, pending affected row IDs, committed authoritative row maps, rejection with either rollback or retain-draft policy, and cancellation. A non-offline persistence failure rolls back to the authoritative snapshot. An offline failure retains the edited draft in failed and dirty state.

## External status and prop migration

Delete table/branch props only after row-scoped selectors replace them:

- `onUpdateRowItem`
- `onUpdateLinkedLibraryComponent`
- `onMarkRowDirty`
- `onReconcileRowDirty`
- `onRequestProjectSpecific`
- `rowMutationStatuses`
- `componentSyncPendingRowIds`

Retain structural operations such as insert, replace, delete, restore, move, picker, promotion, express draft, selection, and template operations. Synchronize their external mutation statuses into the store so delete, move, and duplicate feedback remains visible after the status props are removed. Rows subscribe only to their own editable value and status; neither rows nor branches subscribe to a global store revision. Remove a memo-comparator dependency only after the corresponding selector or external-status seam owns it.

`virtual-branch-list.tsx` remains no-edit unless current-source evidence proves a mandatory compile repair; derived prop changes alone do not authorize edits.

## Duplicate-row exclusion

Duplicate insertion remains entirely in `use-estimate-row-handlers.ts` and `use-estimate-row-mutations.ts` as a structural insert operation. It is not a fifth commit intent and does not move into `EditableRowStore`. Preserve the same mutation ID, source revision, target node ID, active tab ID, and optimistic item across ambiguous retries. Repeated activation must not insert a second optimistic copy; explicit rejection releases the retained identity; rollback removes only the failed duplicate and never reverts an unrelated row edit. Keep the existing identity map and queue behavior unchanged unless a narrow client-safe adapter type export is required.

## AC-008

Pass only when one per-sheet store is the sole owner of row commit, dirty, pending, optimistic, authoritative, and rollback state; all four intents and three shared-definition targets route through current adapters; row-scoped selectors replace every removed comparator dependency; external structural statuses remain visible; late outcomes are token-guarded; offline and non-offline failures follow their frozen policies; and duplicate insertion remains outside the commit-intent system with its full retry identity intact.

## TEST-008

Retarget and run only:

```sh
bunx vitest run tests/vitest/estimate-sheet-unit-003-contracts.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx
```

The source-contract test must prove the exact intent and target discriminants, store ownership of optimistic and authoritative snapshots plus row phases, token-guarded rollback, fail-closed then real adapter installation, selector replacement for every removed comparator dependency, the external-status synchronization seam, absence of server-only imports from client modules, and that duplicate identity logic remains in the handler/hook.

Add the one missing linked-Library shared-definition behavior case only: a valid linked-Library fixture with source/version identity, selected option and price options, enabled capability, impact count greater than one, confirmation, the Library update action called with the current expected version/timestamp/fingerprint/intent ID/price options contract, no row-update or replacement mutation, and authoritative convergence of affected linked rows. Preserve existing project-shared, selected-variant, duplicate-retry, and isolated-rollback coverage.

## Completion evidence

- No second store/context/coordinator or fifth commit intent exists.
- No server-only D1/database/actor import crosses into a client module.
- No removed prop or comparator dependency lacks a row selector or external-status replacement.
- `use-estimate-row-mutations.ts` duplicate identity and queue semantics remain intact.
- The two focused files pass, along with scoped TypeScript, ESLint, `git diff --check`, React Doctor for changed React files, and GitNexus change detection.
- The receipt names the fresh impact results and reconciles every AC-008 clause before promotion.
