# UX-034 Decision Gates

**Date:** 2026-06-23
**Issue ID:** UX-034
**Decision ID:** DEC-UX-034-ATTACHMENT-APPROVAL

## Current Decision

`Accepted as lightweight first step`

Per `09-decision-ledger.md` line 24:

> Add reviewed/current metadata before approve/reject lifecycle.

## Guardrails

1. **Storage metadata model**: Use existing `cost_library_item_variant_attachments` columns.
2. **File version scope**: Variant applicability via `applicable_cost_entry_id`.
3. **RLS**: Existing policies sufficient. Admin-only mutations via `require_cost_library_governance_admin`.
4. **Audit trail**: Every approval/rejection/supersede recorded in `cost_library_attachment_review_events`.
5. **Stale-attachment rollback**: Superseded attachments remain queryable; never hard-delete reviewed attachments.

## Stop Conditions

- Do not build a full approval workflow UI in the first pass.
- Add metadata fields first, then lightweight approve/reject actions.
- Do not modify upload API's core file handling.
- Do not change allowed file types or size limits without explicit approval.
- Do not automate attachment validation (e.g., OCR, content analysis) without explicit approval.

## When to Escalate

Escalate to Philip if:
- Full approval workflow UI is requested before metadata layer is complete
- Automated attachment validation (OCR, content analysis) is requested
- Storage quotas need to increase (current limit: 20MB per file)
- New file types need to be supported (current: PDF, XLS, XLSX)

## Post-Implementation

After UX-034 is verified:
1. Update `canonical-feature-status.csv` row LIB-007 to "Implemented"
2. Record proof artifact for TV-LIBRARY-SOURCING and TV-ASSET-API
3. Close UX-034 in issue tracker
4. Update `.ai/10_state/current-state.md` with completion date

## Related Decisions

- `DEC-UX-033-SUPPLIER-INTAKE`: Parallel lightweight first step in same IU-17
- `DEC-UX-031-FIELD-WORKFLOWS`: Deferred for Wave 1; do not mix field package work with UX-034
- `DEC-UX-BETA-COHORT`: Determines beta scope; affects attachment governance urgency

## Decision History

| Date | Decision | Reason |
|---|---|---|
| 2026-06-22 | Accepted as lightweight first step | Re-audit found full approval workflow was unscoped; metadata-first approach is safer |
| 2026-06-23 | Plan pack created | Implementation readiness layer complete |

## Decision Update Rule

Only the Library lead updates this ledger. A row may move out of `Accepted as lightweight first step` only when the update names:
1. The selected product direction.
2. The rejected alternative and why it is rejected.
3. The data/RLS/provider/security guardrail if the work touches those boundaries.
4. The implementation unit and conflict group that own the change.
5. The proof gate and artifact path required before CSV status can move.

## Verification Checklist Before Closing

- [ ] Attachment review queue implemented and tested
- [ ] Component attachment panel with review state implemented and tested
- [ ] Upload API returns review status
- [ ] Delete API guards reviewed attachments
- [ ] All governance RPCs wrapped in server actions
- [ ] TV-LIBRARY-SOURCING tests pass
- [ ] TV-ASSET-API tests pass
- [ ] CSV status updated for LIB-007
- [ ] No full approval workflow UI built
- [ ] No new file types or size limits added

## Open Questions

1. Should the review queue auto-refresh when new uploads arrive?
2. Should uploaders receive notifications when attachments are approved/rejected?
3. Should rejected attachments be hidden from estimators or shown with warning?
4. Should the audit trail be exportable?

These questions are not blockers for the lightweight first step. Answer them during Phase 5 UI refinement.

## Final Notes

This decision gate is the boundary between lightweight metadata tracking and full attachment governance. Stay on the lightweight side unless Philip explicitly approves the full workflow direction. The `is_current_approved` flag and audit trail are the trust layer; everything else is convenience.

## Implementation Boundaries

This plan stays within the library domain. It does not:
- Add estimate-sheet interactions
- Add external supplier portals
- Add automated document analysis
- Modify project or publication surfaces
