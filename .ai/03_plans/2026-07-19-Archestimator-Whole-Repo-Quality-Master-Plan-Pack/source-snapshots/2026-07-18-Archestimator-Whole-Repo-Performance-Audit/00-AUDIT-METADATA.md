# 00 — Audit Metadata

## Live audit identity

| Field | Value |
|---|---|
| Audit date | 2026-07-18T22:46:11+08:00 |
| Repository root | `/Users/philiplewis/Documents/archestimator` |
| Branch | `main` |
| HEAD SHA | `a41a07d0143abf72289a97cd8bd023cfa9986361` |
| `main` SHA | `a41a07d0143abf72289a97cd8bd023cfa9986361` (HEAD = main) |
| HEAD subject | `docs(ai): move improve-audit backlog from plans/ into dated plan pack` |
| HEAD author date | 2026-07-18T20:23:58+08:00 |
| Tree dirty? | NO (only this audit folder is untracked) |
| HEAD vs main | SAME |
| bun | 1.3.14 |
| node | v26.0.0 |
| uname | Darwin arm64 (Mac mini, Darwin 27.0.0) |
| Dependencies installed | YES |
| `.next/` exists | YES (dev artifacts only — no production build present) |
| `.open-next/` exists | YES (stale — Jul 12; not regenerated since) |
| Tailored-against SHA | `a41a07d0143abf72289a97cd8bd023cfa9986361` (prompt was authored against this same HEAD) |
| Baseline plan pack SHA | `0a2667db9` (drift = 16 commits, 333 files, 40k insertions) |

## Environment caveats — what this audit can and cannot prove

**This run is read-only audit + planning only.** No production code, migrations, infrastructure, dependencies, or deployment settings were modified.

**Measurements performed (STATIC-CONFIRMED or MEASURED locally):**
- `bun run type-check` (tsc --noEmit, 4 GB heap) — 11.7s wall, exit 0.
- `bun run lint` (eslint) — 63.2s wall, exit **non-zero** (12 errors, 139 warnings).
- Existing `.open-next/` artifacts inspected (stale from Jul 12).

**Measurements explicitly NOT performed (BLOCKED — user-gated per AGENTS.md):**
- `bun run build` / `ANALYZE=true` webpack bundle treemap.
- `bun run cf:build` Worker bundle regeneration.
- `bun run test`, `bun run test:dom`, `bun run test:e2e` (Playwright) — test authorization gate.
- Browser / Lighthouse / React Profiler sessions — browser gate.
- Hosted Cloudflare route probes — credentials gate.
- Hosted D1 `EXPLAIN QUERY PLAN` against real data — credentials + representative data gate.

The audit deliberately marks browser/runtime/D1-scale claims as `HYPOTHESIS` or `BLOCKED` rather than fabricating hosted evidence. Findings are grounded in current source, query shapes, configuration, and complexity analysis. Static-confirmed findings identify exact mechanisms; measured confirmation is the responsibility of the implementation waves.

## Tooling used
- Lead agent: source reading, `git ls-files`, `git diff`, `bun run type-check`, `bun run lint`, manifest inspection.
- Four parallel recon agents (general-purpose): React/estimate-editor map, D1 schema/intent map, Worker/DO/Queue/Cron map, exports/uploads/auth/observability map.
- Existing artifact reuse: `.next/` dev manifest, `.open-next/` stale build output, `package.json` scripts inventory, migration source.

## Audit scope decisions

- **Whole-repo coverage**: every tracked file (12,621 files) classified in `artifacts/repository-file-inventory.csv`. 8,043 are archived evidence (`.ai/09_archive/`), 1,342 active product docs, 990 tests, 519 agent-config tooling — none of these are runtime surfaces. The runtime-audited set is ~1,500 files spanning browser client, React/Next server, API/server actions, Worker request path, D1 query/mutation, DO/realtime, Queue/Cron, R2/upload/image/media, export, auth/security, observability, and build/config.
- **Drift reconciliation**: existing `2026-07-18-Codebase-Improve-Audit-Plan-Pack` (33 plans) was authored at `0a2667db9`; current HEAD is 16 commits later with material changes to linked Templates (migration 0092), worker pre-routing, recipient email durable queue, durable rate limits, and tests. See `01-EXISTING-AUDIT-RECONCILIATION.md`.
- **No production mutation.** No `.ai/09_archive/`, migrations, wrangler config, package.json, or any code under `src/` was edited. This entire audit lives under `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/`.
