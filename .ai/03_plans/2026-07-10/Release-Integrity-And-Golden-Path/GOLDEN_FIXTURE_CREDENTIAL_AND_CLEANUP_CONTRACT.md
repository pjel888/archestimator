# Golden Fixture, Credential, And Cleanup Contract

This supporting data/security model expands `REQ-003`, `RISK-002`, and
`UNIT-003/009`. It plans a fixture contract but creates no identity, row, object,
credential, or hosted resource.

## Namespace And Ownership

Every fixture row/object carries a workflow run ID and a fixture-owner marker.
The signed cleanup manifest lists exact owned identities for invite, user,
workspace, zero-state marker, project, estimate, area, template/component,
publication, recipient, comment, decision, activity, and any run-owned object.
Setup and cleanup are idempotent and resumable after injected partial failure.

Cleanup requires both namespace and owner marker, touches only manifest-listed
items, runs twice to prove idempotency, and verifies a foreign-workspace canary.
Unknown binding, production host, missing owner label, item not in the manifest,
or canary drift aborts before deletion.

## Credential Taxonomy

| Material | Runtime use | Persistence/reporting |
|---|---|---|
| Raw invite token | Ephemeral runner secret reference for `/invite/[token]` | Never persisted; receipt stores keyed digest only |
| Raw publication token | Ephemeral runner secret reference for `/share/[token]` | Never persisted; digest is never used as bearer |
| Password/session credential | Exercise enabled recipient path | Raw value excluded from logs, traces, screenshots, cleanup manifest, and receipt |
| Better Auth cookie/session | Authenticate fixture user | Runner-owned ephemeral state only; no receipt value/hash |
| Stable fixture IDs | Join assertions and cleanup | Allowed when scoped to run and non-secret |
| Email/URL/object key | Fixture execution input where required | Redacted or represented by keyed digest/stable alias only |

## Setup And Cleanup State Machine

`planned -> seeding -> ready -> exercising -> cleaning -> cleaned`. A failure
records the last committed owned identity and transitions to `repair_required`;
resume revalidates host/binding/namespace, completes or compensates only owned
steps, then double-cleans. Long-lived manually supplied tokens are rejected.

## Adversarial Proof

`TEST-003` runs setup twice and cleanup twice against temp/local D1, injects a
mid-seed failure, refuses production/unknown bindings, preserves a foreign canary,
and snapshots the receipt for raw token/password/cookie/email/URL/object-key
absence. Hosted staging execution remains `TEST-010` under `AUTH-002`.

## Handoff

Feature packs supply deterministic domain setup/assertion receipts. The release
fixture composes them but does not duplicate feature repositories or selectors.
Resume from the signed cleanup manifest and last committed fixture state, never
from an agent summary.
