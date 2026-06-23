# UX-032 — Implementation Plan

Date: 2026-06-23
Owner lane: **IU-16 (PM/owner governance)** | Phase: **4** | Scope: **New workflow**

## Pre-Implementation Gates

- [ ] Read 01-ISSUE-DEFINITION, 02-CURRENT-STATE-ANALYSIS, 03-TARGET-EXPERIENCE.
- [ ] Verified cited paths exist.
- [ ] Conflict group **Project/dashboard/readiness** has no in-flight change.
- [ ] Decision gate **DEC-UX-032-OWNER-READINESS (Accepted as lightweight first step)** is resolved.
- [ ] Targeted verification IDs confirmed: **TV-PROJECT-DASHBOARD, TV-SHARE-RECIPIENT**.

---

## Wave-Ordered Task List

### Wave 0 — Discovery (no code change)

- [ ] Read every cited path in 02-CURRENT-STATE-ANALYSIS.
- [ ] Grep for existing callers/consumers.
- [ ] Glob for existing tests covering the surface.
- [ ] Document any drift from canonical audit.

### Wave 1 — Test Scaffolding (RED)

- [ ] Add failing test reproducing: PM readiness, actor approvals, owner margin alerts, and final-package lifecycle audit are under-modeled.
- [ ] Run; confirm RED for the right reason.
- [ ] Capture RED output to 06-VERIFICATION-AND-PROOF.

### Wave 2 — Implementation (GREEN)

File-by-file changes:

- [ ] Edit `src/app/workshop/projects/[projectId]/`
- [ ] Edit `src/lib/projects/`
- [ ] Edit `src/lib/publication/`
- [ ] Edit `src/lib/estimates/`

For each file:

- [ ] Read the file completely before editing.
- [ ] Apply the smallest change that flips Wave 1's test to GREEN.
- [ ] Run the test; confirm GREEN.
- [ ] Run `lsp_diagnostics` on the changed file; confirm no new errors.

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
| `src/app/workshop/projects/[projectId]/` | Apply fix | 2 |
| `src/lib/projects/` | Apply fix | 2 |
| `src/lib/publication/` | Apply fix | 2 |
| `src/lib/estimates/` | Apply fix | 2 |

---

## Validation Gate

Complete when:

- [ ] All Wave 0–4 checkboxes checked.
- [ ] Every scenario in 05-ACCEPTANCE-CRITERIA PASSES with RED→GREEN proof + real-surface artifact.
- [ ] No new `lsp_diagnostics` errors.
- [ ] `../LOOP_LEDGER.md` records completion.

---

## Linkage

- [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md)
- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
