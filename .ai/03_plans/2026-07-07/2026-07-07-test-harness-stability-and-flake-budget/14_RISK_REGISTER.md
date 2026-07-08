# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | CI re-enablement causes build-minute bloat / runaway jobs | CI on; no timing budget | Med | High | **High** | CI, dev velocity | job timing vs budget | Phase 4 budget table; split groups | re-disable; tune budgets | Philip | Med (until measured) | open (owner-gated) |
| RISK-2 | Parallelizing perf suite changes what its assertions mean | fileParallelism:true globally | Med | High | **High** | perf suite, coverage | perf parity rerun | perf project stays serial (DEC-2) | revert to serial | test-owner | Low (with parity gate) | mitigated |
| RISK-3 | Quarantine becomes coverage-erosion over time | stale entries accumulate | Med | High | **High** | coverage, launch trust | ledger audit | `retest_by` ≤14d; owner cadence | reinstate tests | Philip | Med | open (cadence-dependent) |
| RISK-4 | ~525s wall-clock discourages running full suite locally | unchanged wall-clock | High | Med | Med | dev loop | (current state) | Phase 1+3 reduction | split groups; flakewatch targeted globs | test-owner | Med | open |
| RISK-5 | Inventory drift after this plan is written | tests added/removed | High | Low | Low | inventory accuracy | T0.1 re-verify | ±5% tolerance; re-run command | re-inventory | test-owner | Low | open |
| RISK-6 | Flake measurement noise (load, concurrent agents) | loaded machine; shared worktree | Med | Med | Med | Phase 0 numbers | git-dirty per run | abort-on-edit; N≥10 | rerun on quiet machine | test-owner | Med | open |
| RISK-7 | Global `vi.resetModules()` breaks tests relying on import-time setup | blanket reset applied | Med | Med | Med | Phase 3 | N-run fail-rate | opt-in scope; per-file empirical | narrow/rollback | test-owner | Low-Med | open |
| RISK-8 | Changing `test:dom`/`validate` breaks cited run-logs & launch gate | script semantics change | Low | Med | Med | `.ai` evidence, launch gate | citation grep | keep exit semantics; update citations | revert script | test-owner | Low | open |
| RISK-9 | Over-wide timeouts mask real slowness (the anti-pattern) | "fix" = raise timeout | Med | Med | Med | coverage value | per-file p95 trend | tier policy + characterization; don't widen past envelope | revert + real fix | test-owner | Low-Med | open |
| RISK-10 | Mid-scan concurrent agent edit invalidates flakewatch | shared worktree | Med | Med | Med | measurement validity | git-dirty check | abort + rerun | serialize scans | test-owner | Low | mitigated |
| RISK-11 | Flakewatch script shell-injection (SEC-1) | malicious/buggy glob argv | Low | Med | Med | dev/CI | code review | spawn array form; no `sh -c` | fix script | test-owner | Low | open |
| RISK-12 | Owner declines parallelism; wall-clock target unmet via parallelism | owner decision | Med | Low | Low-Med | wall-clock | — | plan delivers value via Phase 3 anyway | per-file fixes | Philip | Low | accepted |

**Unmitigated critical risks:** none (RISK-1/2/3 are High but all have concrete
mitigations and gates). No risk is left without an owner or detection method.
