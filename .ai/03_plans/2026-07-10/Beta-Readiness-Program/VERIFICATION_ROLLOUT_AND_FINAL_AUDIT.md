# Verification, Rollout, And Final Audit

This file remains the manifest-aligned test/gate/status index. Detailed negative
fixtures live in `ADVERSARIAL_INTEGRATION_QA.md`, evidence admission lives in
`EVIDENCE_FRESHNESS_AND_PROOF_BOUNDARIES.md`, and pack-qualified final decision
rules live in `AUTHORIZATION_RELEASE_AND_FINAL_AUDIT.md`.

## Applicability gates

| Gate | Applies | Required evidence | Current state |
|---|---|---|---|
| `GATE-AGENT-01` | Yes | ownership, leases, durable ledger, validator, resume packet | FAIL until units execute |
| `GATE-VERIFY-01` | Yes | exact-once check, owner-pack validation, independent audit | FAIL |
| `GATE-OPS-01` | Yes | rollout/go-no-go/rollback plus distinct Release `UNIT-007` read-only, `UNIT-008` GitHub, `UNIT-009` staging, and `UNIT-010` production-or-no-release receipts | FAIL |
| `GATE-SEC-01` | Yes | Program `AUTH-001` backed only by Release `AUTH-001`/`UNIT-008` GitHub readback and separate auth-risk receipt | BOUNDARY via Program `AUTH-001` |
| `GATE-DATA-01` | Yes | provider-backed D1 restore receipt in a disposable target plus environment-identified Release `UNIT-009` staging and `UNIT-010` production/no-release receipts | FAIL |
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
| `TEST-002` | `AC-002` | Validate every owner manifest/artifact/diff receipt and durable aggregate 0053..0057 generation receipt; simulate consumption, collision, tail drift, owner-manifest drift, and reissue | No missing/hash-drifted dependency; each of five owners consumes one current generation/hash; consumed facts persist and all unconsumed slots are reissued | dependency and migration-generation ledger |
| `TEST-003` | `AC-003` | Compare content-addressed Publisher/Activity receipts with exact deltas and recheck incorporated delta IDs, contract versions, validator result, and stable scoped hashes | No overlapping lease; target receipts include exact deltas and both manifests validate | integration receipts |
| `TEST-004` | `AC-004` | Parse the exact README nine-pack matrix and inspect each REQUIRED receipt or explicit N/A for caller map/scan, characterization, decision, tests, bounded diff, and verifier result | All nine packs occur once; six REQUIRED receipts and three explicit justified N/A receipts are current; no implicit omission | maintainability audit |
| `TEST-005` | `AC-005` | Compose all backlog and release rows for one release ID/SHA/environment, requiring Release `UNIT-007` read-only discovery, `UNIT-008` GitHub, `UNIT-009` isolated staging, and `UNIT-010` production-or-no-release as four distinct receipts | No open P0, stale receipt, wrong-surface substitution, collapsed authorization, or contradictory status | release truth artifact |
| `TEST-006` | `AC-006` | Read hosted GitHub rules/checks/scans/deploy provenance after the exact authorized action/readback | Required hosted controls and passed-SHA enforcement are current | GitHub hosted receipt |
| `TEST-007` | `AC-007` | Strictly validate Beta Operating `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` producer identity, manifest/SHA, exact Terms/Privacy/telemetry/retention/cohort/policy/support versions, scope, actor/date/expiry, and wider-launch disposition | Current Operating receipt approves only the exact limited cohort; broader/public/paid launch remains separately bounded; Program produced no substitute decision | Operating decision-receipt validation |

## Manifest gate definitions

- `GATE-VERIFY-001` is `FAIL` until `TEST-001..005` pass with current hashes and
  a distinct checker confirms the exact-once registry, migration leases,
  dependency receipts, maintainability receipts, and release composition,
  including current, independent Release `UNIT-007/008/009/010` receipts.
