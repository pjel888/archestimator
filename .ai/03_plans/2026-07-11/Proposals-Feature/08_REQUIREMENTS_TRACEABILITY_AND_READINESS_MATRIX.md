# 08 — Requirements Traceability and Readiness Matrix

---

## 1. Requirements Inventory

| ID | Type | Requirement | Source | Unit IDs | Criterion IDs | completion_role |
|---|---|---|---|---|---|---|
| REQ-001 | Functional | Proposals inbox uses WorkshopCollectionLayout (search + toolbar + tabs + content shell) matching projects page | User directive | UNIT-001 | AC-001 | CORE |
| REQ-002 | Functional | ProposalCard component displays proposal-specific metadata in glass-card visual language | User directive | UNIT-002 | AC-002 | CORE |
| REQ-003 | Functional | Status tabs (All/New/Opened/Decision/Expired/Revoked), instant search, sort dropdowns, view-mode toggle | User directive | UNIT-003 | AC-003 | CORE |
| REQ-004 | Functional | Optional grouping by workspace or status | User directive | UNIT-004 | AC-004 | CORE |
| REQ-005 | Functional | RecipientProposalRow enriched with client_name for richer card display | Audit finding | UNIT-005 | AC-005 | CORE |
| REQ-006 | Functional | Skeleton, empty states, error states match projects page patterns | User directive | UNIT-006 | AC-006 | CORE |
| REQ-007 | Functional | Share/review surface audited for gaps with documented findings | Audit scope | UNIT-007 | AC-007 | CORE |
| REQ-008 | Functional | Publisher flow audited for correctness with documented findings | Audit scope | UNIT-008 | AC-008 | CORE |
| REQ-009 | Functional | XLSX export pipeline audited for edge cases with documented findings | Audit scope | UNIT-009 | AC-009 | CORE |
| REQ-010 | Functional | Stale plans reconciled; current-state.md updated | Audit scope | UNIT-010 | AC-010 | CORE |
| UX-001 | UX | Inbox layout visually consistent with projects page | User directive | UNIT-001 | AC-001 | CORE |
| UX-002 | UX | Proposal cards show status, decision, expiry, sender, version, workspace, project name | User directive | UNIT-002 | AC-002 | CORE |
| UX-003 | UX | Search, tabs, sort, view modes are accessible (keyboard, ARIA, non-color cues) | A11y standard | UNIT-003 | AC-003 | CORE |
| UX-004 | UX | Grouping is optional and persists to localStorage | UX pattern | UNIT-004 | AC-004 | CORE |
| UX-005 | UX | Empty states distinguish "no proposals" from "no search results" from "no status results" | UX pattern | UNIT-006 | AC-006 | CORE |
| UX-006 | UX | Loading skeleton mirrors card grid layout | UX pattern | UNIT-006 | AC-006 | CORE |
| DATA-001 | Data | RecipientProposalRow includes client_name; query preserves credential-free guarantee | Audit finding | UNIT-005 | AC-005 | CORE |
| DATA-002 | Data | XLSX export pipeline audited for currency, edge cases, audience policy | Audit finding | UNIT-009 | AC-009 | CORE |
| ARCH-001 | Architecture | TanStack Query preserved (not switched to RSC-only) | DEC-AUTO-002 | UNIT-001 | AC-001 | CORE |
| SEC-001 | Security | No token hashes, encrypted tokens, or password hashes in recipient-visible data | Privacy invariant | UNIT-005 | AC-005 | CORE |
| OPS-001 | Operations | Stale plans reconciled; current-state.md reflects proposals redesign | Doc hygiene | UNIT-010 | AC-010 | CORE |

---

## 2. Acceptance Criteria

