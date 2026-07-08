# 12 — Test and Validation Strategy

## Applicability

These are **CLI/proof scripts**, not app runtime code. The proof model mirrors
the existing `cf:d1-restore-rehearsal`: a script that emits a structured
report with `Ready` gates + a self-describing `note`. "Tests" are (a) unit
tests for the pure logic (assertions, validators, reconciliation joins) and
(b) the drill scripts themselves as integration proof.

Dynamic adversarial QA (browser/Playwright) is **not applicable** — no browser
surface. The applicable adversarial QA is the failure-drill matrix below.

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-D1-03 | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (self-gating) | integration (local sqlite) | existing | sanitized 5-table fixture (in-file) | `bun run cf:d1-restore-rehearsal` | `restoreRehearsalReady: true`, FK=0, checksums match | none | impl |
| REQ-D1-02 | `scripts/__tests__/d1-restore-target-isolation.test.ts` | unit | new | fake `wrangler.jsonc` payloads (prod id, preview id, unknown, malformed) | `bun test scripts/__tests__/d1-restore-target-isolation.test.ts` | aborts when dest=prod; ok when dest=preview; warns when unknown | n/a | impl |
| REQ-D1-04 | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (provider path) | integration (provider, gated) | new variant | isolated staging DB + second isolated DB | `DRILL_PROVIDER_BACKED=1 OPEN01_APPROVED=1 bun run cf:d1-restore-rehearsal` | `providerBacked: true`, gates green | **deferred (OPEN-01)** | impl + owner |
| REQ-R2-02 | `scripts/__tests__/r2-inventory.test.ts` | unit | new | mocked REST `/objects/list` (empty, paginated, traversal key, oversized) | `bun test scripts/__tests__/r2-inventory.test.ts` | pagination completes; traversal key rejected; redaction samples | n/a | impl |
| REQ-R2-02 | `scripts/generate-cloudflare-r2-inventory.ts` (reconcile) | unit | new | mock `upload_assets` set | `bun test scripts/__tests__/r2-inventory.test.ts` | orphan + dangling counts correct | n/a | impl |
| REQ-R2-03 | `scripts/__tests__/r2-restore-rehearsal.test.ts` | unit | new | mocked get/put/head (match, mismatch, 404) | `bun test scripts/__tests__/r2-restore-rehearsal.test.ts` | match→PASS; mismatch→FAIL+retry; 404→dangling | n/a | impl |
| REQ-SEC-01 | (covered by r2-inventory test redaction assertions) | unit | new | secret-looking key | as above | report samples, does not dump all keys | n/a | impl |
| REQ-SEC-02 | (covered by d1-restore-target-isolation test) | unit | new | prod id | as above | abort non-zero | n/a | impl |
| REQ-SEC-03 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` runbook step | manual (runbook) | new | restored DB with resurrected rows | runbook execution | re-erasure check passes | n/a | operator |
| REQ-PERF-01 | drill report `durationMs` field | integration | new | prod-equivalent volume | drill run | median < 30 min | **OPEN-01 for provider measurement** | impl + owner |
| REQ-OPS-02 | failure-drill matrix (below) | mixed | new | per scenario | per scenario | per scenario | n/a | impl + operator |
| REQ-OPS-04 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` boundary table | static review | new (this pack) | n/a | review | every claim classified local vs provider | n/a | planning (done) |

## Proof-contract table (required by the strict prompt)

Every planned proof is bound to a falsifiable check with a recorded pass/fail
artifact. Mirrors the existing `cf:d1-restore-rehearsal` shape
(`{ checks[], blockers[], note }`).

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-01 | REQ-D1-02, REQ-SEC-02 | TASK-101 target-isolation | unit | fake `wrangler.jsonc` payloads (prod/preview/unknown/malformed dest ids) | aborts non-zero when dest=`9bdb29bb-…`; ok on `363c756a-…`; warn on unknown | `scripts/__tests__/d1-restore-target-isolation.test.ts` | `bun test …d1-restore-target-isolation.test.ts` | green on abort+ok+warn; red if prod id passes | none |
| PROOF-02 | REQ-D1-03 | TASK-103 local rehearsal | integration (local sqlite) | sanitized fixture (extendable to full schema) | `restoreRehearsalReady: true` AND `foreignKeyViolations: 0` AND `tempArtifactsRemoved: true` | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | `bun run cf:d1-restore-rehearsal` → `evidence/<ts>-d1-restore-local.json` | green: all gates true; red: any gate false | temp dir `rmSync` (existing) |
| PROOF-03 | REQ-R2-02 | TASK-201/202 inventory + reconcile | unit (mocked) | mock REST list (empty/paginated/traversal/both buckets/malformed) + mock both-table rows | pagination completes; traversal rejected; `component-attachments` in both tables counted once; orphan+dangling correct | `scripts/__tests__/r2-inventory.test.ts` | `bun test …r2-inventory.test.ts` | green on all cases; red if traversal accepted or dedup fails | none (mocked) |
| PROOF-04 | REQ-R2-03 | TASK-301 R2 restore | unit (mocked) | mock get/put/head (match/mismatch/404) | match→PASS; mismatch→FAIL+retry; 404→dangling-sample; **`_drill/` prefix asserted** before put | `scripts/__tests__/r2-restore-rehearsal.test.ts` | `bun test …r2-restore-rehearsal.test.ts` | green on match/404; red on mismatch/prefix-fail | none (mocked); provider cleanup = delete `_drill/` object |
| PROOF-05 | REQ-SEC-01 | TASK-201/301 redaction | unit | inventory with secret-looking keys | report samples ≤5 keys, never dumps all; no bytes | (same test files) | (same) | green if no full-key dump; red otherwise | none |
| PROOF-06 | REQ-D1-04 | TASK-102 provider rehearsal | integration (provider, gated) | isolated staging DB + second isolated DB | `providerBacked: true` + all gates green + duration recorded | `evidence/<ts>-d1-restore-provider.json` | `DRILL_PROVIDER_BACKED=1 OPEN01_APPROVED=1 bun run cf:d1-restore-rehearsal` | green when OPEN-01 closes; **SKIP until then** | drop isolated target |
| PROOF-07 | REQ-SEC-03 | DSAR re-erasure (real restore only) | manual (runbook) | restored DB with resurrected erasure rows | resurrection detected + re-applied + denial-test holds | `13_…` runbook step | manual; evidence ledger row | green on re-erasure+denial; **N/A for disposable drills** | n/a |

