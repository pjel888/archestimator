# Evidence Index — How to read this folder

This `evidence/` folder is the audit's honesty layer. Everything in the main pack that is
labelled **observed** traces back to an artifact referenced here.

## Files

| File | Purpose |
|------|---------|
| `command-log.md` | Every command run this session + every command deliberately **not** run (with reasons). Blocked/skipped commands are kept on purpose. |
| `route-inventory.md` | Raw enumerated page + API routes and loading/error/layout boundary coverage (`find` output). |
| `current-budgets.md` | The existing `route-transition-performance-budgets.json` values, a critique of each, and proposed SMOKE / CLOSED-BETA / PUBLIC-LAUNCH readiness budgets. |
| `findings-index.md` | Every finding ID → source files, evidence, speed-matrix row, and backlog item. The traceability spine. |

## Where the real numbers come from

No performance numbers were generated this session (no dev server was running; `build`/`dev`
were withheld to avoid `.next/` contention with concurrent coding agents — see
`command-log.md`). All **observed** metrics are cited from prior captured evidence, primarily:

- `.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z/`
  — authed `/workshop/projects` Lighthouse (perf 0.86, FCP 1208ms, LCP 3865ms, TBT 124ms,
  SpeedIndex 3514ms, serverResponse 630ms).
- `.ai/09_archive/store/route-transition-production-auth-refresh-20260601T093203Z/` and
  sibling archives — standalone `perf:measure-routes` authed medians and Slow 3G medians.
- `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md`
  — the running log of implemented phases + captured metrics.

## Re-measurement

To turn **blocked**/**unknown** rows into **observed**, run the protocol in
`../10_TESTING_AND_BENCHMARK_PROTOCOL.md`. It lists the exact commands, the network
profiles, and how to obtain an authenticated Playwright storage state safely. Capture new
JSON under this `evidence/` folder (or summarize large artifacts and link their location).
