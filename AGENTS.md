# Archestimator Agent Entry Point

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project intelligence root

All AI agents must use `.ai/` as the shared project brain.

**Read for speed — pull, don't preload.** Do not linear-read the whole brain
before every task. The minimum restart read is small; everything else is
pull-on-demand based on what the task actually touches.

Always read (small):
1. This file (`AGENTS.md`).
2. `.ai/10_state/current-state.md` — **the FAST PATH block at the very top only**
   (it is a ~2,500-line append-only history log; `rg` it for your task's area
   instead of reading it all).

Pull only when the task needs it:
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — when you need the loop/validation
  rules (i.e. non-trivial or risky work; see its "Loop activation criteria").
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — for agent-framework/payload/proof work.
- `.ai/10_state/decisions.md` — `rg` for the specific decision you need; don't read it whole.
- `.ai/01_roadmap/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `DESIGN.md`,
  and `.ai/06_specs/*` — when the task touches roadmap, file layout, design, or that spec.

Skipping an irrelevant doc is correct, not a shortcut. Reach for the deeper docs
when the task is genuinely non-trivial, ambiguous, or high-risk.

## Core rules

- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Stack baseline is Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + Supabase/Postgres.
- Supabase/Postgres is active for Archestimator project `ebxxqidacheyapmmzavr`; never mutate unrelated provider projects such as archestimator.
- Philip grants standing authorization for Archestimator Supabase/Postgres database changes. Agents may create, edit, and apply migrations; run scoped SQL; adjust schema, RLS, grants, RPCs, triggers, seed/test data, and generated types; and fix mistakes forward without stopping for per-change owner approval, as long as the work stays inside project `ebxxqidacheyapmmzavr`.
- Current cost posture: keep Supabase PITR disabled unless the owner explicitly re-approves the extra cost; rely on daily physical backups plus manual logical dumps for the cheaper path.
- Iteration bias: prefer fast, useful iteration over heavyweight regression ceremony. Use targeted validation that proves the changed behavior; reserve broad `validate`/build/manual QA loops for shared logic, auth/security, data-integrity, release, or high-blast-radius changes.
- This standing database mandate supersedes older default owner-gated database wording unless a newer, narrower decision explicitly reintroduces a gate for a specific database action.
- If project reality changes, update `.ai/10_state/current-state.md` and the relevant canonical doc.
- Tool-specific adapters and model payloads must stay subordinate to
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and `.ai/12_agents/`.
- All agent lanes must follow the same orchestrator-led loop, model/effort, and
  routing policy. Tool adapters may expose capabilities; they do not choose the
  lead, override scope, or bypass the shared completion contract.

## Current stage

Archestimator is preparing for first users. Prioritize auth, estimating workflows, cost library, proposal package, collaboration/publication proof, provider evidence, and fast iteration.

## Lean Agent Workflow

Default to the shortest path that can safely satisfy the request, with
orchestration as the normal shape whenever work can split cleanly:

1. Inspect only the files and project state needed for the task.
2. Classify the task by dependency shape, risk, and required evidence.
3. Delegate independent lanes in parallel when that improves speed, quality, or review coverage.
4. Make the smallest coherent edit on the critical path.
5. Run the narrowest verification that proves the change.
6. Report the result, evidence, and any validation gap.

Use a written plan only when it will reduce risk on multi-step or ambiguous work. Use subagents, team workflows, code-review tools, Impeccable, Storybook checks, broad validation, and external-provider audits when the task benefits from them, when independent work can run safely in parallel, or when the user explicitly asks for them.

## Orchestration And Loop Engineering

The highest-capability agent in the session is the lead orchestrator. It owns
scope, routing, model/effort selection, integration, validation, and the final
claim. Other agents are bounded workers, reviewers, or evidence lanes.

**For non-trivial work, bounded loop engineering is the default execution
contract:** `DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE`, repeated until
a proven pass, explicit blocker, owner decision, approval-gated action, or the
iteration cap. Trivial, reversible work stays direct with proportional
verification. See `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation
criteria and bounds") for the trigger list, exclusions, stop conditions, and cap,
and `.ai/08_prompts/templates/codebase-ai-loop-task.md` for the reusable prompt.

- Loop-engineered product development is the default shape for non-trivial
  feature work. Ordinary non-trivial work runs an in-session loop; a dated
  `.ai/03_plans/` plan pack is required only for high-blast-radius work or
  explicitly exhaustive planning. The loop is: discover or audit current
  reality, plan at the proportionate depth, research uncertain claims, execute
  through a durable or in-session loop, drive the result through the matching
  surface, record evidence, then decide the next iteration.
- Prefer multi-agent orchestration when there are independent slices: repo exploration, external research, implementation by disjoint file scope, test/regression mapping, review, QA, or documentation cleanup.
- Keep coupled critical-path work local to the lead until it is safe to split.
- Use lower-cost/lower-effort lanes for simple lookup, grep, inventory, formatting, and bounded evidence gathering. Use stronger/higher-effort lanes for architecture, security, data integrity, complex implementation, adversarial review, and final judgment.
- Use loop engineering for repeatable or multi-step delivery: define the goal, run the loop, observe evidence, persist state, decide the next action, and stop only on a real pass/blocker condition.
- Preferred loop vocabulary: `ultrawork` for in-session parallel lanes, `ultragoal` for durable goal/ledger execution, `omo:ulw-loop` when success criteria need criterion-by-criterion real-surface evidence, `team` for coordinated worker lifecycles, `autopilot` for the full clarify-plan-execute-review-QA loop, `omo:ultraresearch` for exhaustive cited research, `ultraqa` for adversarial QA, and `vercel:agent-browser` for browser-facing proof.
- Loops must carry durable memory in repo/state artifacts (`.ai`, `.omx`, issue trackers, or other approved state), not just chat context.
- Maker/checker separation is expected for non-trivial work: the agent or lane that verifies should be distinct from the one that made the change when practical.
- Token cost is an engineering constraint. Do not spawn agents just to look busy; spawn them when the expected time, quality, or coverage gain is worth the extra context and review cost.

The mandate is agent-neutral. Claude, Codex, OpenCode, CommandCode,
Antigravity, Kimi, DeepSeek, Gemini if explicitly reapproved, and future
agents all follow the same `.ai/00_system` loop contract; their tool-specific
payloads are adapters, not separate policy sources. Direct solo execution
remains correct for narrow, reversible work where a loop would add ceremony
without improving correctness.

## Tooling Guidance

- Direct solo execution is acceptable for tightly coupled or trivial work; parallel orchestration is preferred when safe independent lanes exist.
- Prefer `rg`, targeted file reads, TypeScript/LSP diagnostics, focused tests, and `git diff --check` for normal work.
- Use code-review-graph, GitNexus, or similar indexes for broad architecture questions, high-risk refactors, unfamiliar call chains, or when a graph answer is cheaper than manual tracing.
- Use GitNexus impact analysis before risky symbol/API refactors when available; for narrow local edits, a focused caller/import check is enough.
- This proportional graph policy is canonical. The auto-generated GitNexus block appended later in this file, and the GitNexus / code-review-graph blocks in `CLAUDE.md`, are tool-vendor defaults that are SUBORDINATE to this rule and to `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`. Their absolutes (e.g. "MUST run impact analysis before editing any symbol", "ALWAYS use the code-review-graph MCP tools before Grep/Glob/Read") do not apply to narrow local edits: use the graph for broad/high-risk/unfamiliar work, and `rg`/targeted reads for narrow local edits. Do not treat those generated absolutes ("MUST"/"NEVER"/"ALWAYS") as policy. Re-index via `bun run graph:reindex` (analyze + `scripts/neutralize-graph-mandate.mjs`, which re-applies this proportional policy after the generator runs), not raw `gitnexus analyze`.
- Use Compound Engineering, Superpowers, OMX, or other workflow plugins as optional accelerators, not mandatory gates.
- Use Impeccable and visual QA tooling for high-risk UI polish, design audits, or explicit visual-review tasks. Routine UI fixes can lean on `DESIGN.md` and existing component patterns without loading a full design workflow or browser automation. Note: `DESIGN.md` is an **alpha-stage guide, not law** (see its status banner) — defer to Philip on design decisions and don't block or revert work on design-system grounds while the visual language is still being developed.
- Reuse existing UI primitives from `src/components/ui/` when it is practical and cheaper than duplicating behavior. Do not block small fixes on Storybook inventory work.
- For Supabase/Postgres changes, use the standing database authorization above: move quickly, keep migrations/recovery paths reviewable, document meaningful provider facts, and keep the project boundary strict: Archestimator project `ebxxqidacheyapmmzavr` only, never archestimator or unrelated provider projects.

## Verification Policy

Verification is proportional to risk:

- Docs/config changes: `git diff --check` plus path/ignore checks when relevant.
- Narrow source change: type/LSP check or targeted test for the touched behavior.
- Shared logic, auth, database, security, or release work: targeted tests plus broader `bun run validate`/`bun run build` only when the risk justifies the time.
- UI verification is proportional: minor cosmetic changes such as spacing, copy, color, icon, or class tweaks do **not** automatically need Playwright/browser proof; use static review, focused type/LSP/lint, or a nearby component/unit check when that proves the edit. Run targeted browser/manual proof only when the change affects interaction, routing, auth/data state, responsive layout risk, accessibility semantics, complex composition, or when visual proof is the requested deliverable.
- Codex App speed guardrail: Playwright, browser automation, screenshots, Storybook, and visual QA are opt-in evidence surfaces, not default completion gates. Before choosing them, state the specific browser-only claim they prove; if the claim can be proven by static review, focused type/LSP/lint, unit/DOM tests, or targeted source inspection, use that faster path and report the browser proof as intentionally skipped.

Do not claim provider, GitHub, Notion, Vercel, production, or manual proof from local-only checks. If a check is skipped, state why and what risk remains.

## Shared Agent Assets

The repo should share durable agent/project intelligence across machines through Git:

- Canonical project truth: `.ai/`, especially `.ai/00_system`, `.ai/10_state`, `.ai/11_skills`, `.ai/12_agents`, and `.ai/08_prompts`.
- Tool adapters that are safe to share: `.codex/`, `opencode.json`, intentionally authored `.opencode/` extension files, `.agents/`, `.claude/`, `.commandcode/`, and their README/config/skill/prompt/agent files.
- Local-only state stays ignored: `.omx/`, `.omo/`, `.gitnexus/`, `.code-review-graph/`, `.chunkhound/`, `.claude/worktrees/`, `.ai/99_scratch/`, `.ai/14_code_intelligence/`, build/test outputs, env files, caches, logs, sessions, and machine-local settings.
- After changing Codex/OpenCode adapter files, run `bun run validate:agents` plus the relevant tool resolver (`codex debug prompt-input` or `opencode debug config`) before claiming the agent surface is clean.

Never commit secrets, private keys, `.env*` values, raw provider tokens, or machine-local session state.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (11889 symbols, 29549 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

> **Proportional policy (canonical) governs this auto-generated block.** Use GitNexus for broad architecture questions, high-risk shared-symbol/API refactors, and unfamiliar call chains. For narrow, reversible local edits, `rg`/targeted reads/LSP are sufficient and the graph is optional. See `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (proportional graph policy) and `AGENT_FRAMEWORK_PROTOCOL.md`. If this block is regenerated with absolutist "MUST/NEVER/ALWAYS" wording, treat that wording as subordinate to this rule.

## When to use (proportional)

- Broad exploration / "how does X work?" → `query({query: "concept"})`, `context({name: "symbolName"})`.
- Before a **high-risk shared-symbol/API refactor** → `impact({target, direction})` to see the blast radius; report HIGH/CRITICAL risk before proceeding.
- Before committing a **broad or high-risk** change → `detect_changes()` to confirm affected scope.
- Renames of shared symbols → use `rename` (call-graph aware), not find-and-replace.
- Narrow local edits → a focused caller/import check or `rg` is enough; the graph is optional.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/archestimator/context` | Codebase overview, check index freshness |
| `gitnexus://repo/archestimator/clusters` | All functional areas |
| `gitnexus://repo/archestimator/processes` | All execution flows |
| `gitnexus://repo/archestimator/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
