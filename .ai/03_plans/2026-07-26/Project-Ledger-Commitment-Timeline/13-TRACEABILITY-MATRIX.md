# Traceability Matrix

## Requirements to units and acceptance

| Requirement | Summary | Units | Acceptance |
|---|---|---|---|
| REQ-001 | Project-owned ledger architecture | UNIT-001, UNIT-002, UNIT-008 | AC-001 |
| REQ-002 | Audience-scoped portals | UNIT-002, UNIT-009, UNIT-010 | AC-002, AC-009 |
| REQ-003 | Commitment Timeline | UNIT-008, UNIT-009 | AC-008, AC-009, AC-015 |
| REQ-004 | Client change requests | UNIT-002, UNIT-003, UNIT-004, UNIT-009, UNIT-010 | AC-003, AC-011 |
| REQ-005 | Project artifacts | UNIT-002, UNIT-003, UNIT-005, UNIT-009 | AC-004, AC-011 |
| REQ-006 | Multi-artifact issue packages | UNIT-002, UNIT-005 | AC-005 |
| REQ-007 | Deterministic change logs | UNIT-002, UNIT-006 | AC-006 |
| REQ-008 | AI narrative assistance | UNIT-006, UNIT-013 | AC-014 |
| REQ-009 | Correct baseline semantics | UNIT-002, UNIT-007 | AC-007 |
| REQ-010 | Role/authority separation | UNIT-002, UNIT-010 | AC-010 |
| REQ-011 | Audience projection integrity | UNIT-002, UNIT-008, UNIT-009, UNIT-010 | AC-002, AC-009 |
| REQ-012 | Workspace command center | UNIT-011 | AC-012 |
| REQ-013 | Legacy cutover | UNIT-001, UNIT-011, UNIT-012 | AC-013 |
| REQ-014 | Security/retention/evidence | UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-009, UNIT-010, UNIT-012, UNIT-014 | AC-011, AC-016 |
| REQ-015 | Accessibility/performance/recovery | UNIT-003, UNIT-008, UNIT-009, UNIT-011, UNIT-014 | AC-015 |
| REQ-016 | Q2 evidence | UNIT-014 | AC-016 |

## Units to principal artifacts

| Unit | Principal files/families |
|---|---|
| UNIT-001 | current Client Portal/publication/activity/upload source and characterization tests |
| UNIT-002 | `migrations/`, contracts, policy enums, migration tests |
| UNIT-003 | `src/lib/uploads/**`, `src/lib/project-artifacts/**`, artifact APIs/viewer |
| UNIT-004 | `src/lib/change-requests/**`, public request APIs, request UI |
| UNIT-005 | issue draft/package services, composer, publish service, issue builder |
| UNIT-006 | private source projection, change-set engine, diff UI |
| UNIT-007 | issue builder, decision service, baseline service, baseline UI |
| UNIT-008 | project ledger repository/event service, `/timeline`, internal UI |
| UNIT-009 | public repository/handlers, `ClientPortalShell`, public timeline/artifact/request |
| UNIT-010 | contracts/policy/recipient manager/exposure/role preview |
| UNIT-011 | `/workshop/publisher`, modern roster repository, onboarding |
| UNIT-012 | migration/backfill scripts, legacy mapping/write-freeze, zero-write checks |
| UNIT-013 | AI draft service, schema, audit/provenance, narrative UI |
| UNIT-014 | focused/aggregate evidence, browser journeys, reviews, final manifest |

## Acceptance criteria to evidence

| Acceptance | Required evidence |
|---|---|
| AC-001 | D1 FK/ownership tests; project ledger repository tests; cross-project denial |
| AC-002 | two-portal access matrix; hidden counts/names; exposure policy tests |
| AC-003 | public request browser + service state tests; non-authorization copy |
| AC-004 | artifact version immutability; issue retains old version; cleanup denial |
| AC-005 | issue package repository/publish test; manifest/hash proof |
| AC-006 | deterministic diff unit/property/mutation; total reconciliation |
| AC-007 | decision/baseline concurrency and state-transition tests |
| AC-008 | internal timeline browser; curated vs All activity comparison |
| AC-009 | public timeline browser; deep links; role filtering |
| AC-010 | role/domain/authority matrix; required approver policy |
| AC-011 | upload Workers integration; scan/magic/range/IDOR/cleanup |
| AC-012 | modern commitment-center repository and browser; no legacy authoring |
| AC-013 | legacy migration replay/public link/zero-write evidence |
| AC-014 | AI invalid/stale/hallucination boundary; deterministic fallback |
| AC-015 | performance, mobile, keyboard, zoom, reduced motion, browser matrix |
| AC-016 | Q2 aggregate manifest; independent quality/security review |

## Risks to mitigations

| Risk | Mitigation units |
|---|---|
| RISK-001 baseline corruption | UNIT-001, UNIT-002, UNIT-007, UNIT-014 |
| RISK-002 portal leakage | UNIT-002, UNIT-009, UNIT-010, UNIT-014 |
| RISK-003 upload attack | UNIT-003, UNIT-010, UNIT-014 |
| RISK-004 false contractual confidence | UNIT-004, UNIT-005, UNIT-006, UNIT-013 |
| RISK-005 diff misclassification | UNIT-001, UNIT-002, UNIT-006 |
| RISK-006 D1 limits | UNIT-005, UNIT-006, UNIT-014 |
| RISK-007 timeline inconsistency | UNIT-002, UNIT-008, UNIT-014 |
| RISK-008 migration breakage | UNIT-001, UNIT-012, UNIT-014 |
| RISK-009 surface confusion | UNIT-008, UNIT-009, UNIT-011 |
| RISK-010 PDF compatibility | UNIT-003, UNIT-014 |
| RISK-011 recipient abuse | UNIT-003, UNIT-004, UNIT-010, UNIT-014 |
| RISK-012 AI hallucination | UNIT-006, UNIT-013, UNIT-014 |

## Critical journeys to requirements

| Journey | Requirements |
|---|---|
| Initial estimate → approval → Baseline 1 | REQ-001, REQ-006, REQ-009, REQ-010 |
| Client request with evidence | REQ-002, REQ-004, REQ-005, REQ-011, REQ-014 |
| Revision package and change log | REQ-006, REQ-007, REQ-008 |
| Changes requested with baseline preserved | REQ-004, REQ-009 |
| Multiple portal confidentiality | REQ-002, REQ-010, REQ-011, REQ-014 |
| Workspace action queue | REQ-012 |
| Legacy shared link migration | REQ-013 |
| Large PDF review | REQ-005, REQ-014, REQ-015 |

## Public claims guard

| Implementation fact | Safe product language | Do not claim |
|---|---|---|
| Content-hashed issued package | exact issued version / immutable issued content | legally binding contract |
| Signer/role/email/time receipt | attributable decision record | qualified electronic signature |
| Timeline and evidence | defensible, explainable record | guaranteed legal proof |
| Deterministic diff | structured change log | predicts every consequence |
| AI reviewed narrative | AI-assisted revision draft | AI verified scope |
| Download disabled UI | download not offered | impossible to copy |
| Retention restrictions | retained according to policy | permanent without qualification |
