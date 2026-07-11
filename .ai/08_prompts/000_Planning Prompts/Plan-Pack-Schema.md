# Frontier Plan-Pack Schema

<!-- FRONTIER-PLAN-SUITE: 2026-07-11 -->

This schema defines the logical contract for plan packs. Physical file count is
adaptive; every applicable logical field is mandatory. The `tests` index may be
empty when all criteria use `test_requirement: NOT_REQUIRED`.

## 1. Depth Profile

| Profile | Use | Required shape |
|---|---|---|
| `focused` | Narrow, reversible, bounded work | Compact pack; all logical fields may share a few files |
| `standard` | Multi-file or multi-domain work | Separate high-density artifacts only where execution, decisions, required tests, or evidence have distinct owners/lifecycles |
| `high-blast-radius` | Auth, security, data, provider, migration, release, architecture, agent framework, or codebase-wide work | Durable research, threat/data/failure models, rollback proof, live ledger, adversarial QA, final audit |

Choose the lightest profile that covers the risk. Do not omit a logical field
because the pack is compact, and do not create empty files to satisfy a count.
Adaptive file count has no fixed minimum or maximum. For `standard` and
`high-blast-radius` packs, split an omnibus artifact when independently gated
domains have different owners, evidence lifecycles, invalidation triggers,
reviewers, or bounded-retrieval needs. Keep it combined when a split would only
repeat context. Every split must be substantive, cross-linked, registered in
`plan-pack.json`, and subordinate to one canonical execution artifact.

## 2. Canonical Manifest

Every pack has one versioned `plan-pack.json`. New or materially refreshed packs
use `suite_version: 2026-07-11`; the validator accepts `2026-07-10` only for
compatibility with existing packs. The manifest is the machine-readable index
and state record; Markdown supplies rationale and bounded execution context. Use
stable key order and UTF-8/LF when hashing. Hash file bytes with SHA-256 and store
repo-relative paths. For `manifest_sha256`, delete the top-level field, recursively
sort every object key lexicographically, preserve array order, serialize with
`JSON.stringify` and no whitespace/BOM/trailing newline, then SHA-256 the UTF-8
bytes. This canonicalization is mandatory for every writer/validator.

The example below is the exact executable focused fixture at
`tests/fixtures/planning-prompt-suite/valid-plan-pack/plan-pack.json`. It uses
one allowed value per enum; the state-machine sections below list all alternatives.

### 2.1 Scoped baseline fingerprint

Every non-fixture pack must record an ordered, duplicate-free list of literal
repo-relative pathspecs in its source audit and compute `baseline` with
`PLAN-PACK-SCOPED-BASELINE-v1`. Reject absolute paths, traversal, pathspec magic,
symlinks, and non-regular untracked files. Do not silently widen or narrow the
recorded scope while refreshing hashes.

1. Set `head` to `git rev-parse HEAD`.
2. Compute `scoped_status_sha256` from the exact raw bytes emitted by
   `git status --porcelain=v1 -z --untracked-files=all -- <pathspecs>`.
3. Compute the tracked stream from
   `git diff --binary --no-ext-diff --no-textconv HEAD -- <pathspecs>`. This
   binds staged and unstaged changes relative to `head`.
4. Enumerate matching untracked regular files with
   `git ls-files --others --exclude-standard -z -- <pathspecs>`, sort their
   repo-relative UTF-8 paths by raw byte order, and append one record per file:
   `UNTRACKED\0<path>\0<size-decimal>\0<file-sha256>\0`.
5. Compute `scoped_diff_sha256` over the byte stream
   `TRACKED\0<tracked-stream>\0PLAN-PACK-UNTRACKED-v1\0<untracked-records>`.

The untracked records bind file names and contents without embedding source in
the manifest. A verifier must recompute both digests from the recorded pathspecs
before implementation or status elevation. Any mismatch is source drift: append
a ledger observation, re-audit the affected claims, then refresh the baseline.
An empty SHA-256 value is valid only when it is the actual result of the specified
stream; zero-filled placeholders are never a frozen baseline.

