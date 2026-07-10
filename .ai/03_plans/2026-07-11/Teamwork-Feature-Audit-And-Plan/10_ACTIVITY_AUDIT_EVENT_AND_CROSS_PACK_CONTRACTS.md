# Activity, Audit Event, and Cross-Pack Contracts

## Ownership

Teamwork owns domain mutations and the production of durable lifecycle facts. Activity owns the shared vocabulary, immutable storage/read model, composition, history UI, retention, tombstones, and consumer verification.

Presence, cursor motion, connection frames, reconnects, and room telemetry are operational/ephemeral and do not become user Activity entries.

## Durable Teamwork Facts

At minimum:

- `teamwork.invitation.created`
- `teamwork.invitation.delivery_attempted`
- `teamwork.invitation.delivery_succeeded`
- `teamwork.invitation.delivery_failed`
- `teamwork.invitation.reissued`
- `teamwork.invitation.revoked`
- `teamwork.invitation.expired`
- `teamwork.invitation.accepted`
- `teamwork.membership.granted`
- `teamwork.membership.role_changed`
- `teamwork.membership.removed`
- `teamwork.estimate_access.restricted`
- `teamwork.estimate_access.inherited`

Names are provisional until the Activity consumer receipt approves them; the semantic coverage is mandatory.

## Event Envelope

```ts
type TeamworkActivityFactV1 = {
  schema: "TEAMWORK-ACTIVITY-CONTRACT-v1";
  eventId: string;
  eventType: string;
  occurredAt: string;
  actorProfileId: string;
  workspaceId: string;
  projectId: string;
  estimateId?: string;
  invitationId?: string;
  targetProfileId?: string;
  roleBefore?: string;
  roleAfter?: string;
  accessSource?: string;
  correlationId: string;
  metadata: Record<string, string | number | boolean | null>;
};
```

The final schema uses Activity's canonical envelope and redaction rules. Metadata is allowlisted; email, token, URL, client payload, and display labels are excluded unless Activity explicitly defines a privacy-safe field.

## Failure Policy

- Access-changing lifecycle facts are part of the same atomic boundary as the mutation and fail closed if the fact cannot persist.
- External email sent/failed observations may complete asynchronously, but an attempted/outbox fact is persisted with invitation creation.
- Operator telemetry failure does not roll back the domain mutation; it is handled by structured error reporting and readiness gates.
- No empty `catch`, raw `console.error`, or swallowed promise on sensitive paths.

## Required Receipt: `TEAMWORK-ACTIVITY-CONTRACT-v1`

The receipt must contain:

- reconciled Activity manifest hash and baseline;
- approved event names and versioned schemas;
- actor/tenant/resource identifiers;
- redaction and tombstone semantics;
- producer source paths and transaction boundary;
- exact consumer reader/composer tests;
- backward/forward compatibility decision;
- changed paths and hashes;
- verifier identity and timestamp.

Activity must acknowledge the producer contract with exact reader/composer compatibility tests before `UNIT-019` can mark integrated completion.

## Current Integration State

The Activity pack is stable at this planning observation but its manifest is stale: the validator reports five artifact-hash mismatches (`README.md`, `11_IMPLEMENTATION_PLAN.md`, `12_COORDINATION_AND_MULTI_AGENT.md`, `LOOP_LEDGER.md`, and `15_PERFORMANCE_AND_QUERY_AUDIT.md`). `UNIT-009` must obtain an owner-refreshed validating manifest before it binds hashes or accepts a consumer acknowledgement. A later general PASS will prove only internal pack consistency, not compatibility with the future Teamwork event adapter.

Implementation sequence:

1. Define a Teamwork-owned adapter and contract tests against a local versioned fixture.
2. Revalidate the Activity pack at execution time and obtain its Teamwork-specific consumer acknowledgement.
3. Bind both manifest hashes in the receipt.
4. Run integrated read/composition/history tests.

## Idempotency and Immutability

- `eventId` and correlation/mutation IDs make retries idempotent.
- Facts are append-only; corrections use superseding/tombstone semantics defined by Activity.
- One logical role/removal command cannot produce duplicate user-visible history entries.
- Cascade project removal may produce one aggregate fact plus bounded child facts, according to the consumer contract.

## Stale Triggers

- Activity manifest/baseline/hash changes.
- Event vocabulary or envelope changes.
- Teamwork producer path/transaction changes.
- Redaction/retention/tombstone policy changes.
- New access-changing mutation without a mapped event.
