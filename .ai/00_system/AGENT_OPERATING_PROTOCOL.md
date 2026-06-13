# Agent Operating Protocol

## Goal

Make Archestimator fast and safe for AI-assisted work without turning every
task into a heavyweight workflow. For non-trivial product development, make the
repeatable work loop-engineered: the system should discover, plan, research,
execute, verify, remember, and choose the next step instead of relying on a
human to re-prompt every phase.

## Default workflow

Use the lightest path that can satisfy the request:

1. Identify the target result, obvious constraints, affected files, and stop condition.
2. Read only the relevant `.ai` docs and source files.
3. Edit directly when the task is clear and reversible.
4. Verify with the narrowest evidence that proves the change.
5. Update `.ai` state/docs only when a durable decision or project reality changes.

Run a broader repo-truth pass when the task touches architecture, roadmap truth,
provider claims, release readiness, shared APIs, migrations, auth/security, or
ambiguous stale state. In those cases, inspect branch/status, relevant `.ai`
truth docs, package/runtime facts, and graph/index evidence when it is useful.

For agent-framework, payload, harness, multi-agent, evidence, provider-proof,
or run-log work, also follow `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

## Loop-engineered product development

The normal Archestimator product-development loop is:

1. Discover and audit current reality from source, tests, provider boundaries,
   and current `.ai` truth.
2. Write or update a dated plan pack under `.ai/03_plans/<YYYY-MM-DD>-<slug>/`.
3. Research uncertain implementation, product, dependency, policy, or UX claims
   and store durable source-backed notes in `.ai/13_research/`.
4. Execute through the smallest loop surface that preserves quality.
5. Drive the result through its real matching surface: code tests, HTTP, browser,
   provider dashboard, CLI transcript, database diff, or manual proof packet.
6. Record what passed, what failed, cleanup receipts, and the next decision in
   `.ai`, `.omx`, `.omo`, an issue tracker, or another approved durable state.

Loop surface routing:

- Use direct execution for small, reversible, tightly coupled work.
- Use `ultrawork` for in-session parallel lanes with lightweight evidence.
- Use `ultragoal` when the work needs durable goal state, checkpoints, or resume
  across stories.
- Use `omo:ulw-loop` when success criteria need criterion-by-criterion real
  surface evidence and cleanup receipts.
- Use `autopilot` when the full clarify -> plan -> durable execution -> review
  -> adversarial QA lifecycle is desired.
- Use `omo:ultraresearch` when the research itself must be exhaustive,
  source-cited, and expansion-driven.
- Use `ultraqa` when user-facing, CLI/runtime, integration, or safety-sensitive
  behavior could otherwise report a false green.
- Use `vercel:agent-browser` or an equivalent browser-driving surface when the
  claim depends on real web behavior.

A loop is complete only when the stop condition is proven by evidence outside
the chat. A green unit test, worker self-report, or plan document can support the
claim, but it does not replace the matching real-surface proof when the behavior
is user-facing or provider-facing.

## Response economy overlay

Use response economy as an advisory execution habit, not as a separate workflow
or approval gate. Prefer targeted diffs over full rewrites, concise progress
updates over repeated narration, and compact final reports that name the result,
evidence, validation gaps, and changed files.

For broad or open-ended requests, scope the work before editing and surface
options only when the choice materially changes risk, cost, behavior, approval
boundaries, or implementation direction. Do not pause for option selection when
the task is clear, reversible, and already authorized by the active prompt.

Batch related safe edits when it reduces churn, but checkpoint verification
whenever risk, shared files, auth, data integrity, provider behavior, or UI
surface proof requires it.

This overlay never overrides autonomy, verification, provider approval gates,
agent-routing hierarchy, or current `.ai` source-of-truth rules.

## Advisor plan output

Advisor-style planning tools, including `shadcn/improve`, must write durable
Archestimator plans under `.ai/03_plans/<YYYY-MM-DD>-<topic-slug>/`. They must
not create root `plans/` or a parallel advisor backlog for this repo.

Improve is installed globally for this machine. Do not add a duplicate
repo-local `.agents/skills/improve/` copy unless the global skill cannot be
made to respect the repo policy. Improve-generated plans must use
`.ai/03_plans/README.md` as the plan-folder contract and update
`.ai/10_state/*` or the narrowest canonical `.ai` doc when plan work changes
project truth. If an external skill or tool says to use another folder, treat
that as an adapter default overridden by Archestimator's `.ai` source-of-truth
policy.

## Self-diagnostic trigger

If Philip says the agent is getting worse, confused, stale, not following instructions, or repeating mistakes, stop the normal workflow and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding. This is not optional cleanup; it is the recovery path for protecting project quality.

Minimum diagnostic actions:

1. Check `git status --short --branch` and the active branch.
2. Inspect modified files before editing them.
3. Reread the active source-of-truth chain listed in `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`.
4. State the current goal, non-goals, affected files, validation gate, and stop conditions internally.
5. Make the smallest corrective change and verify it.

## Multi-agent rule

Use the smallest number of agents that maximizes effective throughput. Solo
execution is acceptable for trivial or tightly coupled work. Multi-agent
orchestration is the norm when bounded, independent lanes can run in parallel
without creating integration risk.

The lead orchestrator owns the routing decision. It should normally be the
highest-capability active agent/model for the session. The lead decides:

- which work stays on the critical path;
- which lanes can run in parallel;
- which agent/tool owns each lane;
- the model/effort tier for each lane;
- when to use a loop workflow (`ultrawork`, `ultragoal`, `team`,
  `autopilot`, `ultraqa`, Browser/manual proof, or a direct local loop);
- when the extra token/context cost is not worth delegation.

The routing contract is agent-neutral. Claude, Codex, OpenCode, CommandCode,
Antigravity CLI (`agy`), Kimi, DeepSeek, Cursor, Gemini if explicitly
reapproved, Hermes if approved, and future agents all inherit the same loop
contract from `.ai/00_system`. Tool-specific payloads, prompts, skills, and
connectors may expose capabilities, but they do not choose the lead, override
scope, fork the mandate, or bypass the completion evidence contract.

Default routing posture:

- Low-effort/lower-cost lanes: simple lookup, grep, inventory, formatting,
  narrow docs checks, and bounded evidence collection.
- Standard lanes: ordinary implementation, regression mapping, focused tests,
  and straightforward refactors.
- High-effort/highest-model lanes: orchestration, architecture, security, data
  integrity, complex implementation, adversarial review, final quality calls,
  and any task where a wrong answer is expensive.

Loop engineering is preferred for repeatable, multi-step, or autonomous work:
define the goal, split the work, run independent lanes, observe evidence,
persist state, decide the next action, and stop only on a proven pass, explicit
blocker, or owner decision.

When using parallel agents:

- Keep read-only audit agents read-only.
- Give implementation agents disjoint write scopes.
- The lead agent owns integration, conflict checks, validation, and final evidence.
- Do not let a subagent revive stale routes, stale data assumptions, or superseded `.ai` plans without checking current-state first.
- Workers do not choose their own model tier, widen their own scope, or become
  the orchestrator unless the lead explicitly hands off that role.
- Fail closed when a requested lane is deprecated, unapproved, missing, or
  running in an incompatible workflow state; fall back to the nearest approved
  lane and record the reason.

Default roles:
- Claude: planning, architecture, critique, writing, strategy
- Codex: implementation, refactoring, tests, PR-ready diffs
- OpenCode: exploration, fallback planning/review, codebase traversal, flexible coding bench
- CommandCode: taste-aware implementation/review, project-convention checks, PR work, and plan-mode codebase review
- Antigravity CLI (`agy`): extra terminal-agent lane for independent planning, review, audit, implementation, and long-context checks when another agent should run in a separate terminal/task environment
- Gemini: phased out; do not route new work to Gemini unless Philip explicitly reapproves it for a specific task
- Kimi: frontend/product UI implementation and review, long-context synthesis, fallback planning/review, document analysis
- DeepSeek: debugging, logic review, second-opinion critique
- Ollama: not an approved agent LLM lane; only the nomic embedding model used by ChunkHound is approved for active use, and locally listed chat models must not be used for planning, review, or implementation unless explicitly approved and documented
- Hermes: orchestration, memory, routing, task delegation across the AI bench, file/system operations, and final evidence verification

## Safety rules

- No secrets in `.ai`.
- No production deploys or destructive commands without explicit approval.
- Do not overwrite project decisions silently. Mark superseded decisions with dates.
- Factual claims about code, costs, regulations, labor, or materials require cited sources or local evidence.
- Respect explicit read-only/audit-only user scopes. If stale docs are found during an audit-only task, report the exact patch target instead of editing.
- For Next.js work, read the relevant local Next.js docs under `node_modules/next/dist/docs/` before changing framework APIs or route conventions.
- Use graph/GitNexus impact analysis for risky shared symbol/API refactors when available. For narrow local edits, focused caller/import checks are enough.
- Archestimator Supabase/Postgres is active only for project `ebxxqidacheyapmmzavr`; never touch SlateCamp resources.
- AI capability is currently Ask-only unless Philip explicitly approves a wider slice. No Draft/Apply, write tools, retrieval/RAG, or stored conversation features may be added by implication.
- Tool-specific adapter files (`CLAUDE.md`, `GEMINI.md`, `.agents/`,
  `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.commandcode/`) must stay
  subordinate to `.ai/00_system` and `.ai/12_agents`. They may point to `.ai`;
  they must not fork policy.

## UI implementation guidance

- Follow `DESIGN.md` for app/workshop UI: compact SF Pro typography, 0 letter spacing, 3px radius, restrained colors, and regular-outline icons.
- Reuse existing `src/components/ui/` primitives when practical and cheaper than duplicating behavior.
- Create shared primitives when a repeated pattern is clearly emerging; do not block small fixes on component-library or Storybook work.
- Use Impeccable, design-system lint, Storybook, or visual QA when the task is primarily visual, high-risk, or explicitly asks for those gates.

## Completion discipline

- Do not promise future work when a tool can do it now.
- Do not claim completion from intent; claim completion only from evidence.
- If validation is skipped, say why and what risk remains.
- If a doc is stale and the current task allows editing, patch the canonical doc instead of compensating in chat.
- If a doc is stale and the current task is read-only, name the canonical doc and the exact stale claim in the final report.
- For multi-agent or looped work, completion requires lead-owned integration,
  worker/result reconciliation, validation evidence, and cleanup of temporary
  runtime state. Do not treat worker success, a loop iteration, or a green test
  as final until the lead verifies the whole requested outcome.
