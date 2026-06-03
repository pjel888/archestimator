# 10 Final Founder Review And Go No-Go

## Final Recommendation

Recommendation: **Go for implementation, phased and backend-first.**

Final readiness score: **99 / 100**.

The document set is implementation-ready because it replaces the original broad plan with verified codebase facts, explicit deletion/retention policy, exact backend contracts, security boundaries, UX states, test names, validation commands, operational recovery steps, and phase-by-phase entry/exit gates.

The remaining one-point gap is intentional: a future implementation branch must make final live decisions for audit table shape, active-publication deletion blocking, and optional hard delete availability after one final schema/type drift check. Those decisions are narrow, owned, and non-blocking for preview/backend foundation work.

## What Future Implementation Should Do First

1. Start with Phase 0 from `09_phase_by_phase_implementation_backlog.md`.
2. Reconfirm current migrations, generated Supabase types, and action helper availability.
3. Run code intelligence / impact analysis before editing any existing function or component.
4. Implement preview RPCs and preview server actions before any execution RPC or UI exposure.
5. Add tests for preview contracts before adding destructive execution.

## What Future Implementation Must Not Do

- Do not add direct UI delete buttons without preview modal.
- Do not call existing `deleteProject(formData)` as the bulk-delete engine.
- Do not rely on client-supplied roles, workspace ids, project names, or dependency counts.
- Do not rely on `can_edit_project` alone for project deletion; require manage/admin authority.
- Do not silently delete active publications/shared links in beta.
- Do not mutate `project_publications.snapshot_json` to remove deleted estimates; snapshots are historical artifacts.
- Do not hard delete library components with any estimate/template references.
- Do not delete object storage from user-supplied paths.
- Do not remove immutable audit/history records as cleanup.
- Do not combine all target types into one oversized UI PR.

## Top 10 Failure Modes

| # | Failure mode | Likely cause | Safeguard |
|---:|---|---|---|
| 1 | Cross-workspace data disclosure in preview | Joining target rows before access filtering | Preview RPCs return forbidden/not-found buckets without names for inaccessible ids. |
| 2 | Unauthorized project deletion | Treating `can_edit_project` as delete authority | Require `can_manage_project_access`, workspace owner/admin, or explicit delete RPC policy. |
| 3 | Active shared links disappear unexpectedly | Letting project publication cascade execute silently | Block active publications/shared links by default and show blockers in preview. |
| 4 | Audit history is corrupted | Deleting retained history tables or overloading wrong audit table | Use immutable audit policy and write mass deletion events with correlation ids. |
| 5 | Storage cleanup deletes wrong objects | Accepting client-supplied paths or broad bucket deletion | Use DB-derived paths and strict bucket/path/extension allow-list. |
| 6 | UI executes stale preview | Execution trusts preview from prior state | Execution RPC reruns preview and rejects mismatched `expectedPreviewHash`. |
| 7 | Estimate route breaks after delete | Current estimate route remains mounted after successful deletion | Redirect deleted active estimate route to project estimates list. |
| 8 | Archived components remain insertable | Archive state updates without query/search filtering | Ship archive with default filtering in library and insertion/search surfaces. |
| 9 | Hard delete breaks historical estimates | Reference checks miss estimate/template rows | Block hard delete unless all estimate/template references are zero and indexed. |
| 10 | Large batches time out | Row-by-row application deletion or missing indexes | Use set-based SQL, caps, index checklist, and preview performance tests. |

## Top 10 Implementation Safeguards

| # | Safeguard | Applies to |
|---:|---|---|
| 1 | Preview-first modal with typed confirmation | Projects, estimates, library archive, optional hard delete |
| 2 | Server-side validation with UUID, dedupe, cap, and actor checks | All server actions |
| 3 | SECURITY DEFINER RPCs with `SET search_path = public` and authenticated grants only | All RPCs |
| 4 | Workspace/project membership checks inside SQL, not client code only | All destructive execution |
| 5 | Internal preview rerun plus deterministic preview hash | All execution RPCs |
| 6 | Advisory transaction locks on target ids | Execution RPCs |
| 7 | Immutable audit event with correlation id and dependency counts | All execution attempts |
| 8 | DB mutation before storage cleanup, storage warnings returned separately | Project and hard-delete storage cleanup |
| 9 | Env-gated destructive E2E only against isolated fixtures | Playwright QA |
| 10 | Separate PRs by backend, estimate UI, library UI, project UI, hard delete, QA | Rollout control |

