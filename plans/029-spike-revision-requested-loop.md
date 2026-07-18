# Plan 029 (Direction Spike): Close the revision-requested loop — client "request changes" → new estimate revision

> **Executor instructions**: This is a **design/spike plan**. Investigate,
> produce a design + the server-action shape + open questions. Do NOT build the
> full feature. When done, update the status row in `plans/README.md`.

## Status

- **Priority**: P2 (direction — high product leverage)
- **Effort**: M (spike; the bridge implementation is one server action + UI entry points)
- **Risk**: LOW-MED
- **Depends on**: 028 (the revision loop needs a single canonical issued-version surface to supersede from — at minimum, the spike's decision)
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

The decision flow fully supports `revision_requested`:
- `src/app/api/share/[token]/decision/route.ts:56` — accepts the decision.
- `src/components/share/StickyDecisionBar.tsx:38` — "Request changes" button.
- `SharePageDecisionConfirmDialog.tsx:151` — "Describe the requested changes...".

The client-portal issue-builder supports supersession (`issue-builder.ts:549`).

**But there is no action that takes a recipient's "changes_requested" note + the
issued snapshot and produces a new working estimate revision for the contractor.**
The plumbing ends at `status = changes_requested` on the read side.
`src/lib/estimates/row-revision-conflict.ts` and `estimate_sheet_versions`
(named snapshots per README schema) exist on the workshop side, but nothing
bridges the two.

**Impact:** Contractors receive a change request and must manually re-find the
estimate, recall what the client commented, and re-edit — exactly the
spreadsheet-friction PRODUCT.md says it replaces. This is the single highest-
leverage loop for the "sends a proposal that the client understands and trusts"
success metric, and the data to close it (snapshot + comment thread + decision
note) is already stored.

## Scope

**In scope** (design deliverables):
1. **The action contract** — design a "Start revision from this change request"
   server action: inputs (the superseded issue id / the decision id), outputs
   (the new working estimate tab id, linked back to the prior issue).
2. **The data flow** — how the issued snapshot is cloned back into a working
   estimate tab, how the recipient's change-request note + relevant comment
   threads attach as a "revision brief," and how the new issue links back via
   `supersedes_issue_id`.
3. **UI entry points** — where the contractor invokes it (the estimate header
   on a changes-requested proposal, the recipient-proposals inbox, a
   notification). Specify the minimum viable surface.
4. **Open questions** (below).

**Out of scope**:
- Building the feature (separate implementation plan after this spike + plan 028's decision).
- Notification/email wiring beyond naming where it plugs in.
- Multi-round revision arbitration (round 1 → round 2 conflict policy).

## Questions to answer in the design

1. Does the comment thread carry forward into the new revision as
   resolved/unresolved, or reset to unread? (Either is defensible — recommend.)
2. Where does the "revision brief" (the change-request note + selected comments)
   surface in the workshop so the contractor sees it while editing? (A side
   panel? A pinned comment? A banner?)
3. How does the new revision interact with `estimate_sheet_versions` (named
   snapshots)? Is the new tab a fresh version chain, or does it branch?
4. What happens to the superseded issue's share token — does it still resolve
   (showing "superseded" with a link to the new one), or 404?
5. Authz: who can start a revision — only the estimate owner/editor? Confirm
   against `assertCanEditEstimate`.

## Deliverable shape

A design doc (`docs/decisions/2026-07-17-revision-requested-loop.md` or repo
convention) with the action contract (TypeScript signature + input/output
types), the data-flow diagram (text), the UI entry-point mock (text/ASCII), and
the open questions with recommendations.

## Done criteria

- [ ] The design doc exists with the action contract, data flow, UI entry points.
- [ ] Each design choice cites `file:line` evidence (the decision route, the
      issue-builder supersession, the estimate_sheet_versions schema).
- [ ] Open questions are explicit with a recommended answer each.
- [ ] The action contract is concrete enough that a future implementation plan
      can be written from it without re-investigation.
- [ ] `plans/README.md` status row updated to DONE (spike) with a pointer to the doc.

## STOP conditions

- Plan 028 (surface reconciliation) hasn't been decided — the revision loop
  depends on which issued-version table is canonical. If 028 is skipped, narrow
  this spike to design against the client-portal issue-builder specifically and
  flag the dependency.
- The snapshot-cloning primitive doesn't exist or is more complex than expected
  (report what `estimate_sheet_versions` actually supports).

## Maintenance notes

- This spike unblocks the highest-leverage product loop in the audit. After 028
  + this spike land as decisions, the implementation is a single well-scoped
  plan (one server action + 2-3 UI entry points).
- Reviewer: confirm the design reuses existing primitives (snapshot clone,
  supersession, comment threads) rather than inventing new ones.
