# 13 — Rollout, Rollback, and Operations

## Rollout shape

This is a dev-tooling/docs change, not a service deploy. "Rollout" = merge to `main` + (optional) CI/pre-commit activation. There is **no staged production rollout**, no feature flag needed, no canary. The change is inert at runtime.

### Sequence
1. Phase 0 owner confirms home location.
2. Phases 1–4 land (scripts + snapshot + detector + tests) — additive, no behavior change.
3. Phase 3 home lands.
4. Phase 5 narrative-doc repair lands — **this is the only "visible" change** (docs now correct). Low risk.
5. Phase 6 package.json + CI/pre-commit wiring — detector becomes a gate.
6. Phase 7 handoff rules + sibling cross-ref.
7. Phase 8 verify.

### Go/no-go checklist (merge gate)
- [ ] `bun run ops:truth:check` exits 0 on `main` after Phase 5.
- [ ] Adversarial mutation suite (Phase 4) green.
- [ ] Snapshot regenerated and committed; `generatedAt` updated.
- [ ] Secret-scan over snapshot + home clean (SEC-1).
- [ ] `validate:agents` green after `AGENTS.md` edit.
- [ ] PERF-1 timing recorded (<2s each).
- [ ] Sibling pack cross-ref added (T-12).
- [ ] No `wrangler.jsonc`/`migrations/`/`worker.ts`/`cloudflare-env.d.ts` modified (constraint check via `git diff --stat`).

## Rollback

- **Trigger:** detector produces false positives that block legitimate work; OR snapshot regen becomes non-deterministic; OR a secret is discovered in the snapshot.
- **Procedure:** `git revert` the offending phase commit(s). Because every change is additive or text-only, revert restores prior behavior with no data migration.
- **Recovery of the detector after rollback:** re-introduce with the false-positive root-cause fixed; the adversarial suite must gain a case for the regression.
- **No provider/production rollback** — nothing was deployed to Cloudflare.

## Update protocol (FR-4) — per fact-class owner table

| Fact-class | Substrate source | Trigger to update | Owner role | Command |
|---|---|---|---|---|
| Cron triggers | `wrangler.jsonc` triggers.crons | cron added/removed in wrangler | dev who edits wrangler | `bun run ops:truth:snapshot`; detector re-checks AGENTS/README/home |
| Cron dispatched | `worker.ts` scheduled branches | scheduled handler edited | dev who edits worker.ts | same |
| D1 migration count/latest | `migrations/*.sql` | new migration file added | dev who adds migration | same |
| D1 binding / id | `wrangler.jsonc` d1 | binding renamed/db recreated | dev | same; also `cf:typegen` |
| R2 / DO / Queue / Images / Email / Assets bindings | `wrangler.jsonc` | binding added/removed | dev | same |
| Worker name / domains / compat | `wrangler.jsonc` | deploy config change | dev | same |
| Provider-exit posture | `35_PROVIDER_EXIT_…_RUNBOOK.md` | runbook status flips | owner | manual edit of home posture section (detector asserts citation marker exists) |
| Cost tier | `AGENTS.md` cost paragraph | owner decision | owner | manual edit of home cost section |
| Retention posture | `worker.ts` retention pass + migration `0034` | retention logic changes | dev | manual edit of home retention section |

**Rule:** any PR touching `wrangler.jsonc`, `migrations/`, or `worker.ts` scheduled handler MUST run `bun run ops:truth:snapshot` and commit the updated snapshot, and the detector MUST pass. This rule is encoded in CI (Phase 6) and in `AGENTS.md` handoff (Phase 7).

## Recurring audit (FR-6)

- **Cadence (recommended):**
  - **On every PR** that touches `wrangler.jsonc`/`migrations/`/`worker.ts`/`AGENTS.md`/`README.md`/`docs/OPERATIONAL_TRUTH.md`: CI runs `ops:truth:check`. (Primary gate.)
  - **Weekly (owner-run, while Actions disabled):** `bun run ops:truth:snapshot && bun run ops:truth:check` locally; if drift, open an issue. (Fallback.)
  - **On every release/beta exposure:** `ops:truth:check` is part of `cf:release-gates` aggregation.
- **Owner:** Philip (or delegated release engineer).
- **Failure path:** CI red blocks merge. If the doc is wrong → fix doc. If substrate changed → regen snapshot. If posture changed → update home posture section.

## Rollout performance gates

Per Creating-Plan-Prompt §13, performance gates are defined when performance is in scope. Here performance scope is **dev-tool latency only** (PERF-1); there is **no route/API/UX performance** impact. Gates:
- Baseline: N/A. Target: generator + detector <2s each.
- Observability source: local `time` + CI run duration.
- Release gates: none beyond "detector green on main" and PERF-1.
- Rollback trigger for perf: persistent >5s.
- Known gaps: none (no hosted metric needed).

## Observability (operations)

- Primary signal: CI check-run red/green for `ops:truth:check`.
- Secondary: PR diff on `operational-truth.snapshot.json` (reviewers see what changed).
- Optional (P2): append `{date, driftCount}` to a CI artifact for trend analysis. Not required for stop condition.

## Support / incident response

- **"Detector is red and I don't know why":** read the file:line in the message → follow the Update Protocol row for that fact-class. Runbook section in the canonical home (`## When this file disagrees with the snapshot`).
- **"Detector blocks an urgent PR":** do **not** `--no-verify` silently; either fix the drift (usually a 1-line doc edit + snapshot regen) or, if the detector itself is buggy, revert it (rollback) and file an issue. The home documents this.

## Post-release verification

- After merge: confirm `ops:truth:check` green on `main` HEAD.
- After the first substrate change post-merge: confirm the PR author regenerates the snapshot and CI stays green.
- After Actions re-enablement (if currently disabled): confirm the workflow runs.
