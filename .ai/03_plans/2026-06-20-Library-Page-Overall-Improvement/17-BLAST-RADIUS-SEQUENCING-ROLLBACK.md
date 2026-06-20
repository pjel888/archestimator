# 17 - Blast Radius, Sequencing, And Rollback

## High-Blast Areas

| Area | Why It Is Risky | Mitigation |
| --- | --- | --- |
| Route-state changes | Can affect navigation, search, browser history, and deep links. | Add tests before visual work; keep params additive. |
| Cache invalidation | Can stale overview/components/templates/estimate insert state. | Map mutation to affected surfaces and test cache keys. |
| Source-trust metadata | Can expose private fields or mislead users. | Use safe derived fields in cards; keep raw metadata protected. |
| Authz/RLS | Can block valid users or leak cross-workspace data. | Test actor matrix and IDOR cases. |
| Quick Add | Can create bad reusable data. | Keep minimal required fields and validation. |
| Folder destructive actions | Can affect many components. | App-owned confirmation, affected counts, conflict handling. |
| Template insert | Can mutate estimates and nested rows. | Re-resolve target and dependency health before mutation. |
| Large-list rendering | Can harm accessibility/performance. | Measure and pick table/pagination/virtualization deliberately. |

## Recommended PR / Work Slice Order

1. Contract/test scaffolding for route state, authz, exposure, cache, and stale
   targets.
2. Overview search/deep-link wiring.
3. Component card/dense trust-state display.
4. Quick Add minimal flow.
5. Folder prompt/confirm replacement.
6. Template trust preview and insert copy.
7. Responsive/accessibility hardening.
8. Performance/network/concurrency hardening.
9. Final adversarial QA and polish.

## Rollback Plan By Phase

| Phase | Rollback |
| --- | --- |
| 0 | Revert docs/test scaffolding or narrow failed contract; no UI dependency yet. |
| 1 | Disable selected-object param and return overview search to broad route. |
| 2 | Hide new trust fields behind existing card/row hierarchy while preserving safe payload changes if tested. |
| 2b | Hide Quick Add trigger and route users to existing Add Component flow. |
| 3 | Re-enable old folder actions only as emergency internal fallback, then immediately schedule replacement. |
| 4 | Hide new template trust warnings only if they are wrong; do not hide real stale/deleted dependency risk. |
| 5 | Revert responsive layout changes by width class; keep focus/a11y fixes when independent. |
| 6 | Hold release; no rollback claim without passing no-go checklist. |

## Database / RLS Rollback

If migrations are required:

- prefer additive columns/indexes first
- avoid destructive schema edits in the UI polish phase
- include down/fix-forward reasoning in migration notes
- verify against Archestimator Supabase project `ebxxqidacheyapmmzavr`
- regenerate types if the app depends on generated Supabase types

## Release Gates

Before merging implementation:

- route-state tests pass
- authz/IDOR/public-redaction tests pass
- cache invalidation tests pass
- quick-add validation tests pass
- destructive action tests pass
- template insert stale-target tests pass
- large-list or documented fallback evidence exists
- skipped browser/manual checks are listed with residual risk

## Stop Conditions

Stop implementation and re-plan if:

- data model cannot represent required trust states safely
- public/private exposure rules conflict with existing proposal behavior
- RLS/authz tests reveal broader workspace isolation bugs
- selected route state conflicts with core Next.js routing behavior
- large-list requirements force a fundamentally different component architecture
