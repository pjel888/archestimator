# ArchEstimator Codebase AI Loop Prompt

Use this prompt in a codebase-aware AI inside the `pjel888/archestimator` repo. Paste the whole prompt. Replace bracketed fields only when you have a specific target.

---

## Copy/paste prompt

You are the **lead codebase AI orchestrator** for the ArchEstimator repo. Your job is to analyze and improve the repo’s **coding-agent mandate, loop-engineering contract, agent routing, evidence policy, and workflow documentation** so AI-assisted development becomes more effective, efficient, and fast without making the process bloated or unsafe.

This is not a one-pass summary task. You must run a bounded loop, persist state in the repo, audit current reality, identify drift, patch the canonical docs/adapters where appropriate, verify the result, and stop only when the acceptance criteria are proven or when a real blocker is documented.

### Target repo

- Repo: `pjel888/archestimator`
- Default branch: `main`
- Primary project intelligence root: `.ai/`
- Current stack baseline to verify from live files before relying on it: Next.js 16 App Router, React 19, Bun, TypeScript strict, Tailwind CSS v4, Supabase/Postgres, TanStack Query, Zustand, Vitest, Bun test, Playwright, Storybook review surface.

### Mission

Audit and optimize the complete coding-agent operating system for ArchEstimator:

1. The top-level agent entrypoints and tool adapters.
2. `.ai/00_system` governance docs.
3. `.ai/10_state` current state and decisions.
4. `.ai/12_agents` agent role contracts and payloads.
5. `.ai/08_prompts` reusable prompt templates.
6. `.ai/11_skills` reusable playbooks.
7. Supermemory local memory workflow across Codex, OpenCode, Claude Code, and
   every available agent adapter.
8. The loop-engineering mandate and archived mandate pack.
9. Validation, evidence, provider-proof, design-system, database, and stop-condition rules.

Your end state is a clearer, leaner, faster, more enforceable agent workflow where every coding AI can answer these questions without guessing:

- What is the current source of truth?
- What must be read first?
- When should the agent work directly versus loop?
- When should it split into subagents or lanes?
- Where does state/memory/evidence go?
- How does local Supermemory get checked, started, searched, and updated?
- What validation proves completion?
- What is forbidden without explicit owner approval?
- How does the agent recover when it becomes stale, confused, or starts repeating mistakes?

---

## Hard rules

### Do not drift from repo authority

Before making claims or edits, read and reconcile these files in this order:

1. `git status --short --branch`
2. `AGENTS.md`
3. `.ai/README.md`
4. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
5. `.ai/00_system/ai-folder-canonical-map.md`
6. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
7. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
8. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
9. `.ai/00_system/VALIDATION_MATRIX.md`
10. `.ai/10_state/current-state.md`
11. `.ai/10_state/decisions.md`
12. `.ai/10_state/known-issues.md`
13. `.ai/12_agents/README.md`
14. `.ai/12_agents/payloads/_template.md`, if present
15. `DESIGN.md`
16. `README.md`
17. `package.json`
18. `.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`
19. `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/README.md`
20. `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/IMPLEMENTATION_HANDOFF_PROMPT.md`

Then inventory every existing agent/tool adapter file you can find, including but not limited to:

- `CODEX.md`
- `CLAUDE.md`
- `GEMINI.md`, if present
- `.codex/**`
- `.claude/**`
- `.agents/**`
- `.commandcode/**`
- `opencode.json`, if present
- intentionally authored `.opencode/**` extension files, if present
- `.gemini/**`, if present
- `.cursor/**`, if present
- any README, prompt, skill, payload, hook, or config file that tells an AI agent how to work in this repo.

If files are missing, record that clearly. Do not invent their contents.

### Integrate Supermemory without making it authority

Supermemory local at `http://localhost:6767` is the shared cross-agent memory
layer for Codex, OpenCode, Claude Code, CommandCode, Antigravity, Kimi,
DeepSeek, Hermes if approved, Gemini if reapproved, Ollama-backed embedding
pipelines, Cursor, and future harnesses when configured. It augments `.ai`; it
does not override current source, tests, `.ai`, provider evidence, or the lead
orchestrator's final verification.

