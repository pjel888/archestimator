# Agent Framework Protocol

**Date:** 2026-06-04
**Status:** Phase 1A repo-local framework protocol.

## Purpose

This document makes the agent operating framework executable without turning
every tool into a separate source of truth. It applies to Codex, Claude,
OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, DeepSeek, Hermes if
approved, Gemini, Ollama, and any future agent or harness.

`.ai/00_system`, `.ai/12_agents`, `.ai/08_prompts`, `.ai/11_skills`, current
source files, tests, package scripts, and provider evidence remain the
authoritative surfaces. Tool-specific files are adapters only.

## Fast-Start Contract

All agent and tool adapters use the same startup rule: read `AGENTS.md`, then
the FAST PATH block at the top of `.ai/10_state/current-state.md`. Pull deeper
`.ai` docs only by task area, risk, or recovery need; use `rg` for
`.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` instead of
linear-reading those history files. Adapter payloads may add role-specific
deltas, but they must not expand the default startup chain.

## Supermemory Local Memory Contract

Supermemory local at `http://localhost:6767` is the shared cross-agent memory
layer for Codex, Claude Code, OpenCode, CommandCode, Antigravity, Kimi,
DeepSeek, Hermes if approved, Gemini if reapproved, Ollama-backed embedding
pipelines, Cursor, and future harnesses when their integration is configured.
It augments `.ai`; it never replaces current source, tests, `.ai`, provider
evidence, or the lead orchestrator's final verification.

At the start of meaningful work, each agent or adapter should:

1. Check availability:

   ```sh
   SUPERMEMORY_HEALTH_URL="${SUPERMEMORY_HEALTH_URL:-http://localhost:${SUPERMEMORY_PORT:-6767}/}"
   curl -fsS "$SUPERMEMORY_HEALTH_URL" >/dev/null
   ```

2. If the check fails and the harness can start local processes, start the
   local server in the background, then retry until the check passes:

   ```sh
   bun run supermemory:start
   ```

   This command fails synchronously unless `SUPERMEMORY_SERVER_BIN` points to
   an executable local `supermemory-server` binary,
   `SUPERMEMORY_SERVER_SHA256` matches that binary, and first-boot
   configuration is already non-interactive: either `~/.supermemory/env`
   exists or a supported provider env configuration is present. The launcher
   ignores generic `PORT`; set `SUPERMEMORY_PORT` to override the fixed
   `6767` default and use the matching `SUPERMEMORY_HEALTH_URL` if a harness
   needs an explicit probe URL. The launcher waits for that health URL and
   fails if the verified server exits before it becomes healthy. Logs go to
   `/tmp/supermemory-local.log`.

   The verified server binary path is mandatory: do not use `npm exec`, `npx`,
   `bunx`, `pnpm dlx`, the npm wrapper installer, or any command that can
   install or run an unpinned registry package or second-stage download. If the
   harness only has an installer flow, treat startup as unavailable until it
   provides a locally installed `supermemory-server` binary plus its expected
   SHA-256.
   Do not treat installer completion as a running memory layer; wait for the
   configured health check to pass before claiming Supermemory is available.

   If the harness cannot start it or the command fails, continue with an
   explicit `not-verified` memory gap instead of blocking safe local work.

3. Before broad, non-trivial, recovery, review, or handoff work, search
   Supermemory for relevant repo/task memory using the configured harness
   plugin, MCP server, SDK, or the local API reference at
   `http://localhost:6767/v4/reference`. Treat retrieved memory as advisory and
   stale until reconciled with current source, `.ai`, tests, logs, or provider
   evidence.

4. At closeout, add or update one concise memory when durable project truth
   changes: date, repo, task/result, decision, changed files/docs, validation
   evidence, proof boundary, and follow-up. Keep ephemeral chat out of durable
   memory.

5. Never store secrets, env values, API keys, auth secrets, customer data,
   provider tokens, cookies, or raw local session details in Supermemory. Keep
   `.supermemory/` local-only and ignored; never commit its keys, runtime data,
   models, or vector store.

Trivial one-off work can limit this to the availability check and a reported
gap if Supermemory is down. When project reality changes, update both the
canonical `.ai` home and Supermemory; `.ai` remains the repo source of truth.

