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

## Pre-launch MVP database mandate

Philip grants standing authorization for agents to make Archestimator
Supabase/Postgres changes during the pre-launch MVP. Within project
`ebxxqidacheyapmmzavr`, agents may create, edit, and apply migrations; run scoped
SQL; change schema, RLS, grants, RPCs, functions, triggers, seed/test data, and
generated types; and repair mistakes with follow-up migrations or patches
without asking for per-change approval.

Default posture: act, measure, and fix forward. The product has no external
users yet, so do not treat every database or provider-facing edit as a release
ceremony. Prefer the smallest evidence that proves the changed behavior: focused
SQL checks, targeted tests, type generation, advisory checks, or a narrow app
smoke. Use broad `bun run validate`, full builds, full regression suites, or
manual QA loops only when the change touches shared logic, auth/security, RLS,
data integrity, release readiness, or another high-blast-radius surface.

Standing authorization is not a license to cross hard boundaries. Never mutate
archestimator or unrelated provider projects; never store or expose secrets; never
enable paid add-ons such as PITR without explicit reapproval; never deploy to
production as part of database work unless the task asks for deploy; and never
perform irreversible destructive data loss without a clear recovery path and
explicit fresh instruction.

This mandate supersedes older default owner-gated database wording in archived
plans, run logs, or historical decisions unless a newer, narrower decision
explicitly reintroduces a gate for a specific database action.

Run a broader repo-truth pass when the task touches architecture, roadmap truth,
provider claims, release readiness, shared APIs, migrations, auth/security, or
ambiguous stale state. In those cases, inspect branch/status, relevant `.ai`
truth docs, package/runtime facts, and graph/index evidence when it is useful.

For agent-framework, payload, harness, multi-agent, evidence, provider-proof,
or run-log work, also follow `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

## Loop-engineered product development

The normal Archestimator product-development loop is proportional:

1. Discover and audit current reality from source, tests, provider boundaries,
   and current `.ai` truth.
2. Plan at the lightest depth that reduces risk: in-session for ordinary work,
   dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` plan pack for high-blast-radius or
   explicitly exhaustive work.
3. Research uncertain implementation, product, dependency, policy, or UX claims
   and store durable source-backed notes in `.ai/13_research/`.
4. Execute through the smallest loop surface that preserves quality.
5. Drive the result through its real matching surface: code tests, HTTP, browser,
   provider dashboard, CLI transcript, database diff, or manual proof packet.
6. Record what passed, what failed, cleanup receipts, and the next decision in
   `.ai`, `.omx`, `.omo`, an issue tracker, or another approved durable state.

### Loop activation criteria and bounds

MVP speed default: prefer the lightest path that proves the change. A **dated
`.ai/03_plans/` plan pack + `LOOP_LEDGER.md` is required only for HIGH-BLAST-RADIUS
work** — where a wrong move is expensive or hard to reverse: database/Supabase/RLS/RPC/
migration/generated-types; auth, invites, or publication/shared links; security; data
integrity; launch/release readiness; cross-cutting or codebase-wide refactors/audits;
architecture changes; agent-framework/prompt/payload/orchestration changes; or any work the
owner explicitly asks to be planned exhaustively. For these, plan thoroughly and verify hard.

Ordinary non-trivial work — a normal feature, a multi-file edit within one area, a
component/hook change, a focused performance fix, routine debugging — does **NOT** need a dated
plan pack. Run a lightweight in-session loop (discover the relevant files → make the smallest
coherent edit → verify with the narrowest evidence that proves it → report), and only escalate to
a full plan pack if the work turns out to touch a high-blast-radius surface above.

A loop/plan is NOT required at all for trivial work: typo fixes, narrow docs cleanup that does not
alter policy, simple lookups or explanations, one-line reversible local fixes, bounded formatting,
or direct answers with no repo mutation. Always verify proportionally and never claim completion
from intent — regardless of which path you took.

Loop shape (named): `DISCOVER current repo truth → PLAN in-session or in .ai/03_plans/<YYYY-MM-DD>-<slug>/ when required →
EXECUTE the next smallest coherent change → VERIFY with the narrowest evidence that proves the change
→ RECORD evidence, proof boundary, gaps, next decision → DECIDE iterate / stop / escalate`.

Stop only when one is true: (1) proven pass against acceptance criteria; (2) explicit blocker with
evidence; (3) owner decision required; (4) a destructive / paid / production / cross-provider action
needs fresh approval; (5) iteration cap reached with remaining risks recorded. Default cap 3–6
meaningful iterations unless the task sets its own. Never loop endlessly; never stop on a worker
self-report, a plan doc, or one green check unless the whole requested outcome is proven.

