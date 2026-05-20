# `/workshop/components` Independent Review and Readiness Gate

**Date:** 2026-05-20
**Question reviewed:** Is the `/workshop/components` UX/UI strategy certain enough to implement efficiently and effectively?
**Verdict:** **CONDITIONAL GO**

## Direct answer

No plan is 100% certain before implementation and browser QA. The strategy is strong, but implementation should proceed only as a narrow read-only first slice. Persistent CRUD, delete/archive, schema expansion, imports, saved views, and bulk workflows are not approved by this readiness gate.

## Review lanes completed

Three independent read-only reviews were run against the plan pack and relevant repo files:

1. Technical feasibility review
   - Verdict: Conditional Go.
   - Main concern: server-safe persistence boundary and data-source decision are under-specified for CRUD.

2. UX/product quality review
   - Verdict: Conditional Go.
   - Main concern: MVP scope, fake editability, three-pane density, health semantics, and recently-used/favorites ambiguity.

3. Testing/risk-control review
   - Verdict: Conditional Go.
   - Main concern: route-level tests, placeholder footer removal, full validation gates, E2E/server-port behavior, and browser evidence requirements.

## Approved first implementation slice

Proceed only with:

- read-only global Component Library manager;
- current seed/demo/library-shaped data through explicit adapters;
- compact table/list default;
- search;
- category, supplier, kind, and price-health filters;
- price-health issues with visible reasons;
- read-only right inspector;
- no live mutation controls unless disabled/hidden;
- no persistence or schema changes;
- no editor form in the routed UI;
- no hard delete/archive;
- no import/export/bulk workflows.

## No-go items until later gates pass

Do not implement yet:

- live create/edit/duplicate/archive/delete;
- schema expansion for tags/source URL/images/spec codes;
- import/export and supplier quote CSV workflows;
- saved views;
- advanced stale-price aging policies;
- usage-impact workflows for items already inserted into estimates;
- automatic propagation of library price edits to estimates.

## Required plan patches applied

The plan pack was hardened after review:

- `03-implementation-plan.md`
  - Added Conditional Go readiness verdict.
  - Locked first slice to read-only manager UI.
  - Added no-fake-editability rule.
  - Added nullable cost fields and `healthIssues[]`.
  - Added seed/demo adapter rules.
  - Added price-health precedence.
  - Added route footer removal and route-level test requirement.
  - Added server-safe repository/action requirements for later CRUD.
  - Added workspace scoping, archive/delete, rollback, and snapshot-safety gates.
  - Added full validation gates: validate, build, E2E, diff check.
  - Added browser/visual QA requirements.

- `02-screen-by-screen-ux-spec.md`
  - Clarified toolbar actions and read-only mutation behavior.
  - Marked recent/favorites as later unless metadata-backed.
  - Added table column-priority rules.
  - Added multi-issue price-health semantics.
  - Clarified facet filtering vs grouping.
  - Deferred Create/Edit drawer until persistence.
  - Added no-workspace, demo/workspace, read-only, unsaved, archive, and keyboard/focus states.
  - Added hard-delete and fake-editability avoid rules.

## Remaining implementation risks

1. Three-pane density
   - Risk: left facets + table + inspector may crowd laptop widths.
   - Control: table column priority plus browser QA.

2. Shared primitive blast radius
   - Risk: extending `HeaderIconToolbar` or `WorkshopCollectionLayout` can affect other workshop pages.
   - Control: prefer manager-owned inner layout when possible; add regression tests if shared primitives change.

3. Data realism
   - Risk: seed/demo data may not represent a mature workspace library.
   - Control: label demo data honestly and avoid overclaiming price trust.

4. Persistence boundary
   - Risk: browser Supabase repository imported into server route/actions.
   - Control: server-safe repository/action gate before CRUD.

5. Delete/archive semantics
   - Risk: hard delete loses library audit trail/source linkage.
   - Control: archive preferred; hard delete deferred.

## Implementation-ready conclusion

Effective and efficient path:

1. Build the read-only manager slice first.
2. Verify UX density in browser.
3. Preserve estimate-sidebar insertion behavior.
4. Only after Philip accepts the manager UX, choose persistence scope: DB-field-only CRUD or schema expansion.

This is now a stronger strategy than the original plan because it prevents premature CRUD/schema work and focuses the first implementation on proving the user workflow.