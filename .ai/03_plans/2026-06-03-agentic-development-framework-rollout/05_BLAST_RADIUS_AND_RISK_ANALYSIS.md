# Blast Radius and Risk Analysis

**Date:** 2026-06-03

## Affected workflows

| Workflow | Impact | Risk | Mitigation |
|---|---|---|---|
| Feature development | Adds DEFINE→RELEASE gates, run logs, branch rules | Medium | Dry-run one feature first |
| Bug fixing | Adds evidence/reproduction/regression protocol | Low | Keep emergency bugfix path lightweight |
| Hotfixes | Adds production-branch and backmerge rules | Medium | Minimal fix only; emergency owner bypass documented |
| Code review | Adds ADD evidence checklist | Low | Use PR template after dry-run |
| CI/CD | Future trigger/check expansion | Medium | Plan before YAML change; run PR workflow |
| Release promotion | Requires beta no-go/provider proof | High but needed | No release without manual proof matrix |
| Beta readiness | Aligns process with current NO-GO gates | Low | Does not claim proof |
| Provider evidence | Requires dashboard/CLI/manual proof | Medium | Store proof links in `.ai` and Notion mirror |
| Notion project management | Adds mirror and anti-drift rules | Medium | `.ai` remains canonical |
| AI agent onboarding | Adds required context and templates | Low | Keep templates concise and path-specific |

## Affected repo areas

- `.ai/00_system`: future canonical ADD/branch/CI/Notion/protocol docs.
- `.ai/08_prompts`: future reusable prompts.
- `.ai/11_skills`: future project playbooks if needed.
- `.ai/12_agents`: future thin role contracts only if needed.
- `.ai/15_Bugs`: active bug/blocker plans.
- `.github`: future workflows, templates, branch/PR governance artifacts.
- `docs/`: existing `docs/superpowers` plans exist; do not make root docs canonical unless Phase 1 explicitly chooses a lightweight mirror.
- `README.md` and `AGENTS.md`: future implementation may update references only after `.ai` canonical docs exist; do not drift these ahead of `.ai`.

## Affected tests

- Plan-only: no source tests required.
- Future CI config: workflow syntax/PR run validation.
- Future source work: `bun run validate`, `bun run build`, `git diff --check`.
- Future UI/workshop: `bun run lint:design-system` plus focused tests.
- Future release/deploy flow: Playwright smoke/e2e and provider proof.

## Risk register

| Risk | Severity | Likelihood | Mitigation | Rollback |
|---|---|---:|---|---|
| Overcomplicated branch model | High | Medium | Keep `main` + `beta`; make `dev` optional | Remove unneeded branch after no PRs depend on it |
| Long-lived branch drift | Medium | Medium | Short release windows; backmerge rules | Rebase/cherry-pick; archive stale branch |
| Agents ignore docs | High | Medium | CI/PR templates, run logs, graph checks | Fix templates; require human review |
| CI configured incorrectly | High | Medium | PR workflow dry-run before required checks | Revert workflow YAML |
| Beta blocked by provider proof | High | High | Keep NO-GO explicit; provider proof packet | Do not release |
| Notion diverges from `.ai` | Medium | Medium | Notion mirror links to `.ai`; anti-drift checks | Correct Notion or mark stale |
| Stale docs become false authority | High | Medium | Source-of-truth map and current-state-first rule | Patch canonical doc or bug plan |
| Accidental provider deploy | High | Low | Manual approval gates; no provider changes in plan | Roll back deployment |
| Secret exposure | Critical | Low | No secrets in docs; secret scan future | Rotate/remove under incident plan |
| Branch protection locks out founder | High | Medium | Admin bypass decision by Philip | Temporarily relax with decision log |
| Too much process slows beta fixes | Medium | Medium | Dry-run before enforcement; hotfix exception | Keep ADD advisory |

## Concurrency and merge risks

Another AI may work in the repo. All future implementations must check `git status --short --branch`, inspect dirty files, avoid staging unrelated changes, and update `.ai/05_logs` with ownership. Shared docs in `.ai/00_system` should be edited in small commits.

## GitNexus/code-review-graph impact requirements

No symbols are edited by this plan. Future code/symbol changes must run GitNexus impact analysis before editing symbols and `gitnexus detect-changes` / code-review-graph detect changes before commit.