For this audit and every future codebase-AI workflow:

1. Check it before meaningful work:

   ```sh
   curl -fsS http://localhost:6767/ >/dev/null
   ```

2. If it is down and local process startup is available, start it in the
   background and retry until the check passes:

   ```sh
   bun run supermemory:start
   ```

   Do not use `npm exec`, `npx`, `bunx`, `pnpm dlx`, the npm wrapper installer,
   or any startup command that can install or run an unpinned registry package
   or unverified second-stage server download.

3. Search Supermemory for relevant repo/task memory before broad, non-trivial,
   recovery, review, or handoff work. Use the configured harness plugin, MCP,
   SDK, or local API reference at `http://localhost:6767/v4/reference`.
4. Treat retrieved memories as advisory and stale until verified against current
   repo evidence.
5. At closeout, add or update one concise memory when durable project truth
   changes: date, repo, task/result, decision, changed files/docs, validation
   evidence, proof boundary, and follow-up.
6. Never store secrets, env values, API keys, auth secrets, provider tokens,
   cookies, customer data, or raw local session details. Do not read, copy, or
   commit `.supermemory/`; it is local runtime state only.

### Use current source over stale memory

If docs disagree, use this order:

1. Current source files, migrations, tests, package scripts, and provider evidence for implementation facts.
2. `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` for current project truth.
3. `.ai/00_system/*` for governance and agent behavior.
4. Active `.ai/03_plans/*` packs for scoped implementation plans.
5. Archived `.ai/09_archive/store/*` only as history unless current-state explicitly reactivates the archived work.

Do not create a new parallel instruction system. Patch the canonical home.

### Keep the task docs/governance scoped

Allowed writes by default:

- `.ai/03_plans/<YYYY-MM-DD>-agent-mandate-workflow-optimization/`
- `.ai/05_logs/`
- `.ai/08_prompts/`
- `.ai/11_skills/`
- `.ai/12_agents/`
- `.ai/00_system/` only when the canonical system contract truly needs improvement.
- Top-level thin adapter docs such as `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, or equivalent only when they are stale, contradictory, or too thick.

Disallowed writes unless the active user explicitly upgrades scope:

- Production source code under `src/`
- Database migrations
- Supabase provider mutations
- GitHub settings
- Vercel settings
- Notion mutations
- Package/dependency changes
- Secrets, `.env*`, credentials, tokens, local session files
- Production deploys
- Destructive commands

The pre-launch ArchEstimator database autonomy mandate exists, but this task is about the agent/workflow contract. Do not use the database mandate as permission to mutate the database during this audit.

---

## Mandatory loop structure

You must run this as a bounded **repo-persisted loop**, not as a single answer.

Create or update this plan pack:

```txt
.ai/03_plans/<YYYY-MM-DD>-Agent-Mandate-And-Workflow-Optimization/
```

Inside it, create these files before or during the loop:

```txt
00-README.md
01-source-of-truth-inventory.md
02-agent-contract-audit.md
03-drift-conflict-register.md
04-loop-surface-map.md
05-workflow-friction-analysis.md
06-recommended-contract-patches.md
07-validation-and-evidence-plan.md
08-final-implementation-report.md
LOOP_LEDGER.md
```

If a file already exists, update it instead of duplicating it.

### Loop ledger format

`LOOP_LEDGER.md` is the control surface. It must survive compaction, restarts, tool failure, and agent handoff.

Use this structure:

```md
# Agent Mandate And Workflow Optimization Loop Ledger

Date: <YYYY-MM-DD>
Branch: <branch>
Mode: docs/governance implementation
Lead: <agent/tool/model if known>
Stop condition: all acceptance criteria checked or explicit blocker recorded

## Global constraints
- No secrets.
- No production deploys.
- No provider/GitHub/Notion mutations.
- No source-code/package/database changes unless explicitly authorized.
- Canonical `.ai` docs win over tool-specific adapters.

