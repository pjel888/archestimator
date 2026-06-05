# 04 — GitHub Actions CI Reactivation and Hardening Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## P0 problem

GitHub reports `CI disabled_manually`. Future implementation must restore current CI visibility before it can split jobs or enforce required checks.

## Phase 0 — read-only confirmation

Rerun:

```bash
gh workflow list --repo pjel888/archestimator --all
gh run list --repo pjel888/archestimator --limit 20 --json workflowName,headBranch,headSha,status,conclusion,createdAt,url
gh api repos/pjel888/archestimator/actions/permissions
gh api repos/pjel888/archestimator/actions/permissions/workflow
```

## Phase 1 — re-enable/prove baseline

With owner authorization:

```bash
gh workflow enable 277898857 --repo pjel888/archestimator
gh workflow run CI --repo pjel888/archestimator --ref main
gh run watch --repo pjel888/archestimator <run-id>
gh run view --repo pjel888/archestimator <run-id> --json status,conclusion,jobs,url
```

Do not mark checks required until a current run exists and job names are stable.

## Phase 2 — syntax hardening

Target workflow header:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, staging, codex/**, feat/**, fix/**, docs/**, hotfix/**, release/**]
  merge_group:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Phase 3 — split stable jobs

| Job | Command/purpose |
|---|---|
| `governance` | branch/base/PR body/proof-boundary checks |
| `quality-validate` | `bun run validate` |
| `quality-build` | `bun run build` |
| `e2e-smoke` | Playwright install + `bun run test:e2e` |
| `perf-smoke` | `bun run test:e2e:perf` |
| `docs-only` | `git diff --check` and no source/config diff for docs-only PRs |

## Phase 4 — artifacts and diagnostics

Upload Playwright reports/traces/screenshots on failure, and add a governance report artifact if a checker is implemented.

## Phase 5 — supply-chain hardening

Move from `allowed_actions: all` and unpinned actions toward a trusted action policy. Pin third-party actions to full-length SHAs or record an explicit exception. Keep `GITHUB_TOKEN` least-privileged.

## Phase 6 — release workflow after CI is stable

Add manual `.github/workflows/release-production.yml` only after CI is green. It should use `workflow_dispatch`, GitHub Environment `production`, `vercel --prod --skip-domain`, staged URL smoke, then explicit promote.

## Hard stops

Stop if CI cannot be re-enabled, current validation/build fails for unrelated reasons, GitHub protection remains unavailable but implementation tries to require checks, or a workflow would require committing secrets.
