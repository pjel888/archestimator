# Superseded Source Artifact

**Status:** Superseded by the verified document set in this folder.
**Plan date:** 2026-06-03
**Use rule:** Do not implement from this file.

This file preserves the location of the original monolithic mass-deletion plan while preventing future agents from treating stale source text as authoritative. The original artifact was useful as a seed, but live repo verification found stale and unsafe claims:

- it said `ProjectDetailsModal.tsx` had no delete action, but the modal already submits `deleteProject(formData)` after `window.confirm`;
- it treated `can_edit_project` as absent or uncertain, but the function exists and is too broad for project hard-delete authority;
- it proposed removing deleted estimate ids from `project_publications.selected_estimate_ids`, while the verified plan now blocks active affected publications for beta because `snapshot_json` is receiver render truth and recipient comments/responses/events are historical records;
- it left FK/index facts for estimates, publications, collaboration, favorites, and component attachments to a later discovery phase even though those facts are verified in migrations and generated types;
- it used old test-count and closeout claims that no longer reflect the repository state.

Authoritative documents:

| Document | Authority |
|---|---|
| `00_quality_audit_and_readiness_score.md` | Repo verification, score, evidence, corrections, and validation ledger. |
| `01_executive_strategy_and_scope.md` | Product strategy, scope, defaults, and anti-goals. |
| `02_verified_codebase_map.md` | Current files, functions, UI entry points, and missing behavior. |
| `03_data_dependency_and_schema_decisions.md` | Table/FK/index/policy matrix. |
| `04_backend_rpcs_server_actions_and_storage.md` | Server-action, RPC, transaction, storage, and invalidation contracts. |
| `05_ux_ui_interaction_plan.md` | UI flows, states, accessibility, and design-system constraints. |
| `06_security_permissions_and_audit_plan.md` | Threat model, role matrix, RLS/RPC rules, audit policy. |
| `07_performance_scalability_and_operational_plan.md` | Caps, set-based SQL, locks, indexes, storage chunking, recovery. |
| `08_testing_validation_and_acceptance_plan.md` | Test names, commands, destructive E2E gates, manual QA. |
| `09_phase_by_phase_implementation_backlog.md` | Future PR sequence, entry/exit criteria, rollback. |
| `10_final_founder_review_and_go_no_go.md` | Go/no-go summary and implementation guardrails. |
| `11_verified_schema_fk_index_matrix.md` | Compact schema/FK/index evidence matrix. |
| `12_publication_and_collaboration_deletion_policy.md` | Publication, shared-link, and collaboration retention policy. |
| `13_storage_cleanup_and_audit_outbox_strategy.md` | Storage cleanup and audit/retry strategy. |
| `14_future_implementation_agent_checklist.md` | Execution checklist for the next codebase AI. |
| `15_red_team_failure_modes_and_safeguards.md` | Hostile failure-mode review and safeguards. |

If a future implementation agent needs the seed artifact for comparison, use the git history before the audit-hardening commit rather than implementing from stale text.
