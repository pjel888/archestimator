# 12 — Test and Validation Strategy

## Testing philosophy for this pack

The audit capability is itself a verification tool, so its own test bar is high: the tests must prove **no false negatives** (a real orphan is never missed) and **no false writes** (detection never mutates state). Lightest-proof policy applies: `node:sqlite` + fake R2 for logic; no browser/E2E (no browser-only claim).

## Test layers

| Layer | Tool | Used for |
|---|---|---|
| Unit / logic | `vitest` + `node:sqlite` `DatabaseSync(":memory:")` | manifest parsing, detection queries, report redaction, repair idempotency |
| Contract | `vitest` + `FakeR2Bucket` (extended with `list()`) | R2 reconciliation |
| Read-only instrumentation | `vitest` + throwing D1/R2 stubs | SEC-001 proof |
| Perf baseline | `vitest` perf fixture (`tests/vitest/perf/`) | detection wall-clock + EXPLAIN capture |
| Provider-backed (preview) | `bun run cf:orphan-audit --target preview --dry-run` | hosted dry-run (manual/operator) |
| Hosted/production | operator-gated dry-run | only with owner approval |

Browser/Playwright: **intentionally skipped** (no browser-only claim).

## Test execution matrix (proof-contract rows)

The matrix uses the column vocabulary mandated by `Improve-Plan-Prompt.md:873-875`: `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`.

