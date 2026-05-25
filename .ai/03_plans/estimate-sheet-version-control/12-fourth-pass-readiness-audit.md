# 12 Fourth-Pass Readiness Audit

**Date:** 2026-05-24
**Scope:** Planning-pack refinement only. No application code, migration, generated Supabase types, or tests were implemented in this pass.

## Fourth-Pass Corrections

### Row Details UI Is New Work

- The row Expand icon is currently inert: no `onClick`, no open-row state, and no row details drawer/modal/panel.
- V1 row history should wire the existing Expand icon slot to a newly implemented row details/history panel.
- The plan must budget and test this as new UI work, including focus management, Escape/close behavior, keyboard access, and no interference with quantity/Misc Cost blur commits.

### Existing RPCs Need A Signature Strategy

- `reorderEstimateTreeNodes()` already calls `public.reorder_estimate_nodes(target_estimate_id, move_updates)`.
- `insertEstimateTemplateIntoEstimate()` already calls `public.insert_estimate_template_into_estimate(target_project_id, target_estimate_id, target_parent_node_id, source_template_id)`.
- History cannot be appended after these RPCs return without violating the no split-success rule.
- Implementation must either migrate the existing RPC signatures and all callers in one pass, or add history-aware wrapper RPCs and migrate server actions to those wrappers.
- New/changed RPCs need grants, generated Supabase types, and static migration contract tests for the exact signatures.

### Actor Propagation Must Match The App

- SQL should not depend on `auth.uid()` alone.
- History server actions must call `requireCurrentUserContext()` and pass `currentUser.userId` as `acting_user_id`.
- SQL should resolve `coalesce(auth.uid(), acting_user_id)` and use that resolved id for workspace membership checks and event attribution.

### Static Tests Are Not Atomicity Proof

- The component-library schema test style is file-content validation.
- Static tests should assert SQL shape: tables, indexes, grants, exact RPC signatures, `security definer`, `coalesce(auth.uid(), acting_user_id)`, `for update`, exceptions, and no broad event update/delete grants.
- Live RPC transaction tests are still required before claiming rollback, locking, RLS, or concurrency behavior complete.

## Revised Readiness Assessment

Planning completeness is now approximately **82/100**.

The architecture remains sound. The plan is much safer than the first and second passes, but implementation should not begin until the readiness gate is accepted because the remaining work is not minor: a row details panel must be built, existing RPC boundaries must be migrated or wrapped, and atomicity needs live database proof.

## Remaining Blockers

1. Product acceptance is needed for using the inert Expand icon as the row-history trigger and building a new row details/history panel.
2. Product acceptance is needed for `V1`/`V2` compatibility labels plus editable version titles.
3. Implementation must choose wrapper RPCs vs in-place RPC signature migration for reorder/template flows.
4. Live database transaction testing must be available or explicitly deferred before any atomicity claim.
5. Exact implementation symbol impact must be rerun immediately before code edits.
6. Supabase migration and generated types do not exist yet.

## Fourth-Pass Verdict

Ready for implementation planning handoff after the gate is accepted, but not ready for blind autonomous implementation. The next implementer should start with `08-implementation-readiness-gate.md`, then Pass A in `05-implementation-sequence.md`, and stop for evidence after schema/RPC/static/live-test setup before UI work.

## Superseded By Final Pre-Implementation Pass

The later final pass resolves blocker #3: v1 should use wrapper RPCs for existing `reorder_estimate_nodes` and `insert_estimate_template_into_estimate` flows. It also adds row revision conflict detection, retry idempotency via stable mutation UUID/correlation ids, event payload size guardrails, and batched backfill requirements. See `14-final-pre-implementation-readiness-pass.md`.
