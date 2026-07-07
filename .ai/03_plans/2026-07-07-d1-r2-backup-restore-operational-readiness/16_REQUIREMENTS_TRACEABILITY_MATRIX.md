# 16 — Requirements Traceability Matrix

Every requirement maps to source evidence (with **source strength**),
implementation task, acceptance criterion, validation, test coverage, rollout
check, residual **risk**, and the **open gap/decision** that bounds it. This
matches the strict prompt's required columns:
`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

Source strength key: `brief` = the PROMPT; `repo evidence` = read from
current source/migrations/config; `official docs` = Cloudflare docs (2026-07);
`assumption` = inferred, labeled; `derived` = synthesized from other evidence.

| Requirement ID | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|
| REQ-D1-01 | PROMPT "D1 backup assumptions" + D1 docs | `brief` + `official docs` | `07_…` mechanisms table | docs | table with citations; no false "daily backup" claim | static review | low (documentary) | proven (docs) | none |
| REQ-D1-02 | PROMPT "safe target isolation" + wrangler.jsonc | `brief` + `repo evidence` | `07_…` + `11_…` TASK-101 + `08_…` REQ-SEC-02 | TASK-101 | assertion aborts when dest=`9bdb29bb-…` | PROOF-01 (FD-01) | **RISK-01 Critical** if bypassed manually | specified | none (implement TASK-101) |
| REQ-D1-03 | PROMPT "restore rehearsal procedure" + existing script | `brief` + `repo evidence` | `07_…` + `11_…` TASK-103 | TASK-103 (extend) | `restoreRehearsalReady: true`, FK=0 | PROOF-02 | low | proven (existing) | none |
| REQ-D1-04 | PROMPT stop condition + D1 docs | `brief` + `official docs` | `11_…` TASK-102 + `19_…` boundary | TASK-102 | `providerBacked: true` + gates green | PROOF-06 (gated) | **RISK-02 High** hosted unproven until drilled | specified (provider path BLOCKED-EXTERNAL) | **OPEN-01** |
| REQ-R2-01 | PROMPT "R2 strategy" + R2 docs | `brief` + `official docs` | `07_…` reality + `19_…` | docs | reality table with citations | static review | low | proven (docs) | none |
| REQ-R2-02 | PROMPT "R2 inventory" + migrations 0010/0022 | `brief` + `repo evidence` | `07_…` + `11_…` TASK-201/202 | TASK-201/202 | orphan+dangling counts; **both tables**; redaction; dedup | PROOF-03 | medium (real bucket unverified until impl) | specified | none (implement) |
| REQ-R2-03 | PROMPT "object restoration" + R2 docs | `brief` + `official docs` | `07_…` + `11_…` TASK-301 | TASK-301 | sha256/etag match; **`_drill/` prefix** asserted | PROOF-04 | **RISK-03 High** user-error data loss (no versioning) | specified | **OPEN-03** (RPO posture) |
| REQ-R2-04 | PROMPT "R2 strategy" + R2 durability docs | `brief` + `official docs` | `06_…`/`07_…` | docs | recommendation + OPEN-03 | static review | low | proven (docs) | **OPEN-03** |
| REQ-PERF-01 | PROMPT "RTO/RPO" + D1/R2 docs | `brief` + `official docs` | `09_…` table + evaluator | TASK-401 | derived targets + proof command; **10-restores/10-min** noted | PROOF-06 (measurement) | medium (measurement deferred) | proven (docs); measurement deferred | **OPEN-01** |
| REQ-OPS-01 | PROMPT "runbook" | `brief` | `13_…` | TASK-501 | numbered + rollback + **manual scope probe** + **off-peak** + **rate-limit** | static review | low | proven (docs) | none |
| REQ-OPS-02 | PROMPT "failure drills" | `brief` | `12_…` matrix | TASK-402 | every cell answered/N-A | matrix execution | low | proven (docs) | none |
| REQ-OPS-03 | PROMPT "evidence artifacts" | `brief` | `13_…` cadence | TASK-502 | cadence + artifact paths | static review | low | proven (docs) | none |
| REQ-OPS-04 | PROMPT "what is impossible locally" | `brief` | `19_…` boundary | TASK-502 | local-vs-provider per claim | static review | low | proven (docs) | none |
| REQ-SEC-01 | `AGENTS.md` secret hygiene | `repo evidence` | `08_…` + tool specs | TASK-201/301 | no-env-read; redaction; **scope-probe correction (P0-3)** | PROOF-05 | **RISK-07 High** if bytes/keys leak | specified | none |
| REQ-SEC-02 | PROMPT "safe target isolation" | `brief` + `repo evidence` | `08_…` + `11_…` TASK-101 | TASK-101 | hard abort on prod id | PROOF-01 | **RISK-01 Critical** | specified | none |
| REQ-SEC-03 | privacy/retention migrations 0033/0034/0004/0035 | `repo evidence` | `08_…` re-erasure + `13_…` runbook | TASK-501 | **concrete re-erasure procedure** (detect→re-apply→denial→sign-off) | PROOF-07 (manual) | **RISK-05 High** compliance | specified (runbook) | none (runbook-gated) |
| REQ-DOC-01 | PROMPT "free-tier costs" + D1/R2 pricing docs | `brief` + `official docs` | `20_…` | docs | **envelope with numbers** + headroom % | static review | medium (scale-out unmodeled) | proven (docs) | **OPEN-02** (cadence/quota) |
| REQ-DOC-02 | PROMPT (parity clarity) | `brief` | `21_…` | docs | matrix complete incl. **both buckets** | static review | low | proven (docs) | none |

## Notes on status labels

## Notes on status labels

- **proven (docs)**: the planning deliverable itself satisfies the requirement
  (documentary requirements). These are complete *for this planning task*.
- **specified**: the requirement is fully specified with exact paths/symbols/
  tests, but the *implementation* is future work (Phase 1–5). These are
  `IMPLEMENTATION-READY` for the named task unless gated.
- **BLOCKED-EXTERNAL** (REQ-D1-04 provider path): requires OPEN-01.
- **proven (existing)**: the existing rehearsal already satisfies REQ-D1-03.

## Performance-sensitive requirements — additional mapping

| Requirement | Baseline metric | Target metric | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| REQ-D1-04 (provider) | local rehearsal duration | export+reimport < 30 min | drill `durationMs` (OPEN-01) | > 2× baseline or > 30 min | drill cannot verify gates |
| REQ-PERF-01 | local duration | RTO < 30 min at volume | provider drill | > 30 min | abort + do not return target to service |
| REQ-R2-03 | n/a | get→put seconds–minutes | restore drill `durationMs` | checksum mismatch | delete re-put object |

## No untraced requirement

All 18 requirements (`REQ-D1-01…04`, `REQ-R2-01…04`, `REQ-PERF-01`,
`REQ-OPS-01…04`, `REQ-SEC-01…03`, `REQ-DOC-01…02`) are traced to source,
task, test, and rollout. None is left dangling.
