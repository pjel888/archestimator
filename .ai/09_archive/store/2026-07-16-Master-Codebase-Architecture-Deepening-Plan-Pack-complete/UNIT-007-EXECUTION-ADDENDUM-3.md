# UNIT-007 Execution Addendum 3 — Adapter and Proof Clarifications

This artifact is a narrow clarification of `UNIT-007-EXECUTION-ADDENDUM-2.md`. It does not change the owned files, family map, public typed-intent contracts, four implementation checkpoints, exact 21-file test gate, or pass condition. Where the earlier addendum could be read more broadly, the following rules control execution.

## Proof-router capture boundary

“Every proof mutation goes through the capture adapter” means every typed Estimate mutation exercised by the proof router. The router retains its explicitly authorized proof fixture, setup, observation, rollback-probe, and cleanup SQL. Those proof-infrastructure statements do not pass through `captureEstimateHistoryProofIntent` and do not become typed production intents.

Typed Estimate authorization and row mutations must not remain as proof-router SQL. The proof response text must describe the production boundary as “typed Estimate intents”; the retired “app D1 action client” wording must not remain.

## Behavioral assertion preservation

Preserve every existing behavioral claim, not implementation assertions that require the façade being deleted. Tests that currently assert `EstimateActionsD1Client`, `EstimateActionD1Query`, string action names, dispatcher branches, `.call`, `.from`, `.select`, or hard-coded façade alignment must be rewritten to assert the owning typed intent, statement ordering, transaction coupling, authorization, return/error shape, or residue contract directly.

This specifically includes the query-builder readback assertion in `estimate-actions-d1-reorder-history.test.ts`, dispatcher assertions in `estimate-row-atomic-d1-contracts.test.ts`, hard-coded action-name alignment in `estimate-sheet-version-control-actions.test.ts`, and dispatcher branches in `mass-deletion-contract.test.ts`. Removing one of those façade assertions without an equivalent typed-owner behavioral assertion fails `TEST-007`.

## Reusable-source execution ownership

`src/lib/reusable-sources/actions.ts` retains ownership of its purpose-built subtree-copy workflow SQL and its current operation-specific error translation. It uses the shared execution primitives from `d1-intents/database.ts` for D1 preparation, binding, reads, and batches instead of retaining a second generic execution layer.

Reusable-source-specific helpers may assemble and adapt the owned workflow, but they may not recreate a client, query builder, dispatcher, table-string API, generic `first`/`all`/`run`/`batch` storage implementation, or compatibility wrapper around the deleted façade.

## Checkpoint gate

These clarifications are mandatory no later than checkpoint 4. Checkpoints 1–3 may proceed under Addendum 2 while this artifact is frozen into the manifest. Checkpoint 4 may start only after this artifact's exact hash is recorded and both plan-pack validator modes pass.
