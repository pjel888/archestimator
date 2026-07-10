# Security, Privacy, And Public Allowlist

## Scope And Applicability

`GATE-SEC-01` applies because calculation fields cross publication/share and
download boundaries. This pack does not change Better Auth, share-token,
recipient, invitation, or acceptance semantics. Existing server authorization
and Publisher credential contracts remain authoritative.

## Actor, Resource, Action Matrix

| Actor | Resource/action | Allowed | Denial proof |
|---|---|---|---|
| Authorized workspace member | Build preview/export from an accessible estimate | Yes, through existing server predicate | Cross-workspace estimate ID returns existing denial/not-found envelope |
| Public recipient with valid existing share authority | Read the immutable sanitized snapshot | Yes, only fields in the public allowlist | Revoked/invalid/copied authority follows Publisher denial contract |
| Public recipient | Read current internal estimate, rates, provenance, or source URLs | No | Serializer and route tests expose no field/value |
| Client code | Choose authoritative totals or bypass server input validation | No | Contract test rejects forged totals/settings |
| Log/telemetry consumer | Read raw snapshot, token, customer text, rates, formula text | No | Redaction/static error-handling proof |

## Public Allowlist

Allowed data is purpose-limited: safe public identity/order, display labels,
normalized quantity/unit, safe scope, currency, calculation/snapshot version,
canonical stored row totals, named aggregate totals, and previously authorized
sanitized public image references. Adding a field requires an explicit public-use
reason and a negative test; object-spread serialization is prohibited.

Denied data includes rates and component cost inputs, misc/adjustment source
facts that reveal internal pricing, supplier/library/source/confidence metadata,
raw tenant/resource IDs, private R2/object keys, source URLs, internal event
payloads, recipient credentials, request/session secrets, and diagnostic stack
data.

## Abuse And Failure Cases

- forged cross-workspace/project/estimate/public IDs;
- malformed or unknown snapshot/calculation versions;
- invalid/unsafe image URLs;
- repeated export requests and stale concurrent revisions;
- formula injection through any customer-controlled workbook string;
- instruction-like customer text copied to logs or operator commands;
- partial serialization/generation presented as success;
- raw values in errors, screenshots, evidence, or benchmark artifacts.

Customer text is inert data. Only planner-owned workbook formulas may become
formula cells; user strings are encoded as text even when they begin with `=`,
`+`, `-`, or `@`.

## Logging And Evidence

Structured export logs may contain request ID, opaque resource fingerprints,
row count, basis/version/currency, formulas mode, duration bucket, artifact byte
count, and failure class. They exclude tokens, recipient material, raw IDs,
customer text, raw snapshots, rates, source URLs, and formulas containing
customer data.

`TEST-004` and `TEST-008` are the primary public-data proof producers;
`TEST-005` covers workbook text safety, and `TEST-010` runs
`validate:error-handling`. Any leak is release-blocking and reopens UNIT-004 or
UNIT-005. This document itself is not proof and does not advance `GATE-002`.

