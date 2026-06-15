# Templates Page — Audit Quality Gate & Scorecard

**Date**: 2026-06-11  
**Purpose**: Track which audit claims are proven, which are hypotheses, and which must be tested before implementation is called ready.

---

## Claim Evidence Matrix

| Claim | Status | Evidence |
|-------|--------|----------|
| `/workshop/templates` is browse/discovery today | Proven | Route renders `TemplateLibraryManager`; no page-local create/edit/delete/apply action handlers |
| Existing template insertion lives in estimate editor | Proven | Server action, history-aware RPC, estimate sidebar Add, drag/drop path, E2E/Vitest coverage |
| Live template dataset is 3 templates, 10 nodes, 15 row items | Proven | Read-only Supabase count query on 2026-06-11 |
| Template tables have RLS enabled | Proven | Supabase schema metadata |
| RLS effective behavior blocks anon/non-member access | Open test | Grants and policies imply protection, but role-based negative tests are still required |
| Filter/Group toolbar actions are non-functional | Proven from source/audit | `addActions={[]}` and no configured popover/action behavior |
| Cards look actionable but are inert | Proven from source/audit | Template cards render as list items with no click/key handlers |
| Accessibility is clean | Partially proven | Labels/roles/focus exist, but APG tree keyboard, resize keyboard operation, target size, and focus return still need tests |
| Dynamic import/code splitting should be added | Hypothesis | Sibling page uses dynamic import; bundle numbers must decide |
| Search should include row content | Proven UX gap | Current search checks template metadata and node names, not row materials/suppliers |

## Readiness Scorecard

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Source-code mapping | 9/10 | Route, client component, manager, repository, and insertion action mapped |
| UX flow completeness | 8/10 | Browse-first Option A is now explicit; Option B requires separate approval |
| Design-system alignment | 8/10 | Strong constraints captured; final visual QA requires screenshots after implementation |
| Accessibility readiness | 7/10 | Correct standards identified; keyboard and target-size tests must be written |
| Performance readiness | 8/10 | Metrics and budgets defined; bundle/trace data still needed |
| Supabase/schema readiness | 8/10 | Tables, policies, RPCs, grants, counts, indexes verified; negative RLS tests remain |
| QA readiness | 8/10 | Acceptance criteria and workflow gates defined; UltraQA requires built flows |

## Critical Risks

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Surface conflation | A browse page could accidentally become a second mutation hub | Keep Option A default; require separate approval for Option B |
| Duplicate insertion pathways | A new apply flow could diverge from estimate-editor behavior | Reuse `insertEstimateTemplateIntoEstimate()` and shared target validation |
| False accessibility confidence | Roles are present, but keyboard behavior may still fail APG expectations | Add explicit keyboard tests for tree, resize, card actions, and focus return |
| RLS assumptions | Grants look broad; policies imply safety but must be proven by role tests | Add anon and non-member negative tests |
| Premature performance complexity | Virtualization/server search may be unnecessary at beta scale | Measure first; add complexity only beyond documented thresholds |
| Visual drift | New actions/panels may violate compact Archestimator design language | Use existing shared UI components and Impeccable checks |

## Implementation Test Matrix

| Test class | Required tests |
|------------|----------------|
| Unit | Search matcher includes row fields; pluralization; summary counts; handoff target guards |
| Server action/RPC | Existing apply success; wrong workspace denied; invalid target denied; missing template denied |
| Component | Card click/keyboard; toolbar action visibility; filter/sort result counts; empty/error/loading states |
| E2E | Browse templates, inspect template, hand off to estimate editor, verify insertion through existing editor flow |
| Accessibility | Axe, keyboard-only full path, APG tree behavior, focus return, target sizing, keyboard resize alternative |
| Performance | Bundle comparison, Lighthouse, Playwright trace/user timing, scaled fixture |
| Visual QA | Desktop and constrained widths, screenshots against DESIGN.md, no overlapping text or broken density |

## Final Audit Stop Condition

The audit/planning phase is ready when:

- Documents 00-08 agree on browse-first vs management-hub scope.
- Stale or unproven claims are corrected or marked as open tests.
- The implementation plan reuses existing architecture and avoids parallel systems.
- The QA plan can fail future implementation on objective evidence.
- The folder can be handed to an implementation agent without oral context.