| ID | Requirement IDs | Criterion | test_requirement | test_trigger | test_rationale | Unit IDs |
|---|---|---|---|---|---|---|
| AC-001 | REQ-001, UX-001, ARCH-001 | `ProposalsPageClient` renders `WorkshopCollectionLayout` with search, toolbar, and content area; TanStack Query preserved | NOT_REQUIRED | NONE | UI shell adoption verifiable by source inspection + type check | UNIT-001 |
| AC-002 | REQ-002, UX-002 | `ProposalCard` renders proposal-specific metadata (status chip, decision chip, expiry, sender, version, workspace, project name, sent date, last activity) in glass-card visual; uses `Button` primitive | NOT_REQUIRED | NONE | Component rendering verifiable by source inspection + type check | UNIT-002 |
| AC-003 | REQ-003, UX-003 | Status tabs, search (with `useDeferredValue`), sort dropdowns, view-mode toggle are wired and functional; keyboard accessible | NOT_REQUIRED | NONE | Filtering/sorting logic verifiable by source inspection; reducer is pure function | UNIT-003 |
| AC-004 | REQ-004, UX-004 | Group-by dropdown renders `ProposalGroupSection` collapsible sections; persisted to localStorage | NOT_REQUIRED | NONE | Grouping logic verifiable by source inspection | UNIT-004 |
| AC-005 | REQ-005, DATA-001, SEC-001 | `RecipientProposalRow` includes `clientName`; query SELECT includes `project.client_name`; credential-free repository test passes | TARGETED | MVP_CRITICAL_INVARIANT | The credential-free assertion is a named MVP-critical security invariant. The existing `recipient-proposals-repository.test.ts` is the cheapest decisive proof that no sensitive columns were added. | UNIT-005 |
| AC-006 | REQ-006, UX-005, UX-006 | Skeleton mirrors card grid; empty states (genuine, search, status) are glass cards with `Button` primitive; error state matches projects pattern | NOT_REQUIRED | NONE | State components verifiable by source inspection | UNIT-006 |
| AC-007 | REQ-007 | Share/review surface audited; findings documented with file:line references | NOT_REQUIRED | NONE | Audit findings are documentation, not code | UNIT-007 |
| AC-008 | REQ-008 | Publisher flow audited; `download_attempt_blocked` verified absent; findings documented | NOT_REQUIRED | NONE | Audit findings are documentation; `rg` proves absence | UNIT-008 |
| AC-009 | REQ-009, DATA-002 | XLSX export pipeline audited; currency handling, edge cases, audience policy findings documented with severity | NOT_REQUIRED | NONE | Audit findings are documentation | UNIT-009 |
| AC-010 | REQ-010, OPS-001 | 2026-07-07 plans reconciled; current-state.md updated; reconciliation documented in ledger | NOT_REQUIRED | NONE | Reconciliation is documentation | UNIT-010 |

---

## 3. Readiness Matrix

| Field | Status | Evidence | Missing/contradicted | Repair or AUTH packet |
|---|---|---|---|---|
| Intent and scope | PASS | User directive + audit scope in README.md, 02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md | — | — |
| Source authority/freshness | PASS | All sources inspected 2026-07-11; stale plans identified in 01_AUDIT_AND_CURRENT_STATE.md | — | — |
| Requirements/traceability | PASS | 10 REQ + 6 UX + 2 DATA + 1 ARCH + 1 SEC + 1 OPS, all traced to units and criteria | — | — |
| Current-state grounding | PASS | 01_AUDIT_AND_CURRENT_STATE.md with file:line references | — | — |
| Decisions closed | PASS | 6 DEC-AUTO-* in 07_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md; no open decisions | — | — |
| Execution DAG/units | PASS | 10 units in 4 dependency layers in 06_IMPLEMENTATION_PLAN.md | — | — |
| UX/accessibility | PASS | 03_TARGET_UX_UI_DESIGN.md covers journeys, states, a11y, responsive | — | — |
| Architecture/data/contracts | PASS | 04_DATA_API_AND_REPOSITORY_DESIGN.md covers schema, query, types, export | — | — |
| Security/privacy | PASS | 05_SECURITY_PRIVACY_AND_DATA_INTEGRITY.md covers credentials, anti-enumeration, audience policy | — | — |
| Performance/reliability | PASS | 04_DATA_API_AND_REPOSITORY_DESIGN.md §7 covers query, client, export perf | — | — |
| Test decision / selected adversarial QA | PASS | AC-005 uses TARGETED+MVP_CRITICAL_INVARIANT (existing test); all others NOT_REQUIRED | — | — |
| Operations/rollout/rollback | N/A | Planning pack; no rollout needed | — | — |
| Completion audit | PASS | All requirements traced; no orphan units/criteria/decisions | — | — |

---

## 4. Test Index

| Test ID | Criterion ID | Description | Execution mode | Path | Command |
|---|---|---|---|---|---|
| TEST-001 | AC-005 | Credential-free recipient-proposals repository assertion | EXISTING_READ_ONLY | `tests/vitest/recipient-proposals-repository.test.ts` (verify path during implementation) | `bun vitest run tests/vitest/recipient-proposals-repository.test.ts` |

