# UX-022 Share Recovery Copy

> **Issue ID:** UX-022
> **Slug:** share-recovery-copy
> **Implementation Unit:** IU-11 (Publication/share lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Shared links
> **Scope Posture:** Existing surface/security
> **Conflict Group:** Publication/share recipient
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-022** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Expired, revoked, invalid, or password-locked share links can strand recipients without enough recovery copy.

### Best Fix

Add expired/revoked/request-new-link copy, lockout timer, and owner contact CTA.

### Post-Fix Scenario (the win)

Recipient knows whether to wait, retry, or ask for a fresh link.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-SHARE-RECIPIENT)
- **Parent index:** [`../00-README-INDEX.md`](../../00-README-INDEX.md)
- **Loop ledger:** [`../LOOP_LEDGER.md`](../../LOOP_LEDGER.md)

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

**As a** shared links user, **I want** add expired/revoked/request-new-link copy, lockout timer, and owner contact cta, **so that** recipient knows whether to wait, retry, or ask for a fresh link.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Shared links |
| Evidence | PUB-001, PUB-002, SHARE-003, SHARE-004. |
| Priority | P0 |
| Implementation Unit | IU-11 |
| Conflict Group | Publication/share recipient |
| Verification IDs | TV-SHARE-RECIPIENT |
| Source code likely affected | `src/app/share/[token]/, src/components/share/, src/lib/publication/, src/app/api/share/[token]/` |
