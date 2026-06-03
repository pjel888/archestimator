# CI/CD and Release Guardrails

**Date:** 2026-06-03

## Current CI/CD evidence

GitHub Actions `.github/workflows/ci.yml` currently runs on all pull requests and pushes to `main` and `feat/**`; it installs Bun, runs `bun run validate`, runs `bun run build`, installs Playwright Chromium, runs `bun run test:e2e`, and runs route-transition perf smoke.

## Target CI/CD pipeline by branch type

| Branch type | Trigger | Checks | Deploy gate |
|---|---|---|---|
| `feat/*` / `fix/*` PR | pull_request | install, typecheck, lint, design lint, unit, DOM, build; focused tests as needed | preview only, no production deploy |
| `beta` | PR and push after approval | full validate, build, e2e smoke, route perf smoke where relevant | beta/staging deploy only after provider env proof |
| `release/*` | PR | full validate, build, e2e, release checklist, provider proof | manual approval |
| `main` | PR/push | production gate: full validation, e2e/perf, release evidence | production manual approval and rollback proof |
| `hotfix/*` | PR | critical focused tests, validate/build when time permits, rollback proof | emergency manual approval |

## Required checks

- Typecheck: `bun run type-check`.
- Lint: `bun run lint`.
- Design-system lint: `bun run lint:design-system` for app/workshop UI.
- Unit tests: `bun run test`.
- Vitest DOM tests: `bun run test:dom`.
- Build: `bun run build`.
- Browser smoke/e2e: `bun run test:e2e` when auth/protected-route/user-flow/release changes require it.
- Whitespace: `git diff --check`.
- Dependency/security audit: future tuned check; do not add noisy blocking gate before dry-run.
- Migration/type generation: only when schema changes and under repo safety rules.

## PR gates

- ADD phase checklist completed.
- Run log link.
- Tests/validation evidence.
- No secrets/provider claims without proof.
- Review by human/senior agent for risky changes.
- Conversation resolution before merge.

## Beta/staging gates

- `beta` branch protection active.
- Environment variables provisioned and redacted proof captured.
- Hosted auth, Supabase, Resend, backup/PITR, support, legal, and manual smoke gates mapped to proof packet.

## Production gates

- Release candidate branch validated.
- Provider proof complete.
- Rollback rehearsed or documented.
- Philip approval.
- Post-release smoke scheduled and logged.

## CI failure protocol

1. Preserve logs.
2. Identify failed check and scope.
3. Do not weaken tests or delete checks without explicit approval.
4. Fix root cause or create `.ai/15_Bugs` blocker.
5. Rerun affected check.

## Flaky test protocol

Rerun once to confirm. If intermittent, capture both outputs, classify severity, add stabilization plan, and avoid treating a lucky pass as proof.

## What agents must never do to make CI pass

- Remove tests/checks without approval.
- Hide failures behind broad skips.
- Install unapproved dependencies.
- Change provider settings silently.
- Claim production readiness from local CI alone.
