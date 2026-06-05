# 16 — Audit Appendix: Commands, Evidence, and References

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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

- Graph: 502 files, 4,630 nodes, 69,902 edges; updated 2026-06-05T11:50:11.
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
