# UX-038 Operations Persona Split

> **Issue ID:** UX-038
> **Slug:** operations-persona-split
> **Implementation Unit:** IU-19 (Operations/provider lane)
> **Priority:** P0
> **Severity:** High
> **Area:** Operations personas
> **Scope Posture:** Provider/proof readiness, support workflow
> **Conflict Group:** Operations/provider
> **Phase:** 3
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-038** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Monitoring, provider readiness, legal/privacy, support, and launch operations are compressed into broad operator rows.

### Best Fix

Split operational personas and acceptance criteria by owner: incident, provider, privacy/legal, support triage, support response, and launch operations.

### Post-Fix Scenario (the win)

Each operator can see their proof obligation and stop condition before widening beta.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-OPS-SUPPORT, TV-OPS-MONITORING, TV-OPS-LEGAL)
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

**As a** operations personas user, **I want** split operational personas and acceptance criteria by owner: incident, provider, privacy/legal, support triage, support response, and launch operations, **so that** each operator can see their proof obligation and stop condition before widening beta.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | High |
| Area | Operations personas |
| Evidence | Second-pass admin/support/operator report. |
| Priority | P0 |
| Implementation Unit | IU-19 |
| Conflict Group | Operations/provider |
| Verification IDs | TV-OPS-SUPPORT, TV-OPS-MONITORING, TV-OPS-LEGAL |
| Source code likely affected | `package.json (launch scripts), scripts/ readiness checks, .ai/10_state/ operational runbooks` |

---

## Related Issues

- **UX-029** — Provider proof owners (same conflict group, same IU-19; UX-029 assigns providers to owners, UX-038 splits the operator personas who use those assignments).
- **UX-028** — QA route manifest (operations conflict group).
- **UX-039** — Notification campaign authoring (operations conflict group).
- **UX-040** — Admin repair workflow (support boundary).

## Risk If Not Fixed

- Launch proceeds without clear per-role accountability.
- Monitoring gaps are missed because "someone else was supposed to check."
- Legal exposure because terms/privacy review was assumed done by "ops."
- Support issues are dropped because triage and response are not separated.
- Launch operator cannot declare "go" because no stop condition is defined.

## Non-Goals

- Do not modify `src/` code.
- Do not modify `scripts/` code.
- Do not create new permission roles or database tables.
- Do not build a UI dashboard (markdown definitions are sufficient for closed beta).
- Do not claim personas are staffed without owner confirmation.
