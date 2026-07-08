# 12 — Test and Validation Strategy

## §1. Approach

The gates are CLI/CI tools → **unit tests for each gate's logic** (parsing, severity mapping, threshold check) + **integration test for the aggregator** (exit codes) + **config-preservation tests** (the existing pattern). No browser proof needed (no web UI). Smoke gate has a server-lifecycle integration test.

Proof ladder (lightest that proves the claim — `VALIDATION_MATRIX.md`):
- Gate logic → `bun test tests/unit/security-gate` (Bun unit).
- Config presence → `bun run test:dom -- security-automation-config` (existing Vitest).
- Aggregator exit semantics → unit + manual `security:gate` run.
- CI workflow correctness → `actionlint`/YAML lint (static); first real CI run is the dynamic proof.

## §2. Proof-contract matrix (mandated schema)

**Schema (Improve-Plan-Prompt §PHASE-3.11):** `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Requirement IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-01 | SEC-CI-01 | WP-3 | unit | mock GateResult[] (mix of PASS/ADVISORY/FAIL/SKIP) | verdict = FAIL iff any FAIL; exit code matches; SKIP-under-STRICT non-zero | `tests/unit/security-gate/aggregator.test.ts` | `bun test tests/unit/security-gate/aggregator.test.ts` | write a red case (mock FAIL → assert exit≠0) then green | none (pure unit) |
| PROOF-02 | SEC-CI-02 | WP-1.1 | unit | mock bun-audit JSON: {high:1}, {crit:1}, {mod:2}, {low:1}, {} | high/crit→FAIL; mod/low→ADVISORY; empty→PASS; STRICT makes mod/low FAIL | `tests/unit/security-gate/audit.test.ts` | `bun test .../audit.test.ts` | red: {high:1}→FAIL; green: {}→PASS | none |
| PROOF-02b | SEC-CI-02 (AC-02d) | WP-1.1 | integration | plant vuln dep + `overrides` fix | `bun audit` reports it RESOLVED (not open) | (ad-hoc, WP-1.1 step) | manual `bun audit` after plant | red if reported open; green if resolved | remove planted dep after |
| PROOF-03 | SEC-CI-03 | WP-1.2 | unit | temp file with `AKIA...` dummy; allowlist fixture | finding→FAIL; allowlisted→PASS; redaction verified (no raw `AKIA` in report) | `tests/unit/security-gate/secrets.test.ts` | `bun test .../secrets.test.ts` | red: dummy secret present→FAIL; green: allowlisted→PASS | delete temp file |
| PROOF-04 | SEC-CI-04 | WP-1.3 | unit | sample cyclonedx JSON; mock cosign bundle | valid JSON; dep count >0; cosign bundle present; Tier-B SKIP-with-reason when no GHEC | `tests/unit/security-gate/sbom.test.ts` | `bun test .../sbom.test.ts` | red: malformed JSON→FAIL; green: valid→PASS | none |
| PROOF-05 | SEC-CI-05 | WP-4 | unit | mock coverage-summary {lines:50} vs threshold {lines:60} | under-threshold→FAIL; at/above→PASS; floor-guard (<40% → ADVISORY not auto-set) | `tests/unit/security-gate/coverage.test.ts` | `bun test .../coverage.test.ts` | red: 50<60→FAIL; green: 60≥60→PASS | none |
| PROOF-06 | SEC-CI-06 | WP-1.5 | integration | ephemeral route mock returning {200, 401, 404}; auth-route-returns-200 case | expected-status assertions; auth-regression→FAIL; server torn down on exit | `tests/unit/security-gate/smoke.test.ts` | `bun test .../smoke.test.ts` | red: auth route 200→FAIL; green: auth route 401→PASS | kill dev server in `finally` |
| PROOF-07 | SEC-CI-08 | WP-1.6 | unit | mock osv-scanner output (PR vs main advisory sets) | new high/crit → comment + check; no-new→PASS; Tier-B action gated behind plan-check | `tests/unit/security-gate/depdiff.test.ts` | `bun test .../depdiff.test.ts` | red: new high→comment; green: no-new→PASS | none |
| PROOF-08 | TEST-CI-07 | WP-0.4 | config | active + disabled workflow paths | pins/fields preserved in active dir (both-state resilient) | `tests/vitest/security-automation-config.test.ts` | `bun run test:dom -- security-automation-config` | red until WP-0.4 moves files to active; green after | none |
| PROOF-09 | ARCH-CI-01 | WP-0.1 | config | active ci.yml | SHA pins + `permissions:` present | `tests/vitest/ci-workflow-pinning.test.ts` | `bun run test:dom -- ci-workflow-pinning` | red until WP-0.1; green after | none |
| PROOF-10 | RISK-CI-17 | WP-5 | config | `scripts/security-gate/tool-manifest.json` | manifest exists; every Go binary has a checksum pin | `tests/unit/security-gate/tool-manifest.test.ts` (new) | `bun test .../tool-manifest.test.ts` | red: manifest missing or unpinned; green: all pinned | none |
| PROOF-11 | SEC-CI-01 (e2e) | WP-3 | manual | clean main | `security:gate` prints PASS report, exit 0, <120s | (manual) | `time bun run security:gate` | red: non-zero or >120s; green: exit 0 | none |
| PROOF-12 | WP-2.1 | WP-2 | dynamic | real PR | `security-gates` CI job green; report artifact uploaded | (CI) | open PR → check runs | red: job fails; green: job passes | close PR |

**Known-red broad-validation posture:** `bun run validate` and `bun run build` are not run as the gate's own proof — they are the *existing* CI body the gate wraps. The gate's correctness is proven by PROOF-01..10 (unit/config, fast). The broad commands remain the release-readiness surface owned by `VALIDATION_MATRIX.md`, not this pack.

## §3. Adversarial QA matrix (UltraQA-style, for the gate's own robustness)

The gates are runtime tools → adversarial matrix applies.

| ID | Scenario | Setup | Command | Expected signal | Status |
|---|---|---|---|---|---|
| ADV-01 | gitleaks missing | remove gitleaks from PATH | `security:secrets` | SKIP + install hint (not crash) | specified |
| ADV-02 | Syft missing | remove syft | `security:sbom` | SKIP + hint | specified |
| ADV-03 | bun-audit schema change | feed malformed JSON to audit.ts | unit test | FAIL + "rerun manually" hint | specified |
| ADV-04 | secret in a committed file | plant dummy `AKIA...` in temp file | `security:secrets` | FAIL + finding | specified |
| ADV-05 | allowlisted secret | plant dummy in `tests/` | `security:secrets` | PASS (allowlisted) | specified |
| ADV-06 | coverage drops below threshold | lower threshold in test | unit | FAIL | specified |
| ADV-07 | auth-required route returns 200 | mock route | smoke | FAIL (security regression) | specified |
| ADV-08 | dev server won't boot | kill port / bad env | `security:smoke` | FAIL + boot log | specified |
| ADV-09 | two concurrent security:gate runs | run twice simultaneously | both | **report file last-writer-wins (acceptable while no mid-write consumer exists); smoke may contend for ports — each scans the range independently, FAILs if none free (not silent)** (R4-softened) | specified |
| ADV-10 | fork PR triggers workflow | simulate fork PR | CI | attest step skipped (TM-CI-02) | specified |
| ADV-11 | `bun.lock` missing | delete | `security:audit` | FAIL "no lockfile" | specified |
| ADV-12 | empty smoke manifest | `[]` | `security:smoke` | SKIP "no routes" | specified |
| ADV-13 | gitleaks false-positive storm | many false hits | CI | ADVISORY (not hard FAIL until strict) | specified |
| ADV-14 | unpinned action in workflow YAML | plant `uses: actions/checkout@v4` (tag) | pinning test | FAIL | specified |
| ADV-15 | `permissions: write-all` present | plant in ci.yml | (review) | reject at review | specified |
| ADV-16 | ratchet would *lower* threshold | tamper ratchet script | ratchet | no-op (monotonic guard) | specified |
| ADV-17 | report contains a secret value | plant in gitleaks output | manual inspect | redacted (AC-03e) | specified |

## §4. Performance evaluator (restated from `09` §2)

| Metric | Target | Command | Evidence |
|---|---|---|---|
| `security:gate` local (excl smoke) | < 60s | `time bun run security:gate --skip-smoke` | `.security-gate-report.json` ts |
| `security:gate` local (incl smoke) | < 120s | `time bun run security:gate` | ts |
| `security-gates.yml` CI job | < 12 min | Actions UI | run duration |

Baseline is DISCOVERY-REQUIRED at WP-4.1/WP-1 (measure before asserting target met).

## §5. Validation gates (what blocks what)

| Gate | Blocks merge? | Blocks release? | Class |
|---|---|---|---|
| `bun test tests/unit/security-gate` green | yes (once enforcement) | yes | local automated |
| `security-automation-config` test green | yes | yes | local automated |
| `security:gate` verdict PASS/ADVISORY | yes (once enforcement) | yes | local automated |
| `security-gates.yml` CI job green | yes (once enforcement) | yes | provider-backed (GitHub) |
| CodeQL (Tier B) clean | n/a until GHAS | yes (P1 for prod) | provider-backed (GHAS) |

"Once enforcement" = depends on `OPEN-CI-04` (GitHub Pro branch protection). Until then, gates *block release* (the verdict is a launch-gate input) but cannot *enforce* merge-blocking.

## §6. Skipped/unavailable validation (residual risk)

| Skipped | Why | Residual risk | Unblock |
|---|---|---|---|
| Real GHAS CodeQL run | no GHAS (`OPEN-CI-01`) | SAST gap; mitigated by gitleaks + bun-audit (not equivalent) | owner buys GHAS or repo goes public |
| Branch-protection enforcement | no GitHub Pro (`OPEN-CI-04`) | gates can't *force* merge-blocking | owner upgrades |
| Hosted GitHub secret scanning | 404 (`OPEN-LG-06`) | native secret scan gap; mitigated by gitleaks | owner/GitHub admin |
| Measured CI minute cost | planning estimate only | actual cost may differ ~±20% | first month of real CI runs |
| Measured coverage baseline | not yet run | threshold is a guess until WP-4.1 | WP-4.1 DISCOVERY step |
