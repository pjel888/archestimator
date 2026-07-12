# Release Integrity And Golden Path

> **Current execution contract:** Read AGENTIC_EXECUTION_PROFILE.md before
> implementation. It applies the current lean agent workflow and User Test
> Authorization Gate to all older execution, testing, browser, validation, and
> reviewer language in this pack without changing product scope or status.
>
> **Freshness:** CURRENT_SOURCE_AND_READINESS_AUDIT.md is the authoritative
> 2026-07-12 source-drift and individual readiness verdict. Older line numbers,
> migration tails, and active-pack locations are historical navigation only.

## Outcome

Make every external Beta release traceable to an active, required CI run, a deterministic Cloudflare-parity golden-path run, and a generated readiness manifest for the exact deployed commit. This pack owns `BETA-P0-01`, `BETA-P0-02`, `BETA-P0-10`, and release integration for `BETA-P1-09`; the Publisher and Activity packs supply versioned public-review and activity receipts.

## Status

| Field | Value |
| --- | --- |
| Package | `IMPLEMENTATION_READY` |
| Implementation | `NOT_STARTED` |
| Release | `BOUNDARY` |
| Lifecycle | `ACTIVE` |
| Action ceiling | `EXTERNAL_ACTIONS` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The dependency-closed implementation slice `SLICE-001` is ready. GitHub control mutation, creation or mutation of a staging resource outside the bindings in `wrangler.jsonc`, and production deployment are separate boundaries (`AUTH-001` through `AUTH-003`). Read-only discovery is not authorization-gated, and local workflow files never prove hosted enforcement.

## Scope

- Reactivate pinned GitHub workflows with mandatory typecheck, lint, error-handling, unit/DOM/security/migration, OpenNext build, and critical browser checks.
- Bind deploy eligibility to the exact commit that passed required checks.
- Create deterministic staging seed and cleanup contracts for the audit's full access-to-recipient-decision path.
- Retain browser and build evidence on failure and run authenticated post-deploy smoke.
- Generate one machine-readable and one human-readable release truth report from current evidence.
- Correct README claims by deriving them from the manifest rather than maintaining a second readiness narrative.

## Non-goals

- Implementing onboarding, estimate health, publication analytics, output calculations, provider recovery, telemetry policy, legal approval, or auth mitigation.
- Enabling a paid service, sending real external email, or changing external GitHub/Cloudflare production controls during this plan-only improvement run.
- Treating the two in-progress `2026-07-10` plan packs as completed product behavior.
- Expanding the Beta into billing, AI estimating, full mobile editing, or immutable legal-contract issuance.

## Dependencies And Ownership

| Boundary | Owner | Contract |
| --- | --- | --- |
| First-value journey | `First-User-Activation-And-Cohort-Operations` | Supplies deterministic activation milestones and fixtures. |
| Estimate health | `Estimate-Intelligence-And-Price-Governance` | Supplies health route and correction-path assertions. |
| Total parity | `Calculation-And-Output-Parity` | Supplies golden calculation fixture and cross-surface oracle. |
| Provider recovery | `Hosted-D1-Recovery-And-Data-Resilience` | Supplies current provider-backed restore artifact. |
| Operating gates | `Beta-Operating-Contract` | Supplies telemetry, incident, auth-risk, legal, and support evidence. |
| Activity and public review | `Activity-History-Mapping` and `Publisher-And-Shared-Pages` | Current manifest IDs, artifact digests, accepted requirement IDs, unit status, and release-handoff receipts. |
| Out-of-suite candidate capability | Its owning pack | A current validated receipt when included in the candidate, or a content-addressed exclusion disposition when absent. Corporate Accounts is `NOT_READY` until it has a valid manifest and resolved authorization contract. |

The release pack owns `.github/workflows/**`, CI contract tests, staging seed/cleanup orchestration, the cross-domain golden-path spec, release evidence collectors, and readiness-manifest generation. Feature packs own their application behavior and focused tests.

## Critical Path

`UNIT-001 -> UNIT-002`; `UNIT-003 -> UNIT-004`; `UNIT-002 + UNIT-004 -> UNIT-005 -> UNIT-006`; `UNIT-001..006 -> UNIT-007`; then independently authorized `UNIT-008`, `UNIT-009`, and `UNIT-010`.

Units 001 through 007 form the ready slice: local implementation plus read-only
hosted capability discovery and three redacted authorization packets. Units 008
through 010 remain blocked by their named boundary and prerequisite receipts.
The local criteria are independently testable; staging, GitHub, and production
criteria do not hide local work inside a `BOUNDARY` status.

## Artifact Map

- `SOURCE_AND_CODEBASE_AUDIT.md`: observed evidence and drift.
- `REQUIREMENTS_AND_DECISIONS.md`: traceable requirements, decisions, risks, and authorization packet.
- `IMPLEMENTATION_PLAN.md`: exact work units, paths, dependencies, and handoffs.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: proof matrix, rollout, rollback, and completion audit.
- `CI_SOURCE_AND_GITHUB_CONTROL_MODEL.md`: local workflow versus hosted-control contract.
- `CANDIDATE_PROVENANCE_AND_UPLOAD_ARTIFACT_GRAPH.md`: immutable upload input graph and admission rules.
- `GOLDEN_FIXTURE_CREDENTIAL_AND_CLEANUP_CONTRACT.md`: run-owned data, ephemeral credentials, and cleanup safeguards.
- `GOLDEN_PATH_JOURNEY_DENIAL_AND_ACCESSIBILITY.md`: cross-step denial, persistence, and accessibility obligations.
- `RELEASE_EVIDENCE_SCHEMA_AND_RETENTION.md`: evidence envelope, redaction, expiry, and composition rules.
- `SUPPLY_CHAIN_SECRET_AND_THREAT_MODEL.md`: workflow, artifact, credential, provider-state, and authority threats.
- `ADVERSARIAL_TEST_AND_HOSTED_PROOF_PLAN.md`: local negative fixtures and separated hosted proof lanes.
- `DEPLOYMENT_ROLLBACK_REPROMOTION_AND_OPERATIONS.md`: candidate promotion, code rollback, exact re-promotion, and final-state proof.
- `AUTHORIZATION_BOUNDARIES_AND_FINAL_AUDIT.md`: three independent authority packets and readiness audit.
- `LOOP_LEDGER.md`: resumable run state.
- `plan-pack.json`: machine-readable status and traceability authority.

## Restart Packet

1. Re-run `git status --short --branch` and compare release-owned paths with the baseline in `SOURCE_AND_CODEBASE_AUDIT.md`.
2. Validate all nine 2026-07-10 pack manifests and capture their package IDs,
   artifact digests, statuses, and named handoff receipts.
   For each out-of-suite capability that could be in the candidate, capture a
   current validated receipt or `CANDIDATE-DEPENDENCY-DISPOSITION-v1` proving
   exact source/revision exclusion.
3. Run `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Release-Integrity-And-Golden-Path`.
4. Start `UNIT-001` at `.github/workflows-disabled/ci.yml`; restore it as an active workflow without changing hosted settings.
5. Append commands, outputs, changed decisions, receipt hashes, and the exact next action to `LOOP_LEDGER.md`.

Implementation stops only when all local units are verified, every applicable
external boundary is resolved, the exact deployed SHA has retained green evidence,
and the generated release decision is green. This `PLAN_ONLY` improvement stops
when all artifacts validate, executable slices are dependency-closed, and the
remaining boundaries are explicit and independently resumable. A plan-validator
pass proves the plan, not Beta-release readiness.
