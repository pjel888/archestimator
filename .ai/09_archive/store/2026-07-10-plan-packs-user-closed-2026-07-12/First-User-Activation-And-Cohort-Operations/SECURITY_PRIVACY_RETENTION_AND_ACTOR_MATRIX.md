# Security, Privacy, Retention, And Actor Matrix

This supporting threat and data-handling model expands `SEC-001`, `DATA-001`,
`RISK-003/004`, and `TEST-001/005`. It records planned controls, not proof.

## Actor, Resource, And Action Matrix

| Actor | Create activation project | Read/update own progress | Read cohort | Required denial |
|---|---|---|---|---|
| Unauthenticated | No | No | No | Authentication fails before D1 access |
| Workspace viewer | No | Read own shaped progress only | No | Mutation controls absent; direct POST denied |
| Workspace member/admin/owner | Yes in authorized workspace | Yes, using server-derived identity | No | Cross-workspace template/project/estimate denied |
| Corporate-only owner/team_leader/member/viewer | No | No | No | Corporate membership, role, and workspace link do not satisfy `workspace_members` or platform-admin authorization |
| Platform admin | Normal workspace rights only | Own progress normally | Yes through bounded server-only caller | No raw event/support/profile data |
| Public recipient/share session | No | No | No | Recipient credential is never activation authority |

Every action validates the complete membership -> workspace -> project ->
estimate chain after authentication. Client-provided user/workspace/resource IDs,
dedupe keys, roles, or milestone identity are untrusted selectors, never authority.
`corporate_account_members.role` and `workspaces.corporate_account_id` are also
untrusted for activation authorization; only canonical workspace membership can
authorize product reads or writes.

## Credential And Identifier Taxonomy

| Material | Classification | Activation handling |
|---|---|---|
| Better Auth session/cookie | Raw credential at auth boundary | Used by current server auth only; never stored in activation rows/logs/receipts |
| Invite/share/recipient token | Raw credential owned by another domain | Rejected as activation authority; never accepted by activation actions |
| Server-derived dedupe key | Derived idempotency identity | Stored tenant-scoped; cannot authenticate or authorize |
| User/workspace/project/estimate IDs | Resource identifiers | Re-resolved and authorized server-side; safe output only when DTO allows |
| Guided-sample version | Public product marker | Stored and visibly rendered; contains no customer credential/data |
| Retention hold reason | Allowlisted internal code | Server-only; omitted from ordinary export and user/UI payloads |

## Denial And Abuse Matrix

Direct POST, replay, duplicate submit, forged identity, viewer role,
corporate-only role or linked-workspace claim, cross-workspace template,
mismatched composite resource chain, deleted/stale
resource, public recipient, unknown stage/source, oversized or arbitrary metadata,
invalid cursor/filter/limit, non-admin cohort access, and same nonce across tenants
must be tested. Denial happens before unauthorized reads/writes and returns shaped
errors without row, credential, or customer content.

## Privacy Lifecycle

- Essential activation progress is separate from optional analytics consent.
- Events expire after 180 days; delivered outbox after 30 days; unresolved/dead
  rows no later than 180 days; progress remains while membership is active.
- Export is shaped and excludes leases, raw errors, and hold internals.
- Erasure removes outbox/events/progress atomically. An active valid hold records
  `skipped_legal_hold` and prevents any partial deletion.
- Cohort output includes only the documented allowlist and support status/time.

## Safe Diagnostics

Structured records may include stable error class/code, operation, route class,
tenant-safe correlation, attempt/state, and timing. They must not include raw
tokens/cookies, arbitrary metadata, support content, email, IP/user agent, row
payloads, or full resource URLs. Logger file-output tests use a temporary
`ARCHESTIMATOR_DEV_LOG_PATH` and do not pollute `logs/dev.ndjson`.

## Review Stop Condition

Security review remains failing until direct denial, corporate-role separation,
composite-FK, privacy lifecycle, redaction, and admin-boundary tests pass. Local proof cannot establish
hosted/provider behavior, which this pack does not claim.