## Loop Engineering Contract

Archestimator treats loop engineering as the product-development control system
for non-trivial work. A loop states the goal, splits work into bounded lanes when
useful, runs or delegates the lanes, observes evidence, persists state outside
chat when the work creates durable truth, decides the next action, and stops only
on a proven pass, explicit blocker, owner decision, approval-gated action, or
iteration cap.

The repo-local loop spine is:

- `.ai/03_plans/` for dated audit and implementation plan packs when the work is
  high-blast-radius or explicitly planned exhaustively.
- `.ai/13_research/` for source-backed research notes and research syntheses.
- `.ai/05_logs/` for run evidence, proof boundaries, and handoffs.
- `.omx/` or `.omo/` ledgers for runtime loop state when those tools are active.
- Issue trackers or provider dashboards only when explicitly authorized and
  linked back to repo truth.

This contract is agent-neutral. Codex, Claude, OpenCode, CommandCode,
Antigravity CLI (`agy`), Kimi, DeepSeek, Gemini if explicitly
reapproved, Hermes if approved, and future agents/harnesses use the same loop
spine and proof boundary. Tool-specific files are adapters: they may translate
commands, expose connector capabilities, or declare a default lane, but they
must not fork policy, bypass `.ai/00_system`, or claim completion without the
same evidence.

Use `ultrawork` for parallelism, `ultragoal` for durable goal execution,
`omo:ulw-loop` for criterion-led real-surface proof, `autopilot` for the full
clarify-plan-execute-review-QA lifecycle, `omo:ultraresearch` for exhaustive
research, `ultraqa` for adversarial behavior proof, and `vercel:agent-browser`
for browser-facing proof. Direct solo execution remains valid for narrow work
where a loop would add ceremony without improving correctness.

## Durable Loop Artifacts And Loop Ledger

High-blast-radius, multi-agent, provider/release, agent-framework, security,
database/auth/data-integrity, broad refactor, or explicitly exhaustive
implementation work persists loop state in `.ai`, never in chat:

- Plan pack: `.ai/03_plans/<YYYY-MM-DD>-<task-slug>/` with a `LOOP_LEDGER.md`.
- Run log (major / risky / multi-agent / provider / release / database / security / agent-framework
  work): `.ai/05_logs/<YYYY-MM-DD>-<task-slug>-implementation-run.md`.
- Research note (uncertain external / technical / dependency / pricing / regulation / cost / code /
  labor / materials claims): `.ai/13_research/<YYYY-MM-DD>-<topic>.md`, source-dated.

`LOOP_LEDGER.md` is the control surface; update it DURING the work, not at the end. Minimum sections:

```md
# Loop Ledger
## Goal
## Scope
## Non-goals
## Branch / Status
## Source of Truth Read
## Acceptance Criteria
## Validation Plan
## Iteration Log
### Iteration N
- Hypothesis:
- Action:
- Files changed:
- Evidence:
- Result:
- Next decision:
## Stop Condition
## Proof Boundary
## Remaining Risks
## Follow-up Bugs / Plans
```

Maker/checker: the lane that implements does not treat its own edits as final — use a separate review
lane, adversarial self-review, targeted test, or graph/impact check before claiming done. Worker
success, one green check, or a completed iteration is not completion; the lead owns final integration
and evidence. Maker/checker separation is expected when risk, breadth, or user-visible impact justifies it.

Proof-boundary labels (use precisely; never call a local check provider/browser proof):
`local-only` · `provider-proven` · `browser-proven` · `manual-proof-pending` · `not-verified`. Match
the surface to the claim: code → focused tests/type/lint/build-when-justified; minor cosmetic UI
edits → static review, focused type/LSP/lint, or nearby component/unit checks when adequate; UI
interaction/routing/auth/data/responsive-layout/a11y/complex-composition claims → targeted
browser/manual/Playwright proof; Supabase/Postgres → migration status + SQL/RPC/RLS proof +
generated types; provider claims → provider evidence; docs-only → path checks + `git diff --check`.

## Agent Receipt

