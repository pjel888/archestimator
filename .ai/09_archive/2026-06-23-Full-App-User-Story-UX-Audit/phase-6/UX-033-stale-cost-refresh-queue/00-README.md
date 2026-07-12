# UX-033: Stale Cost Refresh Queue

**Date:** 2026-06-23
**Issue ID:** UX-033
**Implementation Unit:** IU-17 Library supplier/cost governance
**Priority:** P1 (Medium)
**Conflict Group:** Library/cost/storage (Library lead)
**Targeted Verification:** TV-LIBRARY-SOURCING
**Decision Gate:** DEC-UX-033-SUPPLIER-INTAKE (`Accepted as lightweight first step`)

## Summary

Supplier/vendor/cost-source stewardship is metadata-heavy but workflow-light. This plan defines the curator-owned stale cost refresh queue and accepted-cost lock state before any external supplier intake is built.

The core problem is that supplier/brand/cost source fields exist in the component library without any external or curator workflow to refresh stale costs, reconcile conflicting sources, or lock an accepted cost. This undermines cost-library trust and can lead to wrong estimates when estimators rely on outdated pricing.

## Plan Pack Structure

| File | Purpose |
|---|---|
| `01-ISSUE.md` | Issue definition, severity, and user-story mapping |
| `02-CURRENT-STATE.md` | Current codebase reality with line-number citations |
| `03-TARGET.md` | Desired end state and acceptance criteria |
| `04-PLAN.md` | Implementation plan, sequencing, and rollback |
| `05-ACCEPTANCE.md` | Acceptance criteria and post-fix scenario |
| `06-VERIFICATION.md` | Verification commands and proof artifacts |
| `07-BLAST.md` | Blast radius, security, and data considerations |
| `08-DECISIONS.md` | Decision gates and guardrails |

## Related Issues

- `UX-034` (attachment review lifecycle) — same IU-17 unit, same conflict group
- `UX-013` (stale-source badge in estimate sheet) — secondary dependency; estimate sheet displays staleness, UX-033 governs the underlying data contract
- `LIB-004`, `LIB-005`, `LIB-006`, `COST-001` — canonical feature status rows

## Owner

Library lead (primary). Estimate lead secondary only if staleness contract changes.

## Status

Planning complete. Awaiting Phase 4 execution (new workflow foundations).

## Constraints

- Do not build external supplier intake; build curator-owned source review first.
- Must respect existing `cost_library_item_variant_cost_entries` schema.
- Must use existing `cost_library_cost_review_status` enum (proposed/needs_review/accepted/rejected/superseded).
- Must not break existing estimate-sheet stale-source badge display.
- Must be reversible: no destructive schema changes without rollback plan.

## Context References

- `ux-logistical-errors-and-fixes.md` line 41: UX-033 row
- `02-implementation-decomposition.md` lines 38, 78: IU-17 mapping
- `03-sequencing-dependencies-and-conflicts.md` lines 15, 26, 41: Phase 4, dependency graph, conflict group
- `09-decision-ledger.md` line 23: DEC-UX-033-SUPPLIER-INTAKE
- `post-fix-scenario-tests.md` line 51: UX-033 test scenario
- `canonical-feature-status.csv` lines 80-84: LIB-004, LIB-005, LIB-006, COST-001

## Quick Start

1. Read `08-DECISIONS.md` first to confirm the decision gate is still open.
2. Read `02-CURRENT-STATE.md` to understand existing schema and code.
3. Read `04-PLAN.md` for implementation steps.
4. Execute Phase 4 work when conflict group lead assigns.

## References

- Audit pack: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/`
- Migration: `supabase/migrations/20260622143000_library_trust_governance.sql`
- Actions: `src/lib/component-library/actions.ts`
- Component card: `src/components/workshop/component-library/ComponentCard.tsx`
- Library manager: `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

## Verification Summary

- Type check: `bun run type-check`
- Lint: `bun run lint && bun run lint:design-system`
- Unit tests: `bun run test`
- DOM tests: `bun run test:dom`
- Targeted verification: `TV-LIBRARY-SOURCING`

## File Index

This README is the entry point. Read the numbered files in order for the full plan, or jump to the file matching your need:
- For issue definition and severity: `01-ISSUE.md`
- For current codebase reality: `02-CURRENT-STATE.md`
- For target state: `03-TARGET.md`
- For implementation steps: `04-PLAN.md`
- For acceptance criteria: `05-ACCEPTANCE.md`
- For verification commands: `06-VERIFICATION.md`
- For blast radius: `07-BLAST.md`
- For decision gates: `08-DECISIONS.md`

## Contact

Library lead owns this plan. Questions go to the Library/cost/storage conflict group.

## Notes

This plan is part of the 2026-06-23 Full App User Story UX Audit plan pack.
