# 12 — Test and Validation Strategy

Choose the lightest proof that proves the claim (AGENTS.md). This plan is operational/infra; the
dominant proof classes are **local automated** (vitest + script self-tests) and **provider-backed**
(real alert round-trips, required for launch gates). No browser proof is required (no end-user UI).

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 catalog | `tests/vitest/alert-scenarios.test.ts` | unit | new | inline catalog | `bunx vitest run tests/vitest/alert-scenarios.test.ts` | 7 ids, no dup, valid channels | none | P1 |
| FR-03 receipt schema/redaction | `tests/vitest/alert-proof-schema.test.ts` | unit | new | planted-secret receipt | same pattern | rejects unredacted; validates fixture | none | P1 |
| FR-04 (7 scripts) self-redaction | each `scripts/verify-*-alert-delivery.ts --dry-run-self-test` | script self-test | new | planted-secret output | `bun run scripts/verify-*-alert-delivery.ts --dry-run-self-test` | redaction scan clean | none | P1 |
| TEST-03 catalog/registry agreement | `tests/vitest/alert-proof-registry.test.ts` | unit | new | catalog + registry | vitest | ids match | none | P1 |
| OPS-02 alert events redacted | `tests/vitest/alert-events.test.ts` | unit | new | event fixtures | vitest | no raw token/email/url | none | P2 |
| OPS-02 upload-ops logs failure | `tests/vitest/upload-operational-telemetry.test.ts` | unit | extend existing | webhook mock 500 | vitest | `operational_alert_failed` emitted | confirm file exists | P2 |
| DATA-02 retention rules | `tests/vitest/compliance-retention-repository.test.ts` | unit | extend existing (5→12) | per-rule fixture rows | vitest | correct rows selected; dry-run 0; budget honored | none | P3 |
| DATA-01 incident builder | `tests/vitest/incident-record.test.ts` | unit | new | incident fixture | vitest | redacts ids/detail; non-admin 403 | none | P4 |
| GATE-01/02 verifier | `tests/vitest/support-monitoring-readiness.test.ts` | unit | new | valid + invalid fixture sets | vitest | fails missing/stale/unredacted; rejects local-automated for critical | none | P5 |
| SEC-02 redaction scan | `tests/vitest/alert-proof-redaction-scan.test.ts` | unit | new | planted-secret artifact | vitest | non-empty secret match fails | none | P5 |

## Adversarial scenario matrix (UltraQA-style)

For the alert-delivery + retention + incident surfaces. Docs-only planning work does not run these
at planning time; they are specified for future implementation.

| ID | User/attacker model | Scenario | Setup | Harness | Expected signal | Status (planning) |
|---|---|---|---|---|---|---|
| AQ-1 | operator fat-finger | webhook URL malformed | set `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL=http://` | script + unit | `suppressed` + receipt `failed`, no crash | specified |
| AQ-2 | secret leak via receipt | receipt contains planted bearer | fixture artifact | redaction-scan test | scan fails (exit 1) | specified |
| AQ-3 | alert spam DoS | poller fires 1000x | mock poller | unit (idempotency) | receipts deduped by bucket; no spam | specified |
| AQ-4 | non-admin incident declare | non-admin POST | role-matrix test | 403, no row written | specified |
| AQ-5 | retention rule deletes live data | bad cutoff | fixture | dry-run shows selection; apply guarded by budget | specified |
| AQ-6 | dual emission leak | route logs `logAppError` + raw `console.error` | grep audit (sibling SEC-01 owns fix) | inventory records it; not fixed here | specified (inventory) |
| AQ-7 | stale receipt passes launch | receipt >72h | verifier test | exit 1 | specified |
| AQ-8 | migration collision | `0040` taken | `LOOP_LEDGER` | apply fails → renumber | specified |
| AQ-9 | local-automated passes critical gate | S-01 receipt local-only | verifier (GATE-02) | exit 1 | specified |
| AQ-10 | token expired mid-poll | GraphQL 401 | script | receipt `failed` + runbook step | specified |
| AQ-11 | circuit breaker open on email | EMAIL failures trip breaker | reuse `TransactionalEmailClient` test | `suppressed` logged | specified |
| AQ-12 | concurrent incident declares | two admins same root | unit | distinct ids | specified |

## Performance evaluator contract

The alert-latency budget (`09_…` §"Alert-latency budget") is the evaluator. Each verify script
records `sentAt`/`ackObservedAt`; the regression threshold is per-scenario. No separate load
harness needed (alert frequency is low). The retention-pass cost is evaluated by extending
`compliance-retention-repository.test.ts` with a large fixture + `budget_reached` assertion.

## Validation commands (repo-native)

- `bunx vitest run <focused>` for each new test.
- `bun run type-check` (focused, high-memory if needed).
- `bun run lint` (focused, no errors).
- `bun run cf:d1:migrate` (local equivalent) for `0040`.
- `git diff --check` for doc/config changes.
- **Not run by this planning task** (implementation-time): `bun run validate`/`build` only if the
  change touches shared logic (it touches `retention-core.ts` + `operational-telemetry.ts` → a
  targeted `validate` is justified at implementation time).

## Skipped validation (honest)

- **Provider-backed receipts** (S-01/S-02/S-05/S-06 hosted round-trips) — cannot be produced from
  local evidence; named as external gate GATE-02. Risk: launch blocked until owner runs the
  hosted proofs.
- **Browser proof** — intentionally skipped (no end-user UI; AGENTS.md Codex speed guardrail).
- **Paid alerting** — skipped (free-tier constraint).