| Proof ID | Requirement IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| P-001 | DATA-001 | T1.1 | unit/migration | 38 migration files | 69 tables present; `PRAGMA foreign_key_check` empty after apply | `tests/vitest/helpers/apply-all-migrations.test.ts` | `bunx vitest run tests/vitest/helpers/apply-all-migrations.test.ts --maxWorkers=1` | red→green (starts red: harness doesn't exist yet) | none |
| P-002 | FR-001 | T1.2 | unit/snapshot | migration files | edge count matches `03`; 0014 cluster `declared:'none'`; 69 tables | `tests/vitest/orphan-manifest.test.ts` | `bunx vitest run tests/vitest/orphan-manifest.test.ts --maxWorkers=1` | red→green | none |
| P-003 | FR-002, ORPH-001/004/005/006/009/010/011/013/014 | T2.2 | unit | seeded memory DB, planted Class A orphans | detector returns exactly the planted findings | `tests/vitest/orphan-audit-detection.test.ts` | `bunx vitest run tests/vitest/orphan-audit-detection.test.ts --maxWorkers=1` | red→green | none |
| P-004 | DATA-002 | T2.2 | unit | toggle `PRAGMA foreign_keys` on/off | report `fk_enforcement` field reflects state | (in P-003 file) | same as P-003 | red→green | none |
| P-005 | FR-003, ORPH-002/003/007/008/012 | T3.1 | contract | `FakeR2Bucket`+`list()`, seeded D1 paths | R2-only/D1-only/matched sets correct; cap aborts over-budget | `tests/vitest/orphan-audit-reconcile.test.ts` | `bunx vitest run tests/vitest/orphan-audit-reconcile.test.ts --maxWorkers=1` | red→green | none |
| P-006 | FR-004, SEC-002 | T4.1 | unit | sample reports with safe + planted-safe values | zero secret-pattern regex hits | `tests/vitest/orphan-audit-redaction.test.ts` | `bunx vitest run tests/vitest/orphan-audit-redaction.test.ts --maxWorkers=1` | red→green | none |
| P-007 | SEC-001 | T2.3 | instrumentation | throwing D1/R2 stubs (fail on `run/delete/put`) | detection completes; zero write calls | `tests/vitest/orphan-audit-read-only.test.ts` | `bunx vitest run tests/vitest/orphan-audit-read-only.test.ts --maxWorkers=1` | red→green | none |
| P-008 | FR-005, REL-001, SEC-003 | T6.1 | unit | report file + seeded DB/R2 | refuses w/o `--from-report`/`--confirm`/token; idempotent re-run = no-op | `tests/vitest/orphan-audit-repair.test.ts` | `bunx vitest run tests/vitest/orphan-audit-repair.test.ts --maxWorkers=1` | red→green | none |
| P-009 | PERF-001 | T2.2 | perf | seeded 10x fixture (~10 WS × 100 proj × 100 est) | median ≤ 60s; EXPLAIN artifacts show index use | `tests/vitest/perf/orphan-audit-baseline.ts` | `bunx vitest run tests/vitest/perf/orphan-audit-baseline.ts --maxWorkers=1` | red→green | none |
| P-010 | DATA-003 | T7.1 | unit | memory DB, `PRAGMA foreign_keys=OFF` | project delete → 0 surviving `estimate_sheet_events`/`adjustments` | extend project-delete tests + `tests/vitest/project-delete-cascade-off.test.ts` | existing suite + `bunx vitest run tests/vitest/project-delete-cascade-off.test.ts --maxWorkers=1` | red→green | none |
| P-011 | DATA-004, TEST-004 | T8.2 | unit | memory DB per cascade edge | each declared cascade edge enforced | `tests/vitest/d1-cascade-behavior.test.ts` | `bunx vitest run tests/vitest/d1-cascade-behavior.test.ts --maxWorkers=1` | **blocked** until OPEN-DEC-001 | skip until decision |
| P-012 | DB-CHG-004 | T9.2 | unit | existing retention fixtures | `uploads_orphaned` rule selects+sweeps; TTL 90d | extend `tests/vitest/compliance-retention-repository.test.ts` | `bunx vitest run tests/vitest/compliance-retention-repository.test.ts --maxWorkers=1` | red→green | none |
| P-013 | SEC-004 | T6.1 + revoke patch | unit + denial | revoked publication row with non-null `password_hash` | ORPH-014 detection flags it; revoke patch nulls it; public route denies unlock | `tests/vitest/publication-revoke-clears-password-hash.test.ts` + denial test | `bunx vitest run tests/vitest/publication-revoke-clears-password-hash.test.ts --maxWorkers=1` | red→green | none |
| P-014 | SEC-005 (conditional) | optional route | contract | cron route without `CRON_SECRET` | 401 refusal | `tests/vitest/orphan-audit-cron-route-gate.test.ts` | `bunx vitest run tests/vitest/orphan-audit-cron-route-gate.test.ts --maxWorkers=1` | red→green | skip if route not built |
| P-015 | SEC-006 | new test | unit | `password_hash` rotation | `credentialVersion` changes on password change; 22-char slice non-invertible | `tests/vitest/publication-credential-version.test.ts` | `bunx vitest run tests/vitest/publication-credential-version.test.ts --maxWorkers=1` | red→green | none |
| P-016 | FR-007 | T5.1 | smoke | local seeded DB | dry-run prints report + exits 0 clean / non-zero critical | (script invocation) | `bun run cf:orphan-audit --dry-run --target local` | red→green | none |

## Known-red broad validation ledger

Per `Improve-Plan-Prompt.md:877-879`, known-red/flaky/disabled broad validation must be recorded with command, date, branch, failure excerpt, and the narrower replacement proof. The prior draft of the execution matrix asserted "Known pre-existing reds: none" on every row — that was incorrect given the disabled CI state. This ledger corrects it.

| Command | Date observed | Branch | State / failure excerpt | Narrower replacement proof (this pack) |
|---|---|---|---|---|
| `bun run validate` (broad: type-check + lint + lint:design-system + lint:design + test + test:dom) | 2026-07-07 | `main` (shared worktree) | **Not run per-change** per AGENTS.md iteration-bias policy; GitHub Actions CI is disabled (`.github/workflows-disabled/` contains `ci.yml`, `codeql.yml`, `react-doctor.yml`, `dependabot.yml`; `.github/workflows/` is empty). The broad gate is therefore non-operational in CI for this pack's cadence claims. | The focused `bunx vitest run <test> --maxWorkers=1` commands per proof-contract row above (P-001…P-016) are the narrower proof. For shared-logic/auth/data-integrity changes, `bun run type-check` (high-memory) + targeted ESLint + the focused vitest rows replace the broad gate. The hosted preview dry-run (`13`) is the provider-backed proof the broad gate cannot provide. |
| GitHub Actions `ci.yml` / `codeql.yml` | 2026-07-07 | `main` | Disabled (workflows moved to `.github/workflows-disabled/`); confirmed in `.ai/10_state/current-state.md` fast-path. Not a test failure — a deliberately-disabled surface during fast iteration. | Local focused tests + manual operator cadence (`13` runbook). Re-enable by moving YAML back to `.github/workflows/`. |

**Implication for readiness:** the pack does NOT claim a green broad `validate` gate. It claims the focused proofs (P-001…P-016) pass, and defers the broad gate to the shared-logic/release moment per AGENTS.md. FR-007's CI cadence is explicitly conditional on GitHub Actions being re-enabled (RISK-015).

## Adversarial scenario matrix (UltraQA-style)

For the audit + repair runtime behavior. Dynamic adversarial QA applies to the *future implementation*, not the planning pack itself (justification: planning-only — see `19`).

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-1 | operator | dry-run on empty DB | empty memory DB | detection test variant | 0 orphans, exit 0 | designed | test | none |
| AQ-2 | operator | dry-run with 1M rows | large fixture | perf test | paginated, ≤ budget | designed | perf artifact | none |
| AQ-3 | attacker with report file | scan for secrets | redaction test | regex | 0 hits | designed | TEST-003 | none |
| AQ-4 | operator | repair without token | repair test | missing token | refused | designed | gate test | none |
| AQ-5 | operator | repair with tampered report | repair test | bad schema | refused | designed | gate test | none |
| AQ-6 | operator | repair re-run | repair test | same report twice | 2nd run no-op | designed | idempotency test | none |
| AQ-7 | network failure mid-R2-list | partial reconciliation | fake R2 throws | reconciliation | partial report + gap | designed | reconcile test | none |
| AQ-8 | cost cap hit | abort scan | fake R2 huge set | reconciliation | abort + partial | designed | cap test | none |
| AQ-9 | detection attempts a write | read-only violation | throwing stub | read-only test | abort + error | designed | TEST-002 | none |
| AQ-10 | concurrent repair runs | double-repair | two repair procs | idempotency | 2nd no-op (or lock) | designed | idempotency test | none |
| AQ-11 | migration parse misses an edge | manifest drift | snapshot test | manifest | snapshot diff fails | designed | manifest test | none |
| AQ-12 | malformed input flag | bad `--target` | script test | CLI | hard error | designed | smoke test | none |

## Validation commands (repository-native)

- `bun run type-check` (high-memory)
- `bun run lint` (targeted ESLint; no errors)
- `bunx vitest run <focused> --maxWorkers=1` for each new test
- `bun run cf:orphan-audit --dry-run --target local` (smoke)
- `git diff --check` before commit

Do NOT run the full `bun run validate` for every change (AGENTS.md iteration bias); reserve it for shared logic (the audit module port) or release gates.

## A requirement is NOT ready if its only validation is "manual QA"

Every requirement maps to an automated test or an operator runbook step with exact commands, expected observations, and pass/fail criteria (see `16`). Manual QA is reserved for the hosted preview dry-run, which has explicit steps in `13`.
