# Unit 004 — Decision Void Doesn't Recompute Status (REFUTED — dead code)

**Finding:** F-04 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **REFUTED** · **Status:** REJECTED

## Original claim

`voidClientPortalDecision` sets `voided_at` but never recomputes `client_portal_issues.status`,
so voiding the approval that pushed an issue to `accepted` leaves it permanently stuck terminal.

## Why it's refuted (the void path is never called)

The bug in the function is real in isolation, but the function is **dead code** — it has zero
callers, so the buggy state can never be produced in any user/server flow:

- `src/lib/client-portal/decision-actions.ts:14` wraps it as the server action
  `voidClientPortalDecisionAction`.
- `grep` for `voidClientPortalDecision` and `voidClientPortalDecisionAction` across `src/`
  returns **only the definitions**. The module `decision-actions` is imported by nothing.
- No UI, no cron, no admin route calls it.

Status-recompute exists in exactly two places — `submitClientPortalDecision`
(`decision-service.ts:116`) and the supersede path (`issue-builder.ts:552`). Void is the only
backward path and it's unreachable. The "permanently stuck terminal" consequence cannot manifest
until/unless the action is wired up.

## Related cleanup (filed as N-03, unit 034)

`src/lib/client-portal/decision-actions.ts` is an orphaned module — candidate for deletion.

## Disposition

**REJECTED** as a bug. If/when the void action is ever wired into the admin UI, **re-open this
finding** — at that point the missing status recompute (the shared `recomputeIssueStatusSql`
helper described in the original unit) would become a real requirement. Until then, no change.
