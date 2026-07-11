# Agent Framework Protocol

**Date:** 2026-07-11
**Status:** Active repo-local framework protocol.

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

<!-- supermemory-bootstrap: required -->

Supermemory local at `http://localhost:6767` is the shared cross-agent memory
layer for Codex, Claude Code, OpenCode, CommandCode, Antigravity, Kimi,
DeepSeek, Hermes if approved, Gemini if reapproved, Ollama-backed embedding
pipelines, Cursor, and future harnesses when their integration is configured.
It augments `.ai`; it never replaces current source, selected verification,
`.ai`, provider evidence, or the lead orchestrator's final judgment.

At the start of meaningful work, each coding agent or its orchestrator must:

1. Run the idempotent bootstrap before repo inspection, planning, or edits:

   ```sh
   bun run supermemory:ensure
   ```

   `supermemory:ensure` re-verifies the installed native server against the
   repo-pinned checksum, repairs the persistent path/hash config, starts the
   verified server when needed, and fails unless bounded loopback identity,
   `/v3/health`, and listener-process attestation all pass.
   `bun run supermemory:configure` is the machine setup/repair command; it also
   installs the `com.archestimator.supermemory` macOS LaunchAgent. The low-level
   `bun run supermemory:start` command is not the normal agent entrypoint.

2. Treat a failed bootstrap as a repair obligation, not a silent optional gap.
   A harness that cannot start local processes must receive a fresh successful
   check from its orchestrator before delegation; otherwise it fails closed with
   an explicit memory-unavailable blocker. Validate the full contract with:

   ```sh
   bun run supermemory:ensure
   ```

   The configurator persists `SUPERMEMORY_SERVER_BIN` and
   `SUPERMEMORY_SERVER_SHA256` in a user-only file and shell startup block, but
   executes only the checksum-verified native binary. Provider settings are
   parsed from `~/.supermemory/env` through an allowlist; that file is never
   sourced as executable shell input. Do not use `npm exec`, `npx`, `bunx`,
   `pnpm dlx`, the npm wrapper installer, or any unverified second-stage server.

3. Before broad, non-trivial, recovery, review, or handoff work, search
   Supermemory for relevant repo/task memory using the configured harness
   plugin, MCP server, SDK, or the local API reference at
   `http://localhost:6767/v4/reference`. Treat retrieved memory as advisory and
   stale until reconciled with current source, `.ai`, tests, logs, or provider
   evidence. Every shell-capable harness has the same fallback:

   ```sh
   bun run supermemory:search -- "<repo and task query>"
   ```

4. At closeout, add or update one concise sanitized memory when durable project truth
   changes: date, repo, task/result, decision, changed files/docs, validation
   evidence, proof boundary, and follow-up. Keep ephemeral chat out of durable
   memory. Shell-capable harnesses can write text directly or from a reviewed
   file; the CLI rejects common secret-like content:

   ```sh
   bun run supermemory:add -- "<sanitized durable memory>"
   bun run supermemory:add -- --file <reviewed-memory-file>
   ```

5. Never store secrets, env values, API keys, auth secrets, customer data,
   provider tokens, cookies, or raw local session details in Supermemory. Keep
   `.supermemory/` local-only and ignored; never commit its keys, runtime data,
   models, or vector store.

Trivial one-off work can limit this to the availability check, but a failed
check still requires repair or an explicit fail-closed blocker. When project
reality changes, update both the canonical `.ai` home and Supermemory; `.ai`
remains the repo source of truth.

## Loop Engineering Contract

Archestimator treats loop engineering as the product-development control system
for non-trivial work. A loop states the goal, splits work into bounded lanes when
useful, runs or delegates the lanes, observes evidence, persists state outside
chat when the work creates durable truth, decides the next action, and stops only
on a proven pass, explicit cancel, a true authorization boundary after every
safe in-scope action, or a technical impasse after materially distinct recovery
paths are exhausted. Iteration budgets trigger replanning, not completion or a
routine owner handoff.

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

Select one primary execution surface from task shape. `ultrawork`, `ultragoal`,
`omo:ulw-loop`, `autopilot`, `omo:ultraresearch`, `ultraqa`, and browser agents
are optional bounded helpers, not a mandatory chain. Use them only when their
extra context/tool cost produces measurable coordination or proof value. Direct
solo execution remains valid for narrow or tightly coupled work.

## Shared Behavioral Guardrails