Proportionality: the loop increases speed, quality, and memory — it is not ceremony. Validation stays
proportional to risk (`VALIDATION_MATRIX.md`). Minor cosmetic UI edits such as spacing, copy, color,
icon, or class tweaks do not automatically require Playwright, browser automation, or visual QA; use
static review, focused type/LSP/lint, or a nearby component/unit check when that proves the edit.
Reserve targeted browser/manual proof for interaction changes, routing/auth/data behavior, responsive
layout risk, accessibility semantics, complex composition, explicit visual-proof requests, or higher
blast radius. Reserve broad `bun run validate`/build/E2E/Storybook/visual/provider proof and
multi-agent orchestration for blast radius that justifies them. Durable loop
artifacts (plan pack + `LOOP_LEDGER.md`) live in `.ai`, not chat — see `AGENT_FRAMEWORK_PROTOCOL.md`.
Reusable prompt: `.ai/08_prompts/templates/codebase-ai-loop-task.md`.

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
  claim depends on real web behavior. Do not use it just because a tiny cosmetic
  UI edit is technically user-visible.

A loop is complete only when the stop condition is proven by evidence outside
the chat. A green unit test, worker self-report, or plan document can support the
claim, but it does not replace matching real-surface proof when the behavior
actually depends on browser/runtime/provider behavior. Minor cosmetic UI edits
can be completed with proportional non-browser evidence when no interaction,
layout-risk, accessibility, routing, auth, data, or requested visual-proof claim
is being made.

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
Antigravity CLI (`agy`), Kimi, DeepSeek, Gemini if explicitly
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
- When the active user instruction says to stay on `main`, keep lanes on the
  current checkout or read-only unless the lead explicitly authorizes isolation.
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
- Ollama: not an approved agent LLM lane; locally listed chat models must not be used for planning, review, or implementation unless explicitly approved and documented. (ChunkHound — which used the nomic embedding model via Ollama — is DISABLED as of 2026-06-18: removed from `.mcp.json` because Ollama was down and its daemon spun in a failing retry loop with zero working semantic search. Use `rg` + code-review-graph instead. To re-enable: start Ollama, then re-add ChunkHound to `.mcp.json`.)
- Hermes: orchestration, memory, routing, task delegation across the AI bench, file/system operations, and final evidence verification

## Safety rules

- No secrets in `.ai`.
- No production deploys or destructive commands without explicit approval.
- Do not overwrite project decisions silently. Mark superseded decisions with dates.
- Factual claims about code, costs, regulations, labor, or materials require cited sources or local evidence.
- Respect explicit read-only/audit-only user scopes. If stale docs are found during an audit-only task, report the exact patch target instead of editing.
- For Next.js work, read the relevant local Next.js docs under `node_modules/next/dist/docs/` before changing framework APIs or route conventions.
- Use graph/GitNexus impact analysis for risky shared symbol/API refactors when available. For narrow local edits, focused caller/import checks are enough.
- Archestimator Supabase/Postgres changes are pre-authorized for project `ebxxqidacheyapmmzavr` under the pre-launch MVP database mandate; never touch archestimator or unrelated provider resources.
- AI capability is currently Ask-only unless Philip explicitly approves a wider slice. No Draft/Apply, write tools, retrieval/RAG, or stored conversation features may be added by implication.
- Tool-specific adapter files (`CLAUDE.md`, `GEMINI.md`, `opencode.json`,
  `.agents/`, `.claude/`, `.codex/`, intentionally authored `.opencode/`
  extension files, `.gemini/`, `.commandcode/`) must stay subordinate to
  `.ai/00_system` and `.ai/12_agents`. They may point to `.ai`; they must not
  fork policy. After Codex/OpenCode adapter changes, run
  `bun run validate:agents` plus the relevant installed resolver.

## UI implementation guidance

- Treat `DESIGN.md` as an **alpha-stage guide, not law** (see its status banner). Its defaults for app/workshop UI — compact SF Pro typography, 0 letter spacing, 3px radius, restrained colors, regular-outline icons — capture the current lean, not fixed requirements. The visual language is still being developed, so exploration is encouraged. **Defer to Philip on design decisions:** when he diverges from a rule, follow him — don't refuse, block, revert, or gate work on the design-system lint on design grounds.
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
