# 14 — Risk Register — Production RUM And CWV Telemetry

| ID | Description | Trigger | Prob | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | AE retention shorter than assumed (~90d unconfirmed) | need >90d window for trend | Med | Med | High | dashboards, release gates | dashboard shows empty old data | D1 rollup (SINK-02) | extend rollup retention | operator confirms exact; extend D1 retention | owner | low | open (ASSUMP-04) |
| RISK-02 | Route-bucket leaks an identifying path param | new route shape not in allowlist | Med | High | High | privacy | denial table test (PRIV-03) | strict allowlist + `unknown` default | add shape + test | purge impractical — emphasize prevention | impl | low (with tests) | mitigated |
| RISK-03 | Beacon volume exceeds 100K/day AE ceiling (viral/bot) | traffic spike | Med | Med | Med | data completeness | daily budget alarm (SINK-04) | client sampling + server cap | lower sample rate | accept aggregate gap | owner | low | mitigated |
| RISK-04 | Owner blocks workshop RUM | privacy decision | Med | Med | Med | signal coverage | `OPEN-CONSENT-01` | landing slice lands independently | landing-only telemetry | reduce scope | owner | med | open |
| RISK-05 | `web-vitals` adds bundle weight over budget | budget check fails | Low | Low | Low | bundle | `check-performance-budgets.mjs` | dynamic-import fallback | route-gate the component | accept on heavy routes | impl | low | mitigated |
| RISK-06 | In-memory rate limit is per-isolate (not global) | distributed flood | High | Low | Med | abuse | budget alarm | daily alarm backstop | per-isolate cap + alarm | accept | impl | med | accepted |
| RISK-07 | AE schema/binding key name changes across wrangler versions | config rejection at deploy | Low | Med | Med | deploy | `cf:typegen` + deploy | verify schema docs before Phase 4 | log-only fallback | pin/adjust | impl | low | open |
| RISK-08 | Privacy-notice wording non-compliant | jurisdictional review | Low | High | Med | legal | owner review (PRIV-08) | owner-approved wording | revise notice | legal counsel | owner | low (post-review) | open |
| RISK-09 | Concurrent agent edits `providers.tsx`/`next.config.ts`/`wrangler.jsonc`/`worker.ts` | shared worktree | Med | Low | Med | impl | git status re-check | file-scope ownership | re-read before edit | coordinate | impl | low | mitigated |
| RISK-10 | Managed beacon (landing) leaks more than expected if CF changes product | vendor change | Low | Med | Low | privacy | periodic review | consent gate stays | disable token | off | owner | low | accepted |
| RISK-11 | Value forgery skews p75 | attacker | Med | Low | Low | dashboard | value-range sanity | drop implausible values | ignore extremes | accept | impl | low | mitigated |
| RISK-12 | Cron failure drops a rollup day | cron error | Low | Low | Low | dashboards | cron log | idempotent upsert (re-runs next day) | recompute | accept gap | impl | low | mitigated |

## Technical + non-technical notes

- The highest-severity *privacy* risk (RISK-02) is mitigated by design (allowlist
  + `unknown` default + tests). The highest-severity *operational* risk
  (RISK-01) is mitigated by the D1 rollup.
- No unmitigated High/Critical remains. RISK-01/04/08 remain *open* because
  they depend on owner/provider facts, not code.
