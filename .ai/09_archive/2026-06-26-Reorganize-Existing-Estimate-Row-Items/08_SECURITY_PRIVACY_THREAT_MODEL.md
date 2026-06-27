# Security, Privacy, And Threat Model

## Trust Boundary

The browser drag payload is untrusted. It is only an intent hint used to route UI behavior. The server must revalidate row ID, source node, target node, estimate, project, user authority, expected revisions, and final order.

## Threats And Mitigations

| Threat | Impact | Mitigation |
| --- | --- | --- |
| User forges row ID in drag payload | Unauthorized row move | Server action and RPC validate row belongs to estimate and project |
| User forges target node ID | Move row into unauthorized estimate | RPC validates target node belongs to same estimate and project |
| User bypasses UI read-only guard | Unauthorized mutation | RPC calls edit authorization guard |
| User sends cross-tab target | Row disappears from active tab model | Reject cross-tab move for MVP |
| User sends malformed sort orders | Constraint errors or bad order | Validate integers, nonnegative values, uniqueness |
| Concurrent collaborator reorders rows | Lost update | Expected row revisions and deterministic locks |
| Client sends raw row data | Data tampering | Server ignores client row object and updates only location/order |
| Tree drop accepts unsupported MIME | Confusing or unsafe mutation | External drop accepts only explicit row MIME and validates payload on drop |
| History payload leaks extra data | Privacy issue and bloat | Store minimal movement metadata |
| RPC execute grants are too broad | Unauthorized mutation surface | Security-definer function uses fixed search path, revokes public/anon execute, and grants only authenticated execute |
| Caller spoofs actor identity | Tampered audit history | RPC derives actor from `auth.uid()` and rejects null actor |
| Network retry repeats mutation | Duplicate history or shifted order | Mutation ID idempotency returns the first result without a second event |

## Authorization Requirement

Use the same edit-level authorization expected by history-writing estimate mutations. Workspace membership alone is insufficient.

## RPC Privilege And Actor Rules

The new RPC must use the project's hardened mutation envelope: `security definer`, fixed `search_path`, explicit execute revokes from `public` and `anon`, and execute grant only to `authenticated`. The browser must never call a service-role path.

The actor for authorization and history attribution must be derived from `auth.uid()` inside the RPC. Do not accept or trust a caller-provided `acting_user_id` for authenticated app calls.

## Payload Validation

Validation should occur in three layers:

1. UI parser rejects malformed JSON and missing IDs before dispatching move intent.
2. Server action validates input shape and UUID format.
3. RPC validates database membership, authority, revisions, and final order.

## Privacy

Row movement does not require adding personal data to events. History should reference row IDs, source/target node IDs, affected count, and mutation ID. User identity is already available through existing mutation history patterns.

## Abuse And Reliability Controls

- Clamp or reject unrealistic update counts.
- Avoid expensive recursive validation during tree dragover.
- Treat repeated mutation IDs idempotently. Idempotency is required for this history-writing row move.
- Return generic authorization failures to the client and log detailed server context through existing safe logging patterns.