**Note:** TEST-001 is selected under `CHEAPEST_DECISIVE_EXISTING_TEST`. It runs exactly one already-existing focused test with no test creation, expansion, repair, deletion, or skip. The exact path must be verified during implementation by searching for the test file.

---

## 5. Evidence Index

| Evidence ID | Claim IDs | Status | Evidence class | Artifact path |
|---|---|---|---|---|
| EVID-001 | REQ-001, UX-001, ARCH-001, AC-001 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-001 proof) |
| EVID-002 | REQ-002, UX-002, AC-002 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-002 proof) |
| EVID-003 | REQ-003, UX-003, AC-003 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-003 proof) |
| EVID-004 | REQ-004, UX-004, AC-004 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-004 proof) |
| EVID-005 | REQ-005, DATA-001, SEC-001, AC-005 | PLANNED | automated-test | 06_IMPLEMENTATION_PLAN.md (UNIT-005 proof — TEST-001) |
| EVID-006 | REQ-006, UX-005, UX-006, AC-006 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-006 proof) |
| EVID-007 | REQ-007, AC-007 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-007 proof) |
| EVID-008 | REQ-008, AC-008 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-008 proof) |
| EVID-009 | REQ-009, DATA-002, AC-009 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-009 proof) |
| EVID-010 | REQ-010, OPS-001, AC-010 | PLANNED | local-only | 06_IMPLEMENTATION_PLAN.md (UNIT-010 proof) |

All evidence is `PLANNED` — this is a planning pack. Evidence will be `COLLECTED`/`PASS` during implementation.

---

## 6. Source Index

| Source ID | Status | Path/URL | Authority | Freshness | Affected IDs |
|---|---|---|---|---|---|
| SRC-001 | CURRENT | `src/components/workshop/proposals-page-client.tsx` | Implementation | 2026-07-11 | REQ-001, ARCH-001 |
| SRC-002 | CURRENT | `src/components/workshop/proposals-page/ProposalRow.tsx` | Implementation | 2026-07-11 | REQ-002, UX-002 |
| SRC-003 | CURRENT | `src/lib/repositories/recipient-proposals-repository.ts` | Implementation | 2026-07-11 | REQ-005, DATA-001, SEC-001 |
| SRC-004 | CURRENT | `src/components/workshop/WorkshopCollectionLayout.tsx` | Implementation | 2026-07-11 | REQ-001, UX-001 |
| SRC-005 | CURRENT | `src/components/workshop/projects-page-client.tsx` | Implementation (reference) | 2026-07-11 | REQ-001, UX-001 |
| SRC-006 | CURRENT | `src/components/workshop/LiveProjectCard.tsx` | Implementation (reference) | 2026-07-11 | REQ-002, UX-002 |
| SRC-007 | CURRENT | `src/lib/proposal-export/` (6 files) | Implementation | 2026-07-11 | REQ-009, DATA-002 |
| SRC-008 | CURRENT | `src/lib/publication/actions.ts` | Implementation | 2026-07-11 | REQ-008 |
| SRC-009 | CURRENT | `src/app/share/[token]/` | Implementation | 2026-07-11 | REQ-007 |
| SRC-010 | CURRENT | `.ai/06_specs/proposal-package-system.md` | Spec | 2026-05-29 | REQ-007, REQ-008, REQ-009 |
| SRC-011 | CURRENT | `DESIGN.md` (root) | Design guide (alpha) | 2026-07-11 | UX-001..UX-006 |
| SRC-012 | CURRENT | `.ai/03_plans/2026-07-07/2026-07-07-recipient-proposals-inbox-ia-recovery/` | Plan (CONDITIONALLY_READY) | 2026-07-07 | REQ-010, OPS-001 |
| SRC-013 | CURRENT | `.ai/09_archive/store/2026-07-11-Publisher-And-Shared-Pages-complete/` | Archived plan (ACHIEVED) | 2026-07-11 | REQ-007, REQ-008 |
| SRC-014 | CURRENT | `.ai/01_roadmap/14-owner-decisions.md` | Frozen decisions | 2026-05-30 | Non-goals (PDF, immutable snapshots) |
| SRC-015 | CURRENT | migrations/0014, 0066 | D1 schema | 2026-07-11 | DATA-001, SEC-001 |
