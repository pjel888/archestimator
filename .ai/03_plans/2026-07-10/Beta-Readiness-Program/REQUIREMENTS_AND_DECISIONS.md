# Requirements And Decisions

## Requirements

### REQ-001 - exact-once ownership registry

Every `BETA-P0-01..10` and `BETA-P1-01..10` has exactly one primary owner pack,
one evidence destination, and no duplicate implementation lane. The registry in
`README.md` is canonical. Contributors and dependencies never become co-owners.

Acceptance: `AC-001`; unit: `UNIT-001`.

### OPS-001 - dependency and phase gates

The program records current manifest hashes, readiness tuples, leases, and
handoffs for every owner pack. Downstream integration cannot start until the
named upstream receipt is current and validator-clean.

Acceptance: `AC-002`; units: `UNIT-001`, `UNIT-003`.

### OPS-002 - serialized Publisher and Activity circle-back

The exact delta packets in `SOURCE_AND_CODEBASE_AUDIT.md` are issued only after
the existing agents freeze their packs. The program does not edit or overwrite
their active plans and does not infer implementation from planning status.

Acceptance: `AC-003`; unit: `UNIT-002`.

### REQ-002 - cross-pack maintainability gate

Each capability pack must keep new Beta behavior behind a coherent domain
boundary, extract only when evidence shows a high-change/high-test-cost
component, and report before/after caller/test ownership. This is the complete
program-owned meaning of `BETA-P1-10`; the program makes no source edits.

Acceptance: `AC-004`; units: `UNIT-003`, `UNIT-004`.

### OPS-003 - release evidence aggregation

The release truth packet must bind each backlog item and release criterion to a
fresh receipt at the correct local, browser, hosted, provider, operator, or
external-authority surface. Missing, stale, skipped-without-rationale, or
wrong-surface proof is a no-go signal.

Acceptance: `AC-005`; units: `UNIT-004`, `UNIT-005`.

### SEC-001 - hosted GitHub control authorization

Local workflow files and successful local commands cannot prove protected
branch/ruleset configuration, required checks, secret/dependency scanning, or
passed-SHA deploy enforcement. Authorized hosted mutation/readback is required.

Acceptance: `AC-006`; unit: `UNIT-005`; boundary: `AUTH-001`.

### OPS-004 - limited-cohort legal approval

External Beta cannot be declared go until the intended limited-cohort Terms and
Privacy Notice have an explicit owner/legal approval record. Wider/public/paid
launch remains outside this program and requires qualified counsel review.

Acceptance: `AC-007`; unit: `UNIT-005`; boundary: `AUTH-002`.

## Acceptance criteria

| ID | Status now | Observable completion signal | Proof surface |
|---|---|---|---|
| `AC-001` | FAIL | Registry contains all 20 IDs once; automated duplicate/missing check returns zero | local program audit |
| `AC-002` | FAIL | Every dependency has a current manifest hash, tuple, lease owner, and handoff timestamp | owner-pack receipts |
| `AC-003` | FAIL | Publisher/Activity deltas are acknowledged after freeze with no overlapping file ownership | ledgers and validator receipts |
| `AC-004` | FAIL | Each pack reports a bounded extraction decision and regression ownership; no standalone refactor lane | owner-pack final audits |
| `AC-005` | FAIL | All release rows have fresh matching-surface receipts and no open P0 defect | release truth artifact |
| `AC-006` | BOUNDARY | Authorized GitHub readback proves required hosted controls and passed-SHA enforcement | GitHub hosted receipt |
| `AC-007` | BOUNDARY | Explicit limited-cohort legal approval is recorded; wider launch remains blocked | owner/legal decision record |

## Autonomous decisions

### DEC-AUTO-001 - program is coordination-only

The umbrella owns registry, sequencing, evidence, and go/no-go assembly. Product
and infrastructure implementation stays in capability packs. This prevents a
large shared-file integrator diff and preserves accountable ownership.

### DEC-AUTO-002 - preserve existing Publisher and Activity packs

Their current plans are read-only dependencies while active. Delta packets are
serialized after freeze because both packs already name the routes/components
the Beta audit needs.

### DEC-AUTO-003 - separate activation production from dashboard presentation

Activation owns privacy-safe milestone production and cohort query.
`Beta-Operating-Contract` owns operator presentation, telemetry governance, and
launch policy.

### DEC-AUTO-004 - program owns P1-10 as a gate, not a refactor

Capability extraction is evaluated inside each domain. The program verifies
that decisions and tests exist but creates no cross-domain abstraction.

### DEC-AUTO-005 - final release remains blocked

The program can complete local coordination while `release_status=BOUNDARY`.
GitHub hosted controls and legal approval are real authorization boundaries,
not missing autonomous engineering work.

## Authorization boundaries

### AUTH-001 - hosted GitHub controls

Active. Required authority: repository administrator capable of reading and
changing rulesets/branch protection, required checks, security scanning, and
deployment provenance. Preconditions: local workflow/config complete, workflow
run green, requested control matrix prepared, no secrets in evidence. Resolution
receipt: redacted API/UI readback with repository, rule identifiers, required
check names, passed commit SHA, and timestamp.

### AUTH-002 - limited-cohort legal approval

Active. Required authority: product owner for limited-cohort approval and
qualified counsel where policy requires. Preconditions: intended cohort, Terms,
Privacy Notice, telemetry definitions, retention, and support contact frozen.
Resolution receipt: versioned document identifiers, approval scope/date/actor,
and explicit statement that wider/public/paid launch remains unapproved.

## Risk register

| ID | Risk | Mitigation | Trigger/owner |
|---|---|---|---|
| `RISK-001` | Duplicate or orphan backlog ownership | Exact-once registry check and one primary owner | any registry change / program lead |
| `RISK-002` | Concurrent agents overwrite Publisher/Activity plans | Freeze receipt, file lease, serialized delta | manifest hash drift / program lead |
| `RISK-003` | Planning status is mistaken for implementation proof | Tuple and evidence-surface checks | any NOT_STARTED pack / verifier |
| `RISK-004` | Stale receipts produce a false go | Hash/freshness invalidation and fail-closed release row | source/config drift / verifier |
| `RISK-005` | Cross-pack extraction becomes unrelated refactoring | Per-domain evidence and no standalone implementation lane | scope growth / architect |
| `RISK-006` | Unauthorized hosted/legal action is implied | Active AUTH records and blocked final unit | release decision / owner |

## Rejected alternatives

- One monolithic Beta implementation pack: rejected because it duplicates
  existing ownership and creates broad shared-file conflicts.
- A second Publisher or Activity pack: rejected because the active packs already
  own the relevant routes, components, and contracts.
- Marking the program `IMPLEMENTATION_READY`: rejected because multiple owner
  packs remain unfinished and the final unit is authorization-blocked.
- Treating approval as a normal test: rejected because neither GitHub admin
  authority nor legal approval can be manufactured by local execution.