- `GATE-GITHUB-001` is `BOUNDARY` under Program `AUTH-001`; only `TEST-006`
  backed by Release `AUTH-001`/`UNIT-008` hosted readback can satisfy it.
  Workflow files, local API fixtures, staging authority, and production authority
  are insufficient.
- `GATE-LEGAL-001` is `BOUNDARY` under Program receipt-consumer `AUTH-002`; only
  `TEST-007` validation of the current Beta Operating `AUTH-003`/`UNIT-009`
  `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` can satisfy it. Release `AUTH-002`
  is staging, not legal authority; Program, agent judgment, and source text are
  insufficient and cannot recreate the decision.

## Verification sequence

1. Validate this pack and exact-once registry.
2. Validate all owner packs and capture self-hashes.
3. Run each owner's targeted proof, then broad release checks only after targeted
   checks pass.
4. Run release truth, migration parity, error-handling, observability/support,
   restore, and golden-path checks from one version-pinned release SHA.
5. Validate Release `UNIT-007` read-only discovery and its three boundary packets.
6. Resolve Program `AUTH-001` only from Release `AUTH-001`/`UNIT-008` GitHub
   mutation/readback.
7. Independently resolve Release `AUTH-002`/`UNIT-009` isolated staging and
   Release `AUTH-003`/`UNIT-010` production-or-no-release at their matching
   surfaces.
8. Resolve Program `AUTH-002` only by strict validation of the current Beta
   Operating `AUTH-003`/`UNIT-009` cohort/legal decision receipt.
9. Run the independent final audit and compose the Program decision.

Representative commands; the Release Integrity pack owns exact flags and
environment preparation:

```bash
awk '/^## BETA-P1-10 Nine-Pack Contributor Matrix$/{inside=1;next} \
     /^## Migration Generation Receipt$/{inside=0} \
     inside && /^\| `/{count++} END{print count}' \
  .ai/03_plans/2026-07-10/Beta-Readiness-Program/README.md
# Expected: 9.

find migrations -maxdepth 1 -type f -name '*.sql' -print \
  | LC_ALL=C sort \
  | while IFS= read -r path; do shasum -a 256 "$path"; done \
  | shasum -a 256
shasum -a 256 \
  .ai/03_plans/2026-07-10/{Publisher-And-Shared-Pages,First-User-Activation-And-Cohort-Operations,Estimate-Intelligence-And-Price-Governance,Calculation-And-Output-Parity,Activity-History-Mapping}/plan-pack.json
RECEIPT=".ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json"
jq -S -c 'del(.receipt_sha256)' "$RECEIPT" | tr -d '\n' | shasum -a 256

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
| Legal/privacy | current Beta Operating cohort/legal decision receipt for exact document, telemetry, retention, policy, support, and cohort scope | missing, stale, ambiguous, mismatched, or Program-produced substitute | Beta Operating `AUTH-003`/`UNIT-009`; Program is consumer only |

## Rollout

1. Pin the candidate SHA and all owner-pack receipt hashes.
2. Consume Release `UNIT-007` read-only discovery and pin its three distinct
   boundary packets.
3. Under Program `AUTH-001` and Release `AUTH-001`, complete Release `UNIT-008`
   GitHub control mutation/readback.
4. Under Release `AUTH-002`, run Release `UNIT-009` isolated staging migration,
   deterministic Chromium/WebKit paths, foreign-canary check, and cleanup.
5. Run the disposable D1 restore rehearsal and parity checks.
6. Under Release `AUTH-003`, complete Release `UNIT-010` production deploy,
   smoke, rollback rehearsal, and production-or-no-release receipt.
7. Validate the Beta Operating `AUTH-003`/`UNIT-009` cohort/legal decision receipt
   through Program `AUTH-002`, then admit only its exact approved cohort with
   named support/incident owners.
8. Observe activation, product, support, error, and provider signals for the
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
