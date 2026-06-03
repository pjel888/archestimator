# GitHub Protection and PR Policy Plan

**Date:** 2026-06-03

## Current GitHub evidence from local repo

- Remote: `https://github.com/pjel888/archestimator.git`.
- Default branch: `main`.
- Current workflow: `.github/workflows/ci.yml`.
- No PR template, issue templates, or CODEOWNERS found locally.
- Local git cannot prove current branch-protection settings.

## Branch protection recommendations

| Branch | Recommendation |
|---|---|
| `main` | Require PR, CI checks, no force push, no deletions, conversation resolution, retain admin bypass initially unless Philip chooses stricter mode |
| `beta` | Require PR, CI checks, no force push, no deletions, beta proof checklist before tester exposure |
| `release/*` | Require PR/checks; release owner approval |
| `hotfix/*` | Require checks but allow emergency fast review; no broad refactor |

## PR rules

- ADD phase checklist.
- Evidence/run-log link.
- Validation commands with output summary.
- Risk and rollback note.
- Provider claims separated from local proof.
- No automatic merge to `main` unless Philip explicitly authorizes.

## Reviewer rules

- Human review for branch protection, provider, release, legal/support, and security-sensitive changes.
- Senior/code-reviewer/architect review for broad architecture or auth/RLS/CI changes.
- CODEOWNERS is recommended only after dry-run proves it will not block solo-founder speed.

## Required status checks

Use exact workflow job names after future CI is finalized. Start with the current `validate` job and split only if needed for fast PR feedback.

## Stale review dismissal and admin bypass

Recommended initial posture: dismiss stale reviews for `main`/`beta` only after required checks are stable; keep admin bypass for Philip emergency recovery until beta operations mature.

## Templates and labels

- PR template: ADD checklist, validation evidence, source-of-truth updates, rollback, provider proof status.
- Issue templates: feature, bug, hotfix, release, CI failure.
- Labels: `add/define`, `add/discover`, `add/design`, `add/build`, `add/validate`, `add/release`, `risk/high`, `provider-proof`, `beta-gate`, `hotfix`, `blocked`.

## Release tags

Use `beta-YYYY.MM.DD-n` for closed beta candidate tags and `vMAJOR.MINOR.PATCH` only after public production versioning is approved.

## GitHub environments

Create `preview`, `beta-staging`, and `production` environments. Production requires manual approval and rollback proof.

## Exact future implementation tasks

1. Draft PR/issue templates in `.ai/08_prompts` first.
2. After approval, add `.github/pull_request_template.md`.
3. Add `.github/ISSUE_TEMPLATE/*.md`.
4. Decide whether to add CODEOWNERS.
5. Configure branch protection in GitHub UI/API only after Philip approval.
6. Capture settings proof in `.ai/05_logs`.

## Rollback if settings block urgent work

Record decision, temporarily relax the specific setting, ship emergency fix, restore setting, and log the recovery.
