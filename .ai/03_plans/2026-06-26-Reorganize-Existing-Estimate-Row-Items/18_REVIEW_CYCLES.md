# Review Cycles

## Cycle 1: Adversarial Product And Code Critique

### Challenge

The first draft risked treating row movement as a branch-target operation only. That would miss the user's clarified need to reorder rows inside the same branch, such as reordering three Living Room rows while all remain in Living Room.

The critique also found that filtered, faceted, and grouped views can display rows in an order that is not the persisted sibling order. Persisting drag results from those views could surprise users or corrupt order intent.

### Revision

The plan now requires every operation to resolve `targetNodeId` plus `targetIndex`. Same-branch reorder is part of MVP and appears in requirements, architecture, data plan, tests, and traceability.

The plan disables row movement in transformed views for the first implementation.

### Evidence Updated

- `01_EXECUTIVE_SUMMARY.md`
- `04_REQUIREMENTS_SPECIFICATION.md`
- `05_UX_UI_ACCESSIBILITY_PLAN.md`
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`
- `12_TEST_AND_VALIDATION_STRATEGY.md`
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`

## Cycle 2: Data, Security, And Reliability Critique

### Challenge

The second critique found that a move request cannot safely update only the dragged row. Same-branch reorder shifts sibling rows, and cross-branch movement shifts source and target sibling sets. The database has a unique `(node_id, sort_order)` constraint, so partial updates or non-transactional writes are unsafe.

The critique also found that browser drag payloads are untrusted and that older direct repository upsert paths are not suitable for live workshop movement.

### Revision

The plan now requires a final-order update list containing every changed row, expected row revisions, deterministic locking, deferred unique constraint handling, same-estimate validation, edit authorization, and a minimal history event.

The plan explicitly rejects direct browser repository upsert and tree-owned row mutation.

### Evidence Updated

- `07_DATA_DATABASE_API_NETWORK_PLAN.md`
- `08_SECURITY_PRIVACY_THREAT_MODEL.md`
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`
- `10_BLAST_RADIUS_AND_DEPENDENCIES.md`
- `14_RISK_REGISTER.md`
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`

## Final Review

The final review confirms:

- The plan is planning-only and does not change product code.
- The drag handle is not enabled unless backed by real movement semantics.
- Same-branch reordering is first-class.
- Middle-sheet and left-tree behaviors are intentionally different: middle sheet supports precise position, left tree appends inside a target branch.
- Persistence, authorization, rollback, accessibility, and tests are covered.

## Cycle 3: Multi-Agent Audit Corrections

### Challenge

Follow-up product, design/accessibility, coherence, security, feasibility, and adversarial audits found that the package had strong core architecture but under-specified several implementation-critical planning details:

- Product success metrics and do-nothing cost were thin.
- The 32px select column did not by itself define an accessible coarse-pointer target strategy.
- Keyboard fallback had not yet chosen one interaction.
- The pure helper was shaped like a single root node while the app state uses `EstimateTreeNode[]`.
- Row sort-order normalization was left open.
- Final readiness overclaimed while entry criteria were still phrased as confirmations.
- The action/RPC contract did not carry active tab context explicitly enough.
- The new mutating RPC needed an explicit security-definer privilege envelope, actor derivation from `auth.uid()`, and mandatory idempotency.
- Verification needed real DB proof and mandatory browser proof for pointer geometry.
- The required scorecard artifact was missing.

### Revision

The plan now adds product success metrics, problem evidence and do-nothing cost, a fine-pointer versus coarse-pointer target strategy, a Move row dialog contract, lifecycle-state copy, forest-shaped helper contract, dense sort-order policy, singular action/RPC naming, active-tab contract, hardened RPC security requirements, mandatory mutation-id idempotency, real DB proof, browser geometry proof, expanded traceability, and a new audit scorecard.

### Evidence Updated

- `02_FEATURE_BRIEF_AND_SCOPE.md`
- `04_REQUIREMENTS_SPECIFICATION.md`
- `05_UX_UI_ACCESSIBILITY_PLAN.md`
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`
- `07_DATA_DATABASE_API_NETWORK_PLAN.md`
- `08_SECURITY_PRIVACY_THREAT_MODEL.md`
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`
- `11_IMPLEMENTATION_PLAN.md`
- `12_TEST_AND_VALIDATION_STRATEGY.md`
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`
- `14_RISK_REGISTER.md`
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `17_FINAL_READINESS_REVIEW.md`
- `19_PLAN_AUDIT_SCORECARD.md`
