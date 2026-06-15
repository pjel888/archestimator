# Templates Page — Implementation Readiness Plan

**Date**: 2026-06-11  
**Mode**: Plan/readiness only. No implementation started.

---

## Decision Record

The approved default should be **Option A: browse-first Templates page with a clear handoff into the existing estimate-editor insertion flow**.

Option B, a full Templates management hub with create/edit/delete/apply on `/workshop/templates`, is a larger product and architecture decision. It should not be implied by this audit unless the owner separately approves that scope.

## Target Outcome

Make `/workshop/templates` a trustworthy template discovery surface for closed beta:

- Users can find and inspect reusable estimate templates.
- Users understand how to use a template in an estimate.
- The page does not display inert or decorative management controls.
- Future apply behavior reuses existing editor/server-action/RPC contracts.
- UX remains dense, professional, and consistent with Archestimator's design system.
- Database access stays workspace-scoped and RLS-proven.
- Performance is measured, not assumed.

## Non-Goals

- No marketplace, public template gallery, or decorative discovery page.
- No new design language, color system, component library, or dependency.
- No direct client RPC calls that bypass established server actions.
- No second template-insertion RPC or parallel mutation pathway.
- No full CRUD management surface unless Option B is separately approved.

## Recommended Sequence

1. Lock current browse behavior with tests for route load, search, tree selection, expand/collapse, resize, and empty state.
2. Remove deception: hide or implement inert Filter/Group controls, and remove or populate the empty header row.
3. Add card selection and a contextual inspector/dock for template structure, sample rows, metadata, and use guidance.
4. Add a clear handoff action into the existing estimate editor insertion flow.
5. Expand search to row/material/supplier terms and add sort only when the UI includes real visible state.
6. Run accessibility, performance, Supabase/RLS, and visual QA gates.
7. Revisit Option B only after Option A is validated or explicitly rejected.

## Acceptance Criteria

| Area | Acceptance criteria |
|------|---------------------|
| Surface purpose | README and UI copy make it clear whether the page is browse-first or management hub |
| Visible controls | Every toolbar/card/tree action performs work, is disabled with a reason, or is removed |
| Inspect | Clicking a card opens/syncs a contextual detail view and returns focus correctly |
| Handoff | User can move from template discovery into the existing estimate-editor insertion flow without ambiguity |
| Existing backend | Future apply path uses `insertEstimateTemplateIntoEstimate()` / `insert_estimate_template_into_estimate_with_history` |
| Search | Search covers template metadata, node names, row material, description, supplier, discipline, and category |
| Accessibility | Keyboard-only user can complete browse, inspect, search, tree navigation, resize alternative, and handoff |
| Performance | No measured interaction exceeds 200ms on seeded data; scaled fixture behavior is documented |
| Security | Anonymous and non-member access tests prove template data isolation |
| Design | UI obeys SF Pro, <=12px, 3px radius, 0 tracking, neutral tokens, shared components, no decorative app UI |

## Deferred Workflow Gates

| Requested workflow | Why deferred | When to run |
|--------------------|--------------|-------------|
| UltraQA | Needs implemented flows to attack | After browse/handoff implementation exists locally |
| UltraWork | Execution engine; user requested no coding in this pass | After plan approval if implementation is requested |
| Visual Ralph | Requires target visual implementation/reference loop | After UI implementation or selected mock/reference exists |
| Product Design QA | Compares source visual target to rendered result, not broad planning | After a concrete screenshot/mock and implemented page exist |
| Autopilot/Ultragoal | Durable execution modes | Use as handoff once implementation scope is explicit |

