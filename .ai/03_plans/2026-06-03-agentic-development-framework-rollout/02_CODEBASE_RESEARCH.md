# Codebase Research

**Date:** 2026-06-03
**Status:** VERIFIED_REPO_FACTS_PLUS_BOUNDED_EXTERNAL_RESEARCH

## Commands run

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
git branch -a --verbose --no-abbrev
git remote show origin
find .github -maxdepth 3 -type f -print
node -e 'const p=require("./package.json"); console.log(JSON.stringify({scripts:p.scripts, dependencies:p.dependencies, devDependencies:p.devDependencies},null,2))'
find src/app -maxdepth 4 \( -name page.tsx -o -name route.ts -o -name layout.tsx \) -print
find supabase/migrations -type f | wc -l
rg -n "Notion|notion" .ai README.md AGENTS.md .github package.json
npx gitnexus status
npx gitnexus analyze
npx gitnexus query -r archestimator "release beta branch validation agent protocol CI workflow bug"
```

## Files/folders inspected

- `AGENTS.md`
- `.ai/README.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/10_state/known-issues.md`
- `.ai/01_roadmap/README.md`
- `.ai/01_roadmap/25-active-workstreams.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/00-README.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/47-goal-completion-audit.md`
- `.ai/06_specs/ai-assistant-and-package-builder-spec.md`
- `.ai/06_specs/state-and-supabase-foundation.md`
- `.github/workflows/ci.yml`
- `README.md`
- `package.json`
- `DESIGN.md`
- `src/app` route tree
- `supabase/migrations`

## Branches found

main is the local and remote default branch; remote branches found: origin/main, origin/feat/share-page-client-review-ux-ui-overhaul, origin/teaser/prelaunch; local branches: main and teaser/prelaunch; no beta/staging/dev/release/hotfix branch exists yet.

## Worktrees found

`git worktree list` showed only `/Users/philiplewis/archestimator` at commit `4bc738c` on `main`.

## Remote/default branch evidence

`git remote show origin` reports HEAD branch `main`; `origin/main` is up to date with local `main` after fetch.

## GitHub Actions workflow evidence

GitHub Actions `.github/workflows/ci.yml` currently runs on all pull requests and pushes to `main` and `feat/**`; it installs Bun, runs `bun run validate`, runs `bun run build`, installs Playwright Chromium, runs `bun run test:e2e`, and runs route-transition perf smoke.

## Package scripts evidence

`package.json` exposes `validate` as `type-check && lint && lint:design-system && test && test:dom`; separate gates include `build`, `test:e2e`, `test:e2e:perf`, launch provider readiness helpers, and performance helpers.

## Validation matrix evidence

`.ai/00_system/VALIDATION_MATRIX.md` defines docs-only validation as referenced-path checks plus `git diff --check`, and source-change validation as `bun run validate`, `bun run build`, and targeted e2e/design-system checks by work type.

## `.ai` source-of-truth evidence

`.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` makes `.ai` the canonical implementation truth, with Notion only allowed as an external mirror; `.ai/10_state/current-state.md` keeps closed beta NO-GO until provider/manual proof is captured.

## Current beta no-go gate evidence

`.ai/10_state/current-state.md` and the launch readiness pack continue to separate repo-local implementation proof from provider/manual proof. Closed beta remains NO-GO until Supabase, Vercel, Resend, hosted auth, hosted E2E/manual smoke, legal/support, backup/PITR, rollback, and related proof exist.

## Existing AI agent protocol evidence

`AGENTS.md` and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` require `.ai` source-of-truth reading, graph/GitNexus use for code exploration/impact, Next.js local docs before framework API changes, no secrets, current-state-first truth, and evidence before completion.

## Existing GitNexus/code-review-graph evidence

- code-review-graph architecture overview returned 120 communities, 4 community pairs, and 0 warnings.
- GitNexus initially reported stale at commit `2526212`; `npx gitnexus analyze` refreshed the graph to commit `4bc738c` with 12,111 nodes, 22,050 edges, 550 clusters, and 300 flows.
- GitNexus query for release/beta/branch/validation/agent protocol surfaced beta feedback/admin and AI package-builder flows, confirming current graph relevance but no existing ADD workflow symbol because this is docs/governance work.

## Existing Notion references

Repo docs mention Notion as an external operating workspace/mirror, a possible feedback tracker, and a comparison product. No current repo-local evidence proves a Notion workspace was updated for this task.

## Existing docs/run-log/decision/interface patterns

- Run/handoff logs live in `.ai/05_logs`.
- Durable decisions live in `.ai/10_state/decisions.md` and some ADR-like archives.
- Interface and domain contracts live in `.ai/06_specs`, `.ai/00_system/VALIDATION_MATRIX.md`, archived plan packs, tests, and migration/RPC docs.

## Existing bug plan patterns

`.ai/15_Bugs` exists. Current-state says resolved bug specs were archived into `.ai/09_archive/bugs`; new bug/blocker plans should be dated Markdown files under `.ai/15_Bugs`.

## Existing PR/issue template patterns

`.github` currently contains `.github/workflows/ci.yml` only; no issue templates, PR template, or CODEOWNERS were found.

## Existing release checklist patterns

Release and closed-beta checklists exist primarily in `.ai/01_roadmap` and `.ai/03_plans/mvp-launch-readiness-2026-06-01/`.

## Verified repo facts

- Local repo path: `/Users/philiplewis/archestimator`.
- GitHub remote: `https://github.com/pjel888/archestimator.git`.
- Default branch: `main`.
- Current commit before this plan: `4bc738c`.
- Current CI triggers: pull requests plus pushes to `main` and `feat/**`.
- Current validation command: `bun run validate`.
- Current docs-only validation: `git diff --check` plus path checks.

## Inferred patterns

- Existing branch usage favors `main`, `feat/*`, and topical branches; no evidence supports a long-lived `dev` branch today.
- `.ai` is already the correct canonical home for ADD system docs; Notion should mirror not replace it.

## Assumptions

- Philip wants a slow rollout that protects current closed-beta readiness work.
- GitHub branch protection and Notion updates require admin action or explicit future scope.
- Provider dashboards remain manual evidence surfaces unless a future provider connector command is explicitly authorized.

## External ADD concepts

Live research checked Seven Peaks and Agentic Driven on 2026-06-03: Seven Peaks emphasizes human-led product design/review, agent-driven specs/implementation, TDD, integration/browser verification, run logs, guardrails, CI/CD enforcement, and senior review; Agentic Driven emphasizes human strategy with AI execution, Documentation-First, Context-Aware, Contract-Driven, Continuous Validation, Git-Traceable, Standards-First work, and phase gates from DEFINE through VALIDATE.

Source URLs:
- Seven Peaks: https://sevenpeakssoftware.com/blog/a-practical-guide-to-agentic-software-development
- Agentic Driven: https://agenticdriven.dev/

## Unresolved unknowns

- Exact GitHub branch-protection settings cannot be proven from local git alone.
- Notion workspace structure/tool state was not mutated in this planning pass.
- Provider environments for beta/staging/production remain externally unproven.
- Root `README.md` still disagrees with `package.json` on React patch version; `.ai/README.md` and `.ai/10_state/current-state.md` were corrected during this plan pass. See `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`.
