# 12 — Test and Validation Strategy

## 12.1 Testing philosophy (proportional)

Per `AGENTS.md` "Verification Policy" and the Creating-Plan-Prompt directive: choose the
lightest proof that actually proves the claim. The claims here are:

1. Doc counts match reality → static file-scan test.
2. Migration ledger diff is correct → unit test on a fixture Wrangler-output string.
3. Schema verifier correctly detects presence/absence → unit test on fixture catalogs + local D1 run.
4. Compliance gates fire → unit test on a fixture missing the HMAC CHECK constraint.

No browser, no E2E, no visual QA, no performance harness — all correctly skipped
(proportional to a dev-tooling plan with no UI).

## 12.2 Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-DOC-01 (README count) | `tests/unit/scripts/check-doc-migration-counts.test.ts` | unit | new | fixture README snippets (matching + stale) | `bun test tests/unit/scripts/check-doc-migration-counts.test.ts` | stale fixture → non-zero exit; matching fixture → exit 0 | none | Impl agent |
| REQ-DOC-02 (AGENTS cron) | (same file as above) | unit | new | fixture AGENTS snippets | (same) | (same) | none | Impl agent |
| REQ-OPS-01 (guard script) | (same) | unit | new | (same) | (same) | (same) | none | Impl agent |
| REQ-FR-01 (ledger) | `tests/unit/scripts/audit-d1-migration-state.test.ts` | unit | new | fixture `d1 migrations list` output string + fixture `ls` | `bun test tests/unit/scripts/audit-d1-migration-state.test.ts` | diff = `{appliedBoth, pending, missingFromDir}` correct; `missingFromDir` non-empty → non-zero | none | Impl agent |
| REQ-DATA-01 (tables) | `tests/unit/scripts/verify-d1-schema-integrity.test.ts` | unit | new | fixture `migrations/` dir (3-4 sample files) + fixture `sqlite_master` result | `bun test tests/unit/scripts/verify-d1-schema-integrity.test.ts` | expected-set generation correct; missing-table → FAIL | none | Impl agent |
| REQ-DATA-02 (indexes/triggers) | (same) | unit | new | (same) | (same) | index/trigger sets correct | none | Impl agent |
| REQ-DATA-03 (auth tables) | (same) | unit | new | fixture auth-table constants | (same) | auth set = 4 tables + 3 indexes from `better-auth-proof-router.ts:63-69` | none | Impl agent |
| REQ-SEC-01 (compliance gates) | (same) | unit | new | fixture `account_security_events` DDL with/without `hmac-sha256:` branch | (same) | HMAC CHECK present → gate true; absent → gate false | none | Impl agent |
| REQ-ARCH-01 (no custom runner) | n/a | doc-review | n/a | n/a | `rg 'd1 migrations apply' scripts/` (expect only Wrangler, no custom applier) | no custom runner introduced | none | Reviewer |
| REQ-ARCH-02 (pattern reuse) | n/a | doc-review | n/a | n/a | grep task T-04 for `better-auth-proof-router.ts:120-128` + `verify-cloudflare-hosted-upload-ui-proof.ts:241-266` | both cited | none | Reviewer |
| REQ-FR-02 (order table) | n/a | doc-review | n/a | n/a | cross-check `07_…` §7.2 table vs `rg` over `migrations/` | all 38 classified | none | Reviewer |
| REQ-FR-03 (restore limits) | n/a | doc-review | n/a | n/a | `07_…` §7.8 + `13_…` | options listed | none | Reviewer |
| REQ-DATA-04 (fix-forward) | n/a | doc-review | n/a | n/a | `07_…` §7.3 | all 7 non-idempotent migrations have a row | none | Reviewer |
| REQ-DATA-05 (destructive review) | n/a | doc-review | n/a | n/a | `07_…` §7.2 | all 38 classified | none | Reviewer |
| REQ-REL-01 (restore rehearsal) | extend existing restore-rehearsal tests if present; else `tests/unit/scripts/d1-restore-rehearsal-real-schema.test.ts` | unit | new | real-schema fixture | `bun test …` | extended rehearsal passes; checksums match; FK check clean | none | Impl agent |
| REQ-TEST-01 (this matrix) | n/a | doc-review | n/a | n/a | this doc | every req traced | none | Reviewer |

### Local integration commands (run after impl, before merge)

