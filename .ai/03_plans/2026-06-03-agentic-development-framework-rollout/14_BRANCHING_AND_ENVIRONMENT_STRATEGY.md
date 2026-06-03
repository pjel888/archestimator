# Branching and Environment Strategy

## Current evidence
Current branch is `main` tracking `origin/main`. CI runs on pull requests and pushes to `main`/`feat/**`. Closed beta is NO-GO until external/manual provider proof gates pass.

## Target branch model
- `main`: protected default/production truth.
- `beta`: optional closed-beta/staging branch after Philip approval and proof process maturity.
- `feat/*`, `fix/*`, `hotfix/*`, `release/*`: short-lived branches.
- No permanent `dev` branch unless throughput proves the need.

## Rules
- Prefer small batches and short-lived branches.
- Never force push shared branches.
- Do not auto-merge to `main` unless Philip explicitly authorizes.
- Use isolated worktrees for parallel write-capable agents.
- Keep docs-only commits separate from source/config/provider changes.

## Environment mapping
- Local/preview: normal feature validation.
- Beta/staging: fuller checks, manual proof packet, environment approvals.
- Production/main: protected checks, release proof, rollback plan.

## CI by branch
Feature/fix: validate/build plus targeted tests. Beta/main/release: validate/build/e2e/perf/security/proof gates as applicable.
