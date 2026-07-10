# Release Integrity And Golden Path

## Outcome

Make every external Beta release traceable to an active, required CI run, a deterministic Cloudflare-parity golden-path run, and a generated readiness manifest for the exact deployed commit. This pack owns `BETA-P0-01`, `BETA-P0-02`, `BETA-P0-10`, and release integration for `BETA-P1-09`; the existing Publisher pack supplies the public-review accessibility/mobile contribution after circle-back.

## Status

| Field | Value |
| --- | --- |
| Package | `CONDITIONALLY_READY` |
| Implementation | `NOT_STARTED` |
| Release | `BOUNDARY` |
| Lifecycle | `ACTIVE` |
| Action ceiling | `IMPLEMENT_LOCAL` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The local implementation slice is ready. Hosted GitHub ruleset changes, deployment-environment protection, and production smoke execution remain behind `AUTH-001`; this pack does not treat local workflow files as proof that hosted controls are active.

## Scope

- Reactivate pinned GitHub workflows with mandatory typecheck, lint, error-handling, unit/DOM/security/migration, OpenNext build, and critical browser checks.
- Bind deploy eligibility to the exact commit that passed required checks.
- Create deterministic staging seed and cleanup contracts for the audit's full access-to-recipient-decision path.
- Retain browser and build evidence on failure and run authenticated post-deploy smoke.
- Generate one machine-readable and one human-readable release truth report from current evidence.
- Correct README claims by deriving them from the manifest rather than maintaining a second readiness narrative.

## Non-goals

- Implementing onboarding, estimate health, publication analytics, output calculations, provider recovery, telemetry policy, legal approval, or auth mitigation.
- Enabling a paid service or changing external GitHub/Cloudflare production controls during plan execution.
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
| Activity and public review | Existing `Activity-History-Mapping` and `Publisher-And-Shared-Pages` packs | Read-only until their current agents finish; integrate through the umbrella circle-back packet. |

The release pack owns `.github/workflows/**`, CI contract tests, staging seed/cleanup orchestration, the cross-domain golden-path spec, release evidence collectors, and readiness-manifest generation. Feature packs own their application behavior and focused tests.

## Critical Path

`UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-006 -> UNIT-007`

Units 001 through 006 form the ready local implementation slice. For Units 004
and 005 this means orchestration, fixtures, reporters, and local contract proof
only. Their complete acceptance criteria require staging/WebKit/artifact/smoke
execution in blocked `UNIT-007` after the cross-pack behaviors exist and
`AUTH-001` authorizes hosted control mutations and proof execution.

## Artifact Map

- `SOURCE_AND_CODEBASE_AUDIT.md`: observed evidence and drift.
- `REQUIREMENTS_AND_DECISIONS.md`: traceable requirements, decisions, risks, and authorization packet.
- `IMPLEMENTATION_PLAN.md`: exact work units, paths, dependencies, and handoffs.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: proof matrix, rollout, rollback, and completion audit.
- `LOOP_LEDGER.md`: resumable run state.
- `plan-pack.json`: machine-readable status and traceability authority.

## Restart Packet

1. Re-run `git status --short --branch` and compare release-owned paths with the baseline in `SOURCE_AND_CODEBASE_AUDIT.md`.
2. Confirm the two existing 2026-07-10 packs are not being edited by this lane.
3. Run `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Release-Integrity-And-Golden-Path`.
4. Start `UNIT-001` at `.github/workflows-disabled/ci.yml`; restore it as an active workflow without changing hosted settings.
5. Append commands, outputs, changed decisions, and the exact next action to `LOOP_LEDGER.md`.

Stop only when all local units are verified, the hosted boundary is explicitly resolved, the exact deployed SHA has retained green evidence, and the generated release decision is green. A plan-validator pass is plan proof only, not Beta-release proof.