```bash
# Apply migrations locally and verify
bunx wrangler d1 migrations apply ARCH_DB --local
bun run scripts/audit-d1-migration-state.ts --local      # → all 38 applied-both
bun run scripts/verify-d1-schema-integrity.ts --local    # → ready: true
bun run scripts/check-doc-migration-counts.mjs           # → exit 0

# Targeted unit tests
bun test tests/unit/scripts/audit-d1-migration-state.test.ts
bun test tests/unit/scripts/verify-d1-schema-integrity.test.ts
bun test tests/unit/scripts/check-doc-migration-counts.test.ts

# Repo hygiene
git diff --check
bun run type-check    # for the new .ts scripts
```

### Hosted-proof commands (owner-gated, NOT in CI)

```bash
bunx wrangler d1 migrations list ARCH_DB --remote
bun run scripts/audit-d1-migration-state.ts --remote
bun run scripts/verify-d1-schema-integrity.ts --remote
# (optional) wrangler d1 export ARCH_DB --remote --output=./backups/…sql  → staging restore rehearsal
```

These produce evidence artifacts but are not gates a local run can satisfy.

## 12.3 Adversarial scenario matrix (UltraQA-style)

For the dev-tooling scripts, the adversarial surface is "does the script give a false
PASS or a misleading result?" Matrix:

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AQ-01 | Mistaken developer | Migration in tracker but not in `migrations/` dir | fixture: tracker lists `0099`, dir lacks it | run `audit-d1-migration-state` unit test | `missingFromDir: ['0099']`, non-zero exit | pending | unit test |
| AQ-02 | Mistaken developer | Table missing but migration marked applied (real drift) | fixture: `d1_migrations` has `0033`, `sqlite_master` lacks `privacy_requests` | run `verify-d1-schema-integrity` test | `missing.tables: ['privacy_requests']`, `ready: false` | pending | unit test |
| AQ-03 | Stale docs | New migration added, README not updated | fixture: README says 38, dir has 39 | run `check-doc-migration-counts` test | non-zero exit with diff | pending | unit test |
| AQ-04 | Compliance bypass attempt | `account_security_events` exists but CHECK lacks `hmac-sha256:` (0035 not really applied) | fixture DDL without HMAC branch | run verifier compliance gate | `complianceGates.account_security_events_hmac: false` | pending | unit test |
| AQ-05 | False positive | Empty D1 (all tables missing) | fresh local D1, no migrations applied | run verifier `--local` | all FAIL, `ready: false`, non-zero exit (NOT a false PASS) | pending | local run |
| AQ-06 | Parse robustness | Wrangler output format changes | fixture malformed JSON/output | run ledger | non-zero exit "could not parse" (NOT a false PASS) | pending | unit test |
| AQ-07 | Hosted unreachable | `--remote` network failure | disconnect / bad creds | run `--remote` | fail-closed "hosted proof not run"; NEVER infer local = remote | pending | manual |
| AQ-08 | Superset DB | Extra tables present (e.g., `_cf_KV` or scratch) | fixture with extra `sqlite_master` rows | run verifier | PASS with `extra.tables: […]` note (not a failure) | pending | unit test |
| AQ-09 | Re-run safety of verifier | Run verifier twice | consecutive runs | idempotent | same result both times | pending | local run |
| AQ-10 | Concurrent agent edits `package.json` during impl | Shared-worktree collision | impl agent re-reads `package.json` immediately before edit | n/a | no overwrite of sibling agent's scripts | pending | process discipline |

No adversarial P0 finding is left unaddressed: every "false PASS" scenario has a denial test.

## 12.4 What is NOT tested (and why)

- **Hosted D1 state:** not testable locally; gated to owner `--remote` run (Phase 3). Recorded, not hidden.
- **Actual restore from `time-travel restore`:** destructive; owner-gated on staging. The local rehearsal proves mechanics, not hosted restore.
- **Performance:** no budget needed (§9.1); the verify completing fast IS the evaluator.
- **UI/accessibility:** n/a (§05).

## 12.5 Pre-existing reds / flaky commands

- None identified for the new scripts (they're new).
- The repo's broad `bun run validate` is known to be heavy; per `AGENTS.md` "Iteration bias,"
  targeted tests + `type-check` + `git diff --check` are the proportional validation for this
  additive-script change. Broad `validate` is reserved for shared-logic/auth/release work; this
  plan's scripts are isolated dev tooling, not shared runtime logic.
