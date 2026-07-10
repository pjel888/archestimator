# Session, Authorization, And Application Integrity Proof

## Authority And Scope

This proof design expands `REQ-004`, `REQ-005`, `AC-004`, `AC-005`,
`TEST-004`, `TEST-005`, `RISK-003`, `UNIT-004`, and `UNIT-006`. It defines
application-level proof that SQL import alone cannot supply. It does not create
sessions, deploy ingress, or claim a passed rehearsal.

## Required Phase Order

1. Import into the isolated D1 target with no Worker ingress.
2. Run migration/schema/data checks.
3. Directly revoke/delete restored Better Auth session rows in the isolated
   target using the approved recovery adapter.
4. Prove a pre-recovery canary row/token cannot authenticate through offline
   auth/session adapters.
5. Deploy the disposable ingress only after steps 1 through 4 pass.
6. Re-prove the old canary is denied, then create one fresh disposable
   authentication for permitted read checks.
7. Run protected/public/cross-workspace and controlled-write matrix.
8. Destroy ingress, session/probe state, Worker, target, and credentials.

## Actor, Resource, Action Matrix

| Actor | Resource/action | Expected result |
| --- | --- | --- |
| Unauthenticated caller | Protected workspace/project/estimate/support/admin reads | Denied before repository data disclosure. |
| Fresh disposable user | Own workspace representative reads | Allowed and sourced from restored target. |
| Fresh disposable user | Foreign workspace/project/estimate/publication/support data | Denied with no existence disclosure. |
| Corporate-only owner/team_leader/member/viewer | Linked or foreign workspace/project/estimate and platform-admin data | Denied; corporate membership, role, or link alone is not product or platform authorization. |
| Public recipient context | Explicit public/share projection only | Allowed only under current share predicate; no protected/internal metadata. |
| Revoked pre-recovery session | Any authenticated route | Denied offline and after ingress. |
| Authorized proof runner | One run-labeled controlled write in disposable scope | Written, observed, then rolled back/deleted; no other scope changes. |

Representative reads must exercise repository/application paths rather than
direct SQL alone, and must bind the observed target marker so a misbound Worker
cannot accidentally pass against another D1 database.

## Session Invariants And Failure States

- Restored sessions are bearer-equivalent credential material; no restored
  ingress exists until they are invalidated offline.
- Row deletion plus offline adapter denial are both required. An empty cookie,
  HTTP success, or missing UI entry is insufficient.
- Invalidation failure, partial deletion, or inability to enumerate affected
  session rows aborts ingress and starts cleanup.
- The old canary remains denied after ingress. A fresh disposable auth must work
  so a universally broken auth layer cannot masquerade as successful revocation.
- No raw session/proof token, cookie, email, request body, or row data appears in
  logs, evidence, screenshots, or command transcript.

## Application And Data Failure States

- A restored read that bypasses repository authorization, uses source rather
  than target data, or leaks cross-workspace metadata fails the rehearsal.
- A restored corporate role or workspace link that bypasses canonical
  `workspace_members` or platform-admin predicates is a security failure even
  when the corporate relationship itself restored correctly.
- A controlled write that is absent, appears outside the disposable scope, or
  persists after rollback/cleanup fails both application and cleanup gates.
- Partial availability is not sufficient for the receipt: every required read,
  denial, session, and write/rollback check has an explicit status and defect
  label.
- Timeouts, provider errors, stale route state, and auth service failures remain
  observable and cannot be collapsed into `not found` or a passing denial.

## Evidence, Ownership, And Handback

The auth/recovery lane defines the offline invalidation interface without
parallel edits to Operating-owned auth files. `UNIT-004` builds deterministic
local contract tests; `UNIT-006` runs the exact approved hosted matrix. The
receipt records result labels, target/app/auth revisions, non-reversible canary
digests, and cleanup state. Operating consumes the current receipt for residual
risk review and never reruns this proof.
