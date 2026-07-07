# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | Owner undecided on backfill Mode A/B leaves existing costs in ambiguous trust state | launch with `OPEN-1` unresolved | Medium | Medium | High | data, trust | audit query | default Mode A documented | owner decision pre-launch | flip via follow-up migration | owner | Medium | open |
| RISK-2 | Reviewer role ambiguity (`OPEN-5`) → wrong authz grants/revokes | role model mis-set | Medium | High | High | security | denial tests | parity with Supabase `require_cost_library_governance_admin`; denial matrix | tighten role after `OPEN-5` | owner | Medium | open |
| RISK-3 | Computed-on-read stale propagation adds read latency | large estimates | Low | Medium | Medium | perf | evaluator 2 | index + app-level compare | fall back to non-computed | impl | Low | open |
| RISK-4 | D1 CHECK-on-ALTER rejected → migration rebuild complexity | D1 SQL limitation | Medium | Medium | Medium | data | `TASK-001` discovery | table-rebuild path prepared | `0038` fix-forward | impl | Low | open |
| RISK-5 | Dual persistence drift reintroduces Supabase coupling | accidental `supabase.rpc` | Low | High | High | architecture | grep gate in CI/test | existing governance test extended | revert | impl | Low | open |
| RISK-6 | Import formula-injection bypass | novel prefix/encoding | Low | Medium | Medium | security | injection tests | neutralize `=+-@` + export guard | advisory copy | impl | Low | open |
| RISK-7 | Audit tampering (D1 has no RLS) | privileged D1 access | Low | High | High | security | append-only test | no UPDATE/DELETE code path | D1 access governance | owner | Medium | open |
| RISK-8 | Self-accept without oversight (admin accepts own import) | single-admin workspace | Medium | Medium | Medium | trust | audit transparency | optional two-person rule (`OPEN-5`) | owner policy | owner | Medium | open |
| RISK-9 | Chip clutter degrades UX | too many chips | Medium | Low | Low | UX | a11y/UX review | tone + title guidance | consolidate | impl | Low | open |
| RISK-10 | Feature flag forgotten on/off | ops error | Low | Medium | Medium | ops | flag check in readiness | documented flag | manual verify | owner | Low | open |
| RISK-11 | Migration ordering conflict with concurrent agent work | parallel migration authorship | Medium | Medium | Medium | data | migration ledger + git status re-check | confirmed `0037` taken; reserved `0038` slot | renumber again if `0038` taken at impl | impl | Low | open |
| RISK-12 | `source-changed` false positives from clock/version skew | timezone/version compare bug | Low | Medium | Medium | data | integration test | derive from server version number, not timestamp | gate hides on failure | impl | Low | open |
| RISK-13 | Existing test `component-library-cost-governance-actions.test.ts` breaks on update | intentional contract change | High | Low | Medium | tests | test run | document as intentional | update test | impl | Low | open |
| RISK-14 | Free-tier D1 limits hit at scale | many workspaces | Low | Medium | Medium | ops | Workers Analytics | per-workspace cap | owner approval for paid | owner | Low | open |
| RISK-15 | Over-blocking legit estimates (rejected/superseded block) | aggressive gate | Medium | Medium | Medium | UX | telemetry on gate blocks | warn vs block calibration | tune | impl | Low | open |

Severity = f(Probability, Impact). No unmitigated critical (High-residual) risk remains except owner-decision-dependent RISK-1/RISK-2/RISK-7/RISK-8, which are gated by `OPEN-*` and owner policy.
