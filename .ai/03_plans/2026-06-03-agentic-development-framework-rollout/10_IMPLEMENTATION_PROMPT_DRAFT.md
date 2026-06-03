# Implementation Prompt Draft

Paste this prompt into Codex/Claude Code/OpenCode only after Philip authorizes Phase 1 implementation.

```txt
You are working in /Users/philiplewis/archestimator.

Implement Phase 1 only from `.ai/03_plans/2026-06-03-agentic-development-framework-rollout`.

Read first, in order:
1. AGENTS.md
2. .ai/README.md
3. .ai/00_system/DOCS_SOURCE_OF_TRUTH.md
4. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
5. .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md
6. .ai/00_system/VALIDATION_MATRIX.md
7. .ai/10_state/current-state.md
8. .ai/10_state/decisions.md
9. .ai/03_plans/2026-06-03-agentic-development-framework-rollout/00_INDEX.md
10. All other files in that plan folder.

Before editing, verify current repo reality:
- pwd
- git rev-parse --show-toplevel
- git status --short --branch
- git branch --show-current
- git fetch --prune origin
- git remote show origin
- git log --oneline -5
- inspect `.github/workflows/ci.yml`, `package.json`, `.ai/00_system`, `.ai/10_state`.

Use GitNexus/code-review-graph first if available. If GitNexus is stale, run `npx gitnexus analyze` before relying on it.

Scope:
- Add/update only Phase 1 canonical `.ai` docs:
  - `.ai/00_system/AGENTIC_DEVELOPMENT_FRAMEWORK.md`
  - `.ai/00_system/BRANCH_ENVIRONMENT_STRATEGY.md`
  - `.ai/00_system/FEATURE_BUG_HOTFIX_PROTOCOL.md`
  - `.ai/00_system/CI_CD_RELEASE_GUARDRAILS.md`
  - `.ai/00_system/NOTION_SYNC_PROTOCOL.md`
  - `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
  - `.ai/README.md`
  - `.ai/10_state/decisions.md`
  - a run log in `.ai/05_logs`.

Do not modify production source code unless Philip separately authorizes a later phase. Do not modify dependencies, package files, migrations, generated files, runtime config, provider settings, branch protections, or Notion directly unless the prompt explicitly includes that scope.

If tests are necessary and possible for docs/protocol verification, add/update docs validation only. For source changes in a later authorized phase, use TDD: write the failing test first, watch it fail, implement minimally, rerun.

If you discover a bug or blocker, create a dated bug plan in `.ai/15_Bugs` with evidence, impact, proposed fix, verification, and status.

Merge/commit policy:
- Default repo decision uses feature branches/PRs and does not automatically merge to `main`.
- Do not merge to `main` automatically unless this prompt explicitly says to.
- Commit and push the Phase 1 branch when validation passes.
- Use a Lore-compliant commit message.

Branch policy:
- Do not create/delete protected branches until the branch strategy is approved.
- Do not change GitHub branch protections unless this prompt explicitly includes that scope.

Notion policy:
- If Notion tool exists and this prompt explicitly authorizes direct Notion update, update Notion and report exact page/database proof.
- Otherwise create or update paste-ready Notion payload inside `.ai` and state that Notion was not directly updated.

After successful full implementation of all phases in a future task, archive the plan folder under `.ai/09_archive/store/` with final evidence. Do not archive after Phase 1 only.

Validation for Phase 1:
- referenced paths exist
- git diff --check
- git diff -- .ai
- optional: code-review-graph/GitNexus detect changes for docs scope

Final report must include changed files, commands run, evidence, open risks, commit hash, push status, and whether the framework is advisory or enforced.
```
