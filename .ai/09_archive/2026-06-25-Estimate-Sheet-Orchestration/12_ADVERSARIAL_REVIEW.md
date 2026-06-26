---
title: Adversarial Review
type: docs
date: 2026-06-25
status: revised
---

# Adversarial Review

## Cycle 1: Lead Self-Critique

Status: complete; revisions applied before specialist adversarial review.

Initial pressure points to verify:

- Risk: the first draft ordered DB/RPC work before right-sidebar honesty, losing the planner lane's point that right-sidebar honesty can be an early disjoint trust win. Resolution: phase model revised to MOP-0 control plane, MOP-1 right-sidebar honesty, MOP-2 center integrity, MOP-3 tree security/DB invariants.
- Risk: telemetry was framed too much as rollout polish. Resolution: telemetry storage/sink proof moved into MOP-0 with PII redaction requirements.
- Risk: DB work could trust plan SQL sketches. Resolution: live schema/function/grant/RLS/constraint/index introspection and project-ref check added to MOP-0.
- Risk: the architecture subagent returned unusable partial output. Resolution: marked architecture evidence as lead-targeted source audit instead of relying on that report.
- Risk: source plan folder modifications could be overwritten. Resolution: package continues to treat them as input state only.

## Cycle 2: Specialist Adversarial Review

Status: complete; revisions applied before independent final verification.

Reviewer prompt:

```text
Read `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration` and the three source plan folders. Planning-only review. Find contradictions, unsupported assumptions, missing source-plan mappings, unsafe sequencing, vague owners, unproven validation claims, and any scope leakage into implementation. Return findings ordered by severity with exact file/section references.
```

## Findings

| ID | Severity | Finding | Required Correction | Resolution |
|---|---:|---|---|---|
| ADV-01 | High | The package claimed full source-plan preservation, but the original traceability matrix was requirement-oriented and did not prove coverage for every source-plan finding, risk, task, migration, and threat ID. | Add source-ID coverage proof instead of relying on broad synthesis statements. | Added `14_SOURCE_ID_COVERAGE_APPENDIX.md` and indexed it from `README.md` and `00_AGENT_COORDINATION.md`. |
| ADV-02 | High | The first revised phase model still flattened some quick-win semantics by pushing low-risk visible UI/a11y repairs behind later accessibility/performance work. | Split low-risk UI/a11y preflight work from later integrated accessibility, responsive, performance, and observability gates. | Added MOP-0.5 in `README.md`, `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`, `07_ORCHESTRATION_TODO.md`, and `09_TRACEABILITY_MATRIX.md`. |
| ADV-03 | High | DB rollback language was too generic for the migration blast radius across atomic row moves, bulk delete, tree delete return values, numeric sort order, and telemetry storage. | Add migration-specific preflight, forward path, rollback/fix-forward posture, and verification commands. | Added the migration runbooks section in `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`; retained fix-forward/dump constraints in `10_RISK_DECISION_AND_ROLLBACK_REGISTER.md`. |
| ADV-04 | Medium-high | Security/privacy threat coverage was selective; tree threat IDs for last-writer-wins conflicts, share-token leakage, and recursive/depth abuse needed explicit master-plan treatment. | Add explicit threat coverage and plan-level decisions/risks for these cases. | Added coverage for `T-09`, `T-13`, and `T-14` in `14_SOURCE_ID_COVERAGE_APPENDIX.md`; added decision/risk treatment in `10_RISK_DECISION_AND_ROLLBACK_REGISTER.md`. |
| ADV-05 | Medium | Ownership was role-oriented but not conflict-proof for shared hot files and phase-level handoffs. | Add RACI by phase/shared file so future agents cannot treat shared contracts as unowned. | Added RACI by shared file in `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`. |
| ADV-06 | Medium | Validation proof categories were not exact enough to drive future RED->GREEN implementation. | Add starting commands, RED/GREEN expectations, and proof gaps by requirement surface. | Expanded `11_TEST_VALIDATION_AND_QA_STRATEGY.md` with exact targeted commands, expected failing/passing signals, and release-blocking thresholds. |

## Resolutions

All specialist adversarial findings have a corresponding package revision. The residual risk is source-plan completeness at the ID level; `14_SOURCE_ID_COVERAGE_APPENDIX.md` is now the explicit audit surface for that risk and should be reviewed alongside `09_TRACEABILITY_MATRIX.md` in the future implementation kickoff.

The `08_MASTER_BEFORE_AFTER_REPORT.md` implementation-result columns intentionally remain blank/template fields. They are not unresolved planning work; they are the future implementation record surface requested by the user.

Cycle 2 conclusion: pass for independent final verification.
