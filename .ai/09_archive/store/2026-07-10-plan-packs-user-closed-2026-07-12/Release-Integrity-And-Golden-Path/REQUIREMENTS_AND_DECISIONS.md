# Requirements And Decisions

## Requirements

| ID | Audit mapping | Requirement | Acceptance boundary |
| --- | --- | --- | --- |
| `REQ-001` | `BETA-P0-01` | Repository CI source uses frozen install, pinned actions, independent typecheck, lint/error-handling, tests, migration/security/design checks, OpenNext build, and critical browser contracts. | Local workflow contract tests prove named jobs, fail-closed dependencies, fork safety, pinning, permissions, and skipped/cancelled handling. |
| `REQ-002` | `BETA-P0-01` | Release metadata binds the checked SHA, lock/tool versions, migration/configuration head, and a canonical digest manifest for every Worker upload input before any deployment. | Local fixtures reject rebuilds, omitted or changed Wrangler/OpenNext inputs, ref/SHA mismatch, missing or cancelled checks, mutable artifacts, and conflicting metadata. |
| `REQ-003` | `BETA-P0-02` | A deterministic, redacted, run-scoped fixture contract creates and cleans the identities, project, estimate, publication, recipient, and collaboration state needed by the golden path. | Repeated setup/cleanup is idempotent; host/binding guards and ownership labels prevent non-fixture mutation. |
| `REQ-004` | `BETA-P0-02`, `BETA-P1-09` | One unskipped test specification encodes all 20 access-to-follow-up steps with exact route, fixture, action, server-authoritative assertion, and contributing pack receipt. | Local contract tests prove complete orchestration, stable selectors, persistence assertions, browser policy, no arbitrary sleeps, and no default skip. |
| `REQ-005` | `BETA-P0-01/02` | Reporter and smoke-verifier contracts retain redacted failure evidence and reject unauthenticated, stale, wrong-environment, or wrong-SHA proof. | Local intentional-failure fixtures produce the complete bounded-retention bundle and deterministic denial results. |
| `REQ-006` | `BETA-P0-10` | A deterministic collector produces JSON and Markdown release truth for the current commit and refuses stale or contradictory proof. | Report includes every audit release gate, freshness, blocker, and evidence path; exit is nonzero for external-Beta `NO-GO`. |
| `REQ-007` | `BETA-P0-01/10` | Dependency, CodeQL, and secret-scanning source contracts plus read-only hosted discovery represent unavailable endpoints as `UNKNOWN`, never clean. | Local tests prove least privilege, pinned/scheduled source, endpoint/error classification, redaction, and no false-clean rendering. |
| `REQ-008` | Cross-pack release gate | Final release composition consumes all nine current manifests and named handoff receipts without taking over feature-pack files. Any out-of-suite capability whose source is included in the candidate, including Corporate Accounts, supplies a current validated receipt; otherwise the candidate supplies an exact exclusion disposition. | A single release ID joins package ID, artifact digest, accepted criterion/unit status, source revision, producer version, and freshness; every candidate capability is either validated as included or proven excluded, and missing, stale, superseded, non-ready, or ambiguous dependencies fail closed. |
| `REQ-009` | `BETA-P0-01` hosted enforcement | The live GitHub repository requires the exact named checks and records ruleset, bypass, environment, retention, and scanning state. | Authorized before/after readback proves the controls for the target branch and workflow SHA. |
| `REQ-010` | `BETA-P0-02` hosted staging | An isolated, explicitly identified staging surface runs the deterministic Chromium 20-step path and WebKit mobile public-review path without touching production or foreign fixture data. | Authorized run evidence joins staging URL hash, resource IDs, fixture ID, browser/project, deploy SHA, cleanup digest, and pack receipts. |
| `REQ-011` | `BETA-P0-01/10` production release | Production promotes only the Worker version returned by uploading the verified full input graph; authenticated smoke, exact-SHA marker, retained evidence, conditional code-rollback rehearsal, exact-candidate re-promotion, and final release manifest describe the same release ID. | Authorized preflight, deploy, rollback, exact-candidate re-promotion, smoke/gate rerun, and final traffic readback prove one candidate or record a fail-closed no-release decision, actual final deployed version, rollback result, and separate data/schema recovery state. |

## Acceptance Criteria