## Final Document Index

| Document | Use it for |
|---|---|
| `00_quality_audit_and_readiness_score.md` | Initial score, final score, corrected findings, and audit trail of this planning pass. |
| `01_executive_strategy_and_scope.md` | Founder-level thesis, scope, beta defaults, strategic choices, and anti-goals. |
| `02_verified_codebase_map.md` | Current repo map with exact files, existing functions/components, and missing capabilities. |
| `03_data_dependency_and_schema_decisions.md` | Table/FK/policy inventory and retention/deletion decisions. |
| `04_backend_rpcs_server_actions_and_storage.md` | Server action contracts, RPC contracts, validation, transactions, audit, storage cleanup, and invalidation. |
| `05_ux_ui_interaction_plan.md` | UI entry points, selection/toolbars, modals, states, accessibility, query refresh, and component candidates. |
| `06_security_permissions_and_audit_plan.md` | Threat model, role matrix, RLS/RPC behavior, SECURITY DEFINER rules, abuse cases, and audit policy. |
| `07_performance_scalability_and_operational_plan.md` | Set-based SQL, indexes, caps, storage chunking, timeout recovery, monitoring, and rollback. |
| `08_testing_validation_and_acceptance_plan.md` | Test matrix, concrete test filenames, E2E gating, commands, manual QA, and definitions of done. |
| `09_phase_by_phase_implementation_backlog.md` | Future PR sequence with entry criteria, tasks, files, tests, risks, exits, and rollback. |

## Final Open Decisions

| Decision | Recommended default | Owner | Blocking? | Why it remains open |
|---|---|---|---|---|
| Mass deletion audit table shape | Add a dedicated `mass_deletion_events` table or similarly narrow governance audit table. | Technical founder / backend implementer | Blocking before Phase 2 execution | The plan should not invent a runtime table in docs-only mode; implementation must create the real migration. |
| Active publication handling for estimate sheet deletion | Block deletion when active publications include target estimate ids; allow after unpublish/revoke. | Product + backend implementer | Blocking before Phase 2 execution | This is the safest beta default, but product may later choose snapshot-retention plus source detachment. |
| Optional component hard delete availability | Defer UI exposure until archive is proven; allow backend only for admin/unreferenced cleanup if approved. | Product owner | Non-blocking for Phases 1-5 | Archive delivers the main value safely. Hard delete is useful but not required for MVP. |
| Storage cleanup retry surface | Store warning in audit event first; add admin retry queue only if failures occur in beta. | Technical founder / operations | Non-blocking for Phase 2 if warning path exists | A durable queue may be overbuilt for closed beta unless object deletion failures are frequent. |

## Go / No-Go Gates

Go for Phase 1 when:

- Phase 0 drift check is complete.
- Preview RPC result shapes are accepted.
- Batch caps and active-publication blocker policy are accepted.
- Test filenames and validation commands from `08_testing_validation_and_acceptance_plan.md` are adopted.

No-go for destructive execution when:

- Preview RPCs are not tested.
- Cross-workspace ids leak target names.
- Audit table/event policy is not final.
- Storage cleanup allow-list is not implemented.
- Active publication behavior is ambiguous.

No-go for UI exposure when:

- Execution RPCs do not rerun preview.
- Typed confirmation and disabled states are missing.
- Route redirect after deleting active project/estimate is not handled.
- `bun run lint:design-system` or targeted DOM tests fail.

## Commit And Push Status

This planning document intentionally keeps repository closeout metadata as a placeholder so the document remains reusable after later implementation phases.

| Field | Value |
|---|---|
| Docs-only plan commit hash | Recorded in the external closeout report for this planning pass. |
| Docs-only plan branch | Recorded in the external closeout report for this planning pass. |
| Docs-only plan push status | Recorded in the external closeout report for this planning pass. |

## Final Non-Implementation Statement

This planning pass did not implement runtime code, migrations, tests, UI components, Supabase SQL, package/config changes, or application behavior. It only created planning and implementation-guidance documents under the approved `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components/` folder.
