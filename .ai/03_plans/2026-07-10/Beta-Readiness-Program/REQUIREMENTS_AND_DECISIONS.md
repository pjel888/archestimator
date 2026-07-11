# Requirements And Decisions

This file remains the stable-ID requirement, criterion, decision, risk, and
authorization index. The independently reviewable ownership, receipt,
maintainability, evidence, lease, and release contracts are cross-linked from
the `README.md` artifact map and do not create competing IDs.

## Requirements

### REQ-001 - exact-once ownership registry

Every `BETA-P0-01..10` and `BETA-P1-01..10` has exactly one primary owner pack,
one evidence destination, and no duplicate implementation lane. The registry in
`README.md` is canonical. Contributors and dependencies never become co-owners.

Acceptance: `AC-001`; unit: `UNIT-001`.

### OPS-001 - dependency and phase gates

The program records current manifest/artifact/diff hashes, readiness tuples,
leases, and integration receipts for every owner pack. Downstream integration cannot start until the
named upstream receipt is current and validator-clean.

Acceptance: `AC-002`; units: `UNIT-001`, `UNIT-003`.

### OPS-002 - serialized Publisher and Activity integration

The exact delta packets in `SOURCE_AND_CODEBASE_AUDIT.md` are issued only from
stable validator-clean receipts whose manifest, artifact-set, scoped-diff, and
contract hashes recheck. The program does not overwrite either pack and does not
infer implementation from planning status.

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
wrong-surface proof is a no-go signal. The Release chain must preserve its
`UNIT-007` read-only receipt, Release `AUTH-001`/`UNIT-008` GitHub receipt,
Release `AUTH-002`/`UNIT-009` isolated-staging receipt, and Release
`AUTH-003`/`UNIT-010` production-or-no-release receipt independently. Program
`AUTH-002` is a fifth, separately scoped consumer boundary that can resolve only
from the current `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` produced by Beta
Operating `AUTH-003`/`UNIT-009`.

Acceptance: `AC-005`; units: `UNIT-004`, `UNIT-005`.

### SEC-001 - hosted GitHub control authorization

Local workflow files and successful local commands cannot prove protected
branch/ruleset configuration, required checks, secret/dependency scanning, or
passed-SHA deploy enforcement. Program `AUTH-001` can be resolved only by the
matching Release `AUTH-001`/`UNIT-008` authorized mutation/readback receipt.
Release staging, production, or the Operating legal/cohort receipt cannot
substitute.

Acceptance: `AC-006`; unit: `UNIT-005`; boundary: `AUTH-001`.

### OPS-004 - limited-cohort legal decision receipt consumption

External Beta cannot be declared go until the intended limited-cohort Terms and
Privacy Notice have the explicit owner/legal decision record produced only by
Beta Operating `AUTH-003`/`UNIT-009`. Program validates and consumes that receipt;
it neither requests nor records the approval. Wider/public/paid launch remains
outside this program and requires the separately recorded qualified-counsel
scope in the same receipt.

Acceptance: `AC-007`; unit: `UNIT-005`; boundary: `AUTH-002`.

## Acceptance criteria

| ID | Status now | Observable completion signal | Proof surface |
|---|---|---|---|
| `AC-001` | FAIL | Registry contains all 20 IDs once; automated duplicate/missing check returns zero | local program audit |
| `AC-002` | FAIL | Every dependency has current manifest/artifact/diff hashes, tuple, lease owner, receipt timestamp, plus one valid durable 0055..0059 migration generation receipt | owner-pack and migration receipts |
| `AC-003` | FAIL | Publisher/Activity incorporated-delta receipts name exact delta IDs and validate with stable scoped hashes and no overlapping file ownership | integration and validator receipts |
| `AC-004` | FAIL | All nine packs occur exactly once in the BETA-P1-10 matrix and provide a current bounded extraction receipt or explicit justified N/A | owner-pack final audits and Program matrix audit |
| `AC-005` | FAIL | All release rows have fresh matching-surface receipts, including distinct Release `UNIT-007/008/009/010` receipts, and no open P0 defect | release truth artifact |
| `AC-006` | BOUNDARY | Authorized GitHub readback proves required hosted controls and passed-SHA enforcement | GitHub hosted receipt |
| `AC-007` | BOUNDARY | Current Beta Operating `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` validates for the exact cohort/document versions; wider launch remains separately bounded | Operating decision receipt |

