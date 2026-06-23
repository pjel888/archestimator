# UX-001 Public Copy And Legal Readiness

> **Issue ID:** UX-001  
> **Slug:** public-copy-readiness  
> **Implementation Unit:** IU-01  
> **Priority:** P1  
> **Severity:** Medium  
> **Area:** Public site  
> **Scope Posture:** Copy/state hardening  
> **Status:** planned  
> **Date:** 2026-06-23  

---

## One-Page Overview

This plan addresses the risk that public marketing, pricing, or feature copy on the Archestimator site can drift ahead of the actual closed-beta capability that is implemented. The fix keeps feature maturity labels synchronized with the canonical claims data and requires a route-copy readiness review before any public update.

After this fix, a visitor sees implemented, beta, and planned claims clearly separated. No public page promises a feature that the codebase cannot yet deliver.

---

## Source Links

- **Canonical audit:** [`.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md) line 9
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md) line 22, 46
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md) line 44 (conflict group)
- **Content contracts:** [`04-ux-state-accessibility-and-content-contracts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md) line 9, 60-75
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) line 19 (`TV-PUBLIC`)
- **Decisions:** [`09-decision-ledger.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md)

---

## Folder Index

| # | File | Purpose |
|---|---|---|
| 00 | [`00-README.md`](00-README.md) | This overview |
| 01 | [`01-ISSUE-DEFINITION.md`](01-ISSUE-DEFINITION.md) | Full problem statement, evidence, current error |
| 02 | [`02-CURRENT-STATE-ANALYSIS.md`](02-CURRENT-STATE-ANALYSIS.md) | Codebase current state with real src/ paths |
| 03 | [`03-TARGET-EXPERIENCE.md`](03-TARGET-EXPERIENCE.md) | Target UX, copy strings, state matrix |
| 04 | [`04-IMPLEMENTATION-PLAN.md`](04-IMPLEMENTATION-PLAN.md) | Concrete steps, file-by-file changes |
| 05 | [`05-ACCEPTANCE-CRITERIA.md`](05-ACCEPTANCE-CRITERIA.md) | Given/When/Then scenarios |
| 06 | [`06-VERIFICATION-AND-PROOF.md`](06-VERIFICATION-AND-PROOF.md) | TV-PUBLIC and TV-OPS-SUPPORT proof surfaces |
| 07 | [`07-BLAST-RADIUS-AND-ROLLBACK.md`](07-BLAST-RADIUS-AND-ROLLBACK.md) | Affected files, risks, rollback |
| 08 | [`08-DECISIONS-AND-DEPENDENCIES.md`](08-DECISIONS-AND-DEPENDENCIES.md) | Conflict group, dependencies, decision gates |

---

## Golden-Path User Story

> **As an** anonymous visitor browsing the Archestimator public site,  
> **I want** every feature claim to carry a visible maturity label (Live, Building, Planned),  
> **So that** I know exactly what ships today and what is on the roadmap,  
> **And** I am never misled into expecting a capability that is not yet implemented.

---

## Conflict Group

**Copy/settings/notification read-only surfaces** — includes UX-001, UX-004, UX-005, UX-024, UX-025, UX-026, UX-027.

Do not implement concurrently with any change to the same shared copy string, settings role gate, global toast namespace, or feedback fallback/queue payload shape without the copy/readiness lead.

---

## Verification IDs

- `TV-PUBLIC` — public claims match beta maturity; legal/contact routes work.
- `TV-OPS-SUPPORT` — provider/operator proof runbook (legal owner review).

---

## Quick Facts

| Fact | Value |
|---|---|
| Phase | Phase 1 (Quick existing-surface hardening) |
| Owner lane | Public/legal |
| Blast radius | Low — copy-only, no data/RLS changes |
| Rollback | Revert copy strings; no migration needed |
| Decision-gated? | No — can execute immediately |
| Next action after plan | Add public copy readiness checklist and text-contract tests |