<!-- BEGIN VALID PLAN-PACK EXAMPLE -->
```json
{
  "schema_version": "1.0",
  "suite_version": "2026-07-11",
  "package_id": "PLAN-2026-07-11-validator-fixture",
  "profile": "focused",
  "package_action_ceiling": "IMPLEMENT_LOCAL",
  "last_observed_run_scope": "IMPLEMENT_LOCAL",
  "package_status": "IMPLEMENTATION_READY",
  "implementation_status": "COMPLETE",
  "release_status": "READY",
  "plan_lifecycle": "ARCHIVED",
  "terminal_status": "ACHIEVED",
  "baseline": {
    "head": null,
    "scoped_status_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "scoped_diff_sha256": "0000000000000000000000000000000000000000000000000000000000000000"
  },
  "canonical_execution_artifact": "IMPLEMENTATION_PLAN.md",
  "artifacts": [
    {
      "id": "ART-001",
      "role": "entrypoint",
      "path": "README.md",
      "sha256": "c2b516b2eff910dc9a85dbc08f0ed3d2d758ac625f571cd0f6f81c50906dda66"
    },
    {
      "id": "ART-002",
      "role": "canonical-execution",
      "path": "IMPLEMENTATION_PLAN.md",
      "sha256": "53d7c0f2ad371983382716c2d4684542173f511ff1ba6cce6dfe4e7361672ec7"
    },
    {
      "id": "ART-003",
      "role": "evidence",
      "path": "evidence/check.txt",
      "sha256": "e40a27a5ea8e1fdd3b754dbb42c96c1ba2f054b821771d6f023fa59a1313ec06"
    }
  ],
  "sources": [
    {
      "id": "SRC-001",
      "status": "CURRENT",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "affected_ids": ["REQ-001", "SEC-001"]
    }
  ],
  "requirements": [
    {
      "id": "REQ-001",
      "status": "ACCEPTED",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "source_ids": ["SRC-001"],
      "unit_ids": ["UNIT-001"],
      "criterion_ids": ["AC-001"]
    },
    {
      "id": "SEC-001",
      "status": "ACCEPTED",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "source_ids": ["SRC-001"],
      "unit_ids": ["UNIT-001"],
      "criterion_ids": ["AC-001"]
    }
  ],
  "assumptions": [],
  "risks": [],
  "criteria": [
    {
      "id": "AC-001",
      "status": "PASS",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "test_requirement": "NOT_REQUIRED",
      "test_trigger": "NONE",
      "test_rationale": "Focused source inspection and deterministic validator evidence prove this criterion without a product test.",
      "requirement_ids": ["REQ-001", "SEC-001"],
      "test_ids": [],
      "evidence_ids": ["EVID-001"],
      "authorization_boundary_id": null
    }
  ],
  "tests": [],
  "gates": [
    {
      "id": "GATE-VERIFY-001",
      "status": "PASS",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "criterion_ids": ["AC-001"],
      "evidence_ids": ["EVID-001"],
      "authorization_boundary_id": null
    }
  ],
  "units": [
    {
      "id": "UNIT-001",
      "status": "VERIFIED",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "depends_on": [],
      "requirement_ids": ["REQ-001", "SEC-001"],
      "risk_ids": [],
      "evidence_ids": ["EVID-001"]
    }
  ],
  "decisions": [
    {
      "id": "DEC-AUTO-001",
      "status": "ACTIVE",
      "artifact_path": "IMPLEMENTATION_PLAN.md",
      "affected_ids": ["REQ-001"]
    }
  ],
  "authorization_boundaries": [],
  "ready_slices": [],
  "evidence_index": [
    {
      "id": "EVID-001",
      "status": "PASS",
      "artifact_path": "evidence/check.txt",
      "sha256": "e40a27a5ea8e1fdd3b754dbb42c96c1ba2f054b821771d6f023fa59a1313ec06",
      "claim_ids": [
        "REQ-001",
        "SEC-001",
        "UNIT-001",
        "AC-001",
        "GATE-VERIFY-001"
      ],
      "source_revision": "fixture-v1",
      "valid_until": null
    }
  ],
  "stale_triggers": ["source-or-config-hash-change"],
  "next_unit": null,
  "updated_at": "2026-07-11T00:00:00.000Z",
  "manifest_sha256": "625dd2494e604efa6cec9aeba898238f8858743ea1b6798b7605df4f5084b9a5"
}
```
<!-- END VALID PLAN-PACK EXAMPLE -->

The full pack may normalize arrays into referenced Markdown/JSON artifacts, but
the manifest must retain IDs, paths, hashes, status, and canonical pointers.
Validation proves: required collections/fields and supported ID families exist;
references are reciprocal and non-orphaned; real artifact paths stay inside the
pack without symlinks; hashes match; exactly one canonical execution artifact is
selected; the unit graph is acyclic; ready slices contain their transitive
dependencies; required evidence is current; and the status tuple is semantically
possible. `--write` refreshes ordinary artifact/self hashes only after all
semantic checks pass. It never rewrites an evidence fingerprint: changed proof
must be marked `STALE` or paired with a fresh proof-producer receipt. It also
refuses to refresh a changed `CURRENT` source, readiness-bearing canonical
artifact, or artifact carrying closed/proof-bearing records; invalidate and
explicitly re-prove dependent claims before updating those hashes.
The runtime receipt/ledger, not the manifest, proves that `current_run_scope`
permits the active stage. Update the manifest last through one
lead/integrator after a frozen-state validation pass.