## Autonomous decisions

### DEC-AUTO-001 - program is coordination-only

The umbrella owns registry, sequencing, evidence, and go/no-go assembly. Product
and infrastructure implementation stays in capability packs. This prevents a
large shared-file integrator diff and preserves accountable ownership.

### DEC-AUTO-002 - preserve existing Publisher and Activity packs

Their plans remain separately owned. Delta packets are serialized through
content-addressed integration receipts because both packs already name the
routes/components the Beta audit needs.

### DEC-AUTO-003 - separate activation production from dashboard presentation

Activation owns privacy-safe milestone production and cohort query.
`Beta-Operating-Contract` owns operator presentation, telemetry governance, and
launch policy.

### DEC-AUTO-004 - program owns P1-10 as a gate, not a refactor

Capability extraction is evaluated inside each domain. The program verifies
that decisions and tests exist but creates no cross-domain abstraction.

### DEC-AUTO-005 - final release remains blocked

The program can complete local coordination while `release_status=BOUNDARY`.
Four independently scoped external receipts may still block the final decision:
Program `AUTH-001` satisfied by Release `AUTH-001`/`UNIT-008` GitHub readback;
Release `AUTH-002`/`UNIT-009` isolated staging; Release `AUTH-003`/`UNIT-010`
production or fail-closed no-release; and Program `AUTH-002` strict consumption
of the Beta Operating `AUTH-003`/`UNIT-009` cohort/legal decision receipt.
Same-numbered records in different packs are not interchangeable, Program does
not reproduce an upstream decision, and none is missing autonomous engineering
work.

## Authorization boundaries

### AUTH-001 - hosted GitHub controls

Active. Required authority: repository administrator capable of reading and
changing rulesets/branch protection, required checks, security scanning, and
deployment provenance. Preconditions: local workflow/config complete, workflow
run green, requested control matrix prepared, no secrets in evidence. Resolution
receipt: redacted API/UI readback with repository, rule identifiers, required
check names, passed commit SHA, and timestamp.

### AUTH-002 - limited-cohort legal decision-receipt consumer

Active receipt-consumer boundary. The only required upstream authority and
producer are Beta Operating `AUTH-003`/`UNIT-009`; Program has no independent
product-owner or counsel approval action. Preconditions: a current
`LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` binds the intended cohort, Terms,
Privacy Notice, telemetry, retention, support owner/window, incident-policy
digest, approval scope/date/actor, producer manifest, candidate SHA, and expiry.
Resolution: strict Program validation accepts that immutable receipt for the
exact release candidate and confirms the wider/public/paid counsel scope remains
separate. Missing, stale, mismatched, malformed, or wrong-producer evidence keeps
the boundary active; Program never recreates or broadens the decision.

## Risk register

| ID | Risk | Mitigation | Trigger/owner |
|---|---|---|---|
| `RISK-001` | Duplicate or orphan backlog ownership | Exact-once registry check and one primary owner | any registry change / program lead |
| `RISK-002` | Concurrent edits overwrite Publisher/Activity plans | Stable manifest/diff receipt, file lease, serialized delta | receipt hash drift / program lead |
| `RISK-003` | Planning status is mistaken for implementation proof | Tuple and evidence-surface checks | any NOT_STARTED pack / verifier |
| `RISK-004` | Stale receipts produce a false go | Hash/freshness invalidation and fail-closed release row | source/config drift / verifier |
| `RISK-005` | Cross-pack extraction becomes unrelated refactoring | Per-domain evidence and no standalone implementation lane | scope growth / architect |
| `RISK-006` | GitHub, staging, production, or legal authority is implied, duplicated, or substituted across packs | Pack-qualified Program `AUTH-001`, Release `AUTH-001/002/003`, Operating `AUTH-003`, Program `AUTH-002` strict receipt consumption, distinct receipts, and blocked final unit | release decision / owner |

## Rejected alternatives

- One monolithic Beta implementation pack: rejected because it duplicates
  existing ownership and creates broad shared-file conflicts.
- A second Publisher or Activity pack: rejected because the active packs already
  own the relevant routes, components, and contracts.
- Marking the program `IMPLEMENTATION_READY`: rejected because multiple owner
  packs remain unfinished and the final unit is authorization-blocked.
- Treating approval as a normal test: rejected because neither GitHub admin
  authority nor legal approval can be manufactured by local execution.
