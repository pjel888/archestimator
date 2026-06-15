<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# UltraQA Scenario Matrix for Future Performance Work

This is an adversarial QA plan for later implementation. It is intentionally docs-only now.

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Cleanup |
| --- | --- | --- | --- | --- | --- |
| PERF-NORMAL-001 | Public visitor | Load `/` and top marketing routes on mobile throttle. | Lighthouse/Playwright trace + Speed Insights route data. | LCP/INP improve; no visual break. | Save trace/screenshot evidence. |
| PERF-NORMAL-002 | Authenticated beta user | Navigate `/workshop` → projects → estimate. | `bun run test:e2e:perf` with auth fixture. | Existing transition budgets pass. | Remove temp auth state if generated. |
| PERF-NORMAL-003 | Estimator editing a large sheet | Select nodes, edit cost fields, open history, open proposal preview. | React Profiler + `tests/vitest/route-transition-peak-load-profile.test.tsx`. | No INP/render regression. | Save profiler summaries. |
| PERF-MALFORMED-004 | Public share visitor with malformed token/cursor | Hit share activity/comment/decision routes with malformed token/cursor. | Existing publication route tests + generated API harness if needed. | Security errors remain correct; no cache leak. | Remove harness. |
| PERF-INJECTION-005 | Prompt-injection style route/query strings | Include suspicious `next`, `recipient`, share token, and query strings. | Analytics redaction and auth redirect tests. | Analytics drops sensitive URLs; auth sanitizes redirects. | None. |
| PERF-CANCEL-006 | Interrupted user/session | Start route transition/export then navigate away/retry. | Playwright route/export smoke. | No stuck overlay; no duplicate export state. | Clear downloads/tmp. |
| PERF-STALE-007 | Stale cache/browser state | Use stale cookies, expired share password/session, stale React Query cache. | Auth/share tests and manual browser smoke. | No unauthorized access; no stale protected data. | Clear browser context. |
| PERF-DIRTY-008 | Developer with unrelated dirty work | Run perf scripts with dirty tree. | `git status --short` before/after. | Scripts do not overwrite unrelated files. | Delete generated evidence only if temporary. |
| PERF-HUNG-009 | Long-running export or trace | Proposal export benchmark exceeds timeout. | Bounded timeout wrapper. | Timeout reported with route/fixture details; no orphan process. | Kill spawned server/process. |
| PERF-FLAKY-010 | Flaky network/CI | Route-transition perf test has one red run. | Rerun max 3, compare medians. | Classification: regression vs flake. | Save all run outputs. |
| PERF-MISLEADING-011 | False green build/test output | Script prints success but exits non-zero or skips auth cases. | Check exit status and skipped tests. | Report is failed or skipped with reason, not green. | None. |
| PERF-PRIVACY-012 | Sensitive analytics path | Visit `/share/<token>`, `/invite/<token>`, `/workshop/...`. | `vercel-web-analytics-integration.test.ts` and any future Speed Insights privacy tests. | Sensitive pageviews/route labels are not sent where policy forbids. | None. |

## UltraQA completion rule for future implementation

A future performance PR can pass UltraQA only if:

- Normal-path baseline and target metrics pass.
- At least one hostile/privacy/security scenario relevant to touched files passes.
- Generated traces/evidence are either committed intentionally under `.ai` or removed.
- Worktree status is clean except intentional docs/code changes.
