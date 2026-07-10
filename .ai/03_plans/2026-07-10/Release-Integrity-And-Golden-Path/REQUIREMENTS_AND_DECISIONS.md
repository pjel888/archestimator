# Requirements And Decisions

## Requirements

| ID | Audit mapping | Requirement | Acceptance boundary |
| --- | --- | --- | --- |
| `REQ-001` | `BETA-P0-01` | Active pinned CI runs frozen install, independent typecheck, lint/error-handling, tests, migration/security/design checks, OpenNext build, and critical browser proof. | A protected merge cannot bypass the named checks; skipped or cancelled required jobs fail closed. |
| `REQ-002` | `BETA-P0-01` | Deployments consume only the exact SHA and immutable artifact produced by a successful required-check run. | Manifest, workflow run, artifact, deployment, and hosted marker report the same SHA. |
| `REQ-003` | `BETA-P0-02` | A deterministic, redacted, run-scoped staging fixture creates and cleans the identities, project, estimate, publication, recipient, and collaboration state needed by the golden path. | Repeated setup/cleanup is idempotent; cleanup cannot affect non-fixture data. |
| `REQ-004` | `BETA-P0-02`, `BETA-P1-09` | One unskipped journey proves the audit's 20 access-to-follow-up steps, with per-merge/release/nightly browser and accessibility policy. | Chromium merge path and WebKit mobile review/share release path pass against Cloudflare parity; the Publisher contribution proves its public-review semantics. |
| `REQ-005` | `BETA-P0-01/02` | CI retains redacted failure evidence and automatically runs authenticated post-deploy smoke. | Trace, screenshot, console/network summary, test report, seed/cleanup report, build log, and route smoke are attached to the exact run. |
| `REQ-006` | `BETA-P0-10` | A deterministic collector produces JSON and Markdown release truth for the current commit and refuses stale or contradictory proof. | Report includes every audit release gate, freshness, blocker, and evidence path; exit is nonzero for external-Beta `NO-GO`. |
| `REQ-007` | `BETA-P0-01/10` | Dependency, CodeQL, and secret-scanning posture is explicit and source claims do not imply hosted controls without proof. | Scheduled/update path exists; permission failures and unavailable alerts are recorded as unknown, not clean. |
| `REQ-008` | Cross-pack release gate | Final release composition consumes current artifacts from every owner pack and the two existing packs without taking over their files. | A single release ID joins all pack/proof revisions; missing, stale, or `NOT_READY` dependencies block release. |

## Acceptance Criteria

| ID | Requirement | Current state | Proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` inspects active workflow syntax, pinning, required commands, fail-closed dependencies, and hosted required-check evidence. |
| `AC-002` | `REQ-002` | `BOUNDARY` | `TEST-002` joins successful run SHA, immutable artifact digest, environment approval, deploy SHA, and marker response under `AUTH-001`. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` runs setup twice, cleanup twice, and proves namespace isolation and redaction. |
| `AC-004` | `REQ-004` | `BOUNDARY` | `TEST-004` proves local orchestration/fixtures first, then executes all 20 steps and release WebKit mobile policy on authorized staging under `AUTH-001`. |
| `AC-005` | `REQ-005` | `BOUNDARY` | `TEST-005` proves local reporter/retention contracts first, then verifies hosted artifact retention and authenticated smoke under `AUTH-001`. |
| `AC-006` | `REQ-006` | `FAIL` | `TEST-006` tests green, stale, missing, conflicting-SHA, migration-drift, and open-blocker fixtures. |
| `AC-007` | `REQ-007` | `BOUNDARY` | `TEST-007` validates repository workflows locally and records hosted scanning/rules evidence under `AUTH-001`. |
| `AC-008` | `REQ-008` | `FAIL` | `TEST-008` composes all domain artifacts and rejects missing, stale, superseded, or non-matching revisions. |

## Decisions

### `DEC-AUTO-001` — Split merge, release, and nightly browser scopes

