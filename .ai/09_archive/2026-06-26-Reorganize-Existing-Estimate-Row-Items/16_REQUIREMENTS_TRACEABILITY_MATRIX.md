# Requirements Traceability Matrix

| Requirement | Design Coverage | Test Coverage |
| --- | --- | --- |
| R1 drag handle above checkbox | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `11_IMPLEMENTATION_PLAN.md` | Row table DOM, no-overlap, and checkbox non-regression tests |
| R2 dedicated row operation | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | MIME parser and component move non-regression tests |
| R3 same-branch reorder | `04_REQUIREMENTS_SPECIFICATION.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Pure helper, DOM, real DB RPC, and browser geometry tests |
| R4 middle-sheet cross-branch move | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `11_IMPLEMENTATION_PLAN.md` | Middle sheet DOM, RPC final-order, and browser geometry tests |
| R5 left-tree drop append | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `11_IMPLEMENTATION_PLAN.md` | Tree external drop, content event handler, and browser geometry tests |
| R6 single-row MVP | `02_FEATURE_BRIEF_AND_SCOPE.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Selection and drag-state tests |
| R7 preserve row data | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Pure helper, persistence, and rollback metadata tests |
| R8 persist final sibling order | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | RPC final order, duplicate order, dense order, and idempotency tests |
| R9 history event | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Persistence event, actor derivation, retry, and before/after metadata tests |
| R10 rollback on failure | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | DOM mutation failure, conflict, unexpected-result, and real DB rollback tests |
| R11 focus restoration | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Accessibility DOM tests, including virtualized fallback |
| R12 read-only unavailable | `04_REQUIREMENTS_SPECIFICATION.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md` | DOM disabled-state and action auth tests |
| R13 unsafe states unavailable | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `14_RISK_REGISTER.md` | Dirty/saving/search/facet/group and transformed-view tests |
| R14 same estimate and tab | `04_REQUIREMENTS_SPECIFICATION.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Action/RPC same-estimate, active-tab, and cross-tab rejection tests |
| R15 keyboard and touch fallback | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `11_IMPLEMENTATION_PLAN.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Move dialog accessibility, coarse-pointer action, and browser proof |
| R16 disabled during multiple selection | `02_FEATURE_BRIEF_AND_SCOPE.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Row table selection and drag-state tests |
| N1 no layout shift | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Row table and column model tests |
| N2 cheap tree dragover | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Existing tree dragover perf test |
| N3 virtualization stable | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Existing virtualization test |
| N4 server rejects bad requests | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Action/RPC validation, actor spoof, idempotency, and privilege-envelope tests |
| N5 no new dependency | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Package diff review |
| N6 logic tested below UI | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `12_TEST_AND_VALIDATION_STRATEGY.md` | Pure helper test |
| N7 browser proof only when needed | `12_TEST_AND_VALIDATION_STRATEGY.md`, `17_FINAL_READINESS_REVIEW.md` | Mandatory focused e2e/browser proof for geometry |
| N8 touch target strategy | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `11_IMPLEMENTATION_PLAN.md`, `14_RISK_REGISTER.md` | Coarse-pointer action and no-overlap DOM tests |
| N9 transactional atomicity | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | RPC transaction, partial-result, and rollback/invalidation tests |
