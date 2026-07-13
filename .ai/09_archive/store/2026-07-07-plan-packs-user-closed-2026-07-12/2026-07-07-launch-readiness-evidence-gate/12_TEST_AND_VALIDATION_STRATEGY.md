# 12 — Test & Validation Strategy

The gate is build/CI tooling, so its test surface is the aggregator logic (unit) + the integration with anchor scripts + adversarial input handling. No browser proof is required (the gate has no UI). Provider/hosted claims are delegated to anchor scripts, which have their own proof suites.

## §1. Test layers (lightest proof that proves the claim)

| Claim | Layer | Tool | Why |
|---|---|---|---|
| Classifier derives correct status from verdicts | Unit | `bun test` | Pure function; no I/O |
| Freshness TTL logic | Unit | `bun test` | Pure + `fs.stat` mock |
| Domain registry completeness | Unit | `bun test` | Static data assertion |
| Extractor reads each artifact shape | Unit | `bun test` + fixtures | One fixture per anchor shape |
| Reader handles missing/stale/malformed | Unit (adversarial) | `bun test` | Edge cases |
| Markdown/JSON emitters | Snapshot + schema | `bun test` | Stable output |
| Executor spawns allowlisted anchors only | Unit + grep assertion | `bun test` | Safety invariant |
| End-to-end local mode | Integration | `bun run launch:gate --local` against synthetic evidence dir | Real orchestration |
| Anchor hooks non-breaking | Regression | existing anchor tests | Additive only |
| Wall-clock budget | Perf | `time` | ≤2 min local |
| No mutating script in local mode | Static | grep assertion in test | OPS-LG-01 |

No Playwright/browser proof (gate has no UI). No provider proof claimed from local tests.

## §2. Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-LG-02 (domain coverage) | `tests/unit/launch-gate/domains.test.ts` | Unit | New | Inline domain list | `bun test tests/unit/launch-gate/domains.test.ts` | Assert DOMAINS length=67, no dup IDs, every entry has required fields | None | Executor |
| FR-LG-03 (verdict classification) | `tests/unit/launch-gate/classifier.test.ts` | Unit | New | Synthetic verdict sets | `bun test tests/unit/launch-gate/classifier.test.ts` | pass/advisory/blocker/skipped/missing-evidence transitions | None | Executor |
| FR-LG-04 (3-status model) | `tests/unit/launch-gate/classifier.test.ts` | Unit | New | Combinatorial verdicts | same | GO/CONDITIONAL/NO-GO derivation; `--strict` exit | None | Executor |
| FR-LG-05 (evidence-class labeling) | `tests/unit/launch-gate/extractors.test.ts` | Unit | New | Per-domain fixtures | `bun test tests/unit/launch-gate/extractors.test.ts` | Every verdict has class; no local→provider promotion | None | Executor |
| FR-LG-06 (freshness TTL) | `tests/unit/launch-gate/freshness.test.ts` | Unit | New | Synthetic mtimes | `bun test tests/unit/launch-gate/freshness.test.ts` | stale within/past TTL | None | Executor |
| FR-LG-07 (report schema) | `tests/unit/launch-gate/report-json.test.ts` | Schema | New | Synthetic report | `bun test tests/unit/launch-gate/report-json.test.ts` | schemaVersion=1; required fields present | None | Executor |
| DOC-LG-01/UX-LG-01 (markdown banner) | `tests/unit/launch-gate/report-markdown.test.ts` | Snapshot | New | Synthetic report | `bun test tests/unit/launch-gate/report-markdown.test.ts` | Line 1 = banner; remaining-work present | None | Executor |
| REL-LG-01 (missing/stale/malformed) | `tests/unit/launch-gate/reader.test.ts` | Unit (adversarial) | New | Missing/empty/bad-JSON files | `bun test tests/unit/launch-gate/reader.test.ts` | missing-evidence, no throw | None | Executor |
| REL-LG-01 AC3 (gate-error exit) | `tests/unit/launch-gate/run-launch-evidence-gate.test.ts` | Unit | New | Forced throw | `bun test ...` | exit 1, gate-error verdict | None | Executor |
| REL-LG-02 (conflict resolution) | `tests/unit/launch-gate/classifier.test.ts` | Unit | New | Conflicting verdict pairs | same | Precedence rule applied; conflicts[] populated | None | Executor |
| OPS-LG-01 (no mutating script) | `tests/unit/launch-gate/executor.test.ts` | Static assertion | New | Registry scan | `bun test ...` | No `cf:deploy`/`cf:sync-worker-secrets`/`cf:upload-version` in local-mode set | None | Executor |
| SEC-LG-01 (no secrets in report) | `tests/unit/launch-gate/redaction.test.ts` | Static scan | New | Secret patterns | `bun test ...` | No bearer/token/cookie patterns in output | None | Executor |
| SEC-LG-03 (sanitized labels) | `tests/unit/launch-gate/extractors.test.ts` | Unit | New | Malicious label input | same | Stripped chars; max length | None | Executor |
| FR-LG-08 (mode dispatch) | `tests/unit/launch-gate/modes.test.ts` | Unit | New | Mode flags | `bun test ...` | Correct read/exec/skip per mode | None | Executor |
| FR-LG-01 AC4 (wall-clock) | `tests/perf/launch-gate-budget.test.ts` | Perf | New | Synthetic evidence dir | `bun test tests/perf/launch-gate-budget.test.ts` | ≤2 min local | None | Executor |
| E2E local mode | `tests/integration/launch-gate-local.test.ts` | Integration | New | Synthetic evidence dir | `bun test tests/integration/launch-gate-local.test.ts` | Report emitted, status derived | None | Executor |
| WP-1.2 anchor hooks non-breaking | existing anchor tests | Regression | Existing | (per anchor) | existing `bun test`/`vitest` | Existing behavior unchanged | None | Executor |