Use Chromium desktop for the required merge journey, add WebKit mobile public-review/recovery for release, and run the wider Firefox/device matrix on a schedule. This preserves fast required feedback while matching the audit's risk boundary. Rejected: running every browser on every change; it increases queue time without adding proportional merge signal.

### `DEC-AUTO-002` — One fixture namespace per workflow run

Create data with a run ID and explicit ownership labels; cleanup queries require both. Rejected: resetting a shared staging database or relying on long-lived manual tokens, because either can destroy concurrent evidence or introduce nondeterminism.

### `DEC-AUTO-003` — Deploy the verified artifact

Build once, record digest and SHA, and promote that artifact. Rejected: rebuilding `main` during deploy, because source and dependency state can diverge from required-check proof.

### `DEC-AUTO-004` — Generate release truth from evidence contracts

The machine-readable report is authoritative; Markdown and README summary are renderings. Rejected: manual checklists as the release source, because the audit demonstrates documentation drift.

### `DEC-AUTO-005` — Cross-pack golden path is an integration test, not a feature owner

Feature packs expose deterministic setup/assertion contracts. This pack owns only orchestration. Rejected: duplicating product selectors, repositories, or calculations in E2E helpers.

### `DEC-AUTO-006` — Discover GitHub plan capabilities before selecting an environment gate

Use rulesets, required checks, deployment-branch restrictions, and environment secrets as the baseline. Add required environment reviewers only when live repository visibility/plan proves the feature is available; current GitHub documentation limits private-repository reviewer gates to Enterprise. Rejected: designing a required-reviewer control that the repository plan may not support.

## Risks

| ID | Risk | Mitigation and linked proof |
| --- | --- | --- |
| `RISK-001` | Re-enabled workflow/deploy code can retain obsolete provider assumptions or be mistaken for hosted enforcement. | Rebuild from current commands/docs, bind exact SHA/digest, separate hosted readback, retain `AUTH-001`; `UNIT-001/002/007`, `AC-001/002/007`. |
| `RISK-002` | Shared staging cleanup or flaky browser orchestration can damage concurrent data or train bypasses. | Run-scoped namespace, least privilege, double cleanup, deterministic server-visible waits, categorized trace, infrastructure-only retry; `UNIT-003/004`, `AC-003/004`. |
| `RISK-003` | Retained smoke/release evidence can be incomplete, stale, or belong to another SHA/environment. | Enforce artifact bundle, source SHA, digest, environment, producer version, timestamp, validity, and cross-pack release ID; `UNIT-005/006/007`, `AC-005/006/008`. |

## Authorization Boundary

### `AUTH-001` — Hosted GitHub and deployment-control mutation/proof

**Why authorization is required:** activating or changing repository rulesets, required checks, deployment-environment reviewers, secrets, scheduled workflows, or a production deployment changes external hosted state and may affect all contributors/users.

**Packet:** exact repository, ruleset/check names, branch target, workflow SHA,
environment/staging URL, requested mutations, secrets referenced by name only,
golden-path and WebKit scope, artifact-retention/smoke actions, rollback procedure,
proof commands, expected effect, and evidence destination. Approval does not
authorize paid services or unrelated repositories. Local workflow, fixture,
browser-contract, reporter, and dry-run implementation proceed without this
boundary; hosted execution/readback cannot.

## Applicability Gates

- `NEXT`: read the relevant installed Next 16 build/deploy/testing docs before changing configuration.
- `SEC`: least-privilege workflow permissions, pinned actions, secret redaction, fork-safe triggers, no untrusted-code secret exposure.
- `DATA`: deterministic seed ownership and destructive-cleanup protections.
- `VERIFY`: unit/contract, browser, hosted, and cross-pack proof are distinct.
- `PERF`: required-check duration and route performance budgets remain observable.
- `OPS`: deploy provenance, evidence retention, rollback, and operator handoff.
- `AGENT`: single release integrator; disjoint feature ownership; existing packs read-only.
- `CLEAN`: remove superseded disabled workflow copies only after hosted activation proof.
