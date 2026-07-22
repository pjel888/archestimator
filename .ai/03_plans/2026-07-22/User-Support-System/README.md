# Plan Pack: User Support System

Canonical execution artifact: `00-PLAN.md`. Machine manifest: `plan-pack.json`.

## Target result

Establish one trustworthy customer-support path from an authenticated user's
first message through founder triage and two-way follow-up:

- the global Support entry asks only for a message, with one optional screenshot;
- the system derives the authenticated user and records a sanitized page and
  diagnostic context without asking users to classify severity or enter UUIDs;
- every new report becomes a D1-backed support conversation visible in
  `/admin/support` and, when attention is required, `/admin/today`;
- Action Inbox items open the exact canonical conversation;
- users can reopen their private request history, read replies, and continue the
  conversation;
- screenshots stay private in R2 and are served only after owner/admin
  authorization;
- D1 remains the ledger, while `SUPPORT_INBOX` carries identifier-only realtime
  invalidations;
- legacy `beta_feedback_submissions` are imported idempotently into Support,
  retained as read-only audit history, and covered by privacy export/erasure.

## Confirmed blockers

1. The live `/admin/support` mailbox count query fails because SQLite rejects
   the unquoted alias `COUNT(*) AS all`.
2. `AdminActionInbox` receives `item.href` but renders no open/details action.
3. Support-derived Action Inbox hrefs are generic `/admin/support`, while legacy
   feedback points to `/admin`; neither targets the source record.
4. The current feedback modal asks users for Type, Severity, and Project UUID.
5. `/workshop/feedback` presents a separate support chat and legacy feedback
   form, splitting one user intent across two stores and two admin surfaces.
6. User support messages cannot carry screenshots or structured diagnostic
   context.
7. Admin draft creation produced a local `UNIQUE(admin_user_id, scope_key)`
   failure. The current shared worktree now contains `INSERT OR IGNORE` plus an
   authoritative scope read; the recovery unit must preserve and verify that
   concurrent fix rather than overwrite it.

## Pack map

- `00-PLAN.md`: complete task contract, architecture, ADR, security model,
  acceptance criteria, DAG, verification, and handoff.
- `UX-AUDIT.md`: rendered audit of the four relevant live surfaces.
- `DEPENDENCY-DECISION.md`: React, shadcn, Radix, form, upload, realtime, and
  notification package decisions.
- `RESEARCH.md`: official Cloudflare, Next, React, Radix, shadcn, and browser API
  research baseline.
- `units/001-recover-support-runtime-and-action-links.md`
- `units/002-establish-canonical-support-domain.md`
- `units/003-build-secure-user-intake.md`
- `units/004-replace-feedback-with-support-composer.md`
- `units/005-establish-user-support-inbox.md`
- `units/006-converge-admin-support-and-action-inbox.md`
- `units/007-cut-over-privacy-observability-and-legacy.md`

## Execution order

`UNIT-001 -> UNIT-002 -> UNIT-003 -> {UNIT-004, UNIT-005} -> UNIT-006 -> UNIT-007`

Only `UNIT-001` is ready as the first execution slice. Shared support repository,
API, and client-orchestrator files must have one writer at a time.

## Critical decisions

- One canonical domain: all new user complaints, questions, and feedback are
  support conversations and messages.
- One user action: message required, screenshot optional, diagnostics disclosed.
- No new runtime dependency: use the repository's Dialog/Sheet, controls,
  TanStack Query, native File/Clipboard/Drag APIs, native WebSocket, and toast.
- Small-file MVP: one PNG, JPEG, or WebP screenshot up to 3 MiB through the
  authenticated Worker relay. Do not add R2 signing credentials or `aws4fetch`.
- D1 success is success even if realtime fanout fails; clients refetch D1.
- Legacy beta feedback is additively imported, not destructively rewritten, and
  remains inside privacy export/erasure while retained.
- Actor-scoped intake claims bind one client message ID to one payload
  fingerprint and stable conversation/message/screenshot identities.

## Validation boundary

This is a plan-only pass. It used live rendered inspection, current source,
read-only bound D1 inspection, local redacted log diagnostics, official research,
and the static Plan Pack validator. Product tests, builds, browser automation for
future implementation, and deployment remain unrun. Exact implementation test
proposals are recorded in `00-PLAN.md`.
