# Verification, Rollout, And Final Audit

## Applicability gates

| Gate | Applies | Required evidence | Current state |
|---|---|---|---|
| `GATE-AGENT-01` | Yes | ownership, leases, durable ledger, validator, resume packet | FAIL until units execute |
| `GATE-VERIFY-01` | Yes | exact-once check, owner-pack validation, independent audit | FAIL |
| `GATE-OPS-01` | Yes | rollout/go-no-go/rollback, hosted-provider separation | FAIL |
| `GATE-SEC-01` | Yes | GitHub hosted controls and auth-risk receipt | BOUNDARY via `AUTH-001` |
| `GATE-DATA-01` | Yes | provider-backed D1 restore receipt in disposable target | FAIL |
| `GATE-NEXT-01` | Indirect | owner packs prove framework-sensitive behavior | N/A in coordination code |
| `GATE-UX-01` | Indirect | Activation/Publisher/Estimate packs prove user journeys | N/A in coordination code |
| `GATE-CONTRACT-01` | Yes | typed cross-pack producer/consumer contracts | FAIL |
| `GATE-PERF-01` | Yes where owner pack claims budgets | measured owner-pack receipt | FAIL until receipts arrive |
| `GATE-CLEAN-01` | Yes for `BETA-P1-10` | characterization and bounded extraction decision | FAIL |

The manifest carries the three package-decision gates below. The ten
applicability rows above describe planning coverage; they do not replace the
manifest gates or claim product proof from a coordination artifact.

## Manifest proof matrix

| Test ID | Criterion | Procedure | Pass signal | Evidence destination |
|---|---|---|---|---|
| `TEST-001` | `AC-001` | Parse the canonical owner table and compare it with `BETA-P0-01..10` and `BETA-P1-01..10` | All 20 IDs occur exactly once and resolve to one primary pack | program audit receipt |
| `TEST-002` | `AC-002` | Validate every owner manifest and record tuple, self-hash, baseline, lease, freeze time, and next unit | No missing, invalid, hash-drifted, or ownerless dependency receipt | dependency ledger |
| `TEST-003` | `AC-003` | Compare frozen Publisher/Activity packs with the delta packets and collect owner acknowledgements | No overlapping lease; both manifests validate after accepted deltas | circle-back receipts |
| `TEST-004` | `AC-004` | Inspect each capability receipt for caller map, characterization, extraction decision, tests, and bounded diff | Every domain contributes exactly one current receipt to the program-owned `BETA-P1-10` gate | maintainability audit |
| `TEST-005` | `AC-005` | Compose all backlog and release rows from matching-surface receipts for one release ID/SHA/environment | No open P0, stale receipt, wrong-surface substitution, or contradictory status | release truth artifact |
| `TEST-006` | `AC-006` | Read hosted GitHub rules/checks/scans/deploy provenance after the exact authorized action/readback | Required hosted controls and passed-SHA enforcement are current | GitHub hosted receipt |
| `TEST-007` | `AC-007` | Validate the scoped owner/legal decision record against exact Terms/Privacy/cohort versions | Limited cohort is explicitly approved; broader/public/paid launch remains separately blocked | owner/legal receipt |

## Manifest gate definitions

- `GATE-VERIFY-001` is `FAIL` until `TEST-001..005` pass with current hashes and
  a distinct checker confirms the exact-once registry, migration leases,
  dependency receipts, maintainability receipts, and release composition.
- `GATE-GITHUB-001` is `BOUNDARY` under `AUTH-001`; only `TEST-006` hosted
  readback can satisfy it. Workflow files or local API fixtures are insufficient.
- `GATE-LEGAL-001` is `BOUNDARY` under `AUTH-002`; only the scoped `TEST-007`
  human decision record can satisfy it. Agent judgment and source text are
  insufficient.

## Verification sequence

1. Validate this pack and exact-once registry.
2. Validate all owner packs and capture self-hashes.
3. Run each owner's targeted proof, then broad release checks only after targeted
   checks pass.
4. Run release truth, migration parity, error-handling, observability/support,
   restore, and golden-path checks from one frozen release SHA.
5. Obtain hosted/provider readback at the matching surface.
6. Run independent final audit and then request authorization.

Representative commands; the Release Integrity pack owns exact flags and
environment preparation:

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Beta-Readiness-Program
bun run validate:error-handling
bun run cf:d1-restore-rehearsal
bun run ops:agent-debug-snapshot
bun run ops:check-observability
bun run launch:check-support-monitoring
bun run cf:release-gates
git diff --check
```

Expected pass signals are zero exit status, machine-readable `ready=true` at the
specific gate, current artifact hashes, and no redacted-data violations. Command
existence or a locally green substitute is not enough for a hosted claim.

## Evidence freshness contract

Every receipt records producer/version, command, scope, commit SHA, environment,
timestamp, result, redaction statement, and artifact hash. It expires on:

- source/config/dependency/migration hash change;
- owner-pack manifest hash change;
- provider binding or hosted control change;
- test fixture/evaluator/version change;
- legal document, cohort, telemetry, or retention scope change;
- elapsed validity window stated by the producer.

Stale evidence is never silently refreshed. Mark it stale, identify dependent
claims, rerun the producer, and attach a new receipt.

## Final audit matrix

| Release row | Go signal | No-go signal | Rollback/fix-forward owner |
|---|---|---|---|
| Engineering | required CI, staging build, golden path, hosted smoke all current | skipped/default-disabled check or open P0 defect | Release Integrity |
| Data | hosted restore, migration parity, output parity, snapshot identity | local-only restore or mismatched totals | Hosted D1 Recovery + Calculation Parity + Publisher |
| Product | zero state, first valid estimate, health, Publisher state, issue identity | trapped empty state or missing owner action | Activation + Estimate + Publisher |
| Operations | support/incident drill, real cohort query, current truth manifest | placeholder metric or untested rollback | Beta Operating Contract; Activation supplies cohort data |
| Legal/privacy | limited-cohort approval and telemetry/retention approval | missing/ambiguous approval | authorized owner/legal |

## Rollout

1. Freeze the candidate SHA and all owner-pack receipts.
2. Run staging migration/seed and deterministic golden path.
3. Run disposable D1 restore rehearsal and parity checks.
4. Complete hosted control readback and legal approval.
5. Admit a deliberately limited Beta cohort with named support/incident owners.
6. Observe activation, product, support, error, and provider signals for the
   configured window before expanding.

Expansion requires a new release truth packet; a prior go does not authorize a
larger cohort, public launch, paid launch, or paid provider feature.

## Rollback and fix-forward

Immediate no-go/rollback triggers: authz/privacy defect, calculation/output
divergence, data-loss/restore failure, critical golden-path failure, unavailable
support/incident path, misleading cohort data, stale release packet, or hosted/
legal control withdrawal.

- Application: roll back to the last passed release SHA.
- D1: use forward-compatible/fix-forward migration and documented restore path;
  never destructively mutate production from this program.
- Feature/UX: disable the bounded feature path only when its owner pack defines a
  flag/default and recovery state.
- Cohort: pause new admissions, preserve support access, notify affected users
  through the approved incident communication path.
- Evidence: mark all downstream receipts stale and resume at the earliest failed
  unit.

## Cleanup and closeout

After the decision, release file leases, remove temporary fixtures/artifacts per
their owner runbooks, retain redacted audit receipts, update current project
truth, and archive only after all units are verified or the program records a
terminal blocker/cancellation. No ignored raw token, customer data, browser
storage state, provider tail, or legal draft is committed.
