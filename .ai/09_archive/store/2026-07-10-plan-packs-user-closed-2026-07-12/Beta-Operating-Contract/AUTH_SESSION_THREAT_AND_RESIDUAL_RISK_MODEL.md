# Authentication Session Threat And Residual-Risk Model

## Authority And Scope

This security model expands `REQ-005`, `AC-005`, `AC-008`, `AC-009`,
`TEST-005`, `TEST-008`, `TEST-009`, `RISK-004`, `UNIT-004`, `UNIT-007`,
`UNIT-008`, `AUTH-001`, and `AUTH-002`. It defines denial and evidence
requirements; it does not accept risk, mutate sessions, or authorize recovery.

## Credential-Material Taxonomy

| Material | Classification | Storage/use boundary | Evidence rule |
| --- | --- | --- | --- |
| Better Auth database session token | Raw bearer-equivalent credential | D1 `session` row and server-side lookup | Never log, export into evidence, display, or hash weakly; use non-reversible keyed digest only for correlation. |
| Session cookie | Raw bearer credential, signed transport container | Secure/httpOnly production cookie | Cookie clearing is not proof that the D1 row was deleted or replay denied. |
| Magic-link/reset material | Hashed/short-lived according to current auth implementation | Server verification store and link transport | Test expiry, one-time use, replay, redaction, and destruction separately from sessions. |
| Recovery export | Encrypted container containing raw credential-bearing rows | Recovery-owned restricted lifecycle | Operating consumes `D1-RECOVERY-RECEIPT-v1`; it never imports, restores, or receives row contents. |
| Synthetic canary identifiers | Derived/redacted labels | Authorized proof packet/artifacts | Bind to exact environment/run/release; never use a real-user credential. |

## Actor, Action, And Denial Matrix

| Actor/action | Allowed scope | Required denial proof |
| --- | --- | --- |
| Current user sign-out | Current session only | Deleted token cannot replay; unrelated sessions remain valid. |
| Current user revoke specific session | One owned non-current session | Foreign-user/session ID, already-revoked, expired, copied ID, and cross-workspace attempts fail without disclosure. |
| Current user revoke other sessions | All owned sessions except current | Current remains valid; every targeted row is absent and denied on replay. |
| Current user revoke all sessions | Every owned session | All rows absent; every token denied; partial deletion is a failure. |
| Authorized operator access | Least-privilege D1/backup controls and synthetic-only proof | Unscoped export/read, real-user revocation, or unrelated tenant access is denied. |
| Recovery consumer | Validate receipt only | Missing/stale/mismatched/dirty receipt cannot be used and cannot trigger restore. |

## Threats And Required Controls

- **Deletion illusion:** HTTP success or cleared cookie while a D1 row remains.
  Control: direct D1 row absence plus replay denial for every revoke operation.
- **Partial revocation:** one row deletion fails during batch/all-session
  revocation. Control: injected failure must propagate, preserve a diagnosable
  atomic/fix-forward state, and never report success.
- **Cookie-cache masking:** cached session state outlives revocation. Control:
  retain the disabled cookie-cache posture or prove an equally strict bounded
  invalidation contract.
- **Restore resurrection:** a restored D1 snapshot contains a token revoked after
  the recovery point. Control: consume current Recovery evidence that sessions
  were invalidated before ingress and prove the canary remains denied.
- **Cross-tenant/session enumeration:** identifiers reveal or mutate another
  actor's session. Control: server-side ownership predicate and indistinguishable
  denial envelope.
- **Evidence leakage:** raw token, cookie, export, user email, request body, or
  private URL appears in logs/artifacts. Control: structured redaction and
  deterministic secret-scanning fixtures.
- **Overbroad human acceptance:** owner risk acceptance is treated as recovery,
  provider, cohort, or legal authority. Control: `AUTH-RISK-DECISION-RECEIPT-v1`
  is scoped, expiring, and separately composed by Release.

## Residual-Risk Decision Contract

`AUTH-002` may record mitigation or a time-bounded acceptance only after current
local revocation/access evidence, the exact `D1-RECOVERY-RECEIPT-v1`, and the
exact `OPERATING-HOSTED-PROOF-RECEIPT-v1` pass strict identity/freshness/cleanup
validation. The decision records likelihood, impact, mitigations, approver,
scope, issued/expiry time, re-review triggers, evidence identities, blockers,
and next action. Missing or stale evidence leaves `AC-009` at `BOUNDARY`.

## Evidence, Ownership, And Handback

`UNIT-004` owns local session-operation, failure-propagation, replay-denial,
access, and recovery-receipt-consumer proof. Recovery owns restore/session
invalidation. `UNIT-007` owns only the packet-scoped hosted synthetic canary.
`UNIT-008` records the human risk decision without performing provider, session,
or recovery action. Release composes all receipts; no upstream unit mutates a
combined readiness record.
