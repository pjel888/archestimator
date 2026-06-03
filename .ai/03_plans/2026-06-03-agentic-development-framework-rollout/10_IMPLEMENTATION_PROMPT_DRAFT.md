# Implementation Prompt Drafts

## Full future implementation prompt

```txt
You are a repo-aware ArchEstimator implementation agent.

Use plan folder: /Users/philiplewis/archestimator/.ai/03_plans/2026-06-03-agentic-development-framework-rollout

Scope: implement Phase 1A repo-local framework docs/payload/prompts/skills/thin harness adapters, then after Phase 1A commit/push perform Phase 1B ArchEstimator Notion mirror sync if authorized/tooling is available.

Before editing, verify live repo reality: run safety commands, inspect git status, read AGENTS.md, .ai/AGENTS.md, .ai/README.md, .ai/00_system/*, .ai/10_state/*, DESIGN.md, package.json, README.md, .github/workflows/ci.yml, .ai/12_agents, .ai/08_prompts, .ai/11_skills, discovered harness surfaces, and every file in the plan folder.

Use code-review-graph first. Try GitNexus; if it fails, record the exact failure and use code-review-graph/fallback inspection until repaired.

Phase 1A allowed writes: .ai/00_system, .ai/12_agents, .ai/08_prompts, .ai/11_skills, .ai/04_tasks, .ai/05_logs, .ai/10_state, .ai/15_Bugs, and thin harness adapters only where authorized. Strictly no production source behavior unless Philip separately authorizes source work.

Strict non-goals: no package/dependency/lockfile changes, no migrations, no generated/runtime config, no provider mutations, no GitHub settings/branch protection mutation, no Notion mutation during Phase 1A, no secrets, no SlateCamp resources.

Add/update tests only if implementation introduces scripts/checkers/helpers or source behavior; use TDD for any future production behavior changes.

Update .ai docs/state/logs/bugs. Create bug plans in .ai/15_Bugs for discovered blockers. Do not archive this plan after Phase 1A only.

Commit and push Phase 1A. Default merge policy uses feature branches/PRs; do not automatically merge to main unless Philip explicitly authorizes it. If already on main and docs-only repo practice permits direct commits, confirm diff is scoped before committing.

Phase 1B Notion policy: after Phase 1A commit/push, update Notion as a mirror if tools/authorization exist. Include commit hash, source .ai path, mirror date, proof boundary, anti-drift notice, and no secrets. Verify stale Notion engineering stack facts from current package.json and update them. If Notion mutation is unavailable, unauthorized, or fails, create a dated .ai/15_Bugs blocker and report PHASE_1A_COMPLETE_PHASE_1B_BLOCKED. Do not claim Phase 1 complete without Notion sync proof or explicit Philip waiver/defer decision.

Final report must separate repo-local Phase 1A, Notion Phase 1B, global enforcement readiness, provider/GitHub proof, closed beta status, validation commands, branch, commit hash, push status, bugs/blockers.
```

## Dedicated payload/harness prompt

```txt
Implement only the .ai/12_agents and harness payload standardization from docs 24-31 and 40-43. Add payload template, standardize existing payloads, resolve Hermes/Cursor/Ollama/Gemini/.agents/CommandCode fail-closed policy, add .agents/README.md if .agents remains, and keep tool-specific files subordinate to .ai. No source/package/migration/provider/GitHub/Notion changes. Validate with inventory rerun, schema audit, stale-string audit, graph evidence, and git diff --check.
```

## Dedicated Notion sync prompt

```txt
Perform Phase 1B only after Phase 1A commit/push. Fetch Notion target pages/databases first. Verify package versions from live package.json. Correct stale Notion stack/graph facts and update/create framework mirror, agent roster, prompt library, run logs, dry-run/eval status, GitHub guardrails, provider proof gates, release readiness, and proof boundary. Include source .ai path, commit hash, mirror date, anti-drift notice, proof boundary, no secrets. If blocked, create .ai/15_Bugs/YYYY-MM-DD-notion-sync-blocked.md and report PHASE_1A_COMPLETE_PHASE_1B_BLOCKED.
```

## Dedicated dry-run/eval prompt

```txt
Run dry-runs from docs 22 and 33: stale-doc, dirty-worktree, provider-hallucination, Notion-drift, no-code-plan-only, prompt-injection, UI/design-system, bug creation, release/hotfix, GitNexus fallback, Gemini/Ollama fail-closed. Score 1-5 and log evidence. Do not claim global enforcement until at least three representative cycles average >=4.7/5 with zero critical failures and Philip approval.
```