## 3. Stable IDs

- `SRC-*`: source/evidence input
- `REQ-*`: functional/system requirement
- `UX-*`: UX/accessibility requirement
- `SEC-*`: security/privacy requirement or control
- `DATA-*`: data/migration/integrity requirement
- `PERF-*`: performance/reliability requirement
- `OPS-*`: operations/rollout/support requirement
- `ASSUMP-*`: explicit reversible assumption
- `DEC-AUTO-*`: autonomously resolved material decision
- `AUTH-*`: true authorization boundary
- `RISK-*`: risk
- `AC-*`: acceptance criterion
- `TEST-*`: selected test/adversarial proof scenario; optional when the criterion
  uses `test_requirement: NOT_REQUIRED`
- `EVID-*`: evidence record
- `ART-*`: hashed artifact record
- `UNIT-*`: implementation unit
- `GATE-*`: merge/release/proof gate

IDs are stable. Do not renumber after publication; retire with status/reason.

Use independent state machines:

- Source: `CURRENT|STALE|UNKNOWN`.
- Requirement: `PROPOSED|ACCEPTED|DEFERRED|REJECTED|BLOCKED`.
- Assumption: `ACTIVE|VALIDATED|INVALIDATED|RETIRED`.
- Risk: `OPEN|MITIGATED|ACCEPTED|REALIZED|CLOSED`.
- Unit: `PLANNED|READY|IN_PROGRESS|DONE|VERIFIED|BLOCKED|SUPERSEDED`.
- Evidence: `PLANNED|COLLECTED|PASS|FAIL|STALE|SKIPPED`.
- Test: `PLANNED|PASS|FAIL|STALE|SKIPPED`.
- Criterion: `PASS|FAIL|BOUNDARY|N/A`.
- Decision: `ACTIVE|SUPERSEDED|REVERSED`.
- Authorization boundary: `ACTIVE|RESOLVED|SUPERSEDED`.

`BOUNDARY` is a criterion result caused by a true `AUTH-*`; `N/A` is
applicability. Neither is an evidence result.

## 4. Logical Artifact Manifest

### A. Entry Point And Goal Capsule

- Exact user/system job and before-state.
- Target outcome and measurable success.
- Scope, non-goals, constraints, proof boundary, and stop condition.
- Profile and why it is proportionate.
- Canonical implementation entrypoint and artifact map.
- `package_status`: `IMPLEMENTATION_READY`, `CONDITIONALLY_READY` by named
  slice, or `NOT_READY` with an autonomous repair path.
- `implementation_status`: `NOT_STARTED|IN_PROGRESS|COMPLETE|INCOMPLETE`.
- `release_status`: `NOT_EVALUATED|READY|BOUNDARY|NOT_READY`.
- `plan_lifecycle`: `N/A|ACTIVE|ARCHIVE_READY|ARCHIVED`.
- `terminal_status`: `ACTIVE|ACHIEVED|AUTH_BLOCKED|TECH_BLOCKED|CANCELLED`.
- `package_action_ceiling`: `IMPLEMENT_LOCAL|EXTERNAL_ACTIONS`; this describes
  intended package reach and never grants authority.
- `last_observed_run_scope`: the most recent recomputed runtime scope, retained
  only as history.

These fields describe different facts. Planning readiness never implies
implementation completion, and local implementation completion never implies
release authority or hosted proof.

### B. Coordination And Durable State

- Lead, lanes, roles/`agent_type`, goals, owned scope, dependencies, outputs,
  evidence, and status.
- File ownership and shared-file integrator assignments.
- Append-only loop ledger with decisions, conflicts, commands/results,
  checkpoints, resume point, and cleanup.
- Run/goal ID, plan-manifest hash, baseline HEAD and scoped status/diff hash,
  exact next DAG node, evidence fingerprints, and invalidation history.
- Lead-single-writer leases for files and contended non-file resources:
  migration numbers, generated artifacts, ports/dev servers, browser/provider
  sessions, temp logs, fixtures, test databases, queues/buckets, rate limits,
  and evidence paths. Cross-process claims use the kernel's atomic ignored
  lease-directory registry and are mirrored into the durable ledger.