## Acceptance criteria
- [ ] Current source-of-truth chain audited and documented.
- [ ] All reachable agent/tool adapter docs inventoried.
- [ ] Stale or contradictory agent instructions identified with evidence.
- [ ] Canonical docs patched or patch recommendations written.
- [ ] Tool-specific adapters made thin or flagged for cleanup.
- [ ] Loop-engineering contract made practical, not ceremonial.
- [ ] Routing rules clarified: solo vs subagent vs durable loop vs browser/provider proof.
- [ ] Validation gates clarified by risk level.
- [ ] Evidence/run-log rules clarified without bloating small tasks.
- [ ] Recovery/self-diagnostic trigger remains enforceable.
- [ ] Docs-only validation completed.
- [ ] Final report names changed files, evidence, remaining risks, and next action.

## Iterations

### Iteration 1 — <title>
- Goal:
- Files read:
- Findings:
- Changes made:
- Validation:
- Remaining gap:
- Next iteration:

### Iteration 2 — <title>
...
```

### Loop execution rule

Run at least **three meaningful iterations** unless a true blocker prevents progress. Do not stop after inventory.

Each iteration must follow this cycle:

1. Read `LOOP_LEDGER.md` and the current diff.
2. Pick the highest-leverage unchecked acceptance criterion.
3. Read only the files needed for that criterion.
4. Compare repo reality against the existing mandate.
5. Patch the canonical doc or record an explicit no-patch decision.
6. Run the narrowest validation that proves the iteration.
7. Update `LOOP_LEDGER.md` with evidence and next action.
8. Decide whether to continue, escalate, or stop.

Hard cap: **7 iterations**. If not complete by iteration 7, stop and create a precise continuation handoff in `08-final-implementation-report.md`.

Stop only when one of these is true:

- All acceptance criteria are checked and validation evidence exists.
- A blocker requires owner judgment, missing credentials, missing tool access, or destructive authority.
- The iteration cap is reached and the remaining work is captured with exact next steps.

A worker or subagent saying “done” is not a stop condition. The lead must reconcile results, inspect the diff, and verify evidence.

---

## Required audit dimensions

### 1. Source-of-truth clarity

Find every place that claims to define how AI agents should work. Classify each as one of:

- canonical authority
- thin adapter to canonical authority
- stale/contradictory instruction
- historical/archive-only instruction
- local-only runtime state
- missing but expected adapter

Output the inventory in `01-source-of-truth-inventory.md`.

Look especially for:

- duplicate reading orders
- duplicate agent rosters
- stale stack descriptions
- conflicts between `AGENTS.md`, `.ai/00_system`, `.ai/12_agents`, and top-level tool docs
- adapter files that contain long policy instead of pointing back to `.ai`
- archived plans accidentally treated as active instructions
- tool-specific rules that override the shared loop contract

Known seed check to verify, not assume: inspect whether `CODEX.md` still describes a local-first JSON / future Supabase migration baseline. If that claim is stale compared with current `README.md`, `.ai/README.md`, and `.ai/10_state/current-state.md`, classify it as drift and patch or recommend a patch.

### 2. Loop-engineering practicality

Do not merely say “use loops.” Make the loop usable.

Audit whether the repo tells agents:

- when direct execution is enough
- when a plan pack is required
- when research belongs in `.ai/13_research`
- when to use subagents or parallel lanes
- when durable goal state is needed
- when maker/checker separation is required
- when browser/manual/provider proof is required
- where to write evidence
- how to avoid infinite loops
- how to stop when blocked

Output the result in `04-loop-surface-map.md`.

The final contract must distinguish:

```txt
small reversible fix -> direct local loop
multi-file implementation -> plan pack + focused execution loop
independent slices -> parallel lanes / subagents / worktrees
high-risk shared APIs -> graph/impact analysis + maker/checker
UI behavior -> browser or visual proof when user-visible
provider/database/security -> provider-proof boundary + targeted checks
research-heavy claims -> dated `.ai/13_research` note
agent drift or confusion -> self-diagnostic recovery loop
```

### 3. Speed and efficiency

The goal is faster execution, not more ceremony.

Audit the workflow for unnecessary drag:

- too many mandatory broad reads
- duplicated policy across adapter files
- overuse of full `bun run validate`
- missing guidance for focused tests
- unclear model/effort routing
- unclear graph/index usage
- no guidance for cheap read-only lanes
- repeated plan formats that could be templated
- evidence logs that are too heavy for small tasks

Output the friction analysis in `05-workflow-friction-analysis.md`.

Recommend changes that reduce cognitive load, token usage, and validation time while preserving safety.

### 4. Agent routing and model effort

Audit the active agent roster and routing rules.

Make sure the contract clearly says:

- the highest-capability active agent is the lead orchestrator for non-trivial work
- Codex is the default implementation/test/diff lane
- Claude is planning/architecture/review unless explicitly assigned implementation
- Kimi is UI/product/frontend review when appropriate
- DeepSeek is debugging/logic critique by default
- Antigravity CLI is an isolated terminal lane when approved
- deprecated/unapproved agents fail closed
- local embedding models are not chat/coding agents unless explicitly approved
- worker lanes do not widen scope or override `.ai/00_system`
- write-capable workers need disjoint file scopes or isolated worktrees

Patch only the canonical roster or thin adapters as needed. Do not spread the same roster across many files unless each copy points to the canonical source.

### 5. Evidence and validation

Audit whether the validation policy is easy to apply.

The final docs should make these distinctions explicit:

- docs-only: path checks + `git diff --check`
- narrow code change: focused type/test/lint/LSP check
- shared logic: targeted tests plus broader checks if risk justifies
- UI behavior: focused component/DOM/browser/visual proof depending on claim
- design-system changes: design-system lint and relevant visual checks
- auth/security/RLS/database: targeted tests + provider/local proof boundary
- release/provider claim: provider/manual evidence, not local-only claims
- skipped validation: state why and what risk remains

Do not claim provider, browser, or manual proof from local docs-only checks.

### 6. Recovery and anti-drift

Make the recovery loop explicit and hard to ignore.

Audit whether every agent entrypoint eventually points to:

- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`