Known-red posture: no broad `validate`/`build` is required for these additive
CLI scripts; `bun run type-check` + focused `bun test` cover the import
boundary. If a future executor adds app-code coupling, escalate to
`bun run type-check` (high-memory variant) before claiming green.

## Failure drill matrix (UltraQA-style, REQ-OPS-02)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| FD-01 | operator error | D1 import into prod id | dest=prod id | `cf:d1-restore-target-isolation` | abort non-zero, "dest==prod" | (impl) | planned | target-isolation test | n/a |
| FD-02 | operator error | D1 time-travel restore against prod | n/a (runbook-only) | **never drilled** | n/a | n/a | **N/A — runbook-gated** | runbook note | n/a |
| FD-03 | data corruption | partial D1 import (network drop) | truncate dump mid-row | `execute --remote --file` into isolated target | FK/row-count gate FAIL | (impl) | planned | rehearsal gates | drop isolated target |
| FD-04 | data corruption | resurrected DSAR-erased rows after restore | restore a DB with erased rows | runbook re-erasure check | re-erasure passes | (operator) | planned | runbook log | n/a |
| FD-05 | accidental delete | R2 object deleted (user error) | delete a sampled preview object | inventory reconcile | dangling row count +1 | (impl) | planned | inventory report | n/a |
| FD-06 | integrity | R2 get→put checksum mismatch | corrupt local bytes between get and put | restore rehearsal | `match: false`, FAIL | (impl) | planned | restore report | delete re-put object |
| FD-07 | scale | oversized D1 export → quota risk | large fixture | `time bun run cf:d1-restore-rehearsal` (full-schema) | duration recorded; rows-read < 5M | (impl) | planned | duration evidence | temp dir removed |
| FD-08 | availability | Cloudflare provider outage mid-drill | simulate wrangler network fail | drill with timeout | abort + report; no destructive retry | (impl) | planned | drill report | drop partial target |
| FD-09 | security | traversal-shaped R2 key in bucket | inject `../../etc/passwd` key | inventory script | `assertSafeStoragePath` rejects | (impl) | planned | inventory report | n/a |
| FD-10 | security | secret-looking object key | inject `SECRET-…` key | inventory script | report samples/redacts, not dump | (impl) | planned | inventory report | n/a |
| FD-11 | rollback | drill rollback | completed drill | drop staging DB + delete re-put preview object | targets clean | (operator) | planned | runbook log | n/a |
| FD-12 | concurrency | two concurrent imports into same target | two parallel `execute --remote --file` | (do not do this) | **N/A — not safe**; runbook says one-at-a-time | n/a | **N/A with reason** | runbook note | n/a |

Every cell answered or N/A-with-reason.

## Validation commands (verified against `package.json`)

- `bun run cf:d1-restore-rehearsal` — existing; safe; temp artifacts only.
- `bun run type-check` — TypeScript check (high-memory variant exists).
- `bun test scripts/__tests__/<name>.test.ts` — focused unit tests (new).
- `bun run cf:pricing` — refresh pricing snapshot (no provider mutation).
- `bun run cf:check-wrangler-auth` — verify scoped token before any provider drill.
- `git diff --check` — whitespace/conflict check before commits (if/when the
  future executor commits; this planning task does not commit).

No broad `bun run validate`/`build` is required for these additive CLI scripts
unless they import app code that changes — they import only
`r2-storage-provider.ts` validators (read-only reuse). If a future executor is
nervous, `bun run type-check` covers the import boundary.

## Evidence class boundary (per Multi-Agent Directive)

| Claim | Evidence class | Can prove | Cannot prove |
|---|---|---|---|
| Local SQLite rehearsal round-trips cleanly | Local automated | mechanism correctness | hosted D1 restore behavior |
| Target-isolation assertion aborts on prod id | Local automated | the assertion works | operator won't bypass it manually |
| R2 inventory logic + reconciliation | Local automated (mocked) | join/pagination/redaction logic | real bucket contents, real quota |
| Provider-backed D1 restore | Provider-backed (OPEN-01) | hosted export/import round-trip | (only when actually run) |
| R2 get→put round-trip | Provider-backed | real object integrity | (only when actually run) |
| RTO < 30 min | Provider-backed measurement | actual duration at volume | (only when measured) |

The runtime readiness portions are `CONDITIONALLY READY` until the
provider-backed rows are executed (OPEN-01) — this is stated, not hidden.

## Known gaps / skipped validation

- **Provider-backed D1 restore** (REQ-D1-04 provider path): **deferred to
  OPEN-01**. Risk: hosted readiness unproven. Substitute: local rehearsal +
  documented commands.
- **Provider-backed R2 inventory/restore** against the real bucket: deferred to
  implementation execution (needs wrangler auth + preview bucket). Risk: real
  bucket shape unknown. Substitute: mocked unit tests.
- **RTO measurement** at production volume: deferred (size-dependent). Risk:
  RTO target is a planning estimate. Substitute: local duration as a lower
  bound.

Each gap has a named unblock action in `17_…`.