| ID | Requirement | Current state | Proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` inspects workflow syntax, pinning, required commands, fail-closed dependencies, fork safety, and independent typecheck. |
| `AC-002` | `REQ-002` | `FAIL` | `TEST-002` exercises passed, failed, missing, skipped, cancelled, stale, omitted-input, mutable-input, rebuilt-ref, and mismatched-SHA fixtures against the complete upload graph. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` runs setup twice, cleanup twice, and proves namespace isolation and redaction. |
| `AC-004` | `REQ-004` | `FAIL` | `TEST-004` proves all 20 local orchestration contracts, exact fixture/assertion mapping, browser tags, persistence checks, and no default skip. |
| `AC-005` | `REQ-005` | `FAIL` | `TEST-005` proves complete redacted reporter bundles, retention metadata, and smoke-verifier denials without a hosted side effect. |
| `AC-006` | `REQ-006` | `FAIL` | `TEST-006` tests green, stale, missing, conflicting-SHA, migration-drift, and open-blocker fixtures. |
| `AC-007` | `REQ-007` | `FAIL` | `TEST-007` validates workflow security and read-only discovery classification, including 401/403/404/rate-limit/unavailable responses as `UNKNOWN`. |
| `AC-008` | `REQ-008` | `FAIL` | `TEST-008` composes all domain artifacts and rejects missing, stale, superseded, non-matching, or candidate-ambiguous revisions; Corporate source requires a validated receipt when included or exact exclusion proof when absent. |
| `AC-009` | `REQ-009` | `BOUNDARY` | `TEST-009` captures GitHub ruleset/check-source eligibility/environment/retention/scanning before-and-after proof under `AUTH-001`. |
| `AC-010` | `REQ-010` | `BOUNDARY` | `TEST-010` runs Chromium and WebKit against the approved isolated staging surface under `AUTH-002`. |
| `AC-011` | `REQ-011` | `BOUNDARY` | `TEST-011` uploads the verified full input graph, promotes its returned version ID, runs authenticated smoke and an eligibility-gated code rollback rehearsal, re-promotes that exact candidate, reruns marker/auth/denial/gates, proves final traffic state, and only then regenerates exact-SHA release truth under `AUTH-003`. |

## Decisions

### `DEC-AUTO-001` — Split merge, release, and nightly browser scopes

Use Chromium desktop for the required merge journey, add WebKit mobile public-review/recovery for release, and run the wider Firefox/device matrix on a schedule. This preserves fast required feedback while matching the audit's risk boundary. Rejected: running every browser on every change; it increases queue time without adding proportional merge signal.

### `DEC-AUTO-002` — One fixture namespace per workflow run

Create data with a run ID and explicit ownership labels; cleanup queries require both. Rejected: resetting a shared staging database or relying on long-lived manual tokens, because either can destroy concurrent evidence or introduce nondeterminism.

### `DEC-AUTO-003` — Deploy the verified artifact

Build once; record SHA plus a canonical digest manifest covering `worker.ts`, every transitively imported Worker module/asset, `wrangler.jsonc`, `open-next.config.ts`, `.open-next`, lock/tool versions, non-secret configuration and binding identity, secret names/version identifiers without values or reversible hashes, and migration head; upload from that exact verified CI workspace through OpenNext and promote only the returned Worker version ID. Rejected: treating `.open-next` alone as the immutable artifact or rebuilding `main` during deploy, because either can diverge from required-check proof.

### `DEC-AUTO-004` — Generate release truth from evidence contracts

The machine-readable report is authoritative; Markdown and README summary are renderings. Rejected: manual checklists as the release source, because the audit demonstrates documentation drift.

### `DEC-AUTO-005` — Cross-pack golden path is an integration test, not a feature owner

Feature packs expose deterministic setup/assertion contracts. This pack owns only orchestration. Rejected: duplicating product selectors, repositories, or calculations in E2E helpers.

### `DEC-AUTO-006` — Discover GitHub plan capabilities before selecting an environment gate

Use rulesets, required checks, deployment-branch restrictions, and environment secrets as the baseline. Add required environment reviewers only when live repository visibility/plan proves the feature is available; current GitHub documentation limits private-repository reviewer gates to Enterprise. Rejected: designing a required-reviewer control that the repository plan may not support.

### `DEC-AUTO-007` — Keep local proof and external actions independently resumable

Use one ready read-only discovery packet and three blocked mutation/execution
packets: GitHub controls, out-of-scope staging resources, and production release.
Rejected: one omnibus authorization unit, because it hides locally executable work,
couples unrelated authorities, and makes partial completion impossible to resume.

