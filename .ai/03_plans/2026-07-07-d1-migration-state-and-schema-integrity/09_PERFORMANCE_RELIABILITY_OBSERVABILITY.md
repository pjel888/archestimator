# 09 — Performance, Reliability, and Observability

## 9.1 Performance — minimal scope, with rationale

This plan introduces read-only developer/CI scripts that issue **catalog reads**
(`sqlite_master`, `pragma_table_info`) and Wrangler CLI invocations. There is no
user-facing route, no API, no render path, no client bundle change. Per the
Creating-Plan-Prompt directive (§8A): "If browser proof is not required, explain which
static, unit, DOM, profiler, or build evidence is sufficient."

**No performance budget is required**, with the justification below.

### Performance evaluator contract (per directive §4A)

| Field | Value | Justification |
|---|---|---|
| Baseline metric | n/a | No runtime/user-facing perf claim. |
| Target metric / budget | n/a | Catalog reads are constant-time O(catalog size); D1 catalog for ~73 tables/indexes is trivially small. |
| Measurement command | `time bun run scripts/verify-d1-schema-integrity.ts --local` | Wall-clock of the script; not a perf gate, just a sanity bound. |
| Dataset / fixture size | The real D1 catalog (~73 tables, 137 indexes, 4 triggers) | Fixed by the schema; does not scale with users. |
| Number of runs / flake policy | n/a | Not a perf regression gate. |
| Regression threshold | n/a | A verify run taking >10s would indicate a Wrangler/CLI issue, not a schema issue. |
| Related functional tests | `DB-INT-02` local pass | The verify completing successfully IS the functional proof. |
| Evidence artifact location | stdout JSON + optional `.ai/…/evidence/*.json` | Matches `cf:d1-*` convention. |

### Why no budget is needed

- The verifier issues **4 catalog round-trips** (tables, indexes, triggers, compliance-column
  check). Each is a `sqlite_master` scan over ~200 rows — sub-millisecond locally,
  low-single-digit-ms remotely.
- The ledger issues **1 Wrangler CLI call** (`d1 migrations list`).
- The doc guard does **no D1 access** (file scan only).
- No hot path is touched. No user request is affected. No Worker deployment changes.

The directive says: "Passing ordinary tests is not enough to claim performance readiness
unless those tests are the declared evaluator." Here, the verify/ledger completing fast and
correctly IS the declared evaluator, and the threshold is "completes without error in
trivial wall-clock time." That is satisfied by construction.

## 9.2 Reliability

### Failure modes and behavior

| Failure mode | Detection | Behavior | Recovery |
|---|---|---|---|
| Wrangler CLI output format changes (parser breaks) | Verifier/ledger parser throws | Non-zero exit, clear "could not parse Wrangler output" message | Update parser; re-run |
| Expected-set generation finds zero tables (scanner bug) | Verifier asserts `expected.length > 0` | Non-zero exit, "expected set empty — scanner broken" | Fix scanner regex; re-run |
| Remote D1 unreachable | Wrangler returns network error | Non-zero exit, "hosted proof not run" (fail-closed) | Owner retries; do NOT claim local = remote |
| Partial migration apply (class M/R) | `DB-INT-01` shows "applied" but `DB-INT-02` shows missing table | Verifier reports "DRIFT: migration X applied but table Y absent" | Follow §7.3 fix-forward |
| Doc drift recurs (new migration added, docs not updated) | `DB-INT-05` guard exits non-zero | CI fails (when wired) / developer sees mismatch | Update docs; re-run guard |

### Retry / circuit-breaking

- The scripts do NOT retry Wrangler commands (read-only; a transient failure should surface,
  not be masked). Matches the repo's "loud failure" convention.
- No circuit-breaking needed (no external service dependency beyond Wrangler/D1).

### Graceful degradation

- If `--remote` is unavailable, the scripts still run `--local` and clearly mark the remote
  result as "not run." They never infer remote state from local state.

## 9.3 Observability

### Logging

- Scripts print a JSON summary to stdout (matches `cf:d1-*` family). Example shape:
  ```json
  {
    "generatedAt": "…",
    "mode": "d1-schema-integrity-verify",
    "target": "local" | "remote",
    "expectedCounts": {"tables": 73, "indexes": 137, "triggers": 4},
    "actualCounts": {"tables": 73, "indexes": 137, "triggers": 4},
    "missing": {"tables": [], "indexes": [], "triggers": []},
    "extra": {"tables": [], "indexes": [], "triggers": []},
    "complianceGates": {
      "privacy_requests": true,
      "data_retention_events": true,
      "account_security_events_hmac": true
    },
    "ready": true,
    "localOnly": true,
    "providerBacked": false
  }
  ```
- Optional markdown artifact under a documented evidence path (env-configurable, matching
  `OUTPUT_FILE`/`MARKDOWN_FILE` pattern in `generate-cloudflare-d1-restore-rehearsal.ts:438-439`).

### Metrics / traces / dashboards

- Not applicable for dev/CI scripts. The repo's hosted observability (`wrangler.jsonc:83-97`,
  Workers Observability with `head_sampling_rate: 0.1`) covers the Worker, which this plan
  does not touch.
- No new alerts needed: the scripts' non-zero exit IS the alert in CI.

### Runbook

The fix-forward runbook is §7.3 of `07_DATA_DATABASE_API_NETWORK_PLAN.md`. The restore
runbook is `scripts/generate-cloudflare-d1-restore-rehearsal.ts:84-90` (existing) plus the
extension in `DB-INT-04`.

## 9.4 Operations

### Deployment sequencing

- The scripts are additive (`scripts/` only). No deployment sequence constraint — they can
  land independently of any Worker deploy.
- The doc edits (Phase 0) are independent and can land first.

### Feature flags

- None needed. The scripts are opt-in (developer/CI invokes them explicitly).

### Rollout / rollback

- "Rollout" = merge the script + doc edits. "Rollback" = revert the commits. No data impact.
- The scripts do not mutate state → nothing to roll back in the data sense.

### Post-release verification

- After merge: run `bun run cf:d1-schema-integrity` (proposed) `--local` in CI.
- Before first users: owner runs `--remote` (the hosted-proof gate) and records the artifact.

## 9.5 Reliability of the planning claim itself

- The plan's claims are grounded in `rg`/file-read evidence (cited as `file:line`).
- No claim depends on a runtime measurement.
- The one reliability risk to the *claim* is ASSUMP-002 (the 2026-07-06 "pending remotely"
  snapshot may have been supersposed). This is explicitly labeled a weak assumption and
  gated by OPEN-DEC-001 (hosted readback).
