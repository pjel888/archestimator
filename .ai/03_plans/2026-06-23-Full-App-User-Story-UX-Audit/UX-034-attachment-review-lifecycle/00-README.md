# UX-034: Attachment Review Lifecycle

**Date:** 2026-06-23
**Issue ID:** UX-034
**Implementation Unit:** IU-17 Library supplier/cost governance
**Priority:** P1 (Medium)
**Conflict Group:** Library/cost/storage (Library lead)
**Targeted Verification:** TV-LIBRARY-SOURCING
**Decision Gate:** DEC-UX-034-ATTACHMENT-APPROVAL (`Accepted as lightweight first step`)

## Summary

Component attachment/spec-sheet upload exists without explicit approval, version, or validation lifecycle. This plan defines the reviewed/current metadata and approve/reject flow before a full approval lifecycle is built.

The core problem is that uploaded PDF/XLS attachments are immediately visible without reviewer validation, version tracking, or variant applicability checks. This undermines spec-sheet trust and can lead to estimators using unapproved or wrong-revision attachments.

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

- `UX-033` (stale cost refresh queue) — same IU-17 unit, same conflict group
- `LIB-007` — canonical feature status row for attachment and spec-sheet version approval
- `UX-013` — stale-source badge in estimate sheet (secondary)

## Owner

Library lead (primary). Storage/provider lead secondary for file validation.

## Status

Planning complete. Awaiting Phase 4 execution (new workflow foundations).

## Constraints

- Must use existing `cost_library_attachment_review_status` enum (uploaded/approved/rejected/superseded).
- Must respect existing `component-attachments` storage bucket.
- Must not break existing upload API at `src/app/api/component-library/attachments/route.ts`.
- Must be reversible: no destructive schema changes without rollback plan.
- Add reviewed/current metadata before full approve/reject lifecycle UI.

## Context References

- `ux-logistical-errors-and-fixes.md` line 42: UX-034 row
- `02-implementation-decomposition.md` lines 38, 79: IU-17 mapping
- `03-sequencing-dependencies-and-conflicts.md` lines 15, 27, 41: Phase 4, dependency graph, conflict group
- `09-decision-ledger.md` line 24: DEC-UX-034-ATTACHMENT-APPROVAL
- `post-fix-scenario-tests.md` line 52: UX-034 test scenario
- `canonical-feature-status.csv` line 83: LIB-007
- `14-security-primitive-and-rls-binding.md` line 29: Component-library attachments RLS binding

## Quick Start

1. Read `08-DECISIONS.md` first to confirm the decision gate is still open.
2. Read `02-CURRENT-STATE.md` to understand existing attachment API and schema.
3. Read `04-PLAN.md` for implementation steps.
4. Execute Phase 4 work when conflict group lead assigns.

## References

- Audit pack: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/`
- Migration: `supabase/migrations/20260622143000_library_trust_governance.sql`
- Attachment API: `src/app/api/component-library/attachments/route.ts`
- Component manager: `src/components/workshop/component-library-manager/AddComponentModal.tsx`

## Verification Summary

- Type check: `bun run type-check`
- Lint: `bun run lint && bun run lint:design-system`
- Unit tests: `bun run test`
- DOM tests: `bun run test:dom`
- Targeted verification: `TV-LIBRARY-SOURCING`, `TV-ASSET-API`

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

## Notes

This plan is part of the 2026-06-23 Full App User Story UX Audit plan pack.

## Contact

Library lead owns this plan. Questions go to the Library/cost/storage conflict group.
