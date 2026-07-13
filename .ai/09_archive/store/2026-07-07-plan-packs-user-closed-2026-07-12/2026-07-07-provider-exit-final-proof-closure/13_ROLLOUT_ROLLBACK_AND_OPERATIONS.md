# 13 — Rollout, Rollback, and Operations

## 13.1 Applicability

Closure is not a deployment. There is no code rollout, no staged ring, no
canary, and no traffic shift. "Rollout" here = the operator procedure
sequence; "rollback" = the data/rollback posture that depends on the export
decision.

## 13.2 Rollout sequence (operator procedure)

1. Phase 0: stale revalidation + declare operator-record ownership.
2. Phase 1: owner export/retention/loss decision → record §1.
3. Phases 2, 3, 4 (2 parallelizable after Phase 1): smoke, persona, mailbox.
4. Phase 5: `cf:provider-exit-pack` → `providerExitReady=true`.
5. Phase 6: record closure note in parent runbook; recommend `current-state.md` update.

No merge, deploy, or release is triggered by closure. The Worker is already
deployed and serving `archestimator.com` at 100% traffic (proven by deploy-
source-smoke artifact).

## 13.3 Post-exit Cloudflare smoke command list (FR-PE-03)

All commands are **read-only** and **in-bounds** (authorized Cloudflare
resources only). Run after Phase 1 (export decision recorded).

| Command | Purpose | Expected exit / signal |
|---|---|---|
| `bun run cf:verify-hosted-routes` | probe `archestimator.com` route reachability | exit 0; routes ok |
| `bun run cf:check-readiness` | Worker readiness | exit 0; ready |
| `bun run cf:check-provider-resources` | D1/R2/Queue/secret-name readback | exit 0; resources readable |
| `bun run cf:check-email` | Cloudflare Email readiness | exit 0; ready |
| `bun run cf:release-gates` | production cutover readiness | exit 0; `productionCutoverReady=true` |
| `bun run cf:check-latest-deploy-source-smoke` | deploy/source freshness | exit 0; `latestDeploySourceSmokeReady=true` |
| `bun run cf:check-provider` | provider readiness aggregate | exit 0; ready |

Record the exact commands run in operator-record `postExitSmoke.commands[]`
and set `cloudflareSmokePassed=true` only if all exit 0 and report ready.

**Boundary**: none of these commands deploy, mutate, read secrets, or touch
Supabase/Resend/Vercel. They probe the authorized Worker/D1/R2/DO/Queue/Email
surface read-only.

## 13.4 No-mutation verification path (FR-PE-07)

The complete no-mutation closure verification (safe to run at any time,
including before any owner decision):

1. `git status --short --branch` — confirm clean-ish worktree.
2. `rg -i supabase src/` — confirm 0 runtime refs (source-scan sanity).
3. `rg '@supabase|@vercel|from\s+["'']resend' src/ package.json` — confirm 0 blocker deps.
4. `bun run cf:provider-exit-pack` — regenerate the pack (read-only; trusts artifacts + operator record).
5. Read the generated `…-provider-exit-pack.md` — confirm gate table matches expectation.
6. `bun run test:dom --run tests/vitest/provider-exit-pack-script.test.ts` — confirm generator logic unchanged.

This path mutates nothing outside the derived pack files in the sibling
evidence folder (which are reproducible outputs). It is safe to run repeatedly.

## 13.5 Rollback / no-rollback decision record (FR-PE-06)

The rollback posture is determined by the OPEN-PE-01 decision:

| Decision | Rollback posture | Rollback surface | Data-loss exposure | Decision-record fields |
|---|---|---|---|---|
| `exported` | **rollback window preserved** | external export (sanitized location) | none (data preserved externally) | `rollbackDecision`, `backupLocationDescription` |
| `accepted-retention` | **Supabase stays as read-only rollback surface** | Supabase `ebxxqidacheyapmmzavr` (not cancelled) | none (Supabase holds data) | `rollbackDecision` |
| `accepted-loss` | **no rollback** | none | accepted by owner | `rollbackDecision` must state "no rollback, loss accepted" |

For `exported` and `accepted-retention`, the cheap recovery path is the
existing daily D1 backups + `cf:d1-restore-rehearsal` for *Cloudflare-side*
recovery; the export/Supabase is the *legacy-side* rollback surface.

**No-rollback trigger** (only for `accepted-loss`): if a future critical
Cloudflare-side data loss occurred and `accepted-loss` was chosen, there is no
legacy fallback. This is why DEC-PE-03 requires explicit owner acceptance +
sole-runtime proof.

## 13.6 Observability / monitoring (unchanged)

Existing Workers Observability (logs sampling 0.1, traces 0.05, invocation
logs, persist) covers post-closure runtime. No new dashboard, alert, or metric
is proposed by this plan. The smoke (§13.3) is a point-in-time check, not
continuous monitoring.

## 13.7 Support / incident implications

- If a post-closure incident reveals unexpected legacy-provider coupling
  (contradicting the `rg` proof), the incident is a P0 and the closure claim
  is re-opened. Mitigation: the source-scan gate (gate 5) would have caught
  active runtime coupling; the proof is in `03_…` §3.5.
- If `accepted-loss` was chosen and data is later needed, there is no recovery.
  Mitigation: DEC-PE-03 rule makes this an explicit owner risk acceptance.

## 13.8 Documentation updates (post-closure, separate task)

After `providerExitReady=true`:
- Append closure note to parent runbook (Phase 6 / T-6.1).
- Recommend updating `current-state.md` FAST PATH provider-exit line from
  "not yet final" to "final" (T-6.2, owner-approved doc task).
- The sibling legal-owner readiness track has its own closure dependency
  (out of scope here).

## 13.9 Rollout performance gates

Not applicable — no route, payload, latency, or bundle change. Closure has no
performance regression surface. (If a future task couples closure to a code
change, that task must define its own gates.)