## §3. Adversarial scenario matrix (UltraQA-style)

The gate is read-only, so adversarial focus is input/execution integrity, not mutation safety. Applicable directive §12 scenarios:

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| ADV-01 | Concurrent agent | Two gate runs simultaneously | Launch 2x `launch:gate` | shell | Both emit independent reports; no corruption | TBD (impl) | pending | test log | rm reports |
| ADV-02 | Stale evidence | Artifact mtime > TTL | `touch -d` old mtime | unit | stale-evidence; Hard→NO-GO | TBD | pending | test | rm fixture |
| ADV-03 | Missing evidence | Required artifact absent | rm artifact | unit | missing-evidence; NO-GO | TBD | pending | test | rm fixture |
| ADV-04 | Malformed JSON | Artifact is invalid JSON | write garbage | unit | missing-evidence; no throw | TBD | pending | test | rm fixture |
| ADV-05 | Conflicting anchors | release-gates pass, hosted fails | synthetic pair | unit | precedence (hosted wins); conflict surfaced | TBD | pending | test | — |
| ADV-06 | Anchor crash | Anchor exits non-zero unexpectedly | mock spawn fail | unit | missing-evidence; other domains continue | TBD | pending | test | — |
| ADV-07 | Anchor timeout | Anchor hangs | mock spawn hang | unit | timeout→missing-evidence | TBD | pending | test | — |
| ADV-08 | Secret in label | Owner label contains `<script>` | env with payload | unit | stripped by sanitizer | TBD | pending | test | — |
| ADV-09 | Secret in artifact | Artifact contains token-like string | fixture | unit | redaction test flags it | TBD | pending | test | rm fixture |
| ADV-10 | `--allow-missing` abuse | Owner skips a Hard domain | flag | unit | recorded in report; status ≤ CONDITIONal; not silently GO | TBD | pending | test | — |
| ADV-11 | `--no-freshness` abuse | Dev disables TTL | flag | unit | status ≠ GO; report marks disabled | TBD | pending | test | — |
| ADV-12 | Mutating script injected | Someone adds `cf:deploy` to local set | registry edit | static test | grep assertion fails the build | TBD | pending | test | revert |
| ADV-13 | Provider stage without auth | `--with-provider` but no CF creds | env missing | integration | skipped(auth); status ≤ CONDITIONAL | TBD | pending | test | — |
| ADV-14 | Hosted stage network down | Route unreachable | mock fetch fail | unit | missing-evidence(network) | TBD | pending | test | — |
| ADV-15 | Partial provider outage | Some CF APIs 500 | mock partial | unit | Affected domains missing-evidence; others pass | TBD | pending | test | — |
| ADV-16 | Flaky rerun | Same artifacts, rerun | run twice | integration | Same status (idempotent) | TBD | pending | test | — |
| ADV-17 | Dirty worktree | Another agent edited an artifact mid-run | concurrent edit | integration | Gate reads mtime; surfaces stale if changed | TBD | pending | test | restore |

Non-applicable scenarios (with reason): malformed *user input* (gate has no user input surface beyond CLI flags), prompt injection (no AI surface), oversized upload (no uploads), cross-tenant access (gate has no tenant model). These are marked N/A with reason.

## §4. Performance evaluator contract

| Field | Value |
|---|---|
| Baseline metric | Wall-clock of `bun run launch:gate --local` |
| Target/budget | ≤ 2 min (120s) |
| Measurement command | `/usr/bin/time -p bun run launch:gate --local` (or `time` in zsh) |
| Harness | `tests/perf/launch-gate-budget.test.ts` |
| Fixture/data size | Synthetic evidence dir mirroring the 13+ artifact shapes (small JSON files) |
| Runs / flake policy | 3 runs, take max; flag if any run >120s |
| Regression threshold | >120s = fail |
| Related functional tests | classifier/reader/extractor unit tests |
| Evidence artifact location | `tests/perf/launch-gate-budget.test.ts` output |

Provider/hosted stages are explicitly out of the budget (owner-gated, out-of-band).

## §5. Validation commands (repo-native)

- `bun run type-check` — gate TypeScript compiles.
- `bun run lint` — gate code passes eslint.
- `bun test tests/unit/launch-gate` — Phase 0–4 unit tests.
- `bun test tests/integration/launch-gate-local.test.ts` — local E2E.
- `bun run launch:gate --local` — produces a report.
- `git diff --check` — no whitespace errors.

(No `bun run validate` dependency — the gate is additive; `validate` need not be extended to include the gate's tests for the gate to ship, though adding them is recommended.)

## §6. Manual QA criteria (only where automation cannot prove)

The gate has no UI, so manual QA is limited to:
- Owner reads a sample Markdown report and confirms the banner + remaining-work list are actionable (DOC-LG-01). **Actor:** owner. **Setup:** run gate, open MD. **Pass:** owner can determine GO/NO-GO from line 1.
- No other manual QA required.

## §7. Skipped / unavailable validation & residual risk

- Provider/hosted stage integration is **not** unit-testable without Cloudflare credentials; residual risk: a stage-2/3 bug only surfaces when run with real creds. Mitigation: dry-run mocks + a documented owner smoke before relying on `--with-provider`/`--with-hosted`.
- The hosted security 403/404 (CodeQL/Dependabot/secret-scan) cannot be tested locally; the gate should probe via `gh api` at runtime and surface the result, but this is advisory.
