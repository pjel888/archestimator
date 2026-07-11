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

2. Treat a failed bootstrap as an automatic repair obligation, not a silent
   gap. A harness that cannot start local processes should inherit a fresh check
   from its orchestrator. If repair or inherited health is unavailable, continue
   in degraded-memory mode using current source and canonical `.ai` state; do
   not block the requested implementation unless Supermemory repair, indexing,
   or search is itself the core requested deliverable. Validate the normal contract with:

   ```sh
   bun run supermemory:ensure
   ```

   The configurator persists `SUPERMEMORY_SERVER_BIN` and
   `SUPERMEMORY_SERVER_SHA256` in a user-only file and shell startup block, but
   executes only the checksum-verified native binary. Provider credentials plus
   supported model/base-url and telemetry settings are parsed from
   `~/.supermemory/env` through an allowlist; that file is never
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

   `supermemory:add` does not treat an accepted or queued document as success.
   It waits for terminal indexing and confirms that the returned document id is
   discoverable through search. Failed or timed-out indexing is a truthful
   non-blocking memory-sync warning for unrelated core work: preserve the durable
   update in `.ai`, report the degraded capability, and complete the requested
   implementation. When successful Supermemory repair, indexing, or search is
   itself a core requested deliverable, the failure remains core evidence under
   the standard `TECH_BLOCKED` rule.

5. Never store secrets, env values, API keys, auth secrets, customer data,
   provider tokens, cookies, or raw local session details in Supermemory. Keep
   `.supermemory/` local-only and ignored; never commit its keys, runtime data,
   models, or vector store.

Trivial one-off work can limit this to the availability check. Unless
Supermemory itself is the core requested deliverable, a failed check triggers
bounded repair and then degraded-memory continuation rather than an
implementation blocker. When project reality changes, update canonical `.ai`
state and attempt Supermemory sync; `.ai` remains the repo source of truth.

## Loop Engineering Contract

Archestimator treats loop engineering as the product-development control system
for non-trivial work. A loop states the goal, splits work into bounded lanes when
useful, runs or delegates the lanes, observes evidence, persists state outside
chat when the work creates durable truth, decides the next action, and stops only
on a proven pass, explicit cancel, a true authorization boundary after every
safe in-scope action, or a technical impasse that makes a core requested
deliverable impossible after materially distinct recovery paths are exhausted.
Iteration budgets trigger replanning, not completion or a routine owner handoff.

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
  evidenced technical impasse makes a core requested deliverable impossible and
  has no remaining recovery/evidence path.

Do not vendor an external `CLAUDE.md`, Cursor rule, or skill as a parallel
authority for this repo. Tool-specific copies may exist only as thin adapters
that point back to `.ai/00_system` and preserve the same assumption, simplicity,
surgical-change, and goal-proof requirements.

## Shared Test Decision

All agents, roles, prompts, and adapters use the test gate in
`AGENT_OPERATING_PROTOCOL.md`, which is governed by the **User Test
Authorization Gate**: no agent may create, expand, repair, or run any automated
test, test suite, build-as-test-gate, browser automation, or broad validation
gate unless the user has explicitly requested testing for the current task.
This is the supreme rule and overrides every other consideration.

Verification is required; tests default to `NOT_REQUIRED` and use the cheapest
decisive non-test evidence. `TEST_TASK` is the only decision that authorizes
test execution, and it requires an explicit user request. `TARGETED` and
`BROADER` identify a critical invariant that would benefit from a test but
**authorize proposing it only, not running it** — record a `TEST_PROPOSAL`
(named risk + exact command) and await explicit user authorization. The
previous `CHEAPEST_DECISIVE_EXISTING_TEST` self-authorization exception is
withdrawn. High blast radius changes planning and review depth but does not
make tests automatic. Browser automation, builds, and full suites require the
same explicit user authorization.

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
  execution. Missing lanes or auxiliary tools are degraded capabilities, not
  implementation blockers. Mark `TECH_BLOCKED` only when a core requested
  deliverable remains impossible after materially distinct implementation
  fallbacks are exhausted.

When a lane is ambiguous, use the nearest approved fallback or lead execution
and document the substitution instead of blocking the requested implementation.

## Model And Effort Routing

The current frontier default is GPT-5.6 Sol (`gpt-5.6`). Use Sol for lead
judgment, architecture, security, ambiguous implementation, and final
verification. Use GPT-5.6 Terra (`gpt-5.6-terra`) for bounded read-heavy
exploration and official-source research where full capability matters but
frontier orchestration does not. Keep writer on Sol/high until representative
writer evaluations prove a lower-cost default preserves accuracy and
completeness. Spark is reserved for genuinely
latency-critical, text-only work with representative proof that its lower depth
is sufficient; it is not the default explorer merely because it is fast.

Choose reasoning effort separately from model tier and by measured task need,
not role prestige: `medium` is the balanced default, `low` fits bounded work,
`high`/`xhigh` fit difficult judgment, and `max` is reserved for the hardest
quality-first cases. Compare one level lower before retaining an expensive
override when representative evaluation exists. Do not use broad brevity or
low-verbosity instructions as a substitute for lower reasoning effort. Final
outputs preserve conclusion, evidence, material caveat, and next action before
trimming repetition.

Installed Codex role defaults live in
`.ai/12_agents/codex-role-model-matrix.json`; the adapter validator must reject
model, effort, posture, model-class, or routing-role drift. The lead may override
a default for measured task need without rewriting that installed role contract.
Worker lanes use the cheapest tier that reliably completes their bounded task.

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
- Keep native subagent depth at one unless a specific workflow proves recursive
  delegation is necessary. Treat six threads as a ceiling, not a target; three
  active lanes is the normal soft limit before coordination cost is reassessed.
- The lead owns scope, integration, validation, and final evidence.
- Write-capable agents need exact disjoint file scopes. Use the current checkout
  when the active user instruction says to stay on `main`, when the task is
  narrow, or when the lead keeps work local. Use branches/worktrees only when
  the lead explicitly chooses isolation or the risk/parallelism justifies it.
- Shared policy files are edited sequentially.
- Workers report blockers and recommended handoffs upward; they do not widen
  scope or re-plan the whole task.
- Workers return concise decisions and evidence pointers rather than raw result
  dumps. The lead reopens source artifacts only where integration or final proof
  requires it.
- Maker/checker separation is preferred for non-trivial implementation: use a
  different lane for review or final verification when practical; add
  adversarial QA only for an implicated critical claim or explicit request.
- Loop workflows must preserve state outside chat: `.ai`, `.omx`, issue
  trackers, or another approved durable surface.

## API Agent Runtime Controls

These controls apply to Responses API or Agents SDK runtimes, not directly to
Codex CLI configuration:

- Defer tool schemas and load the needed namespace on demand. Keep namespaces
  cohesive and below ten functions where practical; exposing fewer relevant
  tools is preferable to compressing every schema into the initial prompt.
- Use stable prompt prefixes and deliberate cache keys, and record cache-read,
  cache-write, latency, and token telemetry before claiming a cache win.
- Use native reasoning-context continuation and compaction according to the API
  contract. Preserve opaque compacted state and do not manually prune a chain
  continued through `previous_response_id`.
- Put validation, approval, and guardrails on every mutating tool boundary;
  delegation never expands authority.
- Bound turns, tool timeouts, polling, and cancellation. Limit exhaustion is a
  replan/block signal, never a success state.
- Evaluate traces while behavior is changing: grade tool selection, ordering,
  handoffs, routing, safety, unnecessary calls, and final evidence together.

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
