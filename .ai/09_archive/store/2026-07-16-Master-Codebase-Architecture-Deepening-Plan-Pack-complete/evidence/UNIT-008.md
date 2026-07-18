# UNIT-008 Verification Receipt

- Recorded: `2026-07-17T04:02:09+08:00`
- Baseline HEAD: `0a2667db998607917932ad7832e9a6a5bd7e066a`
- Scoped file-set SHA-256: `63fd85dc02acc8e8971c82125e19d3980304fcd5a1e88ef3c13142104ebdf251`
- Result: `VERIFIED`

## Implemented boundary

The existing one-per-`EstimateSheetContent` vanilla `EditableRowStore` is now the sole owner of row display values, last-confirmed authoritative values, dirty and pending phases, errors, active commit tokens, pending semantic intents, rollback, and retained offline drafts. It exposes exactly four intent kinds (`row-field-update`, `selected-variant-update`, `shared-component-definition-update`, and `make-project-specific`) and exactly three shared-definition targets (`linked-library-component`, `project-component`, and `project-variant`). Fail-closed adapters are installed at creation and replaced through the existing layout-effect seam after the client-safe persistence callbacks exist.

Rows and branches no longer receive the seven frozen row-commit/status props. Each row selects only its editable value, semantic commit state, external structural mutation status, and component-sync status from the per-sheet store. Structural insert, delete, restore, move, picker, promotion, express-draft, and duplicate-row orchestration remain in the handler/mutation boundary. Duplicate insertion is not a fifth intent and retains its mutation ID, source revision, target node/tab, optimistic item, ambiguity retry, explicit-release, and isolated rollback behavior.

Every lifecycle transition and outcome is guarded by the initiating token and the exact affected-row set. Shared-definition success supplies authoritative snapshots for all owned affected rows. Optimistic tree echoes cannot replace a protected row's last-confirmed rollback baseline. Non-offline failures roll back; offline failures retain the dirty draft. Express-insert failure remains a retryable structural failure and no longer invalidates a buffered row lifecycle before retry.

## AC-008 reconciliation

- **Single store and ownership:** PASS. No global store, second context, or coordinator was added; the existing per-sheet store owns optimistic, authoritative, dirty, pending, error, and rollback state.
- **Intent and target routing:** PASS. All four intent kinds and all three shared-definition targets route through the existing client-safe adapters. Quantity and selected variant remain row-owned; shared component/variant-definition edits remain shared.
- **Selector migration:** PASS. Every removed row commit/status prop has a row-scoped selector or the external structural-status synchronization seam. Branch and table comparator dependencies were removed only after that replacement existed.
- **Token and convergence safety:** PASS. Stale transitions, successes, failures, cancellations, shared affected-row fanout, optimistic echoes, and authoritative merges are token/row guarded.
- **Failure policy:** PASS. Non-offline errors roll back to the last confirmed snapshot; offline errors retain the edited failed/dirty draft.
- **Duplicate exclusion:** PASS. Duplicate identity and queue logic remain in `use-estimate-row-handlers.ts` and `use-estimate-row-mutations.ts`, outside the four-intent system.
- **Client/server boundary:** PASS. The client commit modules import no D1 handle, actor-context helper, repository, or server-only UNIT-007 intent.
- **Linked-Library proof:** PASS. The one new behavior case covers impact confirmation, expected version/timestamp/fingerprint/intent/price-option identity, no row-update or replacement mutation, and convergence of all affected linked rows.

## Evidence

- Exact `TEST-008` gate passed: 2 files and 55 tests.
- Supplemental direct-consumer regression gate passed: 3 files and 24 tests (`estimate-row-mutation-coordinator`, `estimate-row-table-virtualization`, and `estimate-branch-virtualization`).
- Focused express retry reproduction passed with a buffered field edit surviving insert failure, retrying under the same insert identity, persisting with row revision 1, and clearing the stale failure state.
- `bunx tsc --noEmit` passed.
- Scoped ESLint across all nine owned paths had zero errors. Its four warnings are the three existing `EstimateSheetContent` memo-dependency diagnostics and the existing TanStack Virtual compiler diagnostic.
- Scoped `git diff --check` passed for the eight tracked owned paths. The untracked new `row-commit-intent.ts` also produced no whitespace-error output under `git diff --no-index --check` (exit 1 is the expected presence-of-diff status).
- React Doctor changed-scope scan completed at the unchanged `84/100` score with 36 warnings. No new actionable UNIT-008 diagnostic was introduced; the reported changed-file findings are existing memo/effect/accessibility/virtualizer patterns outside this unit's frozen behavior change.
- Fresh pre-edit GitNexus impact reported `HIGH` for `createEditableRowStore` (39 upstream), `HIGH` for `useEstimateRowHandlers` (35 upstream), `HIGH` for `EstimateSheetContent` (34 upstream), and `LOW` for `useEstimateRowMutations` (3 upstream); the user was warned before edits.
- Post-change GitNexus `detect_changes` remained unavailable because its MCP transport is closed. The required fallback graph scan accepted the exact nine-file list but was polluted by the shared dirty worktree: risk `0.60`, 485 changed functions/classes, zero affected flows, and unrelated upload/auth test gaps. It is recorded as degraded, non-authoritative evidence rather than used to overrule the exact tests, hashes, and reviews.
- Independent adversarial review found seven lifecycle/ownership defects; all seven were repaired and re-review closed them. A second review found optimistic-baseline and express-retry lifecycle defects; both were repaired, behavior-tested, and the same reviewer returned both findings closed with no remaining actionable issue.

## Key file hashes

- `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts`: `c21aa0382774cdb9985770b68128a3455378d7ad67dc155525979f0b45aa5533`
- `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`: `d9ba3f6f49522b5ddb23bb492ef5425ee61f65b8af1176db0e068990717e48b2`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`: `1e803bf486c07480de98e05c69821f9c966daf3d94a8f6339d07866da8d75939`
- `src/hooks/use-estimate-row-mutations.ts`: `f74c6235b1493c1339c2c93a202ed1831e164ca79edfc06f38a2ee99f2aecf03`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`: `c477b649acb869af7c2106cd802e9114e9fe906ffcd340dba8f13849c92c4a76`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`: `461a425d38371bb5126501ee137c33f5c0f6c81912c04be005747121de188da7`
- `src/components/workshop/EstimateSheetContent.tsx`: `2d11d0047b831631d384d872d5f77e68b5ce205bf67bbe104a9d22a323f5ea21`
- `tests/vitest/estimate-sheet-unit-003-contracts.test.ts`: `7399f63e1a68028f2555f156229ddda5f39c72358616b8a44d0de3f008870bad`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`: `e3357b4ed4a22afb1c501b34afb6c3a022344a449e7c84bd50777c6115ac4d0d`

## Remaining risk

No known UNIT-008 defect remains. The row-editing surfaces are high-blast-radius and the shared worktree prevents clean graph-only attribution, so this receipt relies on the exact authorized gate, direct-consumer regressions, scoped static checks and hashes, explicit AC-008 clause reconciliation, and two rounds of independent adversarial review. The React Doctor warnings are unchanged and are not evidence of a UNIT-008 regression.
