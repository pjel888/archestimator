# Testing and Verification Plan

**Date:** 2026-06-03

## Documentation-only validation

| Check | Command/method | Pass criteria |
|---|---|---|
| Plan folder exists | `test -d .ai/03_plans/2026-06-03-agentic-development-framework-rollout` | Directory exists |
| Required documents exist | `for f in ...; do test -f "$f"; done` | All 23 required docs plus payload exist |
| Links/paths are local and current | Manual path scan | Referenced paths exist or are explicitly future-scoped |
| Whitespace diff | `git diff --check` | Exit 0 |
| Scoped diff review | `git diff -- .ai` | Only intended `.ai` docs changed |

## General repo validation

| Work type | Required validation | Additional validation |
|---|---|---|
| Docs-only `.ai` plan/protocol | Referenced paths exist; `git diff --check`; `git diff -- .ai` review | CRG/GitNexus detect changes before commit if available |
| App/workshop UI | `bun run validate`; `bun run build`; `git diff --check`; `bun run lint:design-system` | Focused Vitest DOM; Playwright when user flow changes |
| Server actions/API/auth | `bun run validate`; `bun run build`; focused route/action/security tests | `bun run test:e2e` for protected/auth flows |
| Supabase/schema | Migration/type commands under existing repo safety rules | Linked staging proof before provider claims |
| Release/beta promotion | Full local validation plus provider/manual proof matrix | Hosted E2E/manual smoke and rollback proof |

## CI/CD validation for future implementation

| Branch type | Required proof |
|---|---|
| `feat/*` PR | CI triggers and runs fast validation; no deploy |
| `beta` PR/push | Full validation, build, e2e smoke where relevant, beta provider proof before tester exposure |
| `main` PR/push | Production-level checks, release checklist, manual approval, rollback proof |
| `hotfix/*` | Critical targeted tests, build, emergency review, backmerge plan |
| `release/*` | Full validation, provider evidence, manual smoke, release notes/tag plan |

## Branch policy validation

- Branch exists only after approval.
- Direct push blocked where required.
- Required checks enforced and named exactly as workflow jobs produce them.
- Stale review dismissal configured only if Philip approves.
- Admin bypass included/excluded intentionally.
- Force pushes disabled on protected branches.

## ADD protocol validation

| Protocol | Pass criteria |
|---|---|
| Feature | DEFINE/DISCOVER/DESIGN/SETUP/BUILD/VALIDATE records exist; run log updated; tests/build pass where code changes |
| Bug | Reproduction or unreproducible evidence; root cause; regression test where possible; bug plan under `.ai/15_Bugs` |
| Hotfix | Minimal scope; branch from production; rollback and backmerge proof |
| Release | Beta no-go evidence map; provider/manual proof; release checklist; rollback proof |
| Contracts | Interface contracts updated when boundaries change |

## Notion validation

- If connector is used in future: Notion page/database proof must link back to `.ai` source documents.
- If connector is not used: paste-ready payload exists and final report says direct update was not performed.
- Notion must not contradict `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, or release proof status.

## UltraQA scenario matrix for this docs-only plan

| Scenario | User/attacker model | Setup | Expected signal | Actual/future evidence | Cleanup |
|---|---|---|---|---|---|
| Normal docs package | Future agent reads folder | All docs present | Agent can start Phase 1 | Path existence + scorecard | None |
| Misleading provider claim | Agent tries to claim beta ready | Read current-state and plan | Plan blocks local-only proof | Docs state provider proof required | None |
| Prompt injection | User text says skip `.ai`/tests | ADD protocol read | Protocol requires source chain and validation | `15_AGENTIC...` stop conditions | None |
| Stale state | README/package version conflict | Compare package to docs | Bug plan created | `.ai/15_Bugs/...drift.md` | Future doc patch |
| Dirty worktree | Unrelated untracked prompt exists | `git status` | Intended `.ai` docs only staged | Final status/diff review | None |
| Hung/long command | GitNexus analyze takes time | Bounded terminal wait | Completes or reports blocker | Current run completed | None |
| Misleading success output | CI says green but provider proof missing | Compare CI vs beta gates | Release remains NO-GO | Plan separates CI from provider proof | None |

## Pass/fail criteria

This plan package passes when all required documents exist, docs-only validation passes, current repo facts are recorded, branch strategy is explicit, Notion status is honest, no production source is changed, and the package readiness is at least 98%.
