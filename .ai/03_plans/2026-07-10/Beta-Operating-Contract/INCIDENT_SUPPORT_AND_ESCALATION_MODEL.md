# Incident, Support, And Escalation Model

## Authority And Scope

This domain contract expands `REQ-004`, `AC-004`, `AC-008`, `TEST-004`,
`TEST-008`, `TEST-010`, `RISK-003`, `UNIT-003`, `UNIT-009`, `AUTH-003`, and the
hosted operations portion of `UNIT-007`. It defines executable proposed defaults for independent review; it
does not assert owner acceptance, human coverage, delivery-channel availability,
or hosted alert readiness.

## Proposed Severity And Response Contract

The table is `POLICY-BETA-INCIDENT-v1-proposed`. The exact values become the
active limited-Beta policy only when the owner records their version, scope,
coverage window, primary/backup roles, and expiry in the limited-cohort decision
under `AUTH-003`. The owner may replace the defaults, but any replacement must
preserve the same complete fields and rerun local policy fixtures before hosted
proof. `AUTH-001` must reference the current owner-confirmed policy digest; a
proposal, stale confirmation, or locally passing schema cannot authorize
external Beta.

| Severity | Primary acknowledgment | Backup escalation | Containment/plan | Customer communication |
| --- | --- | --- | --- | --- |
| `sev1` | 15 minutes | At five minutes without acknowledgment | Contain within 60 minutes; use verified rollback immediately when lower risk | Initial within 30 minutes for user/data/auth impact, update every 30 minutes, resolution notice within 60 minutes of resolution |
| `sev2` | 30 minutes | At 15 minutes without acknowledgment | Contain within four hours | Initial within two hours when users are affected, update every two hours, resolution notice by next business day |
| `sev3` | One business day | Backup assumes ownership by next business day | Documented plan within three business days | Only for direct user impact; otherwise weekly Beta review |

The primary delivery path is the ops webhook plus support inbox. Cloudflare
Email to the named backup is failover when delivery or acknowledgment is
missing. A support conversation receives human acknowledgment within four
business hours during the published coverage window and one business day
otherwise.

## Incident And Support State Model

```text
detected -> classified -> delivered -> acknowledged -> contained
  -> monitoring -> resolved -> reviewed -> closed
```

- `delivered` is transport proof, not human acknowledgment.
- Missing acknowledgment advances the escalation clock; it never changes the
  incident to acknowledged from a successful webhook status.
- Severity changes preserve the original timestamps and record who/what changed
  the classification, reason, and resulting deadline.
- Support-to-incident promotion preserves the redacted conversation reference
  and tenant boundary; incident evidence does not ingest message bodies.
- Every external `sev1` and `sev2` has a named communication owner. Every `sev1`
  and external `sev2` receives a 24-hour review; every open incident and support
  trend receives a 72-hour review with owner, due date, action, and release
  impact.

## Communication And Redaction Contract

Initial, update, and resolution messages contain incident ID, severity, affected
capability, redacted confirmed impact, current mitigation, safe workaround when
available, next-update time, and support contact. They exclude raw identifiers,
tokens, webhook values, private URLs, uncertain root-cause claims, unapproved
compensation, and privileged legal content.

Unknown scope is stated as unknown. A message cannot claim resolution until the
relevant service check, data/auth invariant, and customer-facing smoke are
current. A failed delivery or missing owner is itself an operator-visible
failure and blocks hosted readiness.

## Failure, Denial, And Recovery States

- Unknown severity, missing primary/backup, expired coverage record, missing
  next-update time, invalid template version, or unredacted field fails the
  readiness producer closed.
- Duplicate webhook/email delivery is idempotent by incident/event ID or support
  `clientMessageId`; retry does not reset acknowledgment or communication
  clocks. A failed support reply uses an atomic, durable retry claim with one
  winning attempt. Concurrent callers cannot both send. A successful email
  followed by a failed/null sent-state write returns an explicit uncertain
  outcome, preserves provider/message identity for reconciliation, and blocks
  automatic resend until state is resolved; it never reports success by falling
  back to the old `send_failed` row.
- Delivery timeout, provider error, unavailable primary, and missing
  acknowledgment exercise the backup path and record both attempts.
- Rollback is selected by failure class and known-safe candidate/data state. A
  stale, unverifiable, or data-destructive rollback keeps release red and moves
  to fix-forward/incident handling.
- Support or incident storage/query failure remains observable to operators and
  cannot be swallowed or converted to an empty queue.

## Evidence, Ownership, And Handback

`UNIT-003` owns the proposed policy schema, owner-confirmation schema, S-01
through S-07 scenarios, message
redaction, support/incident state fixtures, rollback tabletop, and 24/72-hour
review machinery. `UNIT-009` records the owner-confirmed policy digest and
support primary/backup/window in
`LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`. `UNIT-007` may prove hosted delivery, primary/backup
acknowledgment, and cleanup only under `AUTH-001` and only against the current
receipt-bound policy digest. `UNIT-006` composes local status;
Release consumes the separate hosted receipt. Named coverage, owner acceptance,
and human acknowledgment are never inferred from this document or local test
output.
