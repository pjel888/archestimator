# Implementation Prompt Draft

Copy/paste this only for a future implementation task. It is not authorization to implement now.

```txt
You are a repo-aware ArchEstimator implementation agent. Implement Phase 1 of the plan at:
/Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-agentic-development-framework-rollout

This is a DOCS/PAYLOAD/HARNESS implementation pass only unless Philip explicitly expands scope.

Required first steps:
1. Run repo safety checks: pwd, git rev-parse --show-toplevel, git status --short --branch, git branch --show-current, git worktree list, git remote -v, git fetch --prune origin, git log --oneline -5.
2. Read AGENTS.md, .ai/AGENTS.md, .ai/README.md, .ai/00_system/DOCS_SOURCE_OF_TRUTH.md, .ai/00_system/AGENT_OPERATING_PROTOCOL.md, .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md, .ai/00_system/VALIDATION_MATRIX.md, .ai/10_state/current-state.md, .ai/10_state/decisions.md, DESIGN.md, package.json, and every file in the plan folder.
3. Verify this plan against current repo reality. If stale, correct the plan or create .ai/15_Bugs plans before editing framework files.
4. Use code-review-graph/GitNexus first where available. If GitNexus is unavailable, document the exact failure and use code-review-graph/fallback inspection.

Implement only:
- .ai/00_system framework rules needed for agent preflight/runtime/evidence/adoption.
- .ai/12_agents payload template and standardized thin payloads, including explicit decisions for Hermes, Cursor, Gemini deprecated, and Ollama non-agent.
- .ai/08_prompts templates and .ai/11_skills playbooks needed for Phase 1.
- Thin harness pointers such as AGENTS.md, .agents/README.md, CLAUDE.md, GEMINI.md only if they do not fork policy.
- .ai state/task/log/bug updates.

Do not implement:
- production source behavior, packages, dependencies, migrations, runtime/generated files, provider changes, GitHub settings, Notion changes, or branch protection/rulesets.

Validation:
- Docs-only: verify referenced paths exist, git diff --check, inspect git diff -- .ai, code-review-graph detect_changes if available.
- If any source/config file is changed by explicit authorization, run bun run validate and bun run build; run bun run test:e2e for browser/auth/user-flow/release changes; run bun run lint:design-system for app/workshop UI.

Bug protocol:
- Create dated bug plans in .ai/15_Bugs for missing prerequisites, contradictions, stale assumptions, failing tests, or harness docs that cannot be verified.

Commit/push:
- Commit with a Lore-style message. Default subject: docs(ai): implement agentic framework phase 1.
- Push to origin.
- Do not merge to main automatically unless Philip explicitly authorizes it. If already on main and repo policy allows docs-only main commits, commit/push docs-only changes safely.

Archive:
- Do not archive this plan until the full planned framework implementation is complete, or until Philip explicitly scopes archive to a completed phase.

Final report:
- Include files changed, payloads added/updated, validation evidence, bug plans, branch, commit hash, push status, remaining owner decisions, and what was not implemented.
```

## Dedicated payload/harness implementation prompt

```txt
Implement only the .ai/12_agents / .agents / harness payload standardization from docs 24-31 and 40-42 of the plan folder. Keep every payload thin, operational, and subordinate to .ai/00_system. Add _template.md. Standardize codex, claude, opencode, commandcode, kimi, antigravity/agy, deepseek, gemini deprecated, and any approved hermes/cursor/ollama-policy payloads. Add .agents/README.md as a compatibility shim only if .agents still exists. Update GЕMINI.md to fail closed if Gemini remains deprecated. Do not touch source code, packages, migrations, providers, GitHub settings, or Notion.
```