Use this internal receipt for broad, risky, provider-facing, or durable
evidence-producing work:

```txt
AGENT_RECEIPT:
mode=<plan-only|read-only|implementation|review|debug|release|provider-proof|recovery>
scope=<files/features/providers in scope>
non_goals=<explicitly out of scope>
writes=<allowed write folders or none>
validation=<commands/checks/manual proof required>
proof_boundary=<local-only|provider-proven|browser-proven|manual-proof-pending|not-verified>
stop_condition=<done/blocker/owner-decision/destructive-approval>
orchestrator=<lead agent/tool owning scope, routing, integration, final claim>
loop_phase=<none|plan|execute|review|qa|cleanup|complete>
lead_lane=<agent/tool lane and model/effort tier>
worker_lanes=<parallel lanes with agent/tool, model/effort tier, scope>
loop_memory=<.ai plan/research/log path plus .omx/.omo/issue ledger paths>
research_boundary=<none|local-only|external-cited|ultraresearch>
manual_qa_channel=<none|http|browser|tmux|computer-use|provider|db|cli>
```

The receipt is optional for small fixes. It is a discipline aid, not a new chat
ritual. Record it in run logs only when the run produces durable `.ai`
evidence.

## Proportional Preflight

Before editing files, verify only the context needed for the risk level.

For small local work, a focused file read plus `git status --short --branch` is
usually enough. Add deeper checks when they materially affect correctness:

1. Current path, git root, branch, status, worktrees, remotes, and recent log.
2. Relevant `.ai` source-of-truth chain from `DOCS_SOURCE_OF_TRUTH.md`.
3. Current package/runtime facts from `package.json` when stack facts matter.
4. Code-review-graph or GitNexus evidence for broad exploration, high-risk
   shared APIs, symbol refactors, or unfamiliar call chains when available.
5. Dirty files and ownership boundaries. Unrelated dirty files must not be
   overwritten, staged, or reformatted.
6. Provider, GitHub, Notion, legal, support, and launch claims backed by actual
   provider/manual evidence, not plan text.

## Modes

| Mode | Writes | Effort posture | Required proof |
|---|---:|---|---|
| plan-only | `.ai/03_plans`, related `.ai` state/log/task docs | lead high for strategy/architecture; lower lanes for lookup | path checks, graph/repo-truth where relevant, `git diff --check` |
| read-only | none | lower lanes for inventory; high lanes for risk judgment | command/source citations and no writes |
| implementation | scoped source/tests/docs | lead high/standard; workers matched to slice complexity | focused source checks and targeted tests; broader `bun run validate`/`bun run build` only when meaningful |
| review | none unless explicitly assigned | independent reviewer at standard/high; final call by lead | findings with severity and file references |
| debug | usually none until root cause known | high for root cause; lower lanes for reproduction inventory | reproduction or documented blocker |
| release/provider-proof | evidence docs only unless action approved | high lead, cautious provider lanes | local/provider/manual proof separated |
| recovery | smallest corrective docs/source change | high lead until state is coherent | self-diagnostic chain and validation |

## Agent Status Rules

- Approved agents may work in their payload lanes.
- Conditional agents require an explicit task fit and isolated write scope.
- Deprecated agents fail closed unless Philip explicitly reapproves them.
- Unapproved agents do not receive work.
- Non-agent tools may be used only for their approved non-agent function.
- The lead orchestrator assigns model/effort and loop role. Payload files may
  declare defaults and constraints, but they do not override the lead or the
  canonical framework protocol.
- Missing model/effort/routing metadata is not permission to improvise. Use the
  safest lower-scope lane or fail closed with a short blocker.

When a lane is ambiguous, choose the fail-closed status and document the
decision instead of silently activating the lane.

## Model And Effort Routing

The lead orchestrator should reserve the highest-capability model/reasoning for
planning the work, assigning lanes, integrating results, resolving conflicts,
and making final quality calls. Worker lanes should use the cheapest model and
effort tier that can reliably complete their bounded task.

Default tiers:

- **Low:** file search, inventory, path checks, simple docs cleanup, status
  checks, and deterministic evidence gathering.
