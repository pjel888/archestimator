# UX-031 — Implementation Plan

Date: 2026-06-23
Owner lane: **IU-15 (Field/collaboration)** | Phase: **4** | Scope: **Deferred / no Wave 1 code**

## Pre-Implementation Gates

- [ ] Read 01-ISSUE-DEFINITION, 02-CURRENT-STATE-ANALYSIS, 03-TARGET-EXPERIENCE.
- [ ] Verified cited paths exist.
- [ ] Conflict group **Collaboration/access paths** has no in-flight change.
- [ ] Decision gate **DEC-UX-031-FIELD-WORKFLOWS (later shared-link field package) + DEC-UX-BETA-COHORT (Wave 1 estimator/PM-only)** is recorded.
- [ ] Confirm a newer cohort-expansion decision exists before any implementation work.
- [ ] Targeted verification IDs confirmed: **TV-FIELD-HANDOFF (deferred), TV-ACCESS-PATH-CONTRACT (future when cohort expands)**.

---

## Wave-Ordered Task List

### Wave 0 — Discovery (no code change)

- [ ] Read every cited path in 02-CURRENT-STATE-ANALYSIS.
- [ ] Grep for existing callers/consumers.
- [ ] Glob for existing tests covering the surface.
- [ ] Document any drift from canonical audit.

### Wave 1 — Deferred Scope Proof

- [ ] Confirm this issue remains P2/deferred while Wave 1 cohort is estimator/PM-only.
- [ ] Confirm no new contractor/builder/field roles, invite-role changes, RLS changes, or field package code are planned for Wave 1.
- [ ] Capture this decision evidence to 06-VERIFICATION-AND-PROOF if audited.

### Wave 2 — Future Implementation Only After Cohort Expansion

- [ ] Do not edit collaboration/publication/share/invite code for Wave 1 field package work.
- [ ] If cohort expansion is accepted later, define shared-link field package contents, allowed actions, recipient permissions, audit trail, rollback, and RBAC/RLS proof before code.
- [ ] Add contract/component tests only after the future slice is reactivated.

### Wave 3 — Regression Sweep

- [ ] Run the full test suite for the affected surface.
- [ ] Run `bun run lint` on changed files.
- [ ] Run `bun run type-check` if any TypeScript file changed.
- [ ] If UI change, run focused browser check per 06-VERIFICATION.

### Wave 4 — Acceptance Pass-Through

- [ ] Walk through each scenario in 05-ACCEPTANCE-CRITERIA.
- [ ] Capture evidence per 06-VERIFICATION.

---

## Files Expected To Change

| Path | Why | Wave |
|---|---|---|
| (none for Wave 1) | Shared-link field package is deferred until cohort expansion | 1 |

---

## Validation Gate

Complete when:

- [ ] All Wave 0–4 checkboxes checked.
- [ ] Every scenario in 05-ACCEPTANCE-CRITERIA reflects deferred/no-code Wave 1 posture or a newer cohort-expansion decision.
- [ ] No new `lsp_diagnostics` errors.
- [ ] `../LOOP_LEDGER.md` records completion.

---

## Linkage

- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
