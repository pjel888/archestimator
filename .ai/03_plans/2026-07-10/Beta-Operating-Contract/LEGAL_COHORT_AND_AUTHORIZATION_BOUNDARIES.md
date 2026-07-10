# Legal Cohort And Authorization Boundaries

## Authority And Scope

This boundary model expands `REQ-004`, `REQ-006`, `AC-006`, `AC-010`, `TEST-006`,
`TEST-010`, `RISK-005`, `UNIT-005`, `UNIT-009`, and `AUTH-003`. It records the
non-bypassable evidence contract without interpreting law or claiming counsel or
owner approval.

## Current And Target Boundary

`SRC-006` records owner-approved terms text that still states counsel is
pending. The target represents two independent decisions:

| Decision | Required scope | What it can authorize | What it cannot imply |
| --- | --- | --- | --- |
| Limited free Beta owner decision | Named cohort, maximum size, duration, current terms/privacy/cookie/contact versions, exact incident-policy version/digest, support window/primary/backup, data constraints, issued/expiry time | Only the described limited free cohort and policy | Counsel approval, public availability, paid launch, unlimited cohort, changed policy/documents, or changed data use |
| Qualified-counsel scope/status | Exact broader/public/paid use, artifact versions, jurisdiction/product assumptions, issued/review date | Only the recorded broader scope when affirmative and current | Product/security/provider readiness or a changed legal/business model |

## Gate Invariants

- The two records use distinct fields and status evaluation; neither boolean,
  signature, or approval identity can populate the other decision.
- Any incident-policy, terms, privacy, cookie, contact, cohort, support, data-use, retention,
  payment, public-share, or jurisdiction change invalidates the affected record.
- Missing, expired, wrong-scope, wrong-version, unsigned, or contradictory
  evidence fails closed. Source copy, an agent conclusion, or hosted technical
  proof cannot satisfy either human decision.
- Privileged legal advice is not stored in the pack, logs, or release artifact.
  The receipt contains only decision identity/date/scope/status and a redacted
  reference to the controlled source.
- Cohort invitations cannot exceed the approved maximum or duration. Expansion
  requires a new record; partial remaining capacity is not transferrable to a
  different cohort or product scope.
- A revoked/expired owner decision stops new invitations while preserving the
  incident/support/data obligations for already admitted participants.

## Failure And Denial Fixtures

`UNIT-005` must define fixtures for missing document version, expired decision,
wrong cohort, cohort overflow, wrong duration, changed data constraint, missing
or mismatched incident-policy digest, missing support primary/backup/window,
counsel status substituted by owner approval, owner status
substituted by counsel review, and broader/public/paid request against a limited
record. Every failure returns a stable safe label and exact next action without
revealing privileged text.

## Authorization Packet

`AUTH-003` names the requested limited cohort and legal scope, exact artifact and
incident-policy versions/digests, support primary/backup/window, data constraints,
decision fields, issuer/approver role,
expiry, evidence destinations, rollback, and post-decision verification. It
authorizes decision recording only. It does not authorize analytics/provider,
session, recovery, release, or cohort invitation side effects.

## Evidence, Ownership, And Handback

`UNIT-005` owns legal schema/source-version consistency and local denial tests;
`UNIT-003` owns the proposed/replacement incident-policy and confirmation schema.
`UNIT-009` records `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` only after the
explicit human boundary is resolved. The receipt binds the exact owner-confirmed
policy digest and support primary/backup/window for `UNIT-007`. Release consumes
the immutable receipt for the exact release/cohort; broader scope remains a
boundary unless a separate current counsel record covers it. This document is
planning context, not proof.
