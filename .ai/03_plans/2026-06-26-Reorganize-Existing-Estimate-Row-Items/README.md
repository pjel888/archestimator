# Reorganize Existing Estimate Row Items

Date: 2026-06-26
Status: planning package, audit-corrected for implementation handoff; no implementation changes
Requested scope: add a real row drag/reorganize affordance above the hover selection control in `EstimateSheetContent`, supporting middle-sheet row movement, left-sheet-tree drops, and same-branch row reordering.

## Primary Decision

Build row reorganization as a dedicated estimate-row-item move/reorder feature, not as an extension of the existing component move flow. The target operation must carry both a target node and an explicit position. Same-branch reorder is first-class: a user can drag the third Living Room row above the first Living Room row without leaving Living Room.

## Document Index

- `00_AGENT_COORDINATION.md` records surfaces, agents, constraints, and stop conditions.
- `01_EXECUTIVE_SUMMARY.md` summarizes the recommendation.
- `02_FEATURE_BRIEF_AND_SCOPE.md` defines product scope.
- `03_SOURCE_AND_CODEBASE_AUDIT.md` records code evidence and affected seams.
- `04_REQUIREMENTS_SPECIFICATION.md` lists functional and nonfunctional requirements.
- `05_UX_UI_ACCESSIBILITY_PLAN.md` defines interaction, accessibility, touch, and keyboard behavior.
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` defines client architecture and event contracts.
- `07_DATA_DATABASE_API_NETWORK_PLAN.md` defines persistence, RPC, action, and sorting contracts.
- `08_SECURITY_PRIVACY_THREAT_MODEL.md` covers authorization and payload trust boundaries.
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` covers scale, rollback, and evidence.
- `10_BLAST_RADIUS_AND_DEPENDENCIES.md` maps files, tests, and dependency decisions.
- `11_IMPLEMENTATION_PLAN.md` gives a phased implementation sequence.
- `12_TEST_AND_VALIDATION_STRATEGY.md` defines regression coverage and commands.
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` defines rollout and recovery.
- `14_RISK_REGISTER.md` records risks and mitigations.
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` records decisions and rejected options.
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` maps requirements to design and tests.
- `17_FINAL_READINESS_REVIEW.md` states readiness gates for implementation.
- `18_REVIEW_CYCLES.md` records two critique and revision cycles.
- `19_PLAN_AUDIT_SCORECARD.md` records inventory, authority, scoring, and residual execution-time checks.
- `LOOP_LEDGER.md` records the planning loop evidence.

## Implementation North Star

The drag icon must be a truthful affordance. It should appear in the existing selection column above the hover checkbox, start drag only from the handle, preserve checkbox behavior, show precise middle-sheet insertion indicators, allow left-tree inside drops that append to a branch, and expose a keyboard/touch fallback for the same move/reorder operation.
