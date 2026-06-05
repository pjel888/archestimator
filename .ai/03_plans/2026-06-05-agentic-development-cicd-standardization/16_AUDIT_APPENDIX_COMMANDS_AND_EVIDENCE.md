# 16 — Audit Appendix: Commands, Evidence, and References

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Commands run

```bash
git status --short --branch
git worktree list --porcelain
git fetch origin main
git worktree add -b codex/2026-06-05-agentic-cicd-planning /Users/philiplewis/.codex/worktrees/agentic-cicd-planning origin/main
gh workflow list --repo pjel888/archestimator --all
gh workflow view 277898857 --repo pjel888/archestimator --yaml
gh api repos/pjel888/archestimator/branches/main
gh api repos/pjel888/archestimator/rulesets
gh api repos/pjel888/archestimator/actions/permissions
gh api repos/pjel888/archestimator/actions/permissions/workflow
gh run list --repo pjel888/archestimator --limit 20
vercel inspect archestimator.com
vercel inspect archestimator.com --format=json
vercel inspect dpl_4bMoArwC32Tup4dKK67wtKoBf2jv --logs
vercel project ls
```

## Key evidence

- Graph: 502 files, 4,634 nodes, 70,036 edges; updated 2026-06-05 14:23 PHT.
- GitHub: repo private; `main` unprotected; protection/rulesets unavailable with current plan capability; CI workflow disabled manually; actions enabled; default workflow permission read.
- Vercel: current production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, Ready, `git.deploymentEnabled:false`.
- Repo: `.github/workflows/ci.yml` exists; no PR template/CODEOWNERS; `vercel.json` disables Git deployments.
- Team audit: workers confirmed archived framework pointer, missing 2026-06-05 plan folder before this work, CI/CD gaps, and no intended worker edits.

## Official references used

- GitHub branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Actions workflow syntax, permissions, concurrency: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions security hardening / SHA pinning: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- GitHub deployments and environments: https://docs.github.com/en/actions/reference/deployments-and-environments
- Vercel Git configuration / `git.deploymentEnabled`: https://vercel.com/docs/project-configuration/git-configuration
- Vercel Git deployments: https://vercel.com/docs/deployments/git
- Vercel deploy CLI / `--prod --skip-domain`: https://vercel.com/docs/cli/deploy
- Vercel staged production from CLI: https://vercel.com/docs/cli/deploying-from-cli
- Vercel promote CLI: https://vercel.com/docs/cli/promote
- Vercel promoting deployments: https://vercel.com/docs/deployments/promoting-a-deployment

## Caveats

All GitHub/Vercel facts are time-sensitive and must be rechecked before implementation. This task did not mutate provider settings or run app tests because no production source code changed.
<!-- 98-100-UPGRADE:START -->
## 2026-06-05 14:45 PHT refreshed evidence

- `git status --short --branch`: `## main...origin/main` before edits.
- `git log --oneline -5`: `318a986 Plan controlled agentic delivery before enforcing gates` at HEAD before the docs-only upgrade commits; later plan commits moved `main` forward and must be rechecked by future implementers.
- `code-review-graph list_graph_stats`: 502 files, 4,634 nodes, 70,036 edges, updated 2026-06-05 14:23 PHT.
- `gh workflow list --repo pjel888/archestimator --all`: `CI disabled_manually 277898857`.
- `gh run list`: latest listed runs are May 18 failures, not current June 5 proof.
- `gh api repos/pjel888/archestimator/branches/main`: `protected:false`.
- `gh api repos/pjel888/archestimator/rulesets`: 403 GitHub Pro/public repo capability blocker.
- `gh api .../actions/permissions`: actions enabled, allowed actions `all`, SHA pinning not required.
- `gh api .../actions/permissions/workflow`: default workflow permissions `read`.
- `vercel inspect archestimator.com --format=json`: production `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, `READY`, `git.deploymentEnabled:false`, Node `24.x`.
- `find .github`: `.github/workflows/ci.yml` and `.github/.DS_Store`; no PR template/CODEOWNERS/release workflow.

## Team evidence

OMX Team `read-only-audit-only-b6760d5e` completed 3/3 read-only tasks, then shut down cleanly. Worker findings independently confirmed CI disabled, branch/ruleset protection blocked, missing PR/CODEOWNERS/release workflow, Vercel Git deploy disabled, and no worker diffs.
<!-- 98-100-UPGRADE:END -->
<!-- REVIEW-FIX-2026-06-05:START -->
## 2026-06-05 16:05 PHT review-fix evidence

- GitHub remote `main` after the docs-only upgrade pointed at `aef81b72c3b44424e82b3bd2c8be0da85f7901a0`.
- Code-review lane recommendation: `APPROVE` for docs-only scope, no findings.
- Architect lane status before this addendum: `WATCH`, driven by whole-folder prompt ambiguity, manual staging deploy specificity, and required-check topology.
- This addendum narrows future execution to phase-specific prompts, documents manual preview/staging deployment evidence while Vercel Git deploys remain disabled, and requires always-present/aggregator check topology before branch-protection enforcement.
- Official reference refresh: Vercel CLI docs describe `--prod` deployment and `vercel promote <deployment-url>`; GitHub Actions docs require careful handling of always-present required contexts and `always()`/conditional semantics before making checks blocking.
<!-- REVIEW-FIX-2026-06-05:END -->
