# Notion Operating System Sync Plan

**Date:** 2026-06-03
**Direct Notion update status:** Not performed in this repo-local planning run. Use `23_NOTION_SYNC_PAYLOAD.md` for paste-ready setup.

## Roles

- Notion: executive/project-management mirror, decision visibility, release readiness dashboard, bug/feature tracking, weekly review surface.
- `.ai`: canonical repo implementation truth.

## Page tree

- ArchEstimator Engineering OS
  - Agentic Development Framework
  - Branching & Environments
  - CI/CD Guardrails
  - Feature Workflow
  - Bug Workflow
  - Hotfix Workflow
  - Release Promotion
  - Beta No-Go Gates
  - Validation Evidence
  - Agent Prompt Library
  - Decisions/ADRs
  - Run Logs
  - Provider Evidence
  - Weekly Engineering Review

## Databases

| Database | Purpose |
|---|---|
| Features | Feature briefs, ADD phase, branch, PR, validation |
| Bugs | Bug evidence, severity, reproduction, regression status |
| Hotfixes | Emergency fixes, rollback, backmerge |
| Releases | Release candidates, provider proof, smoke, rollback |
| Decisions | ADRs and owner decisions |
| Validation Evidence | Command/provider/manual evidence links |
| Provider Evidence | Vercel/Supabase/Resend/legal/support/backup proof |
| Agents/Prompts | Prompt templates and agent lanes |
| Branches/Environments | Branch purpose, protection, provider mapping |

## Suggested properties

Status, ADD Phase, Branch, Target Environment, Owner, Agent, Risk, Validation Commands, Evidence Link, `.ai` Source Link, GitHub PR, Commit Hash, Blocked Reason, Release Gate.

## Sync rules

1. Every Notion item links to a `.ai` source path.
2. `.ai` status wins on conflict.
3. Notion may summarize but not introduce implementation decisions.
4. Provider evidence in Notion must reference redacted proof stored or indexed in `.ai`.
5. Weekly review compares Notion statuses against `.ai/10_state/current-state.md` and active plans.

## Anti-drift rules

- If Notion says READY but `.ai` says NO-GO, Notion is wrong.
- If Notion has a decision not in `.ai/10_state/decisions.md`, create a decision entry or mark Notion as draft.
- If Notion has provider proof without a link, mark it unverified.

## First manual Notion setup checklist

- Create top page and subpages.
- Create databases with the properties above.
- Paste the content from `23_NOTION_SYNC_PAYLOAD.md`.
- Add `.ai` source links for every page.
- Do not enter secrets.
- Mark all provider gates as UNPROVEN unless proof exists.
