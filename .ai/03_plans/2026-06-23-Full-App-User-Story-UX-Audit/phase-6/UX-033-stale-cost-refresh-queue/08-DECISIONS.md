# UX-033 Decision Gates

**Date:** 2026-06-23
**Issue ID:** UX-033
**Decision ID:** DEC-UX-033-SUPPLIER-INTAKE

## Current Decision

`Accepted as lightweight first step`

Per `09-decision-ledger.md` line 23:

> Use curator-owned stale queue/source-review states. External supplier submission is later.

## Guardrails

1. **Data ownership**: Workspace admins own cost review governance. No external supplier identity model yet.
2. **RLS**: Existing policies sufficient. Admin-only mutations via `require_cost_library_governance_admin`.
3. **Spam/abuse**: Not applicable to curator-only workflow.
4. **Attachment rules**: Not applicable to cost review (attachments are UX-034).
5. **Moderation owner**: Workspace admin is the moderation owner.
6. **No new roles**: Do not add supplier/vendor permission roles. Use existing admin/editor/viewer.

## Stop Conditions

- Do not build external supplier intake for UX-033.
- Do not add supplier submission forms, portals, or external auth.
- Do not modify the supplier/brand table schema beyond what exists.
- Build only the curator-owned stale queue and accepted-cost lock state.
- Do not automate cost refresh (e.g., scraping supplier sites) without explicit approval.

## When to Escalate

Escalate to Philip if:
- External supplier intake is requested (requires new decision)
- The supplier/brand directory needs merge/deduplicate UI (LIB-005 scope)
- Cost-source freshness SLA needs automated notifications (beyond queue view)
- A new permission role is needed (current admin/editor/viewer is insufficient)

## Post-Implementation

After UX-033 is verified:
1. Update `canonical-feature-status.csv` row LIB-006 to "Implemented"
2. Update `canonical-feature-status.csv` row COST-001 to "Implemented"
3. Record proof artifact for TV-LIBRARY-SOURCING
4. Close UX-033 in issue tracker
5. Update `.ai/10_state/current-state.md` with completion date

## Related Decisions

- `DEC-UX-034-ATTACHMENT-APPROVAL`: Parallel lightweight first step in same IU-17
- `DEC-UX-031-FIELD-WORKFLOWS`: Deferred for Wave 1; do not mix field package work with UX-033
- `DEC-UX-BETA-COHORT`: Determines whether contractor personas are in beta; affects UX-033 priority if contractors need cost data

## Decision History

| Date | Decision | Reason |
|---|---|---|
| 2026-06-22 | Accepted as lightweight first step | Re-audit found external supplier intake was unscoped; curator-owned workflow is the safe MVP slice |
| 2026-06-23 | Plan pack created | Implementation readiness layer complete |

## Decision Update Rule

Only the Library lead updates this ledger. A row may move out of `Accepted as lightweight first step` only when the update names:
1. The selected product direction.
2. The rejected alternative and why it is rejected.
3. The data/RLS/provider/security guardrail if the work touches those boundaries.
4. The implementation unit and conflict group that own the change.
5. The proof gate and artifact path required before CSV status can move.

## Verification Checklist Before Closing

- [ ] Stale queue view implemented and tested
- [ ] Review panel implemented and tested
- [ ] ComponentCard badge upgrade deployed
- [ ] All governance RPCs wrapped in server actions
- [ ] TV-LIBRARY-SOURCING tests pass
- [ ] CSV status updated for LIB-006 and COST-001
- [ ] No external supplier intake built
- [ ] No new permission roles added

## Final Notes

This decision gate is the boundary between lightweight curator workflow and full supplier portal. Stay on the lightweight side unless Philip explicitly approves the external intake direction. The audit trail and lock state are the trust layer; everything else is convenience.

## Open Questions

1. Should the stale queue auto-refresh or require manual refresh?
2. Should curators receive notifications when a cost entry is due for review?
3. Should rejected costs be hidden from estimators or shown with warning?
4. Should the audit trail be exportable?

These questions are not blockers for the lightweight first step. Answer them during Phase 5 UI refinement.

## Implementation Boundaries

This plan stays within the library domain. It does not:
- Add estimate-sheet interactions (UX-013 owns that)
- Add external supplier portals (deferred decision)
- Add automated price scraping (deferred decision)
- Modify project or publication surfaces
