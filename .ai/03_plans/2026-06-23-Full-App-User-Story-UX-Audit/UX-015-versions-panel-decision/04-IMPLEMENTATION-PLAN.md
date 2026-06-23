# UX-015 — Implementation Plan

Date: 2026-06-23
Owner lane: **IU-07 (Proposal/export)** | Phase: **1** | Scope: **Dormant / no Wave 1 code**

## Pre-Implementation Gates

- [ ] Read 01-ISSUE-DEFINITION, 02-CURRENT-STATE-ANALYSIS, 03-TARGET-EXPERIENCE.
- [ ] Verified cited paths exist.
- [ ] Conflict group **Estimate sheet (secondary)** has no in-flight change.
- [ ] Decision gate **DEC-UX-015-VERSIONS (Accepted dormant posture)** is resolved.
- [ ] Confirm no newer beta recovery objective supersedes the dormant posture.
- [ ] Targeted verification IDs confirmed: **TV-ESTIMATE-SHEET**.

---

## Wave-Ordered Task List

### Wave 0 — Discovery (no code change)

- [ ] Read every cited path in 02-CURRENT-STATE-ANALYSIS.
- [ ] Grep for existing callers/consumers.
- [ ] Glob for existing tests covering the surface.
- [ ] Document any drift from canonical audit.

### Wave 1 — Dormant Guard Proof

- [ ] Confirm existing named-version dormant guards remain in source/tests.
- [ ] Confirm no full Versions panel or compare/restore workflow is introduced for Wave 1.
- [ ] Capture source/test evidence to 06-VERIFICATION-AND-PROOF if this issue is audited.

### Wave 2 — Later Recovery Slice Only If Reauthorized

- [ ] Do not edit version UI for Wave 1.
- [ ] If a newer decision explicitly tests recovery, limit scope to activity/history discoverability and restore-as-copy explanatory copy.
- [ ] Do not add version schema, compare UI, restore mutation, or full Versions panel without a new migration/RLS/test plan.

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
| (none for Wave 1) | Named versions remain dormant | 1 |

---

## Validation Gate

Complete when:

- [ ] All Wave 0–4 checkboxes checked.
- [ ] Every scenario in 05-ACCEPTANCE-CRITERIA reflects dormant/no-code Wave 1 posture or a newer explicit recovery decision.
- [ ] No new `lsp_diagnostics` errors.
- [ ] `../LOOP_LEDGER.md` records completion.

---

## Linkage

- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
