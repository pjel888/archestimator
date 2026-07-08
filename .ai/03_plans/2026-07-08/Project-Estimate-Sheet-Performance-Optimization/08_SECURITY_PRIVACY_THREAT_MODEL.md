# 08 - Security, Privacy, And Threat Model

## Security Posture

Performance optimization must not weaken data isolation. The estimate sheet contains project, pricing, supplier, and proposal-sensitive data.

## Assets

- Project IDs.
- Estimate IDs.
- Node/area IDs.
- Row item IDs.
- Cost and quantity data.
- Supplier/category/brand data.
- Project-specific component data.
- Collaboration/user identity metadata.
- Activity and history data.
- Proposal export metadata.

## Trust Boundaries

- Browser client is untrusted.
- Client graph state is untrusted.
- TanStack Query cache is untrusted.
- Server Actions and D1 repository enforce authorization.
- Hosted proof endpoints must require secret-gated access and must emit redacted data only.

## Threats

T01: Cross-workspace estimate ID access during route fast path.
- Mitigation: retain `canAccessEstimateInD1` or equivalent authorization check before returning estimate data.

T02: Subtree endpoint leaks node names/rows for unauthorized estimate.
- Mitigation: subtree action must validate project/estimate/node ownership and user access.

T03: Performance proof writes sensitive real customer data into evidence.
- Mitigation: generated fixtures only; redact IDs and secrets; no raw cookies/tokens/URLs.

T04: Search endpoint, if added later, leaks unloaded rows across access boundary.
- Mitigation: server-assisted search must use the same access predicate as route tree reads.

T05: Client graph stale state displays data after permission revocation.
- Mitigation: mutation/query failure paths clear privileged state; edit capability remains fail-closed; active session refresh handled separately.

T06: Hosted proof cleanup failure leaves seeded test data.
- Mitigation: hosted proof fails closed when seeded count does not equal cleaned count; use isolated fixture prefix/metadata.

T07: Index migration worsens write amplification and creates free-tier cost risk.
- Mitigation: compare rows read/write and durations before/after; avoid speculative indexes.

T08: Logs record raw row details or sensitive user inputs.
- Mitigation: perf events use counts, durations, route labels, hashed IDs, and fixture IDs only.

## Privacy Rules

- Evidence files may contain counts, durations, query names, sanitized fixture dimensions, and redacted hashes.
- Evidence files must not contain raw secrets, auth cookies, bearer tokens, invite/share/password-reset tokens, private object keys, full sensitive URLs, or real customer row descriptions.
- Hosted proof commands must not print env var values.

## Security Validation

Required before implementation ships:
- Unauthorized route fast-path denial test.
- Unauthorized subtree fetch denial test.
- Cross-workspace row mutation denial test remains green.
- D1 proof output redaction test.
- Hosted proof cleanup fail-closed test.
- Existing authz tests touched by estimate actions remain green.

