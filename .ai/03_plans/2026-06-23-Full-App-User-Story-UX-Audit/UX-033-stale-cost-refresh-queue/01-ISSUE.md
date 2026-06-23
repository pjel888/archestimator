# UX-033 Issue Definition

**Issue ID:** UX-033
**Severity:** Medium
**Area:** Supplier and cost source
**Persona:** Library curator, supplier manager, estimator
**Implementation Unit:** IU-17
**Priority:** P1

## Problem Statement

Supplier/vendor/cost-source stewardship is metadata-heavy but workflow-light. The supplier/brand/cost source fields exist in the component library without any external or curator workflow to:

1. Identify stale or conflicting cost sources
2. Assign refresh owners
3. Reconcile entries
4. Lock the accepted cost

## Current Behavior

- `src/lib/component-library/actions.ts` line 551: `createCostLibraryComponent` accepts `pricingSource`, `pricingDate`, `supplier`, `brand` as flat metadata
- `src/lib/component-library/actions.ts` line 629: `upsertCostLibraryComponentPriceOption` stores cost entries without review state
- `src/components/workshop/component-library/ComponentCard.tsx` line 109: `getStalenessTone(item.pricingDate)` displays staleness badge but does not link to any refresh action
- `src/components/workshop/component-library/ComponentCard.tsx` line 113: `sourceMeta` shows source label + staleness label as read-only text
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` shows library facets but no review status facet

## Expected Behavior (Post-Fix)

Curator or supplier manager can see stale/conflicting sources, assign refresh, and lock the accepted cost. Cost provenance moves from stale/conflicted to reviewed/accepted with audit trail.

## Canonical Feature Status Rows

| Row ID | Feature | Current Status |
|---|---|---|
| LIB-004 | Supplier/vendor onboarding and contribution | Underrepresented / partially supported by data fields |
| LIB-005 | Supplier/brand directory governance | Underrepresented / partially supported by data fields |
| LIB-006 | Cost-source freshness SLA and refresh queue | Underrepresented / partially supported by data fields |
| COST-001 | Component cost-source reconciliation | Underrepresented / partially supported by data fields |

## Decision Gate

`DEC-UX-033-SUPPLIER-INTAKE`: Accepted as lightweight first step. Use curator-owned stale queue/source-review states. External supplier submission is later.

## Stop Conditions

- Do not build external supplier intake for UX-033; build curator-owned source review first.
- Data ownership, supplier identity, RLS, spam/abuse handling, attachment rules, and moderation owner must be resolved before external intake.
- Do not add new permission roles; use existing workspace admin/editor/viewer hierarchy.

## User Story

As a library curator, I want to see stale cost entries, assign refresh owners, accept or reject updated costs, and lock the accepted cost so that estimators trust the library pricing.

## Personas

- **Primary:** Library curator (workspace admin) — triages stale costs, assigns refresh, accepts/rejects/locks
- **Secondary:** Supplier manager — receives refresh assignment, updates cost data
- **Consumer:** Estimator — sees trusted/locked costs in library and estimate sheet

## Priority Justification

P1 (Medium): Cost freshness is visible but not operationalized. Without governance, estimators may use stale pricing, undermining the brand promise "Your numbers hold up." External supplier intake is deferred; this lightweight curator workflow is the minimum viable trust layer.

## Evidence Sources

- `canonical-feature-status.csv` lines 80-84: LIB-004, LIB-005, LIB-006, COST-001
- `second-pass-persona-use-case-manifest.md` line 22: Supplier/vendor/cost-source persona
- `post-fix-scenario-tests.md` line 51: UX-033 test scenario
- `05-security-data-and-provider-blast-radius.md` line 102: Blast-radius checklist

## Notes for Implementers

- The schema is already migrated. Do not write a new migration.
- The RPCs are already deployed. Do not modify them unless a bug is found.
- Focus on UI surfaces and server action wrappers.
- Keep changes scoped to library surfaces only.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Curator does not use stale queue | Medium | Medium | Make queue visible from ComponentCard; add staleness badge |
| Conflicting costs in estimates | Medium | High | Accepted-cost lock prevents stale usage |
| Schema migration not applied | Low | High | Verify before code deployment |
| Admin accidentally locks wrong cost | Low | Medium | Unlock action available; audit trail records mistake |

## Dependencies

- `supabase/migrations/20260622143000_library_trust_governance.sql` must be applied
- `src/lib/component-library/actions.ts` must be stable (no concurrent refactors)
- `ComponentCard.tsx` staleness contract must remain compatible

## Historical Context

This issue was identified during the second-pass UX audit (2026-06-22). The first pass had supplier/cost fields as data primitives but no governance workflow. The second pass added persona-level stories for library curator and supplier manager, revealing the gap between data storage and operational workflow.

## Related Test IDs

- `TV-LIBRARY-SOURCING`: Primary verification ID for this issue
- `LIB-004`: Supplier/vendor onboarding
- `LIB-005`: Supplier/brand directory governance
- `LIB-006`: Cost-source freshness SLA and refresh queue
- `COST-001`: Component cost-source reconciliation