- Capability census: selected tools/skills/agents, why they matter, and required
  substitutions. Do not enumerate irrelevant capabilities.

### C. Source And Evidence Ledger

| ID | Source/location | Authority | Freshness | Inspected scope | Fact/inference | Contradictions | Affected IDs |
|---|---|---|---|---|---|---|---|

Every version-sensitive external claim cites local installed docs or an official
primary source. Research must change a decision, unit, risk, or proof gate.

### D. Requirements And Traceability

| Requirement ID | Source IDs | Outcome | Decision IDs | Unit IDs | AC IDs | Test requirement / Test-Gate IDs | Evidence class | Final status |
|---|---|---|---|---|---|---|---|---|

No orphan requirement, work unit, selected test, gate, risk, or decision. Explicitly
reject/defer out-of-scope items with rationale; do not silently drop them.

### E. Current-State Model

- Repo-relative files, symbols, routes, configs, schemas, provider bindings,
  relevant evidence/test surfaces, and execution flows.
- Current user/data/control flow and ownership boundaries.
- Known-red baseline and pre-existing failures separated from new failures.
- Direct/transitive blast radius and compatibility constraints.
- Stale plan/doc claims and reconciliation decisions.

### F. Target-State Model

- User journeys and full state matrix.
- Architecture, interfaces, domain invariants, state/data ownership, and
  lifecycle.
- API/action/event/error/idempotency contracts.
- Security boundaries, threat/credential taxonomy, abuse/denial behavior.
- Performance budgets/evaluators and reliability/degraded behavior.
- Observability, operations, support, rollout, rollback/fix-forward.
- Alternatives and `DEC-AUTO-*` records.

### G. Execution DAG

Represent implementation units as a directed acyclic graph:

- Critical path and dependency layers.
- Safe parallel read/write lanes.
- Serialized shared contracts/files.
- Migration, generated-artifact, schema, and rollout order.
- Integration checkpoints and restart/resume points.
- Replanning triggers when current reality invalidates the unit.

### H. Verification And Adversarial QA

- Acceptance criteria are observable and falsifiable.
- Every criterion records `test_requirement` as `NOT_REQUIRED`, `TARGETED`, `BROADER`, or `TEST_TASK`, `test_trigger` as `NONE`, `EXPLICIT_TEST_TASK`, or `MVP_CRITICAL_INVARIANT`, and a substantive `test_rationale` explaining why cheaper evidence is or is not sufficient. `NOT_REQUIRED` is the default and requires `test_trigger: NONE` plus `test_ids: []`; `TEST_TASK` requires `test_trigger: EXPLICIT_TEST_TASK`.
- `BROADER` rationale must state why targeted evidence is insufficient. The
  machine validator enforces these mappings for suite `2026-07-11`; legacy
  `2026-07-10` packs remain compatible without the new fields.
- `TARGETED`, `BROADER`, and `TEST_TASK` require linked `TEST-*`; a criterion
  cannot be `PASS` unless every linked required test is `PASS`.
- Each criterion names evidence class, setup, command/procedure, expected pass
  signal, actual evidence destination, cleanup, and failure response.
- Cover applicable happy, nil/missing, empty, invalid, boundary, error,
  permission-denied, concurrency, retry/idempotency, partial-success, recovery,
  accessibility, performance, and prompt-injection scenarios.
- Browser/provider/production proof appears only when the claim requires it.
- Final audit maps every original requirement and named deliverable to current
  evidence.

## 5. Decision Resolution Record

```text
DEC-AUTO-###
Question:
Affected IDs:
Evidence and freshness:
Options:
Decision:
Why this option:
Rejected alternatives:
Confidence:
Consequences:
Rollback/revision trigger:
Responsible role:
```

No ordinary choice remains `OPEN`, `TBD`, “owner decision,” or unowned.

## 6. Authorization Boundary Record

```text
AUTH-###
Exact prohibited side effect:
Higher-priority boundary:
Dependent claim only:
Safe fallback/default:
Local prerequisites completed:
Evidence already gathered:
Unblock procedure:
Expected result:
Rollback:
Post-action verification:
```

An `AUTH-*` cannot hide achievable code, selected tests, migration authoring, dry runs,
or documentation.

## 7. Execution Unit Packet

Every `UNIT-*` has a compact core packet runnable from bounded context:

