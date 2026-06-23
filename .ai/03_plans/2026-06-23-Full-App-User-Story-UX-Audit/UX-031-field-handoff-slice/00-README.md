# UX-031 Field Handoff Slice

> **Issue ID:** UX-031
> **Slug:** field-handoff-slice
> **Implementation Unit:** IU-15 (Field/collaboration lane)
> **Priority:** P2
> **Severity:** Medium
> **Area:** Contractor/builder and field operations
> **Scope Posture:** Deferred / later slice selected
> **Conflict Group:** Collaboration/access paths
> **Phase:** 4
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-031** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Contractor/builder and field-operator handoff workflows are implied by collaboration/share primitives but not mapped to explicit access-path user journeys.

### Best Fix

Shared-link field package is the selected later slice, but Wave 1 closed beta is
estimator/PM-only. Preserve the future-slice sketch and do not add field package
code, new roles, invite-role changes, or RLS changes in Wave 1.

### Post-Fix Scenario (the win)

After cohort expansion, a field recipient can receive a scoped shared-link field
package with explicit permissions, audit trail, and rollback proof.

### Decision Gate

**DEC-UX-031-FIELD-WORKFLOWS (later shared-link field package) + DEC-UX-BETA-COHORT (Wave 1 estimator/PM-only)** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-FIELD-HANDOFF deferred, TV-ACCESS-PATH-CONTRACT future)
- **Parent index:** [`../00-README-INDEX.md`](../00-README-INDEX.md)
- **Loop ledger:** [`../LOOP_LEDGER.md`](../LOOP_LEDGER.md)

---

## Folder File Index

| # | File | Purpose |
|---|---|---|
| 00 | [README.md](00-README.md) | This overview |
| 01 | [ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md) | Problem statement, evidence |
| 02 | [CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md) | Codebase current state |
| 03 | [TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md) | Target UX, copy, flows |
| 04 | [IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | Concrete steps, waves |
| 05 | [ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md) | Given/When/Then scenarios |
| 06 | [VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md) | TV IDs, test surfaces |
| 07 | [BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | Affected files, risks, rollback |
| 08 | [DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md) | Decisions, dependencies, conflict-group |

---

## Golden-Path User Story

**As a** future field recipient, **I want** the shared-link field package slice to be documented but deferred until the cohort expands, **so that** Wave 1 can prove estimator/PM estimating and proposal review without premature authz/RLS scope.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Contractor/builder and field operations |
| Evidence | Second-pass estimator/contractor persona report; collaboration and share paths exist but do not name contractor/builder or field-operator workflow semantics. |
| Priority | P2 |
| Implementation Unit | IU-15 |
| Conflict Group | Collaboration/access paths |
| Verification IDs | TV-FIELD-HANDOFF (deferred), TV-ACCESS-PATH-CONTRACT (future) |
| Source code likely affected | `src/lib/collaboration/, src/lib/publication/, src/app/invite/[token]/, src/app/share/[token]/` |
