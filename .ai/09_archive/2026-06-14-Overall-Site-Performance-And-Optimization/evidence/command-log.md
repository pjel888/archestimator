# Evidence — Command Log (brutally honest)

**Audit date:** 2026-06-14 (~07:1x GMT+8)
**Repo:** /Users/philiplewis/archestimator @ HEAD `3070c46c` (branch `main`)
**Toolchain observed:** Bun `1.3.10`, Node `v25.8.0` (PATH node is current; prior memory of node v14 is stale).

This log records every meaningful command the audit ran. Failed / skipped / blocked
commands are intentionally retained — they are evidence. **No application source was
modified; no build, deploy, migration, or provider mutation was performed.**

## Legend
- **non-blocking** = informational, did not gate the audit.
- **blocking** = a measurement we wanted but could not obtain (recorded as `blocked`).

---

## Commands run (read-only inspection)

| # | Timestamp (approx, GMT+8) | Command | CWD | Result | Summary | Artifact | Class |
|---|---------------------------|---------|-----|--------|---------|----------|-------|
| 1 | 07:14 | `git status --short` / `git branch --show-current` / `git worktree list` / `git stash list` | repo root | ✅ | Working tree dirty with **other agents'** edits (`ProjectEstimatesClient.tsx`, `WorkshopCollectionLayout.tsx`, 5 `tests/vitest/*`). Branch `main`. 3 worktrees present. No stash. | n/a | non-blocking |
| 2 | 07:14 | `git rev-parse HEAD` | repo root | ✅ | HEAD = `3070c46cc6360186568d21bf0a007bd759d274fc` | n/a | non-blocking |
| 3 | 07:14 | `bun --version` / `node --version` | repo root | ✅ | Bun 1.3.10, Node v25.8.0 | n/a | non-blocking |
| 4 | 07:14 | `mkdir -p <plan>/evidence` | repo root | ✅ | Created the audit pack folder + evidence subfolder | this folder | non-blocking |
| 5 | 07:15 | `find src/app -name page.tsx/route.ts/loading.tsx/error.tsx/layout.tsx` | repo root | ✅ | Full route + boundary inventory captured | `evidence/route-inventory.md` | non-blocking |
| 6 | 07:15 | `ls -1 .ai/03_plans/` + per-plan `ls` | repo root | ✅ | Enumerated 5+ prior perf plans for reconciliation | `evidence/findings-index.md` | non-blocking |
| 7 | 07:17 | `curl -s -o /dev/null -w %{http_code} http://127.0.0.1:{3000,3001,3002,3010,3020}` | repo root | ⚠️ all `000` | **No dev server running on any common port.** | n/a | **blocking** |
| — | 07:1x | Read (not Bash): `README.md`, `package.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/providers.tsx`, `src/proxy.ts`, `scripts/measure-route-transitions.ts`, `e2e/route-transition-performance-budgets.json`, `.ai/03_plans/README.md`, route-transition `CURRENT_CANONICAL_PLAN.md`, `known-issues.md` | repo root | ✅ | Source-of-truth grounding for the whole pack | inline in pack | non-blocking |

---

## Commands DELIBERATELY NOT run (and why) — concurrency + safety

These are in the prompt's suggested protocol but were **not executed this session**.
Honesty over fabricated metrics.

| Command | Why not run | Status |
|---------|-------------|--------|
| `bun run build` | Writes the shared `.next/` dir; concurrent coding agents are active in this repo and a parallel build would corrupt their output / collide. Recent fresh build evidence already exists in the route-transition archive. | **deferred (concurrency safety)** |
| `bun run dev` / `next dev` | No server was up (cmd #7); starting one risks contention, and project memory records a second `next dev` will not start while another is bound. Auth routes also need the Supabase local stack. | **blocked** |
| `bun run perf:measure-routes` (public, No-throttle / Fast 3G / Slow 3G) | Requires a running server (none up). Could not be obtained without starting a dev/`next start` server (see above). | **blocked** |
| `bun run perf:measure-routes` (authenticated) | Requires `INCLUDE_AUTHENTICATED=1` + `PLAYWRIGHT_STORAGE_STATE` OR dev-auth bypass. Dev-auth bypass is **disabled**; no storage state available this session. | **blocked (needs owner browser/storage state)** |
| `bun run test:e2e:perf` | Needs a server + Playwright Chromium; would also contend with concurrent agents. | **blocked** |
| `ANALYZE=true bunx next build --webpack` | The only path that emits a real treemap (Turbopack build does not). Skipped to avoid `.next/` contention; recommended as the first P0 measurement. | **deferred (concurrency safety)** |
| Lighthouse (public + authed) | Needs Chrome + `next start` + (for authed) real Supabase auth cookies. Captured authed Lighthouse evidence already exists (perf 0.86 run). | **blocked / partially covered by archive** |
| `bun run perf:check-speed-insights` | Needs Vercel CLI/auth/env configured + read-only access; also `@vercel/speed-insights` is not in `package.json`. | **blocked: missing Vercel CLI/auth/env + package not installed** |
| `bun run type-check` / `bun run lint` / `bun run validate` | Read-only but slow; the value to a *planning* pack is marginal and concurrent agents may already be running them. Not required to ground the audit. | **not run (low value for planning pack)** |

## Where real metrics in this pack come from

All numeric performance metrics cited as **observed** come from previously-captured
evidence archives (primarily under
`.ai/09_archive/store/route-transition-*`), not from commands run this session.
Anything not backed by such an artifact is labelled **target**, **likely**,
**unknown**, or **blocked**.