If Philip says the agent is stale, confused, worse, not following instructions, or repeating mistakes, the agent must stop normal work and run the self-diagnostic protocol before continuing.

### 7. Design-system respect for workflow docs

Do not change product UI in this task. But the workflow contract must preserve the product design rules for future agents:

- app/workshop UI uses compact SF Pro system
- non-landing font size maximum is 12px
- regular/medium weights only
- xs/3px radius only
- zero tracking
- restrained neutral palette
- shared UI primitives first
- app UI must not duplicate feature-local buttons, search inputs, dropdowns, icon buttons, cards, chips, tabs, filters, fields, toolbars, panels, empty states, or inspector patterns when shared primitives exist

If workflow docs mention UI validation, ensure they point to `DESIGN.md` and `.ai/00_system/VALIDATION_MATRIX.md` rather than duplicating long design rules everywhere.

---

## Patch strategy

Prefer fewer, stronger canonical docs over many duplicated instructions.

When you find drift:

1. Patch the canonical home if the canonical home is stale.
2. Patch the adapter if the adapter is stale.
3. Replace thick adapter policy with a short pointer to `.ai` when possible.
4. Add a one-line cross-link instead of copying a whole policy block.
5. If a change could affect many agents, update `.ai/00_system` and `.ai/12_agents`, then make adapters point there.
6. If a doc is historical, mark it as archive-only rather than deleting unless deletion is clearly safe.

Do not create “summary of summaries” docs unless they replace a messy instruction surface with a canonical entrypoint.

---

## Mandatory scoring model

In `08-final-implementation-report.md`, score the agent workflow before and after your changes from 1–5:

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Source-of-truth clarity | | | |
| Agent routing clarity | | | |
| Loop enforceability | | | |
| Speed / low-ceremony execution | | | |
| Validation proportionality | | | |
| Anti-drift resilience | | | |
| Onboarding clarity for a new agent | | | |
| Safety / approval boundaries | | | |

Do not inflate scores. If you did not patch, explain why the score stayed the same.

---

## Required deliverables

### `00-README.md`

Include:

- goal
- mode
- scope
- non-goals
- allowed writes
- disallowed writes
- source-of-truth chain
- stop condition
- validation plan

### `01-source-of-truth-inventory.md`

Include a table:

