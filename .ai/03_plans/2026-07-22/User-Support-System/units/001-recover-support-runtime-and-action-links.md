# UNIT-001: Recover support runtime and Action Inbox links

## Goal and status

`READY` | dependencies: none | requirements: OPS-001, UX-003 | risks:
RISK-001, RISK-007, RISK-009

Restore `/admin/support`, preserve and verify the concurrent draft get-or-create
repair already present in the shared worktree, and make every support attention
item open its exact canonical source before adding any new support feature.

## Confirmed root causes

- `listSupportMailbox` emits `COUNT(*) AS all`; bound D1 rejects the reserved
  alias and the surrounding `Promise.all` converts it into a generic mailbox
  read error.
- The captured draft failure came from select-then-insert behavior. The current
  shared worktree already contains `INSERT OR IGNORE` followed by
  select-by-scope; that concurrent repair is now an integration constraint, not
  work to reimplement or overwrite.
- `AdminActionInbox` ignores `item.href`.
- source upsert does not refresh href/priority on conflict.
- support and legacy-feedback hrefs are generic rather than record-specific.

## Owned paths

- `src/lib/repositories/support-conversations-d1.ts`
- `src/lib/repositories/support-drafts-d1.ts`
- `src/components/admin/AdminActionInbox.tsx`
- `src/lib/admin/action-inbox-repository.ts`
- `src/app/admin/support/page.tsx` only for selected-ID load behavior
- `src/app/api/admin/support/conversations/route.ts` only if selected-record
  support belongs at the API boundary

Reread all paths immediately before edit. Preserve current uncommitted admin
layout/composer work.

## Implementation boundary

1. Quote or rename the `all` result alias consistently in SQL and row mapping.
2. Emit a redacted repository failure event carrying operation/fingerprint and
   error class/code, never SQL binds or conversation content.
3. Preserve the current `INSERT OR IGNORE` plus select-by-scope draft repair,
   inspect its behavior against both callers, and change it only if decisive
   evidence shows that the shared fix is incomplete. Both callers must receive
   the one authoritative row.
4. Render source-aware primary navigation using the safe internal `href`.
5. Set support href to `/admin/support?c=<id>&folder=all`; keep a temporary
   legacy-feedback source link until UNIT-006 imports it.
6. Update href, priority, source ID, detail, and severity in the Action Inbox
   conflict clause so old derived rows repair on the next reconciliation.
7. Make selected conversation load independent of the first mailbox page. A
   valid admin-selected ID may be pinned/read directly even if filters exclude it.
8. For support items, remove generic Resolve/Dismiss controls now or gate them by
   source kind so they cannot diverge from canonical status. Preserve unrelated
   source behavior.

## Acceptance evidence

- Exact empty and populated list/count SQL are valid in local D1/static replay.
- `/admin/support` source path has a visible degraded error only on a real error,
  not because of the reserved alias.
- Source and narrow SQL evidence show the shared draft get-or-create repair can
  yield only one scope row and no unhandled unique error.
- Every support attention row exposes `Open conversation` and targets its ID.
- Reconciliation repairs a previously stored generic href.
- A selected ID outside current page/filter still renders the exact thread.
- Execute and retain the UNIT-001 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: mailbox/draft/action contract test named in `00-PLAN.md`.

## Recovery and stop condition

No schema change. Revert only this unit if necessary. Stop when AC-001 is
source-proven, the immediate live failure has a precise corrected path, and
UNIT-002 can rely on an operational canonical admin inbox.