## Risks

| ID | Risk | Mitigation and linked proof |
| --- | --- | --- |
| `RISK-001` | Workflow/deploy source can retain obsolete provider assumptions or be mistaken for hosted enforcement. | Rebuild from current commands, bind exact SHA/digest, render live state only from readback, and keep `AUTH-001` distinct; `UNIT-001/002/007/008`, `AC-001/002/007/009`. |
| `RISK-002` | Shared staging cleanup or flaky browser orchestration can damage concurrent data or train bypasses. | Run-scoped namespace, host/binding refusal, double cleanup, foreign canary, deterministic server-visible waits, categorized trace, infrastructure-only retry; `UNIT-003/004/009`, `AC-003/004/010`. |
| `RISK-003` | Retained smoke/release evidence can be incomplete, stale, belong to another SHA/environment, or imply a data rollback that Worker version rollback cannot perform. | Enforce the full upload-input manifest, source SHA, environment, producer version, timestamp, validity, pack receipt, release ID, rollback eligibility, and separate data/schema recovery state; `UNIT-002/005/006/010`, `AC-002/005/006/008/011`. |
| `RISK-004` | One broad authorization packet can accidentally authorize unrelated hosted mutations. | One actor/resource/action/target packet per boundary, read-only discovery before mutation, exact rollback, paid-service exclusion, and no implied authority; `UNIT-007/008/009/010`, `AC-009/010/011`. |

## Authorization Boundaries

### `AUTH-001` — GitHub control mutation

**Why authorization is required:** activating or changing repository rulesets,
required checks, deployment environments/secrets, bypass actors, retention, or
scheduled workflows changes external GitHub state and can affect contributors.

**Packet:** repository and owner, branch target, ruleset/check names plus expected
source app, recent successful eligibility run, environment names, workflow SHA,
requested mutations, secret names only, current-state digest,
rollback payload, proof commands, expected effect, and evidence destination.
Approval does not authorize paid services, unrelated repositories, staging
creation, production deployment, or real-recipient email. Read-only API discovery
is outside this mutation boundary and reports unavailable access as `UNKNOWN`.

### `AUTH-002` — Staging resource mutation or hosted golden-path execution

**Why authorization is required:** creating or mutating a staging resource outside
the Cloudflare resources bound in `wrangler.jsonc`, or running an externally visible
browser fixture against it, changes hosted state beyond the standing resource mandate.

**Packet:** account/project/resource IDs, URL hash, environment classification,
fixture namespace, identities and secrets by name only, allowed tables/objects,
20-step browser projects, cleanup SQL/object prefix, foreign-data canary, time
window, cost assertion, rollback, proof commands, and evidence destination.
Approval excludes production and any paid add-on.

### `AUTH-003` — Production deployment and release proof

**Why authorization is required:** production Worker deployment, externally visible
smoke, and rollback can affect users even when underlying bound data resources are
within the standing Cloudflare mandate.

**Packet:** exact full upload-input manifest digest/SHA, Worker and domain, migration
and configuration heads, release ID, current green prerequisite receipts, OpenNext
upload and version-deployment commands, smoke routes and identities by name only,
retained rollback target/version, binding/migration eligibility, code-only rollback
command, separate data/schema recovery reference, monitoring window,
expected effect, and evidence destination. Approval is single-candidate and does
not authorize paid services, unrelated Cloudflare resources, or real-recipient email.

## Applicability Gates

- `NEXT`: read the relevant installed Next 16 build/deploy/testing docs before changing configuration.
- `SEC`: least-privilege workflow permissions, pinned actions, secret redaction, fork-safe triggers, no untrusted-code secret exposure.
- `DATA`: deterministic seed ownership and destructive-cleanup protections.
- `VERIFY`: unit/contract, browser, hosted, and cross-pack proof are distinct.
- `PERF`: required-check duration and route performance budgets remain observable.
- `OPS`: deploy provenance, evidence retention, rollback, and operator handoff.
- `AGENT`: `N/A`; bounded agents and maker/checker separation may execute the
  plan, but this pack changes no agent prompt, routing, memory, authority,
  evidence, state, or completion contract. Agent use alone does not trigger
  the agent-framework applicability gate.
- `CLEAN`: remove superseded disabled workflow copies only after hosted activation proof.