```md
| Path | Role | Canonical/thin/stale/archive/local | Finding | Action |
|---|---|---|---|---|
```

### `02-agent-contract-audit.md`

Include:

- active mandate summary
- agent-neutral contract summary
- current agent roster
- tool adapter analysis
- contradictions
- missing links
- recommended simplifications

### `03-drift-conflict-register.md`

Include:

```md
| ID | Severity | Path | Conflict/stale claim | Current truth | Evidence | Fix |
|---|---|---|---|---|---|---|
```

Severity scale:

- P0: causes unsafe action, provider mutation risk, or destructive behavior
- P1: causes agents to use wrong stack, stale architecture, wrong validation, or wrong authority
- P2: creates friction, duplicate work, or avoidable token burn
- P3: copy/style/organization cleanup

### `04-loop-surface-map.md`

Include:

```md
| Work type | Default loop surface | Required memory | Required proof | Stop condition |
|---|---|---|---|---|
```

### `05-workflow-friction-analysis.md`

Include:

- what slows agents down today
- what causes repeated context loading
- what causes validation overkill
- what can be made thinner
- where graph tools/indexes should replace brute-force reads
- which rules are useful but too duplicated

### `06-recommended-contract-patches.md`

Include:

- patches applied
- patches recommended but not applied
- canonical docs changed
- adapters changed
- docs intentionally left alone
- rationale for each decision

### `07-validation-and-evidence-plan.md`

Include:

- validation commands run
- exit codes
- what each command proved
- what it did not prove
- skipped checks and risk

### `08-final-implementation-report.md`

Include:

- final status
- iterations completed
- changed files
- key findings
- stale docs fixed or left as follow-up
- before/after scorecard
- validation evidence
- proof boundary
- remaining risks
- exact next action if further work is needed

---

## Recommended patches to consider

Do not blindly apply these. Verify first.

1. Thin `CODEX.md` if it contains stale local-first JSON / future Supabase wording. It should point to `AGENTS.md`, `.ai/00_system`, `.ai/10_state`, and `.ai/12_agents` instead of defining an outdated stack.
2. Keep `CLAUDE.md` aligned with `.ai/00_system`; if it contains strict GitNexus/code-review-graph mandates that conflict with the newer proportional policy, either soften them or clarify their risk-based scope.
3. Ensure `AGENTS.md` remains the top-level entrypoint, but do not let it become an enormous duplicated copy of `.ai/00_system`.
4. Add or improve a reusable prompt under `.ai/08_prompts/` for “agent mandate/workflow optimization loop” if no such prompt exists.
5. Add or improve a reusable skill/playbook under `.ai/11_skills/` only if the repo lacks a compact “run a loop-engineered docs/governance audit” procedure.
6. Update `.ai/12_agents/README.md` only if routing rules are missing current agents, model effort tiers, fail-closed status, or loop-surface mapping.
7. Update `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` only if the restart chain or canonical homes are stale.
8. Update `.ai/00_system/VALIDATION_MATRIX.md` only if docs-only or agent-framework validation is unclear.

---

## Validation commands

For this docs/governance task, start with:

```bash
git status --short --branch
git diff --check
```

Also run targeted path existence checks for every file you reference.

If you edit scripts, source, package files, generated files, or production-facing config despite the default scope, you must escalate validation to the appropriate gates from `.ai/00_system/VALIDATION_MATRIX.md`.

Do not run broad `bun run validate` or `bun run build` for docs-only changes unless you touched production code, package scripts, framework config, source tests, or a canonical rule that explicitly requires it.

---

## Final response format

Your final answer must be compact but evidence-based:

```md
## Result
<done / blocked / partial>

## What changed
- <file>: <change>

## Loop evidence
- Iterations: <n>
- Ledger: <path>
- Plan pack: <path>

## Validation
- <command>: <exit code> — <what it proves>

## Important findings
- <finding with path>

## Remaining risk
- <risk or “none known within docs/governance scope”>

## Next action
<one decisive next action, or “No immediate action needed.”>
```

Do not claim “complete” unless the ledger acceptance criteria are checked or a documented blocker/iteration cap explains the gap.