- **Standard:** ordinary implementation, focused tests, straightforward
  refactors, and normal review.
- **High:** architecture, security, data integrity, auth, migrations,
  multi-surface behavior, ambiguous debugging, adversarial review, and release
  or provider-proof decisions.
- **Highest:** lead orchestration for broad or risky work, final blocker
  arbitration, and cases where a wrong decision would create expensive rework.

Escalate or de-escalate after observing results. A lower-tier lane that reports
uncertainty should hand back to the lead instead of stretching beyond its
assignment.

## Multi-Agent Rules

- Use multi-agent orchestration whenever independent lanes materially improve
  quality, speed, or coverage.
- Use the smallest lane set that captures that benefit.
- The lead owns scope, integration, validation, and final evidence.
- Write-capable agents need exact disjoint file scopes. Use the current checkout
  when the active user instruction says to stay on `main`, when the task is
  narrow, or when the lead keeps work local. Use branches/worktrees only when
  the lead explicitly chooses isolation or the risk/parallelism justifies it.
- Shared policy files are edited sequentially.
- Workers report blockers and recommended handoffs upward; they do not widen
  scope or re-plan the whole task.
- Maker/checker separation is preferred for non-trivial implementation: use a
  different lane for review, adversarial QA, or final verification when
  practical.
- Loop workflows must preserve state outside chat: `.ai`, `.omx`, issue
  trackers, or another approved durable surface.

## Evidence And Run Logs

Major framework, release, provider-proof, or multi-agent work should create or update a run log under
`.ai/05_logs/YYYY-MM-DD-<task-slug>-<mode>-run.md` with:

- goal, mode, branch, commit, and dirty status before/after;
- orchestrator, loop phase, iteration number, and stop condition;
- routing decisions, including lane owner, model/effort tier, and why parallel
  work was or was not used;
- source-of-truth docs read;
- graph/GitNexus/tool evidence when used;
- commands with exit codes and key output;
- files changed;
- validation result;
- lead integration/validation outcome after worker results are reconciled;
- provider/manual proof boundary;
- bug plans created;
- final status and remaining risks.

Use `local-only`, `provider-proven`, `browser-proven`, `manual-proof-pending`, and
`not-verified` labels precisely. Never call a local check provider or browser proof.

## Provider, GitHub, Notion, And Secrets

Provider, GitHub settings, Notion mutation, branch protection, paid add-ons,
and destructive external actions are approval-gated unless Philip explicitly
authorized the exact action in the active task and the action is not paid.

Exception: Archestimator Supabase/Postgres database work in project
`ebxxqidacheyapmmzavr` has standing pre-launch MVP authorization. Agents may run
scoped SQL, create/apply migrations, change schema/RLS/grants/RPCs/functions,
repair database mistakes forward, seed or adjust test data, and regenerate
types without asking for per-change approval. Because there are no external
users yet, the preferred posture is fast iteration with proportional validation,
not exhaustive regression by default.

This exception does not authorize unrelated provider projects, archestimator
resources, secrets exposure, paid add-ons, hosting production deploys,
GitHub/Notion mutations, or irreversible destructive data loss without explicit
fresh instruction and a recovery plan. It supersedes older default owner-gated
database wording unless a newer, narrower decision explicitly reintroduces a
gate for a specific database action.

Secrets must not be printed, committed, copied into `.ai`, pasted into run
logs, or placed in prompt templates. Evidence files may record variable names,
hashes, IDs, statuses, and sanitized metadata only.

## Bug Protocol

Create a dated bug plan in `.ai/15_Bugs` for material blockers, stale
source-of-truth claims, validation failures, provider proof gaps, merge
conflicts, or security concerns that cannot be resolved inside the same scoped
change. Do not create bug plans for transient tool noise that has an obvious
local workaround.

The bug plan must include classification, evidence, impact, blocking status,
proposed fix, verification plan, and a link back to the active plan/run.

## Adoption Boundary

This protocol is Phase 1A repo-local framework implementation. It does not by
itself enforce GitHub rulesets, CI blocking checks, provider readiness, Notion
truth, or closed-beta readiness. Global enforcement requires dry-run evidence,
green advisory checks, and explicit approval.
