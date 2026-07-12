# UX-012 — Implementation Plan

Date: 2026-06-23
Owner lane: **IU-06 (Estimates)** | Phase: **1** | Scope: **Existing surface/a11y**

## Pre-Implementation Gates

- [ ] Read 01-ISSUE-DEFINITION, 02-CURRENT-STATE-ANALYSIS, 03-TARGET-EXPERIENCE.
- [ ] Verified cited paths exist.
- [ ] Conflict group **Estimate sheet** has no in-flight change.
- [ ] No decision gate applies.
- [ ] Targeted verification IDs confirmed: **TV-ESTIMATE-SHEET**.

---

## Wave-Ordered Task List

### Wave 0 — Discovery (no code change)

- [ ] Read every cited path in 02-CURRENT-STATE-ANALYSIS.
- [ ] Grep for existing callers/consumers.
- [ ] Glob for existing tests covering the surface.
- [ ] Document any drift from canonical audit.

### Wave 1 — Test Scaffolding (RED)

- [ ] Add failing test reproducing: Accidental drag/drop reorder is high-sensitivity despite rollback/toast behavior.
- [ ] Run; confirm RED for the right reason.
- [ ] Capture RED output to 06-VERIFICATION-AND-PROOF.

### Wave 2 — Implementation (GREEN)

File-by-file changes:

- [ ] Edit `src/components/workshop/ (estimate tree DnD)`
- [ ] Edit `src/lib/domain/`
- [ ] Edit `src/hooks/use-estimate-query.ts`

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
| `src/components/workshop/ (estimate tree DnD)` | Apply fix | 2 |
| `src/lib/domain/` | Apply fix | 2 |
| `src/hooks/use-estimate-query.ts` | Apply fix | 2 |

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