```text
Unit ID and goal:
User/system outcome:
Linked requirement/decision/risk IDs:
Non-goals:
Exact paths and current symbols:
Dependencies and preconditions:
Owned scope and responsible role:
Approach and invariants:
Expected postconditions/compatibility:
Test requirement and trigger:
Selected test IDs (empty for NOT_REQUIRED):
Proof IDs, command/procedure, expected signal, evidence class/path:
Failure response and replan trigger:
Checkpoint/resume state:
```

Add only gate-triggered fields: shared-file/interface contention, parallel layer,
and leases for coordinated resources; security/data/UX/performance/operations
contracts when those gates apply; observability for changed runtime behavior;
rollback/fix-forward for destructive, data, provider, release, or other
non-trivial recovery risk; and cleanup when the unit creates temporary state.

Do not paste speculative production code. Give enough exact context to avoid
broad rediscovery while requiring revalidation immediately before editing.

## 8. Readiness Matrix

Use criterion status `PASS`, `FAIL`, `BOUNDARY`, or `N/A` per field, with
evidence and freshness. Evidence records separately use
`PLANNED|COLLECTED|PASS|FAIL|STALE|SKIPPED`; proof-boundary labels are
`local-only|provider-proven|browser-proven|manual-proof-pending|not-verified`.

| Field | Status | Evidence | Missing/contradicted | Repair or AUTH packet |
|---|---|---|---|---|
| Intent and scope | | | | |
| Source authority/freshness | | | | |
| Requirements/traceability | | | | |
| Current-state grounding | | | | |
| Decisions closed | | | | |
| Execution DAG/units | | | | |
| UX/accessibility | | | | |
| Architecture/data/contracts | | | | |
| Security/privacy | | | | |
| Performance/reliability | | | | |
| Test decision / selected adversarial QA | | | | |
| Operations/rollout/rollback | | | | |
| Completion audit | | | | |

Numeric scores may summarize this matrix but cannot override any `FAIL`.
Reviewer provenance is metadata, not a score ceiling.

The validator enforces cross-state invariants. In particular, `COMPLETE` requires
`package_status: IMPLEMENTATION_READY`, only `VERIFIED` non-superseded units, and
no ready slice/next unit; `ACHIEVED` requires `COMPLETE` plus non-failing required
criteria/selected tests/evidence and lifecycle `N/A`, `ARCHIVE_READY`, or `ARCHIVED`;
`last_observed_run_scope` cannot exceed `package_action_ceiling`;
`ARCHIVE_READY` or `ARCHIVED` requires `ACHIEVED`;
every accepted requirement at `COMPLETE` has a non-superseded `VERIFIED` unit,
and at `ACHIEVED|AUTH_BLOCKED` has a `PASS|BOUNDARY` criterion. `OPEN|REALIZED`
risks block those terminal states. Boundary statuses require an active
authorization-boundary record, and every active boundary reciprocally names a
`BOUNDARY` criterion/gate and forces `release_status: BOUNDARY`; `AUTH_BLOCKED`
also requires no unfinished internal unit or failed internal gate and complete
boundary evidence. `TECH_BLOCKED` requires an incomplete blocked unit with no
ready fallback. Every accepted requirement advertised as ready must reference at
least one `CURRENT` source. `release_status: READY` requires complete
implementation, no active authorization boundary, and no failed/boundary/unrun
required verification. For suite `2026-07-11`, `NOT_REQUIRED` criteria have no
tests, while every linked required test must be `PASS` before its criterion can
pass. Active ready work must name `next_unit`; it must be
`READY|IN_PROGRESS` and belong to a dependency-closed ready slice whose members
are only `VERIFIED`, `READY`, or `IN_PROGRESS`. Source/requirement and risk/unit
trace links are reciprocal.

## 9. Handoff And Resume

The entrypoint must name:

- Canonical implementation artifact.
- Current completed and next-ready units.
- Dependency blockers versus isolated `AUTH-*` boundaries.
- Latest verified worktree/provider state and freshness.
- Decisions/research changed since the last checkpoint.
- Commands already run and evidence locations.
- Exact resume step and context packet.

If native goal tooling is missing or an incompatible goal is active, resume from
the task-local lead-owned ledger. Do not overwrite the other goal or stop.

Before archival, freeze new work, confirm no active lane/lease/resource or
ready/in-progress unit remains, refresh manifest/status/evidence hashes, move the
pack to the canonical archive location, and repair inbound references. Never
archive by leaving a stale active copy, stub, or partial pack.

The executor repairs stale plans and continues. It does not return ordinary
decisions to the owner.