All agents, payloads, skills, prompts, and harness adapters inherit the
Karpathy-inspired behavior overlay defined in
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`. The overlay adds four portable
quality controls to the framework:

- **Assumption ledger:** make material uncertainty explicit before the first
  edit, especially when multiple interpretations could change behavior,
  approval boundaries, data risk, or validation scope.
- **Simplicity budget:** prefer deletion, reuse, and the smallest coherent
  implementation over new layers. New abstractions must remove real complexity,
  reduce meaningful duplication, or match an established local pattern.
- **Diff traceability:** each edit should be attributable to the active goal or
  to cleanup made necessary by that edit. Adapters must not use a task as cover
  for unrelated comment churn, formatting churn, or opportunistic refactors.
- **Goal proof:** convert work into acceptance criteria and a validation gate,
  then stop only when evidence proves the full requested outcome, a true
  authorization boundary prevents the outer outcome after all safe work, or an
  evidenced technical impasse has no remaining recovery/evidence path.

Do not vendor an external `CLAUDE.md`, Cursor rule, or skill as a parallel
authority for this repo. Tool-specific copies may exist only as thin adapters
that point back to `.ai/00_system` and preserve the same assumption, simplicity,
surgical-change, and goal-proof requirements.

## Shared Test Decision

All agents, roles, prompts, and adapters use the test gate in
`AGENT_OPERATING_PROTOCOL.md`. Verification is required; tests default to
`NOT_REQUIRED`. `TARGETED`, `BROADER`, or `TEST_TASK` must name the explicit
testing request or MVP-critical invariant that cheaper evidence cannot prove.
High blast radius changes planning and review depth but does not make tests
automatic. Do not add or run a test merely because code changed, tests exist,
or a role traditionally writes tests. Browser automation, builds, and full
suites require the same explicit or integrated-critical justification.

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

Maker/checker: the lane that implements does not treat its own edits as final. Use a separate review
lane, fresh-context self-review, or a task-appropriate deterministic check before claiming done. Worker
success, one green check, or a completed iteration is not completion; the lead owns final integration
and evidence. Maker/checker separation is expected when risk, breadth, or user-visible impact justifies it.

Proof-boundary labels (use precisely; never call a local check provider/browser proof):
`local-only` · `provider-proven` · `browser-proven` · `manual-proof-pending` · `not-verified`. Match
the surface to the claim: code -> focused source/static/type/lint evidence plus selected tests only
when the test gate requires them; minor cosmetic UI edits -> static review or a relevant focused check; UI
interaction/routing/auth/data/responsive-layout/a11y/complex-composition claims → targeted
browser/manual/Playwright proof; Cloudflare D1/R2/DO/Queue/Email/Images → active migration/
binding/repository/emulator proof plus hosted provider evidence only when claimed;
provider claims → provider evidence; docs-only → path checks + `git diff --check`.

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
stop_condition=<achieved|auth-blocked|tech-blocked|cancelled>
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
| implementation | scoped source/tests/docs | lead high/standard; workers matched to slice complexity | test decision plus the cheapest decisive evidence; targeted/broad tests only when selected |
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
  safest compatible lower-scope lane, deterministic local fallback, or lead
  execution; mark `TECH_BLOCKED` only when no safe recovery path remains.

When a lane is ambiguous, choose the fail-closed status and document the
decision instead of silently activating the lane.

## Model And Effort Routing

The current frontier default is GPT-5.6. Choose model and reasoning effort by
measured task need, not role prestige: `medium` is the balanced default, `low`
fits latency-sensitive bounded work, and `high`/`xhigh` are reserved for cases
where representative evidence shows a quality gain. Compare one effort level
lower before retaining an expensive override. Worker lanes use the cheapest
model and effort tier that reliably completes their bounded task.

Default tiers:

- **Low:** file search, inventory, path checks, simple docs cleanup, status
  checks, and deterministic evidence gathering.
- **Standard:** ordinary implementation, task-selected checks, straightforward
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

- Use multi-agent orchestration only when concrete independent lanes materially
  improve quality, elapsed time, or coverage after coordination cost.
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
  different lane for review or final verification when practical; add
  adversarial QA only for an implicated critical claim or explicit request.
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
production deploys, and destructive external actions require exact current
authority unless covered by the repository's standing Cloudflare mandate.

That mandate authorizes work only inside resources bound in `wrangler.jsonc`:
Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Durable Object
`COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, and Images `IMAGES`.
Agents may create/edit/apply active D1 migrations in `./migrations/`, run scoped
SQL, change authorized schema/index/query/trigger/seed-test behavior, manage the
bound provider integrations, and repair mistakes forward without per-change
approval, using proportional validation and free-tier/bundled limits.

This does not authorize historical Supabase project `ebxxqidacheyapmmzavr`, the
unrelated `archestimator` provider project, other accounts/projects, unbound
resources, secret exposure, paid add-ons, production deploys not requested, or
irreversible destructive data loss without authorized recovery. It supersedes
older active Supabase/Postgres mutation authority.

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
