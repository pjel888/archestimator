# Unit 004 — Voiding A Client Portal Decision Never Reverts Issue Status (HIGH)

**Finding:** F-04 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** MED
**Requirement:** `REQ-004` · **Status:** TODO · **Depends on:** — · **Test:** `TEST_PROPOSAL`

## Problem

`submitClientPortalDecision` recomputes `client_portal_issues.status` via a CASE
expression whenever a decision is added (so an issue can move to `accepted` /
`declined` / `changes_requested` / `under_review`). But `voidClientPortalDecision`
only sets `voided_at` on the decision row and writes an audit event — it never
re-runs the status CASE. So an owner voiding the approval that pushed an issue to
`accepted` (or voiding the lone `declined`/`changes_requested`) leaves the issue
**permanently stuck** in a terminal state even though no qualifying decision
remains.

## Evidence

`src/lib/client-portal/decision-service.ts:116-123` (submit — recomputes status):
```sql
UPDATE client_portal_issues
SET status = CASE
  WHEN EXISTS (... decision_row.decision = 'declined' ...) THEN 'declined'
  WHEN EXISTS (... decision_row.decision = 'changes_requested' ...) THEN 'changes_requested'
  WHEN (SELECT count(*) ... decision_row.decision = 'approved' ...) >= ? THEN 'accepted'
  ELSE 'under_review'
END
WHERE id = ? AND content_hash = ? AND EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)
```

`src/lib/client-portal/decision-service.ts:172-175` (void — does NOT recompute):
```ts
const result = await database.batch([
  statement(database, "UPDATE client_portal_decisions SET voided_at = ?, voided_by = ?, void_reason = ? WHERE id = ? AND voided_at IS NULL", [...]),
  statement(database, "INSERT INTO client_portal_audit_events (...) VALUES (...)", [...]),
]);
```

A grep confirms the status-recompute CASE exists in exactly one place (the submit
batch). Void is the only backward transition path and it skips it.

## Fix Direction

Add the same status-recompute statement to the void batch, scoped to the voided
decision's issue:

```ts
statement(database, `
  UPDATE client_portal_issues
  SET status = CASE
    WHEN EXISTS (... declined ...) THEN 'declined'
    WHEN EXISTS (... changes_requested ...) THEN 'changes_requested'
    WHEN (SELECT count(*) ... approved ...) >= ? THEN 'accepted'
    ELSE 'under_review'
  END
  WHERE id = ?
`, [...policy.requiredRecipientIds, ...policy.requiredRecipientIds, policy.requiredApprovals, decision.issue_id]),
```

To avoid drift, **extract the status-recompute SQL into a shared helper**
(`recomputeIssueStatusSql(issueId)`) used by both submit and void. Resolve the
issue's policy (`requiredRecipientIds`, `requiredApprovals`) the same way submit
does — void already loads the portal; add the policy load.

### Owned paths
- `src/lib/client-portal/decision-service.ts`

### Prohibited
- Do not introduce a new status value or change the forward-transition guard in
  submit.
- Do not void silently — the existing audit event must remain.

## Acceptance Evidence

- `AC-001`: void batch contains a status-recompute UPDATE (or calls the shared
  helper) scoped to the voided decision's issue.
- `AC-002`: after voiding the sole approval on an `accepted` issue, the issue
  returns to `under_review` (or the correct state per remaining decisions).
- `TEST_PROPOSAL`: run the existing client-portal decision test to prove status
  recomputes after void.

## Recovery

If the policy cannot be resolved in the void path (it should be — the portal row is
already loaded), fall back to recomputing with the same `requiredRecipientIds`
resolution used by `summarizeClientPortalDecisions`.
